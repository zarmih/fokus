export function initFlowHandoff() {
  const observer = new MutationObserver((mutations) => {
    let handled = false;
    for (const m of mutations) {
      if (handled) break;
      if (m.addedNodes.length) {
        const nextBtn = document.getElementById('btn-next') as HTMLButtonElement;
        const card = document.getElementById('instruction-card');
        if (nextBtn && card && !nextBtn.dataset.flowHandled) {
          nextBtn.dataset.flowHandled = 'true';
          handled = true;

          const meta = card.querySelector('.instruction-meta')?.textContent || '';
          const isFirst = meta.includes('Блок 1 ') || meta.includes('Блок 1\u00A0');
          const delay = isFirst ? 2500 : 1200;

          nextBtn.classList.add('auto-starting');
          nextBtn.innerHTML = `Начинаем... <div class="auto-progress" style="animation: auto-fill ${delay}ms linear forwards;"></div>`;

          if (!document.getElementById('agy-flow-style')) {
            const style = document.createElement('style');
            style.id = 'agy-flow-style';
            style.textContent = `
              @keyframes auto-fill { from { width: 0%; } to { width: 100%; } }
              .auto-starting { position: relative; overflow: hidden; pointer-events: none; opacity: 0.9; }
              .auto-progress { position: absolute; left: 0; bottom: 0; height: 4px; background: rgba(255,255,255,0.6); }
            `;
            document.head.appendChild(style);
          }

          setTimeout(() => {
            if (document.body.contains(nextBtn)) {
              nextBtn.click();
            }
          }, delay);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
