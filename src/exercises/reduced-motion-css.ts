/**
 * Reduced-motion overrides for exercise-local inline `<style>` animations.
 *
 * Honors both the in-app setting (`html[data-motion="reduce"]`, set by
 * `applyMotionPreference`) and the OS `prefers-reduced-motion: reduce` query.
 * `rest` declarations put the element in its animation end state so entrance
 * animations that rely on `forwards` (opacity/scale 0 → 1) stay visible.
 */
export function reducedMotionCss(selector: string, rest = ''): string {
  const body = `animation: none !important;${rest ? ` ${rest}` : ''}`;
  const scoped = selector
    .split(',')
    .map((s) => `html[data-motion="reduce"] ${s.trim()}`)
    .join(', ');
  return `${scoped} { ${body} }\n@media (prefers-reduced-motion: reduce) { ${selector} { ${body} } }`;
}
