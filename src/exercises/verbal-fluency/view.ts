import { VerbalFluencyEngine } from './engine';
import { verbalFluencyManifest } from './manifest';
import { mountStage } from '../stage';

export function renderVerbalFluency(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const duration = (level <= 3 && verbalFluencyManifest.levels) ? verbalFluencyManifest.levels[level as keyof typeof verbalFluencyManifest.levels].duration : 30;
  const engine = new VerbalFluencyEngine(duration);
  const stage = mountStage(container, 'flexibility');
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    stage.setStatus('Нет распознавания речи');
    stage.board.innerHTML = `<p style="color:var(--muted);text-align:center;max-width:280px">Браузер не умеет слушать. Пропускаем блок.</p>`;
    const t = window.setTimeout(() => {
      stage.cleanup();
      onBlockEnd({ accuracy: 1, avgRtMs: 0, rounds: 1 });
    }, 1600);
    return () => { clearTimeout(t); stage.cleanup(); };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.continuous = true;
  recognition.interimResults = false;
  let isListening = false;
  let wordCount = 0;

  stage.setStatus('Назовите животных');
  stage.board.innerHTML = `
    <button id="btn-mic" class="mic-orb" type="button">🎤</button>
    <div id="word-count" class="eq-3d" style="margin:12px 0 0;font-size:56px">0</div>
    <div style="color:var(--muted);font-size:13px;letter-spacing:.08em;text-transform:uppercase">слов</div>
    <div id="latest-word" style="margin-top:16px;min-height:1.4em;color:var(--ok);font-weight:700"></div>
  `;
  const btnMic = stage.board.querySelector('#btn-mic') as HTMLButtonElement;
  const wordCountEl = stage.board.querySelector('#word-count') as HTMLElement;
  const latestWordEl = stage.board.querySelector('#latest-word') as HTMLElement;

  const finishBlock = () => {
    recognition.stop();
    stage.cleanup();
    onBlockEnd({
      accuracy: Math.min(1, wordCount / 10),
      avgRtMs: 1000,
      rounds: wordCount
    });
  };

  btnMic.addEventListener('click', () => {
    if (!isListening) {
      recognition.start();
      isListening = true;
      btnMic.classList.add('live');
      stage.setStatus('Слушаю…');
    } else {
      isListening = false;
      finishBlock();
    }
  });

  recognition.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        event.results[i][0].transcript.trim().split(' ').forEach((w: string) => {
          if (engine.addWord(w)) {
            wordCount++;
            wordCountEl.textContent = String(wordCount);
            latestWordEl.textContent = w;
            stage.burst(true);
          }
        });
      }
    }
  };

  const interval = window.setInterval(() => { if (isTimeUp()) finishBlock(); }, 1000);
  return () => {
    clearInterval(interval);
    if (isListening) recognition.stop();
    stage.cleanup();
  };
}
