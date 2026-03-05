# SITE.md — GutFlow Stitch Build Loop

## 1. Site Vision
GutFlow is a medical diet assistant for people on the Low-FODMAP protocol.
It analyzes ingredient lists, scores FODMAP risk, suggests safe alternatives,
and tracks market prices to help users shop safely.

**Stack**: Next.js 14 App Router · TypeScript strict mode · Vanilla CSS (in-file)
**Primary color**: Deep violet-to-blue gradient (`#6B21A8` → `#1D4ED8`)
**Dev server**: `http://localhost:3000`

## 2. Stitch Project ID
> Create on first loop run — save output here after `create_project`:
```json
{ "projectId": "" }
```
_(Populate by running the first stitch-loop iteration)_

## 3. Design Constraints (medical app — non-negotiable)
- No red/green color-only signals — always include text labels (accessibility)
- Disclaimer footer required on every page: "Based on Monash University public guidelines"
- FDA label order badge must be visible on ingredient breakdowns
- Grade badges: `green` = Safe · `yellow` = Caution · `red` = Avoid

## 4. Sitemap
- [x] `/` — Main FODMAP analyzer (page.tsx — already built)
- [x] `/guide` — FODMAP beginner guide + tier explanation ✅ Loop #1
- [x] `/results` — Shareable analysis results page ✅ Loop #2
- [x] `/scanner` — Barcode scanner landing with step-by-step instructions ✅ Loop #3
- [x] `/market` — Market price dashboard (price trends, triggers log) ✅ Loop #4
- [x] `/about` — About GutFlow + medical disclaimer ✅ Loop #5

## 5. Roadmap (stitch-loop build order)
1. `/scanner` — barcode scanner onboarding
2. `/market` — market price monitor UI
3. `/about` — legal + trust page

## 6. Creative Freedom (if roadmap is empty)
- A `/recipes` page with FODMAP-safe meal cards
- An `/emergency` quick-lookup page for commonly eaten restaurant items
- A `/compare` tool to compare two products side by side
