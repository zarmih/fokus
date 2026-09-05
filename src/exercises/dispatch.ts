import { gridMemoryManifest, getGridMemoryParams } from './grid-memory/manifest';
import { renderGridMemory } from './grid-memory/view';

import { sequenceManifest, getSequenceParams } from './sequence/manifest';
import { renderSequence } from './sequence/view';

import { stroopManifest, getStroopParams } from './stroop/manifest';
import { renderStroop } from './stroop/view';

import { oddOneManifest, getOddOneParams } from './odd-one/manifest';
import { renderOddOne } from './odd-one/view';

import { switchRuleManifest, getSwitchRuleParams } from './switch-rule/manifest';
import { renderSwitchRule } from './switch-rule/view';

import { patternNextManifest, getPatternNextParams } from './pattern-next/manifest';
import { renderPatternNext } from './pattern-next/view';

import { pairsManifest, getPairsParams } from './pairs/manifest';
import { renderPairs } from './pairs/view';

import { pulleyManifest, getPulleyParams } from './pulley/manifest';
import { renderPulley } from './pulley/view';

import { swingsManifest, getSwingsParams } from './swings/manifest';
import { renderSwings } from './swings/view';

export const dispatch: Record<string, {manifest: any, getParams: Function, render: Function}> = {
  'grid-memory': { manifest: gridMemoryManifest, getParams: getGridMemoryParams, render: renderGridMemory },
  'sequence': { manifest: sequenceManifest, getParams: getSequenceParams, render: renderSequence },
  'stroop': { manifest: stroopManifest, getParams: getStroopParams, render: renderStroop },
  'odd-one': { manifest: oddOneManifest, getParams: getOddOneParams, render: renderOddOne },
  'switch-rule': { manifest: switchRuleManifest, getParams: getSwitchRuleParams, render: renderSwitchRule },
  'pattern-next': { manifest: patternNextManifest, getParams: getPatternNextParams, render: renderPatternNext },
  'pairs': { manifest: pairsManifest, getParams: getPairsParams, render: renderPairs },
  'pulley': { manifest: pulleyManifest, getParams: getPulleyParams, render: renderPulley },
  'swings': { manifest: swingsManifest, getParams: getSwingsParams, render: renderSwings }
};
