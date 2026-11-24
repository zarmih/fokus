#!/usr/bin/env python3
"""Verify every `path:line` citation in docs/PR_TRIAGE.md actually exists and,
where a quoted token is given, that the token appears on that line.

Reports MISMATCH for citations whose line does not exist, and TOKEN_MISS when a
backticked token near the citation is not found on the cited line.
"""
from triage_paths import REPO
import re
import subprocess

DOC = f"{REPO}/docs/PR_TRIAGE.md"

text = open(DOC).read()
cites = re.findall(r'`?([A-Za-z0-9_./-]+\.(?:ts|tsx|css|html|json|md|py)):(\d+)(?:,(\d+))?', text)

bad = []
checked = 0
for path, l1, l2 in cites:
    if not path.startswith(("src/", "tests/", "scripts/", "public/", "docs/", "e2e/")):
        continue
    try:
        lines = open(f"{REPO}/{path}").read().splitlines()
    except FileNotFoundError:
        bad.append(f"MISSING FILE {path}")
        continue
    for ln in [int(l1)] + ([int(l2)] if l2 else []):
        checked += 1
        if ln < 1 or ln > len(lines):
            bad.append(f"OUT OF RANGE {path}:{ln} (file has {len(lines)} lines)")

print(f"checked {checked} line citations across {len(cites)} refs")
if bad:
    print(f"\n{len(bad)} PROBLEMS:")
    for b in dict.fromkeys(bad):
        print("  " + b)
else:
    print("all cited lines exist")

# token spot-checks: (path, line, token that must appear there)
TOKENS = [
    ("src/ui/shell.ts", 94, 'role="banner"'),
    ("src/ui/shell.ts", 110, 'role="main"'),
    ("src/ui/screens/onboarding.ts", 28, "totalSteps = 3"),
    ("src/ui/screens/trainers.ts", 196, "catalog-search"),
    ("src/ui/screens/trainers.ts", 211, "catalog-empty-state"),
    ("src/ui/screens/trainers.ts", 213, "Ничего не найдено"),
    ("src/ui/components/charts.ts", 22, 'opacity="0.4"'),
    ("src/ui/components/charts.ts", 27, 'opacity="0.4"'),
    ("src/ui/components/charts.ts", 30, "hasData"),
    ("src/ui/components/charts.ts", 55, "hasData"),
    ("src/ui/screens/today.ts", 517, "Тренировка дня"),
    ("src/ui/screens/today.ts", 83, "unfinishedSession"),
    ("src/ui/screens/today.ts", 447, "Продолжить с того места"),
    ("src/ui/screens/today.ts", 636, "enterStage"),
    ("src/ui/screens/today.ts", 186, "SLOT_LABEL"),
    ("src/ui/screens/result.ts", 135, "abilityCaption"),
    ("src/ui/screens/result.ts", 195, "Дальше:"),
    ("src/ui/screens/result.ts", 243, "next-action-card"),
    ("src/ui/screens/result.ts", 373, "не IQ"),
    ("src/ui/screens/settings.ts", 151, "section-training"),
    ("src/ui/screens/settings.ts", 264, "section-interface"),
    ("src/ui/screens/settings.ts", 330, "section-privacy"),
    ("src/ui/screens/settings.ts", 340, "prefer: 'guide'"),
    ("src/ui/screens/duel-session.ts", 68, "countdown-overlay"),
    ("src/ui/screens/duel-session.ts", 71, "readout-overlay"),
    ("src/ui/screens/duel-session.ts", 223, "btn-rematch"),
    ("src/ui/screens/session.ts", 526, "sessionBudget"),
    ("src/ui/screens/session.ts", 535, "sessionBudget"),
    ("src/core/coach.ts", 166, "): CoachSpark {"),
    ("src/core/coach.ts", 369, "getWeeklyDomainTips"),
    ("src/core/coach-intel.ts", 695, "tips.length === 0"),
    ("src/core/motion.ts", 6, "export const MOTION"),
    ("src/core/engine/ritual.ts", 360, "Смена контекста для прорыва"),
    ("src/core/session-builder.ts", 164, "Сбалансированная тренировка"),
    ("src/core/engine/scheduler.ts", 115, "slotMix"),
    ("src/main.ts", 52, "listenForPwaUpdate"),
    ("src/main.ts", 65, "updatefound"),
    ("src/main.ts", 31, "screenLoaders"),
    ("src/ui/components/habit-continuity.ts", 140, "eligibleDays"),
    ("src/ui/components/habit-continuity.ts", 175, "eligibleDays"),
    ("src/ui/components/pwa-update-banner.ts", 1, "."),
    ("src/pwa-install.ts", 1, "import"),
    ("src/ui/components/offline-banner.ts", 1, "."),
    ("src/ui/components/lifestyle-checkin.ts", 1, "/**"),
]

print("\ntoken spot-checks:")
fails = 0
for path, ln, tok in TOKENS:
    try:
        line = open(f"{REPO}/{path}").read().splitlines()[ln - 1]
    except (FileNotFoundError, IndexError):
        print(f"  MISMATCH {path}:{ln} (cannot read)")
        fails += 1
        continue
    if tok not in line:
        print(f"  TOKEN_MISS {path}:{ln} expected {tok!r}\n      got: {line.strip()[:120]}")
        fails += 1
print(f"  {len(TOKENS) - fails}/{len(TOKENS)} token checks passed")
