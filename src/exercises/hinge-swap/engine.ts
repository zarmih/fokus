export type HingeRule = 'even' | 'odd';
export type HingeColor = 'blue' | 'green';

export class HingeSwapEngine {
  generateTask(numbers: number[], swapChance: number, currentRule: HingeRule): { num: number, rule: HingeRule, color: HingeColor } {
    let rule = currentRule;
    if (Math.random() < swapChance) {
      rule = rule === 'even' ? 'odd' : 'even';
    }
    
    const num = numbers[Math.floor(Math.random() * numbers.length)];
    const color = rule === 'even' ? 'blue' : 'green';
    
    return { num, rule, color };
  }

  isCorrect(num: number, rule: HingeRule, answerIsEven: boolean): boolean {
    const isNumEven = num % 2 === 0;
    if (rule === 'even') {
      return answerIsEven === isNumEven;
    } else {
      return answerIsEven !== isNumEven; // Actually wait: rule is ODD (green). If answerIsEven is false, that means they picked ODD. And if isNumEven is false, it's odd.
      // Simpler: 
      // User says "Yes it matches rule", but the UI usually has two buttons "Even", "Odd".
      // If answerIsEven is true, user claims num is even. 
      // The correctness just depends on whether the user correctly identified the number parity regardless of the rule.
      // WAIT! The instruction is: "Если фон СИНИЙ — выбирайте чётные. Если ЗЕЛЁНЫЙ — нечётные."
      // Ah. That implies it's a Go/No-Go or 2-choice task? 
      // If the task shows 2 numbers, one even one odd, user picks one based on color.
      // Let's adjust engine to generate TWO numbers (one even, one odd) and user clicks one.
    }
  }

  generateTwoNumbers(numbers: number[]): { n1: number, n2: number } {
    const evens = numbers.filter(n => n % 2 === 0);
    const odds = numbers.filter(n => n % 2 !== 0);
    const e = evens[Math.floor(Math.random() * evens.length)] || 2;
    const o = odds[Math.floor(Math.random() * odds.length)] || 1;
    
    return Math.random() > 0.5 ? { n1: e, n2: o } : { n1: o, n2: e };
  }
}
