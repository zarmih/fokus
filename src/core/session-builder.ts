export function buildSession(params: {
  durationSec: number, 
  catalog: any[], 
  domainIndexes: any[], 
  lastPlayedByExercise: Record<string, string>, 
  yesterdayDomains: string[]
}): any[] {
  const {durationSec, catalog, domainIndexes, yesterdayDomains} = params;
  const items: any[] = [];
  
  let targetBlocks = 3;
  if (durationSec >= 480) targetBlocks = 4;
  if (durationSec >= 720) targetBlocks = 5;

  const sortedDomains = [...domainIndexes].sort((a, b) => a.value - b.value);
  const weakestDomain = sortedDomains.length > 0 ? sortedDomains[0].domain : null;
  const strongestDomain = sortedDomains.length > 0 ? sortedDomains[sortedDomains.length - 1].domain : null;

  let selectedDomains: string[] = [];
  
  for (let i=0; i<targetBlocks; i++) {
    // Determine priorities
    let candidates = [...catalog];
    
    // Last slot - strongest domain
    if (i === targetBlocks - 1 && strongestDomain) {
      const strongs = candidates.filter(c => c.domain === strongestDomain);
      if (strongs.length > 0) candidates = strongs;
    } 
    // Otherwise try to avoid 2 in a row unless it's weakest domain
    else if (i > 0) {
      const lastDomain = catalog.find(c => c.id === items[i-1].exerciseId)?.domain;
      if (lastDomain && lastDomain !== weakestDomain) {
        const withoutLast = candidates.filter(c => c.domain !== lastDomain);
        if (withoutLast.length > 0) candidates = withoutLast;
      }
    }

    // Sort candidates: yesterday not played -> weakest domain -> random
    candidates.sort((a, b) => {
      const aY = yesterdayDomains.includes(a.domain) ? 1 : 0;
      const bY = yesterdayDomains.includes(b.domain) ? 1 : 0;
      if (aY !== bY) return aY - bY;
      
      const aW = a.domain === weakestDomain ? -1 : 0;
      const bW = b.domain === weakestDomain ? -1 : 0;
      if (aW !== bW) return aW - bW;
      
      return Math.random() - 0.5;
    });

    let chosen = candidates[0];
    
    // Avoid 3 of same domain in 5 min session
    if (targetBlocks === 3) {
      const counts = selectedDomains.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      if (counts[chosen.domain] >= 2) {
        const alternatives = candidates.filter(c => c.domain !== chosen.domain);
        if (alternatives.length > 0) chosen = alternatives[0];
      }
    }

    items.push({exerciseId: chosen.id});
    selectedDomains.push(chosen.domain);
  }

  return items;
}
