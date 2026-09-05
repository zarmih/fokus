import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

base_dir = '/Users/mikhail/developer/github/fokus'

files = {
    'package.json': '''{
  "name": "fokus",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "~5.7.2",
    "vite": "^6.0.5",
    "vitest": "^3.0.0",
    "jsdom": "^26.0.0"
  }
}''',
    'vite.config.ts': '''import { defineConfig } from 'vite';
export default defineConfig({
  base: '/fokus/'
});''',
    'vitest.config.ts': '''import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom'
  }
});''',
    'tsconfig.json': '''{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "tests"]
}''',
    'index.html': '''<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fokus</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>''',
    'src/core/types.ts': '''export interface Profile {
  createdAt: string;
  sessionLengthSec: number;
  soundOn: boolean;
  locale: 'ru';
}

export interface DomainIndex {
  domain: string;
  value: number;
  updatedAt: string;
}

export interface ExerciseState {
  exerciseId: string;
  level: number;
  lastPlayedAt: string;
  lastAccuracy: number;
}

export interface SessionItem {
  exerciseId: string;
  level: number;
  accuracy: number;
  avgRtMs: number;
  score: number;
}

export interface Session {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  durationSec: number;
  items: SessionItem[];
}

export interface DaySummary {
  date: string;
  totalScore: number;
  domainDeltas: Record<string, number>;
  streak: number;
}
''',
    'src/core/storage.ts': '''import type { Profile, DomainIndex, ExerciseState, Session, DaySummary } from "./types";

export const storage = {
  getProfile: (): Profile => {
    const data = localStorage.getItem('profile');
    if (data) return JSON.parse(data);
    return { createdAt: new Date().toISOString(), sessionLengthSec: 300, soundOn: true, locale: 'ru' };
  },
  setProfile: (p: Profile) => localStorage.setItem('profile', JSON.stringify(p)),
  
  getDomains: (): DomainIndex[] => JSON.parse(localStorage.getItem('domains') || '[]'),
  setDomains: (d: DomainIndex[]) => localStorage.setItem('domains', JSON.stringify(d)),
  
  getExerciseStates: (): ExerciseState[] => JSON.parse(localStorage.getItem('exerciseStates') || '[]'),
  setExerciseStates: (s: ExerciseState[]) => localStorage.setItem('exerciseStates', JSON.stringify(s)),

  getSessions: (): Session[] => JSON.parse(localStorage.getItem('sessions') || '[]'),
  setSessions: (s: Session[]) => localStorage.setItem('sessions', JSON.stringify(s)),

  getDaySummaries: (): DaySummary[] => JSON.parse(localStorage.getItem('daySummaries') || '[]'),
  setDaySummaries: (s: DaySummary[]) => localStorage.setItem('daySummaries', JSON.stringify(s)),

  clearAll: () => localStorage.clear(),
  exportJson: () => JSON.stringify(localStorage)
};
''',
    'src/core/scoring.ts': '''export function calculateScore(accuracy: number, level: number, avgRtMs: number, targetMs: number): number {
  const clamp = Math.max(0.7, Math.min(1.3, targetMs / avgRtMs));
  return Math.round(accuracy * (100 + level * 12) * clamp);
}''',
    'src/core/adaptive.ts': '''export function calculateNextLevel(currentLevel: number, accuracy: number, avgRtMs: number, targetMs: number, minLevel: number = 1): number {
  let change = 0;
  if (accuracy >= 0.85 && avgRtMs <= targetMs) change = 1;
  else if (accuracy < 0.65) change = -1;
  return Math.max(minLevel, currentLevel + change);
}''',
    'src/core/session-builder.ts': '''export function buildSession(durationSec: number, exerciseStates: any[], domainIndices: any[]): any[] {
  // Mock logic for Phase A
  return [
    { exerciseId: 'grid-memory', level: 3 },
    { exerciseId: 'grid-memory', level: 3 }
  ];
}''',
    'src/core/domains.ts': '''export const domains = ['attention', 'memory', 'speed', 'flexibility', 'logic'];
export const calculateEMA = (current: number, newValue: number, alpha: number = 0.3) => {
  return current + alpha * (newValue - current);
};''',
    'src/exercises/types.ts': '''export interface ExerciseManifest {
  id: string;
  name: string;
  domain: string;
  instruction: string;
  levels: Record<number, any>;
}''',
    'src/exercises/registry.ts': '''import { gridMemoryManifest } from "./grid-memory/manifest";
export const registry = [gridMemoryManifest];''',
    'src/exercises/grid-memory/manifest.ts': '''export const gridMemoryManifest = {
  id: 'grid-memory',
  name: 'Матрица',
  domain: 'memory',
  instruction: 'Запомните подсвеченные клетки. Воспроизведите их кликами.',
  levels: {
    1: { cells: 3, grid: 3, showMs: 1500, targetMs: 2000 },
    3: { cells: 4, grid: 4, showMs: 1000, targetMs: 1500 },
    20: { cells: 9, grid: 6, showMs: 300, targetMs: 800 }
  }
};''',
    'src/exercises/grid-memory/engine.ts': '''export class GridMemoryEngine {
  constructor(public config: any) {}
  start() {}
  onInput(x: number, y: number) {}
  finish() {}
}''',
    'src/exercises/grid-memory/view.ts': '''export function renderGridMemory(container: HTMLElement, config: any) {
  container.innerHTML = `<div class="grid-memory">Игра "Матрица" (заглушка)</div>`;
}''',
    'src/ui/router.ts': '''export function navigateTo(screenId: string) {
  window.dispatchEvent(new CustomEvent('navigate', { detail: screenId }));
}''',
    'src/ui/screens/today.ts': '''export function renderToday(container: HTMLElement) {
  container.innerHTML = `
    <div class="screen">
      <h1>Fokus</h1>
      <p>5-минутный ритуал для ума.</p>
      <button id="btn-start">Начать сессию</button>
      <div class="disclaimer">Это не медицинское изделие и не диагностика.</div>
    </div>
  `;
}''',
    'src/ui/screens/session.ts': '''export function renderSession(container: HTMLElement) {
  container.innerHTML = `<div class="screen"><h2>Сессия</h2><div id="exercise-container"></div></div>`;
}''',
    'src/ui/screens/result.ts': '''export function renderResult(container: HTMLElement) {
  container.innerHTML = `<div class="screen"><h2>Результат</h2><button id="btn-home">Домой</button></div>`;
}''',
    'src/ui/screens/progress.ts': '''export function renderProgress(container: HTMLElement) {
  container.innerHTML = `<div class="screen"><h2>Прогресс</h2></div>`;
}''',
    'src/ui/screens/settings.ts': '''export function renderSettings(container: HTMLElement) {
  container.innerHTML = `<div class="screen"><h2>Настройки</h2></div>`;
}''',
    'src/ui/screens/trainers.ts': '''export function renderTrainers(container: HTMLElement) {
  container.innerHTML = `<div class="screen"><h2>Тренажёры</h2></div>`;
}''',
    'src/main.ts': '''import './styles.css';
import { renderToday } from './ui/screens/today';
import { renderSession } from './ui/screens/session';
import { renderResult } from './ui/screens/result';
import { navigateTo } from './ui/router';

const app = document.getElementById('app')!;
renderToday(app);

window.addEventListener('navigate', (e: any) => {
  if (e.detail === 'today') renderToday(app);
  else if (e.detail === 'session') renderSession(app);
  else if (e.detail === 'result') renderResult(app);
  
  if (e.detail === 'today') {
    setTimeout(() => {
      document.getElementById('btn-start')?.addEventListener('click', () => navigateTo('session'));
    }, 0);
  }
});

setTimeout(() => {
  document.getElementById('btn-start')?.addEventListener('click', () => navigateTo('session'));
}, 0);
''',
    'src/styles.css': '''body {
  margin: 0;
  padding: 0;
  background: #121212;
  color: #e0e0e0;
  font-family: system-ui, -apple-system, sans-serif;
}
.screen {
  padding: 20px;
  max-width: 480px;
  margin: 0 auto;
}
h1, h2 { color: #f59e0b; }
button {
  background: #f59e0b;
  color: #121212;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.3s;
}
button:hover { opacity: 0.8; }
.disclaimer {
  font-size: 12px;
  color: #666;
  margin-top: 20px;
}
''',
    'tests/adaptive.test.ts': '''import { expect, test } from 'vitest';
import { calculateNextLevel } from '../src/core/adaptive';

test('adaptive level logic', () => {
  expect(calculateNextLevel(3, 0.9, 1000, 1500)).toBe(4);
  expect(calculateNextLevel(3, 0.7, 1000, 1500)).toBe(3);
  expect(calculateNextLevel(3, 0.5, 1000, 1500)).toBe(2);
});''',
    'tests/scoring.test.ts': '''import { expect, test } from 'vitest';
import { calculateScore } from '../src/core/scoring';

test('calculateScore', () => {
  expect(calculateScore(1.0, 3, 1000, 1500)).toBeGreaterThan(0);
});''',
    'tests/session-builder.test.ts': '''import { expect, test } from 'vitest';
import { buildSession } from '../src/core/session-builder';

test('buildSession returns items', () => {
  expect(buildSession(300, [], []).length).toBeGreaterThan(0);
});''',
    'tests/storage.test.ts': '''import { expect, test } from 'vitest';
import { storage } from '../src/core/storage';

test('storage default profile', () => {
  const p = storage.getProfile();
  expect(p.locale).toBe('ru');
});''',
    'CHANGELOG.md': '''# Changelog
## [0.1.0] - 2026-09-05
- Этап A: Каркас веб-тренажёра Fokus
- Упражнение "Матрица"
''',
    'IMPROVEMENT.md': '''# Improvements
1. ID: add-games
   Гипотеза: 5 новых упражнений повысят retention
   Метрика: W1 retention
   Изменение: добавить остальные упражнения
   Статус: backlog
   Результат: -
2. ID: full-calibration
   Гипотеза: Точная калибровка старта снизит отток новичков
   Метрика: Completion rate 1 сессии
   Изменение: Оценочный тест при первом входе
   Статус: backlog
   Результат: -
3. ID: pages-demo
   Гипотеза: Демо на GitHub Pages упростит тестирование
   Метрика: Установки
   Изменение: Настроить CD
   Статус: backlog
   Результат: -
4. ID: keyboard-support
   Гипотеза: Поддержка клавиатуры улучшит accessibility
   Метрика: Время сессии на десктопе
   Изменение: Горячие клавиши 1-9
   Статус: backlog
   Результат: -
5. ID: reduced-motion
   Гипотеза: Отключение анимаций поможет людям с вестибулярными проблемами
   Метрика: Жалобы в саппорт
   Изменение: media query prefers-reduced-motion
   Статус: backlog
   Результат: -
''',
    'LICENSE': '''MIT License

Copyright (c) 2026 zarmih

Permission is hereby granted, free of charge, to any person obtaining a copy
...
''',
    'README.md': '''# Fokus

Fokus — 5-minute cognitive training ritual.

## Setup
`npm i`
`npm run dev`
`npm test`

## Stage A Features
- Basic routing and UI framework (Vanilla TS)
- Vitest testing setup for core logic (adaptive, scoring)
- 1 Exercise placeholder: Grid-Memory

## Queue (P0/P1/P2)
- P0: Finish core exercises implementation
- P1: GitHub Pages automatic deployment
- P2: Sound system and detailed progress graphs
''',
    '.github/workflows/ci.yml': '''name: CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
    - run: npm install
    - run: npm run build
    - run: npm test
''',
    '.gitignore': '''node_modules/
dist/
.env
'''
}

for path, content in files.items():
    write_file(os.path.join(base_dir, path), content)
