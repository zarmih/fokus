export interface ExerciseManifest {
  id: string;
  name: string;
  domain: string;
  instruction: string;
  levels: Record<number, any>;
}
