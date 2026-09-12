export function initOfflineBanner() {
  const checkStatus = () => {
    let banner = document.getElementById('offline-banner');
    if (!navigator.onLine) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--surface-2, #333);color:var(--text, #fff);text-align:center;padding:8px;font-size:13px;z-index:9999;border-top:1px solid var(--border, #444);';
        banner.textContent = 'Офлайн режим. Данные сохраняются локально.';
        document.body.appendChild(banner);
      }
    } else {
      if (banner) {
        banner.remove();
      }
    }
  };
  window.addEventListener('online', checkStatus);
  window.addEventListener('offline', checkStatus);
  checkStatus();
}
