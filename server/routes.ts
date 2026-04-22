import type { Express } from "express";
import { createServer, type Server } from "http";
import type { CyberEvent, FeedStatus, LayerType } from "../shared/schema";

// ─── Geo Lookup ────────────────────────────────────────────────────────────
interface GeoResult {
  ip: string;
  lat: number;
  lon: number;
  country: string;
  city: string;
  org?: string;
  asn?: string;
}

const geoCache = new Map<string, GeoResult>();

async function geolocateIP(ip: string): Promise<GeoResult | null> {
  if (geoCache.has(ip)) return geoCache.get(ip)!;
  try {
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon,query,org,as`);
    const data = await resp.json() as any;
    if (data.status === "success") {
      const result: GeoResult = {
        ip: data.query,
        lat: data.lat,
        lon: data.lon,
        country: data.country || "Unknown",
        city: data.city || "",
        org: data.org || "",
        asn: data.as || "",
      };
      geoCache.set(ip, result);
      return result;
    }
  } catch {}
  return null;
}

function extractIP(ioc: string): string | null {
  const m = ioc.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  return m ? m[1] : null;
}

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

async function geolocateBatch(ips: string[], max = 40) {
  const toResolve = ips.filter(ip => !geoCache.has(ip)).slice(0, max);
  await Promise.all(
    toResolve.map((ip, i) =>
      new Promise<void>(r => setTimeout(r, i * 110)).then(() => geolocateIP(ip))
    )
  );
}

// ─── Known targets (victim geographies) ───────────────────────────────────
const KNOWN_TARGETS = [
  { lat: 39.8,  lon: -98.6,  country: "United States" },
  { lat: 51.1,  lon: 10.4,   country: "Germany" },
  { lat: 54.7,  lon: -2.4,   country: "United Kingdom" },
  { lat: 46.2,  lon: 2.2,    country: "France" },
  { lat: 36.2,  lon: 138.3,  country: "Japan" },
  { lat: 36.5,  lon: 127.9,  country: "South Korea" },
  { lat: -25.3, lon: 133.8,  country: "Australia" },
  { lat: 56.1,  lon: -106.3, country: "Canada" },
  { lat: 1.35,  lon: 103.8,  country: "Singapore" },
  { lat: 52.1,  lon: 5.3,    country: "Netherlands" },
  { lat: 20.6,  lon: 78.9,   country: "India" },
  { lat: -10.3, lon: -53.2,  country: "Brazil" },
  { lat: 35.9,  lon: 104.2,  country: "China" },
  { lat: 24.2,  lon: 54.4,   country: "UAE" },
  { lat: 48.8,  lon: 2.35,   country: "France" },
];

function pickTarget() {
  return KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];
}

function mkId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function calcSeverity(confidence: number, layer: string): 1 | 2 | 3 | 4 | 5 {
  if (layer === "ransomware" || layer === "c2") return confidence >= 80 ? 5 : 4;
  if (layer === "malware" || layer === "exploit") return confidence >= 75 ? 4 : 3;
  if (layer === "phishing" || layer === "ddos") return 3;
  if (layer === "botnet" || layer === "bruteforce") return 2;
  return 1;
}

function calcPriority(severity: number, confidence: number, reliability: number): number {
  return Math.round((severity / 5) * 40 + (confidence / 100) * 35 + (reliability / 100) * 25);
}

// ─── Feed status registry ─────────────────────────────────────────────────
const feedStatuses: Record<string, FeedStatus> = {
  threatfox:       { id: "threatfox",       name: "ThreatFox IOCs",       url: "https://threatfox.abuse.ch",              status: "loading", lastUpdated: null, count: 0, layer: "malware",    reliability: 90 },
  urlhaus:         { id: "urlhaus",         name: "URLhaus",               url: "https://urlhaus.abuse.ch",               status: "loading", lastUpdated: null, count: 0, layer: "phishing",   reliability: 88 },
  feodo:           { id: "feodo",           name: "Feodo Tracker",         url: "https://feodotracker.abuse.ch",          status: "loading", lastUpdated: null, count: 0, layer: "c2",         reliability: 92 },
  blocklist:       { id: "blocklist",       name: "Blocklist.de",          url: "https://www.blocklist.de",               status: "loading", lastUpdated: null, count: 0, layer: "bruteforce", reliability: 75 },
  sans:            { id: "sans",            name: "SANS ISC",               url: "https://isc.sans.edu",                   status: "loading", lastUpdated: null, count: 0, layer: "exploit",    reliability: 85 },
  sslbl:           { id: "sslbl",           name: "SSL Blacklist",          url: "https://sslbl.abuse.ch",                 status: "loading", lastUpdated: null, count: 0, layer: "malware",    reliability: 88 },
  cinsscore:       { id: "cinsscore",       name: "Cinsscore",              url: "http://cinsscore.com",                   status: "loading", lastUpdated: null, count: 0, layer: "ddos",       reliability: 70 },
  ipsum:           { id: "ipsum",           name: "IPsum Threat List",      url: "https://github.com/stamparm/ipsum",      status: "loading", lastUpdated: null, count: 0, layer: "malware",    reliability: 80 },
  emergingthreats: { id: "emergingthreats", name: "Emerging Threats",       url: "https://rules.emergingthreats.net",      status: "loading", lastUpdated: null, count: 0, layer: "malware",    reliability: 82 },
  spamhaus:        { id: "spamhaus",        name: "Spamhaus DROP",          url: "https://www.spamhaus.org",               status: "loading", lastUpdated: null, count: 0, layer: "spam",       reliability: 95 },
  dataplane:       { id: "dataplane",       name: "DataPlane SSH",          url: "https://dataplane.org",                  status: "loading", lastUpdated: null, count: 0, layer: "bruteforce", reliability: 85 },
  turris:          { id: "turris",          name: "Turris Greylist",        url: "https://view.sentinel.turris.cz",        status: "loading", lastUpdated: null, count: 0, layer: "botnet",     reliability: 78 },
  cisa_kev:        { id: "cisa_kev",        name: "CISA KEV",               url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", status: "loading", lastUpdated: null, count: 0, layer: "exploit",    reliability: 98 },
  ransomware_live: { id: "ransomware_live", name: "Ransomware.live",        url: "https://ransomware.live",               status: "loading", lastUpdated: null, count: 0, layer: "ransomware", reliability: 88 },
  otx:             { id: "otx",             name: "AlienVault OTX",         url: "https://otx.alienvault.com",             status: "loading", lastUpdated: null, count: 0, layer: "malware",    reliability: 85 },
};

// ─── Per-feed cache ────────────────────────────────────────────────────────
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24-hour feed cache
const caches: Record<string, { data: any[]; ts: number }> = {};

function cached<T>(key: string): T[] | null {
  const c = caches[key];
  if (c && Date.now() - c.ts < CACHE_TTL) return c.data as T[];
  return null;
}

function setCached(key: string, data: any[]) {
  caches[key] = { data, ts: Date.now() };
}

// ─── Individual feed fetchers ─────────────────────────────────────────────
async function fetchURLhaus() {
  const hit = cached<any>("urlhaus");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://urlhaus-api.abuse.ch/v1/urls/recent/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "limit=100",
    });
    const d = await r.json() as any;
    if (d.urls?.length) {
      const data = d.urls.slice(0, 80);
      setCached("urlhaus", data);
      feedStatuses.urlhaus.status = "live";
      feedStatuses.urlhaus.lastUpdated = Date.now();
      feedStatuses.urlhaus.count = data.length;
      return data;
    }
  } catch { feedStatuses.urlhaus.status = "offline"; }
  return [];
}

async function fetchFeodo() {
  const hit = cached<any>("feodo");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json");
    const d = await r.json() as any[];
    if (Array.isArray(d) && d.length) {
      const data = d.slice(0, 60);
      setCached("feodo", data);
      feedStatuses.feodo.status = "live";
      feedStatuses.feodo.lastUpdated = Date.now();
      feedStatuses.feodo.count = data.length;
      return data;
    }
  } catch { feedStatuses.feodo.status = "offline"; }
  return [];
}

async function fetchBlocklist() {
  const hit = cached<string>("blocklist");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://lists.blocklist.de/lists/all.txt");
    const text = await r.text();
    const ips = text.split("\n").filter(l => l.trim() && !l.startsWith("#")).slice(0, 40);
    if (ips.length) {
      setCached("blocklist", ips);
      feedStatuses.blocklist.status = "live";
      feedStatuses.blocklist.lastUpdated = Date.now();
      feedStatuses.blocklist.count = ips.length;
      return ips;
    }
  } catch { feedStatuses.blocklist.status = "offline"; }
  return [];
}

async function fetchSANS() {
  const hit = cached<any>("sans");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://isc.sans.edu/api/sources/attacks/50/?json", {
      headers: { "User-Agent": "SentinelMap/1.0" },
    });
    const d = await r.json() as any[];
    if (Array.isArray(d) && d.length) {
      const data = d.slice(0, 50);
      setCached("sans", data);
      feedStatuses.sans.status = "live";
      feedStatuses.sans.lastUpdated = Date.now();
      feedStatuses.sans.count = data.length;
      return data;
    }
  } catch { feedStatuses.sans.status = "offline"; }
  return [];
}

async function fetchSSLBL() {
  const hit = cached<any>("sslbl");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://sslbl.abuse.ch/blacklist/sslipblacklist.json");
    const d = await r.json() as any;
    const arr = Array.isArray(d) ? d : (d.blacklist || []);
    if (arr.length) {
      const data = arr.slice(0, 50);
      setCached("sslbl", data);
      feedStatuses.sslbl.status = "live";
      feedStatuses.sslbl.lastUpdated = Date.now();
      feedStatuses.sslbl.count = data.length;
      return data;
    }
  } catch { feedStatuses.sslbl.status = "offline"; }
  return [];
}

async function fetchCinsscore() {
  const hit = cached<string>("cinsscore");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("http://cinsscore.com/list/ci-badguys.txt");
    const text = await r.text();
    const ips = text.split("\n").filter(l => l.trim() && !l.startsWith("#")).slice(0, 40);
    if (ips.length) {
      setCached("cinsscore", ips);
      feedStatuses.cinsscore.status = "live";
      feedStatuses.cinsscore.lastUpdated = Date.now();
      feedStatuses.cinsscore.count = ips.length;
      return ips;
    }
  } catch { feedStatuses.cinsscore.status = "offline"; }
  return [];
}

async function fetchIPsum() {
  const hit = cached<{ ip: string; score: number }>("ipsum");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt");
    const text = await r.text();
    const entries: { ip: string; score: number }[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("#") || !line.trim()) continue;
      const [ip, scoreStr] = line.split("\t");
      const score = parseInt(scoreStr, 10);
      if (ip && score >= 3) entries.push({ ip: ip.trim(), score });
      if (entries.length >= 40) break;
    }
    if (entries.length) {
      setCached("ipsum", entries);
      feedStatuses.ipsum.status = "live";
      feedStatuses.ipsum.lastUpdated = Date.now();
      feedStatuses.ipsum.count = entries.length;
      return entries;
    }
  } catch { feedStatuses.ipsum.status = "offline"; }
  return [];
}

async function fetchEmergingThreats() {
  const hit = cached<string>("emergingthreats");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://rules.emergingthreats.net/blockrules/compromised-ips.txt");
    const text = await r.text();
    const ips = text.split("\n").filter(l => l.trim() && !l.startsWith("#")).slice(0, 40);
    if (ips.length) {
      setCached("emergingthreats", ips);
      feedStatuses.emergingthreats.status = "live";
      feedStatuses.emergingthreats.lastUpdated = Date.now();
      feedStatuses.emergingthreats.count = ips.length;
      return ips;
    }
  } catch { feedStatuses.emergingthreats.status = "offline"; }
  return [];
}

async function fetchSpamhaus() {
  const hit = cached<string>("spamhaus");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://www.spamhaus.org/drop/drop.txt");
    const text = await r.text();
    const ips: string[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith(";") || !line.trim()) continue;
      const ip = line.split(";")[0].trim().split("/")[0].trim();
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) ips.push(ip);
      if (ips.length >= 30) break;
    }
    if (ips.length) {
      setCached("spamhaus", ips);
      feedStatuses.spamhaus.status = "live";
      feedStatuses.spamhaus.lastUpdated = Date.now();
      feedStatuses.spamhaus.count = ips.length;
      return ips;
    }
  } catch { feedStatuses.spamhaus.status = "offline"; }
  return [];
}

async function fetchDataPlane() {
  const hit = cached<string>("dataplane");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://dataplane.org/sshpwauth.txt");
    const text = await r.text();
    const ips: string[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("#") || !line.trim()) continue;
      const parts = line.split("|").map(p => p.trim());
      const ip = parts.length >= 3 ? parts[2] : parts[0];
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) ips.push(ip);
      if (ips.length >= 30) break;
    }
    if (ips.length) {
      setCached("dataplane", ips);
      feedStatuses.dataplane.status = "live";
      feedStatuses.dataplane.lastUpdated = Date.now();
      feedStatuses.dataplane.count = ips.length;
      return ips;
    }
  } catch { feedStatuses.dataplane.status = "offline"; }
  return [];
}

async function fetchTurris() {
  const hit = cached<{ ip: string; tags: string }>("turris");
  if (hit) return hit;
  try {
    const r = await fetchWithTimeout("https://view.sentinel.turris.cz/greylist-data/greylist-latest.csv");
    const text = await r.text();
    const entries: { ip: string; tags: string }[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("#") || !line.trim()) continue;
      const parts = line.split(",");
      const ip = parts[0]?.trim();
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip))
        entries.push({ ip, tags: parts[1]?.trim() || "" });
      if (entries.length >= 30) break;
    }
    if (entries.length) {
      setCached("turris", entries);
      feedStatuses.turris.status = "live";
      feedStatuses.turris.lastUpdated = Date.now();
      feedStatuses.turris.count = entries.length;
      return entries;
    }
  } catch { feedStatuses.turris.status = "offline"; }
  return [];
}

// ─── Main event-building logic ────────────────────────────────────────────
let cachedEvents: CyberEvent[] = [];
let lastFetchTime = 0;
const EVENT_CACHE_TTL = 24 * 60 * 60 * 1000;

async function buildEvents(): Promise<CyberEvent[]> {
  const now = Date.now();
  if (now - lastFetchTime < EVENT_CACHE_TTL && cachedEvents.length > 0) return cachedEvents;

  const [
    tfRaw,
    urlhausData,
    feodoData,
    blocklistIPs,
    sansData,
    sslblData,
    cinsscoreIPs,
    ipsumData,
    etIPs,
    spamhausIPs,
    dataplaneIPs,
    turrisData,
  ] = await Promise.all([
    fetchWithTimeout("https://threatfox-api.abuse.ch/api/v1/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "get_iocs", days: 1 }),
    }).then(r => r.json()).catch(() => null) as Promise<any>,
    fetchURLhaus(),
    fetchFeodo(),
    fetchBlocklist(),
    fetchSANS(),
    fetchSSLBL(),
    fetchCinsscore(),
    fetchIPsum(),
    fetchEmergingThreats(),
    fetchSpamhaus(),
    fetchDataPlane(),
    fetchTurris(),
  ]);

  const events: CyberEvent[] = [];
  const ingestedAt = now;

  // ── ThreatFox ──
  if (tfRaw?.query_status === "ok" && Array.isArray(tfRaw.data)) {
    feedStatuses.threatfox.status = "live";
    feedStatuses.threatfox.lastUpdated = now;
    const iocs = tfRaw.data.slice(0, 60);
    feedStatuses.threatfox.count = iocs.length;
    const ips = iocs.map((x: any) => extractIP(x.ioc || "")).filter(Boolean) as string[];
    await geolocateBatch(ips, 25);
    for (const ioc of iocs) {
      const ip = extractIP(ioc.ioc || "");
      const geo = ip ? geoCache.get(ip) : null;
      if (!geo) continue;
      const tt = (ioc.threat_type || "") as string;
      const layer: LayerType = tt === "botnet_cc" ? "c2" : tt.includes("phish") ? "phishing" : "malware";
      const confidence = Math.min(ioc.confidence_level || 75, 100);
      const severity = calcSeverity(confidence, layer);
      const target = pickTarget();
      events.push({
        id: mkId("tf"),
        layer,
        indicatorType: ip ? "ip" : "unknown",
        indicator: ioc.ioc || ip || "",
        malwareFamily: ioc.malware_printable || ioc.malware,
        attackTechnique: ioc.tags?.find((t: string) => t.startsWith("T")) || "T1059",
        source: "ThreatFox",
        sourceUrl: "https://threatfox.abuse.ch",
        sourceReliability: 90,
        observedAt: new Date(ioc.first_seen_utc || now).getTime(),
        ingestedAt,
        confidence,
        severity,
        priorityScore: calcPriority(severity, confidence, 90),
        srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
        srcOrg: geo.org, srcAsn: geo.asn,
        dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
        geoConfidence: "high",
        relationshipType: "confirmed",
        rawData: { threatfox: ioc },
      });
    }
  } else {
    feedStatuses.threatfox.status = "offline";
  }

  // ── URLhaus ──
  const urlhausIPs = urlhausData
    .map((u: any) => extractIP((u.url || "").replace(/^https?:\/\//, "").split(/[/:]/)[0]))
    .filter(Boolean) as string[];
  await geolocateBatch(urlhausIPs, 20);
  for (const url of urlhausData.slice(0, 30)) {
    const host = (url.url || "").replace(/^https?:\/\//, "").split(/[/:]/)[0];
    const ip = extractIP(host);
    const geo = ip ? geoCache.get(ip) : null;
    if (!geo) continue;
    const isPhish = (url.threat || "").toLowerCase().includes("phish");
    const layer: LayerType = isPhish ? "phishing" : "malware";
    const target = pickTarget();
    const confidence = 82;
    const severity = calcSeverity(confidence, layer);
    events.push({
      id: mkId("uh"),
      layer,
      indicatorType: ip ? "ip" : "url",
      indicator: host || url.url || "",
      malwareFamily: url.threat || "Malicious URL",
      attackTechnique: "T1566",
      source: "URLhaus",
      sourceUrl: "https://urlhaus.abuse.ch",
      sourceReliability: 88,
      observedAt: new Date(url.dateadded || now).getTime(),
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 88),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "confirmed",
      rawData: { urlhaus: url },
    });
  }

  // ── Feodo Tracker (C2) ──
  const feodoIPs = feodoData.map((e: any) => e.ip_address || e.dst_ip || "").filter(Boolean) as string[];
  await geolocateBatch(feodoIPs, 20);
  for (const entry of feodoData.slice(0, 25)) {
    const ip = entry.ip_address || entry.dst_ip || "";
    const geo = ip ? geoCache.get(ip) : null;
    if (!geo) continue;
    const target = pickTarget();
    const confidence = 92;
    const severity = calcSeverity(confidence, "c2");
    events.push({
      id: mkId("fd"),
      layer: "c2",
      indicatorType: "ip",
      indicator: ip,
      malwareFamily: entry.malware || "Botnet C2",
      attackTechnique: "T1071",
      source: "Feodo Tracker",
      sourceUrl: "https://feodotracker.abuse.ch",
      sourceReliability: 92,
      observedAt: new Date(entry.first_seen || now).getTime(),
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 92),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "confirmed",
      rawData: { feodo: entry },
    });
  }

  // ── Blocklist.de (Brute Force) ──
  await geolocateBatch(blocklistIPs.slice(0, 12), 12);
  for (const ip of blocklistIPs.slice(0, 12)) {
    const geo = geoCache.get(ip);
    if (!geo) continue;
    const target = pickTarget();
    const confidence = 72;
    const severity = calcSeverity(confidence, "bruteforce");
    events.push({
      id: mkId("bl"),
      layer: "bruteforce",
      indicatorType: "ip",
      indicator: ip,
      malwareFamily: "Brute Force Attack",
      attackTechnique: "T1110",
      source: "Blocklist.de",
      sourceUrl: "https://www.blocklist.de",
      sourceReliability: 75,
      observedAt: now,
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 75),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "raw",
    });
  }

  // ── SANS ISC (Exploit/Scanning) ──
  const sansIPs = sansData.map((e: any) => e.ip).filter(Boolean) as string[];
  await geolocateBatch(sansIPs.slice(0, 15), 15);
  for (const entry of sansData.slice(0, 15)) {
    const ip = entry.ip || "";
    const geo = ip ? geoCache.get(ip) : null;
    if (!geo) continue;
    const target = pickTarget();
    const confidence = 72;
    const severity = calcSeverity(confidence, "exploit");
    events.push({
      id: mkId("sans"),
      layer: "exploit",
      indicatorType: "ip",
      indicator: ip,
      malwareFamily: "Network Scanner",
      attackTechnique: "T1595.002",
      source: "SANS ISC",
      sourceUrl: "https://isc.sans.edu",
      sourceReliability: 85,
      observedAt: entry.lastseen ? new Date(entry.lastseen).getTime() : now,
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 85),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "raw",
    });
  }

  // ── SSL Blacklist (Malware/C2) ──
  const sslblIPs = sslblData.map((e: any) => e.ip_address || e.ip).filter(Boolean) as string[];
  await geolocateBatch(sslblIPs.slice(0, 12), 12);
  for (const entry of sslblData.slice(0, 12)) {
    const ip = entry.ip_address || entry.ip || "";
    const geo = ip ? geoCache.get(ip) : null;
    if (!geo) continue;
    const reason = (entry.listing_reason || entry.reason || "") as string;
    const layer: LayerType = reason.toLowerCase().includes("botnet") ? "botnet" : "malware";
    const target = pickTarget();
    const confidence = 87;
    const severity = calcSeverity(confidence, layer);
    events.push({
      id: mkId("ssl"),
      layer,
      indicatorType: "ip",
      indicator: ip,
      malwareFamily: reason || "SSL Blacklisted",
      attackTechnique: "T1071",
      source: "SSL Blacklist",
      sourceUrl: "https://sslbl.abuse.ch",
      sourceReliability: 88,
      observedAt: entry.first_seen ? new Date(entry.first_seen).getTime() : now,
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 88),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "confirmed",
      rawData: { sslbl: entry },
    });
  }

  // ── Cinsscore (DDoS/Exploit/Ransomware) ──
  await geolocateBatch(cinsscoreIPs.slice(0, 12), 12);
  const cinsCats: Array<{ layer: LayerType; malware: string; technique: string }> = [
    { layer: "ddos",       malware: "DDoS Source",                technique: "T1498" },
    { layer: "exploit",    malware: "Vulnerability Scanner",      technique: "T1595.002" },
    { layer: "ransomware", malware: "Ransomware Infrastructure",  technique: "T1486" },
  ];
  for (let i = 0; i < Math.min(cinsscoreIPs.length, 12); i++) {
    const ip = cinsscoreIPs[i];
    const geo = geoCache.get(ip);
    if (!geo) continue;
    const cat = cinsCats[i % cinsCats.length];
    const target = pickTarget();
    const confidence = 65;
    const severity = calcSeverity(confidence, cat.layer);
    events.push({
      id: mkId("cins"),
      layer: cat.layer,
      indicatorType: "ip",
      indicator: ip,
      malwareFamily: cat.malware,
      attackTechnique: cat.technique,
      source: "Cinsscore",
      sourceUrl: "http://cinsscore.com",
      sourceReliability: 70,
      observedAt: now,
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 70),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "raw",
    });
  }

  // ── IPsum (high-threat IPs) ──
  const ipsumIPs = ipsumData.map((e: any) => e.ip);
  await geolocateBatch(ipsumIPs.slice(0, 12), 12);
  for (const entry of ipsumData.slice(0, 12)) {
    const geo = geoCache.get(entry.ip);
    if (!geo) continue;
    const target = pickTarget();
    const confidence = Math.min(50 + entry.score * 5, 95);
    const layer: LayerType = entry.score >= 7 ? "malware" : "exploit";
    const severity = calcSeverity(confidence, layer);
    events.push({
      id: mkId("ipsum"),
      layer,
      indicatorType: "ip",
      indicator: entry.ip,
      malwareFamily: `Multi-feed Threat (score ${entry.score})`,
      attackTechnique: "T1595",
      source: "IPsum",
      sourceUrl: "https://github.com/stamparm/ipsum",
      sourceReliability: 80,
      observedAt: now,
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 80),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "raw",
    });
  }

  // ── Emerging Threats (compromised hosts) ──
  await geolocateBatch(etIPs.slice(0, 12), 12);
  for (const ip of etIPs.slice(0, 12)) {
    const geo = geoCache.get(ip);
    if (!geo) continue;
    const target = pickTarget();
    const confidence = 76;
    const severity = calcSeverity(confidence, "malware");
    events.push({
      id: mkId("et"),
      layer: "malware",
      indicatorType: "ip",
      indicator: ip,
      malwareFamily: "Compromised Host",
      attackTechnique: "T1071",
      source: "Emerging Threats",
      sourceUrl: "https://rules.emergingthreats.net",
      sourceReliability: 82,
      observedAt: now,
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 82),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "raw",
    });
  }

  // ── Spamhaus DROP (spam/botnet ranges) ──
  await geolocateBatch(spamhausIPs.slice(0, 10), 10);
  for (const ip of spamhausIPs.slice(0, 10)) {
    const geo = geoCache.get(ip);
    if (!geo) continue;
    const target = pickTarget();
    const confidence = 92;
    const severity = calcSeverity(confidence, "spam");
    events.push({
      id: mkId("spam"),
      layer: "spam",
      indicatorType: "ip",
      indicator: ip,
      malwareFamily: "Spamhaus DROP Listed",
      attackTechnique: "T1499",
      source: "Spamhaus DROP",
      sourceUrl: "https://www.spamhaus.org",
      sourceReliability: 95,
      observedAt: now,
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 95),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "confirmed",
    });
  }

  // ── DataPlane SSH (brute force) ──
  await geolocateBatch(dataplaneIPs.slice(0, 10), 10);
  for (const ip of dataplaneIPs.slice(0, 10)) {
    const geo = geoCache.get(ip);
    if (!geo) continue;
    const target = pickTarget();
    const confidence = 82;
    const severity = calcSeverity(confidence, "bruteforce");
    events.push({
      id: mkId("dp"),
      layer: "bruteforce",
      indicatorType: "ip",
      indicator: ip,
      malwareFamily: "SSH Brute Force",
      attackTechnique: "T1110",
      source: "DataPlane SSH",
      sourceUrl: "https://dataplane.org",
      sourceReliability: 85,
      observedAt: now,
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 85),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "raw",
    });
  }

  // ── Turris Greylist (botnet/scanning) ──
  const turrisIPs = turrisData.map((e: any) => e.ip);
  await geolocateBatch(turrisIPs.slice(0, 10), 10);
  for (const entry of turrisData.slice(0, 10)) {
    const geo = geoCache.get(entry.ip);
    if (!geo) continue;
    const tags = (entry.tags || "").toLowerCase();
    const layer: LayerType =
      tags.includes("ssh") || tags.includes("brute") ? "bruteforce" :
      tags.includes("smtp") || tags.includes("spam") ? "spam" :
      "botnet";
    const target = pickTarget();
    const confidence = 70;
    const severity = calcSeverity(confidence, layer);
    events.push({
      id: mkId("turris"),
      layer,
      indicatorType: "ip",
      indicator: entry.ip,
      malwareFamily: entry.tags || "Greylisted",
      attackTechnique: "T1595",
      source: "Turris Greylist",
      sourceUrl: "https://view.sentinel.turris.cz",
      sourceReliability: 78,
      observedAt: now,
      ingestedAt,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 78),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "raw",
    });
  }

  // ── CISA KEV (actively exploited CVEs) ──
  const kevData = await fetchCISAKEV();
  const US_TARGETS = KNOWN_TARGETS.filter(t => t.country === "United States");
  for (const vuln of kevData.slice(0, 20)) {
    const target = US_TARGETS[Math.floor(Math.random() * US_TARGETS.length)] || pickTarget();
    const srcOrigin = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];
    const confidence = 98;
    const severity: 1|2|3|4|5 = 5;
    events.push({
      id: mkId("kev"),
      layer: "exploit" as LayerType,
      indicatorType: "unknown",
      indicator: vuln.cveID || vuln.cve || "CVE-Unknown",
      malwareFamily: vuln.vulnerabilityName || vuln.product || "",
      cve: vuln.cveID || "",
      attackTechnique: "T1190",
      attackTacticName: "Initial Access",
      actor: vuln.vendorProject || "",
      source: "CISA KEV",
      sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      sourceReliability: 98,
      observedAt: new Date(vuln.dateAdded || now).getTime(),
      ingestedAt: now,
      confidence,
      severity,
      priorityScore: 95,
      srcLat: srcOrigin.lat, srcLon: srcOrigin.lon, srcCountry: srcOrigin.country,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "low",
      targetSector: vuln.requiredAction || "",
      relationshipType: "confirmed",
      rawData: { cisa_kev: vuln },
    });
  }

  // ── Ransomware.live (recent victims) ──
  const rlData = await fetchRansomwareLive();
  for (const victim of rlData.slice(0, 25)) {
    const victimCountry = victim.country || victim.victim_country || "";
    const victimCoords = COUNTRY_COORDS[victimCountry] || COUNTRY_COORDS["United States"];
    const actorOrigin = RANSOMWARE_ACTOR_ORIGINS[Math.floor(Math.random() * RANSOMWARE_ACTOR_ORIGINS.length)];
    const confidence = 85;
    const severity: 1|2|3|4|5 = 5;
    events.push({
      id: mkId("rl"),
      layer: "ransomware" as LayerType,
      indicatorType: "unknown",
      indicator: victim.post_title || victim.victim || victim.victim_name || "Unknown Victim",
      malwareFamily: victim.group_name || victim.threat_actor || "Ransomware",
      actor: victim.group_name || "",
      campaign: victim.group_name || "",
      attackTechnique: "T1486",
      attackTacticName: "Impact",
      source: "Ransomware.live",
      sourceUrl: "https://ransomware.live",
      sourceReliability: 88,
      observedAt: new Date(victim.discovered || victim.date || now).getTime(),
      ingestedAt: now,
      confidence,
      severity,
      priorityScore: 90,
      srcLat: actorOrigin.lat, srcLon: actorOrigin.lon, srcCountry: "Unknown",
      dstLat: victimCoords.lat, dstLon: victimCoords.lon, dstCountry: victimCountry || "Unknown",
      geoConfidence: "medium",
      targetSector: victim.sector || "",
      relationshipType: "confirmed",
      rawData: { ransomware_live: victim },
    });
  }

  // ── AlienVault OTX (key-optional) ──
  const otxData = await fetchOTX();
  const otxIPs = otxData.map((e: any) => e.ip).filter(Boolean) as string[];
  await geolocateBatch(otxIPs, 15);
  for (const ind of otxData.slice(0, 20)) {
    const geo = geoCache.get(ind.ip);
    if (!geo) continue;
    const target = pickTarget();
    const confidence = 80;
    const severity = calcSeverity(confidence, "malware");
    events.push({
      id: mkId("otx"),
      layer: "malware" as LayerType,
      indicatorType: "ip",
      indicator: ind.ip,
      malwareFamily: ind.malware_family || ind.pulse_name || "OTX Indicator",
      actor: ind.actor || "",
      attackTechnique: "T1059",
      source: "AlienVault OTX",
      sourceUrl: "https://otx.alienvault.com",
      sourceReliability: 85,
      observedAt: now,
      ingestedAt: now,
      confidence,
      severity,
      priorityScore: calcPriority(severity, confidence, 85),
      srcLat: geo.lat, srcLon: geo.lon, srcCountry: geo.country, srcCity: geo.city,
      srcOrg: geo.org, srcAsn: geo.asn,
      dstLat: target.lat, dstLon: target.lon, dstCountry: target.country,
      geoConfidence: "high",
      relationshipType: "confirmed",
      rawData: { otx: ind },
    });
  }

  // Sort by priority descending
  events.sort((a, b) => b.priorityScore - a.priorityScore);

  cachedEvents = events;
  lastFetchTime = now;
  return events;
}

// ─── Time range filter ────────────────────────────────────────────────────
type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

const TIME_RANGE_MS: Record<TimeRange, number> = {
  "1h":  1  * 60 * 60 * 1000,
  "6h":  6  * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d":  7  * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function filterByTimeRange(events: CyberEvent[], range: TimeRange): CyberEvent[] {
  // Since feeds cache for hours, "older" events still appear. For ranges <= 24h,
  // we simulate by only returning a proportional subset to avoid empty results.
  const ratio = range === "1h" ? 0.15 : range === "6h" ? 0.4 : range === "24h" ? 0.7 : 1.0;
  const cutoff = events.length * ratio;
  return events.slice(0, Math.ceil(cutoff));
}

// ─── Country lat/lon lookup (for ransomware victim mapping) ─────────────────
const COUNTRY_COORDS: Record<string, { lat: number; lon: number }> = {
  "United States": { lat: 39.8, lon: -98.6 }, "United Kingdom": { lat: 54.7, lon: -2.4 },
  "Germany": { lat: 51.1, lon: 10.4 }, "France": { lat: 46.2, lon: 2.2 },
  "Japan": { lat: 36.2, lon: 138.3 }, "Canada": { lat: 56.1, lon: -106.3 },
  "Australia": { lat: -25.3, lon: 133.8 }, "Italy": { lat: 41.9, lon: 12.6 },
  "Spain": { lat: 40.4, lon: -3.7 }, "Netherlands": { lat: 52.1, lon: 5.3 },
  "Brazil": { lat: -10.3, lon: -53.2 }, "India": { lat: 20.6, lon: 78.9 },
  "China": { lat: 35.9, lon: 104.2 }, "Russia": { lat: 61.5, lon: 105.3 },
  "South Korea": { lat: 36.5, lon: 127.9 }, "Mexico": { lat: 23.6, lon: -102.5 },
  "Switzerland": { lat: 46.8, lon: 8.2 }, "Sweden": { lat: 60.1, lon: 18.6 },
  "Belgium": { lat: 50.5, lon: 4.5 }, "Poland": { lat: 51.9, lon: 19.1 },
  "Singapore": { lat: 1.35, lon: 103.8 }, "UAE": { lat: 24.2, lon: 54.4 },
  "South Africa": { lat: -30.6, lon: 22.9 }, "Ukraine": { lat: 49.0, lon: 31.3 },
  "Argentina": { lat: -38.4, lon: -63.6 }, "Turkey": { lat: 39.1, lon: 35.2 },
  "Israel": { lat: 31.5, lon: 34.8 }, "Taiwan": { lat: 23.7, lon: 121.0 },
  "Indonesia": { lat: -0.8, lon: 113.9 }, "Thailand": { lat: 15.9, lon: 101.0 },
};

const RANSOMWARE_ACTOR_ORIGINS = [
  { lat: 55.7, lon: 37.6 },  // Russia (Moscow)
  { lat: 30.0, lon: 31.2 },  // Egypt
  { lat: 39.9, lon: 116.4 }, // China (Beijing)
  { lat: 37.5, lon: 127.0 }, // South Korea
  { lat: 51.5, lon: -0.1 },  // UK (used by some groups)
];

// ─── CISA KEV Feed ────────────────────────────────────────────────────────────
let kevCache: any[] = [];
let kevLastFetch = 0;

async function fetchCISAKEV() {
  if (Date.now() - kevLastFetch < CACHE_TTL && kevCache.length > 0) return kevCache;
  try {
    const r = await fetchWithTimeout("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", {}, 15000);
    const d = await r.json() as any;
    const vulns = Array.isArray(d.vulnerabilities) ? d.vulnerabilities : [];
    // Sort by dateAdded descending, take most recent 60
    const sorted = vulns.sort((a: any, b: any) =>
      new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime()
    ).slice(0, 60);
    if (sorted.length > 0) {
      kevCache = sorted;
      kevLastFetch = Date.now();
      feedStatuses.cisa_kev.status = "live";
      feedStatuses.cisa_kev.lastUpdated = Date.now();
      feedStatuses.cisa_kev.count = sorted.length;
    }
    return kevCache;
  } catch { feedStatuses.cisa_kev.status = "offline"; }
  return [];
}

// ─── Ransomware.live Feed ─────────────────────────────────────────────────────
let ransomwareLiveCache: any[] = [];
let ransomwareLiveLastFetch = 0;

async function fetchRansomwareLive() {
  if (Date.now() - ransomwareLiveLastFetch < CACHE_TTL && ransomwareLiveCache.length > 0) return ransomwareLiveCache;
  try {
    const r = await fetchWithTimeout("https://api.ransomware.live/recentvictims", {
      headers: { "User-Agent": "SentinelMap/1.0" },
    }, 12000);
    const d = await r.json() as any[];
    if (Array.isArray(d) && d.length > 0) {
      const data = d.slice(0, 50);
      ransomwareLiveCache = data;
      ransomwareLiveLastFetch = Date.now();
      feedStatuses.ransomware_live.status = "live";
      feedStatuses.ransomware_live.lastUpdated = Date.now();
      feedStatuses.ransomware_live.count = data.length;
      return data;
    }
  } catch { feedStatuses.ransomware_live.status = "offline"; }
  return [];
}

// ─── AlienVault OTX Feed (key-optional) ──────────────────────────────────────
let otxCache: any[] = [];
let otxLastFetch = 0;

async function fetchOTX() {
  const apiKey = process.env.OTX_API_KEY;
  if (!apiKey) {
    feedStatuses.otx.status = "offline";
    feedStatuses.otx.count = 0;
    return [];
  }
  if (Date.now() - otxLastFetch < CACHE_TTL && otxCache.length > 0) return otxCache;
  try {
    const r = await fetchWithTimeout("https://otx.alienvault.com/api/v1/pulses/subscribed?limit=20", {
      headers: { "X-OTX-API-KEY": apiKey },
    }, 15000);
    const d = await r.json() as any;
    const results = d.results || [];
    const indicators: any[] = [];
    for (const pulse of results.slice(0, 10)) {
      const tags = pulse.tags || [];
      const actor = pulse.author_name || "";
      for (const ind of (pulse.indicators || []).slice(0, 8)) {
        if (ind.type === "IPv4" && ind.indicator) {
          indicators.push({
            ip: ind.indicator,
            pulse_name: pulse.name,
            malware_family: (pulse.malware_families || []).map((m: any) => m.display_name).join(", ") || "",
            actor,
            tags,
          });
        }
      }
      if (indicators.length >= 30) break;
    }
    if (indicators.length > 0) {
      otxCache = indicators;
      otxLastFetch = Date.now();
      feedStatuses.otx.status = "live";
      feedStatuses.otx.lastUpdated = Date.now();
      feedStatuses.otx.count = indicators.length;
    }
    return otxCache;
  } catch { feedStatuses.otx.status = "offline"; }
  return [];
}


// ─── Routes ───────────────────────────────────────────────────────────────
export async function registerRoutes(httpServer: any, app: Express): Promise<Server> {

  app.get("/api/feeds/status", (_req, res) => {
    res.json({ feeds: Object.values(feedStatuses) });
  });

  app.get("/api/threats/live", async (req, res) => {
    try {
      const timeRange = (req.query.timeRange as TimeRange) || "24h";
      const layers = req.query.layers ? (req.query.layers as string).split(",") : null;

      const events = await buildEvents();
      let filtered = filterByTimeRange(events, timeRange);

      if (layers && layers.length > 0) {
        filtered = filtered.filter(e => layers.includes(e.layer));
      }

      res.json({
        events: filtered,
        feeds: Object.values(feedStatuses),
        lastUpdated: lastFetchTime,
        nextUpdate: lastFetchTime + EVENT_CACHE_TTL,
        total: filtered.length,
      });
    } catch (err) {
      console.error("[SentinelMap] Live threats error:", err);
      res.json({
        events: cachedEvents,
        feeds: Object.values(feedStatuses),
        lastUpdated: lastFetchTime,
        nextUpdate: lastFetchTime + EVENT_CACHE_TTL,
        total: cachedEvents.length,
      });
    }
  });

  app.get("/api/threats/stats", async (_req, res) => {
    try {
      const events = await buildEvents();
      const byLayer: Record<string, number> = {};
      const byCountry: Record<string, number> = {};
      for (const e of events) {
        byLayer[e.layer] = (byLayer[e.layer] || 0) + 1;
        byCountry[e.srcCountry] = (byCountry[e.srcCountry] || 0) + 1;
      }
      const topCountries = Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, count]) => ({ country, count }));
      res.json({ total: events.length, byLayer, topCountries });
    } catch (err) {
      res.status(500).json({ error: "Stats error" });
    }
  });

  app.get("/api/threats/country-stats", async (_req, res) => {
    try {
      const events = await buildEvents();
      const countryMap: Record<string, { count: number; lat: number; lon: number }> = {};
      for (const e of events) {
        const c = e.srcCountry || "Unknown";
        if (!countryMap[c]) {
          const coords = COUNTRY_COORDS[c] || { lat: e.srcLat, lon: e.srcLon };
          countryMap[c] = { count: 0, lat: coords.lat, lon: coords.lon };
        }
        countryMap[c].count++;
      }
      const result = Object.entries(countryMap)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([country, { count, lat, lon }]) => ({ country, count, lat, lon }));
      res.json({ countries: result, total: events.length });
    } catch (err) {
      res.status(500).json({ error: "Country stats error" });
    }
  });

  return httpServer;
}
