# Mira Frontend

## Overview

Mira Frontend is an npm workspaces monorepo that ships two production surfaces for the same product: a **browser SPA** and an **Electron desktop** client. Both share a **typed React UI layer** and API/realtime conventions, so product behavior stays consistent while each runtime handles its own constraints (tabs vs. native audio, OS keychain, installers).

## Why This Is Hard

- **Realtime + rich UI:** live voice and push-driven updates have to stay coherent across reconnects, duplicate events, and partial payloads without confusing the user.
- **Two runtimes, one product:** the website and desktop app each need auth, streaming, and conversation flows without duplicating domain logic or drifting out of sync.
- **Desktop security and lifecycle:** Electron separates main, preload, and renderer on purpose; tokens and sensitive work stay out of the renderer while the UI still feels like a modern web app.
- **Voice on the desktop:** capturing audio, gating quality (for example with client-side VAD), and staying responsive ties UX directly to low-level timing and error handling.
- **Shipping installers:** native modules, code signing, and automated builds across platforms raise the bar beyond “it works on my machine.”

## Architecture Highlights

- **Monorepo layout:** `apps/website` (Vite + React), `apps/desktop` (Electron + Vite renderer), and `packages/ui` (`@mira/ui`) for shared components and client plumbing.
- **Layered React apps:** contexts and services orchestrate auth, API access, audio/realtime, and notifications so screens stay composable as the product grows.
- **HTTP + WebSockets:** a shared mental model of versioned REST (`/api/v1`, `/api/v2` where configured) alongside resilient WebSocket clients (heartbeats, backoff, fan-out to UI).
- **Electron process model:** main process owns window lifecycle, OAuth handoff, updates, and compatibility checks; preload exposes a narrow IPC surface; renderer stays a standard React app with `contextIsolation` and without broad Node exposure.
- **Desktop-specific concerns:** OS-backed secret storage for credentials, optional auto-update flow, and packaging via **electron-builder** with CI producing Windows and macOS artifacts.

## Engineering Decisions and Tradeoffs

- **Workspaces over separate repos:** one dependency graph and shared `@mira/ui` package; slightly more discipline on boundaries, much less copy-paste across web and desktop.
- **Security over convenience in Electron:** explicit IPC instead of giving the renderer full Node reduces risk and keeps the attack surface reviewable.
- **Resilience over strict immediacy:** combining realtime streams with REST recovery helps the UI self-heal when messages arrive out of order or after a reconnect.
- **Env at the monorepo root:** `frontend/.env` drives both Vite apps so local and CI behavior stay aligned (see `apps/website/vite.config.ts` and `apps/desktop/main/env.ts`).
- **TypeScript throughout:** shared types and explicit contracts make refactors safer when backend APIs evolve in parallel with the backend service’s versioned API story.

## Reliability and Quality Signals

- **Typed client boundaries:** API and realtime URL composition live in shared modules so both apps agree on how to reach the backend.
- **Defensive UI patterns:** deduplication, ordering, and conflict-aware updates reduce impossible states in conversation and session views.
- **CI/CD for desktop:** GitHub Actions workflows under `.github/workflows` build and package installers, including the native-module and cross-platform concerns desktop shipping implies.
- **Modern toolchain:** React 19, Vite 7, TypeScript 5, Tailwind CSS 4, and ESLint-backed consistency on the website side.

## Impact

- **Users:** one product experience in the browser or on the desktop, with realtime feedback and navigable history after live sessions.
- **The team:** a single frontend codebase can evolve features once in `@mira/ui` or shared client code and land in both clients.
- **Hiring signal:** this repo demonstrates full-stack *client* ownership—SPA architecture, realtime systems, Electron hardening, and release engineering—not only component-level UI work.

## Minimal Development Notes

```bash
npm install
```

Create `frontend/.env` at the monorepo root (both apps read it) with at least:

- `MIRA_API_URL` — backend base URL (defaults to `http://localhost:8000` if omitted)
- `BETA` — optional; `true` when exercising beta API routing where applicable

Production builds (`vite build` for the website or desktop renderer) read **`MIRA_API_URL` from the monorepo root** via `loadEnv` (`.env.production` or environment variables such as on Vercel). The desktop installer workflow writes that root `.env.production` before packaging so the renderer bundle matches the API the Electron main process uses.

Common commands from the repo root:

```bash
npm run dev              # website + desktop together
npm run dev:website      # browser client only (Vite, port 5173)
npm run dev:desktop      # Electron dev loop
npm run build:website    # production SPA build
npm run package:desktop  # desktop build + installer (no publish)
```

Point `MIRA_API_URL` at your running Mira API (for example `http://localhost:8000` when the backend is up locally).
