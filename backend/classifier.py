ROUTER_VENDORS = {
    "cisco", "ubiquiti", "netgear", "tp-link", "asus", "d-link",
    "linksys", "mikrotik", "juniper", "aruba", "ruckus", "meraki",
    "huawei", "zyxel", "fritz", "peplink", "openwrt",
}
PRINTER_VENDORS = {
    "hp", "hewlett", "canon", "epson", "brother", "xerox",
    "kyocera", "lexmark", "ricoh", "konica", "minolta",
}
NAS_VENDORS = {
    "synology", "qnap", "western digital", "wd", "seagate", "buffalo", "terramaster",
}
PHONE_VENDORS = {
    "apple", "samsung", "xiaomi", "huawei", "oneplus", "oppo",
    "motorola", "nokia", "google", "lg electronics",
}
TV_VENDORS = {
    "samsung", "lg", "sony", "philips", "hisense", "vizio",
    "tcl", "roku", "amazon", "chromecast",
}
GAMING_VENDORS = {"sony", "microsoft", "nintendo"}


def classify(ports: list, vendor: str, os_info: str, hostname: str) -> str:
    v = (vendor or "").lower()
    o = (os_info or "").lower()
    h = (hostname or "").lower()
    port_nums = {p["port"] for p in ports}

    # Router / Access Point
    if any(kw in v for kw in ROUTER_VENDORS):
        return "router"
    if any(kw in h for kw in ("router", "gateway", "access-point", "ap-", "wifi", "dlink", "tplink")):
        return "router"
    if {80, 443} & port_nums and {22, 23, 8080, 8443} & port_nums and len(ports) <= 8:
        return "router"

    # Printer
    if any(kw in v for kw in PRINTER_VENDORS):
        return "printer"
    if {9100, 631, 515} & port_nums:
        return "printer"
    if any(kw in h for kw in ("printer", "mfp", "laserjet", "inkjet", "print")):
        return "printer"

    # NAS / Storage
    if any(kw in v for kw in NAS_VENDORS):
        return "nas"
    if {445, 139} & port_nums and {5000, 5001, 8080} & port_nums:
        return "nas"
    if any(kw in h for kw in ("nas", "storage", "diskstation", "qnap", "synology")):
        return "nas"

    # Computer
    if any(kw in o for kw in ("windows", "linux", "mac os", "ubuntu", "debian", "fedora", "centos")):
        return "computer"
    if {3389, 22, 445, 5900} & port_nums and len(ports) >= 2:
        return "computer"

    # Phone / Tablet
    if any(kw in v for kw in PHONE_VENDORS) and len(ports) < 3:
        return "phone"

    # Smart TV / Streaming
    if any(kw in v for kw in TV_VENDORS) and {8008, 8009, 1925, 9080, 7000} & port_nums:
        return "tv"
    if any(kw in h for kw in ("tv", "firetv", "roku", "appletv", "chromecast", "shield")):
        return "tv"

    # Gaming Console
    if any(kw in v for kw in GAMING_VENDORS) and any(kw in h for kw in ("ps", "xbox", "nintendo", "switch")):
        return "gaming"
    if any(kw in h for kw in ("playstation", "ps4", "ps5", "xbox", "nintendo")):
        return "gaming"

    # IoT / Smart Home
    if 0 < len(ports) < 4:
        return "iot"

    return "unknown"

