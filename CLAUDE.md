# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sprint activo

Campanha Living Prayer 12-14 Junho 2026 em execução. Para qualquer sessão focada no sprint técnico, ler primeiro `CLAUDE_CODE_SPRINT.md` — contém prompt de arranque, 10 tarefas ordenadas com Definition of Done, pontos cegos P0/P1/P2, smoke test pós-deploy e regras de escalation. Complementa este ficheiro, não substitui.

## Project Overview

"Living Prayer" (Oração Viva) — yoga retreat landing page and digital infrastructure for Pedro Morais, a yoga teacher in Sintra/Ericeira, Portugal. Retreat at Quinta das Broas. Bilingual (PT/EN), contemplative tone, deployed on Vercel.

The repo hosts **two separately deployed apps** plus strategy docs:

1. **Public landing page** (`deploy/`) — single-page site with a serverless application form.
2. **Admin CRM** (`admin/`) — Next.js back office for applications, emails, finance, and settings.

## Repo layout (what is deployed vs. what is source)

- `living-prayer.html` — source/development version of the landing page (~3400 lines, single-file HTML/CSS/JS).
- `deploy/` — production root for the public site on Vercel (project `living-prayer`).
  - `deploy/index.html` — production copy of the landing page. **Manually synced** from `living-prayer.html` — they must stay in sync.
  - `deploy/api/subscribe.js` — serverless function: validates/sanitizes the 2-step application payload, writes to Neon `applications`, sends Resend emails (confirmation + admin notification), handles duplicates/waitlist and honeypot.
  - `deploy/api/form-config.js` — serverless function: returns runtime form/pricing config (tiers, early-bird state, capacity) from Neon so the page hydrates without rebuild.
  - `deploy/img/`, `deploy/fotos/` — production images.
  - `deploy/robots.txt`, `deploy/sitemap.xml` — SEO files.
  - `deploy/package.json` — minimal deps for the two serverless functions (`@neondatabase/serverless`, `resend`).
- `admin/` — Next.js 16 App Router CRM, deployed to Vercel as `living-prayer-admin` (domain `admin.livingprayer.pt`).
- `img/` — source images (optimized JPGs).
- `fotos/` — raw photographer deliverables.
- Strategy/content docs (root): `Plano_Retiro_Pedro_Morais_2026.md`, `PLANO_CAMPANHA_LIVING_PRAYER_JUNHO_2026.md`, `PROMPT_CLAUDE_CODE_BUILD.md`, `GOOGLE_ADS_GUIDE_2026.md`, `email-sequences.md`, `hubspot-setup-guide.md`, `payments-setup-guide.md`, `analytics-setup-guide.md`, `tally-form-config.md`, `living-prayer-campaign-hub.html`.

## Landing page architecture (`deploy/index.html`)

- **Bilingual via `data-lang` on `<html>`** + CSS classes `lang-pt` / `lang-en`. Both languages are present in the same HTML; CSS hides the inactive one. Toggle must persist across reload.
- **2-step application form** → `POST /api/subscribe`. Honeypot field silently accepts and ignores bots. Server enforces: required fields, valid locale (`pt`/`en`), valid tier enum, `consentPrivacy` flag, duplicate detection (case-insensitive email, active statuses only).
- **Form/pricing hydration** → `GET /api/form-config` on page load so prices/tiers/early-bird reflect the Neon `accommodation_capacity` + `admin_config` tables without redeploying.
- **Design tokens (CSS custom properties):** `--bg-warm: #F5F0EB`, `--green: #4A5D4F`, `--brown: #8B7355`, `--white: #FEFCF9`, `--text: #2D2D2D`. Fonts: Cormorant Garamond (serif, headings), Inter (sans, body).
- **JS features:** IntersectionObserver fade-ins, smooth scroll, bio modal, 2-step form, runtime form config hydration, GA4 events, cookie banner, optional Turnstile.
- **Schema.org:** Event + LocalBusiness JSON-LD in `<head>`.

## Admin CRM architecture (`admin/`)

Next.js 16 App Router + React 19 + Tailwind 4 + TypeScript. Single-tenant internal tool for Pedro.

**Key building blocks:**
- `app/(auth)/login` — NextAuth credential login; bcrypt-hashed password in env.
- `app/(admin)/{dashboard,applications,emails,financeiro,settings}` — protected routes. `proxy.ts` (Next middleware equivalent in this repo) gates these prefixes with a NextAuth JWT check and redirects unauthenticated users to `/login` with `callbackUrl`.
- `app/api/cron/process-scheduled-emails` — daily cron (09:00 UTC, configured in `admin/vercel.json`) that drains the `scheduled_emails` queue via Resend.
- `app/api/webhooks/resend` — Svix-verified webhook that updates `email_log.status` (delivered/opened/bounced/failed).
- `lib/db.ts` — Neon serverless client (same DATABASE_URL as the public site).
- `lib/queries.ts` — all read/write SQL lives here; components call server actions in `app/actions.ts`.
- `lib/workflows.ts` — status transitions (received → under_review → accepted/waitlisted → deposit_pending → deposit_paid → fully_paid) and the side effects that follow (schedule onboarding emails, write `status_history` + `activity_log`).
- `lib/email-sender.ts` + `lib/email-templates.tsx` — React Email templates rendered with `@react-email/render` and sent through Resend. Templates are bilingual and driven by `locale` on each application.
- `lib/finance.ts` — projected vs. actual revenue/expense maths; relies on the SQL views `revenue_overview`, `expense_overview`, `financial_overview` defined in `db/schema.sql`.
- `components/kanban-board.tsx` — drag-and-drop (dnd-kit) over the applications list; writes status transitions through server actions, not client-side fetch.

**Domain model essentials (`admin/db/schema.sql`):**
- `applications` — one row per applicant; `status` enum governs the full lifecycle; `attribution` JSONB stores last-touch UTMs; unique partial index prevents duplicate active applications per email but preserves history.
- `email_log` + `scheduled_emails` — all outbound email, past and future. Scheduled rows carry a `dedupe_key` so the cron can't double-send.
- `status_history` + `activity_log` — full audit trail; never delete from these, append only.
- `accommodation_capacity` + `admin_config` — runtime-editable knobs consumed by both apps. Tier prices and deposit amount live here, not in code.
- `expense_items` + `expense_payments` — finance module; `expense_overview` view computes projected/paid/outstanding including threshold-triggered items (e.g. website phase two unlocks at 10 confirmed participants).

Schema is append-only and idempotent (`CREATE ... IF NOT EXISTS`, `ALTER ... ADD COLUMN IF NOT EXISTS`). Apply it to Neon by running the whole file; never edit it destructively.

## Commands

### Admin CRM (`admin/`)
```bash
cd admin
npm run dev         # next dev --webpack, http://localhost:3000
npm run build       # next build --webpack
npm run start       # next start (after build)
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

### Public site (`deploy/`)
No build step — it is static HTML + two serverless functions. Edit `living-prayer.html`, copy to `deploy/index.html`, push, and Vercel deploys. Local preview: open `deploy/index.html` in a browser, or `vercel dev` from `deploy/` to exercise the `/api/*` functions locally (requires `deploy/.env.local` with `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`).

### Database schema
Apply `admin/db/schema.sql` against the Neon DB via the Neon SQL editor or `psql $DATABASE_URL -f admin/db/schema.sql`. The file is safe to re-run.

## Deployment

Two Vercel projects, same repo:
- `living-prayer` — root directory `deploy/`, domain `livingprayer.pt`.
- `living-prayer-admin` — root directory `admin/`, domain `admin.livingprayer.pt`, daily cron configured in `admin/vercel.json`.

**Sync rule (critical):** after editing `living-prayer.html`, copy the changes into `deploy/index.html` in the same commit. The deploy-root is `deploy/`, so changes to `living-prayer.html` alone will not go live.

**Environment variables** (set in Vercel, never committed):
- Shared: `DATABASE_URL` (Neon), `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (default `retreat@livingprayer.pt`).
- Public site only: optional Turnstile keys, GA4 measurement ID, Meta Pixel ID.
- Admin only: `AUTH_SECRET` / `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, admin password hash, Resend webhook signing secret, `CRON_SECRET` for cron auth.

## Content & tone rules (enforced on all user-facing copy)

- **Language:** Portuguese of Portugal (PT-PT). English translations inline.
- **Tone:** contemplative, authentic, zero hype, zero marketing buzzwords. No emojis, no exclamation marks.
- Use "candidatura" (application), never "reserva" (reservation) or "compra" (purchase).
- Pedro is "o professor" (the teacher), never "guru".
- The retreat is a "laboratório de auto-conhecimento", not a wellness/relaxation product.
- Copy changes require Pedro's sign-off before deploy (see `CLAUDE_CODE_SPRINT.md` §6).

## Responsibility split (do not confuse)

Claude Code owns: infra, data, code, integrations, analytics, serverless, SEO, performance. Pedro owns: 1:1 outreach, audios, tone curation, acceptance decisions, onboarding conversations. Never propose solutions that silently depend on Pedro doing manual work — flag the handoff explicitly.
