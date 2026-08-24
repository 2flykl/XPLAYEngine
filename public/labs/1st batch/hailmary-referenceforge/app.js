(()=>{
const $ = s=>document.querySelector(s);
const cropGrid = $('#cropGrid');
const assetGrid = $('#assetGrid');
const sourcePreview = $('#sourcePreview');
const sourceMeta = $('#sourceMeta');
const descriptionBox = $('#descriptionBox');
const packetBox = $('#packetBox');
const plateCanvas = $('#plateCanvas');
const worldCanvas = $('#worldCanvas');
const runtimeCanvas = $('#runtimeCanvas');
const plateCtx = plateCanvas.getContext('2d');
const worldCtx = worldCanvas.getContext('2d');
const runtimeCtx = runtimeCanvas.getContext('2d');

const state={
  image:null,imageBitmap:null,sourceName:'',sourceURL:'',packet:null,description:'',
  crops:{},cutouts:{},sheets:{},world:null,plate:null,game:null,built:false
};

const defaultRegions=[
  {id:'hud',name:'HUD Strip',xr:0.02,yr:0.02,wr:0.84,hr:0.13,kind:'hud'},
  {id:'player',name:'Alex',xr:0.28,yr:0.33,wr:0.23,hr:0.49,kind:'fighter'},
  {id:'enemyL',name:'Knife Punk',xr:0.05,yr:0.37,wr:0.20,hr:0.45,kind:'fighter'},
  {id:'enemyC',name:'Bandana Rival',xr:0.46,yr:0.37,wr:0.20,hr:0.44,kind:'fighter'},
  {id:'enemyR',name:'Dock Bruiser',xr:0.72,yr:0.34,wr:0.20,hr:0.47,kind:'fighter'},
  {id:'container',name:'Container + Danger',xr:0.51,yr:0.28,wr:0.36,hr:0.42,kind:'prop'},
  {id:'leftStage',name:'B7 Security',xr:0.00,yr:0.16,wr:0.30,hr:0.52,kind:'prop'},
  {id:'ground',name:'Ground Plate',xr:0.00,yr:0.62,wr:1.00,hr:0.25,kind:'ground'},
  {id:'stage',name:'Stage Plate',xr:0.00,yr:0.13,wr:1.00,hr:0.87,kind:'stage'}
];

function setStatus(slot,msg){ $('#status'+slot).textContent=msg; }
function fmt(n){ return Math.round(n); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function createCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function trimCanvas(src){
  const ctx=src.getContext('2d'); const {width:w,height:h}=src; const img=ctx.getImageData(0,0,w,h).data;
  let minX=w,minY=h,maxX=-1,maxY=-1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const a=img[(y*w+x)*4+3]; if(a>10){ if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y; } }
  if(maxX<0) return src;
  const out=createCanvas(maxX-minX+1,maxY-minY+1); out.getContext('2d').drawImage(src,minX,minY,out.width,out.height,0,0,out.width,out.height); return out;
}
function cropFromImage(img,rect){
  const c=createCanvas(rect.w,rect.h); c.getContext('2d').drawImage(img,rect.x,rect.y,rect.w,rect.h,0,0,rect.w,rect.h); return c;
}
const DEFAULT_DESCRIPTION = `[XPLAY HAIL MARY — REFERENCE SCREENSHOT TO PLAYABLE LAB] Treat the uploaded screenshot as the source truth. Use only the current screenshot and the current packet. Do not pull legacy site assets. Extract the visible player Alex, visible rivals, the HUD strip, and major landmark props. Create transparent proxy sprites, a clean stage plate, an extended side-scrolling dockyard world, and a playable runtime. Preserve the visible camera, palette, scale, UI language, and landmark hierarchy. Major landmarks: ZENITH INDUSTRIES container, B7 security building, caution fence, green toxic barrels, metal ladder, DANGER sign, hazard-striped ground, skyline and moon. If exact animation frames do not exist, create proxy motion by reusing extracted reference cutouts as sprite bases. Prioritize testability over perfection.`;
const DEFAULT_PACKET = {
  title:'Urban Shipping Clash', genreLock:'fighting', camera:'2D side-view beat-em-up', artStyle:'retro 16/32-bit arcade',
  player:{id:'player_alex',name:'Alex',identity:'Black male martial artist',action:'open-palm strike to the right'},
  enemies:[
    {id:'enemy_knife',name:'Knife Punk',region:'left'},
    {id:'enemy_bandana',name:'Bandana Rival',region:'center-right'},
    {id:'enemy_bruiser',name:'Dock Bruiser',region:'far-right'}
  ],
  landmarks:['ZENITH INDUSTRIES container','B7 security building','chain-link fence','green toxic barrels','metal ladder','DANGER sign','hazard-striped floor','night skyline/moon'],
  world:{width:2600,targetSeconds:22,scrolling:true},
  locks:{genre:true,noLegacyAssets:true,unknownStaysUnknown:true,noRepeatedHud:true,noMirroredCharacters:true},
  buildId:'hailmary_rf_001', sourceHash:'reference-image-only',
  userIntent:'User controls Alex, an African American martial artist, fighting visible rivals in a side-scrolling industrial dockyard brawler. Preserve the screenshot camera, scale, palette, HUD language, composition, and major landmarks.'
};
function loadImage(url){ return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=url; }); }
function sampleDominantColors(canvas,count=6){
  const ctx=canvas.getContext('2d'); const {width:w,height:h}=canvas; const data=ctx.getImageData(0,0,w,h).data; const bins=new Map();
  for(let y=0;y<h;y+=4){ for(let x=0;x<w;x+=4){ const i=(y*w+x)*4; const a=data[i+3]; if(a<200) continue; const r=data[i]>>4,g=data[i+1]>>4,b=data[i+2]>>4; const key=`${r},${g},${b}`; bins.set(key,(bins.get(key)||0)+1); } }
  const arr=[...bins.entries()].sort((a,b)=>b[1]-a[1]).slice(0,count).map(([k])=>k.split(',').map(v=>parseInt(v)*16));
  return arr.length?arr:[[20,30,60],[45,70,110],[110,80,45]];
}
function floodEdgeBackgroundMask(canvas,tolerance=44){
  const ctx=canvas.getContext('2d'); const {width:w,height:h}=canvas; const img=ctx.getImageData(0,0,w,h); const d=img.data;
  const visited=new Uint8Array(w*h); const bg=new Uint8Array(w*h); const q=[];
  function rgbAt(idx){ const i=idx*4; return [d[i],d[i+1],d[i+2],d[i+3]]; }
  function dist(c1,c2){ const dr=c1[0]-c2[0],dg=c1[1]-c2[1],db=c1[2]-c2[2]; return Math.sqrt(dr*dr+dg*dg+db*db); }
  const refs=[];
  for(let x=0;x<w;x+=Math.max(1,Math.floor(w/20))){ refs.push(rgbAt(x)); refs.push(rgbAt((h-1)*w+x)); }
  for(let y=0;y<h;y+=Math.max(1,Math.floor(h/20))){ refs.push(rgbAt(y*w)); refs.push(rgbAt(y*w+(w-1))); }
  function tryPush(idx){ if(idx<0||idx>=w*h||visited[idx]) return; visited[idx]=1; const c=rgbAt(idx); if(c[3]<20){ bg[idx]=1; q.push(idx); return; } let best=1e9; for(const r of refs){ const v=dist(c,r); if(v<best) best=v; } if(best<=tolerance){ bg[idx]=1; q.push(idx);} }
  for(let x=0;x<w;x++){ tryPush(x); tryPush((h-1)*w+x); }
  for(let y=0;y<h;y++){ tryPush(y*w); tryPush(y*w+w-1); }
  while(q.length){ const idx=q.shift(); const x=idx%w,y=(idx/w)|0; const base=rgbAt(idx);
    const n=[idx-1,idx+1,idx-w,idx+w];
    for(const ni of n){ if(ni<0||ni>=w*h||visited[ni]) continue; const nx=ni%w,ny=(ni/w)|0; if(Math.abs(nx-x)+Math.abs(ny-y)!==1) continue; visited[ni]=1; const c=rgbAt(ni); if(c[3]<20){ bg[ni]=1; q.push(ni); continue; } let closeToRef=false; for(const r of refs){ if(dist(c,r)<=tolerance){ closeToRef=true; break; } } if(closeToRef || dist(c,base)<=tolerance*0.7){ bg[ni]=1; q.push(ni); } }
  }
  for(let i=0;i<w*h;i++){ if(bg[i]) d[i*4+3]=0; }
  ctx.putImageData(img,0,0);
  return trimCanvas(canvas);
}
function buildCutout(cropCanvas, kind='fighter'){
  const c=createCanvas(cropCanvas.width,cropCanvas.height); const cctx=c.getContext('2d'); cctx.drawImage(cropCanvas,0,0);
  const tolerance=kind==='fighter'?42:36; return floodEdgeBackgroundMask(c,tolerance);
}
function drawPropSlice(ctx,src,sx,sy,sw,sh,dx,dy,dw,dh,alpha=1){ ctx.save(); ctx.globalAlpha=alpha; ctx.drawImage(src,sx,sy,sw,sh,dx,dy,dw,dh); ctx.restore(); }
function buildCleanPlate(){
  const stage=state.crops.stage.canvas; if(!stage) return null; const plate=createCanvas(stage.width,stage.height); const ctx=plate.getContext('2d'); ctx.drawImage(stage,0,0);
  const rois=['player','enemyL','enemyC','enemyR'].map(id=>state.crops[id]).filter(Boolean);
  rois.forEach(r=>{
    const x=Math.max(0,r.rect.x-state.crops.stage.rect.x), y=Math.max(0,r.rect.y-state.crops.stage.rect.y), w=r.rect.w, h=r.rect.h;
    const leftX=Math.max(0,x-8), rightX=Math.min(stage.width-8,x+w+8);
    for(let yy=0;yy<h;yy+=2){
      const sy=clamp(y+yy,0,stage.height-1); const srcX=(leftX>8)?leftX:rightX;
      const stripW=Math.min(8,stage.width-srcX);
      ctx.drawImage(stage,srcX,sy,stripW,1,x,sy,w,2);
    }
    ctx.fillStyle='rgba(10,18,30,0.06)'; ctx.fillRect(x,y,w,h);
  });
  return plate;
}
function makeSpriteSheet(base, label, isPlayer=false){
  const fw=Math.max(80,base.width+40), fh=Math.max(110,base.height+28), frames=isPlayer?6:5; const c=createCanvas(fw*frames,fh); const ctx=c.getContext('2d');
  const poses=[
    {dx:0,dy:0,sx:1,sy:1,rot:0},
    {dx:0,dy:-3,sx:1.02,sy:0.98,rot:0},
    {dx:-4,dy:1,sx:0.98,sy:1.02,rot:-0.03},
    {dx:4,dy:1,sx:1.02,sy:0.99,rot:0.03},
    {dx:isPlayer?10:6,dy:-2,sx:isPlayer?1.08:1.04,sy:0.97,rot:isPlayer?0.08:0.04},
    {dx:isPlayer?4:0,dy:0,sx:1,sy:1,rot:0}
  ];
  for(let i=0;i<frames;i++){
    const p=poses[i]||poses[0]; const ox=i*fw; ctx.save(); ctx.translate(ox+fw/2+p.dx,fh/2+8+p.dy); ctx.rotate(p.rot); ctx.scale(p.sx,p.sy); ctx.drawImage(base,-base.width/2,-base.height/2+4); ctx.restore();
    ctx.fillStyle='rgba(22,48,76,0.75)'; ctx.font='12px Arial'; ctx.fillText(label+' '+(i+1), ox+8, fh-8);
  }
  return c;
}
function buildWorld(){
  const packet=state.packet||{}; const worldW=((packet.world&&packet.world.width)||2600); const stage=state.crops.stage.canvas; const plate=state.plate || stage; if(!stage) return null; const c=createCanvas(worldW,stage.height); const ctx=c.getContext('2d');
  const topSample=createCanvas(stage.width,Math.max(60,Math.floor(stage.height*0.25))); topSample.getContext('2d').drawImage(stage,0,0,stage.width,topSample.height,0,0,topSample.width,topSample.height);
  const cols=sampleDominantColors(topSample,4); const g=ctx.createLinearGradient(0,0,0,stage.height); g.addColorStop(0,`rgb(${cols[0].join(',')})`); g.addColorStop(0.55,`rgb(${(cols[1]||cols[0]).join(',')})`); g.addColorStop(1,'rgb(35,33,54)'); ctx.fillStyle=g; ctx.fillRect(0,0,c.width,c.height);
  // skyline modules from upper stage slices
  const skySlice=createCanvas(Math.floor(stage.width*0.36), Math.floor(stage.height*0.36)); skySlice.getContext('2d').drawImage(stage, Math.floor(stage.width*0.26), 0, skySlice.width, skySlice.height,0,0,skySlice.width,skySlice.height);
  for(let x=0;x<c.width;x+=skySlice.width-60){ ctx.globalAlpha=0.55; ctx.drawImage(skySlice,x,20); }
  ctx.globalAlpha=1;
  // moon
  ctx.fillStyle='rgba(240,240,255,0.85)'; ctx.beginPath(); ctx.arc(1850,70,24,0,Math.PI*2); ctx.fill();
  // repeat plate base along world
  const groundY=Math.floor(stage.height*0.54); for(let x=0;x<c.width;x+=plate.width-40){ ctx.drawImage(plate,x,0,plate.width,plate.height); }
  // strengthen left security building once
  if(state.crops.leftStage) ctx.drawImage(state.crops.leftStage.canvas,25,40,260,270);
  // fences and barrels cluster
  const fenceX=360; ctx.strokeStyle='rgba(210,225,240,0.85)'; ctx.lineWidth=3;
  for(let s=0;s<2;s++){ const fx=fenceX+s*760; ctx.strokeRect(fx,120,235,120); for(let i=0;i<8;i++){ ctx.beginPath(); ctx.moveTo(fx+10+i*28,120); ctx.lineTo(fx+25+i*28,240); ctx.stroke(); ctx.beginPath(); ctx.moveTo(fx+25+i*28,120); ctx.lineTo(fx+10+i*28,240); ctx.stroke(); } ctx.fillStyle='rgb(78,120,40)'; ctx.fillRect(fx+25,245,34,46); ctx.fillRect(fx+65,245,34,46); }
  // containers
  function drawContainer(x){ ctx.fillStyle='rgb(132,74,44)'; ctx.fillRect(x,95,410,220); ctx.fillStyle='rgba(246,212,146,0.5)'; ctx.font='bold 54px Arial'; ctx.fillText('ZENITH',x+55,190); ctx.fillText('INDUSTRIES',x+55,250); ctx.strokeStyle='rgba(100,55,30,0.75)'; for(let i=0;i<6;i++){ ctx.beginPath(); ctx.moveTo(x+18+i*64,95); ctx.lineTo(x+18+i*64,315); ctx.stroke(); } ctx.fillStyle='rgb(182,150,49)'; ctx.fillRect(x+285,138,84,110); ctx.fillStyle='rgb(90,36,16)'; ctx.font='bold 24px Arial'; ctx.fillText('DANGER',x+292,190); ctx.fillStyle='rgb(238,161,25)'; ctx.font='bold 60px Arial'; ctx.fillText('⚡',x+307,245); }
  drawContainer(910); drawContainer(1680);
  // hazard stripe ground accents
  for(let x=0;x<c.width;x+=70){ ctx.fillStyle=x%140===0?'rgb(228,191,58)':'rgb(54,52,68)'; ctx.fillRect(x,groundY+125,42,8); }
  // ladder
  ctx.strokeStyle='rgba(180,190,210,0.95)'; ctx.lineWidth=5; const lx=1290, ly=92, lh=150; ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx,ly+lh); ctx.moveTo(lx+38,ly); ctx.lineTo(lx+38,ly+lh); for(let r=0;r<8;r++){ ctx.moveTo(lx,ly+18*r); ctx.lineTo(lx+38,ly+18*r);} ctx.stroke();
  // oil drums
  ctx.fillStyle='rgb(122,64,36)'; ctx.fillRect(2280,270,54,90); ctx.strokeStyle='rgba(60,30,18,0.8)'; ctx.strokeRect(2280,270,54,90);
  return c;
}
function blobFromCanvas(canvas){ return new Promise(resolve=>canvas.toBlob(resolve)); }
async function previewCrops(){ cropGrid.innerHTML=''; for(const item of Object.values(state.crops)){
    const wrap=document.createElement('div'); wrap.className='crop-item'; wrap.innerHTML=`<h4>${item.name}</h4><div class="frame"></div><div class="meta">${item.rect.w}×${item.rect.h} · ${item.kind}</div>`; wrap.querySelector('.frame').appendChild(item.canvas); cropGrid.appendChild(wrap);
  }
}
async function previewAssets(){ assetGrid.innerHTML='';
  for(const [key,val] of Object.entries(state.cutouts)){
    const wrap=document.createElement('div'); wrap.className='asset-item'; wrap.innerHTML=`<h4>${val.name} Cutout</h4><div class="frame"></div><div class="meta">Transparent proxy sprite</div>`; wrap.querySelector('.frame').appendChild(val.canvas); assetGrid.appendChild(wrap);
  }
  for(const [key,val] of Object.entries(state.sheets)){
    const wrap=document.createElement('div'); wrap.className='asset-item'; wrap.innerHTML=`<h4>${val.name} Sprite Sheet</h4><div class="frame"></div><div class="meta">Proxy animation frames generated from current reference</div>`; wrap.querySelector('.frame').appendChild(val.canvas); assetGrid.appendChild(wrap);
  }
}
function parsePacket(){ try{return JSON.parse(packetBox.value);}catch(e){ alert('Packet JSON is invalid.'); throw e; } }
function loadDefaults(){ descriptionBox.value=DEFAULT_DESCRIPTION; packetBox.value=JSON.stringify(DEFAULT_PACKET,null,2); }
async function useSample(){ const img=await loadImage('assets/urban_shipping_reference.png'); setSource(img,'urban_shipping_reference.png'); }
function setSource(img,name){ state.image=img; state.sourceName=name; sourcePreview.src=img.src; sourceMeta.textContent=`${name} · ${img.naturalWidth||img.width}×${img.naturalHeight||img.height}`; setStatus('Reference','loaded'); }
async function handleFile(file){ const url=URL.createObjectURL(file); const img=await loadImage(url); setSource(img,file.name); }

function buildRegions(){ const img=state.image; const W=img.naturalWidth||img.width,H=img.naturalHeight||img.height; state.crops={};
  defaultRegions.forEach(r=>{ const rect={x:fmt(r.xr*W),y:fmt(r.yr*H),w:fmt(r.wr*W),h:fmt(r.hr*H)}; const c=cropFromImage(img,rect); state.crops[r.id]={id:r.id,name:r.name,kind:r.kind,rect,canvas:c}; });
}
function runGoldenPath(){ if(!state.image){ alert('Load a screenshot first.'); return; }
  setStatus('Extraction','running'); setStatus('Cutouts','running'); setStatus('Extension','running'); setStatus('Runtime','readying');
  state.description=descriptionBox.value.trim(); state.packet=parsePacket(); buildRegions(); previewCrops(); setStatus('Extraction','done');
  state.cutouts={
    player:{name:'Alex', canvas:buildCutout(cropFromImage(state.image,state.crops.player.rect),'fighter')},
    enemyL:{name:'Knife Punk', canvas:buildCutout(cropFromImage(state.image,state.crops.enemyL.rect),'fighter')},
    enemyC:{name:'Bandana Rival', canvas:buildCutout(cropFromImage(state.image,state.crops.enemyC.rect),'fighter')},
    enemyR:{name:'Dock Bruiser', canvas:buildCutout(cropFromImage(state.image,state.crops.enemyR.rect),'fighter')},
    hud:{name:'HUD Strip', canvas:cropFromImage(state.image,state.crops.hud.rect)}
  };
  state.plate=buildCleanPlate(); plateCtx.clearRect(0,0,plateCanvas.width,plateCanvas.height); if(state.plate) plateCtx.drawImage(state.plate,0,0,plateCanvas.width,plateCanvas.height);
  state.world=buildWorld(); worldCtx.clearRect(0,0,worldCanvas.width,worldCanvas.height); if(state.world) worldCtx.drawImage(state.world,0,0,worldCanvas.width,worldCanvas.height);
  state.sheets={
    player:{name:'Alex',canvas:makeSpriteSheet(state.cutouts.player.canvas,'Alex',true)},
    enemyL:{name:'Knife Punk',canvas:makeSpriteSheet(state.cutouts.enemyL.canvas,'Knife',false)},
    enemyC:{name:'Bandana Rival',canvas:makeSpriteSheet(state.cutouts.enemyC.canvas,'Bandana',false)},
    enemyR:{name:'Dock Bruiser',canvas:makeSpriteSheet(state.cutouts.enemyR.canvas,'Bruiser',false)}
  };
  previewAssets(); setStatus('Cutouts','done'); setStatus('Extension','done'); state.built=true; $('#buildSummary').innerHTML=`<b>${state.packet.title||'Untitled build'}</b><br>world width: ${(state.packet.world&&state.packet.world.width)||2600}px<br>target seconds: ${(state.packet.world&&state.packet.world.targetSeconds)||22}<br>genre lock: ${state.packet.genreLock||'fighting'}<br>landmarks: ${(state.packet.landmarks||[]).slice(0,6).join(', ')}`; initGame(); setStatus('Runtime','ready'); }

function initGame(){ if(!state.world || !state.cutouts.player) return; const world=state.world; const hud=state.cutouts.hud.canvas; const groundY=370; const targetSeconds=((state.packet.world&&state.packet.world.targetSeconds)||22);
  const playerFrames=sheetFrames(state.sheets.player.canvas,6); const knifeFrames=sheetFrames(state.sheets.enemyL.canvas,5); const bandFrames=sheetFrames(state.sheets.enemyC.canvas,5); const bruiserFrames=sheetFrames(state.sheets.enemyR.canvas,5);
  const entities=[
    mkEnemy('Knife Punk', 320, groundY, knifeFrames, 70, 0.75),
    mkEnemy('Bandana Rival', 980, groundY, bandFrames, 80, 0.72),
    mkEnemy('Dock Bruiser', 1440, groundY, bruiserFrames, 95, 0.62),
    mkEnemy('Knife Punk 2', 1880, groundY, knifeFrames, 85, 0.70),
    mkEnemy('Bruiser 2', 2220, groundY, bruiserFrames, 110, 0.58)
  ];
  state.game={
    t:0,last:0,running:false,seconds:targetSeconds,cameraX:0,keys:{},
    player:{x:520,y:groundY,vx:0,dir:1,frames:playerFrames,frame:0,health:150,maxHealth:150,lives:3,attacking:0,score:124500},
    entities,worldW:world.width,worldH:world.height,hud,won:false,lost:false
  };
  renderRuntime(0);
}
function sheetFrames(sheet,count){ const fw=Math.floor(sheet.width/count), fh=sheet.height; const frames=[]; for(let i=0;i<count;i++){ const c=createCanvas(fw,fh); c.getContext('2d').drawImage(sheet,i*fw,0,fw,fh,0,0,fw,fh); frames.push(c);} return frames; }
function mkEnemy(name,x,y,frames,health=80,speed=0.7){ return {name,x,y,dir:-1,frames,frame:0,health,maxHealth:health,speed,attackCd:0,hurt:0,alive:true}; }
function drawEntity(ctx,e,cx){ if(!e.alive&&e.health<=0) return; const frame=e.frames[(Math.floor(e.frame))%e.frames.length]; const drawX=Math.floor(e.x-cx-frame.width/2), drawY=Math.floor(e.y-frame.height+16); ctx.drawImage(frame,drawX,drawY); if(e.hurt>0){ ctx.fillStyle='rgba(255,236,120,0.28)'; ctx.fillRect(drawX,drawY,frame.width,frame.height);} }
function drawBar(ctx,x,y,w,h,val,max,c1,c2){ ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(x,y,w,h); ctx.fillStyle=c1; ctx.fillRect(x+2,y+2,(w-4)*(val/max),h-4); ctx.strokeStyle=c2; ctx.strokeRect(x+1,y+1,w-2,h-2); }
function startGame(){ if(!state.game) initGame(); if(state.game.running) return; state.game.running=true; state.game.last=performance.now(); requestAnimationFrame(loop); }
function resetGame(){ if(state.game){ initGame(); }}
function loop(ts){ const g=state.game; if(!g||!g.running) return; const dt=Math.min(33,ts-g.last)/1000; g.last=ts; updateGame(dt); renderRuntime(dt); if(g.running) requestAnimationFrame(loop); }
function updateGame(dt){ const g=state.game,p=g.player; g.seconds=Math.max(0,g.seconds-dt); if(g.seconds<=0) g.won=true; if(g.won||g.lost){ g.running=false; return; }
  const k=g.keys; let mv=0; if(k['ArrowLeft']||k['a']||k['A']) mv=-1; if(k['ArrowRight']||k['d']||k['D']) mv=1; p.vx=mv*180; p.x=clamp(p.x+p.vx*dt,60,g.worldW-60); if(mv!==0) p.dir=mv; p.frame += Math.abs(p.vx)>0?dt*7:dt*3.5; if(p.attacking>0) p.attacking-=dt;
  // slow health depletion to extend tension
  p.health=Math.max(0,p.health-dt*1.2);
  g.entities.forEach(e=>{ if(e.health<=0){ e.alive=false; return; } const dist=p.x-e.x; if(Math.abs(dist)>76){ e.x += Math.sign(dist)*e.speed*65*dt; e.frame+=dt*4.3; e.dir=Math.sign(dist)||-1; } else { e.frame+=dt*2.2; if(e.attackCd<=0){ p.health=Math.max(0,p.health-(e.speed>0.68?6:4)*dt*10); e.attackCd=0.9+Math.random()*0.5; } }
      e.attackCd=Math.max(0,e.attackCd-dt); e.hurt=Math.max(0,e.hurt-dt);
  });
  // attack
  if((k[' ']||k['Spacebar']||k['Space']) && p.attacking<=0){ p.attacking=0.34; g.entities.forEach(e=>{ if(!e.alive) return; const dx=e.x-p.x; if(Math.sign(dx)===p.dir && Math.abs(dx)<110){ e.health=Math.max(0,e.health-30); e.hurt=0.22; if(e.health<=0){ p.score+=2500; } } }); }
  // clean defeated
  g.entities=g.entities.filter(e=>e.health>0 || e.hurt>0);
  if(p.health<=0){ g.lost=true; g.running=false; }
  if(g.entities.length===0){ g.won=true; g.running=false; }
  g.cameraX=clamp(p.x-runtimeCanvas.width/2,0,g.worldW-runtimeCanvas.width);
}
function renderRuntime(){ const g=state.game; runtimeCtx.clearRect(0,0,runtimeCanvas.width,runtimeCanvas.height); runtimeCtx.fillStyle='#09111b'; runtimeCtx.fillRect(0,0,runtimeCanvas.width,runtimeCanvas.height);
  if(!g||!state.world){ runtimeCtx.fillStyle='#fff'; runtimeCtx.font='24px Arial'; runtimeCtx.fillText('Run Golden Path to build the runtime.',40,80); return; }
  // world
  runtimeCtx.drawImage(state.world, g.cameraX,0, runtimeCanvas.width,state.world.height, 0,80,runtimeCanvas.width, runtimeCanvas.height-80);
  // fighters
  drawEntity(runtimeCtx,g.player,g.cameraX); g.entities.forEach(e=>drawEntity(runtimeCtx,e,g.cameraX));
  // player hitflash/attack marker
  if(g.player.attacking>0){ runtimeCtx.strokeStyle='rgba(255,216,68,0.95)'; runtimeCtx.lineWidth=4; const px=g.player.x-g.cameraX+(g.player.dir>0?42:-42); runtimeCtx.beginPath(); runtimeCtx.arc(px, g.player.y-55, 28, -0.8, 0.8); runtimeCtx.stroke(); }
  // HUD
  if(g.hud){ runtimeCtx.drawImage(g.hud,18,10, runtimeCanvas.width-36, 60); }
  runtimeCtx.fillStyle='rgba(0,0,0,0.55)'; runtimeCtx.fillRect(0,0,runtimeCanvas.width,80);
  runtimeCtx.fillStyle='#f0f4ff'; runtimeCtx.font='bold 26px Arial'; runtimeCtx.fillText('ALEX',110,34); runtimeCtx.fillStyle='#f7c542'; runtimeCtx.fillText(String(g.player.score),245,34); runtimeCtx.fillStyle='#f0f4ff'; runtimeCtx.fillText('x'+g.player.lives,445,34); runtimeCtx.fillText('TIME',565,34); runtimeCtx.fillStyle='#f7a71e'; runtimeCtx.font='bold 58px Arial'; runtimeCtx.fillText(String(Math.ceil(g.seconds)).padStart(2,'0'),615,56); runtimeCtx.fillStyle='#d8e3ff'; runtimeCtx.font='bold 34px Arial'; runtimeCtx.fillText('PRESS START',845,38);
  drawBar(runtimeCtx,110,48,220,14,g.player.health,g.player.maxHealth,'#f4d241','#245abf'); drawBar(runtimeCtx,110,66,180,11,g.player.health*0.6,g.player.maxHealth,'#3aa2ff','#8bd1ff');
  // enemy bars bottom
  const e1=g.entities[0], e2=g.entities[1]||g.entities[g.entities.length-1]; runtimeCtx.fillStyle='rgba(0,0,0,0.65)'; runtimeCtx.fillRect(0,runtimeCanvas.height-42,runtimeCanvas.width,42);
  if(e1){ runtimeCtx.fillStyle='#fff'; runtimeCtx.font='bold 22px Arial'; runtimeCtx.fillText(e1.name.toUpperCase().replace(' PUNK','').replace(' RIVAL',''),70,runtimeCanvas.height-12); drawBar(runtimeCtx,190,runtimeCanvas.height-29,240,16,e1.health,e1.maxHealth,'#ff3030','#f7e27b'); }
  runtimeCtx.fillStyle='#fff'; runtimeCtx.fillText('STAGE 3-1', runtimeCanvas.width/2-70, runtimeCanvas.height-12);
  if(e2){ runtimeCtx.fillText(e2.name.toUpperCase().replace(' RIVAL',''),runtimeCanvas.width-350,runtimeCanvas.height-12); drawBar(runtimeCtx,runtimeCanvas.width-250,runtimeCanvas.height-29,220,16,e2.health,e2.maxHealth,'#ff3030','#f7e27b'); }
  if(g.won||g.lost){ runtimeCtx.fillStyle='rgba(0,0,0,0.45)'; runtimeCtx.fillRect(0,80,runtimeCanvas.width,runtimeCanvas.height-80); runtimeCtx.fillStyle='#fff'; runtimeCtx.font='bold 72px Arial'; runtimeCtx.textAlign='center'; runtimeCtx.fillText(g.won?'YOU WIN':'YOU LOSE', runtimeCanvas.width/2, runtimeCanvas.height/2); runtimeCtx.font='bold 28px Arial'; runtimeCtx.fillText('Press R to reset', runtimeCanvas.width/2, runtimeCanvas.height/2+42); runtimeCtx.textAlign='left'; }
}

$('#fileInput').addEventListener('change',e=>{ const f=e.target.files[0]; if(f) handleFile(f); });
$('#useSampleBtn').addEventListener('click',useSample);
$('#runBtn').addEventListener('click',runGoldenPath);
$('#playBtn').addEventListener('click',startGame);
$('#resetBtn').addEventListener('click',resetGame);
window.addEventListener('keydown',e=>{ if(state.game){ state.game.keys[e.key]=true; if(e.key==='r'||e.key==='R') resetGame(); if(e.key===' ') e.preventDefault(); }});
window.addEventListener('keyup',e=>{ if(state.game) state.game.keys[e.key]=false; });
loadDefaults();
useSample().then(()=>{ setStatus('Reference','sample ready'); renderRuntime(); }).catch(err=>{ console.error(err); setStatus('Reference','sample image failed'); });
})();
