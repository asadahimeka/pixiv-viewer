# Pixiv Viewer — Agent Guide

## Stack

- **Vue 2.7** (Composition API available) + Vue Router 3 + Vuex 3 + Vue I18n 8
- **Vant UI v2** — mobile-first, imported on-demand via `babel-plugin-import`
- **Stylus** — CSS preprocessor (`.styl` files)
- **pnpm >= 9** — package manager
- **`@vue/cli-service` 5** — build toolchain
- **No TypeScript** — pure JS with JSDoc type hints; `jsconfig.json` for IDE support

## Essential Commands

| Command | Purpose |
|---|---|
| `pnpm serve` | Dev server at `localhost:8080` |
| `pnpm build` | Production build → `dist/` |
| `pnpm lint` | ESLint check |
| `pnpm analyze` | Build with bundle report |
| `pnpm release` | Bump version (`bumpp`), then `npm run prerelease` |
| `npm run changelog` | Generate CHANGELOG.md via git-cliff |

## Architecture

### Layout Tree
```
App.vue
 └─ BaseLayout.vue (keep-alive router-view)
     └─ MainLayout.vue (Nav bar + keep-alive router-view max=10)
```

- `MainLayout` has two modes: with Nav (home/search/rank/etc.) and without Nav (artwork/novel/user detail pages)
- Nav is a fixed bottom bar on mobile, fixed left sidebar on wide screens (≥1000px)

### Router (history mode)
- Single flat route file at `src/router/routes.js`
- Extensive aliases mimicking pixiv.net URLs (`/artworks/:id` aliased `/i/:id`, `/illust/:id`, etc.)
- Route meta `__depth` controls transition behavior
- All routes prefixed via `BASE_URL` from env

### State (Vuex)
- Single store at `src/store/index.js` — no modules
- Settings persisted to localStorage with `PXV_` prefix via custom `MyStorage` wrapper (supports TTL)
- Key state: `appSetting` (60+ user preferences), `contentSetting` (R18/AI filters), `user`, `galleryList`
- Persistent config pattern: `getSettingDef('PXV_KEY', defaultValue)` reads localStorage with fallback

### API Layer
- **Dual architecture**: HibiAPI-compatible (default) + local AppAPI (direct pixiv API via action map)
- `src/api/index.js` — main API object with data parsing (`parseIllust`, `parseNovel`, `parseUser`)
- `src/api/http.js` — Axios wrapper with retry logic, base URL from env
- All API methods return `{ status: 0| -1, data, msg }` shape
- `imgProxy(url)` — replaces `i.pximg.net` with configured proxy (critical — use everywhere)
- Two separate API paths: HibiAPI (`/`) and PixivNow/PxveAPI (`PIXIV_NOW_URL`, `PIXIV_NEXT_URL`)

### Storage
- Custom `MyStorage` class wrapping `localStorage`/`sessionStorage` with JSON + TTL
- `LocalStorage.get(key, def)` / `LocalStorage.set(key, val, expiresSec?)`
- Site cache via `src/utils/storage/siteCache.js` (IndexedDB via localforage)

## Key Conventions

### Code Style (ESLint enforced)
- **No semicolons** (`semi: never`)
- **Single quotes** (`quotes: single`)
- **Comma-dangle** on multiline arrays/objects
- **No `console` restriction** — console.log is allowed and widely used
- **Vue component order**: `<template>` then `<script>` then `<style>`
- **Single-word component names allowed** (`vue/multi-word-component-names: off`)

### Work Rules
- **Do NOT commit, push, or create PRs unless explicitly asked** — all changes must be presented for user review and manual commit only
- **Do NOT create branches** — work on current branch and present changes via `git diff`

### Component Patterns
- Global components registered in `main.js`: `WfCont` (ImageLayout), `TopBar`, `Pximg` (DirectPximg)
- SVG icon system: custom component via `src/icons/`, SVGs loaded as XML
- Layout components in `src/layouts/`, page views in `src/views/`, shared UI in `src/components/`

### Vant UI (v2) — IMPORTANT import conventions
- **DO NOT** `import { X } from 'vant'` — this triggers babel-plugin-import and pulls in the `vant/es/*` ESM build, duplicating the `vant/lib/*` CJS build already registered globally. All vant code must use ONE build (`vant/lib/*`).
- **Template components**: already globally registered via `Vue.use()` in `src/lib/vant.js` (38 components: Button/Toast/Search/Tabs/List/Popup/Dialog/Icon/Loading/Progress NOT included, etc.) — use `<van-xxx>` directly, NO import needed.
- **Imperative APIs** (Dialog.confirm, Toast.success, ImagePreview, Notify, Locale): import from the central facade `@/lib/vant-apis` (re-exports `vant/lib/*` + needed styles):
  ```js
  import { Dialog, Toast, ImagePreview, Notify, Locale } from '@/lib/vant-apis'
  ```
  NOT `from 'vant'`. `this.$toast`/`$dialog`/`$notify` prototypes exist (from lib registration) but prefer explicit imports for clarity.
- **New components**: if a component is NOT in the `vant.js` global registration list (e.g. Progress), either register it there or import it directly via `vant/lib/xxx` (component) + ensure its style is in `src/lib/vant-style.js`.
- **Styles**: component styles live in `src/lib/vant-style.js` (lib path, one per component) — add new components' styles there, not via babel-plugin-import.

### i18n
- Default locale: `zh-CN`; lazy-loaded from `src/locales/*.json`
- Translation keys are auto-generated hashes (e.g., `'sBmkLtGcrWIL7xsU-EdM9'`) — do NOT edit keys manually
- Vant locale set separately alongside app locale

### CSS
- `postcss-pxtorem` (rootValue: 75) — write `px`, get `rem` at build time
- Blacklist: `.van` (Vant components) and `.ispx` (opt-out class)
- Dark mode: `localStorage.PXV_DARK` flag adds `.dark` class to body
- Theme color: CSS variable `--accent-color` from `localStorage.PXV_ACT_COLOR`

### API Config (via .env)
```
VUE_APP_PXVEAPI_MAIN     — PxveAPI instance (also serves PixivNow)
VUE_APP_DEF_HIBIAPI_MAIN — Default HibiAPI endpoint
VUE_APP_DEF_PXIMG_MAIN   — Default pximg proxy
VUE_APP_DEF_APP_API_PROXY— AppAPI proxy host
VUE_APP_SILICON_CLOUD_API_KEY — AI translation key
```

## Gotchas & Constraints

- **`lintOnSave: false`** — ESLint errors won't show in dev overlay
- **Browser blocking** in `main.js`: blocks WeChat/QQ and ~12 Chinese browsers at startup via user-agent check
- **R18 age gate** for zh-CN users: redirects to a blocking page unless `PXV_NSFW_ON` is set
- **Service worker** cache strategies defined in `vue.config.js` — clears old caches on update
- **No unit/e2e tests** in the project
- **`productionSourceMap: false`** — no source maps in production
- **Disallowed type suppressions**: `as any`, `@ts-ignore`, `@ts-expect-error`
- **`console.log` calls are NOT stripped in dev** — only dropped in production via terser `drop_console: true`
- **`dist/`, `.env.local`, `.sisyphus/`** are gitignored
- **`.sisyphus/plans/` 计划文件命名**: 必须以日期开头（`YYYY-MM-DD-{name}.md`，如 `2026-08-02-shinobu-fixes3.md`）——同全局 AGENTS.md 约定，生成计划时严格执行
- **Release flow**: `bumpp` bumps `package.json` + `src/consts/index.js`, then `git-cliff` updates CHANGELOG

## Playwright QA Test Notes (2026-08-06 retrospective)

> Two F3 Real Manual QA sessions both exceeded the 30-min sync `task()` poll limit. Lessons learned:

### Environment facts (no login needed for most features)
- **No login required** to browse/test most features. Login state can be simulated via localStorage (`PXV_*` prefix).
- **Bypassing login**: `Nav.vue` checks `localApi.isLoggedIn() || existsSessionId()`. `existsSessionId()` = presence of `localStorage.PXV_NOW_COOKIE` (format `PHPSESSID=<token>`, token must match `/^\d{2,}_[0-9A-Za-z]{32}$/`). `isLoggedIn()` = `APP_CONFIG.useLocalAppApi` flag.
- **Bypassing R18 gate** (zh-CN): `main.js` blocks when `!LocalStorage.get('PXV_NSFW_ON')` is falsy AND locale is zh. To bypass, set BOTH:
  - `localStorage.setItem('PXV_CNT_SHOW', ...)` — content settings (r18/r18g/ai flags)
  - `localStorage.setItem('PXV_NSFW_ON', '{"data":0,"expires":-1}')` — **value MUST be 0** (falsy → `!isOn()` = true → no block). Do NOT set it to truthy (1) — that triggers the blocking page in zh locale.
- **API Key is in `.env.local`** (gitignored): `VUE_APP_SILICON_CLOUD_API_KEY` is applied automatically to API calls — real translation tests can run directly, no mocking needed.
- **dev server reuse**: before dispatching QA, `curl localhost:8080` — if listening, reuse it (`pnpm serve` compile takes 90s+, re-starting wastes ~10 min).
- **Playwright is globally installed** (`npm i -g playwright`) with browsers already downloaded (`~/.cache/ms-playwright/`, chromium-1234). Do NOT check MCP servers — invoke Playwright directly.
- **hibiapi.cocomi.eu.org rejects automation**: it returns "Not Accepted" for requests with `HeadlessChrome` in the User-Agent or without a proper referer. In QA scripts, headless mode is fine but you MUST set a normal UA (no `HeadlessChrome` substring) and a `localhost` referer. Browser (real user) requests are unaffected — the app cannot and does not set UA/Referer for hibiapi (forbidden headers).

### Execution rules
- **QA/UI automation tasks MUST use `run_in_background=true`** — sync `task()` has a hard 1800000ms (30 min) poll limit; serial UI scenarios will hit it.
- After hitting the limit, in-session conclusions are lost — evidence files are the only recovery path. **F3 must write its verdict to `.sisyphus/evidence/f3-verdict.txt` before finishing.**
- Bash checks (files/grep/license) take seconds; **each UI scenario takes ~3 min** — keep scenario count low, split as needed.
- Page loads: use `waitUntil: 'domcontentloaded'`, NOT `'networkidle'` (lazy-loaded image pages never reach networkidle).
- Full retrospective: `.sisyphus/notepads/shinobu-questions/playwright-qa-lessons.md`

## Shinobu Manga Translation Notes (2026-08-07 QA v4)

- **Real translation works**: all models run on `wasm` (CPU) — `modelInfo` shows detector/bubble/ocr/inpaint all `wasm`. Full page translation takes ~99-157s (first run downloads ~199MB models, cached in IndexedDB after). Budget >8 min per test.
- **Consent dialog gates first translation**: `shinobuModelConsent` (default false, persisted in `PXV_MANGA_TRANS` via `SET_MANGA_TRANS` spread merge) is checked at the VERY START of the `engine === 'shinobu'` branch, before cache. To re-test the dialog, clear `PXV_MANGA_TRANS` or set `shinobuModelConsent: false`. Use `Dialog.confirm` from `@/lib/vant-apis`, not `this.$dialog` or `from 'vant'`.
- **TranslateDebug data schema** (`?translatedebug=1`, dev-only): `buildArtifacts()` does NOT return `translatedRegions` — translated text lives in `detectedRegions[].translatedText`; OCR regions in `stageRegions.ocr` (Object `{detected,ocr,merged,ordered}`, not Array); model info needs `:model-info` prop (from `currentArtifacts.runtimeStages`). `getSectionData()` delegates to computeds — fix the computed, display + copy paths both auto-fix.
- **KNOWN OOM: translation memory is never released.** All dispose APIs exist but have no call sites: `disposeModelSession`/`disposeAllModelSessions` (modelRegistry.js), → `onnxWorkerBridge.disposeAll` (terminates worker, onnxWorkerBridge.js:483), worker `disposeAll` (onnx-worker.js). ONNX sessions (~200MB) live forever; `currentArtifacts` holds 5 full-size canvases/page; `translatedCanvases` accumulates across keep-alive. Don't run repeated translations in one browser session during QA. Do NOT dispose per translation (models are cached/reused) — dispose on leaving the artwork page only.
- **License is now AGPL-3.0** (was MIT → GPL-3.0; `package.json` `AGPL-3.0-only`) because shinobu is derived from GPL-3.0 ShinobuTranslator, and AGPL protects against closed-source SaaS forks. THIRD_PARTY_NOTICES carries component attribution. Don't revert.
- **TranslateSettings** has an extension recommendation link (Chrome Web Store + GitHub Releases, Firefox via about:debugging).

### QA v4 script techniques (supersedes parts of v3 notes)
- **Read Vue computed values via `__vue__`** (walk `$parent` to the component by `$options.name`) instead of expanding DOM — rendering 1000s of region nodes OOMs the page.
- **van-dialog DOM lingers during close transition** — assert absence via `display:none` (`dialogReallyGone`), not `querySelector === null`, else false positives.
- Reuse browser context across runs (models cached); single attempt is enough.

## Directory Map

| Path | Purpose |
|---|---|
| `src/api/` | HTTP client + API data parsers |
| `src/api/client/` | Local AppAPI (pixiv auth, login, action map) |
| `src/components/` | Shared UI components (layouts, cards, nav) |
| `src/consts/` | App constants + env var exports |
| `src/icons/` | SVG icon system |
| `src/i18n.js` | Vue I18n setup + locale loader |
| `src/layouts/` | App shell layouts |
| `src/lib/` | Third-party library setup (Vant, Lodash, polyfill) |
| `src/locales/` | i18n translation JSON files |
| `src/router/` | Vue Router config + routes |
| `src/store/` | Vuex store + actions (check-login, fetch-notice, filename) |
| `src/utils/` | Utilities (download, storage, ugoira, novel, filter, font) |
| `src/views/` | Page components (Artwork, Home, Search, Rank, Users, etc.) |
| `public/` | Static assets, PWA manifest, helper scripts |
