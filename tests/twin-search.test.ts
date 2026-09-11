import { expect, test } from 'vitest';
import { TwinSearchEngine } from '../src/exercises/twin-search/engine';

test('twin-search engine', () => {
  const engine = new TwinSearchEngine();
  const state = engine.start(1);
  
  expect(state.items.length).toBe(16);
  expect(state.twinIds.length).toBe(2);
  
  const twin1 = state.items.find(i => i.id === state.twinIds[0]);
  const twin2 = state.items.find(i => i.id === state.twinIds[1]);
  
  expect(twin1).toBeDefined();
  expect(twin2).toBeDefined();
  expect(twin1!.shape).toBe(twin2!.shape);
  expect(twin1!.color).toBe(twin2!.color);
  expect(twin1!.pattern).toBe(twin2!.pattern);
  
  expect(engine.submit(state, state.twinIds).accuracy).toBe(1);
  const wrongIds = [state.items[0].id, state.items[1].id];
  if (wrongIds[0] === state.twinIds[0] && wrongIds[1] === state.twinIds[1]) {
    wrongIds[1] = state.items[2].id;
  }
  expect(engine.submit(state, wrongIds).accuracy).toBe(0);
});
