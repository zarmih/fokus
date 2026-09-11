import { describe, expect, test } from 'vitest';
import {
  applyTick,
  assignPoints,
  awardsPoint,
  BOUT_DURATION_SEC,
  BOUT_TARGET_POINTS,
  closeOnTime,
  createBout,
  describeMatch,
  duelantFromLocal,
  forfeit,
  formatCooldown,
  matchQuality,
  newBoutId,
  openingPoints,
  pairId,
  parseSpectatorSummary,
  POINT_ACCURACY_THRESHOLD,
  preferredDuelDomain,
  rankOpponents,
  REMATCH_COOLDOWN_MS,
  rematchStatus,
  safeAlias,
  serializeSpectatorSummary,
  setPoints,
  spectatorSummary,
  type Duelant
} from '../src/core/duelIntel';

function duelant(over: Partial<Duelant> & Pick<Duelant, 'id' | 'fokusIndex'>): Duelant {
  return {
    alias: over.alias ?? over.id,
    domainAbility: over.domainAbility ?? {
      attention: 700,
      memory: 680,
      speed: 650,
      flexibility: 640,
      logic: 630
    },
    lastBoutAt: over.lastBoutAt ?? null,
    id: over.id,
    fokusIndex: over.fokusIndex
  };
}

describe('aliases and ids', () => {
  test('safeAlias never leaks an email', () => {
    expect(safeAlias('ada@example.com')).toBe('ada');
    expect(safeAlias('')).toBe('Игрок');
    expect(safeAlias('Михаил Фокусник')).toBe('Михаил Фокусник');
    expect(safeAlias('x'.repeat(40)).length).toBe(24);
  });

  test('pairId is order-invariant', () => {
    expect(pairId('a', 'b')).toBe(pairId('b', 'a'));
  });

  test('duelantFromLocal uses display name and drops empty domains', () => {
    const d = duelantFromLocal({
      profile: { name: 'User', displayName: 'Михаил' },
      fokusIndex: 512,
      domains: [
        { domain: 'attention', value: 800, updatedAt: 'x' },
        { domain: 'memory', value: 0, updatedAt: 'x' }
      ]
    });
    expect(d.alias).toBe('Михаил');
    expect(d.domainAbility.attention).toBe(800);
    expect(d.domainAbility.memory).toBeUndefined();
  });
});

describe('matchmaking', () => {
  test('equal index and domains is a fair high-quality match', () => {
    const a = duelant({ id: 'a', fokusIndex: 500 });
    const b = duelant({ id: 'b', fokusIndex: 505 });
    const q = matchQuality(a, b);
    expect(q.fair).toBe(true);
    expect(q.playable).toBe(true);
    expect(q.handicap).toBe(0);
    expect(q.score).toBeGreaterThan(0.8);
  });

  test('large index gap is unfair and gives the weaker a start point', () => {
    const a = duelant({ id: 'a', fokusIndex: 420 });
    const b = duelant({ id: 'b', fokusIndex: 620 });
    const q = matchQuality(a, b);
    expect(q.fair).toBe(false);
    expect(q.playable).toBe(true);
    expect(q.weakerId).toBe('a');
    expect(q.handicap).toBe(1);
    expect(openingPoints(q, ['a', 'b']).a).toBe(1);
    expect(openingPoints(q, ['a', 'b']).b).toBe(0);
  });

  test('extreme gap is not playable', () => {
    const q = matchQuality(
      duelant({ id: 'a', fokusIndex: 100 }),
      duelant({ id: 'b', fokusIndex: 900 })
    );
    expect(q.playable).toBe(false);
    expect(q.handicap).toBe(0);
  });

  test('preferred domain is the closest shared ability', () => {
    const a = duelant({
      id: 'a',
      fokusIndex: 500,
      domainAbility: { attention: 800, memory: 400, speed: 500, flexibility: 500, logic: 500 }
    });
    const b = duelant({
      id: 'b',
      fokusIndex: 500,
      domainAbility: { attention: 200, memory: 410, speed: 900, flexibility: 100, logic: 100 }
    });
    expect(preferredDuelDomain(a, b)).toBe('memory');
  });

  test('rankOpponents prefers fair ready opponents over cooling-down ones', () => {
    const self = duelant({ id: 'me', fokusIndex: 500 });
    const now = new Date('2026-09-11T12:00:00Z');
    const ranked = rankOpponents(self, [
      duelant({ id: 'far', fokusIndex: 880 }),
      duelant({ id: 'close', fokusIndex: 510 }),
      duelant({ id: 'hot', fokusIndex: 502, lastBoutAt: new Date(now.getTime() - 60_000).toISOString() })
    ], now);
    expect(ranked.map((r) => r.opponent.id)).toEqual(['close', 'hot']);
    expect(ranked[0].quality.fair).toBe(true);
    expect(ranked[1].rematch.allowed).toBe(false);
  });
});

describe('bout scoring', () => {
  test('a round awards a point at the accuracy threshold only', () => {
    expect(awardsPoint(POINT_ACCURACY_THRESHOLD)).toBe(true);
    expect(awardsPoint(POINT_ACCURACY_THRESHOLD - 0.01)).toBe(false);
  });

  test('first to target wins', () => {
    let bout = createBout(['me', 'opp'], { startedAtMs: 0 });
    expect(bout.targetPoints).toBe(BOUT_TARGET_POINTS);
    expect(bout.durationSec).toBe(BOUT_DURATION_SEC);
    bout = applyTick(bout, { playerId: 'me', accuracy: 0.9, avgRtMs: 400, atMs: 1000 });
    bout = applyTick(bout, { playerId: 'me', accuracy: 0.5, avgRtMs: 400, atMs: 2000 });
    bout = applyTick(bout, { playerId: 'me', accuracy: 0.95, avgRtMs: 400, atMs: 3000 });
    bout = applyTick(bout, { playerId: 'me', accuracy: 0.99, avgRtMs: 400, atMs: 4000 });
    expect(bout.points.me).toBe(3);
    expect(bout.finished).toBe(true);
    expect(bout.winnerId).toBe('me');
    expect(bout.reason).toBe('target');
  });

  test('time expiry with equal points is a draw — not a host-side win', () => {
    let bout = createBout(['me', 'opp'], { startedAtMs: 0 });
    bout = setPoints(bout, 'me', 1);
    bout = setPoints(bout, 'opp', 1);
    bout = closeOnTime(bout, BOUT_DURATION_SEC * 1000);
    expect(bout.finished).toBe(true);
    expect(bout.reason).toBe('draw');
    expect(bout.winnerId).toBeNull();
  });

  test('time expiry with a lead names a winner', () => {
    let bout = createBout(['me', 'opp'], { startedAtMs: 0 });
    bout = setPoints(bout, 'me', 2);
    bout = closeOnTime(bout, 60_000);
    expect(bout.winnerId).toBe('me');
    expect(bout.reason).toBe('time');
  });

  test('forfeit awards the other player', () => {
    const bout = forfeit(createBout(['me', 'opp']), 'me');
    expect(bout.winnerId).toBe('opp');
    expect(bout.reason).toBe('forfeit');
  });

  test('ticks after finish are ignored', () => {
    let bout = createBout(['me', 'opp']);
    bout = setPoints(bout, 'me', 3);
    const frozen = applyTick(bout, { playerId: 'opp', accuracy: 1, avgRtMs: 200, atMs: 10 });
    expect(frozen.points.opp ?? 0).toBe(0);
  });

  test('assignPoints records both scores before settling', () => {
    const bout = assignPoints(createBout(['me', 'opp']), { me: 3, opp: 2 });
    expect(bout.points.me).toBe(3);
    expect(bout.points.opp).toBe(2);
    expect(bout.winnerId).toBe('me');
  });
});

describe('rematch cooldown', () => {
  test('blocks for 15 minutes then allows', () => {
    const t0 = new Date('2026-09-11T12:00:00Z');
    const last = t0.toISOString();
    const blocked = rematchStatus(last, new Date(t0.getTime() + 5 * 60 * 1000));
    expect(blocked.allowed).toBe(false);
    expect(blocked.remainingMs).toBe(10 * 60 * 1000);
    expect(formatCooldown(blocked.remainingMs)).toMatch(/10 мин/);
    const open = rematchStatus(last, new Date(t0.getTime() + REMATCH_COOLDOWN_MS));
    expect(open.allowed).toBe(true);
    expect(rematchStatus(null, t0).allowed).toBe(true);
  });
});

describe('spectator-safe summary', () => {
  test('omits reaction times, ids and emails', () => {
    let bout = createBout(['u1', 'u2'], { startedAtMs: 0 });
    bout = assignPoints(bout, { u1: 3, u2: 2 });
    const summary = spectatorSummary({
      boutId: newBoutId(new Date('2026-09-11T12:00:00Z')),
      domain: 'speed',
      durationSec: 54,
      state: bout,
      aliases: { u1: 'ada@hidden.test', u2: 'Соперник' },
      fairMatch: true
    });
    const blob = JSON.stringify(summary);
    expect(blob).not.toMatch(/avgRt|avgRtMs|userId|u1@|hidden\.test|webrtc|candidate/i);
    expect(summary.fighters[0].alias).toBe('ada');
    expect(summary.outcome).toBe('win');
    expect(summary.winnerAlias).toBe('ada');
    expect(summary.closeFinish).toBe(true);
    expect(summary.fairMatch).toBe(true);
    expect(summary).not.toHaveProperty('ticks');
  });

  test('round-trips through serialize/parse and drops junk', () => {
    const raw = serializeSpectatorSummary({
      boutId: 'bout-1',
      domain: 'logic',
      durationSec: 60,
      outcome: 'draw',
      winnerAlias: null,
      fighters: [{ alias: 'А', points: 1 }, { alias: 'Б', points: 1 }],
      closeFinish: true,
      fairMatch: null
    });
    const parsed = parseSpectatorSummary(raw);
    expect(parsed?.outcome).toBe('draw');
    expect(parsed?.fairMatch).toBeNull();
    expect(parseSpectatorSummary('not-json')).toBeNull();
    expect(parseSpectatorSummary('{}')).toBeNull();
  });

  test('describeMatch stays free of Peak/Wikium tropes', () => {
    const fair = describeMatch(matchQuality(duelant({ id: 'a', fokusIndex: 500 }), duelant({ id: 'b', fokusIndex: 505 })));
    expect(fair).toMatch(/Близкий уровень/);
    expect(fair).not.toMatch(/нейрофитнес|прокачай|brain|лига чемпионов/i);
  });
});
