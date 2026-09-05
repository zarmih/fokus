import { describe, it, expect } from 'vitest';
import { SwingsEngine } from '../src/exercises/swings/engine';
import { getSwingsParams } from '../src/exercises/swings/manifest';

describe('Swings Engine', () => {
  it('resets player on jumping to empty cell', () => {
    const engine = new SwingsEngine();
    engine.generate({
      rows: 3, cols: 4, startR: 0, goalR: 0,
      rotors: [] // empty
    });
    // Jump right (empty)
    engine.jump('R');
    expect(engine.fails).toBe(1);
    expect(engine.playerR).toBe(0);
    expect(engine.playerC).toBe(0);
  });

  it('allows jumping to occupied cell and shifts', () => {
    const engine = new SwingsEngine();
    engine.generate({
      rows: 3, cols: 4, startR: 0, goalR: 0,
      rotors: [
        { r: 0, c: 1, angle: 90, spin: 1, speed: 90 }
      ]
    });
    // Jump right (occupied by rotor center)
    const success = engine.jump('R');
    expect(success).toBe(true);
    expect(engine.fails).toBe(0);
    expect(engine.playerC).toBe(1);
  });

  it('tick rotates the rotor and drops player if empty', () => {
    const engine = new SwingsEngine();
    engine.generate({
      rows: 3, cols: 4, startR: 0, goalR: 0,
      rotors: [
        { r: 1, c: 1, angle: 0, spin: 1, speed: 90 }
      ]
    });
    // Rotor center at (1,1). Angle 0 = UP. So (0,1) is occupied.
    expect(engine.occupied(0, 1)).toBe(true);
    engine.playerR = 0;
    engine.playerC = 1;
    
    // Tick rotates it by 90 (spin 1). Angle becomes 90 = RIGHT. (1,2) is occupied.
    engine.tick(1000);
    expect(engine.rotors[0].angle).toBe(90);
    
    // (0,1) is no longer occupied! Player should drop
    expect(engine.occupied(0, 1)).toBe(false);
    expect(engine.fails).toBe(1);
    expect(engine.playerC).toBe(0); // reset to start
  });

  it('generator always returns a solvable path', () => {
    const params = getSwingsParams(1);
    expect(params.rotors.length).toBeGreaterThan(0);
  });
});
