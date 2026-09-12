export class LogicGridEngine {
  start(level: number) {
    const isTarget = Math.random() > 0.5;
    return { isTarget };
  }
  submit(isTarget: boolean, ans: boolean) {
    return { accuracy: isTarget === ans ? 1 : 0 };
  }
}
