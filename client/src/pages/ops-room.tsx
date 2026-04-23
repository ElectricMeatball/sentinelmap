import { useState, useEffect } from "react";
import { Monitor, Radio, Plane, Ship, Camera, Globe2, ExternalLink, Activity } from "lucide-react";

type Panel = "conflict" | "flights" | "maritime" | "weather" | "webcams" | "signals";

const PANELS: { id: Panel; label: string; icon: React.ElementType; color: string }[] = [
  { id: "conflict",  label: "Conflict",   icon: Globe2,    color: "#ef4444" },
  { id: "flights",   label: "Air Track",  icon: Plane,     color: "#38bdf8" },
  { id: "maritime",  label: "Maritime",   icon: Ship,      color: "#06b6d4" },
  { id: "weather",   label: "Weather",    icon: Radio,     color: "#10b981" },
  { id: "webcams",   label: "Live Cams",  icon: Camera,    color: "#f59e0b" },
  { id: "signals",   label: "Intel Hub",  icon: Monitor,   color: "#a855f7" },
];

// UK-focused YouTube 24/7 live streams
const LIVE_STREAMS: { id: string; label: string; flag: string; city: string; region: string }[] = [
  { id: "g4xNV9BxFJ8", label: "London — Oxford Street Live",    flag: "🇬🇧", city: "London",     region: "UK" },
  { id: "AdUw5RdyZxI", label: "London — City Skyline 24/7",     flag: "🇬🇧", city: "London",     region: "UK" },
  { id: "1EiC9bvVGnk", label: "London — Night City View",        flag: "🇬🇧", city: "London",     region: "UK" },
  { id: "85wMHMwRPsI", label: "Edinburgh — Old Town Live",       flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", city: "Edinburgh",  region: "UK" },
  { id: "ByXS5FQEORI", label: "Manchester — City Centre",        flag: "🇬🇧", city: "Manchester", region: "UK" },
  { id: "KQsKXxbdQmk", label: "Birmingham — Broad Street",       flag: "🇬🇧", city: "Birmingham", region: "UK" },
  { id: "5qap5aO4i9A", label: "UK News — Sky News Live",         flag: "🇬🇧", city: "London",     region: "UK NEWS" },
  { id: "9Auq9mYxFEE", label: "UK News — BBC News Live",         flag: "🇬🇧", city: "London",     region: "UK NEWS" },
  { id: "jfKfPfyJRdk", label: "UK News — GB News Live",          flag: "🇬🇧", city: "London",     region: "UK NEWS" },
  { id: "2X9dE5b8MnY", label: "Global — Al Jazeera English",    flag: "🌍",  city: "Global",     region: "WORLD NEWS" },
  { id: "rnxIAn4NzXg", label: "Global — DW News Live",           flag: "🌍",  city: "Global",     region: "WORLD NEWS" },
  { id: "GWlKEM3m2EE", label: "Conflict — Ukraine Front Lines", flag: "🇺🇦", city: "Ukraine",    region: "CONFLICT" },
];

const INTEL_LINKS: { label: string; url: string; cat: string; color: string; desc: string }[] = [
  { label: "LiveUAMap",       url: "https://liveuamap.com",                         cat: "CONFLICT",    color: "#ef4444", desc: "Real-time Ukraine conflict events" },
  { label: "DeepState Map",   url: "https://deepstatemap.live",                     cat: "CONFLICT",    color: "#ef4444", desc: "Front line positions & territorial changes" },
  { label: "GeoConfirmed",    url: "https://geoconfirmed.azurewebsites.net",        cat: "OSINT",       color: "#a855f7", desc: "Geolocated conflict events" },
  { label: "ADS-B Exchange",  url: "https://globe.adsbexchange.com",                cat: "AVIATION",    color: "#38bdf8", desc: "Unfiltered military & civilian air traffic" },
  { label: "MarineTraffic",   url: "https://www.marinetraffic.com",                 cat: "MARITIME",    color: "#06b6d4", desc: "Live AIS vessel tracking" },
  { label: "Flightradar24",   url: "https://www.flightradar24.com",                 cat: "AVIATION",    color: "#38bdf8", desc: "Live global flight tracking" },
  { label: "Bellingcat",      url: "https://www.bellingcat.com",                    cat: "OSINT",       color: "#a855f7", desc: "Open source investigations" },
  { label: "CISA Advisories", url: "https://www.cisa.gov/news-events/alerts",       cat: "CYBER",       color: "#38bdf8", desc: "US government cyber threat alerts" },
  { label: "NCSC UK",         url: "https://www.ncsc.gov.uk/news",                  cat: "CYBER",       color: "#38bdf8", desc: "UK National Cyber Security Centre" },
  { label: "Shodan Monitor",  url: "https://monitor.shodan.io",                     cat: "CYBER",       color: "#38bdf8", desc: "Internet-exposed infrastructure" },
  { label: "BNO News",        url: "https://bnonews.com",                           cat: "BREAKING",    color: "#f59e0b", desc: "Breaking news & disaster tracking" },
  { label: "NATO News",       url: "https://www.nato.int/cps/en/natolive/news.htm", cat: "MILITARY",    color: "#10b981", desc: "Official NATO press releases" },
  { label: "UN News",         url: "https://news.un.org/en",                        cat: "DIPLOMATIC",  color: "#10b981", desc: "UN Security Council & world events" },
  { label: "Reuters World",   url: "https://www.reuters.com/world",                 cat: "NEWS",        color: "#94a3b8", desc: "Global breaking news" },
  { label: "ISW Reports",     url: "https://www.understandingwar.org/map",          cat: "ANALYSIS",    color: "#a855f7", desc: "Institute for the Study of War" },
  { label: "ACLED Data",      url: "https://acleddata.com/dashboard",               cat: "CONFLICT",    color: "#ef4444", desc: "Armed conflict event & location data" },
];

export default function OpsRoom() {
  const [panel, setPanel] = useState<Panel>("webcams");
  const [cols, setCols] = useState<2 | 3 | 4>(typeof window !== 'undefined' && window.innerWidth < 600 ? 2 : 3);
  const [utc, setUtc] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 600);

  useEffect(() => {
    const tick = () => setUtc(new Date().toUTCString().replace(" GMT", " UTC"));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = () => {
      const w = window.innerWidth;
      setIsMobile(w < 600);
      if (w < 600) setCols(2);
    };
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const panelMeta = PANELS.find(p => p.id === panel)!;
  const cats = Array.from(new Set(INTEL_LINKS.map(l => l.cat)));
  const filteredLinks = filterCat ? INTEL_LINKS.filter(l => l.cat === filterCat) : INTEL_LINKS;

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#040810", display: "flex", flexDirection: "column", fontFamily: "'Rajdhani', sans-serif", overflow: "hidden" }}>

      {/* ─── HEADER ─── */}
      <header style={{ minHeight: 48, background: "rgba(4,8,16,0.98)", borderBottom: "1px solid rgba(99,179,237,0.12)", display: "flex", alignItems: "center", padding: "0 18px", gap: 14, flexShrink: 0, flexWrap: "wrap" }}>
        <a href="/" style={{ color: "rgba(99,179,237,0.4)", textDecoration: "none", fontSize: 10, letterSpacing: "0.14em", fontFamily: "'JetBrains Mono',monospace" }}>← SENTINEL-MAP</a>
        <div style={{ width: 1, height: 20, background: "rgba(99,179,237,0.1)" }} />
        <Activity size={14} style={{ color: "#ef4444" }} />
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.2em", color: "#e2e8f0", textTransform: "uppercase" }}>OPERATIONS ROOM</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 3, fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", color: "#ef4444" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "livePulse 1s ease-in-out infinite" }} />
          LIVE FEED
        </span>
        <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(226,232,240,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>{utc}</span>
      </header>

      {/* ─── TABS ─── */}
      <nav style={{ height: 40, background: "rgba(4,8,16,0.9)", borderBottom: "1px solid rgba(99,179,237,0.06)", display: "flex", alignItems: "center", padding: "0 10px", gap: 3, flexShrink: 0, overflowX: "auto" }}>
        {PANELS.map(p => {
          const Icon = p.icon;
          const on = panel === p.id;
          return (
            <button key={p.id} onClick={() => setPanel(p.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 5, border: `1px solid ${on ? p.color + "45" : "rgba(99,179,237,0.07)"}`, background: on ? p.color + "12" : "transparent", color: on ? p.color : "rgba(226,232,240,0.35)", cursor: "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Rajdhani',sans-serif", whiteSpace: "nowrap", boxShadow: on ? `0 0 14px ${p.color}18` : "none" }}>
              <Icon size={11} /> {p.label}
            </button>
          );
        })}
        {panel === "webcams" && (
          <>
            <div style={{ width: 1, height: 20, background: "rgba(99,179,237,0.08)", margin: "0 6px" }} />
            {([2, 3, 4] as const).map(n => (
              <button key={n} onClick={() => setCols(n)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${cols === n ? "rgba(245,158,11,0.4)" : "rgba(99,179,237,0.07)"}`, background: cols === n ? "rgba(245,158,11,0.08)" : "transparent", color: cols === n ? "#f59e0b" : "rgba(226,232,240,0.3)", cursor: "pointer", fontSize: 9, fontWeight: 800, fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.1em" }}>{n}✕</button>
            ))}
          </>
        )}
      </nav>

      {/* ─── CONTENT ─── */}
      <div style={{ flex: 1, overflow: "hidden" }}>

        {/* CONFLICT */}
        {panel === "conflict" && (
          <EmbedPanel label="Live Conflict Intelligence" sub="LiveUAMap · ACLED · OSINTdefender · GeoConfirmed" color="#ef4444" ext="https://liveuamap.com">
            <iframe src="https://liveuamap.com/" style={{ flex: 1, border: "none", width: "100%" }} title="Conflict Map" />
          </EmbedPanel>
        )}

        {/* FLIGHTS */}
        {panel === "flights" && (
          <EmbedPanel label="Global Air Traffic Tracking" sub="ADS-B Exchange — Unfiltered military + civilian" color="#38bdf8" ext="https://globe.adsbexchange.com">
            <iframe src="https://globe.adsbexchange.com" style={{ flex: 1, border: "none", width: "100%" }} title="ADS-B Exchange" allow="fullscreen" />
          </EmbedPanel>
        )}

        {/* MARITIME */}
        {panel === "maritime" && (
          <EmbedPanel label="Live Maritime AIS Tracking" sub="VesselFinder — Global ship positions" color="#06b6d4" ext="https://www.vesselfinder.com">
            <iframe src="https://www.vesselfinder.com/?zoom=3" style={{ flex: 1, border: "none", width: "100%" }} title="VesselFinder" />
          </EmbedPanel>
        )}

        {/* WEATHER */}
        {panel === "weather" && (
          <EmbedPanel label="Global Weather · Storm · Wind Tracking" sub="Windy.com ECMWF — Surface wind model" color="#10b981" ext="https://windy.com">
            <iframe
              src="https://embed.windy.com/embed2.html?lat=30&lon=10&zoom=3&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1"
              style={{ flex: 1, border: "none", width: "100%" }}
              title="Windy Weather"
            />
          </EmbedPanel>
        )}

        {/* LIVE CAMS */}
        {panel === "webcams" && (
          <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: 12, boxSizing: "border-box" }}>
            <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: "#f59e0b", textTransform: "uppercase" }}>YouTube 24/7 Live Streams</span>
              <span style={{ fontSize: 8, color: "rgba(226,232,240,0.25)", fontFamily: "'JetBrains Mono',monospace" }}>Confirmed live — muted autoplay</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 10 }}>
              {LIVE_STREAMS.map(cam => (
                <div key={cam.id} style={{ background: "rgba(6,11,20,0.85)", border: "1px solid rgba(245,158,11,0.1)", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.04)", borderBottom: "1px solid rgba(245,158,11,0.07)" }}>
                    <span style={{ fontSize: 13 }}>{cam.flag}</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(226,232,240,0.75)", letterSpacing: "0.04em" }}>{cam.label}</div>
                      <div style={{ fontSize: 8, color: "rgba(226,232,240,0.3)", letterSpacing: "0.06em" }}>{cam.city} · {cam.region}</div>
                    </div>
                    <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 7, fontWeight: 800, color: "#ef4444", letterSpacing: "0.12em" }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "livePulse 1s ease-in-out infinite" }} />
                      LIVE
                    </span>
                  </div>
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${cam.id}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&playsinline=1`}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      title={cam.label}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INTEL HUB */}
        {panel === "signals" && (
          <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "14px 16px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: "#a855f7", textTransform: "uppercase" }}>Intelligence Signal Hub</span>
              <span style={{ fontSize: 8, color: "rgba(226,232,240,0.25)", fontFamily: "'JetBrains Mono',monospace" }}>OSINT · Conflict · Cyber · Diplomatic · Aviation · Maritime</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button onClick={() => setFilterCat(null)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${!filterCat ? "rgba(168,85,247,0.4)" : "rgba(99,179,237,0.1)"}`, background: !filterCat ? "rgba(168,85,247,0.1)" : "transparent", color: !filterCat ? "#a855f7" : "rgba(226,232,240,0.3)", cursor: "pointer", fontSize: 8, fontWeight: 700, fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.1em" }}>ALL</button>
                {cats.map(c => (
                  <button key={c} onClick={() => setFilterCat(filterCat === c ? null : c)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${filterCat === c ? "rgba(168,85,247,0.4)" : "rgba(99,179,237,0.08)"}`, background: filterCat === c ? "rgba(168,85,247,0.1)" : "transparent", color: filterCat === c ? "#a855f7" : "rgba(226,232,240,0.25)", cursor: "pointer", fontSize: 7, fontWeight: 700, fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.1em" }}>{c}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? '1fr' : "repeat(auto-fill,minmax(280px,1fr))", gap: 8 }}>
              {filteredLinks.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", background: "rgba(6,11,20,0.8)", border: `1px solid ${l.color}14`, borderLeft: `3px solid ${l.color}`, borderRadius: "0 6px 6px 0", textDecoration: "none", transition: "background 0.15s" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: l.color, boxShadow: `0 0 5px ${l.color}`, flexShrink: 0, marginTop: 3, animation: "livePulse 2s ease-in-out infinite" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(226,232,240,0.8)", letterSpacing: "0.04em" }}>{l.label}</span>
                      <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.12em", color: l.color, padding: "1px 5px", background: `${l.color}14`, borderRadius: 3 }}>{l.cat}</span>
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(226,232,240,0.3)", lineHeight: 1.4 }}>{l.desc}</div>
                  </div>
                  <ExternalLink size={10} style={{ color: "rgba(226,232,240,0.12)", flexShrink: 0, marginTop: 2 }} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmbedPanel({ label, sub, color, ext, children }: { label: string; sub: string; color: string; ext: string; children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "7px 14px", background: "rgba(4,8,16,0.8)", borderBottom: `1px solid ${color}14`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 8, color: "rgba(226,232,240,0.25)", fontFamily: "'JetBrains Mono',monospace" }}>{sub}</span>
        <a href={ext} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", color: "rgba(99,179,237,0.3)", fontSize: 8, display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
          Full site <ExternalLink size={8} />
        </a>
      </div>
      {children}
    </div>
  );
}
