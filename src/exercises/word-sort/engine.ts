export class WordSortEngine {
  start(level: number) {
    const isVowel = Math.random() > 0.5;
    return { isVowel };
  }
  submit(isVowel: boolean, ansVowel: boolean) {
    return { accuracy: isVowel === ansVowel ? 1 : 0 };
  }
}
