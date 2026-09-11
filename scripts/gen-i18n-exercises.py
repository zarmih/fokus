#!/usr/bin/env python3
"""Generate src/core/i18n-exercises.ts from catalog RU names + EN overlay."""
import json
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..")

EN = {
    "alphanumeric-sort": (
        "Symbols",
        "Sort falling symbols. LETTER — tap LEFT. NUMBER — tap RIGHT.",
    ),
    "arcade-shooter": (
        "Space Shooter",
        "Steer the ship and hit the targets coming from above. A miss lowers accuracy.",
    ),
    "arrow-swipe": (
        "Swipe",
        "GREEN arrow — tap the way it points. RED — tap the OPPOSITE way.",
    ),
    "avatar-names": (
        "Names",
        "Remember the characters’ names. Then pick the right name for the one that appears.",
    ),
    "balance-scales": (
        "Balance",
        "Study the scales and decide which shape is heavier.",
    ),
    "catch-the-color": (
        "Color Catch",
        "Tap ONLY objects of the given color. Ignore the rest.",
    ),
    "category-sort": (
        "Categories",
        "Decide the word’s category and tap the matching button.",
    ),
    "clock-reading": (
        "Time",
        "If the clock matches the digits — tap Yes. Otherwise — No.",
    ),
    "color-burst": (
        "Flash",
        "As soon as the circle appears, tap it as FAST as you can.",
    ),
    "color-sequence": (
        "Echo",
        "Remember the flash sequence and repeat it.",
    ),
    "color-shape-switch": (
        "Color–Shape",
        "DARK background — match the SHAPE. LIGHT background — match the COLOR.",
    ),
    "color-sort": (
        "Sorter",
        "Sort shapes left or right by the current RULE.",
    ),
    "context-switch": (
        "Chameleon",
        "Light background: tap the SAME COLOR. Dark background: tap the SAME SHAPE.",
    ),
    "corsi": (
        "Corsi Blocks",
        "Remember the order the squares light up and repeat it.",
    ),
    "direction-match": (
        "Vector",
        "WHITE text — tap the word. YELLOW text — tap the way the arrow points.",
    ),
    "direction-memory": (
        "Arrows",
        "Remember the sequence of directions and repeat it.",
    ),
    "direction-switch": (
        "Signal",
        "Blue frame — where the arrow POINTS. Orange — WHERE it sits (left/right).",
    ),
    "dot-ratio": (
        "Eye Measure",
        "Guess which color has MORE dots (blue or red).",
    ),
    "dot-span": (
        "Trail",
        "Remember the order the dots appear and repeat it.",
    ),
    "emotion-match": (
        "Emotions",
        "If the face matches the word — tap Yes. Otherwise — No.",
    ),
    "equation-balance": (
        "Math Scales",
        "Make the equation true by picking the right operator.",
    ),
    "even-odd": (
        "Double Rule",
        "BLUE frame — even or odd. YELLOW — greater or less than 5.",
    ),
    "expression-compare": (
        "Number Duel",
        "Compare the two expressions and pick the one that is GREATER.",
    ),
    "find-pair": (
        "Twin",
        "Find and tap either of the TWO identical shapes.",
    ),
    "flanker-task": (
        "Flock",
        "Point the direction of the CENTER bird (arrow). Ignore the others.",
    ),
    "flash-cards": (
        "Where is it?",
        "Remember the card layout. Then find the one that is asked.",
    ),
    "focus-circle": (
        "Sniper",
        "Tap when the shrinking circle matches the target ring.",
    ),
    "go-no-go": (
        "Go / No-Go",
        "Tap the RED button when you see a GREEN circle. Do NOTHING if the circle is RED.",
    ),
    "grid-memory": (
        "Grid",
        "Remember the highlighted cells and mark them. Order does not matter.",
    ),
    "imposter-search": (
        "Impostor",
        "One item in the crowd is different. Find it as fast as you can.",
    ),
    "location-recall": (
        "Position",
        "Remember where the shapes sat. Then point to the asked shape.",
    ),
    "math-chains": (
        "Calculator",
        "Compute the chain. IMPORTANT: operations run STRICTLY left to right, no × priority.",
    ),
    "math-sign-switch": (
        "Sign Switch",
        "BLUE background — ADD the numbers. ORANGE — SUBTRACT the bottom from the top.",
    ),
    "math-sprint": (
        "Arithmetic",
        "Decide quickly whether the answer is correct. Tap Yes or No.",
    ),
    "math-switch": (
        "Op Switch",
        "BLUE frame — ADD. RED frame — SUBTRACT the second number from the first.",
    ),
    "mental-rotation": (
        "Mental Rotation",
        "Do the shapes match? YES if the right one is the left one rotated. NO if it is a mirror.",
    ),
    "meteorites": (
        "Meteors",
        "Destroy ONLY objects of the required shape before they fall.",
    ),
    "missing-operator": (
        "Operator",
        "Pick the missing sign (+, −, ×, ÷) that makes the equation true.",
    ),
    "moving-targets": (
        "Tracking",
        "Remember the highlighted objects. When they stop, point them out.",
    ),
    "n-back": (
        "Dual N-Back",
        "Watch the shape AND the spoken letter. Tap if either matches what was shown N steps ago.",
    ),
    "number-code": (
        "Code",
        "Remember the digit sequence, then type it on the keypad.",
    ),
    "number-memory": (
        "Number Code",
        "Remember the number. After it disappears, type it from memory.",
    ),
    "number-pyramid": (
        "Pyramid",
        "Each block is the SUM of the two below it. Find the number for the highlighted block.",
    ),
    "number-series": (
        "Series",
        "Find the pattern in the number series and pick the missing number.",
    ),
    "number-sort": (
        "Quick Sort",
        "Tap the numbers in ascending order (smallest to largest).",
    ),
    "odd-one": (
        "Odd One",
        "Find the item that differs from the rest.",
    ),
    "pairs": (
        "Pairs",
        "Find the matching pictures.",
    ),
    "parity-magnitude": (
        "Magnitude",
        "BLUE number — Even or Odd. ORANGE number — Greater than 50 or Less than 50.",
    ),
    "path-finder": (
        "Maze",
        "Remember the hidden path from start to finish and repeat it.",
    ),
    "path-recall": (
        "Trajectory",
        "Remember the path the squares light up and repeat it.",
    ),
    "pattern-next": (
        "Next",
        "Pick what comes next in the series.",
    ),
    "posner": (
        "Covert Attention (Posner)",
        "Watch the center cross. When a circle appears left or right, tap that arrow. The cue can lie.",
    ),
    "pulley": (
        "Pulley",
        "Hang exactly as much as the door needs. Extra weight will not pull the rope right.",
    ),
    "rapid-sorting": (
        "Living / Not",
        "Sort objects into LIVING (left) or NOT LIVING (right) as fast as you can.",
    ),
    "reaction-strike": (
        "Intercept",
        "Tap at the exact moment the moving object is in the intercept zone.",
    ),
    "same-different": (
        "Twins",
        "Decide whether the two shapes are EXACTLY the same.",
    ),
    "schulte": (
        "Schulte Table",
        "Tap the numbers in order from 1 onward as fast as you can.",
    ),
    "sequence": (
        "Chain",
        "Remember the order the cells flash and repeat it.",
    ),
    "sequence-reverse": (
        "Reverse",
        "Remember the sequence and repeat it BACKWARDS.",
    ),
    "shape-count": (
        "Counter",
        "Count how many of the ASKED shapes are among the rest.",
    ),
    "shape-name": (
        "Associations",
        "Remember the made-up names of the shapes, then pick the right name for the one shown.",
    ),
    "shape-position": (
        "Archive",
        "Remember where the shapes were. Then point to where the shown shape sat.",
    ),
    "shell-game": (
        "Cups",
        "Watch the ball. After the shuffle, pick the cup it is under.",
    ),
    "size-compare": (
        "Scale",
        "Ignore on-screen size. Pick the animal or object that is LARGER IN REAL LIFE.",
    ),
    "spatial-match": (
        "Pattern",
        "Remember the grid pattern. Then decide whether the next pattern matches it.",
    ),
    "spatial-speed": (
        "Radar",
        "Destroy the targets before they disappear.",
    ),
    "split-attention": (
        "Split Control",
        "Watch both halves of the screen. Tap objects of the given color as soon as they appear.",
    ),
    "stroop": (
        "Ink",
        "Tap the ink color, do not read the word.",
    ),
    "swings": (
        "Bars",
        "Jump to the bar. Miss — start over.",
    ),
    "switch-rule": (
        "Rule Switch",
        "Watch the label. Yes or no. The rule changes.",
    ),
    "symbol-math": (
        "Cipher",
        "Work out the symbol values from the equations, then solve the last one.",
    ),
    "target-sum": (
        "Sum",
        "Pick numbers that add up to the target.",
    ),
    "time-math": (
        "Clock Math",
        "Find the FINAL time after adding or subtracting the given hours and minutes.",
    ),
    "unique-color": (
        "Singleton",
        "Find the square whose color does not repeat.",
    ),
    "unique-feature": (
        "Odd Feature",
        "Find the only unique shape that does not repeat.",
    ),
    "verbal-fluency": (
        "Verbal Fluency",
        "Name as many ANIMALS as you can in the time given. Tap Speak and say the words clearly.",
    ),
    "visual-search": (
        "Sharp Eye",
        "Find the target symbol among many similar ones.",
    ),
    "vowel-consonant": (
        "Alphabet",
        "BLUE letter color: Vowel or Consonant? ORANGE: UPPERCASE or lowercase?",
    ),
    "weight-analysis": (
        "Heavyweight",
        "Read the claims and decide which shape is the HEAVIEST or LIGHTEST.",
    ),
    "word-cascade": (
        "Deja Vu",
        "Symbols appear one by one. If the symbol was already shown this session, tap REPEAT. Else — NEW.",
    ),
    "word-pairs": (
        "Pairs Bind",
        "Remember the linked pairs. Then pick the pair for the object shown.",
    ),
}


def collect():
    root = os.path.join(ROOT, "src/exercises")
    items = []
    for dirpath, _, files in os.walk(root):
        for f in files:
            if not f.endswith(".ts"):
                continue
            if f in ("contract.ts", "registry.ts", "dispatch.ts", "types.ts", "stage.ts"):
                continue
            path = os.path.join(dirpath, f)
            text = open(path, encoding="utf-8").read()
            m = re.search(
                r"id:\s*'([^']+)'[\s\S]{0,400}?name:\s*'([^']+)'[\s\S]{0,400}?instruction:\s*'([^']*)'",
                text,
            )
            if m:
                instruction = m.group(3)
                patched = re.search(r"\.manifest\.instruction\s*=\s*'([^']*)'", text)
                if patched:
                    instruction = patched.group(1)
                items.append((m.group(1), m.group(2), instruction))
    items.sort()
    return items


def main():
    items = collect()
    missing = [i for i, _, _ in items if i not in EN]
    extra = [i for i in EN if i not in {x[0] for x in items}]
    if missing or extra:
        raise SystemExit(f"EN overlay mismatch. missing={missing} extra={extra}")
    lines = [
        "/** Exercise name/instruction overlay. Catalog stays RU; screens read via t(). */",
        "",
        "export const exerciseDictionary: Record<string, Record<'ru' | 'en', string>> = {",
    ]
    for eid, ru_name, ru_ins in items:
        en_name, en_ins = EN[eid]
        lines.append(
            f"  'ex.{eid}.name': {{ ru: {json.dumps(ru_name, ensure_ascii=False)}, en: {json.dumps(en_name, ensure_ascii=False)} }},"
        )
        lines.append(
            f"  'ex.{eid}.instruction': {{ ru: {json.dumps(ru_ins, ensure_ascii=False)}, en: {json.dumps(en_ins, ensure_ascii=False)} }},"
        )
    lines.append("};")
    lines.append("")
    out = os.path.join(ROOT, "src/core/i18n-exercises.ts")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    print(f"wrote {out} ({len(items)} exercises)")


if __name__ == "__main__":
    main()
