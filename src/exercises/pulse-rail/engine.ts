export class PulseRailEngine {
  startRound(params: { colors: number }): { targetColor: string, side: 'left' | 'right', stimulusColor: string, isTarget: boolean } {
    const palette = ['var(--danger)', 'var(--ok)', 'var(--primary)', 'var(--warning)'].slice(0, params.colors);
    const targetColor = palette[Math.floor(Math.random() * palette.length)];
    const side = Math.random() > 0.5 ? 'left' : 'right';
    const isTarget = Math.random() > 0.4;
    let stimulusColor = targetColor;
    if (!isTarget) {
      const distractors = palette.filter(c => c !== targetColor);
      stimulusColor = distractors[Math.floor(Math.random() * distractors.length)];
    }
    return { targetColor, side, stimulusColor, isTarget };
  }

  submit(action: 'left' | 'right' | 'none', state: { side: 'left' | 'right', isTarget: boolean }): { correct: boolean } {
    if (state.isTarget) {
      return { correct: action === state.side };
    } else {
      return { correct: action === 'none' };
    }
  }
}
