export class DominantColorEngine {
  cells: string[] = [];
  dominantColor: string = '';
  options: string[] = [];
  
  start(params: {grid: number, colors: number}): {cells: string[], dominantColor: string, options: string[]} {
    const totalCells = params.grid * params.grid;
    
    // Choose colors
    const palette = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#d946ef'];
    const selectedColors = [...palette].sort(() => Math.random() - 0.5).slice(0, params.colors);
    
    this.options = [...selectedColors].sort(() => Math.random() - 0.5);

    let counts = new Array(params.colors).fill(0);
    for (let i = 0; i < totalCells; i++) {
        counts[Math.floor(Math.random() * params.colors)]++;
    }

    let max = -1;
    let maxIdx = -1;
    let isTie = false;
    for(let i=0; i<counts.length; i++) {
        if(counts[i] > max) { max = counts[i]; maxIdx = i; isTie = false; }
        else if (counts[i] === max) { isTie = true; }
    }
    
    if (isTie) {
        for(let i=0; i<counts.length; i++) {
            if (i !== maxIdx && counts[i] > 0) {
                counts[i]--;
                counts[maxIdx]++;
                break;
            }
        }
    }
    
    this.dominantColor = selectedColors[maxIdx];

    this.cells = [];
    for(let i=0; i<params.colors; i++) {
        for(let c=0; c<counts[i]; c++) {
            this.cells.push(selectedColors[i]);
        }
    }
    this.cells.sort(() => Math.random() - 0.5);

    return { cells: this.cells, dominantColor: this.dominantColor, options: this.options };
  }

  submit(color: string | null): {accuracy: number} {
    return { accuracy: color === this.dominantColor ? 1 : 0 };
  }
}
