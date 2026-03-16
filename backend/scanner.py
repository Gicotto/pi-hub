import nmap
import asyncio
import socket
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from mac_lookup import lookup_vendor
from classifier import classify

executor = ThreadPoolExecutor(max_workers=3)


def get_local_network() -> tuple[str | None, str | None]:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        parts = local_ip.split(".")
        subnet = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
        return local_ip, subnet
    except Exception:
        return None, None


def _discovery_scan(subnet: str) -> list[str]:
    nm = nmap.PortScanner()
    nm.scan(hosts=subnet, arguments="-sn -T4 --min-rate 2000")
    return [h for h in nm.all_hosts() if nm[h].state() == "up"]


def _host_scan(ip: str):
    nm = nmap.PortScanner()
    try:
        nm.scan(
            hosts=ip,
            arguments="-sV -O --top-ports 100 -T4 --osscan-guess --max-os-tries 1",
        )
        return nm[ip] if ip in nm.all_hosts() else None
    except Exception:
        return None


def parse_host(ip: str, host_data) -> dict:
    addresses = host_data.get("addresses", {})
    mac = addresses.get("mac", "")

    # Vendor from nmap, then MAC OUI lookup
    vendor_dict = host_data.get("vendor", {})
    vendor = vendor_dict.get(mac, "") if mac else ""
    if not vendor:
        vendor = lookup_vendor(mac)

    hostname = ""
    try:
        hostnames = host_data.get("hostnames", [])
        if hostnames:
            hostname = hostnames[0].get("name", "")
    except Exception:
        pass

    # OS detection
    os_name, os_accuracy = "", 0
    osmatches = host_data.get("osmatch", [])
    if osmatches:
        best = osmatches[0]
        os_name = best.get("name", "")
        os_accuracy = int(best.get("accuracy", 0))

    # Open ports
    ports = []
    for proto in ("tcp", "udp"):
        proto_data = host_data.get(proto, {})
        for port_num, info in proto_data.items():
            if info.get("state") == "open":
                ports.append(
                    {
                        "port": port_num,
                        "protocol": proto,
                        "service": info.get("name", ""),
                        "product": info.get("product", ""),
                        "version": info.get("version", ""),
                    }
                )

    category = classify(ports, vendor, os_name, hostname)
    device_id = mac if mac else ip
    now = datetime.now(timezone.utc).isoformat()

    return {
        "id": device_id,
        "ip": ip,
        "mac": mac or "Unknown",
        "hostname": hostname or ip,
        "vendor": vendor or "Unknown",
        "os_name": os_name,
        "os_accuracy": os_accuracy,
        "category": category,
        "ports": ports,
        "status": "online",
        "first_seen": now,
        "last_seen": now,
    }


async def run_scan(subnet: str, broadcast_fn, save_device_fn):
    loop = asyncio.get_event_loop()

    # Phase 1: fast discovery
    live_hosts: list[str] = await loop.run_in_executor(
        executor, _discovery_scan, subnet
    )
    total = len(live_hosts)
    await broadcast_fn({"type": "discovery_done", "count": total})

    # Phase 2: detailed per-host scan
    for i, ip in enumerate(live_hosts):
        host_data = await loop.run_in_executor(executor, _host_scan, ip)
        if host_data:
            device = parse_host(ip, host_data)
            await save_device_fn(device)
            await broadcast_fn(
                {
                    "type": "device_found",
                    "device": device,
                    "progress": round((i + 1) / total * 100) if total else 100,
                }
            )

    await broadcast_fn({"type": "scan_complete", "total": total})

