export class ChordTapEngine {
  targets: number = 0;
  
  start(params: {targets: number, distractors: number}) {
    this.targets = params.targets;
    return { 
      totalElements: params.targets + params.distractors,
      targets: params.targets
    };
  }

  submit(selectedCount: number, timeMs: number): {accuracy: number, rt: number} {
    let accuracy = selectedCount === this.targets ? 1 : 0;
    return {
      accuracy,
      rt: timeMs
    };
  }
}
