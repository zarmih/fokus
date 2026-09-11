export class FrameSwapEngine {
  startRound(params: { optionsCount: number }): {
    rule: 'color' | 'shape',
    target: { color: string, shape: string },
    options: { color: string, shape: string }[],
    correctIndex: number
  } {
    const rule = Math.random() > 0.5 ? 'color' : 'shape';
    const colors = ['var(--danger)', 'var(--ok)', 'var(--primary)', 'var(--warning)'];
    const shapes = ['circle', 'square', 'triangle'];
    
    const target = {
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)]
    };

    const options: { color: string, shape: string }[] = [];
    const correctIndex = Math.floor(Math.random() * params.optionsCount);
    
    for (let i = 0; i < params.optionsCount; i++) {
      if (i === correctIndex) {
        if (rule === 'color') {
          options.push({ color: target.color, shape: shapes.find(s => s !== target.shape) || 'square' });
        } else {
          options.push({ color: colors.find(c => c !== target.color) || 'var(--primary)', shape: target.shape });
        }
      } else {
        options.push({
          color: colors.find(c => c !== target.color) || 'var(--warning)',
          shape: shapes.find(s => s !== target.shape) || 'triangle'
        });
      }
    }
    return { rule, target, options, correctIndex };
  }
  submit(selectedIndex: number, correctIndex: number): { correct: boolean } {
    return { correct: selectedIndex === correctIndex };
  }
}
