# AGY_TASK — Wave AA / Zone AA3 — Quests / achievements
Ты руки Fokus. Worktree: `/workspace/developer/github/fokus-wt/A3`. Ветка уже `feature/agy-wave-AA3` от origin/main (387f9ca). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу и выполни до конца (commit + push + gh pr create).

## Wave AA · Zone AA3 — Quests / achievements
**Goal:** усилить quests + achievements: осмысленный прогресс, без переписывания progress/index (это Wave Z3).

### ALLOWED paths (STRICT)
- `src/core/quests.ts`
- `src/core/achievements.ts`
- related UI только если уже есть dedicated surface для quests/achievements
- иначе: core + small progress hooks без rewrite `src/ui/screens/progress.ts` / fokus-index
- тесты для вышеуказанного

### FORBIDDEN paths
- AA1 exercises/registry
- AA2 onboarding
- AA4 duel
- AA5 PWA/offline
- AA6 session a11y
- Не переписывать `src/ui/screens/progress.ts`, `src/core/fokus-index.ts`, weekly-review (Z3)
- Do NOT merge PRs

## Success criteria
1. Quests/achievements ощутимо полезнее для retention/progress feedback.
2. `npm test` + `npm run build` green.
3. One clean commit (no AGY_TASK.md). Push `feature/agy-wave-AA3`.
4. `gh pr create` title `AA3: …`. Body: «Не мержить без ревью».
5. Quota → STOP, no refill.

## Rules
Autonomous. Russian UI. Stay in zone. Never merge.
