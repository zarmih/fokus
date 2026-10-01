import { describe, expect, test } from 'vitest';
import {
  detectInstallPath,
  manualInstallCopy,
  parseSoftReturnSearch,
  softReturnOpenUrl,
  validateManifestShape
} from '../src/core/pwa-paths';
import { generateServiceWorker } from '../scripts/generate-sw';
import fs from 'node:fs';
import path from 'node:path';

describe('pwa soft-return / install paths', () => {
  test('parseSoftReturnSearch detects and strips return=soft', () => {
    const a = parseSoftReturnSearch('?return=soft');
    expect(a.softReturn).toBe(true);
    expect(a.cleanUrl).toBe('');

    const b = parseSoftReturnSearch('?foo=1&return=soft&bar=2');
    expect(b.softReturn).toBe(true);
    expect(b.cleanUrl).toContain('foo=1');
    expect(b.cleanUrl).toContain('bar=2');
    expect(b.cleanUrl).not.toContain('return=soft');

    expect(parseSoftReturnSearch('').softReturn).toBe(false);
  });

  test('softReturnOpenUrl under /fokus/ scope', () => {
    expect(softReturnOpenUrl('https://zarmih.github.io/fokus/')).toBe(
      'https://zarmih.github.io/fokus/?return=soft'
    );
    expect(softReturnOpenUrl('https://zarmih.github.io/fokus')).toBe(
      'https://zarmih.github.io/fokus/?return=soft'
    );
  });

  test('SW notificationclick embeds soft-return open path', () => {
    const sw = generateServiceWorker(['index.html', 'manifest.webmanifest'], 'abc123');
    expect(sw).toContain("tag === 'fokus-soft-return'");
    expect(sw).toContain("'?return=soft'");
    expect(sw).toContain('fokus-reminder');
    expect(sw).toContain('softReturn');
  });

  test('manifest.webmanifest is installable shape', () => {
    const raw = fs.readFileSync(path.join(process.cwd(), 'public/manifest.webmanifest'), 'utf8');
    const m = JSON.parse(raw);
    expect(validateManifestShape(m)).toEqual([]);
    expect(m.start_url).toBe('./');
    expect(m.scope).toBe('./');
    expect(m.icons.some((i: any) => (i.purpose || '').includes('any'))).toBe(true);
  });

  test('iOS without BIP gets manual install copy', () => {
    const kind = detectInstallPath({
      isInstalled: false,
      hasDeferredPrompt: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    expect(kind).toBe('ios_manual');
    const copy = manualInstallCopy(kind, true);
    expect(copy.show).toBe(true);
    expect(copy.body).toMatch(/Safari|Домой/i);
    expect(copy.title).toMatch(/мягкий возврат/i);
  });

  test('BIP path prefers prompt; installed hides', () => {
    expect(
      detectInstallPath({ isInstalled: false, hasDeferredPrompt: true, userAgent: 'Chrome' })
    ).toBe('prompt');
    expect(manualInstallCopy('prompt', false).show).toBe(false);
    expect(
      detectInstallPath({ isInstalled: true, hasDeferredPrompt: false, userAgent: 'Chrome' })
    ).toBe('installed');
  });
});
