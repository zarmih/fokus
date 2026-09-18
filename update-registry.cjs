const fs = require('fs');

let reg = fs.readFileSync('src/exercises/registry.ts', 'utf8');
const imports = `import awColorDriftModule from './aw-color-drift';
import awShapePulseModule from './aw-shape-pulse';
import awLogicGateModule from './aw-logic-gate';\n`;
reg = reg.replace('export const registry', imports + '\nexport const registry');
reg = reg.replace('];', '  ,awColorDriftModule,\n  awShapePulseModule,\n  awLogicGateModule\n];');
fs.writeFileSync('src/exercises/registry.ts', reg);

let cat = fs.readFileSync('src/exercises/catalog.ts', 'utf8');
const awColorDriftManifest = `  {
    manifest: {
      id: 'aw-color-drift',
      name: 'Цветовой дрейф',
      domain: 'attention',
      skills: ['sustained_attention', 'reaction_speed'] as any,
      metricModel: 'speed-accuracy',
      instruction: 'Нажимайте на круг, когда он меняет цвет. Игнорируйте плавные изменения.'
    }
  },`;
const awShapePulseManifest = `  {
    manifest: {
      id: 'aw-shape-pulse',
      name: 'Пульс фигур',
      domain: 'memory',
      skills: ['visual_memory', 'working_memory'] as any,
      metricModel: 'memory-span',
      instruction: 'Запомните последовательность пульсирующих фигур и воспроизведите её.'
    }
  },`;
const awLogicGateManifest = `  {
    manifest: {
      id: 'aw-logic-gate',
      name: 'Логический шлюз',
      domain: 'logic',
      skills: ['logical_reasoning', 'processing_speed'] as any,
      metricModel: 'speed-accuracy',
      instruction: 'Если фигура КРУГ — жмите ВЛЕВО. Если КВАДРАТ — ВПРАВО. НО если фон КРАСНЫЙ, правила меняются наоборот!'
    }
  },`;

cat = cat.replace('];', awColorDriftManifest + '\n' + awShapePulseManifest + '\n' + awLogicGateManifest + '\n];');
fs.writeFileSync('src/exercises/catalog.ts', cat);
