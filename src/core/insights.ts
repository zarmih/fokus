import type { DomainIndex, SkillIndex, ExerciseState, DaySummary, Session } from './types';
import { registry } from '../exercises/registry';
import { domainLabel, skillLabel, exerciseName } from './labels';
import { analyzeChronotype } from './coach';
import { t } from './i18n';

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
  daySummaries: DaySummary[],
  sessions: Session[] = []
): CognitiveInsight[] {
  const insights: CognitiveInsight[] = [];
  
  // Need enough data
  const totalDays = daySummaries.length;
  if (totalDays < 2) {
    return [{
      type: 'milestone',
      title: t('insight.start.title'),
      description: t('insight.start.body'),
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
        title: t('insight.strength.title'),
        description: t('insight.strength.body', { domain: domainLabel(strongest.domain) }),
        confidence: strongConf > 70 ? 'high' : (strongConf > 40 ? 'medium' : 'low'),
        priority: 50 + (strongest.value / 100)
      });
    }
    
    const weakConf = getDomainConfidence(weakest.domain);
    if (weakest.value < 500 && weakest.value > 0) {
      insights.push({
        type: 'area_to_focus',
        title: t('insight.growth.title'),
        description: t('insight.growth.body', { domain: domainLabel(weakest.domain) }),
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
      title: t('insight.progress.title'),
      description: t('insight.progress.body', { skill: skillLabel(best.skill) }),
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
        title: t('insight.plateau.title'),
        description: t('insight.plateau.body', { name: exerciseName(manifest.id, manifest.name) }),
        confidence: 'high',
        priority: 70 + (plat.consecutivePlateau || 0) * 5
      });
    }
  }

  // 4. Consistency over the last 7 days
  const week = daySummaries.slice(-7);
  const activeDays = week.filter((d) => !d.skipped && d.totalScore > 0).length;
  if (totalDays >= 5 && activeDays >= 5) {
    insights.push({
      type: 'consistency',
      title: t('insight.habit.title'),
      description: t('insight.habit.body', { n: activeDays }),
      confidence: 'high',
      priority: 75
    });
  }

  // 5. Recovery after a dip
  if (week.length >= 4) {
    const scores = week.map((d) => d.totalScore);
    const minIdx = scores.indexOf(Math.min(...scores));
    const last = scores[scores.length - 1];
    const min = scores[minIdx];
    if (minIdx < scores.length - 1 && min > 0 && last > min * 1.25) {
      insights.push({
        type: 'recovery',
        title: t('insight.recovery.title'),
        description: t('insight.recovery.body'),
        confidence: 'medium',
        priority: 72
      });
    }
  }

  // 6. Sleep correlation
  const withSleep = daySummaries.filter((d) => d.lifestyle?.sleep && d.totalScore > 0);
  if (withSleep.length >= 5) {
    const avg = (arr: DaySummary[]) => arr.reduce((s, d) => s + d.totalScore, 0) / arr.length;
    const low = withSleep.filter((d) => d.lifestyle!.sleep === 'low');
    const rest = withSleep.filter((d) => d.lifestyle!.sleep !== 'low');
    if (low.length >= 2 && rest.length >= 2 && avg(rest) > avg(low) * 1.12) {
      insights.push({
        type: 'consistency',
        title: t('insight.sleep.title'),
        description: t('insight.sleep.body'),
        confidence: withSleep.length >= 8 ? 'high' : 'medium',
        priority: 78
      });
    }
  }

  // 7. Chronotype
  const chrono = analyzeChronotype(sessions);
  if (chrono.bucket && chrono.sample >= 4) {
    insights.push({
      type: 'milestone',
      title: t('insight.time.title'),
      description: t('insight.time.body', { when: chrono.label }),
      confidence: chrono.sample >= 8 ? 'high' : 'medium',
      priority: 55
    });
  }

  // Sort by priority and return top
  return insights.sort((a, b) => b.priority - a.priority);
}
