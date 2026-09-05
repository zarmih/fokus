export function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.dataset.theme = theme;
}
