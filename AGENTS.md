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
- **Continuation 触发时可自行结束计划** — 当系统反复触发 continuation（boulder/todo-continuation）时，若所有实现任务与终验（Final Wave）均已 APPROVE，可直接标记计划完成并收官，**不必每次等待用户明确确认**；用户确认仅用于"验收发现需修复/调整"的情形。完成时确保：计划 checkbox 全部勾选、证据/notepad 已沉淀、改动以 `git diff` 呈现未提交

### Component Patterns
- Global components registered in `main.js`: `WfCont` (ImageLayout), `TopBar`, `Pximg` (DirectPximg)
- SVG icon system: custom component via `src/icons/`, SVGs loaded as XML
- Layout components in `src/layouts/`, page views in `src/views/`, shared UI in `src/components/`

### Vant UI (v2) — IMPORTANT import conventions
- **DO NOT** `import { X } from 'vant'` — this triggers babel-plugin-import and pulls in the `vant/es/*` ESM build, duplicating the `vant/lib/*` CJS build already registered globally. All vant code must use ONE build (`vant/lib/*`).
- **Template components**: already globally registered via `Vue.use()` in `src/lib/vant.js` (39 components: Button/Toast/Search/Tabs/List/Popup/Dialog/Icon/Loading/Progress etc. — use `<van-xxx>` directly, NO import needed.
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
VUE_APP_PXVEAPI_MAIN        — PxveAPI instance (also serves PixivNow)
VUE_APP_DEF_HIBIAPI_MAIN    — Default HibiAPI endpoint
VUE_APP_DEF_PXIMG_MAIN      — Default pximg proxy
VUE_APP_DEF_APP_API_PROXY   — AppAPI proxy host
VUE_APP_COMMON_PROXY        — Generic proxy (https://proxy.example.com/https://url)
VUE_APP_COMMON_IMAGE_PROXY  — Generic image proxy (falls back to COMMON_PROXY)
VUE_APP_SILICON_CLOUD_API_KEY — AI translation key
VUE_APP_MODEL_RELEASE_TAG   — ONNX model CDN release tag (rewrites manifest URLs)
VUE_APP_MODEL_URL_TEMPLATE  — Custom model CDN URL template (priority over release tag)
VUE_APP_ORT_WASM_PATH       — ONNX Runtime WASM path (default: jsdelivr CDN)
```

### Manga Translation (ONNX pipeline)
- `src/utils/translate/` — manga image translation: `index.js` (pipeline orchestrator), `manga.js`, `shinobu/` (ONNX workers, OCR, inpainting, typesetting, LLM translators)
- **Models live in `public/models/`** — manifest `models.json` + dict tracked in git; `*.onnx` binaries gitignored (fetched at deploy time; do NOT commit them)
- Pipeline stages: text detection → OCR recognition → text removal (inpainting) → LLM translation → Canvas typesetting
- Runs in Worker threads via Comlink (onnxruntime-web, WebGPU/WASM)

## Gotchas & Constraints

- **License**: AGPL-3.0 (`package.json` → `AGPL-3.0-only`). History: MIT → GPL-3.0 → AGPL-3.0 (ShinobuTranslator derivation). Third-party MIT code keeps its original headers (e.g. `src/lib/justified.js`, `src/api/client/pixiv-api.js`) — do NOT strip them; `THIRD_PARTY_NOTICES` documents third-party licenses
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

## Playwright QA Test Notes

> **总原则（2026-08-11 起）**：**默认不进行 Playwright 浏览器模拟测试**。浏览器 UI 的最终验收由用户**手动**进行——agent 跑浏览器模拟既耗时（每场景 ~3 分钟 + dev server 90s+ 启动）又低效（用户反正会自己实测）。agent 允许的验证方式：
> - **脚本级测试**（优先）：bash/curl、node 脚本、node:test 单元测试——验证逻辑正确性足够
> - **不跑浏览器模拟**，除非用户**显式**要求"帮我用浏览器测一下 X"（如跨域/CORS、真实点击流等必须真实浏览器行为的场景）
> - 需要验证用户可见效果时，产出**清晰的改动说明 + 预期行为清单**，由用户手动确认，而非 agent 截图代劳
> - 以下环境事实与技巧保留备用（万一用户显式要求浏览器测试时仍需要）

> Two Real Manual QA sessions both exceeded the 30-min sync `task()` poll limit. Lessons learned:

### Environment facts (no login needed for most features)
- **No login required** to browse/test most features. Login state can be simulated via localStorage (`PXV_*` prefix).
- **Bypassing login**: `Nav.vue` checks `localApi.isLoggedIn() || existsSessionId()`. `existsSessionId()` = presence of `localStorage.PXV_NOW_COOKIE` (format `PHPSESSID=<token>`, token must match `/^\d{2,}_[0-9A-Za-z]{32}$/`). `isLoggedIn()` = `APP_CONFIG.useLocalAppApi` flag.
- **Bypassing R18 gate** (zh-CN): `main.js` blocks when `!LocalStorage.get('PXV_NSFW_ON')` is falsy AND locale is zh. To bypass, set BOTH:
  - `localStorage.setItem('PXV_CNT_SHOW', ...)` — content settings (r18/r18g/ai flags)
  - `localStorage.setItem('PXV_NSFW_ON', '{"data":0,"expires":-1}')` — **value MUST be 0** (falsy → `!isOn()` = true → no block). Do NOT set it to truthy (1) — that triggers the blocking page in zh locale.
- **API Key is in `.env.local`** (gitignored): `VUE_APP_SILICON_CLOUD_API_KEY` is applied automatically to API calls — real translation tests can run directly, no mocking needed.
- **dev server reuse**: before dispatching QA, `curl localhost:8080` — if listening, reuse it (`pnpm serve` compile takes 90s+, re-starting wastes ~10 min).
- **hibiapi.cocomi.eu.org rejects automation**: it returns "Not Accepted" for requests with `HeadlessChrome` in the User-Agent or without a proper referer. In QA scripts, headless mode is fine but you MUST set a normal UA (no `HeadlessChrome` substring) and a `localhost` referer. Browser (real user) requests are unaffected — the app cannot and does not set UA/Referer for hibiapi (forbidden headers).

### Execution rules
- **QA/UI automation tasks MUST use `run_in_background=true`** — sync `task()` has a hard 1800000ms (30 min) poll limit; serial UI scenarios will hit it.
- Bash checks (files/grep/license) take seconds; **each UI scenario takes ~3 min** — keep scenario count low, split as needed.
- Page loads: use `waitUntil: 'domcontentloaded'`, NOT `'networkidle'` (lazy-loaded image pages never reach networkidle).
- Full retrospective: `.sisyphus/notepads/shinobu-questions/playwright-qa-lessons.md`

### QA script techniques
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
| `src/utils/translate/` | Manga image translation pipeline (ONNX workers, OCR, inpainting, typesetting) |
| `src/utils/sync.js` | Cloud sync (PBKDF2 + AES, conflict detection) |
| `src/views/` | Page components (Artwork, Home, Search, Rank, Users, etc.) |
| `public/` | Static assets, PWA manifest, helper scripts |
| `public/models/` | ONNX translation models — manifest + dict tracked, `*.onnx` gitignored |
| `public/pxcl/` | Pre-built Pixiv bookmark page (independent Vue 3 bundle) |
