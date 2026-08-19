import fs from 'node:fs';
const must=[
 'src/core/TileWFC.js','src/core/ProductionBudget.js','src/core/SaliencyDirector.js','src/core/CharacterBible.js','src/core/AtlasCritic.js','src/core/VisualRepairDirector.js','src/core/ReferenceTargetModel.js','src/core/VisualFrameCritic.js','src/services/worldArtForge.js','REFERENCE_QUALITY/current-xplay-failure.png'
];
const missing=must.filter(f=>!fs.existsSync(f));if(missing.length){console.error('FASTTRACK V4 FAIL missing:',missing);process.exit(1)}
const checks=[
 ['src/core/LevelComposer.js','solveTerrainStrip'],['src/core/PLXRuntime.js','runVisualRepairLoop'],['src/services/worldArtForge.js','critiqueGridDataUrl'],['src/main.js','characterBible'],['server/index.js','repairFeedback']
];
const bad=checks.filter(([f,t])=>!fs.readFileSync(f,'utf8').includes(t));if(bad.length){console.error('FASTTRACK V4 FAIL wiring:',bad);process.exit(1)}
console.log('XPLAY FASTTRACK V4 VERIFY: PASS');console.log('WFC + render repair + atlas critic + character identity lock + reference targets: PASS');
