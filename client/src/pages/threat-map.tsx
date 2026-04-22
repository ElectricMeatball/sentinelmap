import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { CyberEvent, FeedStatus, LayerType } from "@shared/schema";
import { LAYER_META, LAYER_TYPES } from "@shared/schema";

// ─── Icons ─────────────────────────────────────────────────────────────────
import {
  Activity, AlertTriangle, Bug, Clock, Crosshair, Download,
  Filter, Globe, Layers, Lock, Mail, Radar, RefreshCw, Search,
  Server, Shield, Skull, TrendingUp, Wifi, X, Zap, ZoomIn, ZoomOut,
  ChevronRight, ChevronLeft, Circle, Info, ExternalLink, Eye, EyeOff,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

interface ViewState {
  lat: number;
  lon: number;
  zoom: number;
  timeRange: TimeRange;
  layers: Set<LayerType>;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const LAYER_ICONS: Record<LayerType, React.ComponentType<any>> = {
  malware:    Skull,
  c2:         Server,
  phishing:   Radar,
  ransomware: Lock,
  botnet:     Wifi,
  bruteforce: Zap,
  exploit:    Bug,
  spam:       Mail,
  ddos:       Activity,
};

const MITRE_NAMES: Record<string, string> = {
  "T1059": "Command Scripting", "T1566": "Phishing", "T1071": "App Layer Protocol",
  "T1110": "Brute Force", "T1486": "Data Encrypted", "T1498": "Network DoS",
  "T1499": "Endpoint DoS", "T1595": "Active Scanning", "T1595.002": "Vuln Scanning",
};

const TIME_LABELS: Record<TimeRange, string> = {
  "1h": "1H", "6h": "6H", "24h": "24H", "7d": "7D", "30d": "30D",
};

// ─── URL State helpers ──────────────────────────────────────────────────────
function parseURLState(): ViewState {
  const p = new URLSearchParams(window.location.search);
  const layersParam = p.get("layers");
  const layers = layersParam
    ? new Set(layersParam.split(",").filter(l => LAYER_TYPES.includes(l as LayerType)) as LayerType[])
    : new Set(LAYER_TYPES as unknown as LayerType[]);
  return {
    lat:       parseFloat(p.get("lat")  || "20"),
    lon:       parseFloat(p.get("lon")  || "0"),
    zoom:      parseFloat(p.get("zoom") || "2.3"),
    timeRange: (p.get("timeRange") as TimeRange) || "24h",
    layers,
  };
}

function pushURLState(state: ViewState) {
  const p = new URLSearchParams();
  p.set("lat",       state.lat.toFixed(4));
  p.set("lon",       state.lon.toFixed(4));
  p.set("zoom",      state.zoom.toFixed(2));
  p.set("view",      "global");
  p.set("timeRange", state.timeRange);
  p.set("layers",    Array.from(state.layers).join(","));
  window.history.replaceState({}, "", `?${p.toString()}`);
}

// ─── Arc canvas overlay ────────────────────────────────────────────────────
function ArcCanvas({ events, map, activeLayers }: {
  events: CyberEvent[];
  map: L.Map;
  activeLayers: Set<LayerType>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const progRef   = useRef<Map<string, number>>(new Map());

  const visibleEvents = useMemo(
    () => events.filter(e => activeLayers.has(e.layer)).slice(0, 80),
    [events, activeLayers]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = map.getContainer();
      canvas.width  = container.offsetWidth;
      canvas.height = container.offsetHeight;
    };
    resize();
    map.on("resize", resize);
    map.on("move",   () => {}); // force redraw on move

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const ev of visibleEvents) {
        const color = LAYER_META[ev.layer].color;
        const p = (progRef.current.get(ev.id) || Math.random());
        progRef.current.set(ev.id, (p + 0.003) % 1);

        const srcPt = map.latLngToContainerPoint([ev.srcLat, ev.srcLon]);
        const dstPt = map.latLngToContainerPoint([ev.dstLat, ev.dstLon]);

        const dx = dstPt.x - srcPt.x;
        const dy = dstPt.y - srcPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) continue;

        const cpx = (srcPt.x + dstPt.x) / 2 - dy * 0.35;
        const cpy = (srcPt.y + dstPt.y) / 2 + dx * 0.35;

        // Trail arc
        const alpha = 0.12 + (ev.priorityScore / 100) * 0.12;
        ctx.beginPath();
        ctx.moveTo(srcPt.x, srcPt.y);
        ctx.quadraticCurveTo(cpx, cpy, dstPt.x, dstPt.y);
        ctx.strokeStyle = hexToRgba(color, alpha);
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Moving particle
        const t = p;
        const px = (1-t)*(1-t)*srcPt.x + 2*(1-t)*t*cpx + t*t*dstPt.x;
        const py = (1-t)*(1-t)*srcPt.y + 2*(1-t)*t*cpy + t*t*dstPt.y;

        const grd = ctx.createRadialGradient(px, py, 0, px, py, 5);
        grd.addColorStop(0, hexToRgba(color, 0.95));
        grd.addColorStop(1, hexToRgba(color, 0));
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Impact flare at destination
        if (t > 0.93) {
          const flareAlpha = (1 - t) / 0.07;
          const flareR = (1 - t) / 0.07 * 18;
          const fg = ctx.createRadialGradient(dstPt.x, dstPt.y, 0, dstPt.x, dstPt.y, flareR);
          fg.addColorStop(0, hexToRgba(color, flareAlpha * 0.6));
          fg.addColorStop(1, hexToRgba(color, 0));
          ctx.beginPath();
          ctx.arc(dstPt.x, dstPt.y, flareR, 0, Math.PI * 2);
          ctx.fillStyle = fg;
          ctx.fill();
        }

        // Source dot
        ctx.beginPath();
        ctx.arc(srcPt.x, srcPt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, 0.7);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      map.off("resize", resize);
    };
  }, [visibleEvents, map]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", top: 0, left: 0,
        width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 450,
      }}
    />
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Map event markers ─────────────────────────────────────────────────────
function MapMarkers({ events, activeLayers, onSelect, selectedId }: {
  events: CyberEvent[];
  activeLayers: Set<LayerType>;
  onSelect: (ev: CyberEvent) => void;
  selectedId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const markers: L.Marker[] = [];

    const visible = events.filter(e => activeLayers.has(e.layer));

    for (const ev of visible) {
      const color = LAYER_META[ev.layer].color;
      const size  = 6 + Math.round((ev.priorityScore / 100) * 8);
      const isSelected = ev.id === selectedId;

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:${isSelected ? size * 2 : size}px;
            height:${isSelected ? size * 2 : size}px;
            border-radius:50%;
            background:${hexToRgba(color, 0.25)};
            border:1.5px solid ${color};
            box-shadow:0 0 ${isSelected ? 16 : 8}px ${color}, 0 0 3px ${color} inset;
            cursor:pointer;
            transition:all 0.15s;
          "></div>`,
        iconSize:   [isSelected ? size * 2 : size, isSelected ? size * 2 : size],
        iconAnchor: [isSelected ? size : size / 2, isSelected ? size : size / 2],
      });

      const marker = L.marker([ev.srcLat, ev.srcLon], { icon, zIndexOffset: isSelected ? 1000 : 0 })
        .on("click", () => onSelect(ev));
      marker.addTo(map);
      markers.push(marker);
    }

    return () => { markers.forEach(m => m.remove()); };
  }, [events, activeLayers, map, onSelect, selectedId]);

  return null;
}

// ─── Map controller (syncs external state to map) ─────────────────────────
function MapController({ viewState, onViewChange }: {
  viewState: ViewState;
  onViewChange: (lat: number, lon: number, zoom: number) => void;
}) {
  const map = useMap();
  const isMoving = useRef(false);

  useMapEvents({
    moveend: () => {
      if (isMoving.current) return;
      const c = map.getCenter();
      onViewChange(c.lat, c.lng, map.getZoom());
    },
    zoomend: () => {
      const c = map.getCenter();
      onViewChange(c.lat, c.lng, map.getZoom());
    },
  });

  return null;
}

// ─── Arc canvas bridge ─────────────────────────────────────────────────────
function ArcCanvasBridge({ events, activeLayers }: {
  events: CyberEvent[];
  activeLayers: Set<LayerType>;
}) {
  const map = useMap();
  return <ArcCanvas events={events} map={map} activeLayers={activeLayers} />;
}


// ─── Heatmap Canvas ────────────────────────────────────────────────────────
function HeatmapCanvasBridge({ events, activeLayers }: { events: CyberEvent[]; activeLayers: Set<LayerType> }) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);

  const visible = useMemo(
    () => events.filter(e => activeLayers.has(e.layer)),
    [events, activeLayers]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const c = map.getContainer();
      canvas.width = c.offsetWidth;
      canvas.height = c.offsetHeight;
    };
    resize();
    map.on("resize move moveend zoomend", resize);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameRef.current++;
      const f = frameRef.current;

      // Build density grid
      const CELL = 40;
      const cols = Math.ceil(canvas.width / CELL);
      const grid: Record<string, { x: number; y: number; count: number; maxPriority: number; color: string }> = {};

      for (const ev of visible) {
        const pt = map.latLngToContainerPoint([ev.srcLat, ev.srcLon]);
        const cx = Math.floor(pt.x / CELL);
        const cy = Math.floor(pt.y / CELL);
        const key = `${cx},${cy}`;
        if (!grid[key]) grid[key] = { x: (cx + 0.5) * CELL, y: (cy + 0.5) * CELL, count: 0, maxPriority: 0, color: LAYER_META[ev.layer].color };
        grid[key].count++;
        if (ev.priorityScore > grid[key].maxPriority) {
          grid[key].maxPriority = ev.priorityScore;
          grid[key].color = LAYER_META[ev.layer].color;
        }
      }

      const maxCount = Math.max(1, ...Object.values(grid).map(g => g.count));

      for (const cell of Object.values(grid)) {
        const intensity = cell.count / maxCount;
        const radius = CELL * (0.8 + intensity * 1.8);
        const alpha = 0.15 + intensity * 0.45;

        const grad = ctx.createRadialGradient(cell.x, cell.y, 0, cell.x, cell.y, radius);
        const [r, g2, b] = hexToRgbArr(cell.color);
        grad.addColorStop(0, `rgba(${r},${g2},${b},${alpha})`);
        grad.addColorStop(0.4, `rgba(${r},${g2},${b},${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(${r},${g2},${b},0)`);

        ctx.beginPath();
        ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Animated pulsing rings for hot cells
        if (cell.maxPriority >= 80) {
          const phase = (f / 60 + cell.x * 0.01) % 1;
          const pulseR = radius * (0.5 + phase * 1.5);
          const pulseAlpha = (1 - phase) * 0.4;
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g2},${b},${pulseAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      map.off("resize move moveend zoomend", resize);
    };
  }, [visible, map]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 450 }}
    />
  );
}

function hexToRgbArr(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// ─── Choropleth country risk layer ────────────────────────────────────────
function ChoroplethLayer({ visible }: { visible: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  const { data } = useQuery({
    queryKey: ["country-stats"],
    queryFn: async () => {
      const r = await fetch("/api/threats/country-stats");
      return r.json() as Promise<{ countries: { country: string; count: number; lat: number; lon: number }[]; total: number }>;
    },
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!visible) {
      if (layerRef.current) { layerRef.current.clearLayers(); }
      return;
    }
    if (!data?.countries?.length) return;

    if (!layerRef.current) layerRef.current = L.layerGroup().addTo(map);
    else layerRef.current.clearLayers();

    const maxCount = Math.max(1, ...data.countries.map(c => c.count));

    for (const c of data.countries) {
      if (c.country === "Unknown" || !c.lat) continue;
      const intensity = c.count / maxCount;
      const radius = 8 + intensity * 40;
      const r = Math.round(255 * Math.min(1, intensity * 2));
      const g2 = Math.round(255 * Math.max(0, 1 - intensity * 1.5));
      const color = `rgb(${r},${g2},30)`;

      L.circleMarker([c.lat, c.lon], {
        radius,
        fillColor: color,
        color: color,
        fillOpacity: 0.18 + intensity * 0.25,
        opacity: 0.5,
        weight: 1,
      })
        .bindTooltip(`<div style="font-family:'JetBrains Mono',monospace;font-size:11px;background:#0a1120;border:1px solid rgba(99,179,237,0.2);color:#e2e8f0;padding:6px 10px;border-radius:4px">
          <b>${c.country}</b><br/>Events: ${c.count}
        </div>`, { opacity: 1, className: "sentinel-tooltip" })
        .addTo(layerRef.current!);
    }

    return () => {
      if (layerRef.current) layerRef.current.clearLayers();
    };
  }, [data, visible, map]);

  return null;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────
function Sidebar({
  activeLayers, onToggleLayer, layerCounts, feeds, collapsed, onToggleCollapse,
  showChoropleth, onToggleChoropleth,
}: {
  activeLayers: Set<LayerType>;
  onToggleLayer: (l: LayerType) => void;
  layerCounts: Record<LayerType, number>;
  feeds: FeedStatus[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  showChoropleth: boolean;
  onToggleChoropleth: () => void;
}) {
  const liveFeedCount = feeds.filter(f => f.status === "live").length;

  return (
    <div
      className="sentinel-sidebar"
      style={{
        width: collapsed ? "48px" : "260px",
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{
        padding: "14px 14px 10px",
        borderBottom: "1px solid rgba(99,179,237,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "6px",
              background: "linear-gradient(135deg, rgba(56,189,248,0.3), rgba(168,85,247,0.2))",
              border: "1px solid rgba(56,189,248,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Shield size={14} color="#38bdf8" />
            </div>
            <div>
              <div className="sentinel-logo">Sentinel<span>Map</span></div>
              <div style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>CTI Platform</div>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.4)", padding: "4px", marginLeft: collapsed ? "auto" : "0", display: "flex", alignItems: "center" }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
          {/* Stats row */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(99,179,237,0.12)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: "18px", color: "#38bdf8" }}>
                  {Object.values(layerCounts).reduce((a, b) => a + b, 0)}
                </div>
                <div className="stat-label">Events</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: "18px", color: liveFeedCount === feeds.length ? "#10b981" : "#f59e0b" }}>
                  {liveFeedCount}/{feeds.length}
                </div>
                <div className="stat-label">Feeds Live</div>
              </div>
            </div>
          </div>

          {/* Layers header */}
          <div className="section-header">Threat Layers</div>

          {/* Layer toggles */}
          <div style={{ padding: "0 8px", flex: 1, overflowY: "auto" }}>
            {LAYER_TYPES.map(layer => {
              const meta   = LAYER_META[layer];
              const Icon   = LAYER_ICONS[layer];
              const active = activeLayers.has(layer);
              const count  = layerCounts[layer] || 0;
              return (
                <button
                  key={layer}
                  className={`layer-btn ${active ? "active" : ""}`}
                  onClick={() => onToggleLayer(layer)}
                  style={{ borderColor: active ? `${meta.color}30` : "transparent" }}
                >
                  <div
                    className="layer-dot"
                    style={{
                      backgroundColor: active ? meta.color : "transparent",
                      border: active ? "none" : `1.5px solid ${meta.color}50`,
                      color: meta.color,
                    }}
                  />
                  <Icon size={12} color={active ? meta.color : "rgba(226,232,240,0.35)"} />
                  <span style={{ flex: 1 }}>{meta.label}</span>
                  {count > 0 && (
                    <span style={{
                      fontSize: "10px",
                      fontFamily: "'JetBrains Mono',monospace",
                      color: active ? meta.color : "rgba(226,232,240,0.3)",
                      background: active ? `${meta.color}18` : "transparent",
                      padding: "1px 5px",
                      borderRadius: "3px",
                    }}>{count}</span>
                  )}
                  {active ? <Eye size={10} color="rgba(226,232,240,0.4)" /> : <EyeOff size={10} color="rgba(226,232,240,0.2)" />}
                </button>
              );
            })}
          </div>

          {/* Choropleth toggle */}
          <div style={{ padding: "8px 14px 4px" }}>
            <button
              onClick={onToggleChoropleth}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "8px",
                background: showChoropleth ? "rgba(16,185,129,0.08)" : "transparent",
                border: `1px solid ${showChoropleth ? "rgba(16,185,129,0.3)" : "rgba(99,179,237,0.12)"}`,
                borderRadius: "6px", padding: "7px 10px", cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Globe size={12} color={showChoropleth ? "#10b981" : "rgba(226,232,240,0.35)"} />
              <span style={{
                fontFamily: "'Rajdhani',sans-serif", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: showChoropleth ? "#10b981" : "rgba(226,232,240,0.45)",
              }}>Country Risk Map</span>
              <div style={{
                marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%",
                background: showChoropleth ? "#10b981" : "rgba(226,232,240,0.15)",
                boxShadow: showChoropleth ? "0 0 6px #10b981" : "none",
              }} />
            </button>
          </div>

          {/* Feed status */}
          <div style={{ borderTop: "1px solid rgba(99,179,237,0.12)", padding: "0" }}>
            <div className="section-header">Data Sources</div>
            <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: "5px", maxHeight: "180px", overflowY: "auto" }}>
              {feeds.map(f => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div className={`feed-dot ${f.status}`} />
                  <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", flex: 1, fontFamily: "'JetBrains Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  {f.count > 0 && <span style={{ fontSize: "9px", color: "rgba(226,232,240,0.25)" }}>{f.count}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────
function TopBar({
  lat, lon, zoom, timeRange, onTimeRange, search, onSearch, totalEvents, sidebarWidth,
  onRefresh, isLoading, viewMode, onToggleView,
}: {
  lat: number; lon: number; zoom: number;
  timeRange: TimeRange; onTimeRange: (t: TimeRange) => void;
  search: string; onSearch: (s: string) => void;
  totalEvents: number; sidebarWidth: number;
  onRefresh: () => void; isLoading: boolean;
  viewMode: "arcs" | "heatmap";
  onToggleView: () => void;
}) {
  const fmtCoord = (v: number, dirs: [string, string]) => {
    const abs = Math.abs(v).toFixed(4);
    return `${abs}° ${v >= 0 ? dirs[0] : dirs[1]}`;
  };

  return (
    <div className="sentinel-topbar" style={{ left: sidebarWidth, flexWrap: "nowrap", overflow: "hidden" }}>
      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginRight: "4px" }}>
        <div className="live-dot" />
        <span style={{ fontSize: "10px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, color: "#10b981", letterSpacing: "0.08em", textTransform: "uppercase" }}>LIVE</span>
      </div>

      <div style={{ width: "1px", height: "20px", background: "rgba(99,179,237,0.15)" }} />

      {/* Coordinates */}
      <div className="coord-display">
        {fmtCoord(lat, ["N", "S"])} &nbsp;/&nbsp; {fmtCoord(lon, ["E", "W"])} &nbsp;/&nbsp; z{zoom.toFixed(1)}
      </div>

      <div style={{ width: "1px", height: "20px", background: "rgba(99,179,237,0.15)" }} />

      {/* Time range */}
      <div style={{ display: "flex", gap: "4px" }}>
        {(["1h", "6h", "24h", "7d", "30d"] as TimeRange[]).map(t => (
          <button
            key={t}
            className={`time-pill ${timeRange === t ? "active" : ""}`}
            onClick={() => onTimeRange(t)}
          >{TIME_LABELS[t]}</button>
        ))}
      </div>

      <div style={{ width: "1px", height: "20px", background: "rgba(99,179,237,0.15)" }} />

      {/* Search */}
      <div style={{ position: "relative", flex: 1, maxWidth: "280px" }}>
        <Search size={12} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "rgba(226,232,240,0.3)" }} />
        <input
          className="sentinel-search"
          placeholder="IP, domain, malware, country..."
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => onSearch("")}
            style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.4)" }}
          ><X size={12} /></button>
        )}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Total events */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <AlertTriangle size={12} color="#f59e0b" />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "rgba(226,232,240,0.6)" }}>
            {totalEvents.toLocaleString()} events
          </span>
        </div>

        {/* View mode toggle: Arcs / Heatmap */}
        <button
          onClick={onToggleView}
          title={viewMode === "arcs" ? "Switch to Heatmap" : "Switch to Arc View"}
          style={{
            background: viewMode === "heatmap" ? "rgba(99,179,237,0.15)" : "transparent",
            border: `1px solid ${viewMode === "heatmap" ? "rgba(99,179,237,0.5)" : "rgba(99,179,237,0.2)"}`,
            borderRadius: "5px", padding: "5px 10px", cursor: "pointer",
            color: viewMode === "heatmap" ? "#63b3ed" : "rgba(226,232,240,0.5)",
            display: "flex", alignItems: "center", gap: "5px",
            fontFamily: "'Rajdhani',sans-serif", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase",
            transition: "all 0.15s ease",
          }}
        >
          <Globe size={11} />
          {viewMode === "arcs" ? "HEATMAP" : "ARCS"}
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          style={{
            background: "transparent", border: "1px solid rgba(99,179,237,0.2)",
            borderRadius: "5px", padding: "5px 8px", cursor: "pointer",
            color: "rgba(226,232,240,0.5)", display: "flex", alignItems: "center", gap: "4px",
          }}
        >
          <RefreshCw size={12} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
        </button>
      </div>
    </div>
  );
}

// ─── Event Detail Panel ────────────────────────────────────────────────────
function EventPanel({ event, onClose, sidebarWidth }: {
  event: CyberEvent;
  onClose: () => void;
  sidebarWidth: number;
}) {
  const meta  = LAYER_META[event.layer];
  const color = meta.color;
  const Icon  = LAYER_ICONS[event.layer];

  const conf   = event.confidence;
  const confColor = conf >= 80 ? "#10b981" : conf >= 60 ? "#f59e0b" : "#ef4444";

  const severityLabels = ["Informational", "Low", "Medium", "High", "Critical"];
  const severityColors = ["#6b7280", "#3b82f6", "#f59e0b", "#f97316", "#ef4444"];

  function MetaRow({ k, v }: { k: string; v: string }) {
    return (
      <div className="meta-row">
        <span className="meta-key">{k}</span>
        <span className="meta-val">{v}</span>
      </div>
    );
  }

  return (
    <div
      className="sentinel-panel panel-enter"
      style={{ right: 0, top: 52, bottom: 36 }}
    >
      {/* Header */}
      <div style={{
        padding: "14px 14px 10px",
        borderBottom: "1px solid rgba(99,179,237,0.12)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: `linear-gradient(to bottom, ${hexToRgba(color, 0.06)}, transparent)`,
      }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: hexToRgba(color, 0.15),
          border: `1px solid ${hexToRgba(color, 0.35)}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={14} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
            fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em",
            color: color,
          }}>{meta.label}</div>
          <div style={{ fontSize: "10px", color: "rgba(226,232,240,0.4)", fontFamily: "'JetBrains Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.indicator}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.4)", padding: "4px" }}>
          <X size={16} />
        </button>
      </div>

      {/* Severity + Confidence */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(99,179,237,0.08)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "9px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(226,232,240,0.35)", marginBottom: "5px" }}>SEVERITY</div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ display: "flex", gap: "2px" }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    width: "12px", height: "4px", borderRadius: "2px",
                    background: i <= event.severity ? severityColors[event.severity - 1] : "rgba(255,255,255,0.08)",
                  }} />
                ))}
              </div>
              <span style={{ fontSize: "10px", color: severityColors[event.severity - 1], fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>
                {severityLabels[event.severity - 1]}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "9px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(226,232,240,0.35)", marginBottom: "5px" }}>CONFIDENCE</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div className="conf-bar-track" style={{ flex: 1 }}>
                <div className="conf-bar-fill" style={{ width: `${conf}%`, background: confColor }} />
              </div>
              <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", color: confColor }}>{conf}%</span>
            </div>
          </div>
        </div>

        {/* Priority score */}
        <div style={{ marginTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "9px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(226,232,240,0.35)" }}>PRIORITY SCORE</span>
            <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", color: "#38bdf8" }}>{event.priorityScore}/100</span>
          </div>
          <div className="conf-bar-track">
            <div className="conf-bar-fill" style={{ width: `${event.priorityScore}%`, background: "linear-gradient(to right, #38bdf8, #a855f7)" }} />
          </div>
        </div>
      </div>

      {/* Threat context */}
      <div style={{ padding: "10px 14px 6px" }}>
        <div className="section-header" style={{ padding: 0, marginBottom: "8px" }}>Threat Context</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <MetaRow k="Indicator" v={event.indicator} />
          <MetaRow k="Ind. Type" v={event.indicatorType.toUpperCase()} />
          {event.malwareFamily && <MetaRow k="Malware" v={event.malwareFamily} />}
          {event.actor && <MetaRow k="Actor" v={event.actor} />}
          {event.campaign && <MetaRow k="Campaign" v={event.campaign} />}
          {event.cve && <MetaRow k="CVE" v={event.cve} />}
          {event.attackTechnique && (
            <MetaRow k="MITRE" v={`${event.attackTechnique} — ${MITRE_NAMES[event.attackTechnique] || ""}`} />
          )}
          {event.targetSector && <MetaRow k="Sector" v={event.targetSector} />}
        </div>
      </div>

      <div style={{ height: "1px", background: "rgba(99,179,237,0.08)", margin: "4px 14px" }} />

      {/* Geography */}
      <div style={{ padding: "6px 14px" }}>
        <div className="section-header" style={{ padding: 0, marginBottom: "8px" }}>Geography</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <MetaRow k="Source" v={`${event.srcCountry}${event.srcCity ? `, ${event.srcCity}` : ""}`} />
          <MetaRow k="Src Coords" v={`${event.srcLat.toFixed(3)}, ${event.srcLon.toFixed(3)}`} />
          {event.srcOrg && <MetaRow k="Org" v={event.srcOrg} />}
          {event.srcAsn && <MetaRow k="ASN" v={event.srcAsn} />}
          <MetaRow k="Target" v={event.dstCountry} />
          <MetaRow k="Geo Conf." v={event.geoConfidence.toUpperCase()} />
        </div>
      </div>

      <div style={{ height: "1px", background: "rgba(99,179,237,0.08)", margin: "4px 14px" }} />

      {/* Source */}
      <div style={{ padding: "6px 14px" }}>
        <div className="section-header" style={{ padding: 0, marginBottom: "8px" }}>Source Provenance</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <MetaRow k="Feed" v={event.source} />
          <MetaRow k="Reliability" v={`${event.sourceReliability}%`} />
          <MetaRow k="Relationship" v={event.relationshipType.toUpperCase()} />
          <MetaRow k="Observed" v={new Date(event.observedAt).toISOString().replace("T", " ").slice(0, 19) + " UTC"} />
          <MetaRow k="Ingested" v={new Date(event.ingestedAt).toISOString().replace("T", " ").slice(0, 19) + " UTC"} />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: "12px 14px", display: "flex", gap: "8px", marginTop: "auto" }}>
        <button
          style={{
            flex: 1, padding: "8px", borderRadius: "6px",
            background: hexToRgba(color, 0.1),
            border: `1px solid ${hexToRgba(color, 0.3)}`,
            color: color, cursor: "pointer",
            fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
            fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
          }}
        >
          <Crosshair size={12} /> Investigate
        </button>
        {event.sourceUrl && (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, padding: "8px", borderRadius: "6px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(99,179,237,0.15)",
              color: "rgba(226,232,240,0.5)", cursor: "pointer",
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
              fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={12} /> Source
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Event list panel (shows when no event selected) ──────────────────────
function EventListPanel({ events, activeLayers, onSelect, sidebarWidth }: {
  events: CyberEvent[];
  activeLayers: Set<LayerType>;
  onSelect: (e: CyberEvent) => void;
  sidebarWidth: number;
}) {
  const filtered = useMemo(
    () => events.filter(e => activeLayers.has(e.layer)).slice(0, 50),
    [events, activeLayers]
  );

  return (
    <div
      className="sentinel-panel"
      style={{ right: 0, top: 52, bottom: 36, width: "300px" }}
    >
      <div className="section-header">Recent Events ({filtered.length})</div>
      {filtered.map(ev => {
        const meta  = LAYER_META[ev.layer];
        const color = meta.color;
        const Icon  = LAYER_ICONS[ev.layer];
        return (
          <div key={ev.id} className="event-item" onClick={() => onSelect(ev)}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{
                width: "22px", height: "22px", borderRadius: "5px", flexShrink: 0,
                background: hexToRgba(color, 0.15),
                border: `1px solid ${hexToRgba(color, 0.3)}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={11} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{
                    fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
                    fontSize: "11px", textTransform: "uppercase", color: color, letterSpacing: "0.05em",
                  }}>{meta.label}</span>
                  <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono',monospace", color: "rgba(226,232,240,0.25)" }}>
                    p{ev.priorityScore}
                  </span>
                </div>
                <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono',monospace", color: "rgba(226,232,240,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ev.indicator}
                </div>
                <div style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", marginTop: "1px" }}>
                  {ev.srcCountry} → {ev.dstCountry} &nbsp;·&nbsp; {ev.source}
                </div>
              </div>
              <ChevronRight size={12} color="rgba(226,232,240,0.2)" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Ticker ────────────────────────────────────────────────────────────────
function Ticker({ events, sidebarWidth }: { events: CyberEvent[]; sidebarWidth: number }) {
  const items = useMemo(() => {
    const visible = events.slice(0, 30);
    return visible.map(e => ({
      id: e.id,
      color: LAYER_META[e.layer].color,
      layer: LAYER_META[e.layer].label,
      indicator: e.indicator,
      src: e.srcCountry,
      dst: e.dstCountry,
    }));
  }, [events]);

  const content = items.map((it, i) => (
    <span key={it.id + i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "0 18px", borderRight: "1px solid rgba(99,179,237,0.1)" }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: it.color, boxShadow: `0 0 4px ${it.color}`, display: "inline-block", flexShrink: 0 }} />
      <span style={{ color: it.color, fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: "10px", textTransform: "uppercase" }}>{it.layer}</span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(226,232,240,0.45)" }}>{it.indicator}</span>
      <span style={{ fontSize: "10px", color: "rgba(226,232,240,0.25)" }}>→ {it.dst}</span>
    </span>
  ));

  return (
    <div
      className="sentinel-ticker"
      style={{ left: sidebarWidth }}
    >
      <div className="ticker-track">
        {content}
        {content}
      </div>
    </div>
  );
}

// ─── Zoom controls ─────────────────────────────────────────────────────────
function ZoomControls({ sidebarWidth, onZoom }: { sidebarWidth: number; onZoom: (d: 1|-1) => void }) {
  return (
    <div style={{
      position: "absolute",
      bottom: "52px",
      left: sidebarWidth + 16,
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    }}>
      {([1, -1] as const).map(d => (
        <button
          key={d}
          onClick={() => onZoom(d)}
          style={{
            width: "32px", height: "32px",
            background: "rgba(6,11,20,0.88)",
            border: "1px solid rgba(99,179,237,0.2)",
            borderRadius: "6px", cursor: "pointer",
            color: "rgba(226,232,240,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(8px)",
          }}
        >
          {d === 1 ? <ZoomIn size={14} /> : <ZoomOut size={14} />}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function ThreatMap() {
  const [viewState, setViewState] = useState<ViewState>(parseURLState);
  const [selectedEvent, setSelectedEvent] = useState<CyberEvent | null>(null);
  const [search, setSearch]               = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode]            = useState<"arcs"|"heatmap">("arcs");
  const [showChoropleth, setShowChoropleth] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  const sidebarWidth = sidebarCollapsed ? 48 : 260;

  // ── Data fetching ──
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["threats", viewState.timeRange, Array.from(viewState.layers).sort().join(",")],
    queryFn: async () => {
      const layers = Array.from(viewState.layers).join(",");
      const res = await fetch(`/api/threats/live?timeRange=${viewState.timeRange}&layers=${layers}`);
      return res.json() as Promise<{ events: CyberEvent[]; feeds: FeedStatus[]; total: number; lastUpdated: number }>;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const allEvents = useMemo(() => data?.events || [], [data]);
  const feeds     = useMemo(() => data?.feeds  || [], [data]);

  // ── Search filter ──
  const filteredEvents = useMemo(() => {
    if (!search.trim()) return allEvents;
    const q = search.toLowerCase();
    return allEvents.filter(e =>
      e.indicator.toLowerCase().includes(q) ||
      e.srcCountry.toLowerCase().includes(q) ||
      e.dstCountry.toLowerCase().includes(q) ||
      (e.malwareFamily || "").toLowerCase().includes(q) ||
      (e.actor || "").toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q) ||
      e.layer.toLowerCase().includes(q)
    );
  }, [allEvents, search]);

  // ── Layer counts ──
  const layerCounts = useMemo(() => {
    const counts: Record<LayerType, number> = {} as any;
    for (const layer of LAYER_TYPES) counts[layer] = 0;
    for (const e of filteredEvents) counts[e.layer]++;
    return counts;
  }, [filteredEvents]);

  // ── Callbacks ──
  const handleToggleLayer = useCallback((layer: LayerType) => {
    setViewState(prev => {
      const next = new Set(prev.layers);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      const updated = { ...prev, layers: next };
      pushURLState(updated);
      return updated;
    });
  }, []);

  const handleTimeRange = useCallback((t: TimeRange) => {
    setViewState(prev => {
      const updated = { ...prev, timeRange: t };
      pushURLState(updated);
      return updated;
    });
  }, []);

  const handleViewChange = useCallback((lat: number, lon: number, zoom: number) => {
    setViewState(prev => {
      const updated = { ...prev, lat, lon, zoom };
      pushURLState(updated);
      return updated;
    });
  }, []);

  const handleSelectEvent = useCallback((ev: CyberEvent) => {
    setSelectedEvent(ev);
  }, []);

  const handleZoom = useCallback((delta: 1 | -1) => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() + delta);
    }
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedEvent(null);
      if (e.key === "+" || e.key === "=") handleZoom(1);
      if (e.key === "-") handleZoom(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleZoom]);

  // CSS for spin animation
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#060b14" }}>

      {/* Full-screen Leaflet map */}
      <MapContainer
        center={[viewState.lat, viewState.lon]}
        zoom={viewState.zoom}
        style={{ width: "100%", height: "100%", background: "#060b14" }}
        zoomControl={false}
        attributionControl={true}
        ref={(m: any) => { if (m) mapRef.current = m; }}
      >
        {/* CartoDB Dark Matter tiles — free, no API key */}
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
          subdomains="abcd"
        />

        {/* Map event sync */}
        <MapController
          viewState={viewState}
          onViewChange={handleViewChange}
        />

        {/* Attack arcs or heatmap canvas */}
        {viewMode === "arcs" ? (
          <ArcCanvasBridge events={filteredEvents} activeLayers={viewState.layers} />
        ) : (
          <HeatmapCanvasBridge events={filteredEvents} activeLayers={viewState.layers} />
        )}

        {/* Country risk choropleth */}
        <ChoroplethLayer visible={showChoropleth} />

        {/* Event markers */}
        <MapMarkers
          events={filteredEvents}
          activeLayers={viewState.layers}
          onSelect={handleSelectEvent}
          selectedId={selectedEvent?.id || null}
        />
      </MapContainer>

      {/* Left sidebar */}
      <Sidebar
        activeLayers={viewState.layers}
        onToggleLayer={handleToggleLayer}
        layerCounts={layerCounts}
        feeds={feeds}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
        showChoropleth={showChoropleth}
        onToggleChoropleth={() => setShowChoropleth(p => !p)}
      />

      {/* Top bar */}
      <TopBar
        lat={viewState.lat}
        lon={viewState.lon}
        zoom={viewState.zoom}
        timeRange={viewState.timeRange}
        onTimeRange={handleTimeRange}
        search={search}
        onSearch={setSearch}
        totalEvents={filteredEvents.length}
        sidebarWidth={sidebarWidth}
        onRefresh={() => refetch()}
        isLoading={isLoading}
        viewMode={viewMode}
        onToggleView={() => setViewMode(p => p === "arcs" ? "heatmap" : "arcs")}
      />

      {/* Right panel — detail or list */}
      {selectedEvent ? (
        <EventPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          sidebarWidth={sidebarWidth}
        />
      ) : (
        filteredEvents.length > 0 && (
          <EventListPanel
            events={filteredEvents}
            activeLayers={viewState.layers}
            onSelect={handleSelectEvent}
            sidebarWidth={sidebarWidth}
          />
        )
      )}

      {/* Bottom ticker */}
      {filteredEvents.length > 0 && (
        <Ticker events={filteredEvents} sidebarWidth={sidebarWidth} />
      )}

      {/* Zoom controls */}
      <ZoomControls sidebarWidth={sidebarWidth} onZoom={handleZoom} />

      {/* Loading overlay */}
      {isLoading && !allEvents.length && (
        <div style={{
          position: "absolute", top: 0, left: sidebarWidth, right: 0, bottom: 0,
          zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "16px",
          background: "rgba(6,11,20,0.8)",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            border: "2px solid rgba(56,189,248,0.15)",
            borderTop: "2px solid #38bdf8",
            animation: "spin 1s linear infinite",
          }} />
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(226,232,240,0.5)" }}>
            Ingesting threat feeds...
          </div>
          <div style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", color: "rgba(226,232,240,0.25)" }}>
            Fetching 12 OSINT sources
          </div>
        </div>
      )}
    </div>
  );
}
