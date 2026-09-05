import { describe, it, expect } from 'vitest';
import { PulleyEngine } from '../src/exercises/pulley/engine';

describe('pulley engine', () => {
  it('L1 logic: take both and walk to win', () => {
    const engine = new PulleyEngine();
    engine.generate({ doors: 1, need: [3], pool: [1, 2] });
    expect(engine.status).toBe('play');
    expect(engine.floor).toEqual([1, 2]);
    
    expect(engine.walk()).toBe(false); // sum 0 != 3
    
    expect(engine.takeFloor(0)).toBe(true); // hook: [1], floor: [2]
    expect(engine.takeFloor(0)).toBe(true); // hook: [1, 2], floor: []
    
    expect(engine.walk()).toBe(true);
    expect(engine.status).toBe('win');
  });

  it('L1 logic: wrong sum', () => {
    const engine = new PulleyEngine();
    engine.generate({ doors: 1, need: [3], pool: [1, 3] });
    
    engine.takeFloor(0); // hook: [1]
    engine.takeFloor(0); // hook: [1, 3]
    expect(engine.walk()).toBe(false); // sum 4 != 3
    
    engine.dropHook(0); // drop 1
    expect(engine.walk()).toBe(true); // sum 3 == 3
    expect(engine.status).toBe('win');
  });
});
