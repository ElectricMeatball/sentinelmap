#!/usr/bin/env bash
# ============================================================
# AEROGUARD THREAT MAP — One-Command Linux Deploy Script
# Tested on: Ubuntu 22.04 / Debian 12
# Usage:  chmod +x deploy.sh && ./deploy.sh
# ============================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_USER="$(whoami)"
SERVICE_NAME="aeroguard"
PORT="${PORT:-5000}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${CYAN}[AEROGUARD]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo ""
echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║     AEROGUARD THREAT MAP          ║"
echo "  ║     Deploy Script v1.0            ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Node.js ────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -e 'process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)' 2>/dev/null; echo $?)" == "1" ]]; then
  log "Installing Node.js 20 via nvm..."
  export NVM_DIR="$HOME/.nvm"
  if [ ! -d "$NVM_DIR" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
  nvm alias default 20
  ok "Node.js $(node -v) installed"
else
  ok "Node.js $(node -v) already installed"
fi

# ── 2. Dependencies ───────────────────────────────────────────
log "Installing npm dependencies..."
cd "$APP_DIR"
npm ci --omit=dev --include=dev
ok "Dependencies installed"

# ── 3. Environment ────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  log "Creating .env from .env.example..."
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i "s/change_me_to_a_long_random_string/$SECRET/" "$APP_DIR/.env"
  warn ".env created with a random SESSION_SECRET. Edit $APP_DIR/.env if you need DATABASE_URL."
else
  ok ".env already exists — skipping"
fi

# ── 4. Build ──────────────────────────────────────────────────
log "Building for production..."
npm run build
ok "Build complete → dist/"

# ── 5. Systemd service ────────────────────────────────────────
if command -v systemctl &>/dev/null && [ "$EUID" -ne 0 ]; then
  log "Checking systemd service..."

  SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

  if [ ! -f "$SERVICE_FILE" ]; then
    log "Installing systemd service (needs sudo)..."
    sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=AEROGUARD Threat Map
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=$(which node) dist/index.cjs
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=aeroguard

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    ok "Systemd service installed and enabled"
  fi

  sudo systemctl restart "$SERVICE_NAME"
  ok "Service started → sudo journalctl -u $SERVICE_NAME -f to tail logs"

elif [ "$EUID" -eq 0 ]; then
  SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
  tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=AEROGUARD Threat Map
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=$(which node) dist/index.cjs
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=aeroguard

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"
  ok "Systemd service installed and started"
else
  log "Starting directly (systemd not available)..."
  nohup node dist/index.cjs >> "$APP_DIR/aeroguard.log" 2>&1 &
  echo $! > "$APP_DIR/aeroguard.pid"
  ok "Started with PID $(cat "$APP_DIR/aeroguard.pid") — logs at $APP_DIR/aeroguard.log"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  AEROGUARD is running on port ${PORT}${NC}"
echo -e "${GREEN}  Open: http://localhost:${PORT}${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
