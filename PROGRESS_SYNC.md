# Progress sync (account) — MVP

## Now (no secrets)

Fokus stays local-first. “Account sync” for v0.6 is:

1. **Export** `fokus-backup` JSON (schema 4, checksum) from Settings  
2. **Import** merge or replace on another device  
3. **Clipboard copy** of the same envelope (quick transfer)

Keys: `fokus.v1`, `.bak`, `.snap`. See `OFFLINE_SYNC_G6.md`.

## Next (cloud)

When auth secrets exist:

| Piece | Plan |
| --- | --- |
| Transport | `POST /api/sync` JSON batches (`CloudSyncTransport`) |
| Identity | existing `meta.deviceId` + monotonic `meta.rev` |
| Conflict | `mergeStates` (rev / updatedAt) |
| Auth | bearer token in future `fokus.auth` — **not shipped** |
| Queue | existing `SyncQueue` in `offline-sync.ts` |

Code: `src/core/progress-sync.ts` documents the phase and plugs a noop transport so the queue does not pretend a cloud exists.

## Privacy

Nothing auto-uploads. Clipboard/export are user gestures. Opt-in product feedback counters are separate (`fokus.feedback.v1`).
