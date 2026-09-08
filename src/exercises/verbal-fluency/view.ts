import { VerbalFluencyEngine } from './engine';
import { verbalFluencyManifest } from './manifest';

export function renderVerbalFluency(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const duration = (level <= 3 && verbalFluencyManifest.levels) ? verbalFluencyManifest.levels[level as keyof typeof verbalFluencyManifest.levels].duration : 30;
  const engine = new VerbalFluencyEngine(duration);
  
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--danger); padding: 20px;">
        Ваш браузер не поддерживает распознавание речи. Пропускаем...
      </div>
    `;
    setTimeout(() => {
      onBlockEnd({ accuracy: 1, avgRtMs: 0, rounds: 1 });
    }, 2000);
    return () => {};
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.continuous = true;
  recognition.interimResults = false;

  let isListening = false;
  let wordCount = 0;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
      <div style="font-size: 1.5rem; color: var(--text); margin-bottom: 24px; text-align: center;">
        Назовите как можно больше животных
      </div>
      <button id="btn-mic" class="btn-primary" style="border-radius: 50%; width: 80px; height: 80px; font-size: 24px; margin-bottom: 32px; background: #333;">🎤</button>
      <div id="word-count" style="font-size: 2rem; font-weight: bold; color: var(--accent);">0</div>
      <div style="color: var(--muted); margin-top: 8px;">распознано слов</div>
      
      <div id="latest-word" style="margin-top: 24px; font-size: 1.2rem; min-height: 2rem; color: #4caf50;"></div>
    </div>
  `;

  const btnMic = container.querySelector('#btn-mic') as HTMLButtonElement;
  const wordCountEl = container.querySelector('#word-count') as HTMLElement;
  const latestWordEl = container.querySelector('#latest-word') as HTMLElement;

  btnMic.addEventListener('click', () => {
    if (!isListening) {
      recognition.start();
      isListening = true;
      btnMic.style.background = '#f44336';
      btnMic.style.boxShadow = '0 0 16px rgba(244, 67, 54, 0.5)';
    } else {
      recognition.stop();
      isListening = false;
      btnMic.style.background = '#333';
      btnMic.style.boxShadow = 'none';
      finishBlock();
    }
  });

  recognition.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        const transcript = event.results[i][0].transcript.trim().split(' ');
        transcript.forEach((w: string) => {
          if (engine.addWord(w)) {
            wordCount++;
            wordCountEl.textContent = wordCount.toString();
            latestWordEl.textContent = w;
          }
        });
      }
    }
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error', event.error);
  };

  const finishBlock = () => {
    recognition.stop();
    onBlockEnd({
      accuracy: Math.min(1, wordCount / 10), // normalize: 10 words is 100% accuracy equivalent
      avgRtMs: 1000,
      rounds: wordCount
    });
  };

  const interval = setInterval(() => {
    if (isTimeUp()) {
      finishBlock();
    }
  }, 1000);
  
  return () => {
    clearInterval(interval);
    if (isListening) recognition.stop();
  };
}
