# Mira Website

Mira Website is the browser client for a realtime voice-and-conversation product.  
It combines authenticated session management, low-latency event streaming, and state-heavy UI flows so users can move from live interaction to structured conversation history without losing continuity.

## Why This Is Technically Hard

- Realtime UI has to stay consistent across reconnects, duplicate events, and partial data.
- Client identity is stateful and conflict-prone (same user across tabs/devices), requiring clear recovery UX.
- Authenticated APIs and socket channels must stay synchronized while access tokens refresh in-flight.
- Conversation timelines require careful ordering and grouping across mixed timestamp formats and delayed lookups.

## Architecture Highlights

- React + TypeScript single-page app with layered contexts (`Auth`, `Service`, `Audio`, `Toast`).
- Shared API client with token-aware request/response interceptors and refresh retry path.
- Realtime transport using WebSocket with heartbeat, exponential reconnect backoff, and listener fan-out.
- Service lifecycle orchestration: register client, stream status updates, and best-effort deregistration on page unload.
- Conversation UI pipeline that deduplicates incremental events and merges them with fetched conversation/person metadata.

## Engineering Decisions and Tradeoffs

- **Resilience over strict immediacy:** realtime streams are complemented by API fetches to heal missing context.
- **Best-effort cleanup:** unload/pagehide deregistration uses `keepalive` fetch for practical session hygiene.
- **Predictable API versioning:** environment-driven `/api/v1` vs `/api/v2` prefix keeps rollout control explicit.
- **Cross-runtime compatibility:** browser and Electron pathways are supported without duplicating core domain logic.

## Reliability and Quality Signals

- Typed interfaces across auth, interaction, and conversation domains.
- Explicit timeout/retry behavior for network-sensitive operations.
- Defensive UI updates (dedupe logic, conflict guards, fallback handling) to reduce bad states.
- Linting and modern build tooling are configured for consistent delivery.

## Product Impact

- Enables continuous, realtime interaction with fast feedback loops.
- Makes conversation history auditable and navigable for users after live events.
- Improves trust through conflict visibility, graceful failure handling, and recoverable session behavior.

## Minimal Local Run

```bash
npm install
npm run dev
```
