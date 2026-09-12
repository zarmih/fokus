export class BlazeTapEngine {
  generatePosition(): { x: number; y: number } {
    return {
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80
    };
  }

  isHit(x: number, y: number, targetX: number, targetY: number): boolean {
    // Just a placeholder, actual hit is handled by DOM click events in view
    return true;
  }
}
