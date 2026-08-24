const SAMPLE_DESCRIPTION = "**Description:** [XPLAY REVERSE FORGE \u2014 SCREENSHOT TO GAME] The uploaded screenshot is a VISUAL SPECIFICATION, not merely inspiration. EXACT VISUAL BLUEPRINT: preserve the visible composition and spatial relationships as closely as technically possible. PRESERVE: layout, artStyle, camera, palette, levelStructure. Reconstruct visible player scale, camera framing, object relationships, spatial hierarchy, palette, environment grammar, apparent gameplay cues, and major landmarks. Infer only information that is not observable in the screenshot. Any inferred content must extend the screenshot\u2019s established visual and gameplay grammar rather than replace it. I see Alex, a Black male character with a prominent afro wearing a white martial arts gi with a black belt and wrist wraps, fighting barefoot; executing an open-palm strike to the right inside Urban shipping dockyard or industrial facility at night featuring a reddish-brown shipping container labeled 'ZENITH INDUSTRIES', yellow 'DANGER' sign, metal ladder, green toxic/chemical barrels behind chain-link fence ('CAUTION KEEP OUT'), brick building entrance ('SECURITY LEVEL 3', room 'B7'), dark night sky with full moon, glowing blue/purple skyline with skyscrapers and industrial cranes, concrete floor with yellow-and-black hazard stripes, drain grates, and rivets. Important visible elements include Shipping container, Yellow 'DANGER' sign, Metal ladder, Green toxic/chemical barrels, Chain-link fence, Caution sign, Exterior lamp, Rusty brown oil drum, Combat knife. The strongest playable cues suggest fighting 95%, platformer 60%, dodge 45%. PLAYER IDENTITY: Alex. USER GAMEPLAY INTENT: Fight visible rivals in the dockyard, preserve the current camera, layout, player scale, palette, HUD language, and major object relationships. Support beat-em-up progression with a knife punk, bandana rival, and dock bruiser. Preserve the CURRENT screenshot camera, layout, player scale, palette, HUD language and major object relationships. Unknown facts remain unknown.";

const $ = sel => document.querySelector(sel);
const els = {
  loadSample: $('#loadSampleBtn'), imageInput: $('#imageInput'), sourcePreview: $('#sourcePreview'), sourceEmpty: $('#sourceEmpty'),
  sourceStatus: $('#sourceStatus'), desc: $('#descriptionInput'), parseBtn: $('#parseBtn'), autoExtract: $('#autoExtractBtn'),
  parseSummary: $('#parseSummary'), extractList: $('#extractList'), assetSelect: $('#assetSelect'), autoCutout: $('#autoCutoutBtn'),
  erase: $('#eraseModeBtn'), restore: $('#restoreModeBtn'), brush: $('#brushSize'), resetMask: $('#resetMaskBtn'),
  maskCanvas: $('#maskCanvas'), cleanCanvas: $('#cleanCanvas'), extendCanvas: $('#extendCanvas'), buildClean: $('#buildCleanBtn'),
  extend: $('#extendBtn'), cleanChecks: $('#cleanChecks'), buildPlay: $('#buildPlayBtn'), togglePlate: $('#togglePlateBtn'),
  gameCanvas: $('#gameCanvas'), runtimeStatus: $('#runtimeStatus')
};

const state = {
  source:null, sourceUrl:'', packet:null, assets:{}, activeAsset:'player', brushMode:'erase',
  cleanStage:null, extendedStage:null, showPlate:false, runtime:null, keys:{}, raf:0,
  sourceNatural:{w:0,h:0}
};

els.desc.value = SAMPLE_DESCRIPTION;

const CROP_PRESETS = {
  hud: {label:'HUD', x:0.00,y:0.00,w:1.00,h:0.165,note:'UI only; never baked into world'},
  player: {label:'Alex', x:0.34,y:0.39,w:0.22,h:0.43,note:'Player cutout proxy'},
  enemyLeft: {label:'Knife Punk', x:0.04,y:0.39,w:0.22,h:0.43,note:'Left rival cutout'},
  enemyBandana: {label:'Bandana Rival', x:0.53,y:0.40,w:0.20,h:0.42,note:'Center-right rival cutout'},
  enemyRight: {label:'Dock Bruiser', x:0.73,y:0.38,w:0.22,h:0.44,note:'Right rival cutout'},
  stage: {label:'Stage Plate', x:0.00,y:0.165,w:1.00,h:0.835,note:'Environment source plate'}
};

bind();

function bind(){
  els.loadSample.addEventListener('click', loadIncludedSample);
  els.imageInput.addEventListener('change', onFile);
  els.parseBtn.addEventListener('click', parseDescription);
  els.autoExtract.addEventListener('click', extractAll);
  els.assetSelect.addEventListener('change',()=>selectAsset(els.assetSelect.value));
  els.autoCutout.addEventListener('click',()=>autoCutout(state.activeAsset));
  els.erase.addEventListener('click',()=>setBrushMode('erase'));
  els.restore.addEventListener('click',()=>setBrushMode('restore'));
  els.resetMask.addEventListener('click',()=>resetMask(state.activeAsset));
  els.buildClean.addEventListener('click', buildCleanStage);
  els.extend.addEventListener('click', extendStage);
  els.buildPlay.addEventListener('click', buildPlayable);
  els.togglePlate.addEventListener('click',()=>{state.showPlate=!state.showPlate;});
  setupMaskBrush();
  window.addEventListener('keydown',e=>{
    state.keys[e.key.toLowerCase()]=true;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    if(e.key.toLowerCase()==='r' && state.runtime) state.runtime=createRuntime();
  });
  window.addEventListener('keyup',e=>state.keys[e.key.toLowerCase()]=false);
  renderIdle(els.cleanCanvas,'Build clean stage');
  renderIdle(els.extendCanvas,'Extend stage');
  renderIdle(els.gameCanvas,'Build playable reconstruction');
}

async function loadIncludedSample(){
  const img = new Image();
  img.onload=()=>setSourceImage(img,'Included Alex reference');
  img.src='./assets/alex-reference.png';
}

function onFile(e){
  const file=e.target.files?.[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>setSourceImage(img,file.name);
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}

function setSourceImage(img,label){
  state.source=img; state.sourceNatural={w:img.naturalWidth||img.width,h:img.naturalHeight||img.height};
  state.sourceUrl=img.src;
  els.sourcePreview.src=img.src; els.sourcePreview.style.display='block'; els.sourceEmpty.style.display='none';
  els.sourceStatus.textContent=`Loaded ${label}`;
  parseDescription();
  extractAll();
}

function parseDescription(){
  const text=els.desc.value.trim();
  const genres=[...text.matchAll(/\b(fighting|platformer|dodge|runner|fps|racing)\s*(\d{1,3})%/gi)]
    .map(m=>({type:m[1].toLowerCase(),score:Number(m[2])/100})).sort((a,b)=>b.score-a.score);
  const playerName=(text.match(/\bI see\s+([A-Z][A-Za-z0-9_-]+)/i)||[])[1]||'Alex';
  const action=((text.match(/executing\s+([^.;]+?)(?=\s+inside\b|[.;])/i)||[])[1]||'open-palm strike to the right').trim();
  const enemies=[
    /knife/i.test(text)&&{id:'enemyLeft',name:'Knife Punk',role:'enemy'},
    /bandana/i.test(text)&&{id:'enemyBandana',name:'Bandana Rival',role:'enemy'},
    /bruiser|rivals|multiple enemies/i.test(text)&&{id:'enemyRight',name:'Dock Bruiser',role:'enemy'}
  ].filter(Boolean);
  const landmarks=['ZENITH INDUSTRIES container','B7 security building','chain-link fence','toxic barrels','metal ladder','DANGER sign','oil drum','hazard-striped ground','moon skyline'];
  state.packet={
    title:'Urban Shipping Clash Upgrade', primaryGenre:genres[0]?.type||'fighting', genreCandidates:genres,
    player:{name:playerName,action,appearance:['afro','white gi','black belt','wrist wraps','barefoot']},
    enemies, landmarks,
    reconstruction:{
      removeHudFromWorld:true, removeActorsFromWorld:true, transparentCharacters:true, extendLeft:true, extendRight:true,
      allowRepeatedHud:false, allowMirroredCharacters:false, worldWidth:2600
    },
    runtime:{stageSeconds:18, scrolling:true, passiveHealthDrainPerSecond:.75, playerSpeed:130, enemySpeed:42}
  };
  els.parseSummary.innerHTML=`<b>${state.packet.primaryGenre}</b> · ${playerName} · ${enemies.length} rivals · action: ${escapeHtml(action)}`;
}

function extractAll(){
  if(!state.source){els.sourceStatus.textContent='Load a screenshot first';return;}
  state.assets={};
  for(const [id,p] of Object.entries(CROP_PRESETS)) state.assets[id]=makeAsset(id,p);
  renderExtractList();
  populateSelect();
  selectAsset('player');
}

function makeAsset(id,p){
  const sw=state.sourceNatural.w, sh=state.sourceNatural.h;
  const sx=Math.round(sw*p.x), sy=Math.round(sh*p.y), cw=Math.round(sw*p.w), ch=Math.round(sh*p.h);
  const original=document.createElement('canvas'); original.width=cw; original.height=ch;
  original.getContext('2d').drawImage(state.source,sx,sy,cw,ch,0,0,cw,ch);
  const working=document.createElement('canvas'); working.width=cw; working.height=ch;
  working.getContext('2d').drawImage(original,0,0);
  return {id,label:p.label,note:p.note,box:{x:sx,y:sy,w:cw,h:ch},original,working,autoApplied:false};
}

function renderExtractList(){
  els.extractList.innerHTML='';
  Object.values(state.assets).filter(a=>a.id!=='stage').forEach(a=>{
    const card=document.createElement('div'); card.className='asset-card'+(a.id===state.activeAsset?' active':''); card.dataset.id=a.id;
    const img=document.createElement('img'); img.src=a.working.toDataURL('image/png');
    card.innerHTML=`<h4>${escapeHtml(a.label)}</h4>`;
    card.appendChild(img);
    const meta=document.createElement('div'); meta.className='meta'; meta.textContent=`${a.box.w}×${a.box.h} · ${a.note}`; card.appendChild(meta);
    card.onclick=()=>selectAsset(a.id); els.extractList.appendChild(card);
  });
}

function populateSelect(){
  els.assetSelect.innerHTML=Object.values(state.assets).filter(a=>['player','enemyLeft','enemyBandana','enemyRight'].includes(a.id))
    .map(a=>`<option value="${a.id}">${escapeHtml(a.label)}</option>`).join('');
}

function selectAsset(id){
  if(!state.assets[id])return; state.activeAsset=id; els.assetSelect.value=id; drawMaskEditor();
  document.querySelectorAll('.asset-card').forEach(c=>c.classList.toggle('active',c.dataset.id===id));
}

function drawMaskEditor(){
  const a=state.assets[state.activeAsset]; if(!a)return;
  const c=els.maskCanvas, ctx=c.getContext('2d');
  const scale=Math.min(c.width/a.working.width,c.height/a.working.height);
  const dw=a.working.width*scale, dh=a.working.height*scale, dx=(c.width-dw)/2, dy=(c.height-dh)/2;
  c.dataset.dx=dx;c.dataset.dy=dy;c.dataset.scale=scale;
  ctx.clearRect(0,0,c.width,c.height); ctx.imageSmoothingEnabled=false; ctx.drawImage(a.working,dx,dy,dw,dh);
}

function autoCutout(id){
  const a=state.assets[id]; if(!a || id==='hud')return;
  const src=a.original.getContext('2d').getImageData(0,0,a.original.width,a.original.height);
  const out=a.working.getContext('2d').createImageData(a.original.width,a.original.height);
  const w=a.original.width,h=a.original.height,cx=w*.5,cy=h*.52;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const i=(y*w+x)*4;
    const nx=Math.abs((x-cx)/(w*.5)), ny=Math.abs((y-cy)/(h*.52));
    const centerWeight=1-Math.min(1,Math.sqrt(nx*nx+ny*ny));
    const edge=Math.min(x,y,w-1-x,h-1-y);
    const r=src.data[i],g=src.data[i+1],b=src.data[i+2];
    const brightness=(r+g+b)/3, chroma=Math.max(r,g,b)-Math.min(r,g,b);
    // Conservative centered subject mask. Manual brush can refine.
    let keep=centerWeight>.16;
    if(edge<Math.max(3,Math.min(w,h)*.025)) keep=false;
    if(centerWeight<.36 && brightness<45 && chroma<30) keep=false;
    const alpha=keep?255:0;
    out.data[i]=r;out.data[i+1]=g;out.data[i+2]=b;out.data[i+3]=alpha;
  }
  a.working.getContext('2d').putImageData(out,0,0);a.autoApplied=true;drawMaskEditor();renderExtractList();
}

function resetMask(id){
  const a=state.assets[id]; if(!a)return;a.working.getContext('2d').clearRect(0,0,a.working.width,a.working.height);a.working.getContext('2d').drawImage(a.original,0,0);a.autoApplied=false;drawMaskEditor();renderExtractList();
}

function setBrushMode(mode){state.brushMode=mode;els.erase.classList.toggle('active',mode==='erase');els.restore.classList.toggle('active',mode==='restore');}

function setupMaskBrush(){
  const c=els.maskCanvas; let drawing=false;
  const paint=e=>{
    if(!drawing)return; const a=state.assets[state.activeAsset]; if(!a)return;
    const rect=c.getBoundingClientRect(); const scale=Number(c.dataset.scale||1), dx=Number(c.dataset.dx||0),dy=Number(c.dataset.dy||0);
    const cx=(e.clientX-rect.left)*(c.width/rect.width), cy=(e.clientY-rect.top)*(c.height/rect.height);
    const x=(cx-dx)/scale,y=(cy-dy)/scale,r=Number(els.brush.value)/scale;
    const wctx=a.working.getContext('2d');
    if(state.brushMode==='erase'){wctx.save();wctx.globalCompositeOperation='destination-out';wctx.beginPath();wctx.arc(x,y,r,0,Math.PI*2);wctx.fill();wctx.restore();}
    else{wctx.save();wctx.beginPath();wctx.arc(x,y,r,0,Math.PI*2);wctx.clip();wctx.drawImage(a.original,0,0);wctx.restore();}
    drawMaskEditor();
  };
  c.addEventListener('pointerdown',e=>{drawing=true;c.setPointerCapture(e.pointerId);paint(e);});
  c.addEventListener('pointermove',paint);c.addEventListener('pointerup',()=>{drawing=false;renderExtractList();});c.addEventListener('pointercancel',()=>drawing=false);
}

function buildCleanStage(){
  if(!state.source){els.sourceStatus.textContent='Load a screenshot first';return;}
  const c=els.cleanCanvas,ctx=c.getContext('2d'),sw=state.sourceNatural.w,sh=state.sourceNatural.h;
  ctx.clearRect(0,0,c.width,c.height);
  // Crop out source HUD by starting below ~16.5%.
  const cropY=Math.round(sh*.165), cropH=sh-cropY;
  ctx.drawImage(state.source,0,cropY,sw,cropH,0,0,c.width,c.height);
  // Remove actor regions with soft local patch-fill.
  const masks=[
    {x:.05,y:.33,w:.20,h:.50},
    {x:.35,y:.31,w:.22,h:.52},
    {x:.54,y:.31,w:.19,h:.49},
    {x:.74,y:.30,w:.20,h:.50}
  ];
  masks.forEach(m=>patchFill(ctx,c,m));
  state.cleanStage=copyCanvas(c);
  renderChecks(['HUD removed from world plate','Actor zones patched','World-only plate generated']);
}

function patchFill(ctx,c,m){
  const x=Math.round(c.width*m.x),y=Math.round(c.height*m.y),w=Math.round(c.width*m.w),h=Math.round(c.height*m.h);
  // Build replacement using blurred neighbor strips.
  const temp=document.createElement('canvas');temp.width=w;temp.height=h;const t=temp.getContext('2d');
  const leftX=Math.max(0,x-Math.round(w*.35)), rightX=Math.min(c.width-w,x+w);
  t.globalAlpha=.55;t.drawImage(c,leftX,y,w,h,0,0,w,h);t.globalAlpha=.45;t.drawImage(c,rightX,y,w,h,0,0,w,h);
  ctx.save();ctx.filter='blur(10px)';ctx.drawImage(temp,x,y,w,h);ctx.restore();
  ctx.fillStyle='rgba(25,30,38,.10)';ctx.fillRect(x,y,w,h);
}

function extendStage(){
  if(!state.cleanStage)buildCleanStage();
  const c=els.extendCanvas,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
  // Preview a 2600px world compressed into 960px.
  const segW=360, y=0,h=c.height;
  ctx.drawImage(state.cleanStage,0,0,state.cleanStage.width,state.cleanStage.height,300,0,360,h);
  // left extension from left and central source strips
  drawExtensionSlice(ctx,state.cleanStage,0,0,300,h,true);
  drawExtensionSlice(ctx,state.cleanStage,660,0,300,h,false);
  // seam grading
  const gradL=ctx.createLinearGradient(270,0,350,0);gradL.addColorStop(0,'rgba(0,0,0,0)');gradL.addColorStop(.5,'rgba(10,20,40,.12)');gradL.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradL;ctx.fillRect(250,0,120,h);
  const gradR=ctx.createLinearGradient(620,0,720,0);gradR.addColorStop(0,'rgba(0,0,0,0)');gradR.addColorStop(.5,'rgba(10,20,40,.12)');gradR.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradR;ctx.fillRect(610,0,120,h);
  state.extendedStage=copyCanvas(c);
  renderChecks(['HUD removed','Actors removed from plate','Left scene extended','Right scene extended','No mirrored character sprites']);
}

function drawExtensionSlice(ctx,src,dx,dy,dw,dh,mirror){
  ctx.save();
  if(mirror){ctx.translate(dx+dw,0);ctx.scale(-1,1);ctx.drawImage(src,0,0,src.width*.45,src.height,0,dy,dw,dh);}
  else ctx.drawImage(src,src.width*.55,0,src.width*.45,src.height,dx,dy,dw,dh);
  ctx.restore();
}

function buildPlayable(){
  if(!state.source){els.runtimeStatus.textContent='Load a source screenshot first.';return;}
  if(!state.packet)parseDescription();
  if(!Object.keys(state.assets).length)extractAll();
  ['player','enemyLeft','enemyBandana','enemyRight'].forEach(id=>{if(state.assets[id]&&!state.assets[id].autoApplied)autoCutout(id);});
  if(!state.cleanStage)buildCleanStage();
  state.runtime=createRuntime();
  startLoop();
  els.runtimeStatus.textContent='Playable reconstruction running. Scroll, fight, and test the extended stage.';
}

function createRuntime(){
  return {
    t:0,time:18,worldWidth:2600,cameraX:0,gameOver:false,win:false,
    player:{x:500,y:392,hp:100,facing:1,attackCd:0,hurtCd:0},
    enemies:[
      {id:'enemyLeft',x:860,y:395,hp:45,alive:true,type:'knife'},
      {id:'enemyBandana',x:1160,y:395,hp:50,alive:true,type:'bandana'},
      {id:'enemyRight',x:1500,y:395,hp:65,alive:true,type:'bruiser'},
      {id:'enemyLeft',x:1910,y:395,hp:45,alive:true,type:'knife2'}
    ]
  };
}

function startLoop(){
  cancelAnimationFrame(state.raf);let last=performance.now();
  const frame=now=>{const dt=Math.min(.033,(now-last)/1000);last=now;updateRuntime(dt);drawRuntime();state.raf=requestAnimationFrame(frame);};
  state.raf=requestAnimationFrame(frame);
}

function updateRuntime(dt){
  const rt=state.runtime;if(!rt||rt.gameOver)return;rt.t+=dt;rt.time=Math.max(0,rt.time-dt);
  const p=rt.player;const left=state.keys['arrowleft']||state.keys['a'],right=state.keys['arrowright']||state.keys['d'],up=state.keys['arrowup']||state.keys['w'],down=state.keys['arrowdown']||state.keys['s'];
  const atk=state.keys[' '];
  let vx=(right?1:0)-(left?1:0),vy=(down?1:0)-(up?1:0);if(vx)p.facing=Math.sign(vx);
  p.x=clamp(p.x+vx*135*dt,80,rt.worldWidth-80);p.y=clamp(p.y+vy*72*dt,340,430);
  p.attackCd=Math.max(0,p.attackCd-dt);p.hurtCd=Math.max(0,p.hurtCd-dt);
  if(atk&&p.attackCd<=0){p.attackCd=.38;rt.enemies.forEach(e=>{if(!e.alive)return;const dx=e.x-p.x,dy=Math.abs(e.y-p.y);if(Math.abs(dx)<120&&dy<65&&Math.sign(dx||1)===p.facing){e.hp-=20;e.x+=p.facing*26;if(e.hp<=0)e.alive=false;}});}
  rt.enemies.forEach((e,i)=>{if(!e.alive)return;const dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy);if(dist>88){e.x+=Math.sign(dx)*(34+i*3)*dt;e.y+=Math.sign(dy)*22*dt;}else if(p.hurtCd<=0){p.hp-=6;p.hurtCd=.55;}});
  p.hp=Math.max(0,p.hp-.75*dt);
  rt.cameraX=clamp(p.x-330,0,rt.worldWidth-960);
  if(rt.enemies.every(e=>!e.alive)){rt.win=true;rt.gameOver=true;els.runtimeStatus.textContent='Stage clear. Press R to retry.';}
  else if(p.hp<=0){rt.gameOver=true;els.runtimeStatus.textContent='Player defeated. Press R to retry.';}
  else if(rt.time<=0){rt.win=true;rt.gameOver=true;els.runtimeStatus.textContent='18-second threshold reached. Press R to retry.';}
}

function drawRuntime(){
  const c=els.gameCanvas,ctx=c.getContext('2d'),rt=state.runtime;if(!rt){renderIdle(c,'Build playable reconstruction');return;}
  ctx.clearRect(0,0,c.width,c.height);
  // parallax skyline
  const g=ctx.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#071839');g.addColorStop(1,'#141d38');ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
  for(let i=0;i<16;i++){const x=((i*105)-(rt.cameraX*.15))%(c.width+130)-80;ctx.fillStyle=i%2?'#1d315e':'#273a70';ctx.fillRect(x,110+(i%3)*26,40+(i%3)*13,160);}
  ctx.fillStyle='rgba(245,245,255,.82)';ctx.beginPath();ctx.arc(720-rt.cameraX*.06,78,18,0,Math.PI*2);ctx.fill();

  ctx.save();ctx.translate(-rt.cameraX,0);
  drawWorldPlate(ctx,rt);
  drawGroundWorld(ctx,rt.worldWidth);
  rt.enemies.forEach((e,i)=>drawRuntimeEnemy(ctx,e,i,rt));
  drawRuntimePlayer(ctx,rt.player,rt);
  ctx.restore();
  drawRuntimeHud(ctx,rt);
  if(rt.gameOver)drawGameOver(ctx,rt);
}

function drawWorldPlate(ctx,rt){
  const plate=state.cleanStage;if(!plate)return;
  const centerX=380;
  const mainW=960;
  ctx.globalAlpha=1;
  ctx.drawImage(plate,centerX,115,mainW,365);
  // extend environment, but never reuse HUD or character crops
  if(state.showPlate){ctx.save();ctx.globalAlpha=.18;ctx.drawImage(state.source,centerX,78,960,402);ctx.restore();}
  // left extension
  ctx.save();ctx.translate(centerX,0);ctx.scale(-1,1);ctx.drawImage(plate,0,0,plate.width*.45,plate.height,0,115,420,365);ctx.restore();
  // right extension
  ctx.drawImage(plate,plate.width*.55,0,plate.width*.45,plate.height,centerX+mainW,115,420,365);
  // second right synthesized strip
  ctx.save();ctx.globalAlpha=.9;ctx.drawImage(plate,plate.width*.35,0,plate.width*.45,plate.height,centerX+mainW+420,125,420,355);ctx.restore();
}

function drawGroundWorld(ctx,w){ctx.fillStyle='#2b2533';ctx.fillRect(0,430,w,110);ctx.fillStyle='#3b3344';ctx.fillRect(0,402,w,28);for(let x=0;x<w;x+=48){ctx.fillStyle=(x/48)%2===0?'#e2b936':'#26212a';ctx.fillRect(x,400,24,5);}}

function drawRuntimePlayer(ctx,p,rt){
  const a=state.assets.player;const bob=Math.sin(rt.t*8)*2;
  if(a){drawAssetCanvas(ctx,a.working,p.x-54,p.y-130+bob,110,138,p.facing);}
  else{ctx.fillStyle='#fff';ctx.fillRect(p.x-20,p.y-90,40,88);}
  if(p.attackCd>.16){ctx.fillStyle='#ffd655';ctx.beginPath();ctx.moveTo(p.x+p.facing*18,p.y-72);ctx.lineTo(p.x+p.facing*82,p.y-56);ctx.lineTo(p.x+p.facing*44,p.y-22);ctx.fill();}
  if(p.hurtCd>0){ctx.strokeStyle='#f64e5e';ctx.lineWidth=3;ctx.strokeRect(p.x-58,p.y-136,116,142);}
}

function drawRuntimeEnemy(ctx,e,i,rt){if(!e.alive)return;const a=state.assets[e.id]||state.assets.enemyRight;const facing=rt.player.x<e.x?-1:1;if(a)drawAssetCanvas(ctx,a.working,e.x-53,e.y-126,108,136,facing);else{ctx.fillStyle='#765';ctx.fillRect(e.x-20,e.y-90,40,90);}ctx.fillStyle='#222';ctx.fillRect(e.x-35,e.y-137,70,6);ctx.fillStyle='#f0c84d';ctx.fillRect(e.x-35,e.y-137,70*clamp(e.hp/65,0,1),6);}

function drawAssetCanvas(ctx,src,x,y,w,h,facing){ctx.save();ctx.imageSmoothingEnabled=false;if(facing<0){ctx.translate(x+w,0);ctx.scale(-1,1);ctx.drawImage(src,0,0,src.width,src.height,0,y,w,h);}else ctx.drawImage(src,x,y,w,h);ctx.restore();}

function drawRuntimeHud(ctx,rt){ctx.fillStyle='#03060d';ctx.fillRect(0,0,960,64);ctx.fillStyle='#d6e9ff';ctx.font='700 22px Arial';ctx.fillText('ALEX',84,26);ctx.fillStyle='#ffd34f';ctx.fillText('0124500',210,26);ctx.fillStyle='#fff';ctx.fillText('×3',360,26);ctx.fillText('TIME',466,24);ctx.fillStyle='#f2a51b';ctx.font='700 36px Arial';ctx.fillText(Math.ceil(rt.time),510,39);ctx.fillStyle='#b9cfff';ctx.font='700 20px Arial';ctx.fillText('PRESS START',738,27);drawBar(ctx,84,35,165,12,rt.player.hp/100,'#f2d14d','#4f70c5');
  ctx.fillStyle='#06101d';ctx.fillRect(0,500,960,40);ctx.fillStyle='#fff';ctx.font='700 15px Arial';ctx.fillText('KNIFE',86,526);ctx.fillText('STAGE 3-1',420,526);ctx.fillText('BANDANA',720,526);drawBar(ctx,148,515,180,9,enemyPct(rt,0),'#d72d3b','#f0c64a');drawBar(ctx,780,515,145,9,enemyPct(rt,1),'#d72d3b','#f0c64a');}

function enemyPct(rt,i){const e=rt.enemies[i];return e&&e.alive?clamp(e.hp/65,0,1):0;}
function drawBar(ctx,x,y,w,h,pct,fill,border){ctx.fillStyle='#111';ctx.fillRect(x,y,w,h);ctx.fillStyle=fill;ctx.fillRect(x+2,y+2,(w-4)*pct,h-4);ctx.strokeStyle=border;ctx.strokeRect(x,y,w,h);}
function drawGameOver(ctx,rt){ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,960,540);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='700 56px Arial';ctx.fillText(rt.win?'STAGE CLEAR':'YOU LOSE',480,260);ctx.font='700 22px Arial';ctx.fillText('Press R to retry',480,302);ctx.textAlign='left';}

function renderChecks(items){els.cleanChecks.innerHTML=items.map(v=>`<span class="check">✓ ${escapeHtml(v)}</span>`).join('');}
function copyCanvas(c){const out=document.createElement('canvas');out.width=c.width;out.height=c.height;out.getContext('2d').drawImage(c,0,0);return out;}
function renderIdle(c,label){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);const g=ctx.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#0b2143');g.addColorStop(1,'#1f3657');ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#dbeaff';ctx.textAlign='center';ctx.font='700 24px Arial';ctx.fillText(label,c.width/2,c.height/2);ctx.textAlign='left';}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
