export type Domain = 'attention' | 'memory' | 'speed' | 'flexibility' | 'logic';

export type CognitiveSkill = 
  // MEMORY
  | 'working_memory' | 'visual_memory' | 'spatial_memory' | 'recall'
  // ATTENTION
  | 'selective_attention' | 'sustained_attention' | 'divided_attention' | 'inhibition'
  // SPEED
  | 'processing_speed' | 'reaction_speed' | 'visual_scanning'
  // FLEXIBILITY
  | 'task_switching' | 'rule_switching' | 'cognitive_flexibility'
  // REASONING
  | 'pattern_recognition' | 'logical_reasoning' | 'spatial_reasoning'
  // MATH (Sub-domain of logic or standalone)
  | 'mental_calculation' | 'estimation' | 'numerical_processing';

export interface BlockResult {
  accuracy: number;
  avgRtMs: number;
  rounds: number;
}

export interface ExerciseManifest {
  id: string;
  name: string;
  domain: Domain;
  skills: CognitiveSkill[];
  instruction: string;
}

export interface ExerciseModule {
  manifest: ExerciseManifest;
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean): void | (() => void);
}
