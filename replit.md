# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

### مرشح | Mershhah (`artifacts/mershhah`)
- **Kind**: web (Vite + React)
- **Preview path**: `/`
- **Stack**: React 18, Vite 7, Tailwind CSS v4, Wouter (routing), Firebase (auth + Firestore + Storage), TanStack Query
- **Description**: SaaS restaurant management platform for Saudi restaurants. Features: digital menu, AI chat assistant, owner dashboard, admin panel, public pages.
- **Migrated from**: Next.js 15 App Router
- **Key files**:
  - `src/App.tsx` — main router (Wouter Switch/Route tree)
  - `src/lib/navigation.ts` — Next.js navigation compatibility shim (useRouter, usePathname, useSearchParams, notFound)
  - `src/lib/firebase.ts` — Firebase client config (hardcoded fallback values)
  - `src/lib/firebase-admin.ts` — stubbed (returns null, admin SDK is server-only)
  - `src/ai/genkit.ts` — stubbed (AI flows now call API server via fetch)
  - `src/ai/flows/` — all AI flows stubbed as browser-safe fetch wrappers to `/api/ai/*`
  - `src/index.css` — CSS theme with correct HSL values from original globals.css
  - `src/app/` — all Next.js app router pages (ported to work as React components)

### API Server (`artifacts/api-server`)
- **Kind**: api (Express)
- **Status**: Not yet started (needs AI flow endpoints if needed)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mershhah run dev` — run Mershhah web app locally

## Migration Notes (Next.js → Vite + React)

- All `next/link` → `import { Link } from 'wouter'`
- All `next/image` → `<img>` tags
- All `next/navigation` → `@/lib/navigation` shim
- All `next/router` → `@/lib/navigation` shim
- All genkit AI flows → browser-safe stubs calling `/api/ai/*` endpoints
- `firebase-admin` → stubbed (null exports, client can't use server SDK)
- `'use server'` directives → removed (server actions don't exist in Vite)
- `export const metadata` → removed (Next.js App Router feature)
- `process.env.NEXT_PUBLIC_*` → `import.meta.env.VITE_*`
- Firebase config has hardcoded fallback values in `src/lib/firebase.ts`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
