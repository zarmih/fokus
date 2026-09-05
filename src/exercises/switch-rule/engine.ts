export type RuleType = 'EVEN' | 'GREATER';

export function computeAnswer(rule: RuleType, left: number, right: number): boolean {
  if (rule === 'EVEN') return left % 2 === 0;
  return left > right;
}

export class SwitchRuleEngine {
  private currentRule: RuleType = 'EVEN';
  private trialCount = 0;
  
  nextTrial(params: {switchEvery: number}): {rule: RuleType, left: number, right: number, correctYes: boolean} {
    if (this.trialCount > 0 && this.trialCount % params.switchEvery === 0) {
      this.currentRule = this.currentRule === 'EVEN' ? 'GREATER' : 'EVEN';
    }
    this.trialCount++;
    
    let left = Math.floor(Math.random() * 9) + 1;
    let right = Math.floor(Math.random() * 9) + 1;
    while(left === right) {
      right = Math.floor(Math.random() * 9) + 1;
    }
    
    const correctYes = computeAnswer(this.currentRule, left, right);
    
    return { rule: this.currentRule, left, right, correctYes };
  }

  submit(choice: boolean | null, answer: boolean): boolean {
    return choice === answer;
  }
}
