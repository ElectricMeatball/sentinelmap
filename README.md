# 🛡️ SentinelMap

**AI-powered cyber threat and APT intelligence platform with real-time OSINT feeds, interactive global map, and analyst dashboard.**

> Built for CTI analysts, SOC teams, and threat hunters who need operational visibility over live cyber threat activity worldwide.

![SentinelMap](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-20+-green)

---

## ✨ What it does

- **Interactive global map** (Leaflet, CartoDB Dark tiles) with live attack arcs and animated threat particles
- **9 threat layers** — each independently toggleable:
  - 🔴 Malware / Active Infections
  - 🔺 C2 / Botnet Command & Control
  - 🟡 Phishing Infrastructure
  - 🟣 Ransomware Activity
  - 🔵 Botnet Nodes
  - ⚡ Brute Force Attacks
  - 🟢 Exploit / Scanning Activity
  - ⬛ Spam Sources
  - 🔴 DDoS Infrastructure
- **12 live OSINT feeds** — ThreatFox, URLhaus, Feodo Tracker, Blocklist.de, SANS ISC, SSL Blacklist, Cinsscore, IPsum, Emerging Threats, Spamhaus DROP, DataPlane SSH, Turris Greylist
- **Time range filters** — 1H, 6H, 24H, 7D, 30D
- **URL state** — shareable links with lat/lon/zoom/layers/timeRange baked in
- **Event detail panel** — indicator, malware family, MITRE ATT&CK technique, source, confidence, severity, ASN, org, geo confidence
- **Priority scoring** — composite score from severity, confidence, and source reliability
- **Live ticker** — real-time event stream at the bottom
- **Search** — filter by IP, country, malware family, feed, or layer
- **Normalized schema** — every event has source attribution, ingest timestamp, and relationship type (confirmed / inferred / raw)

---

## 🚀 Quick start (local)

```bash
git clone https://github.com/kilo-bytez/sentinelmap.git
cd sentinelmap
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

> The first load fetches from all 12 OSINT feeds and geolocates indicators. Expect 15–45 seconds on first run. Subsequent loads use the 3-hour cache.

---

## 🐳 Docker (recommended for VPS)

```bash
git clone https://github.com/kilo-bytez/sentinelmap.git
cd sentinelmap
cp .env.example .env
# Edit .env — set SESSION_SECRET at minimum
docker compose up -d
```

The app runs on port **3000** by default.

---

## 🌐 Nginx reverse proxy (production)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 📡 OSINT Sources

| Feed | Layer | Reliability | Update |
|---|---|---|---|
| ThreatFox | Malware / C2 | 90% | Daily |
| URLhaus | Phishing / Malware | 88% | Hourly |
| Feodo Tracker | C2 / Botnet | 92% | Daily |
| Blocklist.de | Brute Force | 75% | Daily |
| SANS ISC | Exploit / Scanning | 85% | Daily |
| SSL Blacklist | Malware / Botnet | 88% | Daily |
| Cinsscore | DDoS / Exploit | 70% | Daily |
| IPsum | Malware / Exploit | 80% | Daily |
| Emerging Threats | Malware | 82% | Daily |
| Spamhaus DROP | Spam | 95% | Daily |
| DataPlane SSH | Brute Force | 85% | Daily |
| Turris Greylist | Botnet | 78% | Hourly |

> All sources are free and public. No API keys required for the default feed set.

---

## 🗂️ Folder structure

```
sentinelmap/
├── client/src/
│   ├── pages/
│   │   └── threat-map.tsx      ← Main map UI (Leaflet + all components)
│   ├── components/ui/          ← Shadcn/Radix UI primitives
│   ├── index.css               ← SentinelMap design system
│   └── App.tsx
├── server/
│   ├── routes.ts               ← All API routes + 12 feed fetchers
│   ├── index.ts                ← Express server entry
│   └── storage.ts              ← Optional DB storage layer
├── shared/
│   └── schema.ts               ← Normalized CyberEvent schema + types
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 🔐 Environment variables

See [`.env.example`](.env.example) for full documentation.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `production` for deployment |
| `PORT` | No | `3000` | Backend API port |
| `SESSION_SECRET` | Yes (prod) | `changeme` | Express session secret |
| `DATABASE_URL` | No | — | PostgreSQL connection string |
| `FEED_CACHE_TTL_MS` | No | `10800000` | Feed refresh interval (ms) |

---

## 🛣️ Roadmap

- [ ] AlienVault OTX integration
- [ ] AbuseIPDB enrichment
- [ ] GreyNoise scanner noise filter
- [ ] MISP community feeds
- [ ] CVE / KEV overlay (CISA Known Exploited Vulnerabilities)
- [ ] APT group tagging and campaign correlation
- [ ] AI cluster summaries
- [ ] Analyst watchlists and bookmarks
- [ ] RBAC / multi-user support
- [ ] WebSocket live push

---

## 📄 License

MIT — build with it, fork it, deploy it.
