import { afterEach, describe, expect, test } from 'vitest';
import { setLocale } from '../src/core/i18n';
import { budgetReason, explainComposition, primaryCta, type BudgetSource } from '../src/core/daily-plan';
import { planReasonText, slotLabelText } from '../src/core/plan-copy';
import { SLOT_LABEL, SLOT_REASON } from '../src/core/engine';
import { summarizeSession } from '../src/core/session-summary';
import { exerciseName, exerciseInstruction } from '../src/core/exercise-copy';
import { registry } from '../src/exercises/manifest-registry';
const getManifest = (id: string) => registry.find((r) => r.manifest.id === id)?.manifest;
import { CORE_EXERCISE_IDS } from '../src/core/core-catalog';

const CYR = /[А-Яа-яЁё]/;

afterEach(() => setLocale('ru'));

describe('English copy on the main path', () => {
  test('plan explanation, CTA and budget reasons are English and keep the numbers', () => {
    setLocale('en');
    const text = explainComposition([{ domain: 'attention' }, { domain: 'memory' }, { domain: 'logic' }], 2, 300);
    expect(text).not.toMatch(CYR);
    expect(text).toMatch(/Day 2 of 14/);
    expect(text).toMatch(/3 blocks ≈ 5 min/);
    expect(primaryCta()).toBe("Today's workout");
    for (const s of ['profile', 'first-week', 'soft-return', 'retention', 'recovery', 'resume'] as BudgetSource[]) {
      expect(budgetReason(s)).not.toMatch(CYR);
    }
  });

  test('Russian stays the default and unchanged', () => {
    setLocale('ru');
    expect(primaryCta()).toBe('Тренировка на сегодня');
    expect(explainComposition([{ domain: 'attention' }], 1, 120)).toMatch(/День 1 из 14/);
  });

  test('every engine slot label and reason renders in English', () => {
    setLocale('en');
    const reasons = [
      ...Object.values(SLOT_REASON),
      'Смена контекста для прорыва', 'Ваша цель: день 3 (сбор данных)', 'Неделя 2: цель и отстающий навык',
      'Неделя 1: работа над целью', 'Фокус 2-й недели', 'Фокус недели', 'Сбор данных для адаптации', 'День 4: акцент на отстающий навык'
    ];
    for (const r of reasons) expect(planReasonText(r)).not.toMatch(CYR);
    expect(planReasonText('День 4: акцент на отстающий навык')).toBe('Day 4: focus on the weakest skill');
    for (const l of Object.values(SLOT_LABEL)) expect(slotLabelText(l)).not.toMatch(CYR);
    expect(planReasonText('незнакомая причина')).toBe('Picked for your plan');
  });

  test('core exercises have English names and instructions', () => {
    setLocale('en');
    for (const id of CORE_EXERCISE_IDS) {
      const m = getManifest(id)!;
      expect(exerciseName(m)).not.toMatch(CYR);
      expect(exerciseInstruction(m)).not.toMatch(CYR);
    }
  });

  test('session summary is English', () => {
    setLocale('en');
    const session = { id: 's', startedAt: '2026-11-12T09:00:00Z', mode: 'normal', items: [{ exerciseId: 'odd-one', accuracy: 0.8, score: 10, level: 1 }] } as any;
    const s = summarizeSession({ session, sessions: [session], nameOf: (id) => exerciseName(getManifest(id)!), nextDurationSec: 300, calibration: false });
    expect(s.observation + s.nextStep).not.toMatch(CYR);
  });
});
