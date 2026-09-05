import { describe, it, expect } from 'vitest';
import { PulleyEngine } from '../src/exercises/pulley/engine';
import { getPulleyParams } from '../src/exercises/pulley/manifest';

describe('pulley engine', () => {
  it('enforces max 2 weights per hook', () => {
    const engine = new PulleyEngine();
    engine.generate({ doors: 4, need: [10,10,10,10], pool: [1,2,3,4] });
    expect(engine.takeFloor(0)).toBe(true);
    expect(engine.takeFloor(0)).toBe(true);
    expect(engine.takeFloor(0)).toBe(false); // 3rd weight rejected
    expect(engine.gates[0].hook.length).toBe(2);
  });

  it('L1 greedy trap fails, correct path wins', () => {
    const params = getPulleyParams(1);
    expect(params.doors).toBe(4);
    
    // Greedy trap: 6
    const engineTrap = new PulleyEngine();
    engineTrap.generate(params); // need: [6, 9, 7, 5], pool: [1, 1, 2, 4, 4, 4, 4, 5, 6]
    
    const idx6 = engineTrap.floor.indexOf(6);
    engineTrap.takeFloor(idx6);
    expect(engineTrap.walk()).toBe(true); // passed door 1 with 6
    
    // door 2 needs 9
    const idx4 = engineTrap.floor.indexOf(4);
    engineTrap.takeFloor(idx4);
    const idx5 = engineTrap.floor.indexOf(5);
    engineTrap.takeFloor(idx5);
    expect(engineTrap.walk()).toBe(true); // passed door 2 with 9
    
    // door 3 needs 7
    // remaining floor: [1, 1, 2, 4, 4, 4]
    // no pair sums to 7, no single is 7.
    // we can't put 3 elements (1+2+4=7) because max 2.
    // so we are stuck!
    engineTrap.takeFloor(engineTrap.floor.indexOf(4));
    engineTrap.takeFloor(engineTrap.floor.indexOf(2));
    expect(engineTrap.walk()).toBe(false); // 6 != 7
    engineTrap.dropHook(1);
    engineTrap.dropHook(0);
    
    // Correct path wins
    const engineWin = new PulleyEngine();
    engineWin.generate(params);
    
    // 6 = 2 + 4
    engineWin.takeFloor(engineWin.floor.indexOf(2));
    engineWin.takeFloor(engineWin.floor.indexOf(4));
    expect(engineWin.walk()).toBe(true);
    
    // 9 = 4 + 5
    engineWin.takeFloor(engineWin.floor.indexOf(4));
    engineWin.takeFloor(engineWin.floor.indexOf(5));
    expect(engineWin.walk()).toBe(true);
    
    // 7 = 1 + 6
    engineWin.takeFloor(engineWin.floor.indexOf(1));
    engineWin.takeFloor(engineWin.floor.indexOf(6));
    expect(engineWin.walk()).toBe(true);
    
    // 5 = 1 + 4
    engineWin.takeFloor(engineWin.floor.indexOf(1));
    engineWin.takeFloor(engineWin.floor.indexOf(4));
    expect(engineWin.walk()).toBe(true);
    
    expect(engineWin.status).toBe('win');
  });
});
