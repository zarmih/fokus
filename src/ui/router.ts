export function navigateTo(screenId: string) {
  window.dispatchEvent(new CustomEvent('navigate', { detail: screenId }));
}
