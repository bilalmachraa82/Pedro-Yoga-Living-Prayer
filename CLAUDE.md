# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Living Prayer" (Oração Viva) — a yoga retreat landing page and digital infrastructure for Pedro Morais, a yoga teacher based in the Sintra/Ericeira area of Portugal. The retreat takes place at Quinta das Broas. The site is bilingual (PT/EN), contemplative in tone, and deployed on Vercel.

## Architecture

**Single-page static site** with one serverless function:

- `living-prayer.html` — source/development version of the landing page (~3400 lines, single-file HTML/CSS/JS)
- `deploy/` — production directory deployed to Vercel
  - `deploy/index.html` — production copy of the landing page (manually synced from `living-prayer.html`)
  - `deploy/api/subscribe.js` — Vercel serverless function that submits form data to Systeme.io CRM
  - `deploy/img/` and `deploy/fotos/` — production images
  - `deploy/robots.txt`, `deploy/sitemap.xml` — SEO files
  - Additional HTML guides: `GOOGLE_BUSINESS_PROFILE_GUIDE.html`, `GOOGLE_ADS_GUIDE_2026.html`, `EMAIL-SETUP-GUIDE.html`, `RECAP_LIVING_PRAYER.html`
- `img/` — source images (optimized JPGs, ~30 files)
- `fotos/` — raw/unprocessed photos from photographer

## Deployment

Hosted on **Vercel** (project: `living-prayer`). The `deploy/` directory is the deployment root.

- After editing `living-prayer.html`, changes must be **manually copied** to `deploy/index.html`
- Environment variable `SYSTEME_IO_API_KEY` is set in Vercel for the serverless function
- Domain: `livingprayer.pt`

## Key Technical Details

**Bilingual system:** The page uses `data-lang` attribute on `<html>` and CSS classes `lang-pt`/`lang-en` to toggle content. Both languages exist in the same HTML — CSS hides the inactive one.

**Form flow:** 2-step application form → `POST /api/subscribe` → Systeme.io API (create/update contact + tag). The serverless function handles duplicate emails by searching and patching existing contacts.

**Design tokens (CSS custom properties):**
- `--bg-warm: #F5F0EB`, `--green: #4A5D4F`, `--brown: #8B7355`, `--white: #FEFCF9`, `--text: #2D2D2D`
- Fonts: Cormorant Garamond (serif, headings), Inter (sans, body)

**JS features:** IntersectionObserver fade-in animations, smooth scroll, bio modal, 2-step form, GA4/Hotjar placeholders (commented out).

**Schema.org:** Event + LocalBusiness structured data in JSON-LD.

## Content & Tone Rules

- **Language:** Portuguese of Portugal (PT-PT). English translations provided inline.
- **Tone:** Contemplative, authentic, zero hype, zero marketing buzzwords. No emojis, no exclamation marks.
- Use "candidatura" (application), never "reserva" (reservation) or "compra" (purchase).
- Pedro is "o professor" (the teacher), never "guru".
- The retreat is described as a "laboratório de auto-conhecimento" (self-knowledge laboratory), not a wellness/relaxation product.

## Reference Docs (root)

- `Plano_Retiro_Pedro_Morais_2026.md` — full strategic plan for the retreat
- `PROMPT_CLAUDE_CODE_BUILD.md` — original build prompt with all specs
- `GOOGLE_ADS_GUIDE_2026.md` — Google Ads campaign strategy
- `email-sequences.md` — email marketing copy (welcome + post-acceptance sequences)
- `hubspot-setup-guide.md`, `payments-setup-guide.md`, `analytics-setup-guide.md`, `tally-form-config.md` — setup guides for various integrations
