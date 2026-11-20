# Hermes task C — Moscow-day conversion in fokus

Branch: `hermes/moscow-days` (from `origin/main` @ `7b726a2`)

## What was already done (context)

PRs [#370](https://github.com/zarmih/fokus/pull/370) (`11f43b7`) and
[#377](https://github.com/zarmih/fokus/pull/377) (`c085bbd`) introduced the
Europe/Moscow civil-day helper in `src/core/streak.ts` and converted
`recovery.ts` / `reminders.ts`:

- `resolveFokusTimeZone(explicit?)` → `src/core/streak.ts:104`
- `calendarDayKey(instant, timeZone)` → `src/core/streak.ts:121`
- `addCalendarDays(day, delta)` → `src/core/streak.ts:173`
- `daysBetween(fromDay, toDay)` → `src/core/streak.ts:169`
- `fokusWallHour(...)` → `src/core/streak.ts:150`

A repo-wide grep for the UTC-day smells named in the task
(`toISOString().slice(0,10)`, `toISOString().split('T')[0]`, `getUTCDate`,
`setUTCHours`, `Date.UTC` used for a day key, `T00:00:00Z`) shows that the
**bulk of `src/` is already converted** — and is now guarded by
`tests/tz-drift-guard.test.ts`, which fails the build on any new
`toISOString().slice(0,10)` / local `get|setHours|Date|Month|Year` in `src/`
(ALLOWLIST is empty).

`onboarding.ts` (named in the task as a known case) is **already converted** —
`dateOnly` / `dayKey` / `daysBetween` delegate to the Moscow helper at
`src/core/onboarding.ts:106`, `:111`, `:113` (see also
`tests/onboarding-dateonly-moscow.test.ts`). No change was needed there.

## What was still wrong

The remaining leaks are not "produce a day key with UTC getters". They are
**raw-vs-civil mixing**: a stored `DaySummary.date` is frequently a full ISO
*instant* (`session.ts:556`, `:576` write `date: sessionStartedAt`), and three
call sites compared that raw string against an already-Moscow `YYYY-MM-DD` key.
String comparison silently "works" for same-UTC-day rows and silently mis-buckets
every row written between 21:00 and 23:59 UTC — exactly the window the task asks
about.

### 1. `src/core/continuity.ts` — `evaluateDomainWorkload`

| | |
|---|---|
| before | `src/core/continuity.ts:295` — `summaries.find(x => x.date === d)` where `d` is a Moscow civil day |
| after | `src/core/continuity.ts:289`, `:296-300`, `:304` — new `timeZone` param (default `resolveFokusTimeZone().timeZone`); summaries bucketed into a `Map` via `calendarDayKey(s.date, timeZone)` |

Call site updated: `src/core/continuity.ts:346` passes `resolved.timeZone`.

Effect of the bug: with ISO-dated summaries the lookup never matched, so
`hits` stayed empty → `recentDomains: []`, **every** domain reported as
`neglected`. `workload.fatigued` feeds `adaptive-plan.ts:34-40` (fatigue-based
rest) and `today.ts:238`, so the plan silently lost its fatigue signal.

### 2. `src/core/fokus-index.ts` — `previousFokusIndex`

| | |
|---|---|
| before | `src/core/fokus-index.ts:147` — `.filter((s) => !today || s.date < (targetDate \|\| today))` (raw string compare), no ordering guarantee |
| after | `src/core/fokus-index.ts:149-150` — compares `fokusDayKey(s.date) < targetDate` and sorts by `fokusDayKey` |

Effect of the bug: a row written at 21:30Z is *today* in Moscow but its raw
`2026-10-03T21:30:00.000Z` sorts **below** the civil key `2026-10-04`, so it was
returned as "previous". Repro before the fix: `previousFokusIndex` returned
`999` (today's value) where `200` (yesterday) was correct. The added `sort`
also makes the result independent of input array order — the old code returned
whichever row happened to be last.

### 3. `src/core/analytics/methodology.ts` — `assessDataSufficiency.daysSinceLast`

| | |
|---|---|
| before | `src/core/analytics/methodology.ts:126` — `Math.floor((now - lastMs) / DAY_MS)` (elapsed 24h blocks) |
| after | `src/core/analytics/methodology.ts:110`, `:130` — `daysBetween(calendarDayKey(lastMs), calendarDayKey(now))` in `resolveFokusTimeZone().timeZone` |

Effect of the bug: a block at 23:00 MSK and `now` at 00:30 MSK are 1 civil day
apart but 0.06 elapsed days → reported `daysSinceLast = 0` and the fact string
claimed "последний сегодня". `daysSinceLast` drives the
`enough` (≤7) / `partial` (≤14) sufficiency thresholds at `:134-135` and the
human-readable fact at `:142-143`.

## Spots deliberately left on UTC / elapsed time

| Location | Why left alone |
|---|---|
| `src/core/engine/math.ts:52-66` (`daysBetween`, `addDaysIso`) | Spacing/repetition intervals in the SM-2 scheduler are **elapsed-time** quantities (`daysLate >= 0.5` at `scheduler.ts:41`), not calendar-day keys. Converting would change review scheduling. |
| `src/core/engine/ability.ts:304` | `dueAt = lastPlayedAt + interval * 86400000` — same elapsed-interval semantics as above. |
| `src/core/catalog-recency.ts:16-21` | "days since last played" recency buckets for the trainer list; elapsed-time by design, no calendar boundary involved. |
| `src/core/analytics/methodology.ts:109`, `:204` | 28-day / 56-day *observation windows* (`now - 28 * DAY_MS`). These are sliding elapsed windows for sampling, not day keys; the civil-day fix above only applies to the day-granularity `daysSinceLast`. |
| `src/core/session-builder.ts:115` | `daysSinceUpdate > 7` novelty heuristic on elapsed hours; a "has this skill gone stale" nudge, not a calendar-day claim. |
| `src/core/time-zone-choice.ts:19` | `Date.UTC(...)` reconstructs a wall-clock timestamp from `formatToParts` output in order to *measure* a zone offset. Using anything else would defeat the purpose. |
| `src/core/reminders.ts:203-208` | `Date.UTC` inside `instantAtWall`, the inverse direction (Moscow wall clock → UTC instant). Required for correctness. |
| `src/core/streak.ts:165-177` | `utcNoonMs` / `addCalendarDays` operate on **`YYYY-MM-DD` strings**, not instants — UTC noon is used precisely so the arithmetic is DST-proof and zone-free. |
| `src/core/reminders.ts:29-30` | `fokusRotationDay` converts an already-Moscow day key into a day ordinal; the key is produced by `calendarDayKey` on line 27. |
| `src/ui/screens/progress.ts:71`, `weekly-review.ts:31/49` | `new Date(\`${civilDay}T12:00:00Z\`)` + `Intl` — the input is a civil day, and UTC noon renders the same weekday label in every zone. |
| `src/core/quests.ts:290-291` | `mondayOfMoscowWeek` derives the weekday of an already-Moscow civil key via a UTC-noon `Date`; no instant is involved. |
| `src/ui/screens/today.ts:207` | `toLocaleDateString` with explicit `timeZone: resolveFokusTimeZone().timeZone` — already zone-correct. |
| `src/ui/screens/result.ts:49` | `dsList.find(d => d.date === session.startedAt)` — deliberately an **exact instant** match against the row this session just wrote (same `startedAt` string), not a day comparison. |
| `src/ui/screens/today.ts:148` | `snoozeData.date === todayStr` — both sides are Moscow civil keys (`todayStr = snap.today`), and the snooze record is written from the same `todayStr` on line 612. |
| `src/core/offline-sync.ts:525/535/606` | Merge keys for day-summary/history rows — identity of a stored row, not a day computation. Rewriting these would change dedup semantics across devices. |
| `src/core/coach-intel.ts:155/182`, `retention.ts:141` | Sort orderings by `.date` string; `collapseSummaries`/`isoDay` re-key each row afterwards (`coach-intel.ts:157`), so ordering is cosmetic. |
| `src/core/coach-intel.ts:291/313/384/759` | Compare two values that are both already civil keys produced by `toDateKey`. |
| `src/ui/screens/settings.ts:555`, `result.ts:449` | `seriesGoalStartedAt` / `lastFeedback.date` are stored instants consumed as instants (or not at all), never used as day keys. |

## Tests added

`tests/moscow-civil-day-leaks.test.ts` — 9 tests, all pinned to the
21:00–23:59Z window:

- fixture sanity: both `20:59:59Z` and `21:30Z` share UTC date `2026-10-03`
- `previousFokusIndex` ignores the post-midnight row (returns yesterday's `200`, not `999`)
- `previousFokusIndex` still accepts a `20:59:59Z` row as yesterday
- `previousFokusIndex` is order-independent (newest-first input)
- `daysSinceLast` = 1 for 23:00 MSK → 00:30 MSK
- `daysSinceLast` = 0 within one Moscow day
- `daysSinceLast` = 6 for an all-noon-UTC fixture (historical answer preserved)
- `buildContinuitySnapshot` sees `fatigued: [attention, memory]` behind ISO timestamps
- `evaluateDomainWorkload` is explicit about its zone (UTC vs Moscow diverge)

## Verification (real output)

```
$ flock /tmp/heavy-gate.lock npx vitest run tests/moscow-civil-day-leaks.test.ts \
    tests/moscow-day-boundary.test.ts tests/onboarding-dateonly-moscow.test.ts \
    tests/onboarding-moscow.test.ts tests/fokus-index.test.ts \
    tests/fokus-index-band.test.ts tests/analytics-methodology.test.ts \
    tests/continuity.test.ts tests/tz-drift-guard.test.ts tests/recovery.test.ts \
    tests/retention-moscow.test.ts tests/coach-intel-moscow.test.ts

 ✓ tests/retention-moscow.test.ts (6 tests) 22ms
 ✓ tests/onboarding-dateonly-moscow.test.ts (10 tests) 69ms
 ✓ tests/fokus-index-band.test.ts (5 tests) 11ms
 ✓ tests/analytics-methodology.test.ts (10 tests) 110ms
 ✓ tests/moscow-day-boundary.test.ts (6 tests) 101ms
 ✓ tests/tz-drift-guard.test.ts (2 tests) 32ms
 ✓ tests/fokus-index.test.ts (7 tests) 23ms
 ✓ tests/continuity.test.ts (14 tests) 17ms
 ✓ tests/recovery.test.ts (12 tests) 24ms
 ✓ tests/onboarding-moscow.test.ts (4 tests) 17ms
 ✓ tests/moscow-civil-day-leaks.test.ts (9 tests) 15ms
 ✓ tests/coach-intel-moscow.test.ts (6 tests) 12ms

 Test Files  12 passed (12)
      Tests  91 passed (91)
  Duration  1.85s
```

Full suite (no filter):

```
$ flock /tmp/heavy-gate.lock npx vitest run

 Test Files  165 passed (165)
      Tests  1189 passed (1189)
  Duration  23.17s
```

Same targeted set under a non-UTC host timezone:

```
$ flock /tmp/heavy-gate.lock env TZ=America/New_York npx vitest run \
    tests/moscow-civil-day-leaks.test.ts tests/analytics-methodology.test.ts \
    tests/continuity.test.ts tests/fokus-index.test.ts

 ✓ tests/continuity.test.ts (14 tests) 19ms
 ✓ tests/fokus-index.test.ts (7 tests) 10ms
 ✓ tests/moscow-civil-day-leaks.test.ts (9 tests) 15ms
 ✓ tests/analytics-methodology.test.ts (10 tests) 141ms

 Test Files  4 passed (4)
      Tests  40 passed (40)
```

Typecheck:

```
$ flock /tmp/heavy-gate.lock npx tsc --noEmit
$ echo $?
0
```

(no output — clean)

## Files changed

- `src/core/continuity.ts` (+17 / −4)
- `src/core/fokus-index.ts` (+5 / −1)
- `src/core/analytics/methodology.ts` (+6 / −1)
- `tests/moscow-civil-day-leaks.test.ts` (new, 9 tests)
- `docs/HERMES_MOSCOW_DAYS.md` (this file)

Nothing else in `src/` was touched; `onboarding.ts` required no change.