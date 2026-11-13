import { getLocale } from './i18n';

/**
 * English names and instructions for the core program and every calibration probe.
 * Other catalog exercises are shown in Russian for now (documented limitation).
 */
export const EXERCISE_COPY_EN: Record<string, { name: string; instruction: string }> = {
  'grid-memory': { name: 'Grid', instruction: 'Remember the highlighted cells and tap them. Order does not matter.' },
  'odd-one': { name: 'Odd One', instruction: 'All tiles share one shade except one. Tap the tile with a different colour.' },
  'pattern-next': { name: 'Series', instruction: 'Choose what comes next in the series.' },
  pulley: { name: 'Pulley', instruction: 'The door shows the weight it needs. Move one or two weights from the floor to the hook so the sum is exact, then tap “Go”. Weights can go back to the floor.' },
  sequence: { name: 'Chain', instruction: 'Remember the order in which cells flash and repeat it.' },
  stroop: { name: 'Ink', instruction: 'A colour word is printed in some ink colour. Tap the button naming the colour of the letters, not the colour the word spells.' },
  'switch-rule': { name: 'Rule Switch', instruction: 'Above the numbers is a question: “Left is even?” or “Left is larger?”. Answer “Yes” or “No”. The question changes now and then — read it before each answer.' },
  'math-sprint': { name: 'Arithmetic', instruction: 'Decide quickly whether the answer to the sum is correct. Tap “Correct” or “Wrong”.' },
  schulte: { name: 'Number Grid', instruction: 'Tap the numbers in order from 1 upwards as fast as you can.' },
  corsi: { name: 'Corsi Blocks', instruction: 'Remember the order in which the squares light up and repeat it.' },
  posner: { name: 'Covert Attention (Posner)', instruction: 'Keep your eyes on the centre cross. When a circle appears left or right, press that arrow. Careful: the hint arrow can mislead!' },
  'go-no-go': { name: 'Go / No-Go', instruction: 'A green circle with ▶ — tap “Go”. A red square with ✕ — do not tap. A block with no taps does not count.' },
  'dot-span': { name: 'Tracker Path', instruction: 'Remember the order in which the dots appear and repeat it.' },
  'reaction-strike': { name: 'Intercept', instruction: 'Tap exactly when the moving object reaches the intercept zone.' },
  'shape-equation': { name: 'Shape Maths', instruction: 'Solve the equation made of shapes.' },
  'helix-flip': { name: 'Rule Flip', instruction: 'Compare two figures by the current rule (Colour or Shape). The rule can change suddenly!' },
  'tide-gate': { name: 'Tide Gate', instruction: 'A marker rises like the tide. Tap when it is inside the gate band — not earlier, not later. Missing it or tapping early counts as an error.' },
  'anchor-pair': { name: 'Anchor Pair', instruction: 'Two different symbols flash briefly on the left and right. Remember both. Then say which side the shown symbol was on.' },
  'slip-mark': { name: 'Drifting Mark', instruction: 'A marker slides smoothly across. A narrow gate moves towards it. Tap once when they line up. Early or late is a miss. Higher levels make the window narrower.' },
  'cut-bar': { name: 'Threshold', instruction: 'A bar fills at a steady speed. There is a threshold mark on the track. Tap only after the fill passes the mark, not before. Errors: tapping too early or waiting until the end. Higher levels give less time after the mark.' }
};

type Named = { id: string; name: string; instruction: string };

export function exerciseName(m: Named): string {
  return getLocale() === 'en' ? EXERCISE_COPY_EN[m.id]?.name || m.name : m.name;
}

export function exerciseInstruction(m: Named): string {
  return getLocale() === 'en' ? EXERCISE_COPY_EN[m.id]?.instruction || m.instruction : m.instruction;
}

/** Exercises with full English copy (names, instructions and in-exercise text). */
export function hasEnglishCopy(id: string): boolean {
  return id in EXERCISE_COPY_EN;
}
