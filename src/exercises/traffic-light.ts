import { ExerciseManifest, ExerciseModule, BlockResult } from './contract';

export const manifest: ExerciseManifest = {
  id: 'traffic-light',
  name: 'Светофор',
  domain: 'flexibility',
  skills: ['rule_switching', 'inhibition'],
  metricModel: 'speed-accuracy',
  instruction: 'Слово ИДИ — нажимайте. Слово СТОП — не нажимайте. Если есть пунктирная рамка, правила меняются наоборот!'
};

export const trafficLightModule: ExerciseModule = {
  manifest,
  render(el, level, onEnd, isTimeUp) {
    let rounds = 0;
    let correct = 0;
    let totalRtMs = 0;
    let isActive = true;

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:sans-serif;">
        <div id="tl-box" style="font-size:3rem;font-weight:bold;padding:2rem 4rem;border-radius:12px;display:flex;align-items:center;justify-content:center;min-width:200px;min-height:100px;transition:all 0.2s;"></div>
        <div style="margin-top:3rem;">
          <button id="tl-btn-go" style="padding:1.5rem 4rem;font-size:2rem;background:#3498db;color:white;border:none;border-radius:12px;cursor:pointer;">НАЖАТЬ</button>
        </div>
      </div>
    `;

    const boxEl = el.querySelector('#tl-box') as HTMLElement;
    const btnGo = el.querySelector('#tl-btn-go') as HTMLButtonElement;

    let startRt = 0;
    let shouldClick = false;
    let timer1: any, timer2: any, timer3: any;

    const nextRound = () => {
      if (!isActive || isTimeUp()) {
        finish();
        return;
      }
      
      boxEl.innerHTML = '';
      boxEl.style.background = 'transparent';
      boxEl.style.border = 'none';
      btnGo.disabled = true;
      btnGo.style.opacity = '0.5';
      
      timer1 = setTimeout(() => {
        if (!isActive) return;
        
        const isStop = Math.random() > 0.5;
        const isInverted = Math.random() > (1 - Math.min(level * 0.1, 0.7));
        
        shouldClick = isStop ? isInverted : !isInverted;
        
        boxEl.innerText = isStop ? 'СТОП' : 'ИДИ';
        boxEl.style.color = isStop ? '#e74c3c' : '#2ecc71';
        
        if (isInverted) {
          boxEl.style.border = '6px dashed #333';
        } else {
          boxEl.style.border = '6px solid transparent';
        }
        
        btnGo.disabled = false;
        btnGo.style.opacity = '1';
        startRt = Date.now();
        
        timer2 = setTimeout(() => {
          if (!isActive || !startRt) return;
          handleTimeout();
        }, Math.max(1000, 2500 - level * 100));
        
      }, 500);
    };

    const handleTimeout = () => {
      rounds++;
      if (!shouldClick) {
        correct++;
      } else {
        totalRtMs += 2500;
      }
      startRt = 0;
      nextRound();
    };

    btnGo.onclick = () => {
      if (!isActive || !startRt) return;
      clearTimeout(timer2);
      rounds++;
      totalRtMs += (Date.now() - startRt);
      
      if (shouldClick) {
        correct++;
        boxEl.style.background = 'rgba(46, 204, 113, 0.2)';
      } else {
        boxEl.style.background = 'rgba(231, 76, 60, 0.2)';
      }
      
      startRt = 0;
      timer3 = setTimeout(nextRound, 300);
    };

    nextRound();

    function finish() {
      isActive = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      onEnd({
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: rounds > 0 ? totalRtMs / rounds : 0,
        rounds
      });
    }

    return () => { 
      isActive = false; 
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }
};

export default trafficLightModule;
