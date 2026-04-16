# Mira Desktop App

Mira Desktop is an Electron application for real-time, voice-first workflows. It combines low-latency microphone capture, speech activity detection, secure auth/session handling, and persistent realtime connectivity to keep user interactions flowing while coordinating with a remote API.

What makes it hard:
- it bridges native desktop behavior with web UI speed;
- it must handle unreliable networks and long-running sessions safely;
- it processes streaming voice input where UX depends on timing, quality thresholds, and fast feedback.

## Why This System Is Technically Deep

- **Cross-process architecture:** Electron main process, secure preload bridge, and React renderer are separated to reduce attack surface while still enabling rich native capabilities.
- **Realtime state orchestration:** the app maintains a resilient WebSocket client with heartbeats and exponential backoff reconnect behavior for push-driven updates.
- **Voice pipeline quality control:** client-side VAD and audio validation gates (RMS and duration bounds) reduce bad captures before they reach backend transcription/interaction processing.
- **Version-safe rollouts:** startup includes server/app major-version compatibility checks to prevent silent protocol drift failures.
- **Desktop reliability lifecycle:** before shutdown, the app performs client cleanup/deregistration with bounded timeouts to avoid hanging exits.

## Architecture Highlights

- **Main process (`main/`):** window lifecycle, OAuth handoff, secure token operations, update/compatibility checks, and app-level cleanup.
- **Preload boundary (`main/preload.ts`):** explicit IPC surface exposed to the renderer rather than full Node access.
- **Renderer (`renderer/`):** React-based UI state, interaction panels, service/audio contexts, and realtime event consumption.
- **Shared API contracts (`shared/`):** centralized endpoint and realtime URL composition used across processes.

## Notable Engineering Decisions And Tradeoffs

- **Security over convenience:** `nodeIntegration` is disabled and `contextIsolation` is enabled; communication happens through specific IPC handlers.
- **OS-native secret storage:** auth tokens and client identity are stored in system keychain storage (`keytar`) instead of plaintext config.
- **Fail-open vs fail-stop strategy:** transient backend health check failures allow startup, but clear major-version incompatibility blocks launch to avoid broken behavior.
- **Fast updates with user control:** packaged builds check for updates silently, then prompt users to restart when a safe install point is reached.

## Operational Quality Signals

- **Release automation:** CI builds and packages installers for Windows and macOS and publishes versioned release artifacts.
- **Native module handling in CI:** packaging includes explicit native module rebuild steps to keep secure credential storage functional in production builds.
- **Runtime diagnostics:** critical paths (realtime disconnects, VAD acceptance/rejection, updater/version checks, cleanup paths) are instrumented with structured runtime logging for field debugging.

## Minimal Development Notes

- Environment keys: `MIRA_API_URL`, `BETA` (see `.env.example`).
- Common commands: `npm install`, `npm run dev`, `npm run build`, `npm run package`.
