
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const WORLDS = {
  suburban:{glb:'assets/worlds/suburban.glb',rig:'assets/rigs/suburban.json',reference:'assets/references/suburban.png'},
  desert:{glb:'assets/worlds/desert.glb',rig:'assets/rigs/desert.json',reference:'assets/references/desert.png'},
  neon:{glb:'assets/worlds/neon.glb',rig:'assets/rigs/neon.json',reference:'assets/references/neon.png'}
};

let scene,camera,renderer,controls,clock,currentRoot,rig;
let obstacleBoxes=[],groundBox=null,debugGroup;
let velocityY=0, grounded=false, debug=false;
const PLAYER_HEIGHT=1.7, PLAYER_RADIUS=.55, GRAVITY=24, WALK=6, SPRINT=12;
const keys={w:false,a:false,s:false,d:false,shift:false};
const $=id=>document.getElementById(id);

function b2t(p){return new THREE.Vector3(p.x,p.z,-p.y)}
function t2b(p){return {x:p.x,y:-p.z,z:p.y}}

async function boot(){
  scene=new THREE.Scene(); scene.background=new THREE.Color(0x07131d); scene.fog=new THREE.FogExp2(0x07131d,.008);
  camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,500);
  renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(devicePixelRatio);
  renderer.shadowMap.enabled=true; renderer.domElement.tabIndex=0; $('viewport').appendChild(renderer.domElement);
  controls=new PointerLockControls(camera,renderer.domElement); scene.add(controls.getObject());
  clock=new THREE.Clock();
  scene.add(new THREE.HemisphereLight(0xdaf5ff,0x27361c,2.1));
  const sun=new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(30,50,25); sun.castShadow=true; scene.add(sun);
  debugGroup=new THREE.Group(); debugGroup.visible=false; scene.add(debugGroup);
  setupInput(); await loadWorld('suburban'); animate();
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
}

function setupInput(){
  addEventListener('keydown',e=>{
    if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(e.code)) e.preventDefault();
    if(e.code==='KeyW')keys.w=true;if(e.code==='KeyA')keys.a=true;if(e.code==='KeyS')keys.s=true;if(e.code==='KeyD')keys.d=true;
    if(e.code==='ShiftLeft'||e.code==='ShiftRight')keys.shift=true;
  },{passive:false});
  addEventListener('keyup',e=>{
    if(e.code==='KeyW')keys.w=false;if(e.code==='KeyA')keys.a=false;if(e.code==='KeyS')keys.s=false;if(e.code==='KeyD')keys.d=false;
    if(e.code==='ShiftLeft'||e.code==='ShiftRight')keys.shift=false;
  });
  addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
  renderer.domElement.addEventListener('click',()=>{renderer.domElement.focus(); if(!controls.isLocked) controls.lock()});
  controls.addEventListener('lock',()=>updatePointer());controls.addEventListener('unlock',()=>updatePointer());
  $('world-select').addEventListener('change',e=>loadWorld(e.target.value));
  $('reset').onclick=()=>resetPlayer();
  $('debug').onclick=()=>{debug=!debug;debugGroup.visible=debug};
  $('mode-reference').onclick=()=>setMode('reference');
  $('mode-match').onclick=()=>setMode('match');
  $('mode-play').onclick=()=>setMode('play');
}

function setMode(mode){
  document.body.classList.remove('reference','match');
  if(mode!=='play') document.body.classList.add(mode);
  ['reference','match','play'].forEach(x=>$('mode-'+x).classList.toggle('active',x===mode));
  $('reference-panel').style.display=mode==='reference'?'block':'';
  $('match-overlay').style.display=mode==='match'?'block':'';
}

async function loadWorld(id){
  if(controls.isLocked) controls.unlock();
  if(currentRoot){scene.remove(currentRoot);currentRoot.traverse(o=>{if(o.geometry)o.geometry.dispose()});}
  obstacleBoxes=[];groundBox=null; debugGroup.clear();
  const cfg=WORLDS[id];
  rig=await fetch(cfg.rig).then(r=>r.json());
  $('reference-image').src=cfg.reference;$('match-image').src=cfg.reference;
  const gltf=await new Promise((resolve,reject)=>new GLTFLoader().load(cfg.glb,resolve,undefined,reject));
  currentRoot=gltf.scene; scene.add(currentRoot); currentRoot.updateMatrixWorld(true);
  currentRoot.traverse(o=>{
    if(!o.isMesh)return; o.castShadow=true;o.receiveShadow=true;
    const box=new THREE.Box3().setFromObject(o);
    if(o.name==='XPLAY_GROUND'){groundBox=box}
    else if(!o.name.includes('ROAD')) obstacleBoxes.push({name:o.name,box});
  });
  buildDebug(); resetPlayer();
}

function buildDebug(){
  debugGroup.clear();
  for(const item of obstacleBoxes){const h=new THREE.Box3Helper(item.box,0xff304f);debugGroup.add(h)}
  for(const lm of rig.landmarks||[]){
    const p=b2t(lm);const g=new THREE.SphereGeometry(.35,10,8);const m=new THREE.MeshBasicMaterial({color:0x00eaff});const s=new THREE.Mesh(g,m);s.position.copy(p);debugGroup.add(s);
  }
}

function resetPlayer(){
  if(!rig)return; const p=b2t(rig.playerStart); controls.getObject().position.copy(p); controls.getObject().rotation.set(0,0,0); velocityY=0;
}

function collides(pos){
  const player=new THREE.Box3(new THREE.Vector3(pos.x-PLAYER_RADIUS,pos.y-PLAYER_HEIGHT,pos.z-PLAYER_RADIUS),
                             new THREE.Vector3(pos.x+PLAYER_RADIUS,pos.y+.1,pos.z+PLAYER_RADIUS));
  return obstacleBoxes.some(o=>player.intersectsBox(o.box));
}

function update(dt){
  const obj=controls.getObject(), pos=obj.position;
  const speed=keys.shift?SPRINT:WALK;
  const forward=new THREE.Vector3(); camera.getWorldDirection(forward); forward.y=0; forward.normalize();
  const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  const move=new THREE.Vector3();
  if(keys.w)move.add(forward);if(keys.s)move.sub(forward);if(keys.d)move.add(right);if(keys.a)move.sub(right);
  if(move.lengthSq()>0){move.normalize().multiplyScalar(speed*dt);const next=pos.clone().add(move);if(!collides(next))pos.copy(next)}
  velocityY-=GRAVITY*dt; pos.y+=velocityY*dt;
  const groundY=PLAYER_HEIGHT;
  if(pos.y<groundY){pos.y=groundY;velocityY=0;grounded=true}else grounded=false;
  updateHUD();
}

function updateHUD(){
  const p=t2b(controls.getObject().position);
  $('xyz').textContent=`${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);$('heading').textContent=`${(Math.atan2(dir.x,-dir.z)*180/Math.PI+360)%360|0}°`;
  let best=null,bd=Infinity;
  for(const lm of rig?.landmarks||[]){const dx=p.x-lm.x,dy=p.y-lm.y,dz=p.z-lm.z,d=Math.hypot(dx,dy,dz);if(d<bd){bd=d;best=lm}}
  $('nearest').textContent=best?.objectName||'—';$('distance').textContent=best?`${bd.toFixed(1)} m`:'—';
  const active=[];if(keys.w)active.push('W');if(keys.a)active.push('A');if(keys.s)active.push('S');if(keys.d)active.push('D');if(keys.shift)active.push('SHIFT');
  $('input').textContent=active.join(' ')||'NONE';updatePointer();
}

function updatePointer(){$('pointer').textContent=controls?.isLocked?'LOCKED':'UNLOCKED'}

function animate(){
  requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),.05); update(dt); renderer.render(scene,camera);
}
boot().catch(err=>{console.error(err);document.body.insertAdjacentHTML('beforeend',`<pre style="position:fixed;bottom:10px;left:10px;color:#ff6b6b;z-index:99">${err}</pre>`)});
