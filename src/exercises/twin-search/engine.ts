export interface TwinItem {
  id: number;
  shape: string;
  color: string;
  pattern: string;
}

export interface TwinSearchState {
  items: TwinItem[];
  twinIds: [number, number];
}

export class TwinSearchEngine {
  private shapes = ['circle', 'square', 'triangle', 'diamond'];
  private colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  private patterns = ['solid', 'outline'];

  start(level: number): TwinSearchState {
    const allCombinations: Omit<TwinItem, 'id'>[] = [];
    for (const shape of this.shapes) {
      for (const color of this.colors) {
        for (const pattern of this.patterns) {
          allCombinations.push({ shape, color, pattern });
        }
      }
    }
    
    allCombinations.sort(() => Math.random() - 0.5);
    
    const gridSize = level > 5 ? 25 : 16;
    const selected = allCombinations.slice(0, gridSize - 1);
    const twinSource = selected[Math.floor(Math.random() * selected.length)];
    
    const items: TwinItem[] = [];
    let idCounter = 1;
    
    selected.forEach(s => items.push({ id: idCounter++, ...s }));
    items.push({ id: idCounter++, ...twinSource });
    
    items.sort(() => Math.random() - 0.5);
    
    const twinIds = items.filter(i => 
      i.shape === twinSource.shape && 
      i.color === twinSource.color && 
      i.pattern === twinSource.pattern
    ).map(i => i.id) as [number, number];
    
    return { items, twinIds };
  }

  submit(state: TwinSearchState, selectedIds: number[]): { accuracy: number } {
    if (selectedIds.length !== 2) return { accuracy: 0 };
    const correct = selectedIds.every(id => state.twinIds.includes(id));
    return { accuracy: correct ? 1 : 0 };
  }
}
