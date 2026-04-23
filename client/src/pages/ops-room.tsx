import { useState } from "react";
import { Monitor, Radio, Plane, Ship, Camera, Globe2, Maximize2, Minimize2, ExternalLink } from "lucide-react";

type Panel = "conflict" | "flights" | "maritime" | "weather" | "webcams" | "news";

const PANELS = [
  { id: "conflict" as Panel, label: "Conflict Map", icon: Globe2, color: "#ef4444" },
  { id: "flights" as Panel, label: "Flight Radar", icon: Plane, color: "#38bdf8" },
  { id: "maritime" as Panel, label: "Maritime", icon: Ship, color: "#06b6d4" },
  { id: "weather" as Panel, label: "Weather", icon: Radio, color: "#10b981" },
  { id: "webcams" as Panel, label: "Live Cams", icon: Camera, color: "#f59e0b" },
  { id: "news" as Panel, label: "Signals", icon: Monitor, color: "#a855f7" },
];

const WEBCAM_FEEDS = [
  { label: "London — Trafalgar Sq", url: "https://www.earthcam.com/world/england/london/?cam=londontrafalgarsquare", thumb: "🇬🇧" },
  { label: "New York — Times Sq", url: "https://www.earthcam.com/usa/newyork/timessquare/?cam=tsrobo1", thumb: "🇺🇸" },
  { label: "Paris — Eiffel Tower", url: "https://www.earthcam.com/world/france/paris/?cam=eiffel_tower", thumb: "🇫🇷" },
  { label: "Tokyo — Shibuya", url: "https://www.earthcam.com/world/japan/tokyo/?cam=shibuya", thumb: "🇯🇵" },
  { label: "Dubai — Burj Khalifa", url: "https://www.earthcam.com/world/unitedarabemirates/dubai/?cam=burjkhalifa", thumb: "🇦🇪" },
  { label: "Sydney — Opera House", url: "https://www.earthcam.com/world/australia/sydney/?cam=operahouse", thumb: "🇦🇺" },
];

const NEWS_SIGNALS = [
  { label: "OSINT — Ukraine Front", url: "https://liveuamap.com/", category: "CONFLICT" },
  { label: "BNO News Feed", url: "https://bnonews.com/", category: "BREAKING" },
  { label: "Reuters World", url: "https://www.reuters.com/world/", category: "WORLD" },
  { label: "Shodan Monitor", url: "https://monitor.shodan.io/", category: "CYBER" },
  { label: "CISA Advisories", url: "https://www.cisa.gov/uscert/ncas/alerts", category: "CYBER" },
  { label: "NATO News", url: "https://www.nato.int/cps/en/natolive/news.htm", category: "MILITARY" },
  { label: "UN News", url: "https://news.un.org/en/", category: "DIPLOMATIC" },
  { label: "Bellingcat", url: "https://www.bellingcat.com/", category: "OSINT" },
];

export default function OpsRoom() {
  const [activePanel, setActivePanel] = useState<Panel>("conflict");
  const [maximized, setMaximized] = useState(false);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "#050a14",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Rajdhani', sans-serif",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        height: "48px",
        background: "rgba(6,11,20,0.95)",
        borderBottom: "1px solid rgba(99,179,237,0.15)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: "12px",
        flexShrink: 0,
      }}>
        <a href="/" style={{ color: "rgba(99,179,237,0.5)", textDecoration: "none", fontSize: "11px", letterSpacing: "0.12em" }}>← SENTINEL-MAP</a>
        <div style={{ width: "1px", height: "20px", background: "rgba(99,179,237,0.15)" }} />
        <div style={{
          fontSize: "14px",
          fontWeight: 800,
          letterSpacing: "0.18em",
          color: "#e2e8f0",
          textTransform: "uppercase",
        }}>OPERATIONS ROOM</div>
        <div style={{
          marginLeft: "8px",
          padding: "2px 8px",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "4px",
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#ef4444",
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ef4444", animation: "livePulse 1s ease-in-out infinite" }} />
          LIVE
        </div>
        <div style={{ marginLeft: "auto", fontSize: "10px", color: "rgba(226,232,240,0.3)", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>
          {new Date().toUTCString().replace("GMT", "UTC")}
        </div>
      </div>

      {/* Panel selector tabs */}
      <div style={{
        height: "44px",
        background: "rgba(4,8,20,0.8)",
        borderBottom: "1px solid rgba(99,179,237,0.08)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: "4px",
        flexShrink: 0,
        overflowX: "auto",
      }}>
        {PANELS.map(panel => {
          const Icon = panel.icon;
          const active = activePanel === panel.id;
          return (
            <button
              key={panel.id}
              onClick={() => setActivePanel(panel.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                border: active ? `1px solid ${panel.color}40` : "1px solid rgba(99,179,237,0.08)",
                background: active ? `${panel.color}15` : "transparent",
                color: active ? panel.color : "rgba(226,232,240,0.45)",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: "'Rajdhani', sans-serif",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: active ? `0 0 12px ${panel.color}20` : "none",
              }}
            >
              <Icon size={13} />
              {panel.label}
            </button>
          );
        })}
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setMaximized(p => !p)}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid rgba(99,179,237,0.12)",
              background: "transparent",
              color: "rgba(226,232,240,0.4)",
              cursor: "pointer",
            }}
          >
            {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {activePanel === "conflict" && (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 14px", background: "rgba(4,8,20,0.6)", borderBottom: "1px solid rgba(239,68,68,0.1)", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", color: "#ef4444", textTransform: "uppercase" }}>Live Conflict Intelligence</span>
              <span style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>Source: LiveUAMap · DeepStateMap · ACLED</span>
              <a href="https://liveuamap.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", color: "rgba(99,179,237,0.4)", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
                Open External <ExternalLink size={10} />
              </a>
            </div>
            <iframe
              src="https://liveuamap.com/"
              style={{ flex: 1, border: "none", width: "100%" }}
              title="Live Conflict Map"
            />
          </div>
        )}

        {activePanel === "flights" && (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 14px", background: "rgba(4,8,20,0.6)", borderBottom: "1px solid rgba(56,189,248,0.1)", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", color: "#38bdf8", textTransform: "uppercase" }}>Live Flight Radar</span>
              <span style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>Source: Flightradar24 · ADS-B Exchange</span>
              <a href="https://www.flightradar24.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", color: "rgba(99,179,237,0.4)", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
                Open External <ExternalLink size={10} />
              </a>
            </div>
            <iframe
              src="https://www.flightradar24.com"
              style={{ flex: 1, border: "none", width: "100%" }}
              title="Live Flight Radar"
            />
          </div>
        )}

        {activePanel === "maritime" && (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 14px", background: "rgba(4,8,20,0.6)", borderBottom: "1px solid rgba(6,182,212,0.1)", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", color: "#06b6d4", textTransform: "uppercase" }}>Live Maritime Tracking</span>
              <span style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>Source: MarineTraffic · VesselFinder · AIS</span>
              <a href="https://www.marinetraffic.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", color: "rgba(99,179,237,0.4)", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
                Open External <ExternalLink size={10} />
              </a>
            </div>
            <iframe
              src="https://www.marinetraffic.com/en/ais/home/centerx:0/centery:20/zoom:3"
              style={{ flex: 1, border: "none", width: "100%" }}
              title="Live Maritime Traffic"
            />
          </div>
        )}

        {activePanel === "weather" && (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 14px", background: "rgba(4,8,20,0.6)", borderBottom: "1px solid rgba(16,185,129,0.1)", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", color: "#10b981", textTransform: "uppercase" }}>Global Weather &amp; Storm Tracking</span>
              <span style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>Source: Windy.com</span>
            </div>
            <iframe
              src="https://embed.windy.com/embed2.html?lat=20&lon=0&detailLat=20&detailLon=0&width=650&height=450&zoom=3&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1"
              style={{ flex: 1, border: "none", width: "100%" }}
              title="Live Weather"
            />
          </div>
        )}

        {activePanel === "webcams" && (
          <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "16px" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", color: "#f59e0b", textTransform: "uppercase", marginBottom: "4px" }}>Live Global Camera Feeds</div>
              <div style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>Public CCTV · EarthCam · Webcam Network — click to open live stream</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
              {WEBCAM_FEEDS.map((cam, i) => (
                <a
                  key={i}
                  href={cam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    background: "rgba(6,11,20,0.8)",
                    border: "1px solid rgba(245,158,11,0.15)",
                    borderRadius: "8px",
                    padding: "14px",
                    textDecoration: "none",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseOver={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,158,11,0.4)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(245,158,11,0.1)";
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,158,11,0.15)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ fontSize: "24px" }}>{cam.thumb}</div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.06em" }}>{cam.label}</div>
                      <div style={{ fontSize: "9px", color: "rgba(245,158,11,0.5)", letterSpacing: "0.1em", marginTop: "2px" }}>LIVE STREAM</div>
                    </div>
                    <ExternalLink size={12} style={{ marginLeft: "auto", color: "rgba(226,232,240,0.2)" }} />
                  </div>
                  <div style={{
                    width: "100%",
                    height: "8px",
                    background: "rgba(245,158,11,0.06)",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${60 + (i * 7 % 35)}%`,
                      background: "linear-gradient(90deg, #f59e0b40, #f59e0b80)",
                      borderRadius: "4px",
                    }} />
                  </div>
                  <div style={{ fontSize: "9px", color: "rgba(226,232,240,0.25)", marginTop: "5px", fontFamily: "'JetBrains Mono', monospace" }}>Signal: Active · HD Available</div>
                </a>
              ))}
            </div>

            {/* Intelligence Signals */}
            <div style={{ marginTop: "20px", marginBottom: "12px" }}>
              <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", color: "#f59e0b", textTransform: "uppercase" }}>Intelligence Signals &amp; OSINT Feeds</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "8px" }}>
              {NEWS_SIGNALS.map((sig, i) => (
                <a
                  key={i}
                  href={sig.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    background: "rgba(6,11,20,0.8)",
                    border: "1px solid rgba(99,179,237,0.1)",
                    borderRadius: "6px",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981", flexShrink: 0, animation: "livePulse 1.5s ease-in-out infinite" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(226,232,240,0.7)", letterSpacing: "0.04em" }}>{sig.label}</div>
                    <div style={{ fontSize: "8px", color: "rgba(99,179,237,0.4)", letterSpacing: "0.1em", fontWeight: 700, marginTop: "2px" }}>{sig.category}</div>
                  </div>
                  <ExternalLink size={11} style={{ color: "rgba(226,232,240,0.15)", flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {activePanel === "news" && (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 14px", background: "rgba(4,8,20,0.6)", borderBottom: "1px solid rgba(168,85,247,0.1)", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", color: "#a855f7", textTransform: "uppercase" }}>Global Signal Intelligence</span>
              <span style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>Live OSINT · Breaking News · Advisories</span>
            </div>
            <iframe
              src="https://liveuamap.com/"
              style={{ flex: 1, border: "none", width: "100%" }}
              title="Signal Intelligence"
            />
          </div>
        )}
      </div>
    </div>
  );
}
