const fs = require('fs');
const files = [
  'src/exercises/grid-memory/manifest.ts',
  'src/exercises/odd-one/manifest.ts',
  'src/exercises/pattern-next/manifest.ts',
  'src/exercises/sequence/manifest.ts',
  'src/exercises/stroop/manifest.ts',
  'src/exercises/switch-rule/manifest.ts'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/manifest\.levels\[/g, 'manifest.levels![');
  fs.writeFileSync(f, content);
});
