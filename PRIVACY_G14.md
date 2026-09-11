# G14: Privacy & local-data hygiene

Fokus is a local-first PWA. Progress lives in the browser on this device. There is no account, no cloud profile, and no analytics SDK. This pass makes that contract inspectable, reversible, and hard to leak by accident.

Core does not import the UI, `registry.ts`, or exercise engines.

```
Settings → privacy panel
        │
        ▼
src/core/privacy.ts     catalog, inventory, redact, wipe, log sanitizer
        │
        ▼
src/core/storage.ts     exportJson({redact}), reset / resetProgress / clearPii
src/core/log.ts         safeError / safeWarn
```

## What is stored

| Location | Key / name | What it is | PII |
| --- | --- | --- | --- |
| `localStorage` | `fokus.v1` | Profile, sessions, skills, day summaries, optional name, optional sleep/stress | Yes, if the person typed a name or answered lifestyle |
| `localStorage` | `fokus.reminder.last` | `YYYY-MM-DD` throttle for the local reminder | No |
| Cache Storage | `fokus-*` | Precached shell (HTML/CSS/JS/icons) | No — assets, not the profile |
| Memory only | verbal-fluency words, WebRTC SDP/ICE | Session scratch | Not written to `fokus.v1` |
| Signaling server | 4-digit room code | Ephemeral in-process map | No profile; parse errors are logged without the payload |

Anything with the `fokus.` prefix is owned by the app. Unknown keys with that prefix still show up in the inventory and are deleted on a factory wipe.

Not stored: email, password, contacts, precise GPS, payment data, spoken transcripts, duel ICE candidates.

The default profile name is `User`. A real name exists only if onboarding saved `displayName`.

## Inventory

`inventoryLocalData(store)` is a pure read. It:

1. Walks the catalog in `KNOWN_STORES`.
2. Adds any extra `fokus.*` keys the backend can list.
3. Reports byte size (UTF-8), whether the slot *may* hold PII, and whether PII is *present now*.

The settings panel renders that list plus a static Cache Storage row. Totals are local; nothing is sent.

Backends should implement `keys()`. If they do not, the catalog is probed by `getItem` so tests and older wrappers still work.

## Export redaction

`exportJson()` stays a raw dump (import round-trip). `exportJson({ redact: true })` and `buildExportFile(raw, true)` produce the same `AppState` shape with:

- `profile.name` → `User`
- `profile.displayName` removed
- `profile.lastLifestyle` removed
- `daySummaries[].lifestyle` removed

Sessions, XP, domain scores, and timestamps stay — they are the training record, not a name. A corrupt blob is replaced with `{ profile: { name: "User" } }` instead of echoing the raw string.

Default in Settings: redacted. Filename `fokus-data-YYYY-MM-DD.json`. Unchecking the box downloads `fokus-data-YYYY-MM-DD-full.json`. A redacted file is still a valid import.

## Wipe / reset

| Action | What remains | Confirm |
| --- | --- | --- |
| Убрать имя | Sessions, XP, lifestyle | One click |
| Удалить сон и стресс | Name, sessions | One click |
| Сбросить прогресс | Theme, language, sound, duration, goal, reminder hour, onboarded | In-panel «Да, сбросить прогресс» |
| Удалить все данные | Nothing Fokus-owned | Type `УДАЛИТЬ`, then confirm. Also deletes `fokus-*` caches |

Factory wipe removes every `fokus.*` key, not only `fokus.v1`. Service worker registration stays (that is the app, not the person). Notification permission is a browser setting and cannot be revoked from script.

Progress reset does **not** use `window.confirm`. Factory wipe does **not** accept lowercase `удалить`.

## Logs

`safeError` / `redactForLog`:

- Replace values of `name`, `displayName`, `lastLifestyle`, `lifestyle`, `email`, `phone`, `sdp`, `candidate`, `ice`
- Replace emails inside strings
- Log `Error` as `{ name, message }` after the same pass
- Never interpolate raw `e.message` into the DOM (init / navigate show a generic line)

Call sites: storage migration, SW register, session unknown-id, signaling parse (no payload). ICE/SDP from WebRTC are not printed.

## UX

Settings → **Приватность и данные** (Russian product voice, same as the rest of the screen):

- Short local-first notice
- Inventory list with size and PII tags
- Redacted-export checkbox (on)
- Export / import
- Clear name, clear lifestyle, reset progress, factory wipe

The lifestyle prompt still has «Не спрашивать про сон и стресс»; the panel explains those answers never leave the device.

Copy does not call Fokus a medical device. The existing disclaimer under settings stays.

No new exercises. `registry.ts` is untouched.

## Non-copy notes

This is original Fokus data hygiene. It is not a privacy-policy clone of Wikium, Peak, Elevate, Lumosity, or NeuroNation, and it does not add a cloud account «to be GDPR-shaped».

## Files

| Path | Role |
| --- | --- |
| `src/core/privacy.ts` | Catalog, inventory, redact, wipe, log sanitizer |
| `src/core/log.ts` | `safeError` / `safeWarn` |
| `src/core/storage.ts` | `keys()`, redacted export, `reset` / `resetProgress` / `clearPii` |
| `src/core/reminders.ts` | Shared `REMINDER_LAST_KEY` |
| `src/ui/screens/settings.ts` | Privacy panel |
| `src/main.ts` / `src/ui/screens/session.ts` / `server/signaling.js` | No raw PII in logs or error DOM |
| `src/styles.css` | Inventory / wipe confirm |
| `tests/privacy.test.ts` | Core |
| `tests/privacy-ui.test.ts` | Settings |
| `tests/storage.test.ts` | Reset + redacted export |

## Verification

```bash
npm test
npm run build
```

## Out of scope

- New exercises / `registry.ts`
- Moving state to IndexedDB
- Cloud sync or an account
- Revoking browser notification permission
- Merging this PR without review
