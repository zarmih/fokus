export let deferredPrompt: any = null;

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });
}

export function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'pwa-banner';
  banner.innerHTML = `
    <div class="pwa-banner-content">
      <div class="pwa-icon">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      </div>
      <div class="pwa-text">
        <strong>Fokus всегда под рукой</strong>
        <span>Установите приложение: тренируйтесь без интернета, быстрее и стабильнее.</span>
      </div>
    </div>
    <div class="pwa-actions">
      <button class="btn-ghost" id="pwa-install-close">Позже</button>
      <button class="btn-primary" id="pwa-install-btn">Установить</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('pwa-install-close')?.addEventListener('click', () => {
    banner.remove();
  });
  
  document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      banner.remove();
      const settingsContainer = document.getElementById('install-container');
      if (settingsContainer) settingsContainer.style.display = 'none';
    }
  });
}

export function showUpdateBanner(registration: ServiceWorkerRegistration) {
  if (document.getElementById('pwa-update-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.className = 'pwa-banner';
  banner.innerHTML = `
    <div class="pwa-banner-content">
      <div class="pwa-icon">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
      </div>
      <div class="pwa-text">
        <strong>Доступно улучшение</strong>
        <span>Мы обновили Fokus. Перезапустите приложение, чтобы применить улучшения безопасно.</span>
      </div>
    </div>
    <div class="pwa-actions">
      <button class="btn-ghost" id="pwa-update-close">Позже</button>
      <button class="btn-primary" id="pwa-update-btn">Обновить</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('pwa-update-close')?.addEventListener('click', () => {
    banner.remove();
  });

  document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}
