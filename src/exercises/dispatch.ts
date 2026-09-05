import { gridMemoryManifest, getGridMemoryParams } from './grid-memory/manifest';
import { renderGridMemory } from './grid-memory/view';

import { sequenceManifest, getSequenceParams } from './sequence/manifest';
import { renderSequence } from './sequence/view';

import { stroopManifest, getStroopParams } from './stroop/manifest';
import { renderStroop } from './stroop/view';

import { oddOneManifest, getOddOneParams } from './odd-one/manifest';
import { renderOddOne } from './odd-one/view';

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
  }
};
