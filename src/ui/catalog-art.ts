import { catalog } from '../exercises/catalog';

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

  const range = (min: number, max: number) => min + rand() * (max - min);
  const int = (min: number, max: number) => Math.floor(range(min, max));
  const choice = <T>(arr: T[]) => arr[int(0, arr.length)];

  // 12+ saturated skies
  const skies = [
    "#0ea5e9", "#2563eb", "#4f46e5", "#7c3aed",
    "#c026d3", "#db2777", "#e11d48", "#ea580c",
    "#d97706", "#65a30d", "#16a34a", "#0d9488",
    "#0891b2"
  ];
  
  const templates = [
    { name: 'lighthouse', render: renderLighthouse },
    { name: 'orbit', render: renderOrbit },
    { name: 'honeycomb', render: renderHoneycomb },
    { name: 'vault', render: renderVault },
    { name: 'comet', render: renderComet },
    { name: 'metronome', render: renderMetronome },
    { name: 'prism', render: renderPrism },
    { name: 'balance-scale', render: renderBalanceScale },
    { name: 'pyramid', render: renderPyramid },
    { name: 'radar', render: renderRadar },
    { name: 'path-of-stones', render: renderPathOfStones },
    { name: 'paired-anchors', render: renderPairedAnchors },
    { name: 'telescope', render: renderTelescope }
  ];

  const templateIndex = Math.abs(hash) % templates.length;
  const template = templates[templateIndex];
  
  // Resolve collisions by checking catalog (as prompt implies we might need the catalog for this)
  const domainExs = catalog.filter(e => e.manifest.domain === domain).sort((a, b) => a.manifest.name.localeCompare(b.manifest.name, 'ru'));
  
  let currentSkyIndex = -1;
  let targetSkyIndex = 0;
  
  for (let i = 0; i < domainExs.length; i++) {
    const id = domainExs[i].manifest.id;
    let h = 0;
    for (let c = 0; c < id.length; c++) h = Math.imul(31, h) + id.charCodeAt(c) | 0;
    
    const tIdx = Math.abs(h) % templates.length;
    let sIdx = (Math.abs(h) + tIdx) % skies.length;
    
    if (i > 0 && sIdx === currentSkyIndex) {
      sIdx = (sIdx + 1) % skies.length;
    }
    currentSkyIndex = sIdx;
    
    if (id === exerciseId) {
      targetSkyIndex = sIdx;
      break;
    }
  }

  const skyIndex = targetSkyIndex;
  const skyColor = skies[skyIndex];

  // We need at least 3 distinct hue buckets. Sky is one.
  // We need ground, object, accent.
  const ink = "#1e293b";
  const objectFills = ["#fde047", "#fb7185", "#34d399", "#60a5fa", "#f97316", "#e879f9", "#2dd4bf", "#facc15", "#a3e635", "#38bdf8", "#fb923c", "#c084fc", "#f43f5e"];
  let paper = objectFills[(skyIndex + 5) % objectFills.length];
  if (paper.toLowerCase() === skyColor.toLowerCase()) paper = objectFills[(skyIndex + 6) % objectFills.length];
  
  // Use a different saturated color for accent that is not the sky
  const accents = ["#f43f5e", "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4"];
  const sceneAccent = accents[(skyIndex + 3) % accents.length];

  function renderLighthouse() {
    const scale = range(0.8, 1.2).toFixed(3);
    const xOffset = range(-10, 10).toFixed(3);
    const beamSide = choice([-1, 1]);
    const ground = `<rect x="10" y="80" width="80" height="10" rx="3" fill="${ink}" data-part="ground"/>`;
    const obj = `<g transform="translate(${50 + parseFloat(xOffset)}, 80) scale(${scale})" data-part="object">
      <polygon points="-10,0 10,0 5,-40 -5,-40" fill="${paper}" stroke="${ink}" stroke-width="2"/>
      <rect x="-6" y="-50" width="12" height="10" fill="${ink}"/>
      <circle cx="0" cy="-45" r="3" fill="${sceneAccent}"/>
    </g>`;
    const accent = `<g transform="translate(${50 + parseFloat(xOffset)}, ${80 - 45 * parseFloat(scale)})">
      <g data-part="accent" class="art-anim-slow">
        <polygon points="0,0 ${beamSide * 30},-20 ${beamSide * 40},20" fill="${sceneAccent}" opacity="0.3"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderOrbit() {
    const cx = range(40, 60).toFixed(3);
    const cy = range(40, 60).toFixed(3);
    const rad = range(15, 20).toFixed(3);
    const ringAngle = range(-20, 20).toFixed(3);
    const ground = `<path d="M 0 90 Q 50 70 100 90 L 100 100 L 0 100 Z" fill="${ink}" data-part="ground" opacity="0.2"/>`;
    const obj = `<g data-part="object">
      <circle cx="${cx}" cy="${cy}" r="${rad}" fill="${paper}" stroke="${ink}" stroke-width="2"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${parseFloat(rad) * 1.5}" ry="${parseFloat(rad) * 0.4}" transform="rotate(${ringAngle} ${cx} ${cy})" fill="none" stroke="${ink}" stroke-width="2"/>
    </g>`;
    const accent = `<g transform="rotate(${-parseFloat(ringAngle)} ${cx} ${cy})">
      <g data-part="accent" class="art-anim-slow">
        <circle cx="${parseFloat(cx) + parseFloat(rad) * 1.5}" cy="${cy}" r="${range(3, 6).toFixed(3)}" fill="${sceneAccent}"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderHoneycomb() {
    const hex = (x: number, y: number, r: number) => {
      const pts = [];
      for(let i=0; i<6; i++) {
        const a = i * Math.PI / 3;
        pts.push(`${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="${paper}" stroke="${ink}" stroke-width="2"/>`;
    };
    const x = range(30, 70);
    const y = range(30, 70);
    const r = 12;
    const ground = `<path d="M10,95 L90,95" stroke="${ink}" stroke-width="2" stroke-linecap="round" data-part="ground"/>`;
    const obj = `<g data-part="object">
      ${hex(x, y, r)}
      ${hex(x + r*1.5, y + r*0.866, r)}
      ${hex(x - r*1.5, y + r*0.866, r)}
      ${hex(x, y + r*1.732, r)}
    </g>`;
    const accent = `<g transform="translate(${x.toFixed(3)}, ${y.toFixed(3)})">
      <g data-part="accent" class="art-anim-slow">
        <circle cx="0" cy="0" r="6" fill="${sceneAccent}"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderVault() {
    const x = range(40, 60).toFixed(3);
    const y = 80;
    const ground = `<rect x="20" y="80" width="60" height="5" fill="${ink}" data-part="ground"/>`;
    const obj = `<g data-part="object" transform="translate(${x}, ${y})">
      <path d="M-20,0 L-20,-30 A20,20 0 0,1 20,-30 L20,0 Z" fill="${paper}" stroke="${ink}" stroke-width="2"/>
      <circle cx="0" cy="-20" r="12" fill="none" stroke="${ink}" stroke-width="2"/>
      <circle cx="0" cy="-20" r="2" fill="${ink}"/>
    </g>`;
    const accent = `<g transform="translate(${x}, ${y})">
      <g data-part="accent" class="art-anim-slow">
        <circle cx="0" cy="-20" r="6" fill="none" stroke="${sceneAccent}" stroke-dasharray="2 4" stroke-width="4"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderComet() {
    const cx = range(60, 80).toFixed(3);
    const cy = range(20, 40).toFixed(3);
    const tailLength = range(30, 50).toFixed(3);
    const ground = `<path d="M 0 85 Q 30 95 100 80 L 100 100 L 0 100 Z" fill="${ink}" data-part="ground" opacity="0.1"/>`;
    const cxN = parseFloat(cx);
    const cyN = parseFloat(cy);
    const tailN = parseFloat(tailLength);
    const obj = `<g data-part="object">
      <polygon points="${cxN},${cyN} ${cxN - tailN},${cyN + tailN * 0.5} ${cxN - tailN * 0.8},${cyN + tailN} Z" fill="${paper}" stroke="${ink}" stroke-width="1.5"/>
      <circle cx="${cxN}" cy="${cyN}" r="8" fill="${paper}" stroke="${ink}" stroke-width="2"/>
    </g>`;
    const accent = `<g>
      <g data-part="accent" class="art-anim-slow">
        <circle cx="${cxN}" cy="${cyN}" r="4" fill="${sceneAccent}"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderMetronome() {
    const x = range(40, 60).toFixed(3);
    const angle = range(-30, 30).toFixed(3);
    const ground = `<line x1="20" y1="85" x2="80" y2="85" stroke="${ink}" stroke-width="3" stroke-linecap="round" data-part="ground"/>`;
    const obj = `<g data-part="object" transform="translate(${x}, 85)">
      <polygon points="-15,0 15,0 5,-40 -5,-40" fill="${paper}" stroke="${ink}" stroke-width="2"/>
    </g>`;
    const accent = `<g transform="translate(${x}, 80)">
      <g data-part="accent" class="art-anim-slow">
        <g transform="rotate(${angle})">
          <line x1="0" y1="0" x2="0" y2="-35" stroke="${ink}" stroke-width="2"/>
          <rect x="-4" y="-25" width="8" height="6" fill="${sceneAccent}"/>
        </g>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderPrism() {
    const x = range(45, 55).toFixed(3);
    const y = 70;
    const ground = `<line x1="10" y1="75" x2="90" y2="75" stroke="${ink}" stroke-width="2" data-part="ground"/>`;
    const obj = `<g data-part="object" transform="translate(${x}, ${y})">
      <polygon points="0,-30 -20,0 20,0" fill="${paper}" stroke="${ink}" stroke-width="2"/>
      <line x1="-40" y1="-15" x2="-10" y2="-15" stroke="${ink}" stroke-width="2" stroke-dasharray="4 2"/>
    </g>`;
    const accent = `<g transform="translate(${x}, ${y})">
      <g data-part="accent" class="art-anim-slow">
        <polygon points="10,-15 40,-25 40,-5" fill="${sceneAccent}" opacity="0.4"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderBalanceScale() {
    const x = range(45, 55).toFixed(3);
    const tilt = range(-15, 15).toFixed(3);
    const xN = parseFloat(x);
    const ground = `<rect x="${xN - 20}" y="80" width="40" height="4" rx="2" fill="${ink}" data-part="ground"/>`;
    const obj = `<g data-part="object" transform="translate(${xN}, 80)">
      <line x1="0" y1="0" x2="0" y2="-40" stroke="${ink}" stroke-width="3"/>
      <g transform="translate(0, -40) rotate(${tilt})">
        <line x1="-20" y1="0" x2="20" y2="0" stroke="${ink}" stroke-width="2"/>
        <line x1="-20" y1="0" x2="-20" y2="20" stroke="${ink}" stroke-width="1"/>
        <line x1="20" y1="0" x2="20" y2="20" stroke="${ink}" stroke-width="1"/>
        <polygon points="-25,20 -15,20 -20,25" fill="${ink}"/>
        <polygon points="15,20 25,20 20,25" fill="${ink}"/>
      </g>
    </g>`;
    const accent = `<g transform="translate(${xN}, 40)">
      <g data-part="accent" class="art-anim-slow">
        <circle cx="0" cy="0" r="4" fill="${sceneAccent}"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderPyramid() {
    const x = range(40, 60).toFixed(3);
    const sunSide = choice([-1, 1]);
    const xN = parseFloat(x);
    const ground = `<path d="M 0 80 Q 50 75 100 85 L 100 100 L 0 100 Z" fill="${ink}" opacity="0.2" data-part="ground"/>`;
    const obj = `<g data-part="object" transform="translate(${xN}, 80)">
      <polygon points="-30,0 30,0 0,-40" fill="${paper}" stroke="${ink}" stroke-width="2"/>
      <polygon points="0,0 30,0 0,-40" fill="${ink}" opacity="0.1"/>
    </g>`;
    const accent = `<g transform="translate(${xN + sunSide * 25}, 30)">
      <g data-part="accent" class="art-anim-slow">
        <circle cx="0" cy="0" r="10" fill="${sceneAccent}"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderRadar() {
    const x = range(45, 55).toFixed(3);
    const angle = range(-45, 45).toFixed(3);
    const xN = parseFloat(x);
    const ground = `<line x1="${xN - 15}" y1="85" x2="${xN + 15}" y2="85" stroke="${ink}" stroke-width="4" stroke-linecap="round" data-part="ground"/>`;
    const obj = `<g data-part="object" transform="translate(${xN}, 85)">
      <polygon points="-5,0 5,0 2,-20 -2,-20" fill="${paper}" stroke="${ink}" stroke-width="2"/>
      <g transform="translate(0, -20) rotate(${angle})">
        <path d="M-15,-10 Q0,0 15,-10" fill="none" stroke="${ink}" stroke-width="2"/>
        <line x1="0" y1="-5" x2="0" y2="-15" stroke="${ink}" stroke-width="2"/>
      </g>
    </g>`;
    const accent = `<g transform="translate(${xN}, 65) rotate(${angle})">
      <g data-part="accent" class="art-anim-slow">
        <path d="M-10,-20 Q0,-30 10,-20 M-20,-30 Q0,-45 20,-30" fill="none" stroke="${sceneAccent}" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderPathOfStones() {
    const ground = `<path d="M 20 100 Q 50 60 40 40 T 70 20" fill="none" stroke="${ink}" stroke-width="20" stroke-opacity="0.1" data-part="ground"/>`;
    const s = range(0.8, 1.2).toFixed(3);
    const obj = `<g data-part="object">
      <ellipse cx="25" cy="90" rx="8" ry="4" fill="${paper}" stroke="${ink}" stroke-width="1.5"/>
      <ellipse cx="40" cy="75" rx="7" ry="3.5" fill="${paper}" stroke="${ink}" stroke-width="1.5"/>
      <ellipse cx="35" cy="55" rx="6" ry="3" fill="${paper}" stroke="${ink}" stroke-width="1.5"/>
      <ellipse cx="50" cy="40" rx="5" ry="2.5" fill="${paper}" stroke="${ink}" stroke-width="1.5"/>
    </g>`;
    const accent = `<g transform="translate(60, 25) scale(${s})">
      <g data-part="accent" class="art-anim-slow">
        <circle cx="0" cy="0" r="5" fill="${sceneAccent}"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderPairedAnchors() {
    const x = range(45, 55).toFixed(3);
    const xN = parseFloat(x);
    const ground = `<path d="M0 90 Q20 85 40 92 T80 90 T100 95 L100 100 L0 100 Z" fill="${ink}" opacity="0.2" data-part="ground"/>`;
    const obj = `<g data-part="object" transform="translate(${xN}, 75)">
      <path d="M-15,-15 Q-15,10 0,15 Q15,10 15,-15" fill="none" stroke="${ink}" stroke-width="2"/>
      <line x1="0" y1="-25" x2="0" y2="15" stroke="${ink}" stroke-width="2"/>
      <line x1="-10" y1="-10" x2="10" y2="-10" stroke="${ink}" stroke-width="2"/>
      <circle cx="0" cy="-28" r="3" fill="${paper}" stroke="${ink}" stroke-width="1.5"/>
    </g>`;
    const accent = `<g transform="translate(${xN + 20}, 50)">
      <g data-part="accent" class="art-anim-slow">
        <circle cx="0" cy="0" r="4" fill="${sceneAccent}" opacity="0.8"/>
        <circle cx="5" cy="-10" r="2" fill="${sceneAccent}" opacity="0.6"/>
        <circle cx="-2" cy="-20" r="3" fill="${sceneAccent}" opacity="0.4"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  function renderTelescope() {
    const x = range(30, 50).toFixed(3);
    const angle = range(-20, -40).toFixed(3);
    const xN = parseFloat(x);
    const ground = `<line x1="10" y1="90" x2="90" y2="90" stroke="${ink}" stroke-width="2" data-part="ground"/>`;
    const obj = `<g data-part="object" transform="translate(${xN}, 65)">
      <line x1="0" y1="0" x2="-10" y2="25" stroke="${ink}" stroke-width="2"/>
      <line x1="0" y1="0" x2="10" y2="25" stroke="${ink}" stroke-width="2"/>
      <g transform="rotate(${angle})">
        <rect x="-15" y="-5" width="30" height="10" rx="2" fill="${paper}" stroke="${ink}" stroke-width="1.5"/>
        <rect x="15" y="-3" width="5" height="6" fill="${ink}"/>
      </g>
    </g>`;
    const accent = `<g transform="translate(${xN + 25}, 25)">
      <g data-part="accent" class="art-anim-slow">
        <circle cx="0" cy="0" r="6" fill="${sceneAccent}"/>
      </g>
    </g>`;
    return ground + obj + accent;
  }

  const innerSVG = template.render();

  return `
    <svg data-scene="${template.name}" data-sky="${skyColor}" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style="pointer-events: none; background: ${skyColor};">
      <rect x="0" y="0" width="100" height="100" fill="${skyColor}" />
      ${innerSVG}
    </svg>
  `.trim();
}
