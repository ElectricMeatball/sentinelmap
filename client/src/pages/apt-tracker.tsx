import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CyberEvent } from "@shared/schema";
import { Crosshair, ExternalLink } from "lucide-react";

interface APTGroup {
  id: string;
  name: string;
  aliases: string[];
  sponsor: string;
  sponsorCode: string;
  sponsorFlag: string;
  active: boolean;
  since: string;
  sectors: string[];
  targets: string[];
  techniques: string[];
  malwareFamilies: string[];
  color: string;
  threatLevel: 1 | 2 | 3 | 4 | 5;
  description: string;
  sourceUrl: string;
}

const APT_GROUPS: APTGroup[] = [
  {
    id: "apt28",
    name: "APT28",
    aliases: ["Fancy Bear", "Sofacy", "Sednit", "STRONTIUM"],
    sponsor: "Russia",
    sponsorCode: "RU",
    sponsorFlag: "🇷🇺",
    active: true,
    since: "2004",
    sectors: ["Government", "Military", "Defence", "Media", "Energy"],
    targets: ["USA", "Ukraine", "Germany", "France", "NATO Members"],
    techniques: ["T1566", "T1071", "T1059", "T1078", "T1190"],
    malwareFamilies: ["X-Agent", "Sofacy", "Zebrocy", "CHOPSTICK"],
    color: "#ef4444",
    threatLevel: 5,
    description:
      "Russian GRU-linked group conducting cyber espionage against government, military, and political targets globally since 2004.",
    sourceUrl: "https://attack.mitre.org/groups/G0007/",
  },
  {
    id: "apt29",
    name: "APT29",
    aliases: ["Cozy Bear", "The Dukes", "NOBELIUM", "Midnight Blizzard"],
    sponsor: "Russia",
    sponsorCode: "RU",
    sponsorFlag: "🇷🇺",
    active: true,
    since: "2008",
    sectors: ["Government", "Healthcare", "Technology", "Finance", "Think Tanks"],
    targets: ["USA", "UK", "EU", "NATO", "Ukraine"],
    techniques: ["T1566", "T1195", "T1071", "T1486", "T1027"],
    malwareFamilies: ["MiniDuke", "CozyDuke", "SUNBURST", "NOBELIUM"],
    color: "#ef4444",
    threatLevel: 5,
    description:
      "Russian SVR-linked group behind SolarWinds supply chain attack. Targets government and critical infrastructure for long-term espionage.",
    sourceUrl: "https://attack.mitre.org/groups/G0016/",
  },
  {
    id: "lazarus",
    name: "Lazarus Group",
    aliases: ["HIDDEN COBRA", "Guardians of Peace", "ZINC", "Labyrinth Chollima"],
    sponsor: "North Korea",
    sponsorCode: "KP",
    sponsorFlag: "🇰🇵",
    active: true,
    since: "2009",
    sectors: ["Finance", "Cryptocurrency", "Defence", "Media", "Healthcare"],
    targets: ["USA", "South Korea", "Japan", "Global Crypto Exchanges"],
    techniques: ["T1566", "T1059", "T1486", "T1190", "T1055"],
    malwareFamilies: ["WannaCry", "BLINDINGCAN", "HOPLIGHT", "AppleJeus"],
    color: "#f59e0b",
    threatLevel: 5,
    description:
      "DPRK state-sponsored group conducting financially motivated attacks and espionage. Responsible for WannaCry and $billions in crypto theft.",
    sourceUrl: "https://attack.mitre.org/groups/G0032/",
  },
  {
    id: "apt41",
    name: "APT41",
    aliases: ["Double Dragon", "Winnti", "Barium", "WICKED SPIDER"],
    sponsor: "China",
    sponsorCode: "CN",
    sponsorFlag: "🇨🇳",
    active: true,
    since: "2012",
    sectors: ["Healthcare", "Technology", "Telecom", "Gaming", "Finance"],
    targets: ["USA", "UK", "Japan", "India", "South Korea"],
    techniques: ["T1190", "T1059", "T1027", "T1078", "T1486"],
    malwareFamilies: ["ShadowPad", "PlugX", "Winnti", "CROSSWALK"],
    color: "#38bdf8",
    threatLevel: 5,
    description:
      "MSS-linked group conducting both espionage and financially motivated attacks. Unique in combining state-sponsored and criminal activity.",
    sourceUrl: "https://attack.mitre.org/groups/G0096/",
  },
  {
    id: "apt40",
    name: "APT40",
    aliases: ["BRONZE MOHAWK", "GADOLINIUM", "Kryptonite Panda"],
    sponsor: "China",
    sponsorCode: "CN",
    sponsorFlag: "🇨🇳",
    active: true,
    since: "2013",
    sectors: ["Maritime", "Defence", "Aviation", "Government", "Research"],
    targets: ["USA", "UK", "Germany", "Australia", "Maritime Industry"],
    techniques: ["T1566", "T1190", "T1133", "T1078", "T1059"],
    malwareFamilies: ["BADFLICK", "PHOTO", "HOMEFRY", "LUNCHMONEY"],
    color: "#38bdf8",
    threatLevel: 4,
    description:
      "MSS Hainan-linked group focusing on maritime, defence, and aviation targets. Active in Belt and Road Initiative regions.",
    sourceUrl: "https://attack.mitre.org/groups/G0065/",
  },
  {
    id: "kimsuky",
    name: "Kimsuky",
    aliases: ["Black Banshee", "Thallium", "Velvet Chollima"],
    sponsor: "North Korea",
    sponsorCode: "KP",
    sponsorFlag: "🇰🇵",
    active: true,
    since: "2012",
    sectors: ["Government", "Think Tanks", "Nuclear", "Defence", "Research"],
    targets: ["South Korea", "USA", "Japan", "Russia", "Europe"],
    techniques: ["T1566", "T1059", "T1071", "T1078", "T1136"],
    malwareFamilies: ["BabyShark", "KONNI", "AppleSeed", "DROPPED"],
    color: "#f59e0b",
    threatLevel: 4,
    description:
      "DPRK intelligence-linked group targeting foreign policy experts, Korean unification researchers, and nuclear programme information.",
    sourceUrl: "https://attack.mitre.org/groups/G0094/",
  },
  {
    id: "sandworm",
    name: "Sandworm",
    aliases: ["VOODOO BEAR", "BlackEnergy", "ELECTRUM", "Seashell Blizzard"],
    sponsor: "Russia",
    sponsorCode: "RU",
    sponsorFlag: "🇷🇺",
    active: true,
    since: "2009",
    sectors: ["Energy", "Government", "Critical Infrastructure", "Media"],
    targets: ["Ukraine", "USA", "EU", "NATO"],
    techniques: ["T1486", "T1561", "T1059", "T1190", "T1499"],
    malwareFamilies: ["BlackEnergy", "Industroyer", "NotPetya", "WhisperGate"],
    color: "#ef4444",
    threatLevel: 5,
    description:
      "GRU Unit 74455. Responsible for the most destructive cyberattacks in history including NotPetya and Ukrainian power grid attacks.",
    sourceUrl: "https://attack.mitre.org/groups/G0034/",
  },
  {
    id: "charcoal-typhoon",
    name: "Charcoal Typhoon",
    aliases: ["CHROMIUM", "ControlX"],
    sponsor: "China",
    sponsorCode: "CN",
    sponsorFlag: "🇨🇳",
    active: true,
    since: "2021",
    sectors: ["Government", "Technology", "Telecom"],
    targets: ["Taiwan", "USA", "Southeast Asia"],
    techniques: ["T1190", "T1133", "T1059", "T1071"],
    malwareFamilies: ["CobaltStrike", "ShadowPad"],
    color: "#38bdf8",
    threatLevel: 4,
    description:
      "China-nexus group targeting government and technology sectors in Taiwan and Southeast Asia.",
    sourceUrl:
      "https://www.microsoft.com/en-us/security/blog/tag/threat-intelligence/",
  },
  {
    id: "muddywater",
    name: "MuddyWater",
    aliases: ["MERCURY", "Static Kitten", "Seedworm"],
    sponsor: "Iran",
    sponsorCode: "IR",
    sponsorFlag: "🇮🇷",
    active: true,
    since: "2017",
    sectors: ["Government", "Telecom", "Defence", "Oil & Gas"],
    targets: ["Middle East", "Turkey", "Pakistan", "Europe"],
    techniques: ["T1566", "T1059", "T1078", "T1071", "T1027"],
    malwareFamilies: ["POWERSTATS", "Mori", "EVILNUM", "SloughRAT"],
    color: "#10b981",
    threatLevel: 4,
    description:
      "MOIS-linked group conducting cyber espionage against Middle Eastern governments and telecoms.",
    sourceUrl: "https://attack.mitre.org/groups/G0069/",
  },
  {
    id: "apt33",
    name: "APT33",
    aliases: ["Elfin", "HOLMIUM", "Refined Kitten"],
    sponsor: "Iran",
    sponsorCode: "IR",
    sponsorFlag: "🇮🇷",
    active: true,
    since: "2013",
    sectors: ["Aerospace", "Energy", "Petrochemical", "Defence"],
    targets: ["Saudi Arabia", "USA", "South Korea", "UAE"],
    techniques: ["T1566", "T1078", "T1059", "T1486", "T1190"],
    malwareFamilies: ["DROPSHOT", "SHAPESHIFT", "TURNEDUP", "DistTrack"],
    color: "#10b981",
    threatLevel: 4,
    description:
      "IRGC-linked group targeting aviation, petrochemical, and energy sectors. Known for destructive wiper attacks.",
    sourceUrl: "https://attack.mitre.org/groups/G0064/",
  },
];

const SPONSOR_COLORS: Record<string, string> = {
  Russia: "#ef4444",
  China: "#38bdf8",
  "North Korea": "#f59e0b",
  Iran: "#10b981",
};

const THREAT_LABELS = ["", "LOW", "MODERATE", "ELEVATED", "HIGH", "CRITICAL"];

export default function APTTracker() {
  const [selectedGroup, setSelectedGroup] = useState<APTGroup | null>(null);
  const [filterSponsor, setFilterSponsor] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data } = useQuery<{ events: CyberEvent[] }>({
    queryKey: ["/api/threats/live"],
    refetchInterval: 5 * 60 * 1000,
  });
  const events = data?.events || [];

  const filtered = useMemo(() => {
    return APT_GROUPS.filter((g) => {
      if (filterSponsor && g.sponsor !== filterSponsor) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          g.name.toLowerCase().includes(s) ||
          g.aliases.some((a) => a.toLowerCase().includes(s)) ||
          g.malwareFamilies.some((m) => m.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [filterSponsor, search]);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of APT_GROUPS) {
      counts[g.id] = events.filter((e) =>
        g.malwareFamilies.some((mf) =>
          e.malwareFamily?.toLowerCase().includes(mf.toLowerCase())
        )
      ).length;
    }
    return counts;
  }, [events]);

  const sponsors = Array.from(new Set(APT_GROUPS.map((g) => g.sponsor)));

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#050a14",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Rajdhani', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          height: "48px",
          background: "rgba(6,11,20,0.95)",
          borderBottom: "1px solid rgba(99,179,237,0.15)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <a
          href="/"
          style={{
            color: "rgba(99,179,237,0.5)",
            textDecoration: "none",
            fontSize: "11px",
            letterSpacing: "0.12em",
          }}
        >
          ← SENTINEL-MAP
        </a>
        <div
          style={{
            width: "1px",
            height: "20px",
            background: "rgba(99,179,237,0.15)",
          }}
        />
        <Crosshair size={14} style={{ color: "#38bdf8" }} />
        <div
          style={{
            fontSize: "14px",
            fontWeight: 800,
            letterSpacing: "0.18em",
            color: "#e2e8f0",
            textTransform: "uppercase",
          }}
        >
          NATION-STATE APT TRACKER
        </div>
        <div
          style={{
            padding: "2px 8px",
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.2)",
            borderRadius: "4px",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#38bdf8",
          }}
        >
          {APT_GROUPS.filter((g) => g.active).length} ACTIVE GROUPS
        </div>

        {/* Sponsor filter pills */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: "6px",
            alignItems: "center",
          }}
        >
          {sponsors.map((s) => (
            <button
              key={s}
              onClick={() =>
                setFilterSponsor(filterSponsor === s ? null : s)
              }
              style={{
                padding: "3px 10px",
                borderRadius: "4px",
                border: `1px solid ${
                  SPONSOR_COLORS[s] || "#63b3ed"
                }${filterSponsor === s ? "" : "40"}`,
                background:
                  filterSponsor === s
                    ? `${SPONSOR_COLORS[s]}20`
                    : "transparent",
                color:
                  filterSponsor === s
                    ? SPONSOR_COLORS[s]
                    : "rgba(226,232,240,0.4)",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                fontFamily: "'Rajdhani', sans-serif",
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            style={{
              background: "rgba(6,11,20,0.8)",
              border: "1px solid rgba(99,179,237,0.15)",
              borderRadius: "6px",
              padding: "4px 10px",
              color: "#e2e8f0",
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
              outline: "none",
              width: "160px",
            }}
          />
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* APT Group list */}
        <div
          style={{
            width: selectedGroup ? "420px" : "100%",
            flexShrink: 0,
            overflowY: "auto",
            padding: "16px",
            display: "grid",
            gridTemplateColumns: selectedGroup
              ? "1fr"
              : "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "12px",
            alignContent: "start",
          }}
        >
          {filtered.map((group) => (
            <div
              key={group.id}
              onClick={() =>
                setSelectedGroup(
                  selectedGroup?.id === group.id ? null : group
                )
              }
              style={{
                background:
                  selectedGroup?.id === group.id
                    ? `${group.color}08`
                    : "rgba(6,11,20,0.7)",
                border: `1px solid ${
                  selectedGroup?.id === group.id
                    ? group.color + "40"
                    : "rgba(99,179,237,0.1)"
                }`,
                borderRadius: "10px",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow:
                  selectedGroup?.id === group.id
                    ? `0 0 20px ${group.color}15`
                    : "none",
              }}
            >
              {/* Card header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                <div style={{ fontSize: "28px", lineHeight: 1 }}>
                  {group.sponsorFlag}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "3px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 800,
                        color: group.color,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {group.name}
                    </span>
                    {group.active && (
                      <span
                        style={{
                          padding: "1px 6px",
                          background: "rgba(16,185,129,0.12)",
                          border: "1px solid rgba(16,185,129,0.25)",
                          borderRadius: "3px",
                          fontSize: "8px",
                          color: "#10b981",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                    {eventCounts[group.id] > 0 && (
                      <span
                        style={{
                          padding: "1px 6px",
                          background: `${group.color}15`,
                          border: `1px solid ${group.color}30`,
                          borderRadius: "3px",
                          fontSize: "8px",
                          color: group.color,
                          fontWeight: 700,
                        }}
                      >
                        {eventCounts[group.id]} LIVE IOCs
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "rgba(226,232,240,0.35)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {group.aliases.slice(0, 3).join(" · ")}
                  </div>
                </div>
                {/* Threat level dots */}
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "9px",
                      color: "rgba(226,232,240,0.3)",
                      letterSpacing: "0.1em",
                      marginBottom: "4px",
                    }}
                  >
                    THREAT
                  </div>
                  <div style={{ display: "flex", gap: "2px" }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "2px",
                          background:
                            i <= group.threatLevel
                              ? group.color
                              : "rgba(99,179,237,0.1)",
                          boxShadow:
                            i <= group.threatLevel
                              ? `0 0 4px ${group.color}`
                              : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(226,232,240,0.45)",
                  lineHeight: 1.5,
                  marginBottom: "10px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {group.description}
              </p>

              {/* Sector tags */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  marginBottom: "8px",
                }}
              >
                {group.sectors.map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: "2px 7px",
                      background: "rgba(99,179,237,0.06)",
                      border: "1px solid rgba(99,179,237,0.12)",
                      borderRadius: "4px",
                      fontSize: "9px",
                      color: "rgba(99,179,237,0.6)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>

              {/* Malware families */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {group.malwareFamilies.map((m) => (
                  <span
                    key={m}
                    style={{
                      padding: "2px 7px",
                      background: `${group.color}10`,
                      border: `1px solid ${group.color}25`,
                      borderRadius: "4px",
                      fontSize: "9px",
                      color: group.color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "10px",
                  paddingTop: "8px",
                  borderTop: "1px solid rgba(99,179,237,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: "rgba(226,232,240,0.25)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  Since {group.since} · {group.sponsor}
                </div>
                <a
                  href={group.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: "9px",
                    color: "rgba(99,179,237,0.4)",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    textDecoration: "none",
                  }}
                >
                  MITRE ATT&amp;CK <ExternalLink size={9} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* ── Detail panel ── */}
        {selectedGroup && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              borderLeft: "1px solid rgba(99,179,237,0.1)",
              padding: "20px",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: selectedGroup.color,
                  letterSpacing: "0.1em",
                }}
              >
                {selectedGroup.name}
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(226,232,240,0.3)",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Stats grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {[
                {
                  label: "SPONSOR",
                  value: `${selectedGroup.sponsorFlag} ${selectedGroup.sponsor}`,
                },
                { label: "ACTIVE SINCE", value: selectedGroup.since },
                {
                  label: "THREAT LEVEL",
                  value: THREAT_LABELS[selectedGroup.threatLevel],
                },
                {
                  label: "LIVE IOCs",
                  value: String(eventCounts[selectedGroup.id] || 0),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "rgba(6,11,20,0.8)",
                    border: "1px solid rgba(99,179,237,0.1)",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "8px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      color: "rgba(99,179,237,0.4)",
                      marginBottom: "4px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#e2e8f0",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Aliases */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "rgba(99,179,237,0.4)",
                  marginBottom: "8px",
                }}
              >
                KNOWN ALIASES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {selectedGroup.aliases.map((a) => (
                  <span
                    key={a}
                    style={{
                      padding: "3px 8px",
                      background: "rgba(99,179,237,0.06)",
                      border: "1px solid rgba(99,179,237,0.15)",
                      borderRadius: "4px",
                      fontSize: "10px",
                      color: "rgba(226,232,240,0.6)",
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Target countries */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "rgba(99,179,237,0.4)",
                  marginBottom: "8px",
                }}
              >
                TARGET COUNTRIES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {selectedGroup.targets.map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: "3px 8px",
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      borderRadius: "4px",
                      fontSize: "10px",
                      color: "rgba(226,232,240,0.6)",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* ATT&CK techniques */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "rgba(99,179,237,0.4)",
                  marginBottom: "8px",
                }}
              >
                MITRE ATT&amp;CK TECHNIQUES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {selectedGroup.techniques.map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: "3px 8px",
                      background: `${selectedGroup.color}10`,
                      border: `1px solid ${selectedGroup.color}25`,
                      borderRadius: "4px",
                      fontSize: "10px",
                      color: selectedGroup.color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Correlated live events */}
            {eventCounts[selectedGroup.id] > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: "rgba(99,179,237,0.4)",
                    marginBottom: "8px",
                  }}
                >
                  CORRELATED LIVE EVENTS
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {events
                    .filter((e) =>
                      selectedGroup.malwareFamilies.some((mf) =>
                        e.malwareFamily
                          ?.toLowerCase()
                          .includes(mf.toLowerCase())
                      )
                    )
                    .slice(0, 5)
                    .map((e) => (
                      <div
                        key={e.id}
                        style={{
                          background: "rgba(6,11,20,0.8)",
                          border: `1px solid ${selectedGroup.color}20`,
                          borderRadius: "6px",
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "3px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              fontFamily: "'JetBrains Mono', monospace",
                              color: selectedGroup.color,
                            }}
                          >
                            {e.indicator}
                          </span>
                          <span
                            style={{
                              fontSize: "9px",
                              color: "rgba(226,232,240,0.3)",
                            }}
                          >
                            {e.srcCountry} → {e.dstCountry}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "9px",
                            color: "rgba(226,232,240,0.35)",
                          }}
                        >
                          {e.malwareFamily} · {e.source}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
