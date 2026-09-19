export class ShapeEquationEngine {
  equations: {left: string[], right: number}[] = [];
  targetShape: string = '';
  targetVal: number = 0;
  options: number[] = [];
  
  start(params: {unknowns: number, maxVal: number}): {
    equations: {left: string[], right: number}[],
    targetShape: string,
    targetVal: number,
    options: number[]
  } {
    const shapes = ['▲', '●', '■', '★', '♦'];
    const selectedShapes = [...shapes].sort(() => Math.random() - 0.5).slice(0, params.unknowns);
    
    const vals = new Map<string, number>();
    for (const shape of selectedShapes) {
      vals.set(shape, Math.floor(Math.random() * params.maxVal) + 1);
    }
    
    this.equations = [];
    
    if (params.unknowns === 2) {
      const A = selectedShapes[0];
      const B = selectedShapes[1];
      this.equations.push({left: [A, A], right: vals.get(A)! * 2});
      this.equations.push({left: [A, B], right: vals.get(A)! + vals.get(B)!});
      this.targetShape = B;
      this.targetVal = vals.get(B)!;
    } else if (params.unknowns === 3) {
      const A = selectedShapes[0];
      const B = selectedShapes[1];
      const C = selectedShapes[2];
      this.equations.push({left: [A, A], right: vals.get(A)! * 2});
      this.equations.push({left: [A, B], right: vals.get(A)! + vals.get(B)!});
      this.equations.push({left: [B, C], right: vals.get(B)! + vals.get(C)!});
      this.targetShape = C;
      this.targetVal = vals.get(C)!;
    } else {
      const A = selectedShapes[0];
      const B = selectedShapes[1];
      const C = selectedShapes[2];
      const D = selectedShapes[3];
      this.equations.push({left: [A, A], right: vals.get(A)! * 2});
      this.equations.push({left: [A, B], right: vals.get(A)! + vals.get(B)!});
      this.equations.push({left: [B, C], right: vals.get(B)! + vals.get(C)!});
      this.equations.push({left: [C, D], right: vals.get(C)! + vals.get(D)!});
      this.targetShape = D;
      this.targetVal = vals.get(D)!;
    }
    
    this.options = [this.targetVal];
    while(this.options.length < 4) {
      const rnd = Math.max(1, this.targetVal + (Math.floor(Math.random() * 11) - 5));
      if (!this.options.includes(rnd)) {
        this.options.push(rnd);
      }
    }
    this.options.sort((a,b) => a - b);
    
    return { equations: this.equations, targetShape: this.targetShape, targetVal: this.targetVal, options: this.options };
  }

  submit(val: number | null): {accuracy: number} {
    return { accuracy: val === this.targetVal ? 1 : 0 };
  }
}
