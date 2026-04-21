# AEROGUARD — THREATMAP

## Overview

AEROGUARD is a cinematic cybersecurity threat map visualization application. It displays a global dot-matrix world map with real-time cyber attack events from ThreatFox API, showing geolocated attack arcs with particle trails, expanding impact shockwaves, and heat glow zones. Features CRT scanline overlay, ambient background pulse, animated rolling counters, sparkline charts, category filters, click-to-inspect detail drawer, fullscreen mode, keyboard shortcuts (Space/F/M/Escape), and optional audio pings. Real threat intelligence data is enriched with IP geolocation via ip-api.com.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with CSS variables for theming, using shadcn/ui component library (new-york style)
- **Fonts**: Geist, Geist Mono, and Oxanium (futuristic/military aesthetic)
- **Build Tool**: Vite
- **UI Components**: Full shadcn/ui component suite with Radix UI primitives
- **Map Rendering**: Custom SVG dot-matrix world map (`world-map-dots.ts` contains coordinate data for rendering continents as dot grids)

The main page is `threat-map.tsx` which renders the cyber threat visualization. The app generates simulated threat events with source/destination coordinates mapped to countries, attack categories, severity levels, and MITRE ATT&CK-style technique labels.

### Backend
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, executed via `tsx`
- **API Pattern**: REST API under `/api` prefix
- **IP Geolocation**: Uses `ip-api.com` free API for resolving IP addresses to geographic coordinates, with an in-memory cache
- **Development**: Vite dev server middleware for HMR in development mode
- **Production**: Static file serving from built `dist/public` directory

### Data Storage
- **Schema**: Drizzle ORM with PostgreSQL dialect
- **Current Storage**: In-memory storage (`MemStorage` class) for users — the database schema is defined but the app primarily uses memory storage
- **Schema Definition**: `shared/schema.ts` defines a `users` table with id, username, and password fields
- **Migrations**: Drizzle Kit configured to output to `./migrations` directory
- **Database Push**: `npm run db:push` to sync schema to database

The application currently uses `MemStorage` as its storage implementation. The PostgreSQL schema exists and Drizzle is configured, but the threat data is generated client-side or via simulated server endpoints rather than stored in the database.

### Build System
- **Client Build**: Vite builds to `dist/public`
- **Server Build**: esbuild bundles the server to `dist/index.cjs` with selective dependency bundling (allowlisted deps get bundled for faster cold starts)
- **Development**: `npm run dev` starts the server with Vite middleware for HMR
- **Production**: `npm run build` then `npm start`

### Key Design Decisions
1. **Simulated threat data**: Attack events are generated programmatically rather than from real threat intelligence feeds, using predefined country coordinates and random attack parameters
2. **Dot-matrix map**: The world map is rendered as a grid of dots rather than using a mapping library, giving a retro-futuristic appearance
3. **Shared schema**: The `shared/` directory contains types and schemas used by both client and server
4. **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`

## External Dependencies

### Database
- **PostgreSQL**: Required via `DATABASE_URL` environment variable. Used with Drizzle ORM for schema management. Currently the app functions with in-memory storage but has PostgreSQL infrastructure ready.

### External APIs
- **ip-api.com**: Free IP geolocation API used server-side to resolve IP addresses to lat/lon coordinates and country names. Results are cached in memory.

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit**: Database ORM and migration tooling
- **express** (v5): HTTP server framework
- **@tanstack/react-query**: Async state management
- **wouter**: Client-side routing
- **zod** + **drizzle-zod**: Schema validation
- **connect-pg-simple**: PostgreSQL session store (available but not actively used)
- **shadcn/ui ecosystem**: Radix UI primitives, class-variance-authority, tailwind-merge, lucide-react icons

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling (dev only)
- **@replit/vite-plugin-dev-banner**: Development banner (dev only)
- **vite-plugin-meta-images**: Custom plugin for OpenGraph meta tag management on Replit deployments