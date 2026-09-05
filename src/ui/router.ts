export function navigateTo(screenId: string, params?: any) {
  window.dispatchEvent(new CustomEvent('navigate', { detail: {screenId, params} }));
}
