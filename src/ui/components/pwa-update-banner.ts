/** Russian copy for the PWA update banner (visible + accessible name). */
export const PWA_UPDATE_TITLE = 'Доступна новая версия';
export const PWA_UPDATE_DESC = 'Обновите Fokus, чтобы получить последние улучшения.';
export const PWA_UPDATE_ACTION = 'Обновить сейчас';
export const PWA_UPDATE_DISMISS = 'Позже';

const TITLE_ID = 'pwa-update-title';
const DESC_ID = 'pwa-update-desc';

let mounted = false;
let removeKeyHandler: (() => void) | null = null;

/** Test-only: reset singleton so successive tests can remount. */
export function resetPwaUpdateBannerForTests() {
  removeKeyHandler?.();
  removeKeyHandler = null;
  document.querySelector('.pwa-update-banner')?.remove();
  mounted = false;
}

/**
 * Actionable PWA update notice.
 * - role=alertdialog (has controls; role=status must not wrap interactive content)
 * - aria-modal=false so Tab / skip-link stay usable outside the banner
 * - labelled buttons + aria-labelledby / aria-describedby
 * - focus moves to primary action on show; restored on dismiss; Escape dismisses
 * - z-index below skip-link (9999)
 */
export function showPwaUpdateBanner(
  container: HTMLElement,
  opts?: { onUpdate?: () => void; onDismiss?: () => void }
): HTMLElement | null {
  if (mounted) {
    return container.querySelector('.pwa-update-banner') as HTMLElement | null;
  }
  mounted = true;

  const previouslyFocused = document.activeElement as HTMLElement | null;

  const banner = document.createElement('div');
  banner.className = 'surface pwa-update-banner fx-enter';
  banner.setAttribute('role', 'alertdialog');
  banner.setAttribute('aria-modal', 'false');
  banner.setAttribute('aria-labelledby', TITLE_ID);
  banner.setAttribute('aria-describedby', DESC_ID);
  // Soft live announcement for AT that treat non-modal alertdialogs lightly.
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-atomic', 'true');
  banner.style.cssText =
    'position: fixed; bottom: 80px; left: 16px; right: 16px; z-index: 100; border-left: 4px solid var(--accent); box-shadow: 0 8px 32px rgba(0,0,0,0.4); display: flex; flex-direction: column; gap: 8px;';

  banner.innerHTML = `
      <div id="${TITLE_ID}" style="font-weight: 600;">${PWA_UPDATE_TITLE}</div>
      <div id="${DESC_ID}" style="font-size: 13px; color: var(--muted);">${PWA_UPDATE_DESC}</div>
      <div style="display: flex; gap: 8px; margin-top: 4px;">
        <button class="btn-primary" type="button" style="flex: 1;" id="btn-pwa-update" aria-label="${PWA_UPDATE_ACTION}">${PWA_UPDATE_ACTION}</button>
        <button class="btn-secondary" type="button" style="flex: 1;" id="btn-pwa-dismiss" aria-label="${PWA_UPDATE_DISMISS}">${PWA_UPDATE_DISMISS}</button>
      </div>
    `;

  const dismiss = () => {
    removeKeyHandler?.();
    removeKeyHandler = null;
    banner.remove();
    mounted = false;
    if (previouslyFocused && document.contains(previouslyFocused)) {
      try {
        previouslyFocused.focus({ preventScroll: true });
      } catch {
        previouslyFocused.focus();
      }
    }
    opts?.onDismiss?.();
  };

  const updateBtn = banner.querySelector('#btn-pwa-update') as HTMLButtonElement;
  const dismissBtn = banner.querySelector('#btn-pwa-dismiss') as HTMLButtonElement;

  updateBtn.addEventListener('click', () => {
    // Tests inject onUpdate to avoid a real reload; production reloads the page.
    if (opts?.onUpdate) {
      opts.onUpdate();
      return;
    }
    window.location.reload();
  });
  dismissBtn.addEventListener('click', () => dismiss());

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
    }
  };
  banner.addEventListener('keydown', onKey);
  removeKeyHandler = () => banner.removeEventListener('keydown', onKey);

  container.appendChild(banner);

  // Move focus into the banner without trapping it (skip-link / page remain reachable).
  queueMicrotask(() => {
    try {
      updateBtn.focus({ preventScroll: true });
    } catch {
      updateBtn.focus();
    }
  });

  return banner;
}

let listening = false;

/** Wire the global `pwa-update-available` event once (idempotent). */
export function listenForPwaUpdate(getContainer: () => HTMLElement | null = () => document.getElementById('app')) {
  if (typeof window === 'undefined' || listening) return;
  listening = true;
  window.addEventListener('pwa-update-available', () => {
    const app = getContainer();
    if (!app) return;
    showPwaUpdateBanner(app);
  });
}
