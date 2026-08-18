import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const required=[
 ['skybound','runner'],['rooftop','dodge'],['grove','collect'],['beatline','rhythm'],['thoughtlink','puzzle'],
 ['frontline','fps'],['streetclash','fighting'],['driftlands','openworld'],['neonrace','racing'],['wildjump','platformer']
];

const failures=[];
for(const [id,engine] of required){
 const p=path.join(root,'public','plx',id,'manifest.json');
 if(!fs.existsSync(p)){failures.push(`${engine}: missing manifest ${p}`);continue;}
 const m=JSON.parse(fs.readFileSync(p,'utf8'));
 if(m.engine!==engine)failures.push(`${id}: expected ${engine}, got ${m.engine}`);
 const base=path.dirname(p);
 for(const [key,val] of Object.entries(m.assets?.images||{})){
   if(typeof val!=='string') continue;
   if(val.startsWith('assets/')){
     const ap=path.join(base,val);
     if(!fs.existsSync(ap)) failures.push(`${engine}: missing ${key} asset ${val}`);
   } else if(val.startsWith('/flux-pack/')){
     const ap=path.join(root,'public',val.slice(1));
     if(!fs.existsSync(ap)) failures.push(`${engine}: missing Flux ${key} asset ${val}`);
   }
 }
}

const runtime=fs.readFileSync(path.join(root,'src/core/PLXRuntime.js'),'utf8');
for(const e of ['fps','fighting']){
 if(!new RegExp(`${e}:`).test(runtime)) failures.push(`${e}: NOT registered in PLXRuntime`);
}
for(const scene of ['FPSScene.js','FightingScene.js']){
 const p=path.join(root,'src/scenes',scene);
 if(!fs.existsSync(p)||fs.statSync(p).size<1200) failures.push(`${scene}: missing or incomplete`);
}

if(failures.length){
 console.error('\\nXPLAY DIRECTOR STUDIO VERIFY: FAIL');
 failures.forEach(x=>console.error(' - '+x));
 process.exit(1);
}
console.log('\\nXPLAY DIRECTOR STUDIO VERIFY: PASS');
console.log('10/10 manifests found and mapped.');
console.log('FPS: manifest + assets + runtime scene + registration = PASS');
console.log('Fighting: manifest + assets + runtime scene + registration = PASS');
