export type RuleType = 'EVEN' | 'GREATER';

export class SwitchRuleEngine {
  private currentRule: RuleType = 'EVEN';
  private trialCount = 0;
  
  nextTrial(params: {switchEvery: number}): {rule: RuleType, n1: number, n2: number, answer: boolean} {
    if (this.trialCount > 0 && this.trialCount % params.switchEvery === 0) {
      this.currentRule = this.currentRule === 'EVEN' ? 'GREATER' : 'EVEN';
    }
    this.trialCount++;
    
    let n1 = Math.floor(Math.random() * 9) + 1;
    let n2 = Math.floor(Math.random() * 9) + 1;
    while(n1 === n2) {
      n2 = Math.floor(Math.random() * 9) + 1;
    }
    
    let answer = false;
    if (this.currentRule === 'EVEN') {
      answer = n1 % 2 === 0;
    } else {
      answer = n1 > n2;
    }
    
    return { rule: this.currentRule, n1, n2, answer };
  }

  submit(choice: boolean | null, answer: boolean): boolean {
    return choice === answer;
  }
}
