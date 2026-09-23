# AGY_TASK — Wave AA / Zone AA1 — Exercises Batch
Ты руки Fokus. Worktree: `/workspace/developer/github/fokus-wt/A1`. Ветка уже `feature/agy-wave-AA1` от origin/main (387f9ca). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу и выполни до конца (commit + push + gh pr create).

## Wave AA · Zone AA1 — Exercises Batch
**Goal:** добавить ровно 3 новых playable игры с уникальными kebab-case id, подключить в registry + тесты. Каталог/метаданные — только если этого требует контракт registry.

### ALLOWED paths (STRICT — only edit these)
- новые файлы упражнений в `src/exercises/*.ts` (и подпапки при необходимости)
- `src/exercises/registry.ts`
- `src/exercises/catalog.ts` — ONLY если registry contract требует metadata entries
- тесты, покрывающие ТОЛЬКО новые игры / registry wiring

### FORBIDDEN paths (do NOT touch)
- UI screens (`src/ui/screens/**`)
- coach / today: `src/core/coach.ts`, `src/core/coach-intel.ts`, `src/ui/screens/today.ts`
- `src/ui/screens/session.ts` (это AA6)
- AA2 onboarding, AA3 quests/achievements, AA4 duel, AA5 PWA/offline
- Do NOT merge any PR. Do NOT touch other worktrees/branches.

## Success criteria
1. Ровно 3 новых playable games, unique kebab-case ids, wired into registry + tests.
2. `npm test` и `npm run build` green.
3. Ровно один clean commit (НЕ коммить AGY_TASK.md). Push `feature/agy-wave-AA1` to origin.
4. `gh pr create` с title `AA1: …` (описательный). Body: «Не мержить без ревью».
5. Account: work as cuwozaka823@gmail.com. If Individual/5h quota hits — STOP immediately, do not refill.

## Rules
- Autonomous, no questions. Russian UI copy. No fake brain-improvement claims.
- Stay in zone. Open PR when done; never merge.
