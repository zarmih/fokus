import { feedbackPrivacyBlurb, type FeedbackKind } from '../../core/product-feedback';
import {
  feedbackExportText,
  loadFeedback,
  setLocalAnalyticsOptIn,
  submitFeedback
} from '../../core/feedback-io';

const KINDS: { id: FeedbackKind; label: string }[] = [
  { id: 'idea', label: 'Идея' },
  { id: 'bug', label: 'Сбой' },
  { id: 'praise', label: 'Спасибо' },
  { id: 'other', label: 'Другое' }
];

export function renderFeedbackPanel(host: HTMLElement, opts?: { screen?: string; softReturn?: boolean }) {
  const store = loadFeedback();
  host.innerHTML = `
    <div class="surface feedback-panel" role="region" aria-labelledby="fb-title" style="margin-top: 16px;">
      <h3 id="fb-title" style="margin: 0 0 6px; font-size: 16px;">Обратная связь</h3>
      <p class="muted" style="font-size: 13px; line-height: 1.45; margin-bottom: 12px;">${feedbackPrivacyBlurb()}</p>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 10px;" role="group" aria-label="Тип">
        ${KINDS.map((k, i) => `<button type="button" class="btn-secondary fb-kind" data-kind="${k.id}" aria-pressed="${i === 0 ? 'true' : 'false'}" style="margin:0;${i===0?'outline:2px solid var(--ok);':''}">${k.label}</button>`).join('')}
      </div>
      <label class="sr-only" for="fb-text">Текст</label>
      <textarea id="fb-text" rows="3" maxlength="2000" placeholder="Коротко, по делу — останется на устройстве" style="width:100%; border-radius:12px; padding:10px; background:var(--surface-2); color:var(--text); border:1px solid var(--border); resize:vertical;"></textarea>
      <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
        <button type="button" id="fb-submit" class="btn-primary" style="flex:1; margin:0;">Сохранить локально</button>
        <button type="button" id="fb-copy" class="btn-secondary" style="flex:1; margin:0;">Копировать всё</button>
      </div>
      <label style="display:flex; gap:8px; align-items:flex-start; margin-top:14px; font-size:13px; line-height:1.4;">
        <input type="checkbox" id="fb-analytics" ${store.analytics.optedIn ? 'checked' : ''} style="margin-top:3px;" />
        <span>Опциональные локальные счётчики (ритуалы, soft-return). Никуда не отправляются.</span>
      </label>
      <div id="fb-stats" class="muted" style="font-size:12px; margin-top:8px; line-height:1.4;"></div>
      <div id="fb-status" role="status" aria-live="polite" style="margin-top:8px; font-size:13px; color:var(--ok);"></div>
    </div>
  `;

  let kind: FeedbackKind = 'idea';
  const kindBtns = host.querySelectorAll('.fb-kind');
  kindBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      kind = ((btn as HTMLElement).dataset.kind || 'other') as FeedbackKind;
      kindBtns.forEach((b) => {
        (b as HTMLElement).style.outline = '';
        b.setAttribute('aria-pressed', 'false');
      });
      (btn as HTMLElement).style.outline = '2px solid var(--ok)';
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  const paintStats = () => {
    const s = loadFeedback();
    const el = host.querySelector('#fb-stats') as HTMLElement;
    if (!el) return;
    if (!s.analytics.optedIn) {
      el.textContent = `Заметок: ${s.notes.length}. Счётчики выключены.`;
      return;
    }
    const a = s.analytics;
    el.textContent = `Заметок: ${s.notes.length}. Старт ${a.ritualsStarted} · завершено ${a.ritualsCompleted} · soft-return ${a.softReturnOpens} · install ${a.installPromptShown}.`;
  };
  paintStats();

  host.querySelector('#fb-analytics')?.addEventListener('change', (e) => {
    setLocalAnalyticsOptIn((e.target as HTMLInputElement).checked);
    paintStats();
  });

  host.querySelector('#fb-submit')?.addEventListener('click', () => {
    const text = (host.querySelector('#fb-text') as HTMLTextAreaElement).value;
    const next = submitFeedback({
      kind,
      text,
      screen: opts?.screen,
      softReturn: opts?.softReturn
    });
    const status = host.querySelector('#fb-status') as HTMLElement;
    if (!text.trim()) {
      status.style.color = 'var(--muted)';
      status.textContent = 'Введите текст — пустые заметки не сохраняются.';
      return;
    }
    (host.querySelector('#fb-text') as HTMLTextAreaElement).value = '';
    status.style.color = 'var(--ok)';
    status.textContent = `Сохранено локально (${next.notes.length}).`;
    paintStats();
  });

  host.querySelector('#fb-copy')?.addEventListener('click', async () => {
    const text = feedbackExportText();
    const status = host.querySelector('#fb-status') as HTMLElement;
    try {
      await navigator.clipboard.writeText(text);
      status.style.color = 'var(--ok)';
      status.textContent = 'Скопировано в буфер. Отправка — только если вы сами вставите куда нужно.';
    } catch {
      status.style.color = 'var(--muted)';
      status.textContent = 'Не удалось скопировать. Можно экспортировать данные в Настройках.';
    }
  });
}

/** Compact trigger used on Progress / shell-adjacent screens. */
export function mountFeedbackButton(parent: HTMLElement, opts?: { screen?: string }) {
  if (typeof document === 'undefined' || !parent?.isConnected) return;
  const wrap = document.createElement('div');
  wrap.id = 'fokus-feedback-mount';
  wrap.style.marginTop = '16px';
  wrap.innerHTML = `
    <button type="button" id="btn-open-feedback" class="btn-secondary" style="width:100%; margin:0;" aria-expanded="false" aria-controls="fokus-feedback-slot">
      Обратная связь (локально)
    </button>
    <div id="fokus-feedback-slot" hidden></div>
  `;
  parent.appendChild(wrap);
  const btn = wrap.querySelector('#btn-open-feedback') as HTMLButtonElement;
  const slot = wrap.querySelector('#fokus-feedback-slot') as HTMLElement;
  btn.addEventListener('click', () => {
    const open = slot.hidden;
    slot.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      renderFeedbackPanel(slot, opts);
    }
  });
}
