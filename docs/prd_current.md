# ����ŵ껥��ƽ̨ �?Current PRD Summary (2026-03-13)

## Product Positioning
- Multi-tenant SaaS for physical lottery stores: content-driven store portal + two H5 mini-games (Super Lotto, Scratch Card) + store admin + platform SuperAdmin.
- Goals: drive acquisition/retention, showcase official + store content, enable quick interactive play, support external “tap-to-play�?hardware.

## Target Users
- Shoppers: browse official news, store-winning highlights; play Super Lotto picker and Scratch Card roller.
- Store managers: manage store basics, carousel/award assets, configure games, view store data.
- Platform admins (SuperAdmin): create/authorize stores, publish official news/hero media, audit store submissions, view platform stats.
- Hardware operators: trigger core actions via physical button.

## Architecture & Routing (current)
- Frontend: React + Vite SPA, HashRouter.
  - `/s/:storeId` store portal (multi themes)  
  - `/s/:storeId/lotto` Super Lotto picker  
  - `/s/:storeId/scratch` Scratch Card roller  
  - `/s/:storeId/admin` store admin; `/admin` unified admin; SuperAdmin inside `/admin`
- Backend: Node/Express `server/index.js`, data persisted in `server/db.json`.
- Crawlers: `server/crawler.js` (JSON API-based) with optional `server/puppeteerCrawler.js` (Fujian HTML/XHR intercept).

## Core Features
- Store Portal
  - Header: store name, phone, marquee notice, current time, positive “fortune�?tips (no negative words).
  - Hero carousel: mix of official + audited store images; slot for event video.
  - Feeds: official news list; store winning highlights (images + copy).
  - Game entries: Super Lotto & Scratch Card; hidden/grey if not authorized.
  - Side/bottom: live draw board, welfare/“glimmer�?data, today’s live time hints.
- Super Lotto (5 red 1�?5 + 2 blue 1�?2)
  - Quick pick/manual pick, non-duplicate ascending.
  - Packages/复式 buttons; “My tickets�?lock/edit/delete/share.
  - Share long image with store watermark + store QR; save/scan/WeCom send.
  - Hardware tap to trigger pick animation + countdown; responsive scaling for TV/mobile.
- Scratch Card (10/20/30/50 yuan tiers)
  - Tier switch; CSGO-style roller with damping to a single ticket.
  - Post-stop “recommended purchase sheet #N�?within tier size.
  - Hardware tap to start roller.
- Store Admin (to be tabbed)
  - Tabs plan: Basics, Media (carousel + winning uploads with audit states), Game config (Lotto buttons/packages; Scratch tier selection & quotas), Hardware status, Account.
- Platform SuperAdmin
  - Store create/expire, per-game authorization.
  - Publish official news + global carousel/video.
  - Audit store uploads (approve/reject).
  - Source monitor dashboard; Fujian section when available.

## Data & Stats
- Store level: visits, quick-pick vs package actions, share/export rates; simulated prize-matching reports visible only in backends.
- Platform level: authorized store counts, expiry distribution, module DAU trends.

## Content & Visual Principles
- Warm palette, glassy panels, main buttons red/blue/orange; use Lucide icons; no emoji.
- Responsive, prefer 16:9; JS-driven `scale` auto-fit; hidden manual fine-tune stored in LocalStorage.
- Game entries as compact tiles; feeds clearly separated.

## External Sources & Fallback
- National APIs (current impl): sporttery JSON (`getInfoListByCluster...`, `getDigitalDrawInfoV1`), lottery.gov.cn `index.json` for carousel; welfare fund API.
- Fujian optional: Puppeteer intercepts `fjtc.com.cn/data_api/lottery?type=...`; absence auto-falls back to static mock.
- All fetches wrapped with 15s timeout; empty datasets replaced by curated fallback blocks to keep UI populated.

## Hardware Integration
- Physical “tap�?button mapped to lotto quick-pick or scratch roller start; admin shows enabled/disabled and can toggle “arcade mode�?

## Outstanding Items (per task list)
- Update `server/index.js` schema: drop football, add portal configs (carousel library, article library, store wins list).
- Refactor `StoreConfig.jsx` into top Tab layout.
- Validate puppeteer removal gracefully downgrades (theoretical fallback exists; needs test).

## Key Files
- Requirements: `314ae998-31eb-45ca-9ed1-0c57f69391a3/prd.md.resolved`
- Task board: `314ae998-31eb-45ca-9ed1-0c57f69391a3/task.md.resolved.15`
- Crawler plan: `314ae998-31eb-45ca-9ed1-0c57f69391a3/implementation_plan.md.resolved`
- Backend: `server/crawler.js`, `server/puppeteerCrawler.js`, `server/index.js`
- Frontend: `src/pages/StorePortal.jsx`, `src/pages/Home.jsx`, `src/pages/ScratchCard.jsx`, `src/admin/SuperAdmin.jsx`, `src/admin/CrawlerMonitor.jsx`, `src/admin/StoreConfig.jsx`
