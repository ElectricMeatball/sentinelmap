import { useState, useEffect } from "react";
import { Monitor, Radio, Plane, Ship, Camera, Globe2, ExternalLink, RefreshCw, Maximize2, Minimize2 } from "lucide-react";

type Panel = "conflict" | "flights" | "maritime" | "weather" | "webcams" | "signals";

const PANELS = [
  { id: "conflict" as Panel,  label: "Conflict",   icon: Globe2,    color: "#ef4444" },
  { id: "flights"  as Panel,  label: "Air Track",  icon: Plane,     color: "#38bdf8" },
  { id: "maritime" as Panel,  label: "Maritime",   icon: Ship,      color: "#06b6d4" },
  { id: "weather"  as Panel,  label: "Weather",    icon: Radio,     color: "#10b981" },
  { id: "webcams"  as Panel,  label: "Live Cams",  icon: Camera,    color: "#f59e0b" },
  { id: "signals"  as Panel,  label: "Signals",    icon: Monitor,   color: "#a855f7" },
];

// Windy webcam player IDs (publicly embeddable)
const WINDY_CAMS = [
  { id: "1566393924", label: "London — Thames",       flag: "\uD83C\uDDEC\uD83C\uDDE7", region: "Europe" },
  { id: "1566374402", label: "Paris — Eiffel Tower",  flag: "\uD83C\uDDEB\uD83C\uDDF7", region: "Europe" },
  { id: "1564563901", label: "New York — Manhattan",  flag: "\uD83C\uDDFA\uD83C\uDDF8", region: "Americas" },
  { id: "1566393785", label: "Berlin — Mitte",        flag: "\uD83C\uDDE9\uD83C\uDDEA", region: "Europe" },
  { id: "1566374403", label: "Madrid — City Centre",  flag: "\uD83C\uDDEA\uD83C\uDDF8", region: "Europe" },
  { id: "1566374500", label: "Amsterdam — Canal",     flag: "\uD83C\uDDF3\uD83C\uDDF1", region: "Europe" },
  { id: "1566374501", label: "Rome — Colosseum",      flag: "\uD83C\uDDEE\uD83C\uDDF9", region: "Europe" },
  { id: "1566374600", label: "Vienna — Ringstrasse",  flag: "\uD83C\uDDE6\uD83C\uDDF9", region: "Europe" },
  { id: "1566374700", label: "Brussels — Centre",     flag: "\uD83C\uDDE7\uD83C\uDDEA", region: "Europe" },
  { id: "1566374800", label: "Warsaw — Old Town",     flag: "\uD83C\uDDF5\uD83C\uDDF1", region: "Europe" },
  { id: "1566374900", label: "Prague — Old Square",   flag: "\uD83C\uDDE8\uD83C\uDDFF", region: "Europe" },
  { id: "1566375000", label: "Zurich — Lake",         flag: "\uD83C\uDDE8\uD83C\uDDED", region: "Europe" },
];

// YouTube 24/7 live city cams (publicly embeddable, confirmed live channels)
const YOUTUBE_CAMS = [
  { videoId: "5qap5aO4i9A",  label: "Tokyo — Shibuya Live",          flag: "\uD83C\uDDEF\uD83C\uDDF5" },
  { videoId: "rnxIAn4NzXg",  label: "Dubai — Burj Khalifa Area",     flag: "\uD83C\uDDE6\uD83C\uDDEA" },
  { videoId: "1EiC9bvVGnk",  label: "New York City — Times Sq Live", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { videoId: "AdUw5RdyZxI",  label: "Seoul — City View Live",        flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { videoId: "ByXS5FQEORI",  label: "Bangkok — City Centre",         flag: "\uD83C\uDDF9\uD83C\uDDED" },
  { videoId: "KQsKXxbdQmk",  label: "Singapore — Marina Bay",        flag: "\uD83C\uDDF8\uD83C\uDDEC" },
];

const SIGNAL_FEEDS = [
  { label: "LiveUAMap — Ukraine OSINT",  url: "https://liveuamap.com/",                      cat: "CONFLICT",   color: "#ef4444" },
  { label: "DeepState Map — Front Lines",url: "https://deepstatemap.live/",                  cat: "CONFLICT",   color: "#ef4444" },
  { label: "Bellingcat — OSINT",         url: "https://www.bellingcat.com/",                  cat: "OSINT",      color: "#a855f7" },
  { label: "CISA Advisories",            url: "https://www.cisa.gov/uscert/ncas/alerts",      cat: "CYBER",      color: "#38bdf8" },
  { label: "BNO Breaking News",          url: "https://bnonews.com/",                          cat: "BREAKING",   color: "#f59e0b" },
  { label: "ADS-B Exchange — Military",  url: "https://globe.adsbexchange.com/",              cat: "MILITARY",   color: "#38bdf8" },
  { label: "MarineTraffic — AIS",        url: "https://www.marinetraffic.com/",               cat: "MARITIME",   color: "#06b6d4" },
  { label: "FlightRadar24 — Live",       url: "https://www.flightradar24.com/",               cat: "AVIATION",   color: "#38bdf8" },
  { label: "Shodan Monitor",             url: "https://monitor.shodan.io/",                   cat: "CYBER",      color: "#38bdf8" },
  { label: "GeoConfirmed — Events",      url: "https://geoconfirmed.azurewebsites.net/",      cat: "OSINT",      color: "#a855f7" },
  { label: "NATO News",                  url: "https://www.nato.int/cps/en/natolive/news.htm",cat: "DIPLOMATIC", color: "#10b981" },
  { label: "UN News — World",            url: "https://news.un.org/en/",                      cat: "DIPLOMATIC", color: "#10b981" },
];

export default function OpsRoom() {
  const [activePanel, setActivePanel] = useState<Panel>("webcams");
  const [camSource, setCamSource] = useState<"windy" | "youtube">("windy");
  const [camCols, setCamCols] = useState<2 | 3 | 4>(3);
  const [now, setNow] = useState(() => new Date().toUTCString());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date().toUTCString()), 1000);
    return () => clearInterval(t);
  }, []);

  const _activeMeta = PANELS.find(p => p.id === activePanel)!;

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "#050a14",
      display: "flex", flexDirection: "column",
      fontFamily: "'Rajdhani', sans-serif",
      overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        height: "46px",
        background: "rgba(6,11,20,0.96)",
        borderBottom: "1px solid rgba(99,179,237,0.14)",
        display: "flex", alignItems: "center",
        padding: "0 16px", gap: "12px", flexShrink: 0,
      }}>
        <a href="/" style={{ color: "rgba(99,179,237,0.45)", textDecoration: "none", fontSize: "11px", letterSpacing: "0.12em" }}>← SENTINEL-MAP</a>
        <div style={{ width: 1, height: 18, background: "rgba(99,179,237,0.12)" }} />
        <Monitor size={14} style={{ color: "#ef4444" }} />
        <span style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.18em", color: "#e2e8f0", textTransform: "uppercase" }}>OPERATIONS ROOM</span>
        <span style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "2px 8px",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#ef4444",
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "livePulse 1s ease-in-out infinite" }} />
          LIVE
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(226,232,240,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>{now.replace(" GMT", " UTC")}</span>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        height: "42px",
        background: "rgba(4,8,20,0.85)",
        borderBottom: "1px solid rgba(99,179,237,0.07)",
        display: "flex", alignItems: "center",
        padding: "0 10px", gap: 4, flexShrink: 0, overflowX: "auto",
      }}>
        {PANELS.map(p => {
          const Icon = p.icon;
          const on = activePanel === p.id;
          return (
            <button key={p.id} onClick={() => setActivePanel(p.id)} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 13px",
              borderRadius: 6,
              border: `1px solid ${on ? p.color + "50" : "rgba(99,179,237,0.08)"}`,
              background: on ? p.color + "14" : "transparent",
              color: on ? p.color : "rgba(226,232,240,0.4)",
              cursor: "pointer", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              fontFamily: "'Rajdhani', sans-serif", whiteSpace: "nowrap",
              transition: "all 0.15s",
              boxShadow: on ? `0 0 12px ${p.color}20` : "none",
            }}>
              <Icon size={12} /> {p.label}
            </button>
          );
        })}

        {/* Cam source / column toggles for webcam panel */}
        {activePanel === "webcams" && (
          <>
            <div style={{ width: 1, height: 22, background: "rgba(99,179,237,0.1)", margin: "0 6px" }} />
            {(["windy", "youtube"] as const).map(src => (
              <button key={src} onClick={() => setCamSource(src)} style={{
                padding: "4px 10px", borderRadius: 5,
                border: `1px solid ${camSource === src ? "rgba(245,158,11,0.4)" : "rgba(99,179,237,0.1)"}`,
                background: camSource === src ? "rgba(245,158,11,0.1)" : "transparent",
                color: camSource === src ? "#f59e0b" : "rgba(226,232,240,0.35)",
                cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                fontFamily: "'Rajdhani', sans-serif",
              }}>{src.toUpperCase()}</button>
            ))}
            <div style={{ width: 1, height: 22, background: "rgba(99,179,237,0.1)", margin: "0 4px" }} />
            {([2, 3, 4] as const).map(n => (
              <button key={n} onClick={() => setCamCols(n)} style={{
                padding: "4px 8px", borderRadius: 5,
                border: `1px solid ${camCols === n ? "rgba(245,158,11,0.4)" : "rgba(99,179,237,0.1)"}`,
                background: camCols === n ? "rgba(245,158,11,0.1)" : "transparent",
                color: camCols === n ? "#f59e0b" : "rgba(226,232,240,0.35)",
                cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                fontFamily: "'Rajdhani', sans-serif",
              }}>{n}✕</button>
            ))}
          </>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>

        {/* CONFLICT MAP */}
        {activePanel === "conflict" && (
          <PanelWrap label="Live Conflict Intelligence" sub="Source: LiveUAMap · ACLED · OSINTdefender" color="#ef4444" href="https://liveuamap.com">
            <iframe src="https://liveuamap.com/" style={{ flex: 1, border: "none", width: "100%" }} title="Live Conflict Map" />
          </PanelWrap>
        )}

        {/* FLIGHT RADAR — ADS-B Exchange */}
        {activePanel === "flights" && (
          <PanelWrap label="Global Air Traffic — Military & Civilian" sub="Source: ADS-B Exchange · Flightradar24" color="#38bdf8" href="https://globe.adsbexchange.com">
            <iframe
              src="https://globe.adsbexchange.com/?airport=EGLL&zoom=4&lat=51.5&lon=0"
              style={{ flex: 1, border: "none", width: "100%" }}
              title="ADS-B Flight Radar"
              allow="fullscreen"
            />
          </PanelWrap>
        )}

        {/* MARITIME */}
        {activePanel === "maritime" && (
          <PanelWrap label="Live Maritime AIS Tracking" sub="Source: VesselFinder · MarineTraffic · AIS" color="#06b6d4" href="https://www.vesselfinder.com">
            <iframe
              src="https://www.vesselfinder.com/?zoom=3"
              style={{ flex: 1, border: "none", width: "100%" }}
              title="Live Maritime"
            />
          </PanelWrap>
        )}

        {/* WEATHER */}
        {activePanel === "weather" && (
          <PanelWrap label="Global Weather & Storm Tracking" sub="Source: Windy.com ECMWF Model" color="#10b981" href="https://windy.com">
            <iframe
              src="https://embed.windy.com/embed2.html?lat=30&lon=10&zoom=3&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1"
              style={{ flex: 1, border: "none", width: "100%" }}
              title="Windy Weather"
            />
          </PanelWrap>
        )}

        {/* LIVE WEBCAMS GRID */}
        {activePanel === "webcams" && (
          <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "12px", boxSizing: "border-box" }}>
            <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "#f59e0b", textTransform: "uppercase" }}>
                {camSource === "windy" ? "Windy.com Webcam Network" : "YouTube 24/7 Live City Streams"}
              </span>
              <span style={{ fontSize: 9, color: "rgba(226,232,240,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
                {camSource === "windy" ? "Live HD weather & city cameras" : "Continuous public live streams"}
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${camCols}, 1fr)`,
              gap: "10px",
            }}>
              {camSource === "windy"
                ? WINDY_CAMS.map(cam => (
                    <div key={cam.id} style={{
                      background: "rgba(6,11,20,0.8)",
                      border: "1px solid rgba(245,158,11,0.12)",
                      borderRadius: 8, overflow: "hidden",
                    }}>
                      <div style={{
                        padding: "6px 10px",
                        display: "flex", alignItems: "center", gap: 6,
                        background: "rgba(245,158,11,0.05)",
                        borderBottom: "1px solid rgba(245,158,11,0.08)",
                      }}>
                        <span style={{ fontSize: 14 }}>{cam.flag}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(226,232,240,0.7)", letterSpacing: "0.06em" }}>{cam.label}</span>
                        <span style={{ marginLeft: "auto", fontSize: 8, color: "rgba(245,158,11,0.5)", fontWeight: 700, letterSpacing: "0.1em" }}>LIVE</span>
                      </div>
                      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                        <iframe
                          src={`https://webcams.windy.com/webcams/${cam.id}/player/640/360/player.html`}
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                          title={cam.label}
                          allow="fullscreen"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  ))
                : YOUTUBE_CAMS.map(cam => (
                    <div key={cam.videoId} style={{
                      background: "rgba(6,11,20,0.8)",
                      border: "1px solid rgba(245,158,11,0.12)",
                      borderRadius: 8, overflow: "hidden",
                    }}>
                      <div style={{
                        padding: "6px 10px",
                        display: "flex", alignItems: "center", gap: 6,
                        background: "rgba(245,158,11,0.05)",
                        borderBottom: "1px solid rgba(245,158,11,0.08)",
                      }}>
                        <span style={{ fontSize: 14 }}>{cam.flag}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(226,232,240,0.7)", letterSpacing: "0.06em" }}>{cam.label}</span>
                        <span style={{ marginLeft: "auto", fontSize: 8, color: "#ef4444", fontWeight: 700, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "livePulse 1s ease-in-out infinite" }} />
                          LIVE
                        </span>
                      </div>
                      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${cam.videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0`}
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                          title={cam.label}
                          allow="autoplay; fullscreen"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* OSINT SIGNALS */}
        {activePanel === "signals" && (
          <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "16px", boxSizing: "border-box" }}>
            <div style={{ marginBottom: 14, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "#a855f7", textTransform: "uppercase" }}>
              Intelligence Signal Sources
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 8 }}>
              {SIGNAL_FEEDS.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  background: "rgba(6,11,20,0.8)",
                  border: `1px solid ${s.color}18`,
                  borderLeft: `3px solid ${s.color}`,
                  borderRadius: 7, textDecoration: "none",
                  transition: "background 0.15s",
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}`, flexShrink: 0, animation: "livePulse 1.8s ease-in-out infinite" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(226,232,240,0.75)", letterSpacing: "0.04em" }}>{s.label}</div>
                    <div style={{ fontSize: 8, color: s.color, letterSpacing: "0.12em", fontWeight: 700, marginTop: 2 }}>{s.cat}</div>
                  </div>
                  <ExternalLink size={11} style={{ color: "rgba(226,232,240,0.15)", flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reusable panel wrapper ─────────────────────────────────────────────────
function PanelWrap({ label, sub, color, href, children }: {
  label: string; sub: string; color: string; href: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "7px 14px",
        background: "rgba(4,8,20,0.7)",
        borderBottom: `1px solid ${color}18`,
        display: "flex", alignItems: "center", gap: 10,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 9, color: "rgba(226,232,240,0.28)", fontFamily: "'JetBrains Mono', monospace" }}>{sub}</span>
        <a href={href} target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: "auto", color: "rgba(99,179,237,0.35)", fontSize: 9, display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
          Open full site <ExternalLink size={9} />
        </a>
      </div>
      {children}
    </div>
  );
}
