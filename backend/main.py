import json
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, delete

from database import init_db, Device as DeviceModel, async_session
from scanner import run_scan, get_local_network

# ── Scan state ────────────────────────────────────────────────────────────────

scan_state: dict = {"status": "idle", "progress": 0, "found": 0, "started_at": None}


# ── WebSocket manager ─────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws) if hasattr(self.active, "discard") else None
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        msg = json.dumps(data, default=str)
        for ws in self.active[:]:
            try:
                await ws.send_text(msg)
            except Exception:
                if ws in self.active:
                    self.active.remove(ws)


manager = ConnectionManager()


# ── App lifespan ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Pi-Hub Network Scanner", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _save_device(data: dict):
    scan_state["found"] += 1
    now = datetime.now(timezone.utc)
    async with async_session() as db:
        result = await db.execute(select(DeviceModel).where(DeviceModel.id == data["id"]))
        existing = result.scalar_one_or_none()
        ports_json = json.dumps(data["ports"])

        if existing:
            existing.ip = data["ip"]
            existing.hostname = data["hostname"]
            existing.vendor = data["vendor"]
            existing.os_name = data["os_name"]
            existing.os_accuracy = data["os_accuracy"]
            existing.category = data["category"]
            existing.ports = ports_json
            existing.status = "online"
            existing.last_seen = now
        else:
            db.add(DeviceModel(
                id=data["id"], ip=data["ip"], mac=data["mac"],
                hostname=data["hostname"], vendor=data["vendor"],
                os_name=data["os_name"], os_accuracy=data["os_accuracy"],
                category=data["category"], ports=ports_json,
                status="online", first_seen=now, last_seen=now,
            ))
        await db.commit()


async def _do_scan(subnet: str):
    scan_state.update({"status": "running", "progress": 0, "found": 0,
                        "started_at": datetime.now(timezone.utc).isoformat()})

    async def _broadcast(data: dict):
        if "progress" in data:
            scan_state["progress"] = data["progress"]
        await manager.broadcast(data)

    try:
        await run_scan(subnet, _broadcast, _save_device)
        scan_state["status"] = "complete"
    except Exception as e:
        scan_state["status"] = "error"
        await manager.broadcast({"type": "scan_error", "message": str(e)})


def _device_to_dict(d: DeviceModel) -> dict:
    return {
        "id": d.id, "ip": d.ip, "mac": d.mac, "hostname": d.hostname,
        "vendor": d.vendor, "os_name": d.os_name, "os_accuracy": d.os_accuracy,
        "category": d.category, "ports": json.loads(d.ports) if d.ports else [],
        "status": d.status,
        "first_seen": d.first_seen.isoformat() if d.first_seen else None,
        "last_seen": d.last_seen.isoformat() if d.last_seen else None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/network")
async def get_network():
    local_ip, subnet = get_local_network()
    return {"local_ip": local_ip, "subnet": subnet}


@app.post("/api/scan")
async def start_scan(background_tasks: BackgroundTasks):
    if scan_state["status"] == "running":
        return {"error": "Scan already in progress"}
    _, subnet = get_local_network()
    if not subnet:
        return {"error": "Could not detect network"}
    background_tasks.add_task(_do_scan, subnet)
    return {"status": "started", "subnet": subnet}


@app.get("/api/scan/status")
async def get_scan_status():
    return scan_state


@app.get("/api/devices")
async def get_devices(category: str | None = None):
    async with async_session() as db:
        query = select(DeviceModel)
        if category and category != "all":
            query = query.where(DeviceModel.category == category)
        result = await db.execute(query)
        return [_device_to_dict(d) for d in result.scalars().all()]


@app.delete("/api/devices")
async def clear_devices():
    async with async_session() as db:
        await db.execute(delete(DeviceModel))
        await db.commit()
    return {"status": "cleared"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)

