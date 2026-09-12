import { storage } from '../../core/storage';
import { catalog, getManifest } from '../../exercises/catalog';
import { renderShell } from '../shell';
import { navigateTo } from '../router';
import { transferCardFromStorage } from '../components/transfer-card';
import { planForNow } from '../../core/adaptive-plan';
import { getLocale, t } from '../../core/i18n';
import { buildWeeklyReport } from '../../core/weekly-report';
import { renderWeeklyG18 } from '../components/weekly-report-view';
import { shareWeeklyCard } from '../components/weekly-share-card';
import { setScreenTitle } from '../a11y';

function catalogDomainMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of catalog) {
    map[entry.manifest.id] = entry.manifest.domain;
  }
  return map;
}

export function renderWeeklyReview(container: HTMLElement) {
  const content = renderShell(container, { active: 'progress', hideNav: true });
  const locale = getLocale();
  setScreenTitle(t('weekly.title', undefined, locale));

  const now = new Date();
  const allSummaries = storage.getDaySummaries(60);
  const allSessions = storage.getSessions();
  const report = buildWeeklyReport({
    sessions: allSessions,
    daySummaries: allSummaries,
    domains: storage.getDomains(),
    now,
    domainByExercise: catalogDomainMap(),
    locale
  });

  const totalSessions = report.glance.sessions;
  const g18 = renderWeeklyG18(report);

  const insightHtml = totalSessions > 0 ? transferCardFromStorage({ prefer: 'week' }) : '';

  const profile = storage.getProfile();
  const plan = planForNow({ durationSec: profile.sessionLengthSec });

  let nextStepHtml = '';
  if (plan.items.length > 0) {
    const nextItem = plan.items[0];
    const nextEx = getManifest(nextItem.exerciseId);
    if (nextEx) {
      nextStepHtml = `
        <div class="surface" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%);">
          <h3 style="margin-bottom: 16px;">${t('weekly.next_step', undefined, locale)}</h3>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 16px; font-weight: 700; color: var(--accent); margin-bottom: 4px;">${nextEx.name}</div>
              <div style="font-size: 13px; color: var(--text); opacity: 0.8;">${nextItem.reason}</div>
            </div>
            <img src="${import.meta.env.BASE_URL}art/icon-${nextEx.id}.svg" alt="" width="40" height="40" style="border-radius: 8px; opacity: 0.9;">
          </div>
        </div>
      `;
    }
  }

  content.innerHTML = `
    <div class="week-report" role="region" aria-label="${t('weekly.a11y_report', undefined, locale)}">
    <div style="display: flex; align-items: center; margin-bottom: 24px;">
      <button id="btn-back" class="btn-tiny" style="margin-right: 16px; margin-bottom: 0;">← Назад</button>
      <div>
        <h2 style="margin: 0; font-size: 20px;">${t('weekly.title', undefined, locale)}</h2>
        <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">${report.periodLabel}</div>
      </div>
    </div>
    
    ${g18.head}
    ${insightHtml}
    ${nextStepHtml}
    ${g18.share}
    </div>
  `;

  content.querySelector('#btn-back')?.addEventListener('click', () => {
    navigateTo('progress');
  });

  content.querySelector('#btn-week-share')?.addEventListener('click', () => {
    void shareWeeklyCard(report);
  });
}
