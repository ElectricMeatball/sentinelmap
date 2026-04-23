import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CyberEvent } from "@shared/schema";
import { Shield, ChevronRight, X, ExternalLink, Activity, Search, Crosshair, Download, Copy, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentOp {
  date: string;
  op: string;
  confidence: "Confirmed" | "High" | "Medium";
}

interface APTGroup {
  id: string;
  name: string;
  aliases: string[];
  sponsor: string;
  sponsorFlag: string;
  agency: string;
  active: boolean;
  activeSince: string;
  sophistication: 1 | 2 | 3 | 4 | 5;
  motivation: string[];
  primaryTargets: string[];
  regions: string[];
  malwareFamilies: string[];
  recentCVEs: string[];
  ttps: string[];
  recentOps: RecentOp[];
  color: string;
  attackCount: number;
}

// ─── Sponsor colour map ───────────────────────────────────────────────────────

const SPONSOR_COLOR: Record<string, string> = {
  Russia:   "#ef4444",
  China:    "#f97316",
  "North Korea": "#a855f7",
  Iran:     "#10b981",
  Criminal: "#94a3b8",
};

// ─── APT Data ─────────────────────────────────────────────────────────────────

const APT_GROUPS: APTGroup[] = [
  {
    id: "apt28",
    name: "APT28",
    aliases: ["Fancy Bear", "Sofacy", "Pawn Storm", "STRONTIUM", "Sednit"],
    sponsor: "Russia", sponsorFlag: "🇷🇺", agency: "GRU Unit 26165",
    active: true, activeSince: "2004", sophistication: 5,
    motivation: ["Espionage", "Political Interference", "Destabilisation"],
    primaryTargets: ["Government", "Military", "Defense", "Media", "NATO"],
    regions: ["Europe", "North America", "Middle East"],
    malwareFamilies: ["X-Agent", "Sofacy", "GAMEFISH", "Zebrocy", "Drovorub", "MASEPIE"],
    recentCVEs: ["CVE-2023-23397", "CVE-2022-30190", "CVE-2017-0144"],
    ttps: ["T1566", "T1078", "T1071", "T1027", "T1055", "T1036", "T1059"],
    recentOps: [
      { date: "2024-03", op: "Targeting European elections via spear-phishing", confidence: "High" },
      { date: "2023-12", op: "CVE-2023-23397 Outlook zero-day exploitation", confidence: "Confirmed" },
      { date: "2023-06", op: "Ukrainian military phishing campaign", confidence: "High" },
    ],
    color: "#ef4444", attackCount: 0,
  },
  {
    id: "apt29",
    name: "APT29",
    aliases: ["Cozy Bear", "Midnight Blizzard", "NOBELIUM", "The Dukes", "Iron Hemlock"],
    sponsor: "Russia", sponsorFlag: "🇷🇺", agency: "SVR (Foreign Intelligence Service)",
    active: true, activeSince: "2008", sophistication: 5,
    motivation: ["Espionage", "Intelligence Collection", "Supply Chain"],
    primaryTargets: ["Government", "Think Tanks", "Healthcare", "Tech", "Defence"],
    regions: ["North America", "Europe", "Global"],
    malwareFamilies: ["SUNBURST", "TEARDROP", "MiniDuke", "CosmicDuke", "WellMess", "BEATDROP"],
    recentCVEs: ["CVE-2021-26855", "CVE-2021-44228", "CVE-2023-42793"],
    ttps: ["T1195", "T1566", "T1078", "T1071", "T1027", "T1055", "T1210"],
    recentOps: [
      { date: "2024-01", op: "Microsoft corporate email breach via password spray", confidence: "Confirmed" },
      { date: "2023-10", op: "TeamCity CVE-2023-42793 exploitation targeting CI/CD", confidence: "High" },
      { date: "2021-12", op: "SolarWinds SUNBURST supply chain compromise", confidence: "Confirmed" },
    ],
    color: "#ef4444", attackCount: 0,
  },
  {
    id: "sandworm",
    name: "Sandworm",
    aliases: ["Voodoo Bear", "IRIDIUM", "Seashell Blizzard", "TeleBots", "BlackEnergy"],
    sponsor: "Russia", sponsorFlag: "🇷🇺", agency: "GRU Unit 74455",
    active: true, activeSince: "2009", sophistication: 5,
    motivation: ["Sabotage", "Destruction", "Disruption", "Espionage"],
    primaryTargets: ["Critical Infrastructure", "Energy", "Government", "Media"],
    regions: ["Ukraine", "Europe", "Global"],
    malwareFamilies: ["NotPetya", "Industroyer", "BlackEnergy", "KillDisk", "CaddyWiper", "Prestige"],
    recentCVEs: ["CVE-2022-41328", "CVE-2021-31979"],
    ttps: ["T1561", "T1485", "T1489", "T1529", "T1071", "T1190"],
    recentOps: [
      { date: "2024-02", op: "Mandiant-linked attacks on Ukrainian water utilities", confidence: "High" },
      { date: "2022-04", op: "Industroyer2 targeting Ukrainian power grid", confidence: "Confirmed" },
      { date: "2017-06", op: "NotPetya — $10bn global destructive wiper", confidence: "Confirmed" },
    ],
    color: "#ef4444", attackCount: 0,
  },
  {
    id: "apt40",
    name: "APT40",
    aliases: ["BRONZE MOHAWK", "Leviathan", "TEMP.Periscope", "Kryptonite Panda"],
    sponsor: "China", sponsorFlag: "🇨🇳", agency: "MSS Hainan State Security Department",
    active: true, activeSince: "2013", sophistication: 4,
    motivation: ["Espionage", "IP Theft", "Maritime Intelligence"],
    primaryTargets: ["Maritime", "Defence", "Aviation", "Government", "Universities"],
    regions: ["Asia-Pacific", "Europe", "North America"],
    malwareFamilies: ["AIRBREAK", "FRESHAIR", "BADFLICK", "MURKYTOP", "ScanBox"],
    recentCVEs: ["CVE-2021-26855", "CVE-2021-31207", "CVE-2020-1472"],
    ttps: ["T1190", "T1078", "T1566", "T1071", "T1210", "T1036"],
    recentOps: [
      { date: "2024-07", op: "ASD/CISA advisory on exploitation of SOHO routers", confidence: "Confirmed" },
      { date: "2023-05", op: "Pacific defence contractor spear-phishing", confidence: "High" },
      { date: "2021-03", op: "Microsoft Exchange ProxyLogon mass exploitation", confidence: "High" },
    ],
    color: "#f97316", attackCount: 0,
  },
  {
    id: "apt41",
    name: "APT41",
    aliases: ["Double Dragon", "Winnti", "Barium", "Axiom", "Wicked Panda"],
    sponsor: "China", sponsorFlag: "🇨🇳", agency: "MSS / Chengdu 404 Network Technology",
    active: true, activeSince: "2012", sophistication: 5,
    motivation: ["Espionage", "Financial Gain", "IP Theft"],
    primaryTargets: ["Healthcare", "Tech", "Telecom", "Finance", "Gaming"],
    regions: ["Global"],
    malwareFamilies: ["MESSAGETAP", "HIGHNOON", "DUSTPAN", "KEYPLUG", "Speculoos"],
    recentCVEs: ["CVE-2021-44207", "CVE-2020-10189", "CVE-2019-3396"],
    ttps: ["T1195", "T1078", "T1027", "T1055", "T1059", "T1566"],
    recentOps: [
      { date: "2024-03", op: "KEYPLUG malware deployment against Asian telcos", confidence: "High" },
      { date: "2023-09", op: "Stealth operations in US healthcare and tech", confidence: "Medium" },
      { date: "2020-08", op: "DOJ indicted 5 members — 100+ victims across 3 continents", confidence: "Confirmed" },
    ],
    color: "#f97316", attackCount: 0,
  },
  {
    id: "apt10",
    name: "APT10",
    aliases: ["MenuPass", "Stone Panda", "POTASSIUM", "Bronze Riverside"],
    sponsor: "China", sponsorFlag: "🇨🇳", agency: "MSS Tianjin State Security Bureau",
    active: true, activeSince: "2009", sophistication: 4,
    motivation: ["Espionage", "IP Theft", "Managed Service Provider Targeting"],
    primaryTargets: ["MSPs", "Healthcare", "Government", "Defence", "Finance"],
    regions: ["North America", "Europe", "Asia-Pacific"],
    malwareFamilies: ["PlugX", "RedLeaves", "QuasarRAT", "UPPERCUT"],
    recentCVEs: ["CVE-2023-27997", "CVE-2022-40684"],
    ttps: ["T1199", "T1078", "T1027", "T1071", "T1059"],
    recentOps: [
      { date: "2024-02", op: "Fortinet VPN zero-day targeting APAC governments", confidence: "High" },
      { date: "2023-01", op: "Healthcare sector espionage across US and EU", confidence: "Medium" },
    ],
    color: "#f97316", attackCount: 0,
  },
  {
    id: "lazarus",
    name: "Lazarus Group",
    aliases: ["HIDDEN COBRA", "Guardians of Peace", "ZINC", "Diamond Sleet", "Labyrinth Chollima"],
    sponsor: "North Korea", sponsorFlag: "🇰🇵", agency: "RGB Bureau 121",
    active: true, activeSince: "2009", sophistication: 5,
    motivation: ["Financial Gain", "Sanctions Evasion", "Espionage"],
    primaryTargets: ["Cryptocurrency", "Finance", "Defence", "Media", "Aerospace"],
    regions: ["Global"],
    malwareFamilies: ["WannaCry", "ELECTRICFISH", "HOPLIGHT", "DTrack", "BLINDINGCAN", "AppleJeus"],
    recentCVEs: ["CVE-2022-0609", "CVE-2021-44228"],
    ttps: ["T1566", "T1059", "T1055", "T1078", "T1036", "T1071", "T1140"],
    recentOps: [
      { date: "2024-01", op: "$600M Ronin Bridge cryptocurrency heist attribution", confidence: "Confirmed" },
      { date: "2023-11", op: "macOS supply chain via fake crypto job offers (3CX)", confidence: "High" },
      { date: "2017-05", op: "WannaCry global ransomworm — 200K victims", confidence: "Confirmed" },
    ],
    color: "#a855f7", attackCount: 0,
  },
  {
    id: "kimsuky",
    name: "Kimsuky",
    aliases: ["Velvet Chollima", "Black Banshee", "Thallium", "ARCHIPELAGO"],
    sponsor: "North Korea", sponsorFlag: "🇰🇵", agency: "RGB Reconnaissance General Bureau",
    active: true, activeSince: "2012", sophistication: 4,
    motivation: ["Espionage", "Policy Intelligence", "Sanctions Intel"],
    primaryTargets: ["Government", "Think Tanks", "Universities", "Media", "Nuclear"],
    regions: ["South Korea", "USA", "Europe", "Japan"],
    malwareFamilies: ["BabyShark", "AppleSeed", "FlowerPower", "GoldDragon", "RandomQuery"],
    recentCVEs: ["CVE-2022-30190", "CVE-2021-26855"],
    ttps: ["T1566", "T1078", "T1059", "T1027", "T1071"],
    recentOps: [
      { date: "2024-01", op: "AI chatbot-themed phishing targeting Korean government", confidence: "High" },
      { date: "2023-07", op: "Nuclear think tank and defence researcher targeting", confidence: "High" },
    ],
    color: "#a855f7", attackCount: 0,
  },
  {
    id: "apt33",
    name: "APT33",
    aliases: ["Elfin", "Refined Kitten", "HOLMIUM", "Peach Sandstorm"],
    sponsor: "Iran", sponsorFlag: "🇮🇷", agency: "IRGC",
    active: true, activeSince: "2013", sophistication: 4,
    motivation: ["Espionage", "Sabotage", "Regional Dominance"],
    primaryTargets: ["Aerospace", "Defence", "Petrochemical", "Government"],
    regions: ["Middle East", "USA", "Europe"],
    malwareFamilies: ["SHAPESHIFT", "TURNEDUP", "NANOCORE", "NETWIRE", "Dropshot"],
    recentCVEs: ["CVE-2023-33246", "CVE-2022-47966"],
    ttps: ["T1566", "T1078", "T1059", "T1071", "T1036"],
    recentOps: [
      { date: "2023-09", op: "Password spray against US defence and satellite orgs", confidence: "Confirmed" },
      { date: "2023-02", op: "Zoho ManageEngine exploitation targeting US pharma", confidence: "High" },
    ],
    color: "#10b981", attackCount: 0,
  },
  {
    id: "apt34",
    name: "APT34",
    aliases: ["OilRig", "Helix Kitten", "IRN2", "CHRYSENE", "Crambus"],
    sponsor: "Iran", sponsorFlag: "🇮🇷", agency: "Ministry of Intelligence (MOIS)",
    active: true, activeSince: "2014", sophistication: 4,
    motivation: ["Espionage", "Intelligence Collection"],
    primaryTargets: ["Government", "Finance", "Energy", "Telecom", "Chemical"],
    regions: ["Middle East", "Europe", "North America"],
    malwareFamilies: ["POWRUNER", "BONDUPDATER", "RDAT", "DNSpionage", "SideTwist"],
    recentCVEs: ["CVE-2024-21887", "CVE-2023-35078"],
    ttps: ["T1566", "T1071", "T1059", "T1027", "T1078", "T1210"],
    recentOps: [
      { date: "2024-01", op: "Ivanti VPN zero-day exploitation against Middle East govts", confidence: "High" },
      { date: "2023-08", op: "Ivanti EPMM exploitation targeting European govts", confidence: "High" },
    ],
    color: "#10b981", attackCount: 0,
  },
  {
    id: "muddywater",
    name: "MuddyWater",
    aliases: ["Static Kitten", "MERCURY", "Seedworm", "Mango Sandstorm"],
    sponsor: "Iran", sponsorFlag: "🇮🇷", agency: "MOIS",
    active: true, activeSince: "2017", sophistication: 3,
    motivation: ["Espionage", "Ransomware Support", "Intelligence"],
    primaryTargets: ["Government", "Telecom", "Defence", "Universities"],
    regions: ["Middle East", "South Asia", "Europe", "North America"],
    malwareFamilies: ["POWERSTATS", "SHARPSTATS", "BugSleep", "MuddyC3", "PhonyC2"],
    recentCVEs: ["CVE-2023-27350", "CVE-2021-34473"],
    ttps: ["T1566", "T1059", "T1027", "T1071", "T1078"],
    recentOps: [
      { date: "2024-01", op: "BugSleep backdoor targeting Middle East governments", confidence: "High" },
      { date: "2023-06", op: "PhonyC2 framework upgrade — Israeli targets", confidence: "Confirmed" },
    ],
    color: "#10b981", attackCount: 0,
  },
  {
    id: "charcoal-typhoon",
    name: "Charcoal Typhoon",
    aliases: ["CHROMIUM", "ControlX", "BRONZE ATLAS"],
    sponsor: "China", sponsorFlag: "🇨🇳", agency: "MSS",
    active: true, activeSince: "2016", sophistication: 4,
    motivation: ["Espionage", "Influence Operations", "AI Theft"],
    primaryTargets: ["AI Research", "Education", "Think Tanks", "Government"],
    regions: ["Global"],
    malwareFamilies: ["ShadowPad", "PlugX", "Cobalt Strike"],
    recentCVEs: ["CVE-2023-27997"],
    ttps: ["T1566", "T1078", "T1059", "T1071", "T1027"],
    recentOps: [
      { date: "2024-02", op: "Microsoft AI research infrastructure probing", confidence: "Medium" },
      { date: "2023-11", op: "OpenAI and academic AI lab targeting", confidence: "Medium" },
    ],
    color: "#f97316", attackCount: 0,
  },
  {
    id: "volt-typhoon",
    name: "Volt Typhoon",
    aliases: ["BRONZE SILHOUETTE", "Vanguard Panda", "KV Botnet"],
    sponsor: "China", sponsorFlag: "🇨🇳", agency: "PLA / MSS",
    active: true, activeSince: "2021", sophistication: 5,
    motivation: ["Pre-positioning", "Sabotage", "Critical Infrastructure"],
    primaryTargets: ["Critical Infrastructure", "Military", "Utilities", "Transport", "Communications"],
    regions: ["USA", "Guam", "Pacific"],
    malwareFamilies: ["KV-botnet", "living-off-the-land"],
    recentCVEs: ["CVE-2023-27997", "CVE-2024-3400"],
    ttps: ["T1190", "T1078", "T1036", "T1071", "T1027", "T1133"],
    recentOps: [
      { date: "2024-02", op: "CISA emergency directive — US critical infrastructure pre-positioning", confidence: "Confirmed" },
      { date: "2024-01", op: "KV-Botnet dismantled by FBI — SOHO routers compromised", confidence: "Confirmed" },
      { date: "2023-05", op: "Guam military infrastructure infiltration", confidence: "Confirmed" },
    ],
    color: "#f97316", attackCount: 0,
  },
  {
    id: "salt-typhoon",
    name: "Salt Typhoon",
    aliases: ["GhostEmperor", "FamousSparrow", "UNC2286"],
    sponsor: "China", sponsorFlag: "🇨🇳", agency: "MSS",
    active: true, activeSince: "2019", sophistication: 5,
    motivation: ["Espionage", "Lawful Intercept Abuse", "Telecom Surveillance"],
    primaryTargets: ["Telecom", "ISPs", "Government", "Law Enforcement Systems"],
    regions: ["USA", "Europe", "Asia"],
    malwareFamilies: ["GhostSpider", "MASOL RAT", "Demodex"],
    recentCVEs: ["CVE-2023-0669", "CVE-2024-3400"],
    ttps: ["T1190", "T1078", "T1071", "T1557", "T1040"],
    recentOps: [
      { date: "2024-12", op: "9 US telecom carriers breached — wiretap system access", confidence: "Confirmed" },
      { date: "2024-10", op: "AT&T and Verizon lawful intercept infrastructure accessed", confidence: "Confirmed" },
      { date: "2024-03", op: "Southeast Asia telecom infiltration via Cisco IOS-XE", confidence: "High" },
    ],
    color: "#f97316", attackCount: 0,
  },
  {
    id: "unc3944",
    name: "Scattered Spider",
    aliases: ["UNC3944", "Roasted 0ktapus", "Starfraud", "Scatter Swine"],
    sponsor: "Criminal", sponsorFlag: "🌐", agency: "Financially Motivated Cybercriminal Group",
    active: true, activeSince: "2022", sophistication: 4,
    motivation: ["Financial Gain", "Extortion", "Data Theft"],
    primaryTargets: ["Hospitality", "Gaming", "Telecom", "Finance", "Retail"],
    regions: ["USA", "UK", "Global"],
    malwareFamilies: ["BlackCat/ALPHV", "Qilin", "ScreenConnect"],
    recentCVEs: ["CVE-2023-27532", "CVE-2023-22515"],
    ttps: ["T1566", "T1078", "T1621", "T1556", "T1059"],
    recentOps: [
      { date: "2024-01", op: "Qilin ransomware deployment against UK healthcare", confidence: "High" },
      { date: "2023-09", op: "MGM Resorts $100M ransomware attack", confidence: "Confirmed" },
      { date: "2023-09", op: "Caesars Entertainment — $15M ransom paid", confidence: "Confirmed" },
    ],
    color: "#94a3b8", attackCount: 0,
  },
  {
    id: "apt37",
    name: "APT37",
    aliases: ["Reaper", "ScarCruft", "Group123", "Ricochet Chollima"],
    sponsor: "North Korea", sponsorFlag: "🇰🇵", agency: "Ministry of State Security (MSS DPRK)",
    active: true, activeSince: "2012", sophistication: 4,
    motivation: ["Espionage", "Defector Tracking", "Intelligence"],
    primaryTargets: ["Defectors", "Journalists", "Government", "Human Rights"],
    regions: ["South Korea", "Japan", "Vietnam", "Middle East"],
    malwareFamilies: ["ROKRAT", "POORAIM", "SHUTTERSPEED", "DOGCALL"],
    recentCVEs: ["CVE-2022-41128", "CVE-2021-26411"],
    ttps: ["T1566", "T1059", "T1027", "T1071"],
    recentOps: [
      { date: "2024-01", op: "Cloud-based C2 via Dropbox and Yandex targeting defectors", confidence: "High" },
      { date: "2023-07", op: "IE zero-day (CVE-2022-41128) against Korean press", confidence: "Confirmed" },
    ],
    color: "#a855f7", attackCount: 0,
  },
  {
    id: "gamaredon",
    name: "Gamaredon",
    aliases: ["Primitive Bear", "Shuckworm", "ACTINIUM", "Trident Ursa"],
    sponsor: "Russia", sponsorFlag: "🇷🇺", agency: "FSB Centre 18",
    active: true, activeSince: "2013", sophistication: 3,
    motivation: ["Espionage", "Data Theft", "Disruption"],
    primaryTargets: ["Ukraine Government", "Military", "NGOs", "Law Enforcement"],
    regions: ["Ukraine"],
    malwareFamilies: ["Pterodo", "EvilGnome", "PowerPunch", "QuietSieve"],
    recentCVEs: ["CVE-2017-0199"],
    ttps: ["T1566", "T1059", "T1071", "T1027"],
    recentOps: [
      { date: "2024-02", op: "Pterodo variant targeting Ukrainian military logistics", confidence: "Confirmed" },
      { date: "2023-11", op: "Mass phishing of Ukrainian government ministries", confidence: "Confirmed" },
    ],
    color: "#ef4444", attackCount: 0,
  },
  {
    id: "turla",
    name: "Turla",
    aliases: ["Snake", "Uroburos", "Waterbug", "Venomous Bear", "Secret Blizzard"],
    sponsor: "Russia", sponsorFlag: "🇷🇺", agency: "FSB",
    active: true, activeSince: "1996", sophistication: 5,
    motivation: ["Espionage", "Long-term Persistence", "Intelligence"],
    primaryTargets: ["Embassies", "Government", "Military", "Research"],
    regions: ["Europe", "Middle East", "Central Asia", "Global"],
    malwareFamilies: ["Snake/Uroburos", "Carbon", "Kazuar", "TinyTurla", "ComRAT"],
    recentCVEs: ["CVE-2023-38831"],
    ttps: ["T1195", "T1078", "T1071", "T1027", "T1055", "T1090"],
    recentOps: [
      { date: "2024-05", op: "US/UK/EU disruption of Snake malware network", confidence: "Confirmed" },
      { date: "2023-09", op: "TinyTurla-NG targeting Polish NGOs", confidence: "Confirmed" },
    ],
    color: "#ef4444", attackCount: 0,
  },
  {
    id: "apt30",
    name: "APT30",
    aliases: ["Override Panda", "Bronze Bishop"],
    sponsor: "China", sponsorFlag: "🇨🇳", agency: "PLA",
    active: true, activeSince: "2005", sophistication: 4,
    motivation: ["Espionage", "Regional Intelligence"],
    primaryTargets: ["ASEAN Governments", "Defence", "Journalists", "NGOs"],
    regions: ["Southeast Asia", "India"],
    malwareFamilies: ["SHIPSHAPE", "SPACESHIP", "FLASHFLOOD", "BACKBEND"],
    recentCVEs: [],
    ttps: ["T1566", "T1059", "T1027", "T1071"],
    recentOps: [
      { date: "2023-04", op: "ASEAN government summit intelligence collection", confidence: "Medium" },
    ],
    color: "#f97316", attackCount: 0,
  },
  {
    id: "hafnium",
    name: "HAFNIUM",
    aliases: ["Silk Typhoon", "Bronze Fondue"],
    sponsor: "China", sponsorFlag: "🇨🇳", agency: "MSS",
    active: true, activeSince: "2019", sophistication: 5,
    motivation: ["Espionage", "IP Theft"],
    primaryTargets: ["Law Firms", "Defence", "NGOs", "Think Tanks", "Government"],
    regions: ["USA", "Global"],
    malwareFamilies: ["CHOPPER", "ASPXSPY", "Covenant", "Nishang"],
    recentCVEs: ["CVE-2021-26855", "CVE-2021-27065", "CVE-2021-26857"],
    ttps: ["T1190", "T1059", "T1078", "T1027"],
    recentOps: [
      { date: "2024-01", op: "US Treasury breach via BeyondTrust vulnerability", confidence: "High" },
      { date: "2021-03", op: "Exchange ProxyLogon — 250K+ servers compromised globally", confidence: "Confirmed" },
    ],
    color: "#f97316", attackCount: 0,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confColor(c: string): string {
  if (c === "Confirmed") return "#10b981";
  if (c === "High")      return "#f59e0b";
  return "#64748b";
}

function SophisticationDots({ level, color }: { level: number; color: string }) {
  return (
    <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: i <= level ? color : "rgba(255,255,255,0.08)",
          boxShadow: i <= level ? `0 0 4px ${color}80` : "none",
          display: "inline-block",
        }} />
      ))}
    </span>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
      padding: "2px 6px", borderRadius: 3,
      background: `${color}18`, border: `1px solid ${color}30`,
      color, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function ConfBadge({ c }: { c: string }) {
  const col = confColor(c);
  return (
    <span style={{
      fontSize: 7, fontWeight: 800, letterSpacing: "0.1em",
      padding: "1px 5px", borderRadius: 2,
      background: `${col}18`, border: `1px solid ${col}40`,
      color: col, textTransform: "uppercase" as const,
    }}>{c}</span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AptTracker() {
  const [search, setSearch]         = useState("");
  const [sponsor, setSponsor]        = useState<string>("ALL");
  const [selected, setSelected]      = useState<APTGroup | null>(null);

  const { data: eventsRaw } = useQuery<CyberEvent[]>({
    queryKey: ["/api/events"],
    refetchInterval: 30_000,
  });
  const events: CyberEvent[] = eventsRaw ?? [];

  // ── Live IOC correlation ──────────────────────────────────────────────────
  const iocMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of APT_GROUPS) {
      const nameSet = new Set([
        g.name.toLowerCase(),
        ...g.aliases.map(a => a.toLowerCase()),
      ]);
      const mwSet = new Set(g.malwareFamilies.map(m => m.toLowerCase()));
      let count = 0;
      for (const ev of events) {
        const actor = (ev.actor ?? "").toLowerCase();
        const mw    = (ev.malwareFamily ?? "").toLowerCase();
        if (nameSet.has(actor) || mwSet.has(mw) || mwSet.has(actor)) count++;
      }
      map[g.id] = count;
    }
    return map;
  }, [events]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const sponsors = ["ALL", "Russia", "China", "North Korea", "Iran", "Criminal"];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return APT_GROUPS.filter(g => {
      const matchSponsor = sponsor === "ALL" || g.sponsor === sponsor;
      const matchSearch  = !q ||
        g.name.toLowerCase().includes(q) ||
        g.aliases.some(a => a.toLowerCase().includes(q)) ||
        g.malwareFamilies.some(m => m.toLowerCase().includes(q)) ||
        g.recentCVEs.some(c => c.toLowerCase().includes(q)) ||
        g.agency.toLowerCase().includes(q);
      return matchSponsor && matchSearch;
    });
  }, [search, sponsor]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalConfirmed = APT_GROUPS.reduce(
    (acc, g) => acc + g.recentOps.filter(o => o.confidence === "Confirmed").length, 0
  );
  const totalOps = APT_GROUPS.reduce((acc, g) => acc + g.recentOps.length, 0);
  const liveMatches = Object.values(iocMap).reduce((a, b) => a + b, 0);

  const byNation: Record<string, number> = {};
  for (const g of APT_GROUPS) byNation[g.sponsor] = (byNation[g.sponsor] ?? 0) + 1;

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#040810",
      display: "flex", flexDirection: "column",
      fontFamily: "'Rajdhani', sans-serif", overflow: "hidden",
    }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header style={{
        height: 48, background: "rgba(4,8,16,0.98)",
        borderBottom: "1px solid rgba(99,179,237,0.12)",
        display: "flex", alignItems: "center", padding: "0 18px", gap: 14, flexShrink: 0,
      }}>
        <a href="/" style={{
          color: "rgba(99,179,237,0.4)", textDecoration: "none",
          fontSize: 10, letterSpacing: "0.14em", fontFamily: "'JetBrains Mono',monospace",
        }}>← SENTINEL-MAP</a>
        <div style={{ width: 1, height: 20, background: "rgba(99,179,237,0.1)" }} />
        <Crosshair size={14} style={{ color: "#ef4444" }} />
        <span style={{
          fontSize: 13, fontWeight: 800, letterSpacing: "0.2em",
          color: "#e2e8f0", textTransform: "uppercase",
        }}>APT INTELLIGENCE TRACKER</span>
        {liveMatches > 0 && (
          <span style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "2px 8px",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 3, fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", color: "#ef4444",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", background: "#ef4444",
              display: "inline-block", animation: "livePulse 1s ease-in-out infinite",
            }} />
            {liveMatches} LIVE IOC MATCHES
          </span>
        )}
        <span style={{
          marginLeft: "auto", fontSize: 9, color: "rgba(226,232,240,0.25)",
          fontFamily: "'JetBrains Mono',monospace",
        }}>
          {APT_GROUPS.length} GROUPS TRACKED
        </span>
      </header>

      {/* ── STATS BAR ──────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        borderBottom: "1px solid rgba(99,179,237,0.06)",
        background: "rgba(4,8,16,0.9)", flexShrink: 0,
      }}>
        {[
          { label: "Total Groups",     value: APT_GROUPS.length,    color: "#63b3ed" },
          { label: "Active",            value: APT_GROUPS.filter(g => g.active).length, color: "#10b981" },
          { label: "Tracked Ops",       value: totalOps,             color: "#f59e0b" },
          { label: "Confirmed Ops",     value: totalConfirmed,       color: "#ef4444" },
          { label: "Live Feed Matches", value: liveMatches,          color: "#a855f7" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: "8px 16px",
            borderRight: "1px solid rgba(99,179,237,0.05)",
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: 8, color: "rgba(226,232,240,0.3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{s.label}</span>
          </div>
        ))}
        <div style={{
          flex: 3, padding: "6px 16px",
          display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const,
        }}>
          {Object.entries(byNation).map(([nat, cnt]) => (
            <span key={nat} style={{
              fontSize: 9, color: SPONSOR_COLOR[nat] ?? "#94a3b8",
              fontWeight: 700, letterSpacing: "0.06em",
            }}>{nat} <span style={{ opacity: 0.5 }}>×{cnt}</span></span>
          ))}
        </div>
      </div>

      {/* ── CONTROLS ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
        borderBottom: "1px solid rgba(99,179,237,0.06)",
        background: "rgba(4,8,16,0.85)", flexShrink: 0, flexWrap: "wrap" as const,
      }}>
        {/* sponsor filter */}
        <div style={{ display: "flex", gap: 4 }}>
          {sponsors.map(s => {
            const col = s === "ALL" ? "#63b3ed" : (SPONSOR_COLOR[s] ?? "#94a3b8");
            const on  = sponsor === s;
            return (
              <button key={s} onClick={() => setSponsor(s)} style={{
                padding: "4px 10px", borderRadius: 5,
                border: `1px solid ${on ? col + "50" : "rgba(99,179,237,0.07)"}`,
                background: on ? `${col}14` : "transparent",
                color: on ? col : "rgba(226,232,240,0.3)",
                cursor: "pointer", fontSize: 9, fontWeight: 800,
                letterSpacing: "0.1em", fontFamily: "'Rajdhani',sans-serif",
                boxShadow: on ? `0 0 12px ${col}18` : "none",
              }}>{s}</button>
            );
          })}
        </div>

        {/* search */}
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          background: "rgba(99,179,237,0.04)",
          border: "1px solid rgba(99,179,237,0.1)",
          borderRadius: 6, padding: "4px 10px",
        }}>
          <Search size={11} style={{ color: "rgba(99,179,237,0.4)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search group, alias, malware, CVE…"
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: 10, width: 220,
              fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.04em",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(226,232,240,0.3)", padding: 0, lineHeight: 1,
            }}>✕</button>
          )}
        </div>

        <span style={{ fontSize: 9, color: "rgba(226,232,240,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>
          {filtered.length} / {APT_GROUPS.length}
        </span>
      </div>

      {/* ── BODY (card grid + detail panel) ────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* CARD GRID */}
        <div style={{
          flex: 1, overflowY: "auto", padding: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          gap: 10, alignContent: "start",
        }}>
          {filtered.map(g => {
            const liveCount = iocMap[g.id] ?? 0;
            const accentCol = SPONSOR_COLOR[g.sponsor] ?? g.color;
            return (
              <div
                key={g.id}
                onClick={() => setSelected(selected?.id === g.id ? null : g)}
                style={{
                  background: selected?.id === g.id
                    ? `${accentCol}0c`
                    : "rgba(6,11,20,0.85)",
                  border: `1px solid ${selected?.id === g.id ? accentCol + "40" : accentCol + "18"}`,
                  borderLeft: `3px solid ${accentCol}`,
                  borderRadius: "0 8px 8px 0",
                  padding: "12px 14px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  position: "relative" as const,
                }}
              >
                {/* card header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{
                        fontSize: 14, fontWeight: 900, color: "#e2e8f0",
                        letterSpacing: "0.06em",
                      }}>{g.name}</span>
                      <span style={{ fontSize: 16 }}>{g.sponsorFlag}</span>
                      {g.active && (
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%", background: "#10b981",
                          display: "inline-block", boxShadow: "0 0 5px #10b981",
                          animation: "livePulse 2s ease-in-out infinite",
                        }} />
                      )}
                      {liveCount > 0 && (
                        <span style={{
                          fontSize: 7, fontWeight: 800, letterSpacing: "0.1em",
                          padding: "1px 5px", borderRadius: 2,
                          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                          color: "#ef4444",
                        }}>⚡ {liveCount} IOC</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 8, color: "rgba(226,232,240,0.35)",
                      letterSpacing: "0.06em", fontFamily: "'JetBrains Mono',monospace",
                    }}>{g.agency} · since {g.activeSince}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 4 }}>
                    <SophisticationDots level={g.sophistication} color={accentCol} />
                    <span style={{
                      fontSize: 7, color: "rgba(226,232,240,0.25)", letterSpacing: "0.08em",
                    }}>TIER {g.sophistication}</span>
                  </div>
                </div>

                {/* aliases */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginBottom: 8 }}>
                  {g.aliases.slice(0, 3).map(a => (
                    <span key={a} style={{
                      fontSize: 7, padding: "1px 5px", borderRadius: 2,
                      background: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.1)",
                      color: "rgba(226,232,240,0.4)", letterSpacing: "0.04em",
                    }}>{a}</span>
                  ))}
                  {g.aliases.length > 3 && (
                    <span style={{
                      fontSize: 7, padding: "1px 5px", borderRadius: 2,
                      background: "rgba(99,179,237,0.04)",
                      color: "rgba(226,232,240,0.25)",
                    }}>+{g.aliases.length - 3}</span>
                  )}
                </div>

                {/* target sectors */}
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const, marginBottom: 10 }}>
                  {g.primaryTargets.map(t => <Tag key={t} label={t} color={accentCol} />)}
                </div>

                {/* recent ops */}
                <div style={{
                  borderTop: "1px solid rgba(99,179,237,0.05)",
                  paddingTop: 8, display: "flex", flexDirection: "column" as const, gap: 5,
                }}>
                  {g.recentOps.slice(0, 3).map((op, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <span style={{
                        fontSize: 7, fontFamily: "'JetBrains Mono',monospace",
                        color: "rgba(226,232,240,0.25)", flexShrink: 0, marginTop: 1,
                      }}>{op.date}</span>
                      <span style={{
                        fontSize: 8.5, color: "rgba(226,232,240,0.6)",
                        lineHeight: 1.35, flex: 1,
                      }}>{op.op}</span>
                      <ConfBadge c={op.confidence} />
                    </div>
                  ))}
                </div>

                {/* expand chevron */}
                <ChevronRight size={12} style={{
                  position: "absolute" as const, right: 8, top: 12,
                  color: selected?.id === g.id ? accentCol : "rgba(226,232,240,0.15)",
                  transform: selected?.id === g.id ? "rotate(90deg)" : "none",
                  transition: "transform 0.2s",
                }} />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{
              gridColumn: "1/-1", padding: 48, textAlign: "center" as const,
              color: "rgba(226,232,240,0.2)", fontSize: 12,
            }}>No groups match your search.</div>
          )}
        </div>

        {/* DETAIL PANEL */}
        {selected && (
          <div style={{
            width: 400, flexShrink: 0,
            background: "rgba(4,8,16,0.97)",
            borderLeft: `1px solid ${(SPONSOR_COLOR[selected.sponsor] ?? selected.color)}25`,
            overflowY: "auto", display: "flex", flexDirection: "column" as const,
          }}>
            {/* panel header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${(SPONSOR_COLOR[selected.sponsor] ?? selected.color)}18`,
              background: `${SPONSOR_COLOR[selected.sponsor] ?? selected.color}08`,
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: "#e2e8f0", letterSpacing: "0.06em" }}>{selected.name}</span>
                    <span style={{ fontSize: 20 }}>{selected.sponsorFlag}</span>
                    {selected.active && (
                      <span style={{
                        fontSize: 7, fontWeight: 800, letterSpacing: "0.12em",
                        padding: "2px 6px", borderRadius: 3,
                        background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
                        color: "#10b981",
                      }}>● ACTIVE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(226,232,240,0.4)", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace" }}>
                    {selected.agency}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(226,232,240,0.25)", marginTop: 2 }}>
                    Active since {selected.activeSince} · {selected.sponsor}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{
                  background: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.1)",
                  borderRadius: 5, padding: "4px 6px", cursor: "pointer",
                  color: "rgba(226,232,240,0.4)",
                }}>
                  <X size={12} />
                </button>
              </div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <SophisticationDots level={selected.sophistication} color={SPONSOR_COLOR[selected.sponsor] ?? selected.color} />
                <span style={{ fontSize: 8, color: "rgba(226,232,240,0.3)", letterSpacing: "0.1em" }}>SOPHISTICATION TIER {selected.sophistication}/5</span>
              </div>
              <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                {selected.motivation.map(m => <Tag key={m} label={m} color={SPONSOR_COLOR[selected.sponsor] ?? selected.color} />)}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

              {/* aliases */}
              <Section label="All Known Aliases" color="#63b3ed">
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                  {selected.aliases.map(a => (
                    <span key={a} style={{
                      fontSize: 9, padding: "2px 7px", borderRadius: 3,
                      background: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.12)",
                      color: "rgba(226,232,240,0.55)", letterSpacing: "0.04em",
                    }}>{a}</span>
                  ))}
                </div>
              </Section>

              {/* target sectors */}
              <Section label="Primary Target Sectors" color="#f59e0b">
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                  {selected.primaryTargets.map(t => <Tag key={t} label={t} color="#f59e0b" />)}
                </div>
              </Section>

              {/* regions */}
              <Section label="Active Regions" color="#38bdf8">
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                  {selected.regions.map(r => <Tag key={r} label={r} color="#38bdf8" />)}
                </div>
              </Section>

              {/* malware families */}
              <Section label="Malware Families" color="#ef4444">
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                  {selected.malwareFamilies.map(m => (
                    <span key={m} style={{
                      fontSize: 9, padding: "2px 7px", borderRadius: 3,
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
                      color: "#ef4444", letterSpacing: "0.05em",
                      fontFamily: "'JetBrains Mono',monospace",
                    }}>{m}</span>
                  ))}
                </div>
              </Section>

              {/* CVEs */}
              {selected.recentCVEs.length > 0 && (
                <Section label="Exploited CVEs" color="#f97316">
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                    {selected.recentCVEs.map(cve => (
                      <a
                        key={cve}
                        href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 3,
                          background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)",
                          color: "#f97316", letterSpacing: "0.05em", textDecoration: "none",
                          fontFamily: "'JetBrains Mono',monospace",
                          display: "flex", alignItems: "center", gap: 3,
                        }}
                      >
                        {cve} <ExternalLink size={7} />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* MITRE ATT&CK TTPs */}
              <Section label="MITRE ATT&CK Techniques" color="#a855f7">
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                  {selected.ttps.map(t => (
                    <a
                      key={t}
                      href={`https://attack.mitre.org/techniques/${t.replace(".", "/")}/`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        fontSize: 9, padding: "2px 7px", borderRadius: 3,
                        background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)",
                        color: "#a855f7", letterSpacing: "0.05em", textDecoration: "none",
                        fontFamily: "'JetBrains Mono',monospace",
                        display: "flex", alignItems: "center", gap: 3,
                      }}
                    >
                      {t} <ExternalLink size={7} />
                    </a>
                  ))}
                </div>
              </Section>

              {/* Operations timeline */}
              <Section label="Operations Timeline" color="#10b981">
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {selected.recentOps.map((op, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 8, alignItems: "flex-start",
                      paddingLeft: 10,
                      borderLeft: `2px solid ${confColor(op.confidence)}30`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{
                            fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
                            color: "rgba(226,232,240,0.3)",
                          }}>{op.date}</span>
                          <ConfBadge c={op.confidence} />
                        </div>
                        <span style={{ fontSize: 10, color: "rgba(226,232,240,0.7)", lineHeight: 1.4 }}>{op.op}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Live IOC correlation */}
              {(iocMap[selected.id] ?? 0) > 0 && (
                <Section label="Live Feed Correlation" color="#ef4444">
                  <div style={{
                    padding: "8px 10px", borderRadius: 5,
                    background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                  }}>
                    <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
                      ⚡ {iocMap[selected.id]} live event{(iocMap[selected.id] ?? 0) > 1 ? "s" : ""} matched
                    </span>
                    <div style={{ fontSize: 8, color: "rgba(226,232,240,0.3)", marginTop: 3 }}>
                      Correlated via actor name, aliases, and malware family from live feed
                    </div>
                  </div>
                </Section>
              )}

              {/* MITRE link */}
              <a
                href={`https://attack.mitre.org/groups/`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 5, marginTop: 8,
                  fontSize: 9, color: "rgba(99,179,237,0.4)", textDecoration: "none",
                  letterSpacing: "0.08em",
                }}
              >
                <Activity size={10} /> View on MITRE ATT&CK <ExternalLink size={8} />
              </a>

              {/* ── IOC Panel ── */}
              <IocPanel aptId={selected.id} events={events} color={SPONSOR_COLOR[selected.sponsor] ?? selected.color} />

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section helper ───────────────────────────────────────────────────────────

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 8, fontWeight: 800, letterSpacing: "0.14em",
        color, textTransform: "uppercase" as const,
        marginBottom: 6, paddingBottom: 4,
        borderBottom: `1px solid ${color}18`,
      }}>{label}</div>
      {children}
    </div>
  );
}

// ─── IOC types ───────────────────────────────────────────────────────────────

interface AptIoc {
  id: string;
  type: "ip" | "domain" | "url" | "hash" | "unknown";
  value: string;
  malware: string;
  confidence: number;
  firstSeen: string | null;
  source: string;
  sourceUrl: string | null;
  reference: string | null;
  tags: string[];
  liveMatch?: boolean;
}

interface IocApiResponse {
  iocs: AptIoc[];
  source: string;
  count: number;
  fetchedAt?: number;
  cachedAt?: number;
}

const IOC_TYPE_COLOR: Record<string, string> = {
  ip:      "#ff4444",
  domain:  "#ffaa00",
  url:     "#ff8800",
  hash:    "#b44fff",
  unknown: "#64748b",
};

const IOC_TABS = ["all", "ip", "domain", "hash", "url"] as const;
type IocTab = typeof IOC_TABS[number];

function IocPanel({ aptId, events, color }: { aptId: string; events: CyberEvent[]; color: string }) {
  const [tab, setTab]       = useState<IocTab>("all");
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading, isError, dataUpdatedAt, refetch } = useQuery<IocApiResponse>({
    queryKey: ["/api/apt/iocs", aptId],
    queryFn: async () => {
      const r = await fetch(`/api/apt/${aptId}/iocs`);
      if (!r.ok) throw new Error("IOC fetch failed");
      return r.json() as Promise<IocApiResponse>;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
    retry: 2,
  });

  const iocs = data?.iocs ?? [];

  const tabCounts = {
    all:    iocs.length,
    ip:     iocs.filter(i => i.type === "ip").length,
    domain: iocs.filter(i => i.type === "domain").length,
    hash:   iocs.filter(i => i.type === "hash").length,
    url:    iocs.filter(i => i.type === "url").length,
  };

  const visible = tab === "all" ? iocs : iocs.filter(i => i.type === tab);

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(value);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function downloadCsv() {
    const rows = [
      ["type","value","malware","confidence","firstSeen","source","sourceUrl","liveMatch"],
      ...iocs.map(i => [
        i.type, i.value, i.malware, String(i.confidence),
        i.firstSeen ?? "", i.source, i.sourceUrl ?? "", i.liveMatch ? "true" : "false",
      ]),
    ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${aptId}-iocs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(iocs, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${aptId}-iocs-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  const fetchedLabel = dataUpdatedAt
    ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`
    : "";

  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      {/* Section header + download buttons */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8, paddingBottom: 4,
        borderBottom: `1px solid ${color}25`,
      }}>
        <div style={{
          fontSize: 8, fontWeight: 800, letterSpacing: "0.14em",
          color, textTransform: "uppercase" as const,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          Indicators of Compromise
          {iocs.length > 0 && (
            <span style={{
              fontSize: 7, padding: "1px 5px", borderRadius: 2,
              background: `${color}18`, border: `1px solid ${color}30`,
              color, fontVariantNumeric: "tabular-nums",
            }}>{iocs.length}</span>
          )}
          {data?.source === "live" && (
            <span style={{
              fontSize: 7, padding: "1px 5px", borderRadius: 2,
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
              color: "#10b981",
            }}>● LIVE</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {fetchedLabel && (
            <span style={{ fontSize: 7, color: "rgba(226,232,240,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>
              {fetchedLabel}
            </span>
          )}
          {iocs.length > 0 && (
            <>
              <button
                onClick={downloadCsv}
                title="Download CSV"
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  padding: "3px 7px", borderRadius: 4,
                  background: `${color}10`, border: `1px solid ${color}30`,
                  color, cursor: "pointer", fontSize: 8, fontWeight: 700,
                  fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.08em",
                }}
              >
                <Download size={9} /> CSV
              </button>
              <button
                onClick={downloadJson}
                title="Download JSON"
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  padding: "3px 7px", borderRadius: 4,
                  background: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.15)",
                  color: "rgba(99,179,237,0.7)", cursor: "pointer", fontSize: 8, fontWeight: 700,
                  fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.08em",
                }}
              >
                <Download size={9} /> JSON
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
        {IOC_TABS.map(t => {
          const cnt = tabCounts[t];
          const on  = tab === t;
          const tc  = t === "all" ? color : (IOC_TYPE_COLOR[t] ?? color);
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "2px 8px", borderRadius: 3,
              border: `1px solid ${on ? tc + "40" : "rgba(99,179,237,0.08)"}`,
              background: on ? `${tc}12` : "transparent",
              color: on ? tc : "rgba(226,232,240,0.3)",
              cursor: cnt === 0 && t !== "all" ? "default" : "pointer",
              fontSize: 8, fontWeight: 800, letterSpacing: "0.1em",
              fontFamily: "'Rajdhani',sans-serif", textTransform: "uppercase" as const,
              opacity: cnt === 0 && t !== "all" ? 0.4 : 1,
            }}>
              {t}{cnt > 0 ? ` · ${cnt}` : ""}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{
          padding: "14px 10px", textAlign: "center" as const,
          color: "rgba(226,232,240,0.2)", fontSize: 9,
          fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em",
        }}>Fetching IOCs from ThreatFox + live feed…</div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div style={{
          padding: "10px", borderRadius: 5,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
          color: "rgba(239,68,68,0.6)", fontSize: 9,
        }}>Failed to fetch IOCs. <button onClick={() => refetch()} style={{ background: "none", border: "none", color: "#63b3ed", cursor: "pointer", fontSize: 9 }}>Retry</button></div>
      )}

      {/* Empty */}
      {!isLoading && !isError && iocs.length === 0 && (
        <div style={{
          padding: "12px 10px", textAlign: "center" as const,
          color: "rgba(226,232,240,0.18)", fontSize: 9,
          fontFamily: "'JetBrains Mono',monospace",
        }}>No IOCs found in ThreatFox or live feeds for this actor.</div>
      )}

      {/* IOC list */}
      {visible.length > 0 && (
        <div style={{
          maxHeight: 280, overflowY: "auto",
          display: "flex", flexDirection: "column" as const, gap: 2,
        }}>
          {visible.slice(0, 150).map((ioc, idx) => {
            const tc = IOC_TYPE_COLOR[ioc.type] ?? "#64748b";
            const isCopied = copied === ioc.value;
            return (
              <div key={ioc.id + idx} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 6px", borderRadius: 4,
                background: ioc.liveMatch
                  ? "rgba(16,185,129,0.04)"
                  : "rgba(99,179,237,0.02)",
                border: ioc.liveMatch
                  ? "1px solid rgba(16,185,129,0.12)"
                  : "1px solid rgba(99,179,237,0.05)",
              }}>
                {/* Type badge */}
                <span style={{
                  fontSize: 6.5, fontWeight: 800, letterSpacing: "0.1em",
                  padding: "1px 4px", borderRadius: 2,
                  background: `${tc}18`, border: `1px solid ${tc}30`,
                  color: tc, textTransform: "uppercase" as const,
                  flexShrink: 0, minWidth: 38, textAlign: "center" as const,
                }}>{ioc.type}</span>

                {/* IOC value */}
                <span style={{
                  flex: 1, fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 9, color: "rgba(226,232,240,0.75)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                  minWidth: 0,
                }} title={ioc.value}>{ioc.value}</span>

                {/* Source */}
                <span style={{
                  fontSize: 7, color: ioc.liveMatch ? "#10b981" : "rgba(99,179,237,0.35)",
                  fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
                  letterSpacing: "0.04em",
                }}>{ioc.liveMatch ? "LIVE" : "ThreatFox"}</span>

                {/* Confidence */}
                <span style={{
                  fontSize: 7, color: "rgba(226,232,240,0.25)",
                  fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
                }}>{ioc.confidence}%</span>

                {/* Copy button */}
                <button
                  onClick={() => copyToClipboard(ioc.value)}
                  title="Copy"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: isCopied ? "#10b981" : "rgba(226,232,240,0.2)",
                    padding: 2, flexShrink: 0, display: "flex", alignItems: "center",
                    transition: "color 0.2s",
                  }}
                >
                  {isCopied ? <Check size={10} /> : <Copy size={10} />}
                </button>

                {/* External link */}
                {ioc.sourceUrl && (
                  <a
                    href={ioc.sourceUrl}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: "rgba(99,179,237,0.2)", flexShrink: 0, display: "flex", alignItems: "center" }}
                  >
                    <ExternalLink size={9} />
                  </a>
                )}
              </div>
            );
          })}
          {visible.length > 150 && (
            <div style={{ fontSize: 8, color: "rgba(226,232,240,0.2)", textAlign: "center" as const, padding: "4px 0" }}>
              +{visible.length - 150} more · download for full list
            </div>
          )}
        </div>
      )}
    </div>
  );
}
