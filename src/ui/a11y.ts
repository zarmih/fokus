const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function applyDocumentLang(lang: string | undefined) {
  document.documentElement.lang = lang === 'en' ? 'en' : 'ru';
}

export function setScreenTitle(title: string) {
  document.title = title ? `${title} — Fokus` : 'Fokus — тренировки внимания и памяти';
}

export function focusMain() {
  const main = document.getElementById('main-content');
  if (!main) return;
  if (!main.hasAttribute('tabindex')) main.tabIndex = -1;
  try {
    main.focus({ preventScroll: true });
  } catch {
    main.focus();
  }
}

export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite') {
  const el = document.getElementById('a11y-status');
  if (!el) return;
  el.setAttribute('aria-live', politeness);
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  );
}

export function bindDialog(overlay: HTMLElement, opts?: { label?: string; labelledBy?: string; onClose?: () => void }) {
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  if (opts?.label) overlay.setAttribute('aria-label', opts.label);
  if (opts?.labelledBy) overlay.setAttribute('aria-labelledby', opts.labelledBy);

  const previously = document.activeElement as HTMLElement | null;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      opts?.onClose?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const list = focusables(overlay);
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  overlay.addEventListener('keydown', onKey);
  queueMicrotask(() => focusables(overlay)[0]?.focus());

  return () => {
    overlay.removeEventListener('keydown', onKey);
    previously?.focus?.();
  };
}
