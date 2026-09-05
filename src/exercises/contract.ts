export type Domain = 'attention' | 'memory' | 'speed' | 'flexibility' | 'logic';

export interface BlockResult {
  accuracy: number;
  avgRtMs: number;
  rounds: number;
}

export interface ExerciseModule {
  manifest: { id: string; name: string; domain: Domain; instruction: string };
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean): void | (() => void);
}
