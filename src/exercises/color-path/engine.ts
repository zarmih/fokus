export class ColorPathEngine {
  start(level: number) {
    const isTarget = Math.random() > 0.5;
    return { isTarget };
  }
  submit(isTarget: boolean, clicked: boolean) {
    return { accuracy: isTarget === clicked ? 1 : 0 };
  }
}
