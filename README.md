# AEROGUARD — THREAT MAP

A cinematic cybersecurity threat intelligence visualization platform. Displays a live global dot-matrix world map with real attack events pulled from 12 free threat intelligence feeds, geolocated attack arcs, MITRE ATT&CK tagging, and a full command-center dashboard.

![AEROGUARD Screenshot](https://i.imgur.com/placeholder.png)

## Features

- **Real threat data** from 12 live feeds: ThreatFox, URLhaus, Feodo Tracker, Blocklist.de, SANS ISC, SSL Blacklist, Cinsscore, IPsum, Emerging Threats, Spamhaus DROP, DataPlane SSH, Turris Greylist
- **24-hour cache** — feeds refresh once per day; page loads are instant
- **Animated attack arcs** with particle trails and impact shockwaves
- **Category filters** — Exploit, Malware, Phishing, DDoS, Ransomware, Brute Force, Botnet, Trojan, Spam
- **MITRE ATT&CK** technique tagging
- **Thermal heatmap mode**, zoom/pan, fullscreen, CSV export
- **Keyboard shortcuts**: `Space` pause/resume · `F` fullscreen · `M` mute · `H` heatmap · `Escape` close drawer
- CRT scanline overlay, military green aesthetic, rolling counters

---

## Quick Start (Linux Server)

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- PostgreSQL 14 or higher (optional — app works without it but schema is ready)

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/aeroguard-threatmap.git
cd aeroguard-threatmap
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in your values — at minimum set a `SESSION_SECRET`. `DATABASE_URL` is optional; the app uses in-memory storage if not set.

### 3. Build and Run

```bash
npm run build
npm start
```

The app runs on **port 5000** by default. Override with `PORT=8080 npm start`.

---

## One-Command Deploy Script

For a full automated setup on a fresh Ubuntu/Debian server:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/aeroguard-threatmap/main/deploy.sh | bash
```

Or if you've already cloned the repo:

```bash
chmod +x deploy.sh
./deploy.sh
```

This script will:
- Install Node.js 20 via nvm if not present
- Install all dependencies
- Build the project
- Set up a systemd service that starts on boot
- Start the service

---

## Docker (Recommended for Production)

### With Docker Compose (includes PostgreSQL)

```bash
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

App available at `http://localhost:5000`

### Standalone Docker

```bash
docker build -t aeroguard .
docker run -d \
  -p 5000:5000 \
  -e SESSION_SECRET=your_secret_here \
  --name aeroguard \
  aeroguard
```

---

## Systemd Service (Manual Setup)

To run as a system service that survives reboots:

```bash
# Copy service file
sudo cp aeroguard.service /etc/systemd/system/

# Edit paths and user if needed
sudo nano /etc/systemd/system/aeroguard.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable aeroguard
sudo systemctl start aeroguard

# Check status
sudo systemctl status aeroguard
sudo journalctl -u aeroguard -f
```

---

## Reverse Proxy with Nginx

To serve on port 80/443, create `/etc/nginx/sites-available/aeroguard`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then: `sudo ln -s /etc/nginx/sites-available/aeroguard /etc/nginx/sites-enabled/ && sudo nginx -t && sudo nginx -s reload`

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | HTTP port to listen on |
| `SESSION_SECRET` | Yes | — | Secret for session signing (use a long random string) |
| `DATABASE_URL` | No | — | PostgreSQL connection URL. App works without it using in-memory storage |
| `NODE_ENV` | No | `development` | Set to `production` for production builds |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express 5, TypeScript |
| Routing | Wouter |
| State | TanStack React Query |
| Database | PostgreSQL via Drizzle ORM (optional) |
| Map | Custom SVG dot-matrix canvas renderer |
| Threat Data | 12 free public threat intelligence feeds |

---

## Threat Intelligence Feeds

| Feed | Data Type | URL |
|---|---|---|
| ThreatFox | IOCs, malware hashes, C2 IPs | abuse.ch |
| URLhaus | Malicious URLs | abuse.ch |
| Feodo Tracker | Botnet C2 IPs | abuse.ch |
| Blocklist.de | Brute force IPs | blocklist.de |
| SANS ISC | Attack sources | isc.sans.edu |
| SSL Blacklist | SSL-abusing IPs | abuse.ch |
| Cinsscore | Bad actor IPs | cinsscore.com |
| IPsum | Threat-scored IPs | github.com/stamparm/ipsum |
| Emerging Threats | Compromised hosts | emergingthreats.net |
| Spamhaus DROP | Spam/botnet ranges | spamhaus.org |
| DataPlane SSH | SSH auth-spam IPs | dataplane.org |
| Turris Greylist | Greylisted IPs | turris.cz |

---

## License

MIT
