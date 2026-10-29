import { afterEach, expect, test } from 'vitest';
import { bindLifestyleField, lifestyleCheckinHtml } from '../src/ui/components/lifestyle-checkin';
import { bindDialog } from '../src/ui/a11y';

function mount(): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'modal-root';
  modal.innerHTML = lifestyleCheckinHtml();
  document.body.appendChild(modal);
  return modal;
}

afterEach(() => {
  document.body.innerHTML = '';
});

test('sleep and stress rows are labelled groups', () => {
  const modal = mount();
  const groups = [...modal.querySelectorAll<HTMLElement>('[role="group"]')];
  expect(groups).toHaveLength(2);
  const names = groups.map((g) => document.getElementById(g.getAttribute('aria-labelledby')!)?.textContent);
  expect(names).toEqual(['Сон', 'Стресс']);
});

test('options are toggle buttons starting unpressed; sleep symbols have spoken names', () => {
  const modal = mount();
  const all = [...modal.querySelectorAll<HTMLButtonElement>('.btn-ls-sleep, .btn-ls-stress')];
  expect(all).toHaveLength(6);
  all.forEach((b) => {
    expect(b.type).toBe('button');
    expect(b.getAttribute('aria-pressed')).toBe('false');
  });
  const sleepNames = [...modal.querySelectorAll<HTMLButtonElement>('.btn-ls-sleep')].map((b) => b.getAttribute('aria-label'));
  expect(sleepNames).toEqual(['Меньше 6 часов', 'От 6 до 8 часов', 'Больше 8 часов']);
});

test('selecting an option sets aria-pressed (single-select per field) and reports value', () => {
  const modal = mount();
  let sleep: string | null = null;
  let stress: string | null = null;
  bindLifestyleField(modal, 'sleep', (v) => { sleep = v; });
  bindLifestyleField(modal, 'stress', (v) => { stress = v; });
  const sleepBtns = [...modal.querySelectorAll<HTMLButtonElement>('.btn-ls-sleep')];
  const stressBtns = [...modal.querySelectorAll<HTMLButtonElement>('.btn-ls-stress')];

  sleepBtns[0].click();
  expect(sleep).toBe('low');
  expect(sleepBtns.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
  expect(sleepBtns[0].classList.contains('btn-primary')).toBe(true);

  sleepBtns[2].click();
  expect(sleep).toBe('high');
  expect(sleepBtns.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
  expect(sleepBtns[0].classList.contains('btn-secondary')).toBe(true);

  // Other field untouched
  expect(stress).toBeNull();
  expect(stressBtns.every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
  stressBtns[1].click();
  expect(stress).toBe('normal');
  expect(sleepBtns[2].getAttribute('aria-pressed')).toBe('true');
});

test('check-in dialog is labelled by its heading and closes on Escape', () => {
  const modal = mount();
  let closed = false;
  const unbind = bindDialog(modal, { labelledBy: 'ls-title', onClose: () => { closed = true; } });
  expect(modal.getAttribute('role')).toBe('dialog');
  expect(modal.getAttribute('aria-modal')).toBe('true');
  expect(document.getElementById(modal.getAttribute('aria-labelledby')!)?.textContent).toBe('Как вы сегодня?');
  modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(closed).toBe(true);
  unbind();
});
