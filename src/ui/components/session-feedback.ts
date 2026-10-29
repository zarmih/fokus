/**
 * Post-session feel UI: result mount (👍/😐/👎 + note) and Progress 7-day aggregate.
 */
import {
  aggregateSessionFeel,
  entryForSession,
  feelLabelRu,
  loadSessionFeedback,
  submitSessionFeedback,
  type SessionFeel
} from '../../core/session-feedback';

const FEELS: { id: SessionFeel; emoji: string; label: string }[] = [
  { id: 'up', emoji: '👍', label: 'Легко' },
  { id: 'neutral', emoji: '😐', label: 'Нормально' },
  { id: 'down', emoji: '👎', label: 'Сложно' }
];

/** Mount interactive card on the result screen. */
export function mountSessionFeedback(
  host: HTMLElement,
  opts: { sessionId: string; onSaved?: (feel: SessionFeel, note: string) => void }
): void {
  if (!host || !opts.sessionId) return;
  const existing = entryForSession(loadSessionFeedback(), opts.sessionId);

  const wrap = document.createElement('div');
  wrap.className = 'surface session-feedback-card';
  wrap.setAttribute('role', 'region');
  wrap.setAttribute('aria-label', 'Как ощущалась сессия');
  wrap.dataset.sessionFeedback = '1';

  if (existing) {
    wrap.innerHTML = `
      <h3 style="margin: 0 0 6px; font-size: 1.1rem;">Как ощущалась сессия?</h3>
      <p class="muted" style="margin: 0; font-size: 13px; line-height: 1.4;">
        Уже отмечено: ${existing.feel === 'up' ? '👍' : existing.feel === 'down' ? '👎' : '😐'} ${feelLabelRu(existing.feel)}.
        Только на этом устройстве.
      </p>
      ${existing.note ? `<p style="margin: 8px 0 0; font-size: 13px;">«${escapeHtml(existing.note)}»</p>` : ''}
    `;
    host.appendChild(wrap);
    return;
  }

  wrap.innerHTML = `
    <h3 style="margin: 0 0 6px; font-size: 1.1rem;">Как ощущалась сессия?</h3>
    <p class="muted" style="margin: 0 0 12px; font-size: 13px; line-height: 1.4;">
      Коротко для себя — хранится только локально, без отправки.
    </p>
    <div class="session-feedback-options" style="display:flex; gap:8px; flex-wrap:wrap;" role="group" aria-label="Ощущение после сессии">
      ${FEELS.map(
        (f) =>
          `<button type="button" class="btn-secondary btn-session-feel" data-feel="${f.id}" aria-pressed="false" style="margin:0; min-width: 7.5rem;">
            <span aria-hidden="true">${f.emoji}</span> ${f.label}
          </button>`
      ).join('')}
    </div>
    <label class="sr-only" for="sf-note">Заметка</label>
    <textarea id="sf-note" rows="2" maxlength="280" placeholder="Необязательная заметка (до 280 символов)"
      style="width:100%; margin-top:12px; border-radius:12px; padding:10px; background:var(--surface-2); color:var(--text); border:1px solid var(--border); resize:vertical; box-sizing:border-box;"></textarea>
    <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
      <button type="button" id="sf-save" class="btn-primary" style="flex:1; margin:0;" disabled>Сохранить</button>
    </div>
    <div id="sf-status" role="status" aria-live="polite" style="margin-top:8px; font-size:13px; color:var(--ok);"></div>
  `;
  host.appendChild(wrap);

  let feel: SessionFeel | null = null;
  const btns = wrap.querySelectorAll('.btn-session-feel');
  const saveBtn = wrap.querySelector('#sf-save') as HTMLButtonElement;
  const status = wrap.querySelector('#sf-status') as HTMLElement;

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      feel = ((btn as HTMLElement).dataset.feel || 'neutral') as SessionFeel;
      btns.forEach((b) => {
        (b as HTMLElement).style.outline = '';
        b.setAttribute('aria-pressed', 'false');
      });
      (btn as HTMLElement).style.outline = '2px solid var(--ok)';
      btn.setAttribute('aria-pressed', 'true');
      saveBtn.disabled = false;
    });
  });

  saveBtn.addEventListener('click', () => {
    if (!feel) return;
    const note = (wrap.querySelector('#sf-note') as HTMLTextAreaElement).value;
    submitSessionFeedback({ sessionId: opts.sessionId, feel, note });
    opts.onSaved?.(feel, note.trim());
    const emoji = feel === 'up' ? '👍' : feel === 'down' ? '👎' : '😐';
    wrap.innerHTML = `
      <h3 style="margin: 0 0 6px; font-size: 1.1rem;">Как ощущалась сессия?</h3>
      <p style="margin: 0; color: var(--ok); font-weight: 500;" role="status">
        Сохранено: ${emoji} ${feelLabelRu(feel)}. Только на устройстве.
      </p>
      ${note.trim() ? `<p style="margin: 8px 0 0; font-size: 13px;">«${escapeHtml(note.trim())}»</p>` : ''}
    `;
    status?.remove();
  });
}

/** Progress: 7-day aggregate card (honest empty state). */
export function renderSessionFeelAggregateHtml(days = 7): string {
  const agg = aggregateSessionFeel(loadSessionFeedback(), days);
  const body = agg.empty
    ? `<div class="empty-state" style="padding: 20px 16px; text-align: center; border-radius: 12px; background: var(--fill-subtle);">
         <p style="color: var(--muted); margin: 0; font-size: 13px; line-height: 1.5;">
           Пока нет отметок за ${days} дней.<br>
           После сессии можно нажать 👍 / 😐 / 👎 — здесь появится, что чаще ощущалось сложно или легко.
         </p>
       </div>`
    : `<p style="margin: 0; font-size: 14px; line-height: 1.45;">${escapeHtml(agg.summaryRu)}</p>
       <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; font-size:13px;">
         <span title="Легко">👍 ${agg.up}</span>
         <span title="Нормально">😐 ${agg.neutral}</span>
         <span title="Сложно">👎 ${agg.down}</span>
       </div>`;

  return `
    <div class="surface session-feel-aggregate" data-session-feel-agg="1" style="margin-bottom: 24px;" role="region" aria-label="Ощущения за неделю">
      <h3 style="margin-bottom: 8px;">Что ощущалось сложно / легко</h3>
      <p style="font-size: 12px; color: var(--muted); margin: 0 0 12px; line-height: 1.4;">
        Сводка ваших отметок после сессий за ${days} дней. Только на устройстве, без сравнений с другими.
      </p>
      ${body}
    </div>
  `;
}

export function mountSessionFeelAggregate(parent: HTMLElement, days = 7): void {
  if (typeof document === 'undefined' || !parent?.isConnected) return;
  if (parent.querySelector('[data-session-feel-agg]')) return;
  const slot = document.createElement('div');
  slot.innerHTML = renderSessionFeelAggregateHtml(days);
  const node = slot.firstElementChild;
  if (node) parent.appendChild(node);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
