/** Clear Russian copy for the offline trust banner (screen-reader + visual). */
export const OFFLINE_BANNER_COPY = 'Офлайн. Данные сохранены на устройстве.';

/**
 * Non-interactive offline notice at the top of the document.
 * - role=status + polite live region (announced, not interrupting)
 * - no focusables / no focus moves on show/hide (keyboard & skip-link stay usable)
 * - decorative icon is aria-hidden
 */
export function renderOfflineBanner(container: HTMLElement) {
  const banner = document.createElement('div');
  banner.className = 'offline-trust-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-atomic', 'true');
  // Stay under the skip-link (z-index 9999) so Tab → skip remains visible on focus.
  banner.style.position = 'relative';
  banner.style.zIndex = '1';
  banner.style.backgroundColor = 'var(--bg-elev)';
  banner.style.color = 'var(--text)';
  banner.style.padding = '8px 16px';
  banner.style.textAlign = 'center';
  banner.style.fontSize = '14px';
  banner.style.borderBottom = '1px solid var(--line)';
  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 4.27l2.75 2.75C3.56 7.6 2 9.61 2 12c0 3.31 2.69 6 6 6h11.73l2 2 1.27-1.27L4.27 3 3 4.27zm11.73 11.73H8c-2.21 0-4-1.79-4-4 0-1.71 1.09-3.17 2.61-3.72L14.73 16z"/>
      </svg>
      <span data-offline-copy>${OFFLINE_BANNER_COPY}</span>
    </div>
  `;

  const setVisible = (visible: boolean) => {
    // Focus-safe: never call focus(); banner has no tabindex / controls.
    banner.hidden = !visible;
  };

  setVisible(!navigator.onLine);
  container.prepend(banner);

  window.addEventListener('online', () => setVisible(false));
  window.addEventListener('offline', () => setVisible(true));
}
