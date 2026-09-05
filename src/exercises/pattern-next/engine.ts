export class PatternNextEngine {
  nextTrial(params: {ruleType: string, distractors: number}): {sequence: number[], answer: number, options: number[]} {
    const seqLength = 4;
    const seq: number[] = [];
    let start = Math.floor(Math.random() * 5) + 1;
    let answer = 0;

    switch(params.ruleType) {
      case 'ADD_1':
        for(let i=0; i<seqLength; i++) seq.push(start + i);
        answer = start + seqLength;
        break;
      case 'ADD_2':
        for(let i=0; i<seqLength; i++) seq.push(start + i*2);
        answer = start + seqLength*2;
        break;
      case 'SUB_1':
        start = Math.floor(Math.random() * 5) + 10;
        for(let i=0; i<seqLength; i++) seq.push(start - i);
        answer = start - seqLength;
        break;
      case 'SUB_2':
        start = Math.floor(Math.random() * 5) + 15;
        for(let i=0; i<seqLength; i++) seq.push(start - i*2);
        answer = start - seqLength*2;
        break;
      case 'ADD_3':
        for(let i=0; i<seqLength; i++) seq.push(start + i*3);
        answer = start + seqLength*3;
        break;
      case 'ALT_1_2':
        seq.push(start);
        for(let i=1; i<seqLength; i++) seq.push(seq[i-1] + (i%2===1 ? 1 : 2));
        answer = seq[seqLength-1] + (seqLength%2===1 ? 1 : 2);
        break;
      case 'ALT_2_3':
        seq.push(start);
        for(let i=1; i<seqLength; i++) seq.push(seq[i-1] + (i%2===1 ? 2 : 3));
        answer = seq[seqLength-1] + (seqLength%2===1 ? 2 : 3);
        break;
      case 'MUL_2':
        for(let i=0; i<seqLength; i++) seq.push(start * Math.pow(2, i));
        answer = start * Math.pow(2, seqLength);
        break;
      case 'ALT_1_MINUS_2':
        seq.push(start + 10);
        for(let i=1; i<seqLength; i++) seq.push(seq[i-1] + (i%2===1 ? 1 : -2));
        answer = seq[seqLength-1] + (seqLength%2===1 ? 1 : -2);
        break;
      case 'MUL_3':
        for(let i=0; i<seqLength; i++) seq.push(start * Math.pow(3, i));
        answer = start * Math.pow(3, seqLength);
        break;
      case 'SQUARE':
        for(let i=0; i<seqLength; i++) seq.push(Math.pow(start + i, 2));
        answer = Math.pow(start + seqLength, 2);
        break;
      case 'FIBONACCI':
        let a = start, b = start + Math.floor(Math.random()*3)+1;
        seq.push(a, b);
        for(let i=2; i<seqLength; i++) {
          const next = seq[i-1] + seq[i-2];
          seq.push(next);
        }
        answer = seq[seqLength-1] + seq[seqLength-2];
        break;
      default:
        for(let i=0; i<seqLength; i++) seq.push(start + i);
        answer = start + seqLength;
        break;
    }

    const options = [answer];
    while(options.length < params.distractors + 1) {
      let distract = answer + Math.floor(Math.random() * 10) - 5;
      if (distract === answer || options.includes(distract) || distract < 0) continue;
      options.push(distract);
    }
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return { sequence: seq, answer, options };
  }

  submit(choice: number | null, answer: number): boolean {
    return choice === answer;
  }
}
