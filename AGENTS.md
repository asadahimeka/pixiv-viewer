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

### Component Patterns
- Global components registered in `main.js`: `WfCont` (ImageLayout), `TopBar`, `Pximg` (DirectPximg)
- SVG icon system: custom component via `src/icons/`, SVGs loaded as XML
- Layout components in `src/layouts/`, page views in `src/views/`, shared UI in `src/components/`

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
- **Release flow**: `bumpp` bumps `package.json` + `src/consts/index.js`, then `git-cliff` updates CHANGELOG

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
