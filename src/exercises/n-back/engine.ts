export type VisualSymbol = 'square' | 'circle' | 'triangle' | 'star' | 'cross' | 'hexagon';
export type AudioSymbol = 'А' | 'Б' | 'В' | 'Г' | 'Д' | 'Е';

export const VISUALS: VisualSymbol[] = ['square', 'circle', 'triangle', 'star', 'cross', 'hexagon'];
export const AUDIOS: AudioSymbol[] = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

export class NBackEngine {
  private n: number;
  private visualHistory: VisualSymbol[] = [];
  private audioHistory: AudioSymbol[] = [];
  
  constructor(n: number) {
    this.n = n;
  }

  nextTrial(matchChance: number): { visual: VisualSymbol, audio: AudioSymbol, isVisualMatch: boolean, isAudioMatch: boolean } {
    let visual: VisualSymbol;
    let audio: AudioSymbol;
    let isVisualMatch = false;
    let isAudioMatch = false;

    if (this.visualHistory.length >= this.n && Math.random() < matchChance) {
      visual = this.visualHistory[this.visualHistory.length - this.n];
      isVisualMatch = true;
    } else {
      const available = VISUALS.filter(s => this.visualHistory.length < this.n || s !== this.visualHistory[this.visualHistory.length - this.n]);
      visual = available[Math.floor(Math.random() * available.length)];
    }

    if (this.audioHistory.length >= this.n && Math.random() < matchChance) {
      audio = this.audioHistory[this.audioHistory.length - this.n];
      isAudioMatch = true;
    } else {
      const available = AUDIOS.filter(s => this.audioHistory.length < this.n || s !== this.audioHistory[this.audioHistory.length - this.n]);
      audio = available[Math.floor(Math.random() * available.length)];
    }

    this.visualHistory.push(visual);
    this.audioHistory.push(audio);
    return { visual, audio, isVisualMatch, isAudioMatch };
  }

  submit(isVisualMatch: boolean, isAudioMatch: boolean, userVisual: boolean, userAudio: boolean): boolean {
    return isVisualMatch === userVisual && isAudioMatch === userAudio;
  }
}
