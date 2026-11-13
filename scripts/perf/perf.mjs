// Startup measurement: node scripts/perf/perf.mjs [baseUrl] [runs] [returning]. Needs `npm run build && npm run preview -- --port 4173`.
import { chromium } from '@playwright/test';
const base = process.argv[2] || 'http://localhost:4173/fokus/';
const runs = Number(process.argv[3] || 7);
const seedReturning = process.argv[4] === 'returning';
const browser = await chromium.launch();
const results = [];
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }); // "Fast 3G"-ish
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let jsBytes = 0, cssBytes = 0, reqs = 0, jsFiles = 0;
  page.on('response', async (r) => {
    reqs++;
    const u = r.url();
    const len = Number((await r.headerValue('content-length').catch(() => null)) || 0) || (await r.body().catch(() => Buffer.alloc(0))).length;
    if (u.endsWith('.js')) { jsBytes += len; jsFiles++; }
    if (u.endsWith('.css')) cssBytes += len;
  });
  const t0 = Date.now();
  if (seedReturning) {
    await page.goto(base);
    await page.waitForSelector('#onboard-heading', { timeout: 60000 });
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('fokus.v1') || '{}'); s.profile = { ...(s.profile || {}), onboarded: true, calibrated: true }; localStorage.setItem('fokus.v1', JSON.stringify(s)); });
    jsBytes = 0; cssBytes = 0; reqs = 0; jsFiles = 0;
    await page.reload();
  } else {
    await page.goto(base);
  }
  const sel = seedReturning ? '#btn-start, .today, main' : '#onboard-heading';
  await page.waitForSelector(sel, { timeout: 60000 });
  const ready = Date.now() - t0;
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return { dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), fcp: Math.round(fcp?.startTime || -1) };
  });
  results.push({ ...m, jsKB: Math.round(jsBytes / 1024), cssKB: Math.round(cssBytes / 1024), jsFiles, reqs });
  await ctx.close();
}
await browser.close();
const med = (k) => { const v = results.map((r) => r[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
console.log(JSON.stringify({ runs, mode: seedReturning ? 'returning(today)' : 'first-launch(onboarding)', median: { fcp: med('fcp'), dcl: med('dcl'), load: med('load'), jsKB: med('jsKB'), cssKB: med('cssKB'), jsFiles: med('jsFiles'), reqs: med('reqs') }, results }, null, 1));
