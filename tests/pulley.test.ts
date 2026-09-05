import { describe, it, expect } from 'vitest';
import { PulleyEngine } from '../src/exercises/pulley/engine';

describe('pulley engine', () => {
  it('L1 logic: take both and walk to win', () => {
    const engine = new PulleyEngine();
    engine.generate({ doors: 3, need: [2, 3, 4], pool: [1, 1, 2, 2, 3] });
    expect(engine.status).toBe('play');
    expect(engine.gates.length).toBeGreaterThanOrEqual(3);
    
    expect(engine.walk()).toBe(false); // sum 0 != 2
    
    engine.takeFloor(2); // take 2 (was pool[2])
    expect(engine.walk()).toBe(true);
    expect(engine.playerAt).toBe(1);

    expect(engine.dropHook(0)).toBe(false); // try to drop from passed door
  });

  it('L1 logic: wrong sum', () => {
    const engine = new PulleyEngine();
    engine.generate({ doors: 3, need: [2, 3, 4], pool: [1, 1, 2, 2, 3] });
    
    engine.takeFloor(0); // hook: [1]
    engine.takeFloor(0); // hook: [1, 1]
    expect(engine.walk()).toBe(true); 

    engine.takeFloor(0); // take 2
    engine.takeFloor(0); // take 2
    expect(engine.walk()).toBe(false); // sum 4 != 3
    
    engine.dropHook(0); // drop 2 from current hook
    expect(engine.walk()).toBe(false); // sum 2 != 3
  });
});
