import { expect, test, beforeEach, vi } from 'vitest';
import { setLocale } from '../src/core/i18n';
import { buildWeeklyReport, formatWeeklyShareText } from '../src/core/weekly-report';
import { shareWeeklyCard, WEEKLY_SHARE_TEXT_FILENAME } from '../src/ui/components/weekly-share-card';
import type { Session } from '../src/core/types';

beforeEach(() => {
  setLocale('ru');
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

function report() {
  const session: Session = {
    id: 's1',
    startedAt: '2026-09-06T10:00:00Z',
    finishedAt: '2026-09-06T10:05:00Z',
    durationSec: 300,
    items: [{ exerciseId: 'grid-memory', level: 1, accuracy: 0.8, avgRtMs: 900, score: 40 }]
  };
  return buildWeeklyReport({
    sessions: [session],
    daySummaries: [{
      date: '2026-09-06T10:00:00Z',
      totalScore: 40,
      domainDeltas: { memory: 4 },
      streak: 1,
      skipped: false
    }],
    domains: [{ domain: 'memory', value: 400, updatedAt: '2026-09-06' }],
    now: new Date('2026-09-06T12:00:00Z'),
    locale: 'ru'
  });
}

test('shareWeeklyCard downloads a local file and never calls share or fetch', async () => {
  const downloads: string[] = [];
  const share = vi.fn();
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('navigator', { ...navigator, share, canShare: vi.fn() });
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:fokus-week',
    revokeObjectURL: () => {}
  });

  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    downloads.push(this.download);
  };
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof getContext;

  const result = await shareWeeklyCard(report());
  HTMLAnchorElement.prototype.click = click;
  HTMLCanvasElement.prototype.getContext = getContext;

  expect(result === 'downloaded' || result === 'text').toBe(true);
  expect(downloads.length).toBe(1);
  expect(downloads[0] === 'fokus-week.png' || downloads[0] === WEEKLY_SHARE_TEXT_FILENAME).toBe(true);
  expect(share).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('share text is a local summary, not a network payload', () => {
  const text = formatWeeklyShareText(report());
  expect(text).toContain('Fokus');
  expect(text).toMatch(/локальн/);
  expect(text).not.toMatch(/https?:\/\//);
});
