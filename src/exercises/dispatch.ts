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

export const dispatch: Record<string, {
  manifest: any, 
  getParams: (level: number) => any, 
  render: (container: HTMLElement, level: number, onBlockEnd: any, isTimeUp: () => boolean) => void
}> = {
  'grid-memory': {
    manifest: gridMemoryManifest,
    getParams: getGridMemoryParams,
    render: renderGridMemory
  },
  'sequence': {
    manifest: sequenceManifest,
    getParams: getSequenceParams,
    render: renderSequence
  },
  'stroop': {
    manifest: stroopManifest,
    getParams: getStroopParams,
    render: renderStroop
  },
  'odd-one': {
    manifest: oddOneManifest,
    getParams: getOddOneParams,
    render: renderOddOne
  },
  'switch-rule': {
    manifest: switchRuleManifest,
    getParams: getSwitchRuleParams,
    render: renderSwitchRule
  },
  'pattern-next': {
    manifest: patternNextManifest,
    getParams: getPatternNextParams,
    render: renderPatternNext
  },
  'pairs': {
    manifest: pairsManifest,
    getParams: getPairsParams,
    render: renderPairs
  }
};
