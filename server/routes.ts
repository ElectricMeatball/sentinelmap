import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

interface GeoResult {
  ip: string;
  lat: number;
  lon: number;
  country: string;
  city: string;
}

const geoCache = new Map<string, GeoResult>();

async function geolocateIP(ip: string): Promise<GeoResult | null> {
  if (geoCache.has(ip)) return geoCache.get(ip)!;
  try {
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon,query`);
    const data = await resp.json();
    if (data.status === "success") {
      const result: GeoResult = {
        ip: data.query,
        lat: data.lat,
        lon: data.lon,
        country: data.country || "Unknown",
        city: data.city || "",
      };
      geoCache.set(ip, result);
      return result;
    }
  } catch {}
  return null;
}

function extractIP(ioc: string): string | null {
  const ipMatch = ioc.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  return ipMatch ? ipMatch[1] : null;
}

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

const KNOWN_TARGETS = [
  { lat: 39.8, lon: -98.6, country: "United States" },
  { lat: 51.1, lon: 10.4, country: "Germany" },
  { lat: 54.7, lon: -2.4, country: "United Kingdom" },
  { lat: 46.2, lon: 2.2, country: "France" },
  { lat: 36.2, lon: 138.3, country: "Japan" },
  { lat: 36.5, lon: 127.9, country: "South Korea" },
  { lat: -25.3, lon: 133.8, country: "Australia" },
  { lat: 56.1, lon: -106.3, country: "Canada" },
  { lat: 1.35, lon: 103.8, country: "Singapore" },
  { lat: 52.1, lon: 5.3, country: "Netherlands" },
  { lat: 20.6, lon: 78.9, country: "India" },
  { lat: -10.3, lon: -53.2, country: "Brazil" },
];

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cachedEvents: any[] = [];
let lastFetchTime = 0;

interface FeedStatus {
  name: string;
  id: string;
  status: "live" | "offline" | "loading";
  lastUpdated: number | null;
  count: number;
  url: string;
}

const feedStatuses: Record<string, FeedStatus> = {
  threatfox: { name: "ThreatFox IOCs", id: "threatfox", status: "loading", lastUpdated: null, count: 0, url: "https://threatfox.abuse.ch" },
  urlhaus: { name: "URLhaus", id: "urlhaus", status: "loading", lastUpdated: null, count: 0, url: "https://urlhaus.abuse.ch" },
  feodo: { name: "Feodo Tracker", id: "feodo", status: "loading", lastUpdated: null, count: 0, url: "https://feodotracker.abuse.ch" },
  blocklist: { name: "Blocklist.de", id: "blocklist", status: "loading", lastUpdated: null, count: 0, url: "https://www.blocklist.de" },
  sans: { name: "SANS ISC", id: "sans", status: "loading", lastUpdated: null, count: 0, url: "https://isc.sans.edu" },
  sslbl: { name: "SSL Blacklist", id: "sslbl", status: "loading", lastUpdated: null, count: 0, url: "https://sslbl.abuse.ch" },
  cinsscore: { name: "Cinsscore", id: "cinsscore", status: "loading", lastUpdated: null, count: 0, url: "http://cinsscore.com" },
  ipsum: { name: "IPsum Threat List", id: "ipsum", status: "loading", lastUpdated: null, count: 0, url: "https://github.com/stamparm/ipsum" },
  emergingthreats: { name: "Emerging Threats", id: "emergingthreats", status: "loading", lastUpdated: null, count: 0, url: "https://rules.emergingthreats.net" },
  spamhaus: { name: "Spamhaus DROP", id: "spamhaus", status: "loading", lastUpdated: null, count: 0, url: "https://www.spamhaus.org" },
  dataplane: { name: "DataPlane SSH", id: "dataplane", status: "loading", lastUpdated: null, count: 0, url: "https://dataplane.org" },
  turris: { name: "Turris Greylist", id: "turris", status: "loading", lastUpdated: null, count: 0, url: "https://view.sentinel.turris.cz" },
};

let urlhausCache: any[] = [];
let urlhausLastFetch = 0;
let feodoCache: any[] = [];
let feodoLastFetch = 0;
let blocklistCache: string[] = [];
let blocklistLastFetch = 0;
let sansCache: any[] = [];
let sansLastFetch = 0;
let sslblCache: any[] = [];
let sslblLastFetch = 0;
let cinsscoreCache: string[] = [];
let cinsscoreLastFetch = 0;
let ipsumCache: { ip: string; score: number }[] = [];
let ipsumLastFetch = 0;
let emergingthreatsCache: string[] = [];
let emergingthreatsLastFetch = 0;
let spamhausCache: string[] = [];
let spamhausLastFetch = 0;
let dataplaneCache: string[] = [];
let dataplaneLastFetch = 0;
let turrisCache: { ip: string; tags: string }[] = [];
let turrisLastFetch = 0;

async function fetchURLhaus(): Promise<any[]> {
  const now = Date.now();
  if (now - urlhausLastFetch < CACHE_TTL_MS && urlhausCache.length > 0) return urlhausCache;
  try {
    const resp = await fetchWithTimeout("https://urlhaus-api.abuse.ch/v1/urls/recent/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "limit=50",
    });
    const data = await resp.json();
    if (data.urls && data.urls.length > 0) {
      urlhausCache = data.urls.slice(0, 50);
      urlhausLastFetch = now;
      feedStatuses.urlhaus.status = "live";
      feedStatuses.urlhaus.lastUpdated = now;
      feedStatuses.urlhaus.count = urlhausCache.length;
    }
  } catch {
    feedStatuses.urlhaus.status = "offline";
  }
  return urlhausCache;
}

async function fetchFeodoTracker(): Promise<any[]> {
  const now = Date.now();
  if (now - feodoLastFetch < CACHE_TTL_MS && feodoCache.length > 0) return feodoCache;
  try {
    const resp = await fetchWithTimeout("https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json");
    const data = await resp.json();
    if (Array.isArray(data) && data.length > 0) {
      feodoCache = data.slice(0, 50);
      feodoLastFetch = now;
      feedStatuses.feodo.status = "live";
      feedStatuses.feodo.lastUpdated = now;
      feedStatuses.feodo.count = feodoCache.length;
    }
  } catch {
    feedStatuses.feodo.status = "offline";
  }
  return feodoCache;
}

async function fetchBlocklist(): Promise<string[]> {
  const now = Date.now();
  if (now - blocklistLastFetch < CACHE_TTL_MS && blocklistCache.length > 0) return blocklistCache;
  try {
    const resp = await fetchWithTimeout("https://lists.blocklist.de/lists/all.txt");
    const text = await resp.text();
    const ips = text.split("\n").filter(l => l.trim() && !l.startsWith("#")).slice(0, 30);
    if (ips.length > 0) {
      blocklistCache = ips;
      blocklistLastFetch = now;
      feedStatuses.blocklist.status = "live";
      feedStatuses.blocklist.lastUpdated = now;
      feedStatuses.blocklist.count = ips.length;
    }
  } catch {
    feedStatuses.blocklist.status = "offline";
  }
  return blocklistCache;
}

async function fetchSANS(): Promise<any[]> {
  const now = Date.now();
  if (now - sansLastFetch < CACHE_TTL_MS && sansCache.length > 0) return sansCache;
  try {
    const resp = await fetchWithTimeout("https://isc.sans.edu/api/sources/attacks/50/?json", {
      headers: { "User-Agent": "ThreatMap/1.0" },
    });
    const data = await resp.json();
    if (Array.isArray(data) && data.length > 0) {
      sansCache = data.slice(0, 50);
      sansLastFetch = now;
      feedStatuses.sans.status = "live";
      feedStatuses.sans.lastUpdated = now;
      feedStatuses.sans.count = sansCache.length;
    }
  } catch {
    feedStatuses.sans.status = "offline";
  }
  return sansCache;
}

async function fetchSSLBL(): Promise<any[]> {
  const now = Date.now();
  if (now - sslblLastFetch < CACHE_TTL_MS && sslblCache.length > 0) return sslblCache;
  try {
    const resp = await fetchWithTimeout("https://sslbl.abuse.ch/blacklist/sslipblacklist.json");
    const data = await resp.json();
    if (Array.isArray(data) && data.length > 0) {
      sslblCache = data.slice(0, 50);
      sslblLastFetch = now;
      feedStatuses.sslbl.status = "live";
      feedStatuses.sslbl.lastUpdated = now;
      feedStatuses.sslbl.count = sslblCache.length;
    }
  } catch {
    feedStatuses.sslbl.status = "offline";
  }
  return sslblCache;
}

async function fetchCinsscore(): Promise<string[]> {
  const now = Date.now();
  if (now - cinsscoreLastFetch < CACHE_TTL_MS && cinsscoreCache.length > 0) return cinsscoreCache;
  try {
    const resp = await fetchWithTimeout("http://cinsscore.com/list/ci-badguys.txt");
    const text = await resp.text();
    const ips = text.split("\n").filter(l => l.trim() && !l.startsWith("#")).slice(0, 30);
    if (ips.length > 0) {
      cinsscoreCache = ips;
      cinsscoreLastFetch = now;
      feedStatuses.cinsscore.status = "live";
      feedStatuses.cinsscore.lastUpdated = now;
      feedStatuses.cinsscore.count = ips.length;
    }
  } catch {
    feedStatuses.cinsscore.status = "offline";
  }
  return cinsscoreCache;
}

async function fetchIPsum(): Promise<{ ip: string; score: number }[]> {
  const now = Date.now();
  if (now - ipsumLastFetch < CACHE_TTL_MS && ipsumCache.length > 0) return ipsumCache;
  try {
    const resp = await fetchWithTimeout("https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt");
    const text = await resp.text();
    const entries: { ip: string; score: number }[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("#") || !line.trim()) continue;
      const parts = line.split("\t");
      if (parts.length >= 2) {
        const ip = parts[0].trim();
        const score = parseInt(parts[1].trim(), 10);
        if (ip && score >= 3) {
          entries.push({ ip, score });
        }
      }
      if (entries.length >= 30) break;
    }
    if (entries.length > 0) {
      ipsumCache = entries;
      ipsumLastFetch = now;
      feedStatuses.ipsum.status = "live";
      feedStatuses.ipsum.lastUpdated = now;
      feedStatuses.ipsum.count = entries.length;
    }
  } catch {
    feedStatuses.ipsum.status = "offline";
  }
  return ipsumCache;
}

async function fetchEmergingThreats(): Promise<string[]> {
  const now = Date.now();
  if (now - emergingthreatsLastFetch < CACHE_TTL_MS && emergingthreatsCache.length > 0) return emergingthreatsCache;
  try {
    const resp = await fetchWithTimeout("https://rules.emergingthreats.net/blockrules/compromised-ips.txt");
    const text = await resp.text();
    const ips = text.split("\n").filter(l => l.trim() && !l.startsWith("#")).slice(0, 30);
    if (ips.length > 0) {
      emergingthreatsCache = ips;
      emergingthreatsLastFetch = now;
      feedStatuses.emergingthreats.status = "live";
      feedStatuses.emergingthreats.lastUpdated = now;
      feedStatuses.emergingthreats.count = ips.length;
    }
  } catch {
    feedStatuses.emergingthreats.status = "offline";
  }
  return emergingthreatsCache;
}

async function fetchSpamhaus(): Promise<string[]> {
  const now = Date.now();
  if (now - spamhausLastFetch < CACHE_TTL_MS && spamhausCache.length > 0) return spamhausCache;
  try {
    const resp = await fetchWithTimeout("https://www.spamhaus.org/drop/drop.txt");
    const text = await resp.text();
    const ips: string[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith(";") || !line.trim()) continue;
      const cidr = line.split(";")[0].trim();
      const ip = cidr.split("/")[0].trim();
      if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        ips.push(ip);
      }
      if (ips.length >= 30) break;
    }
    if (ips.length > 0) {
      spamhausCache = ips;
      spamhausLastFetch = now;
      feedStatuses.spamhaus.status = "live";
      feedStatuses.spamhaus.lastUpdated = now;
      feedStatuses.spamhaus.count = ips.length;
    }
  } catch {
    feedStatuses.spamhaus.status = "offline";
  }
  return spamhausCache;
}

async function fetchDataPlane(): Promise<string[]> {
  const now = Date.now();
  if (now - dataplaneLastFetch < CACHE_TTL_MS && dataplaneCache.length > 0) return dataplaneCache;
  try {
    const resp = await fetchWithTimeout("https://dataplane.org/sshpwauth.txt");
    const text = await resp.text();
    const ips: string[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("#") || !line.trim()) continue;
      const parts = line.split("|").map(p => p.trim());
      const ip = parts.length >= 3 ? parts[2] : parts[0];
      if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        ips.push(ip);
      }
      if (ips.length >= 30) break;
    }
    if (ips.length > 0) {
      dataplaneCache = ips;
      dataplaneLastFetch = now;
      feedStatuses.dataplane.status = "live";
      feedStatuses.dataplane.lastUpdated = now;
      feedStatuses.dataplane.count = ips.length;
    }
  } catch {
    feedStatuses.dataplane.status = "offline";
  }
  return dataplaneCache;
}

async function fetchTurris(): Promise<{ ip: string; tags: string }[]> {
  const now = Date.now();
  if (now - turrisLastFetch < CACHE_TTL_MS && turrisCache.length > 0) return turrisCache;
  try {
    const resp = await fetchWithTimeout("https://view.sentinel.turris.cz/greylist-data/greylist-latest.csv");
    const text = await resp.text();
    const entries: { ip: string; tags: string }[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("#") || !line.trim()) continue;
      const parts = line.split(",");
      const ip = parts[0]?.trim();
      if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        entries.push({ ip, tags: parts[1]?.trim() || "" });
      }
      if (entries.length >= 30) break;
    }
    if (entries.length > 0) {
      turrisCache = entries;
      turrisLastFetch = now;
      feedStatuses.turris.status = "live";
      feedStatuses.turris.lastUpdated = now;
      feedStatuses.turris.count = entries.length;
    }
  } catch {
    feedStatuses.turris.status = "offline";
  }
  return turrisCache;
}

async function geolocateBatch(ips: string[], maxCount: number = 45) {
  const toResolve = ips.filter(ip => !geoCache.has(ip)).slice(0, maxCount);
  const promises = toResolve.map((ip, i) =>
    new Promise<void>(resolve => setTimeout(resolve, i * 120)).then(() => geolocateIP(ip)).then(() => {})
  );
  await Promise.all(promises);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/threats/recent", async (_req, res) => {
    try {
      const response = await fetchWithTimeout("https://threatfox-api.abuse.ch/api/v1/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "get_iocs", days: 1 }),
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("ThreatFox API error:", err);
      res.status(500).json({ error: "Failed to fetch threat data" });
    }
  });

  app.get("/api/feeds/status", async (_req, res) => {
    res.json({ feeds: Object.values(feedStatuses) });
  });

  app.get("/api/threats/live", async (_req, res) => {
    const now = Date.now();
    if (now - lastFetchTime < CACHE_TTL_MS && cachedEvents.length > 0) {
      return res.json({ events: cachedEvents, feeds: Object.values(feedStatuses), lastUpdated: lastFetchTime, nextUpdate: lastFetchTime + CACHE_TTL_MS });
    }

    try {
      const [threatfoxResult, urlhausData, feodoData, blocklistIPs, sansData, sslblData, cinsscoreIPs, ipsumData, emergingthreatsIPs, spamhausIPs, dataplaneIPs, turrisData] = await Promise.all([
        fetchWithTimeout("https://threatfox-api.abuse.ch/api/v1/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "get_iocs", days: 1 }),
        }).then(r => r.json()).catch(() => null),
        fetchURLhaus(),
        fetchFeodoTracker(),
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

      const events: any[] = [];

      if (threatfoxResult?.query_status === "ok" && threatfoxResult.data) {
        const iocs = threatfoxResult.data.slice(0, 60);
        feedStatuses.threatfox.status = "live";
        feedStatuses.threatfox.lastUpdated = now;
        feedStatuses.threatfox.count = iocs.length;

        const ipsToGeo = iocs.map((ioc: any) => extractIP(ioc.ioc || "")).filter(Boolean) as string[];
        await geolocateBatch(ipsToGeo, 25);

        for (const ioc of iocs) {
          const ip = extractIP(ioc.ioc || "");
          const geo = ip ? geoCache.get(ip) : null;
          if (!geo) continue;
          const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];

          let category = "Malware";
          const tt = ioc.threat_type || "";
          if (tt === "botnet_cc") category = "Botnet";
          else if (tt === "payload_delivery") category = "Malware";
          else if (tt.includes("phish")) category = "Phishing";

          events.push({
            id: ioc.id || `tf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ts: new Date(ioc.first_seen_utc || Date.now()).getTime(),
            indicator: ioc.ioc || "",
            malware: ioc.malware_printable || ioc.malware || "",
            category,
            technique: ioc.tags?.find((t: string) => t.startsWith("T")) || "T1059",
            reporter: "ThreatFox",
            confidence: ioc.confidence_level || 75,
            feed: "threatfox",
            src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
            dst: { lat: target.lat, lon: target.lon, country: target.country },
          });
        }
      } else {
        feedStatuses.threatfox.status = "offline";
      }

      for (const url of urlhausData.slice(0, 25)) {
        const host = (url.url || "").replace(/^https?:\/\//, "").split(/[/:]/)[0];
        const ip = extractIP(host);
        const geo = ip ? geoCache.get(ip) : null;
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];

        events.push({
          id: `uh-${url.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: new Date(url.dateadded || Date.now()).getTime(),
          indicator: host || url.url || "",
          malware: url.threat || "Malicious URL",
          category: url.threat?.toLowerCase().includes("phish") ? "Phishing" : "Malware",
          technique: "T1566",
          reporter: "URLhaus",
          confidence: 80,
          feed: "urlhaus",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      for (const entry of feodoData.slice(0, 20)) {
        const ip = entry.ip_address || entry.dst_ip || "";
        const geo = ip ? geoCache.get(ip) : null;
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];

        events.push({
          id: `fd-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: new Date(entry.first_seen || Date.now()).getTime(),
          indicator: ip,
          malware: entry.malware || "Botnet C2",
          category: "Botnet",
          technique: "T1071",
          reporter: "Feodo Tracker",
          confidence: 90,
          feed: "feodo",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      await geolocateBatch(blocklistIPs.slice(0, 8), 8);

      for (const ip of blocklistIPs.slice(0, 8)) {
        const geo = geoCache.get(ip);
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];

        events.push({
          id: `bl-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
          indicator: ip,
          malware: "Brute Force Attack",
          category: "Brute Force",
          technique: "T1110",
          reporter: "Blocklist.de",
          confidence: 70,
          feed: "blocklist",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      const sansIPs = sansData.map((e: any) => e.ip).filter(Boolean) as string[];
      await geolocateBatch(sansIPs.slice(0, 10), 10);

      for (const entry of sansData.slice(0, 10)) {
        const ip = entry.ip || "";
        if (!ip) continue;
        const geo = geoCache.get(ip);
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];

        events.push({
          id: `sans-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: entry.lastseen ? new Date(entry.lastseen).getTime() : Date.now(),
          indicator: ip,
          malware: "Network Scanner",
          category: "Exploit",
          technique: "T1595.002",
          reporter: "SANS ISC",
          confidence: 70,
          feed: "sans",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      const sslblIPs = sslblData.map((e: any) => e.ip_address).filter(Boolean) as string[];
      await geolocateBatch(sslblIPs.slice(0, 10), 10);

      for (const entry of sslblData.slice(0, 10)) {
        const ip = entry.ip_address || "";
        if (!ip) continue;
        const geo = geoCache.get(ip);
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];
        const reason = entry.listing_reason || "";
        const category = reason.toLowerCase().includes("botnet") ? "Botnet" : "Trojan";

        events.push({
          id: `sslbl-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: entry.first_seen ? new Date(entry.first_seen).getTime() : Date.now(),
          indicator: ip,
          malware: reason || "SSL Blacklisted",
          category,
          technique: "T1071",
          reporter: "SSL Blacklist",
          confidence: 85,
          feed: "sslbl",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      await geolocateBatch(cinsscoreIPs.slice(0, 10), 10);

      const cinsCats: Array<{ category: string; malware: string; technique: string }> = [
        { category: "DDoS", malware: "DDoS Source", technique: "T1498" },
        { category: "Exploit", malware: "Vulnerability Scanner", technique: "T1595.002" },
        { category: "Ransomware", malware: "Ransomware Infrastructure", technique: "T1486" },
      ];
      for (let idx = 0; idx < Math.min(cinsscoreIPs.length, 10); idx++) {
        const ip = cinsscoreIPs[idx];
        if (!ip) continue;
        const geo = geoCache.get(ip);
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];
        const cat = cinsCats[idx % cinsCats.length];

        events.push({
          id: `cins-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
          indicator: ip,
          malware: cat.malware,
          category: cat.category,
          technique: cat.technique,
          reporter: "Cinsscore",
          confidence: 65,
          feed: "cinsscore",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      const ipsumIPs = ipsumData.map(e => e.ip);
      await geolocateBatch(ipsumIPs.slice(0, 10), 10);

      for (const entry of ipsumData.slice(0, 10)) {
        const geo = geoCache.get(entry.ip);
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];
        const confidence = Math.min(50 + entry.score * 5, 95);

        events.push({
          id: `ipsum-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
          indicator: entry.ip,
          malware: `Threat Score ${entry.score}/10`,
          category: entry.score >= 7 ? "Malware" : "Exploit",
          technique: "T1595",
          reporter: "IPsum",
          confidence,
          feed: "ipsum",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      await geolocateBatch(emergingthreatsIPs.slice(0, 10), 10);

      for (const ip of emergingthreatsIPs.slice(0, 10)) {
        if (!ip) continue;
        const geo = geoCache.get(ip);
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];

        events.push({
          id: `et-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
          indicator: ip,
          malware: "Compromised Host",
          category: "Malware",
          technique: "T1071",
          reporter: "Emerging Threats",
          confidence: 75,
          feed: "emergingthreats",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      await geolocateBatch(spamhausIPs.slice(0, 8), 8);

      for (const ip of spamhausIPs.slice(0, 8)) {
        if (!ip) continue;
        const geo = geoCache.get(ip);
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];

        events.push({
          id: `spam-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
          indicator: ip,
          malware: "Spamhaus DROP Listed",
          category: "Spam",
          technique: "T1499",
          reporter: "Spamhaus DROP",
          confidence: 90,
          feed: "spamhaus",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      await geolocateBatch(dataplaneIPs.slice(0, 8), 8);

      for (const ip of dataplaneIPs.slice(0, 8)) {
        if (!ip) continue;
        const geo = geoCache.get(ip);
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];

        events.push({
          id: `dp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
          indicator: ip,
          malware: "SSH Brute Force",
          category: "Brute Force",
          technique: "T1110",
          reporter: "DataPlane SSH",
          confidence: 80,
          feed: "dataplane",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      const turrisIPs = turrisData.map(e => e.ip);
      await geolocateBatch(turrisIPs.slice(0, 8), 8);

      for (const entry of turrisData.slice(0, 8)) {
        const geo = geoCache.get(entry.ip);
        if (!geo) continue;
        const target = KNOWN_TARGETS[Math.floor(Math.random() * KNOWN_TARGETS.length)];
        const tags = entry.tags.toLowerCase();
        let category = "Exploit";
        if (tags.includes("ssh") || tags.includes("brute")) category = "Brute Force";
        else if (tags.includes("smtp") || tags.includes("spam")) category = "Spam";
        else if (tags.includes("http") || tags.includes("web")) category = "Exploit";

        events.push({
          id: `turris-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
          indicator: entry.ip,
          malware: entry.tags || "Greylisted Host",
          category,
          technique: "T1595",
          reporter: "Turris Greylist",
          confidence: 70,
          feed: "turris",
          src: { lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city },
          dst: { lat: target.lat, lon: target.lon, country: target.country },
        });
      }

      cachedEvents = events;
      lastFetchTime = now;
      res.json({ events, feeds: Object.values(feedStatuses), lastUpdated: now, nextUpdate: now + CACHE_TTL_MS });
    } catch (err) {
      console.error("Live threats error:", err);
      res.json({ events: cachedEvents.length > 0 ? cachedEvents : [], feeds: Object.values(feedStatuses), lastUpdated: lastFetchTime, nextUpdate: lastFetchTime + CACHE_TTL_MS });
    }
  });

  return httpServer;
}
