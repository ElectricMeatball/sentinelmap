import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ─────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Threat Event Layer Types ──────────────────────────────────────────────
export const LAYER_TYPES = [
  "malware",
  "c2",
  "phishing",
  "ransomware",
  "botnet",
  "bruteforce",
  "exploit",
  "spam",
  "ddos",
] as const;

export type LayerType = typeof LAYER_TYPES[number];

export const LAYER_META: Record<LayerType, { label: string; color: string; icon: string }> = {
  malware:    { label: "Malware",      color: "#f43f5e", icon: "skull" },
  c2:         { label: "C2 / Botnet",  color: "#e11d48", icon: "server" },
  phishing:   { label: "Phishing",     color: "#f59e0b", icon: "fish" },
  ransomware: { label: "Ransomware",   color: "#a855f7", icon: "lock" },
  botnet:     { label: "Botnet",       color: "#06b6d4", icon: "network" },
  bruteforce: { label: "Brute Force",  color: "#3b82f6", icon: "zap" },
  exploit:    { label: "Exploit",      color: "#10b981", icon: "bug" },
  spam:       { label: "Spam",         color: "#6b7280", icon: "mail" },
  ddos:       { label: "DDoS",         color: "#ef4444", icon: "activity" },
};

// ─── Normalized Cyber Event ────────────────────────────────────────────────
export interface CyberEvent {
  // Identity
  id: string;
  layer: LayerType;

  // Indicator
  indicatorType: "ip" | "domain" | "url" | "hash" | "asn" | "cidr" | "unknown";
  indicator: string;

  // Threat context
  malwareFamily?: string;
  actor?: string;
  campaign?: string;
  cve?: string;
  attackTechnique?: string;    // MITRE ATT&CK ID e.g. "T1059"
  attackTacticName?: string;   // e.g. "Execution"

  // Source provenance
  source: string;              // feed name
  sourceUrl?: string;
  sourceReliability: number;   // 0-100

  // Timestamps
  observedAt: number;          // ms epoch
  ingestedAt: number;          // ms epoch
  publishedAt?: number;

  // Scoring
  confidence: number;          // 0-100
  severity: 1 | 2 | 3 | 4 | 5;
  priorityScore: number;       // 0-100 composite

  // Geography
  srcLat: number;
  srcLon: number;
  srcCountry: string;
  srcCity?: string;
  srcAsn?: string;
  srcOrg?: string;
  dstLat: number;
  dstLon: number;
  dstCountry: string;
  geoConfidence: "high" | "medium" | "low";

  // Targeting
  targetSector?: string;
  targetRegion?: string;

  // Enrichment flags
  aiSummary?: string;
  correlationClusterId?: string;
  relationshipType: "confirmed" | "inferred" | "raw";

  // Raw evidence
  rawData?: Record<string, unknown>;
}

// ─── Feed Status ──────────────────────────────────────────────────────────
export interface FeedStatus {
  id: string;
  name: string;
  url: string;
  status: "live" | "offline" | "loading";
  lastUpdated: number | null;
  count: number;
  layer: LayerType;
  reliability: number; // 0-100
}

// ─── API Response Types ────────────────────────────────────────────────────
export interface LiveThreatsResponse {
  events: CyberEvent[];
  feeds: FeedStatus[];
  lastUpdated: number;
  nextUpdate: number;
  total: number;
}

export interface FeedsStatusResponse {
  feeds: FeedStatus[];
}
