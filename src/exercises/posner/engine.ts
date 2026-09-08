export type Side = 'left' | 'right';
export type CueType = 'valid' | 'invalid' | 'neutral';

export class PosnerEngine {
  nextTrial(invalidPct: number): { targetSide: Side, cueSide: Side | 'both' } {
    const targetSide: Side = Math.random() > 0.5 ? 'left' : 'right';
    
    if (Math.random() < 0.2) {
      return { targetSide, cueSide: 'both' };
    }
    
    const isInvalid = Math.random() < invalidPct;
    let cueSide: Side = targetSide;
    
    if (isInvalid) {
      cueSide = targetSide === 'left' ? 'right' : 'left';
    }
    
    return { targetSide, cueSide };
  }

  submit(userSide: Side, actualSide: Side): boolean {
    return userSide === actualSide;
  }
}
