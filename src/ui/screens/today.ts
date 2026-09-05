export function renderToday(container: HTMLElement) {
  container.innerHTML = `
    <div class="screen">
      <h1>Fokus</h1>
      <p>5-минутный ритуал для ума.</p>
      <button id="btn-start">Начать сессию</button>
      <div class="disclaimer">Это не медицинское изделие и не диагностика.</div>
    </div>
  `;
}
