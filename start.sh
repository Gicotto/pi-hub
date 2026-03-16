#!/usr/bin/env bash
# start.sh — install deps and launch Pi-Hub (backend + frontend)
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[pi-hub]${RESET} $*"; }
success() { echo -e "${GREEN}[pi-hub]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[pi-hub]${RESET} $*"; }
die()     { echo -e "${RED}[pi-hub] ERROR:${RESET} $*" >&2; exit 1; }

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
VENV="$BACKEND_DIR/venv"

BACKEND_PORT=8000
FRONTEND_PORT=5174

BACKEND_PID=""
FRONTEND_PID=""
CHROMIUM_PID=""

# Pass --no-kiosk to skip opening Chromium
KIOSK=true
for arg in "$@"; do [[ "$arg" == "--no-kiosk" ]] && KIOSK=false; done

# ── Helpers ───────────────────────────────────────────────────────────────────

# Kill any process currently listening on a TCP port (best-effort)
free_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    warn "Port ${port} is in use — stopping existing process(es): ${pids}"
    echo "$pids" | xargs kill -TERM 2>/dev/null || true
    # Give them a moment to exit, then force-kill if still running
    sleep 1
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    [[ -n "$pids" ]] && echo "$pids" | xargs kill -KILL 2>/dev/null || true
  fi
}

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  echo ""
  info "Shutting down…"
  [[ -n "$CHROMIUM_PID" ]] && kill "$CHROMIUM_PID" 2>/dev/null || true
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  # Backend may be running under sudo — kill by port as a reliable fallback
  [[ -n "$BACKEND_PID"  ]] && kill "$BACKEND_PID"  2>/dev/null || true
  free_port "$BACKEND_PORT"
  info "Goodbye."
}
trap cleanup EXIT INT TERM

# ── Preflight checks ──────────────────────────────────────────────────────────
info "Checking system requirements…"

command -v python3 &>/dev/null || die "python3 is not installed. Install it with: sudo apt install python3"
command -v node    &>/dev/null || die "Node.js is not installed. Install it with: sudo apt install nodejs"
command -v npm     &>/dev/null || die "npm is not installed. Install it with: sudo apt install npm"
command -v nmap    &>/dev/null || die "nmap is not installed. Install it with: sudo apt install nmap"

PY_VERSION=$(python3 -c 'import sys; print(sys.version_info.minor)')
[[ "$PY_VERSION" -ge 10 ]] || die "Python 3.10+ is required (found 3.${PY_VERSION})"

NODE_MAJOR=$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')
[[ "$NODE_MAJOR" -ge 20 ]] || die "Node.js 20+ is required (found v$(node -e 'process.stdout.write(process.versions.node)')).
  Upgrade with: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs"

success "System requirements OK"

# ── Backend — virtualenv + pip ────────────────────────────────────────────────
info "Setting up Python virtual environment…"

if [[ ! -f "$VENV/bin/python" ]]; then
  python3 -m venv "$VENV" || die "Failed to create virtual environment"
  success "Virtual environment created"
fi

info "Installing / verifying backend dependencies…"
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r "$BACKEND_DIR/requirements.txt" \
  || die "pip install failed — check $BACKEND_DIR/requirements.txt"
success "Backend dependencies ready"

# ── Frontend — npm ────────────────────────────────────────────────────────────
info "Installing / verifying frontend dependencies…"
(cd "$FRONTEND_DIR" && npm install --silent) \
  || die "npm install failed — check $FRONTEND_DIR/package.json"
success "Frontend dependencies ready"

# ── Free ports before starting ────────────────────────────────────────────────
free_port "$BACKEND_PORT"
free_port "$FRONTEND_PORT"

# ── Start backend (needs root for nmap ARP + OS detection) ───────────────────
info "Starting backend on port ${BACKEND_PORT}…"
if [[ "$EUID" -eq 0 ]]; then
  # Already root — run directly
  (cd "$BACKEND_DIR" && "$VENV/bin/uvicorn" main:app --host 0.0.0.0 --port "$BACKEND_PORT") &
  BACKEND_PID=$!
else
  # Not root — use sudo so nmap can open raw sockets
  warn "nmap requires root for ARP scanning and OS detection — using sudo for the backend"
  warn "You will be prompted for your password once."
  sudo --validate || die "sudo authentication failed"
  sudo --non-interactive bash -c "cd '$BACKEND_DIR' && '$VENV/bin/uvicorn' main:app --host 0.0.0.0 --port '$BACKEND_PORT'" &
  BACKEND_PID=$!
fi

# Wait for backend to be reachable (up to 15 s)
info "Waiting for backend to be ready…"
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${BACKEND_PORT}/api/network" &>/dev/null; then
    success "Backend ready at http://localhost:${BACKEND_PORT}"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    die "Backend process exited unexpectedly — check output above"
  fi
  sleep 0.5
  if [[ "$i" -eq 30 ]]; then
    die "Backend did not become ready within 15 s"
  fi
done

# ── Start frontend ────────────────────────────────────────────────────────────
info "Starting frontend…"
(cd "$FRONTEND_DIR" && npm run dev -- --host --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

# Wait for frontend to be reachable (up to 15 s)
info "Waiting for frontend to be ready…"
for i in $(seq 1 30); do
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    die "Frontend process exited unexpectedly — check output above"
  fi
  if curl -sf "http://localhost:${FRONTEND_PORT}/" &>/dev/null; then
    break
  fi
  sleep 0.5
  if [[ "$i" -eq 30 ]]; then
    die "Frontend did not become ready within 15 s"
  fi
done

# ── Launch Chromium kiosk (Pi display only) ───────────────────────────────────
if $KIOSK; then
  # Find whichever Chromium binary is installed
  CHROMIUM_BIN=""
  for bin in chromium-browser chromium google-chrome; do
    if command -v "$bin" &>/dev/null; then
      CHROMIUM_BIN="$bin"
      break
    fi
  done

  if [[ -z "$CHROMIUM_BIN" ]]; then
    warn "Chromium not found — skipping kiosk mode. Install with: sudo apt install chromium-browser"
  elif [[ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]]; then
    warn "No display detected — skipping kiosk mode (run with a monitor attached)"
  else
    info "Launching kiosk: ${CHROMIUM_BIN}"
    "$CHROMIUM_BIN" \
      --kiosk \
      --app="http://localhost:${FRONTEND_PORT}" \
      --no-first-run \
      --disable-infobars \
      --disable-session-crashed-bubble \
      --noerrdialogs \
      --check-for-update-interval=31536000 \
      --disable-pinch \
      --overscroll-history-navigation=0 \
      &>/dev/null &
    CHROMIUM_PID=$!
    success "Kiosk launched (PID ${CHROMIUM_PID})"
  fi
fi

echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  Pi-Hub is running${RESET}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${BOLD}App${RESET}      →  http://localhost:${FRONTEND_PORT}"
echo -e "  ${BOLD}API${RESET}      →  http://localhost:${BACKEND_PORT}"
echo -e "  ${BOLD}API docs${RESET} →  http://localhost:${BACKEND_PORT}/docs"
echo -e ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop all processes"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# Keep script alive — let child processes stream their output
wait

