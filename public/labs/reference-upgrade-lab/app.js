const SAMPLE = `**Description:** [XPLAY REVERSE FORGE — SCREENSHOT TO GAME] The uploaded screenshot is a VISUAL SPECIFICATION, not merely inspiration. EXACT VISUAL BLUEPRINT: preserve the visible composition and spatial relationships as closely as technically possible. PRESERVE: layout, artStyle, camera, palette, levelStructure. Reconstruct visible player scale, camera framing, object relationships, spatial hierarchy, palette, environment grammar, apparent gameplay cues, and major landmarks. Infer only information that is not observable in the screenshot. Any inferred content must extend the screenshot’s established visual and gameplay grammar rather than replace it. I see Alex, a Black male character with a prominent afro wearing a white martial arts gi with a black belt and wrist wraps, fighting barefoot; executing an open-palm strike to the right inside Urban shipping dockyard or industrial facility at night featuring a reddish-brown shipping container labeled 'ZENITH INDUSTRIES', yellow 'DANGER' sign, metal ladder, green toxic/chemical barrels behind chain-link fence ('CAUTION KEEP OUT'), brick building entrance ('SECURITY LEVEL 3', room 'B7'), dark night sky with full moon, glowing blue/purple skyline with skyscrapers and industrial cranes, concrete floor with yellow-and-black hazard stripes, drain grates, and rivets. Important visible elements include Shipping container, Yellow 'DANGER' sign, Metal ladder, Green toxic/chemical barrels, Chain-link fence, Caution sign, Exterior lamp, Rusty brown oil drum, Combat knife. The strongest playable cues suggest fighting 95%, platformer 60%, dodge 45%. I will treat the screenshot as a visual specification and preserve its visible composition unless you tell me otherwise. PLAYER IDENTITY: source USER GAMEPLAY INTENT: Fight visible rivals in Urban shipping dockyard or industrial facility at night featuring a reddish-brown shipping container labeled 'ZENITH INDUSTRIES', yellow 'DANGER' sign, metal ladder, green toxic/chemical barrels behind chain-link fence ('CAUTION KEEP OUT'), brick building entrance ('SECURITY LEVEL 3', room 'B7'), dark night sky with full moon, glowing blue/purple skyline with skyscrapers and industrial cranes, concrete floor with yellow-and-black hazard stripes, drain grates, and rivets as Alex, a Black male character with a prominent afro wearing a white martial arts gi with a black belt and wrist wraps, fighting barefoot; executing an open-palm strike to the right, using the source combat plane and Shipping container, Yellow 'DANGER' sign, Metal ladder, Green toxic/chemical barrels, Chain-link fence, Caution sign, Exterior lamp, Rusty brown oil drum, Combat knife; support beat-em-up progression when multiple enemies are visible. Preserve the CURRENT screenshot camera, layout, player scale, palette, HUD language and major object relationships. Unknown facts remain unknown.`;

const els = {
  title: document.getElementById('titleInput'),
  description: document.getElementById('descriptionInput'),
  imageInput: document.getElementById('imageInput'),
  imagePreview: document.getElementById('imagePreview'),
  previewEmpty: document.getElementById('previewEmpty'),
  useRefCrops: document.getElementById('useRefCrops'),
  extendScene: document.getElementById('extendScene'),
  sampleBtn: document.getElementById('sampleBtn'),
  clearBtn: document.getElementById('clearBtn'),
  parseBtn: document.getElementById('parseBtn'),
  buildBtn: document.getElementById('buildBtn'),
  status: document.getElementById('status'),
  summaryGrid: document.getElementById('summaryGrid'),
  blueprintOut: document.getElementById('blueprintOut'),
  rawOut: document.getElementById('rawOut'),
  readinessBadge: document.getElementById('readinessBadge'),
  cropGrid: document.getElementById('cropGrid'),
  runtimeStatus: document.getElementById('runtimeStatus'),
  canvas: document.getElementById('gameCanvas')
};

const ctx = els.canvas.getContext('2d');
const state = {
  imageEl:null,
  imageDataUrl:'',
  blueprint:null,
  packet:null,
  crops:[],
  keys:{},
  runtime:null,
  raf:0
};

init();
function init() {
  els.description.value = SAMPLE;
  bindEvents();
  setupTabs();
  renderIdleCanvas();
}

function bindEvents() {
  els.sampleBtn.addEventListener('click',()=>{ els.title.value='Urban Shipping Clash Upgrade'; els.description.value=SAMPLE; setStatus('Loaded Alex sample description.'); });
  els.clearBtn.addEventListener('click',clearAll);
  els.imageInput.addEventListener('change',onImageSelected);
  els.parseBtn.addEventListener('click',parseOnly);
  els.buildBtn.addEventListener('click',buildPlayable);
  window.addEventListener('keydown',e=>{ state.keys[e.key.toLowerCase()] = true; if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); if(e.key.toLowerCase()==='r' && state.runtime){ state.runtime = createRuntime(state.packet); setRuntimeStatus('Runtime reset.'); }});
  window.addEventListener('keyup',e=>{ state.keys[e.key.toLowerCase()] = false; });
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  }));
}

function clearAll() {
  els.title.value='Urban Shipping Clash Upgrade';
  els.description.value='';
  els.imageInput.value='';
  els.imagePreview.src=''; els.imagePreview.style.display='none';
  els.previewEmpty.style.display='block';
  state.imageEl=null; state.imageDataUrl=''; state.crops=[]; state.packet=null; state.blueprint=null;
  renderSummary([]); els.cropGrid.innerHTML=''; els.blueprintOut.textContent=''; els.rawOut.textContent=''; els.readinessBadge.textContent='0%';
  cancelAnimationFrame(state.raf); state.runtime=null; renderIdleCanvas();
  setStatus('Cleared.'); setRuntimeStatus('Ready for a fresh build.');
}

function onImageSelected(ev) {
  const file = ev.target.files && ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.imageDataUrl = reader.result;
    const img = new Image();
    img.onload = () => {
      state.imageEl = img;
      els.imagePreview.src = state.imageDataUrl;
      els.imagePreview.style.display='block';
      els.previewEmpty.style.display='none';
      setStatus(`Loaded screenshot: ${file.name}`);
    };
    img.src = state.imageDataUrl;
  };
  reader.readAsDataURL(file);
}

function parseOnly() {
  const packet = buildPacket();
  state.packet = packet;
  state.blueprint = packet.blueprint;
  renderPacket(packet);
  setStatus('Description parsed. Ready to build runtime.');
}

function buildPlayable() {
  const packet = buildPacket();
  state.packet = packet;
  state.blueprint = packet.blueprint;
  renderPacket(packet);
  state.runtime = createRuntime(packet);
  setRuntimeStatus('Prototype running. Use movement keys and Space to attack.');
  setStatus('Playable Reference Upgrade built.');
  startLoop();
}

function buildPacket() {
  const title = clean(els.title.value) || 'XPLAY Reference Upgrade';
  const source = els.description.value.trim();
  const genreCandidates = extractGenres(source);
  const primaryGenre = genreCandidates[0]?.type || 'fighting';
  const player = parsePlayer(source);
  const enemies = inferEnemies(source, primaryGenre);
  const landmarks = inferLandmarks(source);
  const palette = inferPalette(source);
  const camera = inferCamera(source, primaryGenre);
  const gameplay = inferGameplay(source, primaryGenre);
  const worldWidth = els.extendScene.checked ? 2400 : 1280;
  const stageTime = gameplay.stageTime || 18;
  const blueprint = { title, primaryGenre, genreCandidates, player, enemies, landmarks, palette, camera, gameplay, worldWidth, stageTime, useRefCrops:els.useRefCrops.checked, extendScene:els.extendScene.checked };
  const crops = state.imageEl ? makeReferenceCrops(state.imageEl) : [];
  state.crops = crops;
  const readiness = computeReadiness(blueprint, crops, !!state.imageEl);
  return {
    meta: { title, builtAt:new Date().toISOString(), mode:'reference-upgrade-lab-v1', imageLoaded:!!state.imageEl },
    blueprint,
    crops,
    readiness,
    sourceText: source
  };
}

function renderPacket(packet) {
  renderSummary([
    ['Primary Genre', packet.blueprint.primaryGenre],
    ['Player', packet.blueprint.player.name],
    ['Enemies', String(packet.blueprint.enemies.length)],
    ['Landmarks', String(packet.blueprint.landmarks.length)],
    ['Reference Image', packet.meta.imageLoaded ? 'Loaded' : 'No image'],
    ['World Width', `${packet.blueprint.worldWidth}px`]
  ]);
  els.blueprintOut.textContent = JSON.stringify(packet.blueprint, null, 2);
  els.rawOut.textContent = JSON.stringify(packet, null, 2);
  els.readinessBadge.textContent = `${packet.readiness}%`;
  renderCrops(packet.crops);
}

function renderSummary(items) {
  els.summaryGrid.innerHTML = items.map(([k,v])=>`<div class="summary-card"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div></div>`).join('');
}

function renderCrops(crops) {
  if(!crops.length) {
    els.cropGrid.innerHTML = '<div class="crop-card"><h4>No reference crops yet</h4><div class="crop-meta">Upload a screenshot to enable auto-crops.</div></div>';
    return;
  }
  els.cropGrid.innerHTML = crops.map(c=>`<div class="crop-card"><h4>${escapeHtml(c.label)}</h4><img src="${c.dataUrl}" alt="${escapeHtml(c.label)}"><div class="crop-meta">${c.box.w}×${c.box.h} px · ${escapeHtml(c.note)}</div></div>`).join('');
}

function renderIdleCanvas() {
  ctx.clearRect(0,0,els.canvas.width,els.canvas.height);
  const g = ctx.createLinearGradient(0,0,0,els.canvas.height);
  g.addColorStop(0,'#102447'); g.addColorStop(1,'#213757');
  ctx.fillStyle = g; ctx.fillRect(0,0,els.canvas.width,els.canvas.height);
  ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='700 36px Arial'; ctx.textAlign='center';
  ctx.fillText('Reference Upgrade Lab', els.canvas.width/2, 170);
  ctx.font='600 18px Arial';
  ctx.fillText('Upload screenshot + parse description + build playable upgrade', els.canvas.width/2, 210);
  ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=2; ctx.strokeRect(80,260,800,180);
  ctx.font='700 20px Arial'; ctx.fillText('Runtime preview appears here', els.canvas.width/2, 355);
  ctx.textAlign='left';
}

function createRuntime(packet) {
  const bp = packet.blueprint;
  const runtime = {
    t:0,
    timer: bp.stageTime,
    worldWidth: bp.worldWidth,
    cameraX:0,
    gameOver:false,
    win:false,
    hitFlash:0,
    plate: packet.meta.imageLoaded ? state.imageEl : null,
    playerSprite: packet.crops.find(c=>c.id==='player')?.img || null,
    enemySprites: [
      packet.crops.find(c=>c.id==='enemyLeft')?.img || null,
      packet.crops.find(c=>c.id==='enemyCenterRight')?.img || null,
      packet.crops.find(c=>c.id==='enemyRight')?.img || null
    ],
    hudSprite: packet.crops.find(c=>c.id==='hud')?.img || null,
    player: {x: 420, y: 386, w: 82, h: 120, vx:0, vy:0, speed:140, health:100, attackCooldown:0, hurtCooldown:0, facing:1},
    enemies: [
      {id:'enemy1', x:860, y:390, w:88, h:120, health:42, alive:true, type:'knife', attackCd:0},
      {id:'enemy2', x:1080, y:390, w:84, h:120, health:42, alive:true, type:'bandana', attackCd:0},
      {id:'enemy3', x:1290, y:390, w:86, h:124, health:48, alive:true, type:'bruiser', attackCd:0}
    ],
    props: buildStageProps(bp),
    blueprint: bp
  };
  if (bp.primaryGenre !== 'fighting') {
    runtime.enemies = runtime.enemies.slice(0,2);
  }
  return runtime;
}

function buildStageProps(bp) {
  const props = [];
  const worldW = bp.worldWidth;
  props.push({type:'security', x:170, y:320});
  props.push({type:'fence', x:420, y:332, w:240});
  props.push({type:'barrels', x:385, y:422});
  props.push({type:'container', x:880, y:340, w:420, h:150});
  props.push({type:'danger', x:1010, y:352});
  props.push({type:'ladder', x:1160, y:324});
  props.push({type:'drum', x:1380, y:450});
  if (bp.extendScene) {
    props.push({type:'fence', x:1460, y:332, w:180});
    props.push({type:'barrels', x:1530, y:422});
    props.push({type:'container', x:1720, y:352, w:320, h:138});
    props.push({type:'danger', x:1800, y:362});
    props.push({type:'drum', x:2070, y:450});
    props.push({type:'fence', x:70, y:332, w:140});
  }
  return props;
}

function startLoop() {
  cancelAnimationFrame(state.raf);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.033, (now-last)/1000); last = now;
    if (state.runtime) updateRuntime(state.runtime, dt);
    renderRuntime(state.runtime);
    state.raf = requestAnimationFrame(frame);
  }
  state.raf = requestAnimationFrame(frame);
}

function updateRuntime(rt, dt) {
  if(!rt || rt.gameOver) return;
  rt.t += dt;
  rt.timer = Math.max(0, rt.timer - dt);
  const p = rt.player;
  const left = state.keys['arrowleft'] || state.keys['a'];
  const right = state.keys['arrowright'] || state.keys['d'];
  const up = state.keys['arrowup'] || state.keys['w'];
  const down = state.keys['arrowdown'] || state.keys['s'];
  const attack = state.keys[' '] || state.keys['space'];

  p.vx = (right?1:0) - (left?1:0);
  p.vy = (down?1:0) - (up?1:0);
  if(p.vx !== 0) p.facing = Math.sign(p.vx);
  p.x = clamp(p.x + p.vx * p.speed * dt, 70, rt.worldWidth-110);
  p.y = clamp(p.y + p.vy * (p.speed * 0.55) * dt, 322, 430);
  p.attackCooldown = Math.max(0, p.attackCooldown-dt);
  p.hurtCooldown = Math.max(0, p.hurtCooldown-dt);
  rt.hitFlash = Math.max(0, rt.hitFlash-dt);

  if (attack && p.attackCooldown<=0) {
    p.attackCooldown = 0.42;
    const hitRange = 110;
    rt.enemies.forEach((e,idx)=>{
      if(!e.alive) return;
      const dx = e.x - p.x;
      const dy = Math.abs(e.y-p.y);
      if (Math.abs(dx) < hitRange && dy < 70 && Math.sign(dx||1) === p.facing) {
        e.health -= e.type==='bruiser' ? 12 : 18;
        e.x += p.facing * 22;
        rt.hitFlash = .16;
        if (e.health <= 0) e.alive = false;
      }
    });
  }

  rt.enemies.forEach((e,i)=>{
    if(!e.alive) return;
    e.attackCd = Math.max(0, e.attackCd-dt);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 88) {
      e.x += Math.sign(dx) * (46 + i*5) * dt;
      e.y += Math.sign(dy) * 24 * dt;
    } else if (e.attackCd<=0 && p.hurtCooldown<=0) {
      e.attackCd = 0.9 + i*0.12;
      p.hurtCooldown = 0.45;
      p.health -= 6;
    }
  });

  // slow health depletion stress test
  p.health -= 1.15 * dt;
  p.health = Math.max(0, p.health);

  const aliveCount = rt.enemies.filter(e=>e.alive).length;
  if (aliveCount===0) { rt.win=true; rt.gameOver=true; setRuntimeStatus('Victory. Stage survived and enemies cleared. Press R to retest.'); }
  else if (p.health<=0) { rt.gameOver=true; setRuntimeStatus('Player defeated. Press R to retest.'); }
  else if (rt.timer<=0) { rt.win=true; rt.gameOver=true; setRuntimeStatus('Scroll / survival threshold reached. Timer complete. Press R to retest.'); }

  rt.cameraX = clamp(p.x - 280, 0, rt.worldWidth - els.canvas.width);
}

function renderRuntime(rt) {
  const w = els.canvas.width, h = els.canvas.height;
  ctx.clearRect(0,0,w,h);
  if(!rt) { renderIdleCanvas(); return; }

  const camX = rt.cameraX;
  drawStageBackground(rt, camX, w, h);
  ctx.save();
  ctx.translate(-camX,0);
  drawGround(rt.worldWidth, h);
  drawProps(rt.props);
  rt.enemies.forEach((e,idx)=>drawEnemy(e, idx, rt));
  drawPlayer(rt.player, rt);
  ctx.restore();
  drawHud(rt);
  if(rt.hitFlash>0) {
    ctx.fillStyle = `rgba(255,220,100,${rt.hitFlash*0.35})`;
    ctx.fillRect(0,0,w,h);
  }
  if(rt.gameOver) drawOverlay(rt);
}

function drawStageBackground(rt, camX, w, h) {
  const sky = ctx.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,'#06153a'); sky.addColorStop(.55,'#0e2551'); sky.addColorStop(1,'#1d2137');
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,h);

  // skyline
  for(let i=0;i<18;i++) {
    const x = ((i*120) - (camX*0.18)) % (w+160) - 80;
    const hh = 70 + (i%5)*28;
    ctx.fillStyle = i%3===0 ? '#283b72' : '#1f315f';
    ctx.fillRect(x, 126+(i%2)*22, 36+(i%3)*18, hh);
    ctx.fillStyle = 'rgba(255,120,80,.18)';
    for(let yy=0; yy<hh; yy+=18) ctx.fillRect(x+6, 134+(i%2)*22+yy, 5, 6);
  }
  ctx.fillStyle='rgba(250,250,255,.82)';
  ctx.beginPath(); ctx.arc(710 - camX*0.08, 80, 16, 0, Math.PI*2); ctx.fill();

  // reference screenshot source plate
  if(rt.plate) {
    const centralX = 480 - camX*0.05;
    const plateW = 620, plateH = 350;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.drawImage(rt.plate, centralX, 124, plateW, plateH);
    if(rt.blueprint.extendScene) {
      // left mirrored strip
      ctx.save();
      ctx.translate(centralX,0); ctx.scale(-1,1);
      ctx.drawImage(rt.plate, 0, 124, 160, plateH);
      ctx.restore();
      // right repeated strip
      ctx.drawImage(rt.plate, centralX+plateW-160, 124, 160, plateH);
      ctx.globalAlpha = 0.12;
      ctx.drawImage(rt.plate, centralX-210, 144, 180, 310);
      ctx.drawImage(rt.plate, centralX+plateW+30, 144, 180, 310);
    }
    ctx.restore();
  }
}

function drawGround(worldWidth, h) {
  ctx.fillStyle='#2b2433'; ctx.fillRect(0,456,worldWidth,h-456);
  ctx.fillStyle='#3b3245'; ctx.fillRect(0,408,worldWidth,48);
  for(let x=0;x<worldWidth;x+=58){
    ctx.strokeStyle='rgba(120,130,155,.18)'; ctx.beginPath(); ctx.moveTo(x,455); ctx.lineTo(x+44,448); ctx.stroke();
  }
  ctx.fillStyle='#e4bf3b';
  for(let x=0;x<worldWidth;x+=44) ctx.fillRect(x, 403, 22, 4);
}

function drawProps(props) {
  props.forEach(p=>{
    if(p.type==='security') {
      ctx.fillStyle='#5f341f'; ctx.fillRect(p.x-55, p.y-98, 98, 142);
      ctx.fillStyle='#1d5271'; ctx.fillRect(p.x-45, p.y-74, 40, 34); ctx.fillStyle='#d5dba8'; ctx.font='700 14px Arial'; ctx.fillText('B7', p.x-37, p.y-51);
      ctx.fillStyle='#422313'; ctx.fillRect(p.x-42, p.y-18, 46, 58); ctx.fillStyle='#caa77c'; ctx.font='700 11px Arial';
      ctx.fillText('SECURITY', p.x-40, p.y+3); ctx.fillText('LEVEL 3', p.x-36, p.y+20);
      ctx.fillStyle='#f3dc83'; ctx.beginPath(); ctx.arc(p.x-6, p.y-110, 12, 0, Math.PI*2); ctx.fill();
    }
    if(p.type==='fence') {
      ctx.strokeStyle='#95a5c5'; ctx.lineWidth=4; ctx.strokeRect(p.x-90, p.y-48, p.w||180, 76);
      ctx.strokeStyle='rgba(185,200,230,.45)'; ctx.lineWidth=2;
      for(let i=0;i<10;i++) { ctx.beginPath(); ctx.moveTo(p.x-84 + i*18, p.y-46); ctx.lineTo(p.x-70 + i*18, p.y+26); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x-70 + i*18, p.y-46); ctx.lineTo(p.x-84 + i*18, p.y+26); ctx.stroke(); }
    }
    if(p.type==='barrels') {
      for(let i=0;i<3;i++){ ctx.fillStyle='#486d22'; ctx.fillRect(p.x + i*28, p.y-18, 24, 34); ctx.strokeStyle='#283a14'; ctx.strokeRect(p.x + i*28, p.y-18, 24, 34);} }
    if(p.type==='container') {
      ctx.fillStyle='#8d4627'; ctx.fillRect(p.x-140, p.y-20, p.w||320, p.h||120);
      ctx.fillStyle='#bb8e59'; ctx.font='700 28px Arial'; ctx.fillText('ZENITH', p.x-84, p.y+42);
      ctx.font='700 20px Arial'; ctx.fillText('INDUSTRIES', p.x-84, p.y+72);
      ctx.strokeStyle='rgba(0,0,0,.2)'; for(let i=0;i<7;i++) ctx.strokeRect(p.x-140 + i*45, p.y-20, 45, p.h||120);
    }
    if(p.type==='danger') {
      ctx.fillStyle='#b1842d'; ctx.fillRect(p.x, p.y, 54, 62); ctx.fillStyle='#4b2519'; ctx.font='700 12px Arial'; ctx.fillText('DANGER', p.x+6, p.y+20); ctx.font='700 34px Arial'; ctx.fillText('⚡', p.x+12, p.y+52);
    }
    if(p.type==='ladder') {
      ctx.strokeStyle='#9fa8bc'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x,p.y+96); ctx.moveTo(p.x+18,p.y); ctx.lineTo(p.x+18,p.y+96); ctx.stroke(); ctx.lineWidth=2; for(let i=0;i<6;i++){ ctx.beginPath(); ctx.moveTo(p.x,p.y+12+i*15); ctx.lineTo(p.x+18,p.y+12+i*15); ctx.stroke(); }
    }
    if(p.type==='drum') { ctx.fillStyle='#7d3d23'; ctx.fillRect(p.x, p.y-36, 30, 40); ctx.strokeStyle='#4b2415'; ctx.strokeRect(p.x,p.y-36,30,40); }
  });
}

function drawPlayer(p, rt) {
  const bob = Math.sin(rt.t*10)*2;
  const attacking = p.attackCooldown > 0.22;
  const x = p.x, y = p.y + bob;
  if(rt.blueprint.useRefCrops && rt.playerSprite) {
    drawSpriteCrop(rt.playerSprite, x-40, y-100, 82, 118, p.facing);
    if (attacking) {
      ctx.fillStyle='rgba(255,224,110,.9)'; ctx.beginPath(); ctx.moveTo(x + p.facing*18, y-42); ctx.lineTo(x + p.facing*54, y-54); ctx.lineTo(x + p.facing*62, y-16); ctx.fill();
    }
  } else {
    ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(x, y-88, 16, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.fillRect(x-18, y-72, 36, 54); ctx.fillStyle='#222'; ctx.fillRect(x-3, y-42, 6, 40); ctx.fillStyle='#fff'; ctx.fillRect(x-22, y-20, 16, 40); ctx.fillRect(x+6, y-20, 16, 40);
    ctx.strokeStyle='#fff'; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(x-20,y-62); ctx.lineTo(x + (attacking?38*p.facing: -30), y-50); ctx.stroke();
  }
  if(p.hurtCooldown>0) { ctx.strokeStyle='rgba(255,80,80,.85)'; ctx.lineWidth=3; ctx.strokeRect(x-44,y-104,88,124); }
}

function drawEnemy(e, idx, rt) {
  if(!e.alive) return;
  const bob = Math.sin(rt.t*8 + idx)*2;
  const x=e.x, y=e.y+bob;
  const facing = rt.player.x < e.x ? -1 : 1;
  const img = rt.enemySprites[idx] || null;
  if(rt.blueprint.useRefCrops && img) {
    drawSpriteCrop(img, x-42, y-104, 88, 122, facing);
  } else {
    ctx.fillStyle= idx===0 ? '#973b68' : idx===1 ? '#3a79a7' : '#356f7a';
    ctx.fillRect(x-18,y-70,36,52); ctx.fillStyle='#d1a078'; ctx.beginPath(); ctx.arc(x,y-86,14,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#333'; ctx.fillRect(x-14,y-18,12,34); ctx.fillRect(x+2,y-18,12,34);
  }
  ctx.fillStyle='rgba(0,0,0,.42)'; ctx.fillRect(x-22, y+18, 44, 6);
  ctx.fillStyle='#d23a4c'; ctx.fillRect(x-30, y-116, 60, 6); ctx.fillStyle='#ecce55'; ctx.fillRect(x-30, y-116, Math.max(0,e.health)/48*60, 6);
}

function drawSpriteCrop(img, x, y, w, h, facing=1) {
  ctx.save();
  if(facing<0){ ctx.translate(x+w/2,0); ctx.scale(-1,1); ctx.translate(-(x+w/2),0); }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function drawHud(rt) {
  ctx.fillStyle='#02060d'; ctx.fillRect(0,0,els.canvas.width,64);
  ctx.fillStyle='#d7edf9'; ctx.font='700 20px Arial'; ctx.fillText(rt.blueprint.player.name.toUpperCase(), 84, 26);
  ctx.fillStyle='#ffd34d'; ctx.font='700 18px Arial'; ctx.fillText('0124500', 208, 26); ctx.fillStyle='#ffffff'; ctx.fillText('×3', 356, 26);
  ctx.font='700 18px Arial'; ctx.fillStyle='#ffffff'; ctx.fillText('TIME', 468, 24); ctx.fillStyle='#ffae20'; ctx.font='700 32px Arial'; ctx.fillText(Math.ceil(rt.timer).toString(), 506, 38);
  ctx.fillStyle='#b8cfff'; ctx.font='700 18px Arial'; ctx.fillText('PRESS START', 730, 24);
  drawBar(84,34,160,10,rt.player.health/100,'#f0d14b','#5074cd');
  drawBar(84,50,110,8,Math.max(0,rt.player.health/100),'#6ec5ff','#314f8f');

  ctx.fillStyle='#0a1220'; ctx.fillRect(0,500,els.canvas.width,40);
  ctx.fillStyle='#ffffff'; ctx.font='700 14px Arial'; ctx.fillText('KNIFE', 92, 525); ctx.fillText('BANDANA', 688, 525); ctx.fillText('STAGE 3-1', 414, 525);
  drawBar(160,515,170,8, enemyHealth(rt,0), '#e72d3a', '#edc54b');
  drawBar(756,515,170,8, enemyHealth(rt,1), '#e72d3a', '#edc54b');
}

function drawBar(x,y,w,h,pct,fill,accent) {
  ctx.fillStyle='#111'; ctx.fillRect(x,y,w,h);
  ctx.fillStyle=fill; ctx.fillRect(x+2,y+2,(w-4)*clamp(pct,0,1),h-4);
  ctx.strokeStyle=accent; ctx.lineWidth=2; ctx.strokeRect(x,y,w,h);
}

function enemyHealth(rt, index) {
  const e = rt.enemies[index];
  if(!e || !e.alive) return 0;
  return Math.max(0,e.health) / (e.type==='bruiser' ? 48 : 42);
}

function drawOverlay(rt) {
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fillRect(0,0,els.canvas.width,els.canvas.height);
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='700 56px Arial'; ctx.fillText(rt.win ? 'STAGE CLEAR' : 'YOU LOSE', els.canvas.width/2, 248);
  ctx.font='700 24px Arial'; ctx.fillText('Press R to retry', els.canvas.width/2, 292); ctx.textAlign='left';
}

function makeReferenceCrops(img) {
  const zones = [
    {id:'hud', label:'HUD strip', x:.0, y:.0, w:1, h:.16, note:'Top HUD and UI language'},
    {id:'player', label:'Player crop', x:.34, y:.34, w:.22, h:.46, note:'Main player candidate / Alex proxy'},
    {id:'enemyLeft', label:'Left enemy crop', x:.03, y:.40, w:.23, h:.42, note:'Knife enemy proxy'},
    {id:'enemyCenterRight', label:'Center-right enemy crop', x:.49, y:.38, w:.23, h:.42, note:'Bandana enemy proxy'},
    {id:'enemyRight', label:'Right enemy crop', x:.72, y:.38, w:.23, h:.42, note:'Bruiser enemy proxy'},
    {id:'stagePlate', label:'Stage plate', x:.0, y:.16, w:1, h:.84, note:'Main visual source plate for background extension'},
    {id:'landmarks', label:'Landmark mid-zone', x:.18, y:.22, w:.64, h:.42, note:'Container, fence, B7, ladder, danger sign'}
  ];
  return zones.map(z=> cropZone(img, z)).filter(Boolean);
}

function cropZone(img, z) {
  const sx = Math.floor(img.width * z.x), sy = Math.floor(img.height * z.y), sw = Math.floor(img.width * z.w), sh = Math.floor(img.height * z.h);
  const canvas = document.createElement('canvas');
  canvas.width = sw; canvas.height = sh;
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const dataUrl = canvas.toDataURL('image/png');
  const outImg = new Image(); outImg.src = dataUrl;
  return { id:z.id, label:z.label, note:z.note, box:{x:sx,y:sy,w:sw,h:sh}, dataUrl, img:outImg };
}

function extractGenres(text) {
  const explicit = [];
  const re = /\b(fighting|platformer|dodge|runner|fps|racing|puzzle|rhythm|open\s*world|collect(?:ible)?)\s*(\d{1,3})%/gi;
  let m; while((m = re.exec(text))) explicit.push({ type:normalizeGenre(m[1]), score:Math.min(1, Number(m[2])/100), source:'explicit' });
  if(!explicit.length) explicit.push({type:/fight|brawler|combat|beat-em-up/i.test(text)?'fighting':'platformer',score:.7,source:'inferred'});
  return dedupeByType(explicit).sort((a,b)=>b.score-a.score);
}
function normalizeGenre(v){ return String(v).toLowerCase().replace(/\s+/g,''); }
function dedupeByType(arr){ const map=new Map(); arr.forEach(x=>{ if(!map.has(x.type)||map.get(x.type).score<x.score) map.set(x.type,x);}); return [...map.values()]; }

function parsePlayer(text) {
  const name = (text.match(/\bI see\s+([A-Z][A-Za-z0-9_-]+)/i)||[])[1] || 'Player';
  return {
    name,
    identity: /black male/i.test(text) ? 'Black male' : /black female/i.test(text) ? 'Black female' : 'Unknown',
    appearance: [ /afro/i.test(text) && 'afro', /white .*gi|white gi/i.test(text) && 'white gi', /black belt/i.test(text) && 'black belt', /wrist wraps?/i.test(text) && 'wrist wraps', /barefoot/i.test(text) && 'barefoot' ].filter(Boolean),
    action: clean((text.match(/executing\s+([^.;]+)/i)||[])[1] || 'combat pose')
  };
}

function inferEnemies(text, genre) {
  const out=[];
  if(/knife/i.test(text)) out.push({name:'Knife Punk', weapon:'knife', region:'left'});
  if(/bandana/i.test(text)) out.push({name:'Bandana Rival', weapon:'fists', region:'center-right'});
  if(/far-right|muscular|multiple enemies|rivals/i.test(text)) out.push({name:'Dock Bruiser', weapon:'fists', region:'right'});
  if(!out.length && genre==='fighting') out.push({name:'Enemy 1', weapon:'fists', region:'right'});
  return out;
}

function inferLandmarks(text) {
  const items = [];
  const list = (text.match(/Important visible elements include\s+([^.;]+)/i)||[])[1];
  if(list) list.split(',').map(clean).filter(Boolean).forEach(v=>items.push(v));
  [['ZENITH INDUSTRIES container',/zenith industries|shipping container/i],['DANGER sign',/danger sign|yellow 'danger'/i],['metal ladder',/ladder/i],['green toxic/chemical barrels',/barrels|chemical barrels/i],['chain-link fence',/chain-link fence/i],['CAUTION KEEP OUT sign',/caution keep out/i],['security building B7',/security level 3|\bb7\b/i],['full moon skyline',/full moon|skyline/i],['rusty brown oil drum',/oil drum/i],['hazard striped ground',/hazard stripes|yellow-and-black/i]].forEach(([label,re])=>{ if(re.test(text) && !items.some(x=>x.toLowerCase().includes(label.toLowerCase().split(' ')[0]))) items.push(label); });
  return [...new Set(items)];
}

function inferPalette(text) {
  const out=[];
  if(/blue\/purple|blue-purple|blue purple/i.test(text)) out.push('blue/purple night');
  if(/reddish-brown/i.test(text)) out.push('reddish-brown industrial');
  if(/yellow-and-black|yellow 'danger'|yellow danger/i.test(text)) out.push('yellow hazard accents');
  if(!out.length) out.push('night industrial');
  return out;
}

function inferCamera(text, genre) {
  return {
    type: /side|side-scrolling|fixed 2d|orthographic/i.test(text) || genre==='fighting' ? '2D side view' : 'adaptive',
    preserveComposition: /preserve.*composition|exact visual blueprint/i.test(text),
    extendForScroll: els.extendScene.checked
  };
}

function inferGameplay(text, genre) {
  const stageTime = 18;
  return {
    intention: genre==='fighting' ? 'Beat-em-up progression with multiple visible rivals.' : 'Genre test runtime.',
    cues: extractGenres(text),
    stageTime,
    tests: ['reference fidelity','scroll extension','combat pacing','survival threshold']
  };
}

function computeReadiness(bp, crops, imageLoaded) {
  let score = 25;
  if(bp.player?.name) score += 10;
  if(bp.enemies?.length) score += 15;
  if(bp.landmarks?.length >= 4) score += 15;
  if(imageLoaded) score += 20;
  if(crops.length >= 5) score += 10;
  if(bp.extendScene) score += 5;
  return Math.min(100, score);
}

function setStatus(msg){ els.status.textContent = msg; }
function setRuntimeStatus(msg){ els.runtimeStatus.textContent = msg; }
function clean(v){ return String(v||'').replace(/\*+/g,'').replace(/\s+/g,' ').trim(); }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
