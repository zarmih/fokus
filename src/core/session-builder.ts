export function buildSession(params: {
  durationSec: number, 
  catalog: any[], 
  domainIndexes: any[], 
  lastPlayedByExercise: Record<string, string>, 
  yesterdayDomains: string[]
}): any[] {
  const {durationSec, catalog} = params;
  const items = [];
  const blockDurationSec = 70;
  const numBlocks = Math.max(1, Math.floor(durationSec / blockDurationSec));

  if (catalog.length === 1) {
    for (let i=0; i<numBlocks; i++) {
      items.push({exerciseId: catalog[0].id});
    }
  } else {
    // Basic mock for multiple domains
    for (let i=0; i<numBlocks; i++) {
      items.push({exerciseId: catalog[i % catalog.length].id});
    }
  }
  return items;
}
