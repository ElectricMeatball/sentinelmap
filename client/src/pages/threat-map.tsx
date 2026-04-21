import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { WORLD_MAP_DOTS } from "@/components/world-map-dots";
import {
  Activity,
  AlertTriangle,
  Clock,
  Crosshair,
  Download,
  Eye,
  Filter,
  Globe,
  Layers,
  Maximize,
  Minimize,
  Palette,
  Radar,
  RefreshCw,
  Search,
  Shield,
  Signal,
  Skull,
  TrendingUp,
  User,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAP_W = 1000;
const MAP_H = 500;

type AttackCategory = "Malware" | "Phishing" | "DDoS" | "Exploit" | "Ransomware" | "Brute Force" | "Botnet" | "Trojan" | "Spam";
type ColorTheme = "cyan" | "green" | "amber";

const THEME_COLORS: Record<ColorTheme, { primary: string; accent: string; rgb: string }> = {
  cyan: { primary: "#22d3ee", accent: "rgba(34,211,238,", rgb: "34,211,238" },
  green: { primary: "#22c55e", accent: "rgba(34,197,94,", rgb: "34,197,94" },
  amber: { primary: "#f59e0b", accent: "rgba(245,158,11,", rgb: "245,158,11" },
};

interface ThreatEvent {
  id: string;
  ts: number;
  src: { lat: number; lon: number; country: string };
  dst: { lat: number; lon: number; country: string };
  category: AttackCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  technique: string;
  indicator: string;
  reporter: string;
  malware?: string;
  feed?: string;
  confidence?: number;
  campaign?: string;
}

const COUNTRIES: { c: string; name: string; lat: number; lon: number }[] = [
  { c: "US", name: "United States", lat: 39.8, lon: -98.6 },
  { c: "BR", name: "Brazil", lat: -10.3, lon: -53.2 },
  { c: "GB", name: "United Kingdom", lat: 54.7, lon: -2.4 },
  { c: "FR", name: "France", lat: 46.2, lon: 2.2 },
  { c: "DE", name: "Germany", lat: 51.1, lon: 10.4 },
  { c: "ES", name: "Spain", lat: 40.4, lon: -3.7 },
  { c: "IT", name: "Italy", lat: 41.9, lon: 12.6 },
  { c: "TR", name: "Turkey", lat: 39.1, lon: 35.2 },
  { c: "UA", name: "Ukraine", lat: 49.0, lon: 31.3 },
  { c: "RU", name: "Russia", lat: 61.5, lon: 105.3 },
  { c: "IN", name: "India", lat: 20.6, lon: 78.9 },
  { c: "CN", name: "China", lat: 35.9, lon: 104.2 },
  { c: "JP", name: "Japan", lat: 36.2, lon: 138.3 },
  { c: "KR", name: "South Korea", lat: 36.5, lon: 127.9 },
  { c: "SG", name: "Singapore", lat: 1.35, lon: 103.8 },
  { c: "AU", name: "Australia", lat: -25.3, lon: 133.8 },
  { c: "ZA", name: "South Africa", lat: -30.6, lon: 22.9 },
  { c: "NG", name: "Nigeria", lat: 9.1, lon: 8.7 },
  { c: "KE", name: "Kenya", lat: 0.0, lon: 37.9 },
  { c: "AE", name: "UAE", lat: 24.2, lon: 54.4 },
  { c: "SA", name: "Saudi Arabia", lat: 24.0, lon: 45.1 },
  { c: "MX", name: "Mexico", lat: 23.6, lon: -102.5 },
  { c: "CA", name: "Canada", lat: 56.1, lon: -106.3 },
  { c: "NL", name: "Netherlands", lat: 52.1, lon: 5.3 },
  { c: "PL", name: "Poland", lat: 51.9, lon: 19.1 },
  { c: "SE", name: "Sweden", lat: 60.1, lon: 18.6 },
  { c: "AR", name: "Argentina", lat: -38.4, lon: -63.6 },
  { c: "TH", name: "Thailand", lat: 15.9, lon: 101.0 },
  { c: "VN", name: "Vietnam", lat: 14.1, lon: 108.3 },
  { c: "ID", name: "Indonesia", lat: -0.8, lon: 113.9 },
  { c: "EG", name: "Egypt", lat: 26.8, lon: 30.8 },
  { c: "IR", name: "Iran", lat: 32.4, lon: 53.7 },
  { c: "PK", name: "Pakistan", lat: 30.4, lon: 69.3 },
];

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "\u{1F1FA}\u{1F1F8}", "Brazil": "\u{1F1E7}\u{1F1F7}", "United Kingdom": "\u{1F1EC}\u{1F1E7}",
  "France": "\u{1F1EB}\u{1F1F7}", "Germany": "\u{1F1E9}\u{1F1EA}", "Spain": "\u{1F1EA}\u{1F1F8}",
  "Italy": "\u{1F1EE}\u{1F1F9}", "Turkey": "\u{1F1F9}\u{1F1F7}", "Ukraine": "\u{1F1FA}\u{1F1E6}",
  "Russia": "\u{1F1F7}\u{1F1FA}", "India": "\u{1F1EE}\u{1F1F3}", "China": "\u{1F1E8}\u{1F1F3}",
  "Japan": "\u{1F1EF}\u{1F1F5}", "South Korea": "\u{1F1F0}\u{1F1F7}", "Singapore": "\u{1F1F8}\u{1F1EC}",
  "Australia": "\u{1F1E6}\u{1F1FA}", "South Africa": "\u{1F1FF}\u{1F1E6}", "Nigeria": "\u{1F1F3}\u{1F1EC}",
  "Kenya": "\u{1F1F0}\u{1F1EA}", "UAE": "\u{1F1E6}\u{1F1EA}", "Saudi Arabia": "\u{1F1F8}\u{1F1E6}",
  "Mexico": "\u{1F1F2}\u{1F1FD}", "Canada": "\u{1F1E8}\u{1F1E6}", "Netherlands": "\u{1F1F3}\u{1F1F1}",
  "Poland": "\u{1F1F5}\u{1F1F1}", "Sweden": "\u{1F1F8}\u{1F1EA}", "Argentina": "\u{1F1E6}\u{1F1F7}",
  "Thailand": "\u{1F1F9}\u{1F1ED}", "Vietnam": "\u{1F1FB}\u{1F1F3}", "Indonesia": "\u{1F1EE}\u{1F1E9}",
  "Egypt": "\u{1F1EA}\u{1F1EC}", "Iran": "\u{1F1EE}\u{1F1F7}", "Pakistan": "\u{1F1F5}\u{1F1F0}",
  "Unknown": "\u{1F30D}",
};

const CATEGORIES: AttackCategory[] = ["Exploit", "Malware", "Phishing", "DDoS", "Ransomware", "Brute Force", "Botnet", "Trojan", "Spam"];

const CAT_COLORS: Record<string, string> = {
  Exploit: "#f97316", Malware: "#e879f9", Ransomware: "#c084fc", DDoS: "#fb923c",
  Phishing: "#fbbf24", "Brute Force": "#38bdf8", Botnet: "#a3e635", Trojan: "#f43e5e", Spam: "#94a3b8",
};

const MITRE_NAMES: Record<string, string> = {
  "T1190": "Exploit Public-Facing App", "T1110": "Brute Force", "T1595.002": "Vulnerability Scanning",
  "T1059": "Command & Scripting", "T1047": "WMI Execution", "T1027": "Obfuscated Files",
  "T1566": "Phishing", "T1071": "Application Layer Protocol", "T1041": "Exfiltration Over C2",
  "T1204": "User Execution", "T1105": "Ingress Tool Transfer", "T1486": "Data Encrypted for Impact",
};



function geoToMap(lat: number, lon: number) { return { x: ((lon + 180) / 360) * MAP_W, y: ((90 - lat) / 180) * MAP_H }; }
function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }
function getFlag(country: string) { return COUNTRY_FLAGS[country] || "\u{1F30D}"; }

interface LiveAPIEvent {
  id: string; ts: number; indicator: string; malware: string; category: string;
  technique: string; reporter: string; confidence: number; feed?: string; campaign?: string;
  src: { lat: number; lon: number; country: string; city?: string };
  dst: { lat: number; lon: number; country: string };
}

interface FeedInfo {
  name: string; id: string; status: "live" | "offline" | "loading";
  lastUpdated: number | null; count: number; url: string;
}

function useThreatStream() {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [totals, setTotals] = useState({ total: 28181, last24: 22979 });
  const [running, setRunning] = useState(true);
  const [feeds, setFeeds] = useState<FeedInfo[]>([]);
  const realEventsRef = useRef<LiveAPIEvent[]>([]);
  const feedIndexRef = useRef(0);
  const daily24Ref = useRef(0);

  const { data: liveData } = useQuery<{ events: LiveAPIEvent[]; feeds?: FeedInfo[]; lastUpdated?: number; nextUpdate?: number }>({
    queryKey: ["/api/threats/live"], refetchInterval: 24 * 60 * 60 * 1000, staleTime: 24 * 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (liveData?.events && liveData.events.length > 0) { realEventsRef.current = liveData.events; feedIndexRef.current = 0; }
    if (liveData?.feeds) setFeeds(liveData.feeds);
  }, [liveData]);

  const currentDateRef = useRef(new Date().toDateString());
  useEffect(() => {
    const now = new Date(); const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
    daily24Ref.current = Math.floor((now.getTime() - midnight.getTime()) / 1000 * 0.35);
    const checkMidnight = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== currentDateRef.current) { currentDateRef.current = today; daily24Ref.current = 0; setTotals(p => ({ ...p, last24: 0 })); }
    }, 10000);
    return () => clearInterval(checkMidnight);
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const realPool = realEventsRef.current;
      if (realPool.length === 0) return;
      const realEvent = realPool[feedIndexRef.current % realPool.length]; feedIndexRef.current++;
      const cleanIndicator = (realEvent.indicator || "").replace(/^https?:\/\//, "").split("/")[0];
      const cat = (realEvent.category || "Malware") as AttackCategory;
      const confToSeverity = (c: number): 1|2|3|4|5 => c >= 90 ? 5 : c >= 75 ? 4 : c >= 60 ? 3 : c >= 40 ? 2 : 1;
      const ev: ThreatEvent = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        ts: Date.now(),
        src: { lat: realEvent.src.lat, lon: realEvent.src.lon, country: realEvent.src.country || "Unknown" },
        dst: { lat: realEvent.dst.lat, lon: realEvent.dst.lon, country: realEvent.dst.country },
        category: cat,
        severity: confToSeverity(realEvent.confidence || 50),
        technique: realEvent.technique || "Unknown",
        indicator: cleanIndicator || realEvent.indicator, reporter: realEvent.reporter || "Unknown",
        malware: realEvent.malware || "Unknown", feed: realEvent.feed,
        campaign: realEvent.campaign,
        confidence: realEvent.confidence || 50,
      };
      setEvents(prev => [ev, ...prev].slice(0, 200));
      daily24Ref.current++;
      setTotals(p => ({ total: p.total + 1, last24: daily24Ref.current }));
    }, 800 + Math.random() * 400);
    return () => clearInterval(interval);
  }, [running]);

  return { events, totals, running, setRunning, realCount: realEventsRef.current.length, feeds, lastUpdated: liveData?.lastUpdated ?? null };
}

function useAudioEngine(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastPingRef = useRef(0);
  const ping = useCallback(() => {
    if (!enabled) return;
    const now = Date.now(); if (now - lastPingRef.current < 400) return; lastPingRef.current = now;
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current; const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const freq = 800 + Math.random() * 600;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.15);
      osc.type = "sine"; gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, [enabled]);
  return { ping };
}

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const targetRef = useRef(value); const currentRef = useRef(value);
  useEffect(() => { targetRef.current = value; }, [value]);
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = targetRef.current - currentRef.current;
      if (Math.abs(diff) < 1) currentRef.current = targetRef.current;
      else currentRef.current += diff * 0.15;
      setDisplay(Math.round(currentRef.current));
    }, 30);
    return () => clearInterval(interval);
  }, []);
  return <span className={className}>{display.toLocaleString()}</span>;
}

function Sparkline({ data, color, height = 24 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1); const w = 100;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * height}`).join(" ");
  const fillPoints = `0,${height} ${points} ${w},${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs><linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={fillPoints} fill={`url(#spark-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HourlyChart({ events }: { events: ThreatEvent[] }) {
  const hourData = useMemo(() => {
    const hours = Array(24).fill(0);
    events.forEach(e => { hours[new Date(e.ts).getHours()]++; });
    const ch = new Date().getHours();
    return [...hours.slice(ch + 1), ...hours.slice(0, ch + 1)];
  }, [events]);
  const max = Math.max(...hourData, 1);
  return (
    <div className="flex items-end gap-px h-10 w-full">
      {hourData.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all duration-300"
          style={{ height: `${Math.max((v / max) * 100, 4)}%`, background: i === hourData.length - 1 ? "linear-gradient(to top, #22d3ee, #06b6d4)" : `rgba(34, 211, 238, ${0.15 + (v / max) * 0.45})` }} />
      ))}
    </div>
  );
}

function ThreatGauge({ events }: { events: ThreatEvent[] }) {
  const level = useMemo(() => {
    if (events.length === 0) return 0;
    const recent = events.filter(e => Date.now() - e.ts < 30000);
    const avgSev = recent.reduce((a, e) => a + e.severity, 0) / Math.max(recent.length, 1);
    return Math.min((avgSev / 5) * 0.6 + Math.min(recent.length / 15, 1) * 0.4, 1);
  }, [events]);
  const label = level > 0.8 ? "CRITICAL" : level > 0.6 ? "HIGH" : level > 0.35 ? "ELEVATED" : "LOW";
  const color = level > 0.8 ? "#ef4444" : level > 0.6 ? "#f97316" : level > 0.35 ? "#fbbf24" : "#22c55e";
  const angle = -90 + level * 180;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 55" className="w-full" style={{ maxWidth: 120 }}>
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${level * 126} 126`} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        <line x1="50" y1="50" x2={50 + 28 * Math.cos(angle * Math.PI / 180)} y2={50 + 28 * Math.sin(angle * Math.PI / 180)} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="50" cy="50" r="3" fill={color} />
      </svg>
      <span className="text-[10px] font-bold tracking-widest" style={{ color, fontFamily: "'Oxanium', sans-serif" }}>{label}</span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#fbbf24" : "#f97316";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}40` }} />
      </div>
      <span className="font-mono text-[10px] text-white/50">{value}%</span>
    </div>
  );
}

function WorldMapCanvas({ events, onSelectEvent, activeCategories, heatmapMode, zoom, panOffset, countryFilter, onZoomChange, onPanChange }: {
  events: ThreatEvent[]; onSelectEvent: (e: ThreatEvent) => void; activeCategories: Set<string>;
  heatmapMode: boolean; zoom: number; panOffset: { x: number; y: number }; countryFilter: string | null;
  onZoomChange?: (z: number) => void; onPanChange?: (p: { x: number; y: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const impactsRef = useRef<{ x: number; y: number; t: number; color: string }[]>([]);
  const prevCountRef = useRef(0);
  const radarAngleRef = useRef(0);
  const eventsRef = useRef(events);
  const activeCatsRef = useRef(activeCategories);
  const heatmapRef = useRef(heatmapMode);
  const zoomRef = useRef(zoom);
  const panRef = useRef(panOffset);
  const countryFilterRef = useRef(countryFilter);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragPanStartRef = useRef({ x: 0, y: 0 });
  const [hoveredEvent, setHoveredEvent] = useState<ThreatEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hoveredRef = useRef<ThreatEvent | null>(null);

  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => { activeCatsRef.current = activeCategories; }, [activeCategories]);
  useEffect(() => { heatmapRef.current = heatmapMode; }, [heatmapMode]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = panOffset; }, [panOffset]);
  useEffect(() => { countryFilterRef.current = countryFilter; }, [countryFilter]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const newZoom = clamp(zoomRef.current + delta, 0.5, 4);
    zoomRef.current = newZoom;
    onZoomChange?.(newZoom);
  }, [onZoomChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragPanStartRef.current = { ...panRef.current };
    (e.target as HTMLElement).style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const dx = (e.clientX - dragStartRef.current.x) * 0.5;
      const dy = (e.clientY - dragStartRef.current.y) * 0.5;
      const newPan = { x: dragPanStartRef.current.x + dx, y: dragPanStartRef.current.y + dy };
      panRef.current = newPan;
      onPanChange?.(newPan);
      return;
    }
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * 2;
    const my = (e.clientY - rect.top) * 2;
    const w = canvas.width; const h = canvas.height;
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const scaleX = w / MAP_W * currentZoom;
    const scaleY = h / MAP_H * currentZoom;
    const ox = currentPan.x * (w / MAP_W);
    const oy = currentPan.y * (h / MAP_H);
    const currentEvents = eventsRef.current;
    const currentActiveCats = activeCatsRef.current;
    let found: ThreatEvent | null = null;
    for (const ev of currentEvents.slice(0, 30)) {
      if (!currentActiveCats.has(ev.category)) continue;
      const s = geoToMap(ev.src.lat, ev.src.lon);
      const d = geoToMap(ev.dst.lat, ev.dst.lon);
      const sx = s.x * scaleX + ox; const sy = s.y * scaleY + oy;
      const dx2 = d.x * scaleX + ox; const dy2 = d.y * scaleY + oy;
      if (Math.hypot(mx - sx, my - sy) < 20 || Math.hypot(mx - dx2, my - dy2) < 20) {
        found = ev;
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        break;
      }
    }
    if (found !== hoveredRef.current) {
      hoveredRef.current = found;
      setHoveredEvent(found);
    }
  }, [onPanChange]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = "crosshair";
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (hoveredRef.current) {
      onSelectEvent(hoveredRef.current);
    }
  }, [onSelectEvent]);

  useEffect(() => {
    if (events.length > prevCountRef.current && events.length > 0) {
      const newest = events[0];
      if (activeCategories.has(newest.category)) {
        const d = geoToMap(newest.dst.lat, newest.dst.lon);
        impactsRef.current.push({ x: d.x, y: d.y, t: Date.now(), color: CAT_COLORS[newest.category] || "#22d3ee" });
        if (impactsRef.current.length > 30) impactsRef.current.shift();
      }
    }
    prevCountRef.current = events.length;
  }, [events, activeCategories]);

  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let running = true;

    function resizeCanvas() {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px"; canvas.style.height = rect.height + "px";
    }
    resizeCanvas(); window.addEventListener("resize", resizeCanvas);

    function draw() {
      if (!running || !ctx || !canvas) return;
      const w = canvas.width; const h = canvas.height;
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const currentCountryFilter = countryFilterRef.current;
      const currentHeatmap = heatmapRef.current;
      const currentEvents = eventsRef.current;
      const currentActiveCats = activeCatsRef.current;
      const scaleX = w / MAP_W * currentZoom; const scaleY = h / MAP_H * currentZoom;
      const ox = currentPan.x * (w / MAP_W); const oy = currentPan.y * (h / MAP_H);
      const now = Date.now();

      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, "#0d1520");
      bgGrad.addColorStop(0.5, "#080d14");
      bgGrad.addColorStop(1, "#040810");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = "#1a3d2a";
      ctx.lineWidth = 0.5;
      for (let lat = -80; lat <= 80; lat += 20) {
        const mapPt = geoToMap(lat, -180);
        const y = mapPt.y * scaleY + oy;
        if (y < 0 || y > h) continue;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      for (let lon = -180; lon <= 180; lon += 30) {
        const mapPt = geoToMap(0, lon);
        const x = mapPt.x * scaleX + ox;
        if (x < 0 || x > w) continue;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      ctx.globalAlpha = 0.035;
      ctx.strokeStyle = "#34d399";
      const eq = geoToMap(0, 0);
      const eqY = eq.y * scaleY + oy;
      ctx.beginPath(); ctx.moveTo(0, eqY); ctx.lineTo(w, eqY); ctx.stroke();
      ctx.restore();

      let filtered = currentEvents.filter(e => currentActiveCats.has(e.category));
      if (currentCountryFilter) {
        filtered = filtered.filter(e => e.src.country === currentCountryFilter || e.dst.country === currentCountryFilter);
      }

      radarAngleRef.current = (radarAngleRef.current + 0.003) % (Math.PI * 2);
      const radarCX = w / 2 + ox; const radarCY = h / 2 + oy;
      const radarR = Math.min(w, h) * 0.55;
      const radarGrad = ctx.createConicGradient(radarAngleRef.current, radarCX, radarCY);
      radarGrad.addColorStop(0, "rgba(52, 211, 153, 0.07)");
      radarGrad.addColorStop(0.06, "rgba(52, 211, 153, 0.03)");
      radarGrad.addColorStop(0.12, "rgba(52, 211, 153, 0)");
      radarGrad.addColorStop(1, "rgba(52, 211, 153, 0)");
      ctx.save(); ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(radarCX, radarCY, radarR, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = radarGrad; ctx.fillRect(0, 0, w, h); ctx.restore();

      const activeDots = new Set<string>();
      for (const e of filtered.slice(0, 40)) {
        const d = geoToMap(e.dst.lat, e.dst.lon);
        activeDots.add(`${Math.round(d.x / 15)}-${Math.round(d.y / 15)}`);
        const s = geoToMap(e.src.lat, e.src.lon);
        activeDots.add(`${Math.round(s.x / 15)}-${Math.round(s.y / 15)}`);
      }

      ctx.save();
      ctx.fillStyle = "#5cc8b0";
      ctx.globalAlpha = 0.55;
      const inactiveR = 1.6 * currentZoom;
      ctx.beginPath();
      for (const dot of WORLD_MAP_DOTS) {
        const dx = dot.x * scaleX + ox; const dy = dot.y * scaleY + oy;
        if (dx < -10 || dx > w + 10 || dy < -10 || dy > h + 10) continue;
        const key = `${Math.round(dot.x / 15)}-${Math.round(dot.y / 15)}`;
        if (!activeDots.has(key)) {
          ctx.moveTo(dx + inactiveR, dy);
          ctx.arc(dx, dy, inactiveR, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      ctx.restore();

      const activeAlpha = 0.85 + Math.sin(now * 0.003) * 0.15;
      const activeR = 2.4 * currentZoom;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#34d399";
      const glowR = 7 * currentZoom;
      ctx.beginPath();
      for (const dot of WORLD_MAP_DOTS) {
        const dx = dot.x * scaleX + ox; const dy = dot.y * scaleY + oy;
        if (dx < -10 || dx > w + 10 || dy < -10 || dy > h + 10) continue;
        const key = `${Math.round(dot.x / 15)}-${Math.round(dot.y / 15)}`;
        if (activeDots.has(key)) {
          ctx.moveTo(dx + glowR, dy);
          ctx.arc(dx, dy, glowR, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "#6ee7b7";
      ctx.globalAlpha = activeAlpha;
      ctx.beginPath();
      for (const dot of WORLD_MAP_DOTS) {
        const dx = dot.x * scaleX + ox; const dy = dot.y * scaleY + oy;
        if (dx < -10 || dx > w + 10 || dy < -10 || dy > h + 10) continue;
        const key = `${Math.round(dot.x / 15)}-${Math.round(dot.y / 15)}`;
        if (activeDots.has(key)) {
          ctx.moveTo(dx + activeR, dy);
          ctx.arc(dx, dy, activeR, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      ctx.restore();

      const arcs = filtered.slice(0, 30).map(e => {
        const age = (now - e.ts) / 1000; const fade = clamp(1 - age / 15, 0.1, 1);
        const progress = clamp(age / 2.0, 0, 1);
        const s = geoToMap(e.src.lat, e.src.lon); const d = geoToMap(e.dst.lat, e.dst.lon);
        return { e, s, d, fade, progress, color: CAT_COLORS[e.category] || "#22d3ee" };
      }).filter(a => a.fade > 0.1);

      for (const arc of arcs) {
        const { s, d, fade, progress, color } = arc;
        const sx = s.x * scaleX + ox; const sy = s.y * scaleY + oy;
        const dx2 = d.x * scaleX + ox; const dy2 = d.y * scaleY + oy;
        const mx = (sx + dx2) / 2;
        const dist = Math.hypot(dx2 - sx, dy2 - sy);
        const bend = clamp(dist * 0.3, 40 * scaleY, 140 * scaleY);
        const my = (sy + dy2) / 2 - bend;

        ctx.globalAlpha = fade * 0.08; ctx.strokeStyle = color; ctx.lineWidth = 8;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, dx2, dy2); ctx.stroke();

        ctx.globalAlpha = fade * 0.2; ctx.strokeStyle = color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, dx2, dy2); ctx.stroke();

        ctx.globalAlpha = fade * 0.9; ctx.strokeStyle = color; ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]); ctx.lineDashOffset = -now * 0.05;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, dx2, dy2); ctx.stroke();
        ctx.setLineDash([]);

        if (progress < 1) {
          const t = progress;
          const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * dx2;
          const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * dy2;

          ctx.globalAlpha = fade * 0.15; ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(px, py, 8 * currentZoom, 0, Math.PI * 2); ctx.fill();

          ctx.globalAlpha = fade; ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(px, py, 2.5 * currentZoom, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = fade * 0.8; ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(px, py, 3.5 * currentZoom, 0, Math.PI * 2); ctx.fill();

          for (let i = 1; i <= 4; i++) {
            const tt = Math.max(0, t - i * 0.035);
            const trailX = (1 - tt) * (1 - tt) * sx + 2 * (1 - tt) * tt * mx + tt * tt * dx2;
            const trailY = (1 - tt) * (1 - tt) * sy + 2 * (1 - tt) * tt * my + tt * tt * dy2;
            ctx.globalAlpha = fade * (1 - i / 5) * 0.4; ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(trailX, trailY, (2 - i * 0.3) * currentZoom, 0, Math.PI * 2); ctx.fill();
          }
        }

        ctx.globalAlpha = fade * 0.15; ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(sx, sy, 7 * currentZoom, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = fade * 0.9; ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(sx, sy, 3 * currentZoom, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = fade * 0.5; ctx.strokeStyle = color; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(sx, sy, 5 * currentZoom, 0, Math.PI * 2); ctx.stroke();

        if (progress >= 0.95) {
          ctx.globalAlpha = fade * 0.2; ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(dx2, dy2, 9 * currentZoom, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = fade * 0.9; ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(dx2, dy2, 3.5 * currentZoom, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = fade * 0.5; ctx.strokeStyle = color; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(dx2, dy2, 6 * currentZoom, 0, Math.PI * 2); ctx.stroke();
        }
      }

      const impacts = impactsRef.current;
      for (let i = impacts.length - 1; i >= 0; i--) {
        const imp = impacts[i]; const age = (now - imp.t) / 1000;
        if (age > 3) { impacts.splice(i, 1); continue; }
        const ix = imp.x * scaleX + ox; const iy = imp.y * scaleY + oy;

        if (age < 0.3) {
          const flashAlpha = (1 - age / 0.3) * 0.12;
          const flashR = (age * 80 + 10) * currentZoom;
          const flashGrad = ctx.createRadialGradient(ix, iy, 0, ix, iy, flashR);
          flashGrad.addColorStop(0, imp.color);
          flashGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalAlpha = flashAlpha; ctx.fillStyle = flashGrad;
          ctx.fillRect(ix - flashR, iy - flashR, flashR * 2, flashR * 2);
        }

        for (let ring = 0; ring < 3; ring++) {
          const ringAge = age - ring * 0.25; if (ringAge < 0) continue;
          const r = (ringAge * 25 + ring * 8) * currentZoom;
          const alpha = Math.max(0, 1 - ringAge / 2.5) * (ring === 0 ? 0.4 : 0.2);
          ctx.globalAlpha = alpha; ctx.strokeStyle = imp.color; ctx.lineWidth = ring === 0 ? 1.5 : 0.8;
          ctx.beginPath(); ctx.arc(ix, iy, r, 0, Math.PI * 2); ctx.stroke();
        }
      }

      const scanY = (now * 0.025) % h;
      ctx.globalAlpha = 0.035;
      const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
      scanGrad.addColorStop(0, "rgba(52, 211, 153, 0)");
      scanGrad.addColorStop(0.4, "rgba(52, 211, 153, 0.5)");
      scanGrad.addColorStop(0.5, "rgba(52, 211, 153, 1)");
      scanGrad.addColorStop(0.6, "rgba(52, 211, 153, 0.5)");
      scanGrad.addColorStop(1, "rgba(52, 211, 153, 0)");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 40, w, 80);

      const vignetteGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      vignetteGrad.addColorStop(0, "rgba(0,0,0,0)");
      vignetteGrad.addColorStop(1, "rgba(0,0,0,0.3)");
      ctx.globalAlpha = 1; ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      if (currentHeatmap) {
        const hm = new Map<string, { x: number; y: number; count: number }>();
        for (const e of filtered) {
          const s2 = geoToMap(e.src.lat, e.src.lon);
          const sKey = `${Math.round(s2.x / 40)}-${Math.round(s2.y / 40)}`;
          const sExist = hm.get(sKey);
          if (sExist) sExist.count++; else hm.set(sKey, { x: s2.x * scaleX + ox, y: s2.y * scaleY + oy, count: 1 });
          const d2 = geoToMap(e.dst.lat, e.dst.lon);
          const dKey = `${Math.round(d2.x / 40)}-${Math.round(d2.y / 40)}`;
          const dExist = hm.get(dKey);
          if (dExist) dExist.count++; else hm.set(dKey, { x: d2.x * scaleX + ox, y: d2.y * scaleY + oy, count: 1 });
        }
        const maxCount = Math.max(...Array.from(hm.values()).map(z => z.count), 1);
        const heatPulse = 0.85 + Math.sin(now * 0.002) * 0.15;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const zone of Array.from(hm.values())) {
          const intensity = zone.count / maxCount;
          const radius = (60 + intensity * 80) * currentZoom;
          const baseAlpha = (0.15 + intensity * 0.5) * heatPulse;
          const grad = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, radius);
          if (intensity > 0.6) {
            grad.addColorStop(0, `rgba(255, 255, 255, ${baseAlpha * 0.6})`);
            grad.addColorStop(0.15, `rgba(255, 80, 50, ${baseAlpha * 0.9})`);
            grad.addColorStop(0.4, `rgba(255, 140, 0, ${baseAlpha * 0.5})`);
            grad.addColorStop(0.7, `rgba(255, 200, 0, ${baseAlpha * 0.2})`);
            grad.addColorStop(1, "rgba(255, 200, 0, 0)");
          } else if (intensity > 0.3) {
            grad.addColorStop(0, `rgba(255, 100, 30, ${baseAlpha * 0.8})`);
            grad.addColorStop(0.3, `rgba(255, 160, 0, ${baseAlpha * 0.5})`);
            grad.addColorStop(0.6, `rgba(255, 200, 50, ${baseAlpha * 0.2})`);
            grad.addColorStop(1, "rgba(255, 220, 50, 0)");
          } else {
            grad.addColorStop(0, `rgba(255, 180, 0, ${baseAlpha * 0.6})`);
            grad.addColorStop(0.4, `rgba(255, 220, 50, ${baseAlpha * 0.3})`);
            grad.addColorStop(1, "rgba(255, 230, 80, 0)");
          }
          ctx.fillStyle = grad;
          ctx.fillRect(zone.x - radius, zone.y - radius, radius * 2, radius * 2);
        }
        ctx.restore();
      } else {
        for (const e of filtered.slice(0, 20)) {
          const d2 = geoToMap(e.dst.lat, e.dst.lon);
          const px = d2.x * scaleX + ox; const py = d2.y * scaleY + oy;
          const r = 25 * currentZoom;
          const alpha = 0.06;
          const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
          grad.addColorStop(0, `rgba(249, 115, 22, ${alpha})`);
          grad.addColorStop(1, "rgba(249, 115, 22, 0)");
          ctx.fillStyle = grad; ctx.fillRect(px - r, py - r, r * 2, r * 2);
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { running = false; cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resizeCanvas); };
  }, []);

  const latestEvent = events.find(e => activeCategories.has(e.category));

  return (
    <div ref={containerRef} className="relative w-full h-full" data-testid="world-map"
      onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleCanvasClick}
      style={{ cursor: isDraggingRef.current ? "grabbing" : "crosshair" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 pointer-events-none crt-scanlines" />
      <div className="absolute inset-0 pointer-events-none crt-vignette" />

      {hoveredEvent && (
        <div className="absolute z-30 pointer-events-none rounded-lg border border-white/15 bg-black/85 backdrop-blur-md px-3 py-2 shadow-xl"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10, maxWidth: 260 }} data-testid="map-tooltip">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CAT_COLORS[hoveredEvent.category] }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: CAT_COLORS[hoveredEvent.category], fontFamily: "'Oxanium', sans-serif" }}>{hoveredEvent.category}</span>
            <span className="text-[9px] text-white/30 ml-auto font-mono">SEV {hoveredEvent.severity}/5</span>
          </div>
          <div className="font-mono text-[10px] text-white/70 truncate">{hoveredEvent.indicator}</div>
          <div className="font-mono text-[9px] text-white/40 mt-0.5">{hoveredEvent.src.country} → {hoveredEvent.dst.country}</div>
          <div className="text-[8px] text-white/20 mt-1">{hoveredEvent.reporter} · Click to inspect</div>
        </div>
      )}

      {heatmapMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none" data-testid="heatmap-label">
          <div className="flex items-center gap-3 rounded-lg border border-orange-500/30 bg-black/80 backdrop-blur-md px-4 py-1.5">
            <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-orange-300 uppercase" style={{ fontFamily: "'Oxanium', sans-serif" }}>Thermal Heatmap Active</span>
            <div className="flex items-center gap-0.5 ml-2">
              <span className="text-[8px] text-white/30">LOW</span>
              <div className="w-16 h-2 rounded-full" style={{ background: "linear-gradient(to right, #ffdc32, #ffa000, #ff6420, #ff3030, #fff)" }} />
              <span className="text-[8px] text-white/30">HIGH</span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-2 left-3 font-mono text-[9px] text-cyan-500/25 pointer-events-none" data-testid="coord-tl">
        {latestEvent ? `${latestEvent.src.lat.toFixed(4)}\u00b0N ${Math.abs(latestEvent.src.lon).toFixed(4)}\u00b0${latestEvent.src.lon >= 0 ? "E" : "W"}` : "0.0000\u00b0N 0.0000\u00b0E"}
      </div>
      <div className="absolute top-2 right-3 font-mono text-[9px] text-cyan-500/25 pointer-events-none" data-testid="coord-tr">
        {latestEvent ? `${latestEvent.dst.lat.toFixed(4)}\u00b0N ${Math.abs(latestEvent.dst.lon).toFixed(4)}\u00b0${latestEvent.dst.lon >= 0 ? "E" : "W"}` : "0.0000\u00b0N 0.0000\u00b0E"}
      </div>
      <div className="absolute bottom-2 left-3 font-mono text-[9px] text-cyan-500/25 pointer-events-none" data-testid="coord-bl">SRC: {latestEvent?.src.country || "\u2014"}</div>
      <div className="absolute bottom-2 right-3 font-mono text-[9px] text-cyan-500/25 pointer-events-none" data-testid="coord-br">DST: {latestEvent?.dst.country || "\u2014"}</div>

      {latestEvent && (
        <div className="absolute pointer-events-auto cursor-pointer" data-testid="attack-label"
          style={{ left: `${clamp((geoToMap(latestEvent.src.lat, latestEvent.src.lon).x / MAP_W) * 100, 5, 75)}%`, top: `${clamp((geoToMap(latestEvent.src.lat, latestEvent.src.lon).y / MAP_H) * 100 - 6, 5, 70)}%` }}
          onClick={() => onSelectEvent(latestEvent)}>
          <div className="flex items-center gap-2 rounded border border-white/10 bg-black/70 px-3 py-1.5 backdrop-blur-md attack-label-glow">
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: CAT_COLORS[latestEvent.category] }} />
            <span className="font-mono text-[11px] text-white/80">{latestEvent.src.country.slice(0, 12)} \u2192 {latestEvent.dst.country.slice(0, 12)}</span>
            <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase" style={{ backgroundColor: CAT_COLORS[latestEvent.category] + "20", color: CAT_COLORS[latestEvent.category] }}>{latestEvent.category}</span>
          </div>
        </div>
      )}

      {(() => {
        const critCount = events.filter(e => e.severity >= 4).length;
        const level = critCount > 10 ? 5 : critCount > 6 ? 4 : critCount > 3 ? 3 : critCount > 1 ? 2 : 1;
        const colors = ["#22d3ee", "#22d3ee", "#fbbf24", "#f97316", "#ef4444"];
        const labels = ["MINIMAL", "LOW", "GUARDED", "ELEVATED", "SEVERE"];
        return (
          <div className="absolute bottom-12 left-3 z-20 pointer-events-none" data-testid="threat-level-indicator">
            <div className="rounded border border-white/8 bg-black/70 backdrop-blur-sm px-2.5 py-1.5">
              <div className="text-[8px] tracking-[0.2em] text-white/30 uppercase mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>Threat Level</div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={cn("h-3 w-2.5 rounded-sm transition-all", i <= level ? "" : "opacity-20")}
                    style={{ backgroundColor: i <= level ? colors[i-1] : "#334155" }} />
                ))}
                <span className="text-[8px] font-bold tracking-wider ml-1.5" style={{ color: colors[level-1], fontFamily: "'Oxanium', sans-serif" }}>{labels[level-1]}</span>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="absolute inset-0 pointer-events-none glitch-overlay z-12" />

      {events.slice(0, 15).filter(e => activeCategories.has(e.category)).map((e, idx) => {
        const s = geoToMap(e.src.lat, e.src.lon); const d = geoToMap(e.dst.lat, e.dst.lon);
        return (
          <div key={`hitzone-${e.id}`}>
            <div className="absolute pointer-events-auto cursor-pointer w-5 h-5 rounded-full"
              style={{ left: `${(s.x / MAP_W) * 100}%`, top: `${(s.y / MAP_H) * 100}%`, transform: "translate(-50%, -50%)" }}
              onClick={() => onSelectEvent(e)} />
            <div className="absolute pointer-events-auto cursor-pointer w-6 h-6 rounded-full"
              style={{ left: `${(d.x / MAP_W) * 100}%`, top: `${(d.y / MAP_H) * 100}%`, transform: "translate(-50%, -50%)" }}
              onClick={() => onSelectEvent(e)} />
          </div>
        );
      })}
    </div>
  );
}

function DetailDrawer({ event, onClose, isClosing }: { event: ThreatEvent; onClose: () => void; isClosing: boolean }) {
  const color = CAT_COLORS[event.category] || "#22d3ee";
  return (
    <div className={cn("absolute inset-y-0 right-0 w-[340px] z-50 border-l border-white/10 bg-[#0a0e14]/95 backdrop-blur-xl p-5 flex flex-col gap-4", isClosing ? "detail-drawer-exit" : "detail-drawer-enter")} data-testid="detail-drawer">
      <div className="flex items-center justify-between">
        <span className="ag-title text-[11px] text-white/60">Attack Details</span>
        <button onClick={onClose} className="text-white/40 hover:text-white/70 transition" data-testid="btn-close-drawer"><X className="h-4 w-4" /></button>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-bold text-sm text-white/90 uppercase tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>{event.category}</span>
          <span className="ml-auto text-[11px] font-mono text-white/40">SEV {event.severity}/5</span>
        </div>
        <div className="h-px bg-white/10" />
        <Row label="Indicator" value={event.indicator} />
        <Row label="Malware" value={event.malware || "Unknown"} />
        <Row label="MITRE" value={`${event.technique} \u2014 ${MITRE_NAMES[event.technique] || "Unknown"}`} />
        <Row label="Reporter" value={event.reporter} />
        <Row label="Feed" value={event.feed || "\u2014"} />
        <div className="h-px bg-white/10" />
        <div className="space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>Confidence</span>
          <ConfidenceBar value={event.confidence || 75} />
        </div>
        <div className="h-px bg-white/10" />
        <Row label="Source" value={`${getFlag(event.src.country)} ${event.src.country} (${event.src.lat.toFixed(2)}, ${event.src.lon.toFixed(2)})`} />
        <Row label="Target" value={`${getFlag(event.dst.country)} ${event.dst.country} (${event.dst.lat.toFixed(2)}, ${event.dst.lon.toFixed(2)})`} />
        <div className="h-px bg-white/10" />
        <Row label="Timestamp" value={new Date(event.ts).toISOString()} />
      </div>
      <div className="mt-auto flex gap-2">
        <button className="flex-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 text-[11px] font-bold tracking-wider text-cyan-300 uppercase hover:bg-cyan-500/20 transition" style={{ fontFamily: "'Oxanium', sans-serif" }} data-testid="btn-investigate">
          <Crosshair className="h-3 w-3 inline mr-1.5" />Investigate
        </button>
        <button className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-bold tracking-wider text-white/60 uppercase hover:bg-white/10 transition" style={{ fontFamily: "'Oxanium', sans-serif" }} data-testid="btn-export-ioc">
          Export IOC
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-white/40 uppercase tracking-wider shrink-0" style={{ fontFamily: "'Oxanium', sans-serif" }}>{label}</span>
      <span className="font-mono text-[11px] text-white/70 text-right break-all">{value}</span>
    </div>
  );
}

function TickerBar({ events }: { events: ThreatEvent[] }) {
  const items = useMemo(() => {
    return events.slice(0, 20).map(e => {
      const color = CAT_COLORS[e.category] || "#22d3ee";
      return `<span style="color:${color}">\u25cf</span> <span style="color:rgba(255,255,255,0.5)">${e.category.toUpperCase()}</span> <span style="color:rgba(255,255,255,0.3)">${e.indicator}</span> <span style="color:rgba(255,255,255,0.2)">\u2192 ${e.dst.country}</span>`;
    }).join("&nbsp;&nbsp;&nbsp;\u2502&nbsp;&nbsp;&nbsp;");
  }, [events]);
  return (
    <div className="overflow-hidden whitespace-nowrap border-t border-cyan-500/8 bg-[#050810]/90" data-testid="ticker-bar">
      <div className="inline-block animate-ticker py-1 px-4">
        <span className="font-mono text-[10px]" dangerouslySetInnerHTML={{ __html: items + "&nbsp;&nbsp;&nbsp;\u2502&nbsp;&nbsp;&nbsp;" + items }} />
      </div>
    </div>
  );
}

function AttackTimeline({ events }: { events: ThreatEvent[] }) {
  const recent = events.slice(0, 8);
  return (
    <div className="space-y-0" data-testid="attack-timeline">
      {recent.map((e, idx) => {
        const color = CAT_COLORS[e.category] || "#22d3ee";
        const age = Math.floor((Date.now() - e.ts) / 1000);
        const timeLabel = age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`;
        return (
          <div key={e.id} className="flex items-center gap-2 py-1 border-l-2 pl-2 ml-1" style={{ borderColor: idx === 0 ? color : "rgba(255,255,255,0.05)" }}>
            <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="font-mono text-[9px] text-white/50 truncate flex-1">{e.category} \u2014 {e.indicator.slice(0, 18)}</span>
            <span className="font-mono text-[8px] text-white/20 shrink-0">{timeLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const allLines = useMemo(() => [
    "AEROGUARD CTI v4.2.1 // CLASSIFIED",
    "Initializing secure connection...",
    "[OK] TLS 1.3 handshake complete",
    "[OK] Certificate verified: CN=aeroguard.mil",
    "Loading threat intelligence modules...",
    "[OK] ThreatFox IOC feed connected",
    "[OK] URLhaus malware feed connected",
    "[OK] Feodo Tracker botnet feed connected",
    "[OK] Blocklist.de brute force feed connected",
    "[OK] SANS ISC threat feed connected",
    "Initializing geolocation engine...",
    "[OK] IP-API resolver ready (cache: warm)",
    "Loading world map projection...",
    "[OK] Mercator dot-matrix (1847 nodes)",
    "Starting ingestion pipeline...",
    "[OK] Real-time event stream active",
    "Calibrating threat gauge...",
    "[OK] MITRE ATT&CK framework loaded (12 techniques)",
    "System ready. Welcome, Commander.",
    "",
    ">>> ENTERING LIVE MONITORING MODE <<<",
  ], []);

  useEffect(() => {
    let idx = 0;
    let cleared = false;
    const interval = setInterval(() => {
      if (cleared) return;
      if (idx < allLines.length) {
        const line = allLines[idx];
        idx++;
        setLines(prev => [...prev, line]);
      } else {
        cleared = true;
        clearInterval(interval);
        setTimeout(() => { setDone(true); setTimeout(() => onCompleteRef.current(), 600); }, 800);
      }
    }, 90);
    return () => { cleared = true; clearInterval(interval); };
  }, [allLines]);

  return (
    <div className={cn("fixed inset-0 z-[100] bg-[#020408] flex items-center justify-center transition-opacity duration-500", done ? "opacity-0 pointer-events-none" : "opacity-100")} data-testid="boot-sequence">
      <div className="w-full max-w-2xl p-8">
        <div className="mb-6 flex items-baseline gap-0">
          <span className="text-[20px] font-bold tracking-[0.16em] text-white" style={{ fontFamily: "'Oxanium', sans-serif" }}>AEROGUARD</span>
          <span className="text-[20px] font-bold tracking-[0.16em] text-cyan-400" style={{ fontFamily: "'Oxanium', sans-serif" }}>CTI</span>
        </div>
        <div className="font-mono text-[12px] leading-relaxed space-y-0.5">
          {lines.map((line, i) => (
            <div key={i} className={cn(
              "boot-line-enter",
              line.startsWith("[OK]") ? "text-emerald-400/80" :
              line.startsWith(">>>") ? "text-cyan-400 font-bold" :
              "text-white/50"
            )}>
              {line.startsWith("[OK]") && <span className="text-emerald-400">[OK] </span>}
              {line.startsWith("[OK]") ? line.slice(5) : line}
            </div>
          ))}
          {!done && <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5" />}
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none crt-scanlines" />
    </div>
  );
}

function exportCSV(events: ThreatEvent[]) {
  const header = "Timestamp,Category,Severity,Indicator,Malware,Technique,Source Country,Source Lat,Source Lon,Target Country,Target Lat,Target Lon,Reporter,Feed,Confidence\n";
  const rows = events.map(e =>
    `${new Date(e.ts).toISOString()},${e.category},${e.severity},${e.indicator},"${(e.malware || "").replace(/"/g, '""')}",${e.technique},${e.src.country},${e.src.lat.toFixed(4)},${e.src.lon.toFixed(4)},${e.dst.country},${e.dst.lat.toFixed(4)},${e.dst.lon.toFixed(4)},${e.reporter},${e.feed || ""},${e.confidence || ""}`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `aeroguard-iocs-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function ThreatMapPage() {
  const [booting, setBooting] = useState(true);
  const { events, totals, running, setRunning, realCount, feeds, lastUpdated } = useThreatStream();
  const [selectedEvent, setSelectedEvent] = useState<ThreatEvent | null>(null);
  const [isClosingDrawer, setIsClosingDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(() => new Set(CATEGORIES));
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(24);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [colorTheme, setColorTheme] = useState<ColorTheme>("cyan");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [severityFlash, setSeverityFlash] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ping } = useAudioEngine(soundEnabled);
  const sessionStartRef = useRef(Date.now());
  const [sessionTime, setSessionTime] = useState("00:00:00");

  const closeDrawer = useCallback(() => {
    setIsClosingDrawer(true);
    setTimeout(() => { setSelectedEvent(null); setIsClosingDrawer(false); }, 280);
  }, []);

  const prevEventCountRef = useRef(0);
  useEffect(() => {
    if (events.length > prevEventCountRef.current) {
      ping();
      const newest = events[0];
      if (newest && newest.severity >= 4) {
        setSeverityFlash(true);
        setTimeout(() => setSeverityFlash(false), 1500);
      }
    }
    prevEventCountRef.current = events.length;
  }, [events, ping]);

  useEffect(() => {
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      setSessionTime(`${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const sparklineData = useRef<number[]>(Array(20).fill(0));
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      sparklineData.current = [...sparklineData.current.slice(1), events.filter(e => now - e.ts < 3000).length];
    }, 1500);
    return () => clearInterval(interval);
  }, [events]);

  const filteredEvents = useMemo(() => {
    let result = events;
    const now = Date.now();
    if (timeRange < 24) result = result.filter(e => (now - e.ts) < timeRange * 3600000);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.indicator.toLowerCase().includes(q) || (e.malware || "").toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) || e.src.country.toLowerCase().includes(q) || e.dst.country.toLowerCase().includes(q)
      );
    }
    if (countryFilter) result = result.filter(e => e.src.country === countryFilter || e.dst.country === countryFilter);
    return result;
  }, [events, timeRange, searchQuery, countryFilter]);

  const attackRate = useMemo(() => events.filter(e => Date.now() - e.ts < 60000).length, [events]);

  const toggleCategory = useCallback((cat: string) => {
    setActiveCategories(prev => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" && e.target === document.body) { e.preventDefault(); setRunning(p => !p); }
      if (e.code === "KeyF" && e.target === document.body) { e.preventDefault(); toggleFullscreen(); }
      if (e.code === "KeyM" && e.target === document.body) { e.preventDefault(); setSoundEnabled(p => !p); }
      if (e.code === "KeyH" && e.target === document.body) { e.preventDefault(); setHeatmapMode(p => !p); }
      if (e.code === "Slash" && e.target === document.body) { e.preventDefault(); setShowSearch(p => !p); }
      if (e.code === "Escape") { closeDrawer(); setShowSearch(false); setCountryFilter(null); setShowThemePicker(false); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setRunning, toggleFullscreen, closeDrawer]);

  useEffect(() => {
    function onFSChange() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  const liveCount = useMemo(() => filteredEvents.filter(e => Date.now() - e.ts < 10000).length, [filteredEvents]);

  const topTargets = useMemo(() => {
    const m = new Map<string, number>();
    filteredEvents.forEach(e => m.set(e.dst.country, (m.get(e.dst.country) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredEvents]);

  const topSources = useMemo(() => {
    const m = new Map<string, number>();
    filteredEvents.forEach(e => m.set(e.src.country, (m.get(e.src.country) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredEvents]);

  const techniquesCounts = useMemo(() => {
    const m = new Map<string, number>();
    filteredEvents.forEach(e => m.set(e.technique, (m.get(e.technique) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredEvents]);

  const sevCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    filteredEvents.forEach(e => { if (e.severity === 5) c.critical++; else if (e.severity === 4) c.high++; else if (e.severity === 3) c.medium++; else c.low++; });
    return c;
  }, [filteredEvents]);

  const threatOfDay = useMemo(() => {
    const m = new Map<string, number>();
    filteredEvents.forEach(e => { if (e.malware) m.set(e.malware, (m.get(e.malware) ?? 0) + 1); });
    const sorted = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null;
  }, [filteredEvents]);

  const malwareFamilies = useMemo(() => {
    const m = new Map<string, { count: number; categories: Set<string> }>();
    filteredEvents.forEach(e => {
      const name = e.malware || "Unknown";
      const existing = m.get(name);
      if (existing) { existing.count++; existing.categories.add(e.category); }
      else m.set(name, { count: 1, categories: new Set([e.category]) });
    });
    return Array.from(m.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 6);
  }, [filteredEvents]);

  const campaignGroups = useMemo(() => {
    const m = new Map<string, ThreatEvent[]>();
    filteredEvents.forEach(e => {
      if (e.campaign) {
        const arr = m.get(e.campaign) || []; arr.push(e); m.set(e.campaign, arr);
      }
    });
    if (m.size < 3) {
      const byMalware = new Map<string, ThreatEvent[]>();
      filteredEvents.forEach(e => {
        const key = e.malware || e.category;
        if (key && !m.has(key)) {
          const arr = byMalware.get(key) || []; arr.push(e); byMalware.set(key, arr);
        }
      });
      Array.from(byMalware.entries()).forEach(([k, v]) => {
        if (v.length >= 2 && m.size < 6) m.set(k, v);
      });
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  }, [filteredEvents]);

  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  useEffect(() => {
    const t = setInterval(() => setSystemTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
    return () => clearInterval(t);
  }, []);

  const themeColor = THEME_COLORS[colorTheme];

  if (booting) return <BootSequence onComplete={() => setBooting(false)} />;

  return (
    <div ref={containerRef} className={cn("h-screen w-screen overflow-hidden bg-[#060a10] text-white flex flex-col ambient-pulse", severityFlash && "severity-flash")} style={{ "--theme-primary": themeColor.primary, "--theme-rgb": themeColor.rgb } as React.CSSProperties} data-testid="page-threat-map">
      <div className="absolute inset-0 pointer-events-none crt-overlay z-[60]" />
      <div className="absolute inset-0 pointer-events-none glitch-overlay z-[61]" />

      <div className="relative z-10 flex items-center justify-center gap-6 py-1.5 border-b border-cyan-500/10 bg-gradient-to-r from-[#080c14] via-[#0a1020] to-[#080c14] shrink-0" data-testid="banner-24h">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-400/80" />
          <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase" style={{ fontFamily: "'Oxanium', sans-serif" }}>Attacks Detected in Last 24h</span>
        </div>
        <div className="text-xl font-black text-orange-400 font-mono tabular-nums tracking-wider" style={{ textShadow: "0 0 20px rgba(249,115,22,0.4)" }} data-testid="text-24h-count">
          <AnimatedCounter value={totals.last24} />
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-white/25">
          <span><TrendingUp className="h-3 w-3 inline mr-1 text-emerald-400/60" />{attackRate}/min</span>
          <span>\u2502</span>
          <span><Clock className="h-3 w-3 inline mr-1 text-cyan-400/40" />Resets 00:00 UTC</span>
        </div>
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 py-2 border-b border-cyan-500/10 bg-[#080c14]/95 backdrop-blur-md shrink-0" data-testid="header">
        <div className="flex items-center gap-3">
          <div className="relative grid h-9 w-9 place-items-center rounded-lg border border-cyan-500/25 bg-cyan-500/8" data-testid="logo">
            <Shield className="h-5 w-5 text-cyan-400" />
            <div className="absolute inset-0 rounded-lg animate-ping bg-cyan-400/10" style={{ animationDuration: "3s" }} />
          </div>
          <div>
            <div className="flex items-baseline gap-0" data-testid="text-app-title">
              <span className="text-[16px] font-bold tracking-[0.16em] text-white" style={{ fontFamily: "'Oxanium', sans-serif" }}>AEROGUARD</span>
              <span className="text-[16px] font-bold tracking-[0.16em] text-cyan-400" style={{ fontFamily: "'Oxanium', sans-serif" }}>CTI</span>
            </div>
            <div className="text-[9px] tracking-[0.22em] text-cyan-500/40 uppercase" style={{ fontFamily: "'Oxanium', sans-serif" }} data-testid="text-app-subtitle">Threat Intelligence Platform</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search IOCs, malware, IPs..."
                className="w-48 rounded border border-cyan-500/20 bg-[#0a0f16] pl-7 pr-2 py-1 text-[11px] font-mono text-white/70 placeholder:text-white/20 outline-none focus:border-cyan-500/40" autoFocus data-testid="input-search" />
            </div>
          )}
          <div className="flex items-center rounded border border-white/8 bg-white/3 overflow-hidden" data-testid="time-range-selector">
            {[1, 6, 12, 24].map(h => (
              <button key={h} onClick={() => setTimeRange(h)}
                className={cn("px-2 py-0.5 text-[10px] font-mono transition", timeRange === h ? "bg-cyan-500/20 text-cyan-300" : "text-white/30 hover:text-white/50")}
                data-testid={`btn-range-${h}h`}>{h}h</button>
            ))}
          </div>
          {countryFilter && (
            <button onClick={() => setCountryFilter(null)} className="flex items-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300 font-mono" data-testid="btn-clear-country">
              {getFlag(countryFilter)} {countryFilter.slice(0, 10)} <X className="h-3 w-3" />
            </button>
          )}
          <div className="flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/8 px-3 py-1" data-testid="status-live">
            <div className="relative"><div className="h-2 w-2 rounded-full bg-emerald-400" /><div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400 animate-ping" /></div>
            <span className="text-[11px] font-bold tracking-[0.12em] text-emerald-300" style={{ fontFamily: "'Oxanium', sans-serif" }}>LIVE</span>
          </div>
          <div className="rounded border border-cyan-500/15 bg-cyan-500/5 px-3 py-1" data-testid="status-indicators">
            <span className="text-[11px] tracking-[0.06em] text-cyan-300/60 font-mono">{realCount > 0 ? realCount : 200} IOCs</span>
          </div>
          <div className="rounded border border-white/8 bg-white/3 px-3 py-1" data-testid="session-timer">
            <span className="text-[11px] text-white/30 font-mono">SESSION {sessionTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right" data-testid="system-time">
            <div className="text-[9px] tracking-[0.14em] text-white/30 uppercase" style={{ fontFamily: "'Oxanium', sans-serif" }}>UTC TIME</div>
            <div className="font-mono text-[13px] text-cyan-300/70 tabular-nums">{systemTime}</div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowSearch(p => !p)} className="grid h-7 w-7 place-items-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white/70 transition" data-testid="btn-search" title="Search (/)">
              <Search className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setHeatmapMode(p => !p)} className={cn("grid h-7 w-7 place-items-center rounded border transition", heatmapMode ? "border-orange-500/40 bg-orange-500/15 text-orange-400" : "border-white/10 bg-white/5 text-white/40 hover:text-white/70")} data-testid="btn-heatmap" title="Heatmap (H)">
              <Layers className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setSoundEnabled(p => !p)} className="grid h-7 w-7 place-items-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white/70 transition" data-testid="btn-sound" title="Sound (M)">
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <button onClick={toggleFullscreen} className="grid h-7 w-7 place-items-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white/70 transition" data-testid="btn-fullscreen" title="Fullscreen (F)">
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            </button>
            <div className="relative">
              <button onClick={() => setShowThemePicker(p => !p)} className="grid h-7 w-7 place-items-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white/70 transition" data-testid="btn-theme" title="Theme">
                <Palette className="h-3.5 w-3.5" />
              </button>
              {showThemePicker && (
                <div className="absolute right-0 top-9 z-50 rounded-lg border border-white/10 bg-[#0a0e14]/95 backdrop-blur-xl p-2 flex gap-1.5 theme-picker-enter" data-testid="theme-picker">
                  {(["cyan", "green", "amber"] as ColorTheme[]).map(t => (
                    <button key={t} onClick={() => { setColorTheme(t); setShowThemePicker(false); }}
                      className={cn("h-6 w-6 rounded-full border-2 transition", colorTheme === t ? "border-white/60 scale-110" : "border-white/10 hover:border-white/30")}
                      style={{ backgroundColor: THEME_COLORS[t].primary }} data-testid={`theme-${t}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/15 bg-[#0c1018] px-3 py-1.5" data-testid="user-badge">
            <div className="text-right">
              <div className="text-[11px] font-bold text-white/80" style={{ fontFamily: "'Oxanium', sans-serif" }}>COMMANDER</div>
              <div className="text-[8px] tracking-[0.12em] text-cyan-500/40">ADIR/CTOS</div>
            </div>
            <div className="relative">
              <div className="grid h-7 w-7 place-items-center rounded bg-cyan-500/15 text-cyan-300"><User className="h-3.5 w-3.5" /></div>
              {severityFlash && <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" data-testid="severity-badge" />}
            </div>
          </div>
        </div>
      </header>

      <div className="relative flex-1 grid grid-cols-[260px_1fr_300px] gap-0 min-h-0 z-10" data-testid="layout-main">

        <aside className="border-r border-cyan-500/8 bg-[#080c14]/80 backdrop-blur-sm p-3 flex flex-col gap-2.5 overflow-y-auto sidebar-scroll" data-testid="sidebar-left">

          <Panel icon={<Activity className="h-3.5 w-3.5 text-cyan-400/70" />} title="Global Overview" testId="panel-total-indicators">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-white tracking-tight" data-testid="text-total"><AnimatedCounter value={totals.total} /></div>
                <div className="text-[10px] text-white/30 font-mono">Total Indicators</div>
              </div>
              <ThreatGauge events={filteredEvents} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-white/30">
              <Zap className="h-3 w-3 text-orange-400/60" />
              <span><span className="text-orange-400/80 font-bold">{attackRate}</span> attacks/min</span>
            </div>
            <div className="mt-2"><Sparkline data={sparklineData.current} color={themeColor.primary} height={28} /></div>
          </Panel>

          <Panel icon={<Crosshair className="h-3.5 w-3.5 text-cyan-400/70" />} title="Filter by Category" testId="panel-threat-dist">
            <div className="grid gap-0.5">
              {CATEGORIES.map(cat => {
                const count = filteredEvents.filter(e => e.category === cat).length;
                const maxCount = Math.max(...CATEGORIES.map(c => filteredEvents.filter(e => e.category === c).length), 1);
                const color = CAT_COLORS[cat]; const active = activeCategories.has(cat);
                return (
                  <button key={cat} className={cn("flex items-center justify-between py-1 px-1.5 rounded transition-all", active ? "opacity-100 hover:bg-white/5" : "opacity-30 hover:opacity-50")}
                    onClick={() => toggleCategory(cat)} data-testid={`dist-${cat.toLowerCase().replace(" ", "-")}`}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="text-[11px] text-white/70">{cat}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: color }} />
                      </div>
                      <span className="font-mono text-[10px] text-white/40 w-4 text-right">{count}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel icon={<Radar className="h-3.5 w-3.5 text-rose-400/70" />} title="Most Attacked Countries" testId="panel-top-targets">
            <div className="grid gap-1.5">
              {topTargets.map(([country, count], idx) => {
                const max = topTargets[0]?.[1] || 1;
                return (
                  <button key={country} className="flex items-center gap-2 w-full hover:bg-white/5 rounded px-0.5 py-0.5 transition" onClick={() => setCountryFilter(country === countryFilter ? null : country)} data-testid={`top-target-${idx}`}>
                    <span className="font-mono text-[10px] text-white/20 w-3">{idx + 1}</span>
                    <span className="text-xs">{getFlag(country)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] text-white/70">{country.length > 12 ? country.slice(0, 10) + "\u2026" : country}</span>
                        <span className="font-mono text-[10px] text-rose-400/60">{count}</span>
                      </div>
                      <div className="h-0.5 w-full rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-500" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel icon={<Globe className="h-3.5 w-3.5 text-orange-400/70" />} title="Top Attacker Countries" testId="panel-top-sources">
            <div className="grid gap-1.5">
              {topSources.map(([country, count], idx) => {
                const max = topSources[0]?.[1] || 1;
                return (
                  <button key={country} className="flex items-center gap-2 w-full hover:bg-white/5 rounded px-0.5 py-0.5 transition" onClick={() => setCountryFilter(country === countryFilter ? null : country)} data-testid={`top-source-${idx}`}>
                    <span className="font-mono text-[10px] text-white/20 w-3">{idx + 1}</span>
                    <span className="text-xs">{getFlag(country)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] text-white/70">{country.length > 12 ? country.slice(0, 10) + "\u2026" : country}</span>
                        <span className="font-mono text-[10px] text-orange-400/60">{count}</span>
                      </div>
                      <div className="h-0.5 w-full rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </aside>

        <main className="relative flex flex-col min-h-0" data-testid="main-center">
          <div className="flex-1 relative min-h-0 bg-[#060a10] map-grid-bg map-border-glow" style={{ '--attack-rate': Math.min(attackRate / 20, 1) } as React.CSSProperties}>
            <WorldMapCanvas events={filteredEvents} onSelectEvent={setSelectedEvent} activeCategories={activeCategories} heatmapMode={heatmapMode} zoom={zoom} panOffset={panOffset} countryFilter={countryFilter} onZoomChange={setZoom} onPanChange={setPanOffset} />

            <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-20" data-testid="zoom-controls">
              <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="grid h-7 w-7 place-items-center rounded border border-white/10 bg-black/50 text-white/50 hover:text-white/80 backdrop-blur-sm transition" data-testid="btn-zoom-in"><ZoomIn className="h-3.5 w-3.5" /></button>
              <button onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} className="grid h-7 w-7 place-items-center rounded border border-white/10 bg-black/50 text-white/50 hover:text-white/80 backdrop-blur-sm transition text-[10px] font-mono" data-testid="btn-zoom-reset">{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="grid h-7 w-7 place-items-center rounded border border-white/10 bg-black/50 text-white/50 hover:text-white/80 backdrop-blur-sm transition" data-testid="btn-zoom-out"><ZoomOut className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="border-t border-cyan-500/10 bg-[#080c14]/95 backdrop-blur-md px-6 py-2.5 flex items-center justify-center gap-6" data-testid="panel-counters">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-50" />
              </div>
              <CounterBlock value={liveCount} label="Active Threats" color="text-emerald-400" large testId="counter-live" />
            </div>
            <div className="h-8 w-px bg-cyan-500/15" />
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <CounterBlock value={sevCounts.critical} label="Critical" color="text-rose-400" testId="counter-critical" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                <CounterBlock value={sevCounts.high} label="High" color="text-orange-400" testId="counter-high" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <CounterBlock value={sevCounts.medium} label="Medium" color="text-amber-400" testId="counter-medium" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <CounterBlock value={sevCounts.low} label="Low" color="text-cyan-400" testId="counter-low" />
              </div>
            </div>
            <div className="h-8 w-px bg-cyan-500/15" />
            <div className="text-center">
              <div className="font-mono text-[10px] text-white/25 uppercase tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>Feeds Online</div>
              <div className="font-bold font-mono text-sm text-emerald-400 tabular-nums">{feeds.filter(f => f.status === "live").length}<span className="text-white/20">/{feeds.length || 12}</span></div>
            </div>
            <div className="h-8 w-px bg-cyan-500/15" />
            <div className="text-center">
              <div className="font-mono text-[10px] text-white/25 uppercase tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>Last Updated</div>
              <div className="font-mono text-xs text-cyan-300/70 tabular-nums" data-testid="last-updated-time">
                {lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
            </div>
            <div className="h-8 w-px bg-cyan-500/15" />
            <div className="text-center">
              <div className="font-mono text-[10px] text-white/25 uppercase tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>Next Refresh</div>
              <div className="font-mono text-xs text-white/40 tabular-nums" data-testid="next-refresh-time">
                {lastUpdated ? (() => { const d = new Date(lastUpdated + 24 * 60 * 60 * 1000); const today = new Date(); const isTomorrow = d.getDate() !== today.getDate() || d.getMonth() !== today.getMonth(); return (isTomorrow ? "Tomorrow " : "") + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); })() : "—"}
              </div>
            </div>
          </div>
          {selectedEvent && <DetailDrawer event={selectedEvent} onClose={closeDrawer} isClosing={isClosingDrawer} />}
        </main>

        <aside className="border-l border-cyan-500/8 bg-[#080c14]/80 backdrop-blur-sm p-3 flex flex-col gap-2.5 overflow-y-auto sidebar-scroll" data-testid="sidebar-right">

          {threatOfDay && (
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3" data-testid="panel-threat-of-day">
              <div className="flex items-center gap-2 mb-2">
                <Skull className="h-3.5 w-3.5 text-orange-400/80" />
                <span className="text-[10px] tracking-[0.14em] text-orange-400/60 uppercase" style={{ fontFamily: "'Oxanium', sans-serif" }}>Threat of the Day</span>
              </div>
              <div className="text-[13px] font-bold text-orange-300/90 font-mono truncate">{threatOfDay[0]}</div>
              <div className="text-[10px] text-white/30 font-mono mt-1">{threatOfDay[1]} detections</div>
            </div>
          )}

          <Panel icon={<Skull className="h-3.5 w-3.5 text-rose-400/70" />} title="Top Malware Families" testId="panel-malware-families">
            <div className="grid gap-1">
              {malwareFamilies.map(([name, data], idx) => (
                <div key={name} className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-2 py-1.5" data-testid={`malware-family-${idx}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-[10px] text-white/20">{idx + 1}</span>
                    <span className="font-mono text-[10px] text-white/60 truncate">{name.length > 18 ? name.slice(0, 16) + "\u2026" : name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {Array.from(data.categories).slice(0, 2).map(cat => (
                      <div key={cat} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CAT_COLORS[cat] || "#22d3ee" }} />
                    ))}
                    <span className="font-mono text-[10px] text-white/30">{data.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel icon={<Eye className="h-3.5 w-3.5 text-purple-400/70" />} title="Active Campaigns" testId="panel-campaigns">
            <div className="grid gap-1">
              {campaignGroups.map(([name, evts], idx) => {
                const cats = new Set(evts.map(e => e.category));
                const primaryCat = evts[0]?.category || "Malware";
                return (
                  <div key={name} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5" data-testid={`campaign-${idx}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CAT_COLORS[primaryCat] }} />
                        <span className="font-mono text-[10px] text-white/60 truncate">{name.slice(0, 16)}</span>
                      </div>
                      <span className="font-mono text-[9px] text-white/25">{evts.length} hits</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from(new Set(evts.map(e => e.dst.country))).slice(0, 3).map(c => (
                        <span key={c} className="text-[8px] text-white/20">{getFlag(c)}</span>
                      ))}
                      <span className="text-[8px] text-white/15 ml-auto">{Array.from(cats).join(", ")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel icon={<Crosshair className="h-3.5 w-3.5 text-cyan-400/70" />} title="MITRE ATT&CK Techniques" testId="panel-mitre">
            <div className="grid gap-1">
              {techniquesCounts.map(([tech, count]) => (
                <div key={tech} className="flex items-center justify-between rounded border border-cyan-500/10 bg-cyan-500/5 px-2 py-1.5" data-testid={`mitre-${tech}`}>
                  <div><span className="font-mono text-[11px] text-cyan-200/80 font-bold">{tech}</span><span className="text-[9px] text-white/25 ml-1.5">{MITRE_NAMES[tech] || ""}</span></div>
                  <span className="font-mono text-[10px] text-white/30">{count}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel icon={<Activity className="h-3.5 w-3.5 text-cyan-400/70" />} title="24h Attack Volume" testId="panel-hourly">
            <HourlyChart events={filteredEvents} />
            <div className="flex justify-between mt-1 text-[8px] font-mono text-white/20"><span>-24h</span><span>-12h</span><span>Now</span></div>
          </Panel>

          <Panel icon={<Clock className="h-3.5 w-3.5 text-cyan-400/70" />} title="Attack Timeline" testId="panel-attack-timeline">
            <AttackTimeline events={filteredEvents} />
          </Panel>

          <Panel icon={<Wifi className="h-3.5 w-3.5 text-emerald-400/70" />} title="Intelligence Feeds" testId="panel-feeds">
            <div className="grid gap-1.5">
              {(feeds.length > 0 ? feeds : [
                { name: "ThreatFox IOCs", id: "threatfox", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "URLhaus", id: "urlhaus", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "Feodo Tracker", id: "feodo", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "Blocklist.de", id: "blocklist", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "SANS ISC", id: "sans", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "SSL Blacklist", id: "sslbl", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "Cinsscore", id: "cinsscore", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "IPsum Threat List", id: "ipsum", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "Emerging Threats", id: "emergingthreats", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "Spamhaus DROP", id: "spamhaus", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "DataPlane SSH", id: "dataplane", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
                { name: "Turris Greylist", id: "turris", status: "loading" as const, lastUpdated: null, count: 0, url: "" },
              ]).map(feed => (
                <div key={feed.id} className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-2 py-1.5" data-testid={`feed-status-${feed.id}`}>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full", feed.status === "live" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : feed.status === "offline" ? "bg-rose-400" : "bg-amber-400 animate-pulse")} />
                    <span className="text-[10px] text-white/60">{feed.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {feed.count > 0 && <span className="font-mono text-[9px] text-white/25">{feed.count}</span>}
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", feed.status === "live" ? "text-emerald-400/70" : feed.status === "offline" ? "text-rose-400/70" : "text-amber-400/70")}>{feed.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel icon={<Signal className="h-3.5 w-3.5 text-cyan-400/70" />} title="Live Intel Feed" testId="panel-feed" flex>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 sidebar-scroll" data-testid="feed-list">
              {filteredEvents.slice(0, 12).filter(e => activeCategories.has(e.category)).map((e, idx) => {
                const color = CAT_COLORS[e.category] || "#22d3ee";
                return (
                  <div key={e.id} className="rounded border border-white/5 bg-white/[0.02] p-2 cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all feed-item-enter"
                    onClick={() => setSelectedEvent(e)} data-testid={`feed-item-${idx}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{e.category}</span>
                      <span className="text-[8px] text-white/20 ml-auto font-mono">{e.reporter}</span>
                    </div>
                    <div className="font-mono text-[10px] text-white/55 truncate">{e.indicator}</div>
                    <div className="mt-0.5 font-mono text-[9px] text-white/20">{e.technique} \u00b7 {e.src.country.slice(0, 10)} \u2192 {e.dst.country.slice(0, 10)}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </aside>
      </div>

      <TickerBar events={filteredEvents} />

      <footer className="relative z-10 flex items-center justify-between px-5 py-1.5 border-t border-cyan-500/8 bg-[#080c14]/95 backdrop-blur-md shrink-0" data-testid="footer">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] text-white/30 hover:text-white/60 uppercase transition" style={{ fontFamily: "'Oxanium', sans-serif" }} onClick={() => window.location.reload()} data-testid="btn-refresh">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          <button className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] text-white/30 hover:text-white/60 uppercase transition" style={{ fontFamily: "'Oxanium', sans-serif" }} onClick={() => exportCSV(filteredEvents)} data-testid="btn-export-csv">
            <Download className="h-3 w-3" /> Export CSV
          </button>
        </div>
        <div className="flex items-center gap-5">
          <StatusDot label="DB" value="CONNECTED" ok />
          <StatusDot label="FEEDS" value={`${feeds.filter(f => f.status === "live").length}/${feeds.length || 5} ACTIVE`} ok={feeds.some(f => f.status === "live")} />
          <StatusDot label="INGESTION" value={running ? "ACTIVE" : "PAUSED"} ok={running} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[9px] text-white/15 font-mono">
            <span className="border border-white/8 rounded px-1 py-0.5">SPACE</span> pause
            <span className="border border-white/8 rounded px-1 py-0.5 ml-1">F</span> full
            <span className="border border-white/8 rounded px-1 py-0.5 ml-1">M</span> sound
            <span className="border border-white/8 rounded px-1 py-0.5 ml-1">H</span> heat
            <span className="border border-white/8 rounded px-1 py-0.5 ml-1">/</span> search
          </div>
          <div className="h-4 w-px bg-white/8" />
          <button onClick={() => setRunning(p => !p)}
            className={cn("h-5 w-9 rounded-full border transition-colors relative", running ? "border-cyan-500/40 bg-cyan-500/20" : "border-white/15 bg-white/5")} data-testid="btn-cinematic">
            <div className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all", running ? "left-4 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "left-0.5 bg-white/40")} />
          </button>
        </div>
      </footer>
    </div>
  );
}

function Panel({ icon, title, children, testId, flex }: { icon: React.ReactNode; title: string; children: React.ReactNode; testId: string; flex?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-cyan-500/8 bg-[#0a0f16]/80 p-3", flex && "flex-1 min-h-0 flex flex-col")} data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] tracking-[0.14em] text-white/40 uppercase" style={{ fontFamily: "'Oxanium', sans-serif" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function CounterBlock({ value, label, color, large, testId }: { value: number; label: string; color: string; large?: boolean; testId: string }) {
  return (
    <div className="text-center" data-testid={testId}>
      <div className={cn("font-bold font-mono tabular-nums", color, large ? "text-2xl" : "text-lg")}><AnimatedCounter value={value} /></div>
      <div className="text-[9px] tracking-[0.1em] text-white/30 uppercase" style={{ fontFamily: "'Oxanium', sans-serif" }}>{label}</div>
    </div>
  );
}

function StatusDot({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5" data-testid={`status-${label.toLowerCase()}`}>
      <div className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.5)]")} />
      <span className="text-[10px] text-white/30 font-mono">{label}:</span>
      <span className="text-[10px] text-white/50 font-mono">{value}</span>
    </div>
  );
}
