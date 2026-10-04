export function generateCatalogArt(exerciseId: string, domain: string): string {
  // deterministic PRNG based on hash
  let hash = 0;
  for (let i = 0; i < exerciseId.length; i++) {
    hash = Math.imul(31, hash) + exerciseId.charCodeAt(i) | 0;
  }
  
  const rand = () => {
    hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
    hash = Math.imul(hash ^ (hash >>> 15), 0xc4ceb9fe);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  };

  // Wash colors for each domain, we can just use currentColor (which will be the domain color) 
  // or define them directly. It's better to rely on currentColor set from CSS.
  // Actually, we'll return an SVG that uses currentColor and explicit opacities.
  
  const shapes = [
    // Circle
    (cx: number, cy: number, r: number, opacity: number, animated: boolean) => 
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" fill-opacity="${opacity}" ${animated ? 'class="art-anim-slow"' : ''} />`,
    // Rect
    (cx: number, cy: number, r: number, opacity: number, animated: boolean) => 
      `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.3}" fill="currentColor" fill-opacity="${opacity}" ${animated ? 'class="art-anim-slow"' : ''} />`,
    // Triangle (polygon)
    (cx: number, cy: number, r: number, opacity: number, animated: boolean) => 
      `<polygon points="${cx},${cy - r} ${cx - r * 0.866},${cy + r * 0.5} ${cx + r * 0.866},${cy + r * 0.5}" fill="currentColor" fill-opacity="${opacity}" ${animated ? 'class="art-anim-slow"' : ''} />`,
    // Ring
    (cx: number, cy: number, r: number, opacity: number, animated: boolean) => 
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="${r * 0.2}" stroke-opacity="${opacity}" ${animated ? 'class="art-anim-slow"' : ''} />`,
  ];

  const svgShapes: string[] = [];
  const numShapes = 2 + Math.floor(rand() * 2); // 2 or 3 shapes
  
  for (let i = 0; i < numShapes; i++) {
    const shapeFn = shapes[Math.floor(rand() * shapes.length)];
    const cx = 20 + rand() * 60;
    const cy = 20 + rand() * 60;
    const r = 10 + rand() * 25;
    const opacity = 0.2 + rand() * 0.8;
    const animated = i === 0; // only one shape animated
    svgShapes.push(shapeFn(cx, cy, r, opacity, animated));
  }

  return `
    <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style="color: var(--dom-${domain}); pointer-events: none;">
      <defs>
        <radialGradient id="wash-${exerciseId}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.3" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#wash-${exerciseId})" />
      ${svgShapes.join('\n')}
    </svg>
  `;
}
