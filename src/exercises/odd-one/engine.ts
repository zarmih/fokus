export class OddOneEngine {
  oddIndex: number = -1;
  cells: any[] = [];
  
  start(params: {grid: number, deltaHue: number}): {oddIndex: number, cells: any[]} {
    const totalCells = params.grid * params.grid;
    this.oddIndex = Math.floor(Math.random() * totalCells);
    
    const baseHue = Math.floor(Math.random() * 360);
    const oddHue = (baseHue + params.deltaHue) % 360;

    this.cells = Array.from({length: totalCells}).map((_, i) => ({
      isOdd: i === this.oddIndex,
      hue: i === this.oddIndex ? oddHue : baseHue
    }));
    
    return { oddIndex: this.oddIndex, cells: this.cells };
  }

  submit(selectedIndex: number | null): {accuracy: number} {
    return { accuracy: selectedIndex === this.oddIndex ? 1 : 0 };
  }
}
