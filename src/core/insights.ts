import type { DomainIndex, SkillIndex, ExerciseState, DaySummary, Session } from './types';
import { catalog, getManifest } from '../exercises/catalog';
import { domainLabel, skillLabel } from './labels';
import { analyzeChronotype } from './coach';
import { computeAbilityTrajectory } from './ability-trajectory';
import { L } from './i18n';
import { exerciseName } from './exercise-copy';

export interface CognitiveInsight {
  type: 'improvement' | 'plateau' | 'consistency' | 'strength' | 'area_to_focus' | 'milestone' | 'recovery';
  title: string;
  description: string;
  confidence: 'low' | 'medium' | 'high';
  priority: number;
  domainId?: string;
  exerciseId?: string;
}

export function generateInsights(
  domains: DomainIndex[],
  skills: SkillIndex[],
  states: ExerciseState[],
  daySummaries: DaySummary[],
  sessions: Session[] = []
): CognitiveInsight[] {
  const insights: CognitiveInsight[] = [];
  
  // Need enough data
  const totalDays = daySummaries.length;
  if (totalDays < 2) {
    return [];
  }

  const catalogRefs = catalog.map((c) => ({ id: c.manifest.id, domain: c.manifest.domain }));
  const trajectory = computeAbilityTrajectory({ sessions, domains, catalog: catalogRefs });

  if (trajectory.ready) {
    // Look for rising weak domain
    const risingWeak = trajectory.domains.find(d => d.trend === 'rising' && d.theta < 0.4);
    if (risingWeak) {
      insights.push({
        type: 'improvement',
        title: L('Уверенный старт', 'Strong start'),
        description: L(`В области «${domainLabel(risingWeak.domain)}» наметилась положительная динамика. Регулярные короткие сессии закрепляют результат.`, `Positive trend in "${domainLabel(risingWeak.domain)}". Regular short sessions reinforce progress.`),
        confidence: 'high',
        priority: 85,
        domainId: risingWeak.domain
      });
    }

    // Look for falling domain
    const falling = trajectory.domains.find(d => d.trend === 'falling');
    if (falling) {
      insights.push({
        type: 'recovery',
        title: L('Цикл адаптации', 'Adaptation cycle'),
        description: L(`Показатели в «${domainLabel(falling.domain)}» пошли на спад. Fokus временно снизит сложность, чтобы вы восстановили точность без лишнего напряжения.`, `Scores in "${domainLabel(falling.domain)}" dipped. Fokus will temporarily ease difficulty so you can rebuild accuracy calmly.`),
        confidence: 'high',
        priority: 82,
        domainId: falling.domain
      });
    }

    // Stable strong domain
    const stableStrong = trajectory.domains.find(d => d.theta > 0.7 && (d.trend === 'stable' || d.trend === 'rising'));
    if (stableStrong) {
      insights.push({
        type: 'strength',
        title: L('Устойчивая база', 'Steady base'),
        description: L(`«${domainLabel(stableStrong.domain)}» — ваша стабильная сильная сторона. Fokus будет поддерживать этот уровень без изнурительных пиковых нагрузок.`, `"${domainLabel(stableStrong.domain)}" is your consistent strength. Fokus will sustain this level without excessive strain.`),
        confidence: 'high',
        priority: 70,
        domainId: stableStrong.domain
      });
    }

    // Area to focus based on trajectory
    const stagnantWeak = trajectory.domains.find(d => d.trend === 'stable' && d.theta < 0.3);
    if (stagnantWeak && !risingWeak && !falling) {
      insights.push({
        type: 'area_to_focus',
        title: L('Зона роста', 'Growth area'),
        description: L(`«${domainLabel(stagnantWeak.domain)}» пока поддаётся сложнее. Короткие регулярные подходы помогут постепенно освоиться без лишнего напряжения.`, `"${domainLabel(stagnantWeak.domain)}" needs more practice. Short regular sessions will help you adapt without pressure.`),
        confidence: 'high',
        priority: 75,
        domainId: stagnantWeak.domain
      });
    }
  } else {
    // Fallback if trajectory not ready
    const sortedDomains = [...domains].sort((a, b) => b.value - a.value);
    if (sortedDomains.length >= 2) {
      const strongest = sortedDomains[0];
      const weakest = sortedDomains[sortedDomains.length - 1];
      
      const getDomainConfidence = (domainId: string) => {
        const relatedSkills = catalog.filter(r => r.manifest.domain === domainId).flatMap(r => r.manifest.skills);
        const relevantSkills = skills.filter(s => (relatedSkills as string[]).includes(s.skill));
        const avgConfidence = relevantSkills.length > 0 
          ? relevantSkills.reduce((sum, s) => sum + s.confidence, 0) / relevantSkills.length
          : 0;
        return avgConfidence;
      };
      
      const strongConf = getDomainConfidence(strongest.domain);
      if (strongest.value > 600) {
        insights.push({
          type: 'strength',
          title: L('Сильная сторона', 'Strength'),
          description: L(`«${domainLabel(strongest.domain)}» — ваша сильная область. Fokus продолжит её поддерживать, балансируя нагрузку с другими областями.`, `"${domainLabel(strongest.domain)}" is your strong domain. Fokus will keep supporting it while balancing workload across domains.`),
          confidence: strongConf > 70 ? 'high' : (strongConf > 40 ? 'medium' : 'low'),
          priority: 50 + (strongest.value / 100),
          domainId: strongest.domain
        });
      }
      
      const weakConf = getDomainConfidence(weakest.domain);
      if (weakest.value < 500 && weakest.value > 0) {
        insights.push({
          type: 'area_to_focus',
          title: L('Зона роста', 'Growth area'),
          description: L(`«${domainLabel(weakest.domain)}» пока поддаётся сложнее. Короткие регулярные подходы помогут постепенно освоиться без лишнего напряжения.`, `"${domainLabel(weakest.domain)}" needs more practice. Short regular sessions will help you adapt without pressure.`),
          confidence: weakConf > 70 ? 'high' : (weakConf > 40 ? 'medium' : 'low'),
          priority: 60 + ((500 - weakest.value) / 10),
          domainId: weakest.domain
        });
      }
    }
  }

  // Adaptive Intelligence: Difficulty / Accuracy trade-offs
  const strugglingState = states.find(s => s.difficulty >= 10 && s.lastAccuracy > 0 && s.lastAccuracy < 0.70);
  if (strugglingState) {
    const manifest = getManifest(strugglingState.exerciseId);
    if (manifest) {
      insights.push({
        type: 'area_to_focus',
        title: L('Предел сложности', 'Difficulty ceiling'),
        description: L(`В «${exerciseName(manifest)}» вы достигли уровня, где точность начинает падать. Мы немного откатим сложность для закрепления фундамента.`, `In "${exerciseName(manifest)}" you reached a level where accuracy begins to dip. We will ease difficulty slightly to reinforce fundamentals.`),
        confidence: 'high',
        priority: 78,
        exerciseId: strugglingState.exerciseId,
        domainId: manifest.domain
      });
    }
  }

  const masteringState = states.find(s => (s.mastery ?? 0) >= 90 && (s.consecutivePlateau || 0) < 3);
  if (masteringState) {
    const manifest = getManifest(masteringState.exerciseId);
    if (manifest) {
      insights.push({
        type: 'strength',
        title: L('Высокое мастерство', 'High mastery'),
        description: L(`В «${exerciseName(manifest)}» вы показываете отличный баланс скорости и точности. Навык переходит в автоматический режим.`, `In "${exerciseName(manifest)}" you demonstrate great speed and accuracy. The skill is becoming automatic.`),
        confidence: 'high',
        priority: 75,
        exerciseId: masteringState.exerciseId,
        domainId: manifest.domain
      });
    }
  }

  // Improvements (from Skills trend)
  const improvingSkills = skills.filter(s => s.trend > 15 && s.confidence > 30).sort((a, b) => b.trend - a.trend);
  if (improvingSkills.length > 0 && insights.filter(i => i.type === 'improvement').length === 0) {
    const best = improvingSkills[0];
    insights.push({
      type: 'improvement',
      title: L('Заметный прогресс', 'Noticeable progress'),
      description: L(`В упражнении «${skillLabel(best.skill)}» наметился чёткий прогресс. Точность и скорость ответов стабильно растут.`, `Clear progress in "${skillLabel(best.skill)}". Accuracy and response speed are steadily improving.`),
      confidence: best.confidence > 70 ? 'high' : 'medium',
      priority: 80 + best.trend
    });
  }

  // Plateau
  const plateauStates = states.filter(s => (s.consecutivePlateau || 0) >= 3);
  if (plateauStates.length > 0 && !masteringState) {
    const plat = plateauStates[0];
    const manifest = getManifest(plat.exerciseId);
    if (manifest) {
      insights.push({
        type: 'plateau',
        title: L('Стабилизация', 'Plateau'),
        description: L(`Ваш результат в упражнении «${exerciseName(manifest)}» стабилизировался. Стоит переключиться на другие задачи, чтобы не превращать тренировку в автоматическую привычку.`, `Your score in "${exerciseName(manifest)}" stabilized. Good time to switch to other tasks to prevent rote routine.`),
        confidence: 'high',
        priority: 70 + (plat.consecutivePlateau || 0) * 5,
        exerciseId: plat.exerciseId,
        domainId: manifest.domain
      });
    }
  }

  // Consistency over the last 7 days
  const week = daySummaries.slice(-7);
  const activeDays = week.filter((d) => !d.skipped && d.totalScore > 0).length;
  if (totalDays >= 5 && activeDays >= 5) {
    insights.push({
      type: 'consistency',
      title: L('Сила микрошагов', 'Power of micro-steps'),
      description: L(`${activeDays} тренировок за последние 7 дней. Короткие, но регулярные усилия формируют нейронные связи гораздо надёжнее, чем редкие марафоны.`, `${activeDays} workouts over the last 7 days. Short regular efforts build connections far more reliably than rare marathons.`),
      confidence: 'high',
      priority: 75
    });
  }

  // Honest Streak
  const last30 = daySummaries.slice(-30);
  const played30 = last30.filter(d => !d.skipped && d.totalScore > 0).length;
  const possible30 = Math.min(30, totalDays);
  if (possible30 >= 14 && played30 / possible30 >= 0.8) {
    insights.push({
      type: 'consistency',
      title: L('Честная стабильность', 'Honest consistency'),
      description: L(`Ваша регулярность за месяц — ${Math.round((played30 / possible30) * 100)}%. Fokus ценит долгосрочный ритм: единичные пропуски — это здоровый отдых, который не обнуляет прогресс.`, `Your monthly regularity is ${Math.round((played30 / possible30) * 100)}%. Fokus values long-term rhythm: occasional misses are healthy rest, not setbacks.`),
      confidence: 'high',
      priority: 79
    });
  }

  // Recovery after a dip
  if (week.length >= 4) {
    const scores = week.map((d) => d.totalScore);
    const minIdx = scores.indexOf(Math.min(...scores));
    const last = scores[scores.length - 1];
    const min = scores[minIdx];
    if (minIdx < scores.length - 1 && min > 0 && last > min * 1.25) {
      insights.push({
        type: 'recovery',
        title: L('Отскок после спада', 'Rebound after dip'),
        description: L('После просадки результаты снова выровнялись. Это естественное колебание формы в течение недели, а не откат ваших способностей.', 'Results recovered after a dip. This is natural weekly form variation, not a skill decline.'),
        confidence: 'medium',
        priority: 72
      });
    }
  }

  // Sleep correlation
  const withSleep = daySummaries.filter((d) => d.lifestyle?.sleep && d.totalScore > 0);
  if (withSleep.length >= 5) {
    const avg = (arr: DaySummary[]) => arr.reduce((s, d) => s + d.totalScore, 0) / arr.length;
    const low = withSleep.filter((d) => d.lifestyle!.sleep === 'low');
    const rest = withSleep.filter((d) => d.lifestyle!.sleep !== 'low');
    if (low.length >= 2 && rest.length >= 2 && avg(rest) > avg(low) * 1.12) {
      insights.push({
        type: 'consistency',
        title: L('Сон и результат', 'Sleep and performance'),
        description: L('В дни с недостатком сна результаты обычно ниже. Это не диагноз, но хороший повод чуть снизить темп и не требовать от себя рекордов.', 'On days with less sleep, performance is typically lower. A good reason to ease pace and not demand peak records.'),
        confidence: withSleep.length >= 8 ? 'high' : 'medium',
        priority: 78
      });
    }
  }

  // Chronotype
  const chrono = analyzeChronotype(sessions);
  if (chrono.bucket && chrono.sample >= 4) {
    insights.push({
      type: 'milestone',
      title: L('Удачное время', 'Optimal time'),
      description: L(`Лучшие сессии у вас проходят ${chrono.label}. Сложные блоки лучше ставить на это окно.`, `Your best sessions happen during ${chrono.label}. Challenging blocks are best scheduled for this window.`),
      confidence: chrono.sample >= 8 ? 'high' : 'medium',
      priority: 55
    });
  }

  // Sort by priority and return top
  return insights.sort((a, b) => b.priority - a.priority);
}
