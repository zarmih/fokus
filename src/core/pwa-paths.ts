/**
 * Pure helpers for PWA install / soft-return paths.
 * No DOM side effects — unit-tested without a phone GUI.
 */

export type InstallPathKind = 'prompt' | 'ios_manual' | 'installed' | 'unsupported';

export interface SoftReturnBoot {
  softReturn: boolean;
  /** Clean URL without ?return=soft (pathname + other search + hash). */
  cleanUrl: string;
}

/** Parse soft-return deep link from notification / SW openWindow. */
export function parseSoftReturnSearch(search: string): SoftReturnBoot {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  const soft = params.get('return') === 'soft';
  if (soft) params.delete('return');
  const rest = params.toString();
  const cleanUrl = rest ? `?${rest}` : '';
  return { softReturn: soft, cleanUrl };
}

/** Build SW notificationclick target under a given registration scope. */
export function softReturnOpenUrl(scope: string): string {
  const base = scope.replace(/\/?$/, '/');
  return `${base}?return=soft`;
}

export function detectInstallPath(opts: {
  isInstalled: boolean;
  hasDeferredPrompt: boolean;
  userAgent: string;
  standaloneMq?: boolean;
}): InstallPathKind {
  if (opts.isInstalled || opts.standaloneMq) return 'installed';
  if (opts.hasDeferredPrompt) return 'prompt';
  const ua = opts.userAgent || '';
  const isiOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && ua.includes('Mobile'));
  if (isiOS) return 'ios_manual';
  // Desktop Safari / Firefox often lack beforeinstallprompt — still show how-to.
  if (/Safari|Firefox|Edg|Chrome|Chromium|Android/i.test(ua)) return 'unsupported';
  return 'unsupported';
}

export function manualInstallCopy(kind: InstallPathKind, softReturnActive: boolean): {
  title: string;
  body: string;
  cta: string;
  show: boolean;
} {
  if (kind === 'installed' || kind === 'prompt') {
    return { title: '', body: '', cta: '', show: false };
  }
  if (kind === 'ios_manual') {
    return {
      title: softReturnActive
        ? 'Мягкий возврат с главного экрана (iPhone)'
        : 'На главный экран (iPhone / iPad)',
      body: softReturnActive
        ? 'Safari → «Поделиться» → «На экран «Домой»». После паузы Fokus откроется в один тап, без вкладок.'
        : 'В Safari нажмите «Поделиться», затем «На экран «Домой»». Так Fokus работает как приложение.',
      cta: 'Как установить',
      show: true
    };
  }
  return {
    title: softReturnActive
      ? 'Установка для мягкого возврата'
      : 'Установка Fokus',
    body: softReturnActive
      ? 'Если кнопки установки нет, откройте меню браузера → «Установить приложение» / «Добавить на главный экран».'
      : 'Меню браузера → «Установить приложение» или «Добавить на главный экран».',
    cta: 'Понятно',
    show: true
  };
}

/** Manifest checks used by tests (installability surface). */
export function validateManifestShape(m: {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
}): string[] {
  const errs: string[] = [];
  if (!m.name) errs.push('missing name');
  if (!m.short_name) errs.push('missing short_name');
  if (!m.start_url) errs.push('missing start_url');
  if (!m.scope) errs.push('missing scope');
  if (m.display !== 'standalone' && m.display !== 'minimal-ui' && m.display !== 'fullscreen') {
    errs.push('display should be standalone-like');
  }
  if (!m.icons?.length) errs.push('missing icons');
  else {
    const any = m.icons.some((i) => !i.purpose || i.purpose.includes('any'));
    if (!any) errs.push('need icon purpose any');
    if (!m.icons.every((i) => i.src && i.type)) errs.push('icon src/type required');
  }
  return errs;
}
