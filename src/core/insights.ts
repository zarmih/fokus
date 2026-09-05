import type { DomainIndex, SkillIndex, ExerciseState, DaySummary } from './types';
import { registry } from '../exercises/registry';

export interface CognitiveInsight {
  type: 'improvement' | 'plateau' | 'consistency' | 'strength' | 'area_to_focus' | 'milestone' | 'recovery';
  title: string;
  description: string;
  confidence: 'low' | 'medium' | 'high';
  priority: number;
}

export function generateInsights(
  domains: DomainIndex[],
  skills: SkillIndex[],
  states: ExerciseState[],
  daySummaries: DaySummary[]
): CognitiveInsight[] {
  const insights: CognitiveInsight[] = [];
  
  // Need enough data
  const totalDays = daySummaries.length;
  if (totalDays < 2) {
    return [{
      type: 'milestone',
      title: 'Начало пути',
      description: 'Мы всё ещё изучаем ваш профиль. Продолжайте тренироваться, чтобы получить персональные инсайты.',
      confidence: 'low',
      priority: 100
    }];
  }

  // 1. Strength & Area to focus (from Domains)
  const sortedDomains = [...domains].sort((a, b) => b.value - a.value);
  if (sortedDomains.length >= 2) {
    const strongest = sortedDomains[0];
    const weakest = sortedDomains[sortedDomains.length - 1];
    
    // Check if confidence is established (proxy by looking at total attempts of underlying skills)
    const getDomainConfidence = (domainId: string) => {
      const relatedSkills = registry.filter(r => r.manifest.domain === domainId).flatMap(r => r.manifest.skills);
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
        title: 'Сильная сторона',
        description: `Ваши показатели в категории «${translateDomain(strongest.domain)}» выше среднего.`,
        confidence: strongConf > 70 ? 'high' : (strongConf > 40 ? 'medium' : 'low'),
        priority: 50 + (strongest.value / 100)
      });
    }
    
    const weakConf = getDomainConfidence(weakest.domain);
    if (weakest.value < 500 && weakest.value > 0) {
      insights.push({
        type: 'area_to_focus',
        title: 'Зона роста',
        description: `Обратите внимание на «${translateDomain(weakest.domain)}» — регулярные тренировки помогут быстро улучшить этот навык.`,
        confidence: weakConf > 70 ? 'high' : (weakConf > 40 ? 'medium' : 'low'),
        priority: 60 + ((500 - weakest.value) / 10)
      });
    }
  }

  // 2. Improvements (from Skills trend)
  const improvingSkills = skills.filter(s => s.trend > 15 && s.confidence > 30).sort((a, b) => b.trend - a.trend);
  if (improvingSkills.length > 0) {
    const best = improvingSkills[0];
    insights.push({
      type: 'improvement',
      title: 'Заметный прогресс',
      description: `Ваш навык «${translateSkill(best.skill)}» уверенно растёт. Так держать!`,
      confidence: best.confidence > 70 ? 'high' : 'medium',
      priority: 80 + best.trend
    });
  }

  // 3. Plateau
  const plateauStates = states.filter(s => (s.consecutivePlateau || 0) >= 3);
  if (plateauStates.length > 0) {
    const plat = plateauStates[0];
    const manifest = registry.find(r => r.manifest.id === plat.exerciseId)?.manifest;
    if (manifest) {
      insights.push({
        type: 'plateau',
        title: 'Стабилизация',
        description: `Ваш результат в игре «${manifest.name}» стабилизировался. Возможно, стоит переключиться на другие задачи для развития связанных навыков.`,
        confidence: 'high',
        priority: 70 + (plat.consecutivePlateau || 0) * 5
      });
    }
  }

  // Sort by priority and return top
  return insights.sort((a, b) => b.priority - a.priority);
}

function translateDomain(d: string): string {
  const map: Record<string, string> = {
    'attention': 'Внимание',
    'memory': 'Память',
    'speed': 'Скорость',
    'flexibility': 'Гибкость',
    'logic': 'Логика'
  };
  return map[d] || d;
}

function translateSkill(s: string): string {
  const map: Record<string, string> = {
    'visual_memory': 'Зрительная память',
    'working_memory': 'Рабочая память',
    'selective_attention': 'Избирательное внимание',
    'processing_speed': 'Скорость восприятия',
    'cognitive_flexibility': 'Когнитивная гибкость',
    'inhibitory_control': 'Подавление импульсов',
    'quantitative_reasoning': 'Вычисления',
    'spatial_reasoning': 'Пространственное мышление',
    'motor_control': 'Моторный контроль',
    'divided_attention': 'Разделённое внимание',
    'pattern_recognition': 'Распознавание паттернов',
    'sustained_attention': 'Концентрация'
  };
  return map[s] || s;
}
