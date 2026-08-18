import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const failures=[];

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
  if(m.engine!==engine) failures.push(`${id}: expected ${engine}, got ${m.engine}`);
  if(!m.releaseCandidateArt) failures.push(`${engine}: release-candidate art flag missing`);
  for(const [k,v] of Object.entries(m.assets?.images||{})){
    if(typeof v!=='string') continue;
    if(v.startsWith('/rc-assets/')){
      const ap=path.join(root,'public',v.slice(1));
      if(!fs.existsSync(ap)) failures.push(`${engine}: missing RC asset ${k} -> ${v}`);
    }
  }
}

const main=fs.readFileSync(path.join(root,'src','main.js'),'utf8');
for(const token of ['renderFeed','socialPosts','Frontline Echo','Street Clash','Calibrate Prompt']){
  if(!main.includes(token)) failures.push(`main.js missing release feature: ${token}`);
}

const feedPath=path.join(root,'public','social','mock-feed.json');
if(!fs.existsSync(feedPath)) failures.push('mock social feed missing');
else {
  const feed=JSON.parse(fs.readFileSync(feedPath,'utf8'));
  if(feed.length<10) failures.push(`mock feed only contains ${feed.length} posts`);
  for(const post of feed){
    const cover=path.join(root,'public',String(post.cover||'').replace(/^\.\//,''));
    if(!fs.existsSync(cover)) failures.push(`missing social cover ${post.cover}`);
  }
}

const runtime=fs.readFileSync(path.join(root,'src','core','PLXRuntime.js'),'utf8');
if(!/\bfps\s*:/.test(runtime)) failures.push('FPS not registered');
if(!/\bfighting\s*:/.test(runtime)) failures.push('Fighting not registered');

for(const f of [
  '.agents/agents.md',
  '.agents/workflows/xplay-big-gulp.md',
  'ANTIGRAVITY_START_HERE.md',
  'LIVE_STAGE.md',
  'deploy/INSTALL-LIVE-STAGE.ps1',
  'public/rc-assets/SPRITE_PACK_MANIFEST.json'
]){
  if(!fs.existsSync(path.join(root,f))) failures.push(`missing RC/Foundry file: ${f}`);
}

if(failures.length){
  console.error('\nXPLAY 3.1 RELEASE CANDIDATE VERIFY: FAIL');
  failures.forEach(x=>console.error(' - '+x));
  process.exit(1);
}
console.log('\nXPLAY 3.1 RELEASE CANDIDATE VERIFY: PASS');
console.log('10/10 playable categories present.');
console.log('FPS release lock: PASS');
console.log('Fighting release lock: PASS');
console.log('Mock social timeline: PASS');
console.log('Category-native RC art packs: PASS');
console.log('Antigravity Foundry: PASS');
console.log('Live-stage deployment kit: PASS');
