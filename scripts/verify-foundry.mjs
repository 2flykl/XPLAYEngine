import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const failures=[];
const notes=[];

const required=[
 ['frontline','fps'],
 ['streetclash','fighting'],
 ['skybound','runner'],
 ['rooftop','dodge'],
 ['grove','collect'],
 ['beatline','rhythm'],
 ['thoughtlink','puzzle'],
 ['driftlands','openworld'],
 ['neonrace','racing'],
 ['wildjump','platformer']
];

for(const [id,engine] of required){
 const p=path.join(root,'public','plx',id,'manifest.json');
 if(!fs.existsSync(p)){failures.push(`${engine}: missing manifest`);continue;}
 const m=JSON.parse(fs.readFileSync(p,'utf8'));
 if(m.engine!==engine)failures.push(`${id}: expected ${engine}, got ${m.engine}`);
}

for(const requiredFile of [
 '.agents/agents.md',
 '.agents/workflows/xplay-big-gulp.md',
 '.agents/workflows/xplay-double-big-gulp.md',
 'production_artifacts/XPLAY_NORTH_STAR.md',
 'production_artifacts/OWNERSHIP_MATRIX.md',
 'src/scenes/FPSScene.js',
 'src/scenes/FightingScene.js',
 'src/core/PLXRuntime.js'
]){
 const p=path.join(root,requiredFile);
 if(!fs.existsSync(p)) failures.push(`Missing Foundry requirement: ${requiredFile}`);
}

const runtime=fs.readFileSync(path.join(root,'src/core/PLXRuntime.js'),'utf8');
if(!/\bfps\s*:/.test(runtime)) failures.push('FPS not registered in PLXRuntime');
if(!/\bfighting\s*:/.test(runtime)) failures.push('Fighting not registered in PLXRuntime');

const fps=fs.readFileSync(path.join(root,'src/scenes/FPSScene.js'),'utf8');
for(const token of ['crosshair','reload','ammo','enemy']){
 if(!fps.toLowerCase().includes(token)) failures.push(`FPS scene missing expected capability token: ${token}`);
}
const fighting=fs.readFileSync(path.join(root,'src/scenes/FightingScene.js'),'utf8');
for(const token of ['playerhp','enemyhp','block','kick','punch']){
 if(!fighting.toLowerCase().includes(token)) failures.push(`Fighting scene missing expected capability token: ${token}`);
}

const main=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
for(const word of ['Frontline Echo','Street Clash','First-Person Shooter','Fighting']){
 if(!main.includes(word)) failures.push(`Library UI missing ${word}`);
}

if(/PLX Engine 2\./.test(main)) notes.push('Old 2.x version label remains in UI.');

if(failures.length){
 console.error('\\nXPLAY 3.0 FOUNDRY VERIFY: FAIL');
 failures.forEach(x=>console.error(' - '+x));
 process.exit(1);
}
console.log('\\nXPLAY 3.0 FOUNDRY VERIFY: PASS');
console.log('10/10 specialist PLX categories present.');
console.log('FPS release lock: PASS');
console.log('Fighting release lock: PASS');
console.log('Antigravity Foundry workspace: PASS');
notes.forEach(x=>console.log('NOTE: '+x));
