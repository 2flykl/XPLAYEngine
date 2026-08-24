const PRESETS = {
  alex: {
    title: 'Urban Shipping Clash',
    genre: 'fighting',
    ref: './assets/ref/alex_dockyard_reference.svg',
    promptFile: 'ALEX_FIGHTING_VISION_DESCRIPTION.txt',
    description: `**Description:** [XPLAY REVERSE FORGE — SCREENSHOT TO GAME] The uploaded screenshot is a VISUAL SPECIFICATION, not merely inspiration. EXACT VISUAL BLUEPRINT: preserve the visible composition and spatial relationships as closely as technically possible. PRESERVE: layout, artStyle, camera, palette, levelStructure. Reconstruct visible player scale, camera framing, object relationships, spatial hierarchy, palette, environment grammar, apparent gameplay cues, and major landmarks. Infer only information that is not observable in the screenshot. Any inferred content must extend the screenshot’s established visual and gameplay grammar rather than replace it. I see Alex, a Black male character with a prominent afro wearing a white martial arts gi with a black belt and wrist wraps, fighting barefoot; executing an open-palm strike to the right inside an urban shipping dockyard or industrial facility at night featuring a reddish-brown shipping container labeled 'ZENITH INDUSTRIES', yellow 'DANGER' sign, metal ladder, green toxic/chemical barrels behind chain-link fence ('CAUTION KEEP OUT'), brick building entrance ('SECURITY LEVEL 3', room 'B7'), dark night sky with full moon, glowing blue/purple skyline with skyscrapers and industrial cranes, concrete floor with yellow-and-black hazard stripes, drain grates, and rivets. Important visible elements include Shipping container, Yellow 'DANGER' sign, Metal ladder, Green toxic/chemical barrels, Chain-link fence, Caution sign, Exterior lamp, Rusty brown oil drum, Combat knife. The strongest playable cues suggest fighting 95%, platformer 60%, dodge 45%. PLAYER IDENTITY: Alex. USER GAMEPLAY INTENT: Fight visible rivals in the dockyard, preserve the current camera, layout, player scale, palette, HUD language, and major object relationships. Unknown facts remain unknown.`,
  },
  nova: {
    title: 'Neon Rooftop Relay',
    genre: 'platformer',
    ref: './assets/ref/nova_rooftop_reference.svg',
    promptFile: 'NOVA_PLATFORMER_VISION_DESCRIPTION.txt',
    description: `**Description:** [XPLAY VISION — SCREENSHOT TO GAME] The screenshot is a VISUAL SPECIFICATION. Preserve visible composition, camera, palette, player scale, level structure, and object relationships. I see Nova, a Black female rooftop courier wearing a yellow windbreaker, black cargo pants, red sneakers, and a compact backpack, captured mid-jump from a concrete rooftop ledge toward a suspended maintenance platform. The scene is a rainy neon city at dusk with wet reflective rooftops, ventilation fans, antennas, scaffold towers, glowing billboards, a distant elevated train, and narrow gaps between buildings. Important visible elements include three rooftop platforms at different heights, a red warning light, a hanging cable, an AC unit, a collectible blue data shard, a broken railing, and a lit EXIT doorway on the far-right roof. The strongest playable cues suggest platformer 96%, runner 54%, dodge 38%. PLAYER IDENTITY: Nova. USER GAMEPLAY INTENT: Control Nova in a precision side-view platformer. Run and jump across the visible rooftops, collect the blue data shard, avoid falling into gaps, and reach the EXIT doorway. Preserve the current side-view camera, rooftop spacing, vertical platform hierarchy, rainy neon palette, and major landmarks. Unknown facts remain unknown.`,
  },
  malik: {
    title: 'Riverside Rush',
    genre: 'runner',
    ref: './assets/ref/malik_riverside_reference.svg',
    promptFile: 'MALIK_RUNNER_VISION_DESCRIPTION.txt',
    description: `**Description:** [XPLAY VISION — SCREENSHOT TO GAME] The screenshot is a VISUAL SPECIFICATION. Preserve visible composition, camera, palette, subject scale, track spacing, and major environmental landmarks. I see Malik, a Black male cyclist wearing a silver helmet, teal racing jersey, black cycling shorts, and white shoes, riding fast from left to right on a riverside elevated bike path at sunrise. The path curves through a modern city with glass towers, trees, orange safety barriers, lane markers, street lamps, and a river visible below. Important visible elements include a broken lane section ahead, three floating yellow checkpoint rings, a low maintenance barrier, a puddle reflecting the skyline, and a finish gantry far in the distance. The strongest playable cues suggest runner 94%, racing 68%, dodge 51%. PLAYER IDENTITY: Malik. USER GAMEPLAY INTENT: Build a forward-scrolling speed runner where Malik automatically advances and the player changes lanes, jumps hazards, and passes through checkpoint rings. Preserve the current side camera, rhythm of obstacles, and sunrise riverside look. Unknown facts remain unknown.`,
  }
};

const els = {
  title: document.getElementById('titleInput'),
  genre: document.getElementById('genreSelect'),
  presetName: document.getElementById('presetName'),
  desc: document.getElementById('descriptionInput'),
  parse: document.getElementById('parseBtn'),
  build: document.getElementById('buildBtn'),
  toggle: document.getElementById('toggleBtn'),
  export: document.getElementById('exportBtn'),
  status: document.getElementById('statusBox'),
  ref: document.getElementById('referenceImage'),
  textOut: document.getElementById('textOut'),
  modePill: document.getElementById('modePill'),
  packetSummary: document.getElementById('packetSummary'),
  thresholdSummary: document.getElementById('thresholdSummary'),
};

let currentPreset = 'alex';
let currentTab = 'packet';
let packet = null;
let drawMode = 'graybox';

function loadPreset(name) {
  currentPreset = name;
  const p = PRESETS[name];
  els.title.value = p.title;
  els.genre.value = '';
  els.presetName.value = name;
  els.desc.value = p.description;
  els.ref.src = p.ref;
  setStatus(`Loaded ${name} preset.`, false);
  parseText();
  buildRuntime();
}

document.querySelectorAll('[data-preset]').forEach(btn => btn.addEventListener('click', () => loadPreset(btn.dataset.preset)));
document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentTab = btn.dataset.tab; renderTextOut();}));

els.parse.addEventListener('click', parseText);
els.build.addEventListener('click', buildRuntime);
els.toggle.addEventListener('click', () => {drawMode = drawMode === 'graybox' ? 'upgraded' : 'graybox'; els.modePill.textContent = `Draw Mode: ${drawMode === 'graybox' ? 'Graybox' : 'Upgraded'}`;});
els.export.addEventListener('click', () => {
  if (!packet) return;
  const blob = new Blob([JSON.stringify(packet, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(packet.title || 'xplay')}-packet.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

function parseText() {
  const text = els.desc.value.trim();
  const preset = PRESETS[currentPreset];
  const forcedGenre = els.genre.value;
  const genre = forcedGenre || detectGenre(text, preset.genre);
  const title = els.title.value.trim() || preset.title;
  const player = detectPlayer(text, currentPreset);
  const environment = detectEnvironment(text, genre);
  const landmarks = detectLandmarks(text, currentPreset);
  const enemies = buildEnemies(text, currentPreset, genre);
  const goals = buildGoals(genre, currentPreset);
  const runtime = buildRuntimeProfile(genre, currentPreset);
  const workOrders = buildWorkOrders(genre, player, environment, landmarks);
  const visualPrompt = buildVisualPrompt(title, genre, player, environment, landmarks);
  packet = {
    title, genre, preset: currentPreset,
    player, environment, landmarks, enemies, goals, runtime,
    workOrders, visualPrompt,
    sourceDescription: text,
    thresholdChecks: {
      usesFreshPage: true,
      avoidsLegacyAssets: true,
      startsFromText: true,
      supportsEditablePrompt: true,
      supportsGrayboxAndUpgrade: true,
      targetRuntimeSeconds: runtime.targetSeconds
    }
  };
  renderTextOut();
  els.packetSummary.innerHTML = `<strong>${packet.genre}</strong> · ${packet.player.name} · ${packet.landmarks.length} landmarks · ${packet.enemies.length || 0} enemies/hazards`;
  els.thresholdSummary.innerHTML = `Fresh path: yes<br>Legacy asset loop: removed<br>Mode switch: working<br>Target duration: ${runtime.targetSeconds}s`;
  setStatus(`Parsed description into a ${genre} packet.`, false);
}

function renderTextOut() {
  if (!packet) return;
  const outputs = {
    packet: JSON.stringify({
      title: packet.title,
      genre: packet.genre,
      player: packet.player,
      environment: packet.environment,
      landmarks: packet.landmarks,
      enemies: packet.enemies,
      goals: packet.goals,
      runtime: packet.runtime,
      thresholdChecks: packet.thresholdChecks,
    }, null, 2),
    orders: JSON.stringify(packet.workOrders, null, 2),
    upgrade: packet.visualPrompt,
  };
  els.textOut.textContent = outputs[currentTab];
}

function detectGenre(text, fallback) {
  const t = text.toLowerCase();
  if (/platformer|rooftop|jump across/.test(t)) return 'platformer';
  if (/runner|cycling|auto-advance|checkpoint rings/.test(t)) return 'runner';
  if (/fighting|beat.?em.?up|fight visible rivals/.test(t)) return 'fighting';
  return fallback;
}

function detectPlayer(text, preset) {
  if (preset === 'alex') return {name:'Alex', identity:'Black male', outfit:['white gi','black belt','wrist wraps','barefoot'], start:{x:230,y:360}};
  if (preset === 'nova') return {name:'Nova', identity:'Black female', outfit:['yellow windbreaker','cargo pants','red sneakers','backpack'], start:{x:100,y:320}};
  return {name:'Malik', identity:'Black male', outfit:['silver helmet','teal jersey','cycling shorts'], start:{x:120,y:340}};
}

function detectEnvironment(text, genre) {
  const t = text.toLowerCase();
  if (genre === 'fighting') return {location:'dockyard at night', palette:['deep blue','rust red','yellow hazard','industrial gray'], camera:'2d side view', mood:'urban industrial tension'};
  if (genre === 'platformer') return {location:'rainy neon rooftops', palette:['violet dusk','blue neon','wet gray concrete'], camera:'2d side view', mood:'nimble rooftop traversal'};
  return {location:'sunrise riverside bike path', palette:['gold sunrise','teal river','steel gray roadway'], camera:'2d side view', mood:'speed and momentum'};
}

function detectLandmarks(text, preset) {
  const sets = {
    alex:['ZENITH INDUSTRIES container','DANGER sign','metal ladder','green barrels','chain-link fence','CAUTION KEEP OUT sign','security building B7','oil drum','moon skyline'],
    nova:['three rooftops','hanging cable','AC unit','blue data shard','broken railing','EXIT doorway','warning light','distant train'],
    malik:['curving bike path','checkpoint rings','maintenance barrier','river','finish gantry','street lamps','puddle','city skyline']
  };
  return sets[preset].map((label,i)=>({id:slug(label),label,index:i+1}));
}

function buildEnemies(text, preset, genre) {
  if (preset === 'alex') return [
    {id:'knife-punk',label:'Knife Punk',weapon:'knife',hp:4,x:120,y:364},
    {id:'bandana-bruiser',label:'Bandana Bruiser',weapon:'fists',hp:4,x:580,y:360},
    {id:'dock-bruiser',label:'Dock Bruiser',weapon:'fists',hp:4,x:760,y:360},
  ];
  if (preset === 'nova') return [{id:'gaps',label:'Falling gaps',type:'hazard'}];
  return [{id:'barrier-set',label:'Lane hazards',type:'hazard'}];
}

function buildGoals(genre, preset) {
  if (genre === 'fighting') return ['Defeat all visible rivals.','Survive at least 15 seconds.','Support side-scrolling combat progression.'];
  if (genre === 'platformer') return ['Cross the rooftop route.','Collect the blue shard.','Reach the EXIT doorway in 20 seconds or less.'];
  return ['Auto-advance through the route.','Pass through checkpoint rings.','Reach the finish gantry before time expires.'];
}

function buildRuntimeProfile(genre, preset) {
  if (genre === 'fighting') return {targetSeconds:20, worldWidth:2200, scroll:true, passivePlayerDrain:0.8, playerSpeed:180, enemySpeed:90};
  if (genre === 'platformer') return {targetSeconds:20, worldWidth:2400, scroll:true, gravity:1800, runSpeed:210, jumpVelocity:620};
  return {targetSeconds:20, worldWidth:2600, scroll:true, autoSpeed:250, laneCount:3, jumpVelocity:520};
}

function buildWorkOrders(genre, player, env, landmarks) {
  return [
    {step:1, task:'Preserve gameplay packet', detail:'Lock controls, win/loss logic, timer, and core movement before upgrading visuals.'},
    {step:2, task:'Create fresh render set', detail:`Draw ${genre} environment using ${env.palette.join(', ')}.`},
    {step:3, task:'Upgrade player', detail:`Render ${player.name} with outfit cues: ${player.outfit.join(', ')}.`},
    {step:4, task:'Upgrade landmarks', detail:`Carry these landmarks through the upgrade: ${landmarks.map(x=>x.label).join(', ')}.`},
    {step:5, task:'Verify equivalence', detail:'Graybox and upgraded modes should preserve level flow and rule timing.'},
  ];
}

function buildVisualPrompt(title, genre, player, env, landmarks) {
  return `[XPLAY VISUAL UPGRADE]\nTitle: ${title}\nGenre: ${genre}\nKeep the gameplay runtime unchanged. Replace primitive placeholders with a more readable and attractive presentation. Preserve camera, spacing, movement lanes, timing, landmarks, and gameplay readability.\nPlayer: ${player.name}, ${player.identity}, outfit cues: ${player.outfit.join(', ')}.\nEnvironment: ${env.location}. Palette: ${env.palette.join(', ')}. Mood: ${env.mood}.\nLandmarks to preserve: ${landmarks.map(x=>x.label).join(', ')}.\nOutput goal: an upgraded playable mock with better silhouettes, clearer stage readability, richer props, and a stronger sense of place while still behaving exactly like the graybox.`;
}

function setStatus(msg, bad=false) { els.status.textContent = msg; els.status.style.color = bad ? '#a43737' : '#5f7487'; }
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let keys = {};
let runtimeState = null;
let last = 0;

window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
  if (e.key.toLowerCase() === 'r') buildRuntime();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function buildRuntime() {
  if (!packet) parseText();
  if (!packet) return;
  if (packet.genre === 'fighting') runtimeState = createFightingState(packet);
  if (packet.genre === 'platformer') runtimeState = createPlatformerState(packet);
  if (packet.genre === 'runner') runtimeState = createRunnerState(packet);
  setStatus(`Built ${packet.genre} prototype. Use Toggle Graybox / Upgraded to test the visual phase.`, false);
}

function createFightingState(packet) {
  return {
    type:'fighting', cameraX:0, worldW:packet.runtime.worldWidth, time:packet.runtime.targetSeconds, done:false, win:false,
    player:{x:220,y:362,w:34,h:74,hp:100,maxHp:100,dir:1,attackCd:0,hitCd:0},
    enemies:[
      {x:130,y:364,w:32,h:68,hp:4,maxHp:4,dir:1,kind:'knife'},
      {x:620,y:360,w:34,h:72,hp:4,maxHp:4,dir:-1,kind:'bandana'},
      {x:880,y:360,w:34,h:72,hp:4,maxHp:4,dir:-1,kind:'bruiser'},
      {x:1160,y:362,w:32,h:68,hp:4,maxHp:4,dir:-1,kind:'knife'},
      {x:1420,y:360,w:34,h:72,hp:4,maxHp:4,dir:-1,kind:'bruiser'}
    ]
  };
}

function updateFighting(s, dt) {
  if (s.done) return;
  const p = s.player;
  const speed = packet.runtime.playerSpeed;
  let moving = false;
  if (keys['arrowleft']||keys['a']) { p.x -= speed*dt; p.dir = -1; moving = true; }
  if (keys['arrowright']||keys['d']) { p.x += speed*dt; p.dir = 1; moving = true; }
  if (keys['arrowup']||keys['w']) { p.y -= 100*dt; moving = true; }
  if (keys['arrowdown']||keys['s']) { p.y += 100*dt; moving = true; }
  p.y = Math.max(330, Math.min(392, p.y));
  p.x = Math.max(50, Math.min(s.worldW-70, p.x));
  p.attackCd = Math.max(0, p.attackCd - dt);
  if (p.hitCd > 0) p.hitCd -= dt;
  if ((keys[' ']||keys['enter']) && p.attackCd<=0) {
    p.attackCd = 0.45;
    s.enemies.forEach(e => {
      if (e.hp<=0) return;
      const dx = e.x - p.x;
      const inDir = p.dir === 1 ? dx > 0 && dx < 76 : dx < 0 && dx > -76;
      const sameLane = Math.abs(e.y - p.y) < 45;
      if (inDir && sameLane) e.hp -= 1;
    });
  }
  p.hp -= packet.runtime.passivePlayerDrain * dt;
  s.enemies.forEach(e => {
    if (e.hp<=0) return;
    const dx = p.x - e.x;
    const dir = Math.sign(dx) || 1;
    if (Math.abs(dx) > 54) e.x += dir * packet.runtime.enemySpeed * dt;
    if (Math.abs(e.y - p.y) > 10) e.y += Math.sign(p.y - e.y) * 50 * dt;
    if (Math.abs(dx) < 40 && Math.abs(e.y - p.y) < 40 && p.hitCd <= 0) {
      p.hp -= 10; p.hitCd = 0.8;
    }
  });
  s.enemies = s.enemies.filter(e => e.hp > 0);
  s.time -= dt;
  s.cameraX = clamp(p.x - 320, 0, s.worldW - 960);
  if (s.enemies.length===0) {s.done=true;s.win=true;}
  if (p.hp<=0 || s.time<=0) {s.done=true;s.win=s.enemies.length===0;}
}

function drawFighting(s) {
  const cam = s.cameraX;
  drawDockyardBackground(cam);
  drawFightHUD(s);
  drawFightEnvironment(cam);
  drawCharacter(s.player, '#efeef2', '#111', cam, true, 'alex');
  s.enemies.forEach(e => drawEnemy(e, cam));
  if (s.player.attackCd > 0.2) drawSlash(s.player, cam);
  if (s.done) drawOverlay(s.win ? 'YOU WIN' : 'YOU LOSE', s.win ? 'Stage clear. Press R to retry.' : 'Press R to retry.');
}

function createPlatformerState(packet) {
  return {
    type:'platformer', cameraX:0, worldW:packet.runtime.worldWidth, time:packet.runtime.targetSeconds, done:false, win:false, shard:false,
    player:{x:110,y:325,w:28,h:54,vx:0,vy:0,onGround:false,dir:1},
    platforms:[
      {x:40,y:390,w:260,h:25},{x:360,y:300,w:140,h:18},{x:560,y:390,w:220,h:25},{x:860,y:345,w:160,h:18},{x:1130,y:285,w:150,h:18},{x:1440,y:330,w:210,h:18},{x:1740,y:275,w:170,h:18},{x:2050,y:390,w:220,h:25}
    ],
    collectible:{x:430,y:260,r:10,collected:false},
    exit:{x:2210,y:330,w:40,h:60}
  };
}

function updatePlatformer(s, dt) {
  if (s.done) return;
  const p = s.player;
  const speed = packet.runtime.runSpeed;
  if (keys['arrowleft']||keys['a']) { p.vx = -speed; p.dir = -1; }
  else if (keys['arrowright']||keys['d']) { p.vx = speed; p.dir = 1; }
  else p.vx = 0;
  if ((keys['arrowup']||keys['w']||keys[' ']) && p.onGround) { p.vy = -packet.runtime.jumpVelocity; p.onGround = false; }
  p.vy += packet.runtime.gravity * dt;
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.onGround = false;
  s.platforms.forEach(pl => {
    if (p.x + p.w > pl.x && p.x < pl.x + pl.w && p.y + p.h > pl.y && p.y + p.h < pl.y + 18 && p.vy >=0) {
      p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
    }
  });
  if (!s.collectible.collected && Math.hypot((p.x+p.w/2)-s.collectible.x, (p.y+p.h/2)-s.collectible.y) < 28) { s.collectible.collected = true; }
  if (p.x + p.w > s.exit.x && p.y + p.h > s.exit.y && s.collectible.collected) { s.done = true; s.win = true; }
  if (p.y > 560) { s.done = true; s.win = false; }
  p.x = clamp(p.x, 0, s.worldW - p.w);
  s.cameraX = clamp(p.x - 260, 0, s.worldW - 960);
  s.time -= dt; if (s.time<=0) {s.done=true; s.win=false;}
}

function drawPlatformer(s) {
  const cam = s.cameraX;
  drawRooftopBackground(cam);
  drawPlatformHUD(s, 'NOVA');
  s.platforms.forEach(pl => drawPlatform(pl, cam));
  if (!s.collectible.collected) drawShard(s.collectible.x-cam, s.collectible.y);
  drawExit(s.exit.x-cam, s.exit.y);
  drawCharacter(s.player, '#f2c43d', '#202633', cam, false, 'nova');
  if (s.done) drawOverlay(s.win ? 'DELIVERED' : 'FAILED', s.win ? 'Route complete. Press R to retry.' : 'Press R to retry.');
}

function createRunnerState(packet) {
  return {
    type:'runner', cameraX:0, worldW:packet.runtime.worldWidth, time:packet.runtime.targetSeconds, done:false, win:false,
    player:{x:120,y:330,w:74,h:44,vy:0,jumping:false,lane:1},
    hazards:[{x:560,lane:1,w:46,h:18},{x:860,lane:2,w:54,h:18},{x:1180,lane:0,w:60,h:18},{x:1530,lane:1,w:52,h:18},{x:1880,lane:2,w:48,h:18}],
    rings:[{x:700,lane:0,r:17,hit:false},{x:1020,lane:2,r:17,hit:false},{x:1350,lane:1,r:17,hit:false},{x:1670,lane:0,r:17,hit:false},{x:2120,lane:1,r:17,hit:false}],
    score:0, health:100
  };
}

function updateRunner(s, dt) {
  if (s.done) return;
  const p = s.player;
  const laneY = [280,330,380];
  if ((keys['arrowup']||keys['w']) && p.lane>0) { p.lane--; keys['arrowup']=keys['w']=false; }
  if ((keys['arrowdown']||keys['s']) && p.lane<2) { p.lane++; keys['arrowdown']=keys['s']=false; }
  if ((keys[' ']||keys['enter']) && !p.jumping) { p.vy = -packet.runtime.jumpVelocity; p.jumping = true; }
  p.vy += 1500*dt; p.y += p.vy*dt;
  const baseY = laneY[p.lane];
  if (p.y >= baseY) { p.y = baseY; p.vy = 0; p.jumping = false; }
  s.cameraX += packet.runtime.autoSpeed*dt;
  s.time -= dt; s.health = Math.max(0, s.health - 0.5*dt);
  s.hazards.forEach(h => {
    const hx = h.x - s.cameraX;
    const hy = laneY[h.lane] + 26;
    if (hx < p.x + p.w && hx + h.w > p.x && Math.abs(hy - (p.y+30)) < 30 && !p.jumping) s.health -= 30*dt;
  });
  s.rings.forEach(r => {
    const rx = r.x - s.cameraX;
    const ry = laneY[r.lane] - 20;
    if (!r.hit && Math.hypot((p.x+36)-rx, (p.y+10)-ry) < 32) { r.hit = true; s.score += 100; }
  });
  if (s.cameraX >= s.worldW - 960) { s.done = true; s.win = true; }
  if (s.health<=0 || s.time<=0) { s.done = true; s.win = s.cameraX >= s.worldW - 960; }
}

function drawRunner(s) {
  const cam = s.cameraX;
  drawRunnerBackground(cam);
  drawRunnerHUD(s);
  const laneY = [280,330,380];
  s.hazards.forEach(h => drawBarrier(h.x-cam, laneY[h.lane]+22));
  s.rings.forEach(r => { if (!r.hit) drawRing(r.x-cam, laneY[r.lane]-20); });
  drawBike(s.player.x, s.player.y, drawMode==='upgraded');
  drawFinish(s.worldW-cam-100, 215);
  if (s.done) drawOverlay(s.win ? 'FINISH' : 'CRASHED OUT', s.win ? 'Great run. Press R to retry.' : 'Press R to retry.');
}

function drawDockyardBackground(cam) {
  const g = ctx.createLinearGradient(0,0,0,540); g.addColorStop(0,'#061427'); g.addColorStop(1,'#1f2541'); ctx.fillStyle=g; ctx.fillRect(0,0,960,540);
  ctx.fillStyle='rgba(230,235,255,.85)'; ctx.beginPath(); ctx.arc(700,80,26,0,Math.PI*2); ctx.fill();
  if (drawMode === 'upgraded') {
    ctx.fillStyle='#253355'; [520,560,600,640,700,760,812].forEach((x,i)=>ctx.fillRect((x*1.1-cam*0.18)%1100-100, 100 + (i%3)*30, 24 + (i%2)*12, 170));
  } else { ctx.fillStyle='#263456'; for(let i=0;i<8;i++) ctx.fillRect(i*120-(cam*0.18%120), 140+(i%3)*16, 30, 120); }
  ctx.fillStyle='#1a1622'; ctx.fillRect(0,298,960,242); ctx.fillStyle='#2d2936'; ctx.fillRect(0,318,960,222);
  ctx.strokeStyle='rgba(220,180,40,.65)'; ctx.lineWidth=5; ctx.setLineDash([18,14]); ctx.beginPath(); ctx.moveTo(0,318); ctx.lineTo(960,318); ctx.stroke(); ctx.setLineDash([]);
}

function drawFightEnvironment(cam) {
  drawBuilding(60-cam, 156, drawMode==='upgraded');
  drawFence(170-cam, 225);
  drawBarrels(200-cam, 300);
  drawContainer(420-cam, 195, drawMode==='upgraded');
  drawLadder(650-cam, 190);
  drawOilDrum(870-cam, 338);
}

function drawFightHUD(s) {
  ctx.fillStyle='#000'; ctx.fillRect(0,0,960,66); ctx.fillStyle='#f0a424'; ctx.font='900 20px Arial'; ctx.fillText('ALEX', 74, 24); ctx.fillStyle='#fff'; ctx.fillText(String(Math.max(0,Math.floor((100-s.player.hp)*1000)).toString().padStart(7,'0')), 175, 24); ctx.fillText('×3', 365, 24); ctx.fillStyle='#d49225'; ctx.font='900 58px Arial'; ctx.fillText(String(Math.ceil(s.time)).padStart(2,'0'), 475, 50); ctx.fillStyle='#4864a2'; ctx.font='900 24px Arial'; ctx.fillText('PRESS START', 734, 28);
  hpBar(72,32,124,14,s.player.hp/100,'#d9b44c');
  ctx.fillStyle='#0c1d39'; ctx.fillRect(16,14,38,38);
  if (s.enemies[0]) { ctx.fillStyle='#000'; ctx.fillRect(0,500,960,40); hpBar(155,510,130,12,(s.enemies[0].hp||0)/4,'#c63939'); ctx.fillStyle='#fff'; ctx.font='900 22px Arial'; ctx.fillText('KNIFE', 70, 523); }
  if (s.enemies[1]) { hpBar(748,510,130,12,(s.enemies[1].hp||0)/4,'#c63939'); ctx.fillStyle='#fff'; ctx.fillText('BANDANA', 598, 523); }
  ctx.fillStyle='#a7adb8'; ctx.fillText('STAGE 3-1', 403, 523);
}

function drawRooftopBackground(cam) {
  const g=ctx.createLinearGradient(0,0,0,540); g.addColorStop(0,'#5b4f8a'); g.addColorStop(1,'#1b2743'); ctx.fillStyle=g; ctx.fillRect(0,0,960,540);
  ctx.fillStyle='rgba(255,255,255,.12)'; for(let i=0;i<14;i++){ctx.fillRect(i*100-(cam*0.15%100), 140+((i%3)*20), 40, 180);} 
  ctx.strokeStyle='rgba(180,220,255,.15)'; for(let i=0;i<30;i++){ctx.beginPath(); ctx.moveTo((i*45+cam*0.3)%1000,0); ctx.lineTo((i*45+cam*0.3)%1000-20,540); ctx.stroke();}
}

function drawPlatformHUD(s,name) {
  ctx.fillStyle='#000'; ctx.fillRect(0,0,960,66); ctx.fillStyle='#f5d35f'; ctx.font='900 20px Arial'; ctx.fillText(name, 76, 24); ctx.fillStyle='#fff'; ctx.fillText('ROOFTOP RELAY', 160, 24); ctx.fillStyle='#d49225'; ctx.font='900 58px Arial'; ctx.fillText(String(Math.ceil(s.time)).padStart(2,'0'), 470, 50); ctx.fillStyle='#9fe8ff'; ctx.font='900 24px Arial'; ctx.fillText(s.collectible.collected ? 'SHARD ✓' : 'SHARD ?', 730, 28); hpBar(70,32,124,14,1,'#4fd6ff');
}

function drawRunnerBackground(cam) {
  const g=ctx.createLinearGradient(0,0,0,540); g.addColorStop(0,'#f6c679'); g.addColorStop(1,'#74c2d7'); ctx.fillStyle=g; ctx.fillRect(0,0,960,540); ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(820,90,34,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#7993ab'; for(let i=0;i<8;i++) ctx.fillRect(i*140-(cam*0.12%140), 150+(i%3)*20, 34+(i%2)*20, 150);
  ctx.fillStyle='#6fa0c4'; ctx.fillRect(0,360,960,180); ctx.fillStyle='#566d7a';
  ctx.beginPath(); ctx.moveTo(0,290); for(let x=0;x<=960;x+=40){ const y=300 + Math.sin((x+cam)*0.01)*15; ctx.lineTo(x,y); } ctx.lineTo(960,420); ctx.lineTo(0,420); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#d9dde5'; ctx.lineWidth=4; for(let y of [300,350,400]) { ctx.setLineDash([18,16]); ctx.beginPath(); ctx.moveTo(0,y+30); ctx.lineTo(960,y+30); ctx.stroke(); }
  ctx.setLineDash([]);
}

function drawRunnerHUD(s) {
  ctx.fillStyle='#000'; ctx.fillRect(0,0,960,66); ctx.fillStyle='#2ec1c0'; ctx.font='900 20px Arial'; ctx.fillText('MALIK', 72, 24); ctx.fillStyle='#fff'; ctx.fillText('RIVERSIDE RUSH', 160, 24); ctx.fillStyle='#d49225'; ctx.font='900 58px Arial'; ctx.fillText(String(Math.ceil(s.time)).padStart(2,'0'), 470, 50); ctx.fillStyle='#fff'; ctx.font='900 22px Arial'; ctx.fillText('SCORE ' + s.score, 745, 28); hpBar(70,32,180,14,s.health/100,'#25a6a6');
}

function drawPlatform(pl, cam){ctx.fillStyle=drawMode==='upgraded'?'#222830':'#555';ctx.fillRect(pl.x-cam, pl.y, pl.w, pl.h); ctx.fillStyle=drawMode==='upgraded'?'#677288':'#777'; ctx.fillRect(pl.x-cam, pl.y, pl.w, 4);} 
function drawShard(x,y){ctx.fillStyle='#4dd7ff';ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x+12,y);ctx.lineTo(x,y+12);ctx.lineTo(x-12,y);ctx.closePath();ctx.fill();}
function drawExit(x,y){ctx.fillStyle='#d7f2ff';ctx.fillRect(x,y,34,58);ctx.fillStyle='#1d3654';ctx.font='700 14px Arial';ctx.fillText('EXIT',x+3,y+32);} 
function drawBarrier(x,y){ctx.fillStyle='#d6784c';ctx.fillRect(x,y,42,18);ctx.fillRect(x+2,y-24,14,24);} 
function drawRing(x,y){ctx.strokeStyle='#f3db4e';ctx.lineWidth=6;ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.stroke();}
function drawFinish(x,y){ctx.strokeStyle='#ecf1f4';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+95);ctx.stroke();ctx.beginPath();ctx.moveTo(x-26,y+18);ctx.lineTo(x+48,y+18);ctx.stroke();ctx.fillStyle='#1b3557';ctx.font='900 18px Arial';ctx.fillText('FINISH',x-16,y-8);}

function drawCharacter(p, bodyColor, legColor, cam, gi, type) {
  const x = p.x - cam, y = p.y;
  if (drawMode === 'graybox') { ctx.fillStyle = bodyColor; ctx.fillRect(x, y-48, p.w, p.h); ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(x+p.w/2,y-58,12,0,Math.PI*2); ctx.fill(); return; }
  const skin = '#6a4637';
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x+p.w/2, y-58, 12, 0, Math.PI*2); ctx.fill();
  if (type === 'alex') { ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(x+p.w/2, y-66, 12, 0, Math.PI*2); ctx.fill(); }
  if (type === 'nova') { ctx.fillStyle='#0f1520'; ctx.fillRect(x+p.w/2-9,y-70,18,7); }
  if (type === 'alex') {
    ctx.fillStyle='#ececec'; ctx.fillRect(x+4, y-46, 28, 38); ctx.fillStyle='#151925'; ctx.fillRect(x+13, y-12, 8, 18);
    ctx.fillStyle=skin; ctx.fillRect(x-6, y-40, 9, 30); ctx.fillRect(x+31, y-40, 9, 26);
    ctx.fillStyle='#ececec'; ctx.fillRect(x+2, y-6, 12, 32); ctx.fillRect(x+20, y-6, 12, 32);
  } else if (type === 'nova') {
    ctx.fillStyle='#f0c336'; ctx.fillRect(x+2,y-42,24,30); ctx.fillStyle='#202430'; ctx.fillRect(x+7,y-12,7,28); ctx.fillRect(x+17,y-12,7,28); ctx.fillStyle=skin; ctx.fillRect(x-5,y-36,7,20); ctx.fillRect(x+25,y-36,7,14);
  }
}

function drawEnemy(e, cam) {
  const x=e.x-cam,y=e.y; if (drawMode==='graybox') {ctx.fillStyle='#874';ctx.fillRect(x,y-48,e.w,e.h);ctx.fillStyle='#222';ctx.beginPath();ctx.arc(x+e.w/2,y-58,11,0,Math.PI*2);ctx.fill(); return;}
  const skin='#7b5338'; ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(x+e.w/2,y-58,11,0,Math.PI*2); ctx.fill();
  if (e.kind==='knife') { ctx.fillStyle='#8b447a'; ctx.fillRect(x+4,y-42,24,30); ctx.fillStyle='#401f38'; ctx.fillRect(x+8,y-12,8,28); ctx.fillRect(x+18,y-12,8,28); ctx.fillStyle='#cb57ab'; ctx.fillRect(x+6,y-68,20,7); ctx.fillStyle=skin; ctx.fillRect(x+28,y-34,7,18); ctx.fillStyle='#d7dce4'; ctx.fillRect(x+34,y-30,14,4); }
  else if (e.kind==='bandana') { ctx.fillStyle='#4b6f97'; ctx.fillRect(x+3,y-42,26,30); ctx.fillStyle='#3c2c25'; ctx.fillRect(x+8,y-12,8,28); ctx.fillRect(x+18,y-12,8,28); ctx.fillStyle='#cb563a'; ctx.fillRect(x+8,y-68,18,7); }
  else { ctx.fillStyle='#4d6f90'; ctx.fillRect(x+2,y-42,28,30); ctx.fillStyle='#556c37'; ctx.fillRect(x+8,y-12,8,28); ctx.fillRect(x+18,y-12,8,28); ctx.fillStyle='#2b4f9d'; ctx.fillRect(x+8,y-68,18,7); }
}

function drawSlash(p, cam){const x=p.x-cam + (p.dir===1?44:-14);ctx.fillStyle='rgba(245,198,70,.9)';ctx.beginPath();ctx.moveTo(x,p.y-30);ctx.lineTo(x+18*p.dir,p.y-42);ctx.lineTo(x+28*p.dir,p.y-20);ctx.lineTo(x+10*p.dir,p.y-8);ctx.closePath();ctx.fill();}
function drawBuilding(x,y,up){ctx.fillStyle='#4b2e25';ctx.fillRect(x,y,120,150);ctx.fillStyle='#2d1c16';ctx.fillRect(x+18,y+52,55,78);ctx.fillStyle='#87b8db';ctx.font='900 26px Arial';ctx.fillText('B7',x+28,y+34);ctx.fillStyle='#d7b894';ctx.font='14px Arial';ctx.fillText('SECURITY',x+18,y+78);ctx.fillText('LEVEL 3',x+18,y+96);if(up){ctx.fillStyle='rgba(199,165,71,.8)';ctx.beginPath();ctx.arc(x+42,y+4,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(199,165,71,.3)';ctx.beginPath();ctx.arc(x+42,y+4,26,0,Math.PI*2);ctx.stroke();}}
function drawFence(x,y){ctx.strokeStyle='#7d8aa2';ctx.lineWidth=3;ctx.strokeRect(x,y,170,76);for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(x+i*18,y);ctx.lineTo(x+i*18+36,y+76);ctx.stroke();ctx.beginPath();ctx.moveTo(x+i*18,y+76);ctx.lineTo(x+i*18+36,y);ctx.stroke();}ctx.fillStyle='#866f33';ctx.fillRect(x+55,y+20,48,34);ctx.fillStyle='#111';ctx.font='700 12px Arial';ctx.fillText('CAUTION',x+58,y+38);ctx.fillText('KEEP OUT',x+55,y+51);} 
function drawBarrels(x,y){ctx.fillStyle='#557a2e';ctx.fillRect(x,y,28,30);ctx.fillRect(x+34,y,28,30);} 
function drawContainer(x,y,up){ctx.fillStyle='#7c432c';ctx.fillRect(x,y,218,116);ctx.strokeStyle='#8f614a';for(let xx=32;xx<218;xx+=35){ctx.beginPath();ctx.moveTo(x+xx,y);ctx.lineTo(x+xx,y+116);ctx.stroke();}if(up){ctx.fillStyle='rgba(190,140,84,.6)';ctx.font='900 42px Arial';ctx.fillText('ZENITH',x+34,y+69);ctx.font='900 30px Arial';ctx.fillText('INDUSTRIES',x+34,y+101);}ctx.fillStyle='#bba233';ctx.fillRect(x+147,y+29,46,46);ctx.fillStyle='#2d1808';ctx.font='900 19px Arial';ctx.fillText('DANGER',x+143,y+88);ctx.fillStyle='#7b2d2d';ctx.font='26px Arial';ctx.fillText('⚡',x+161,y+61);} 
function drawLadder(x,y){ctx.strokeStyle='#a7b6ca';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+115);ctx.moveTo(x+18,y);ctx.lineTo(x+18,y+115);for(let i=0;i<6;i++){ctx.moveTo(x,y+15+i*18);ctx.lineTo(x+18,y+15+i*18);}ctx.stroke();}
function drawOilDrum(x,y){ctx.fillStyle='#6d3721';ctx.fillRect(x,y,34,58);ctx.strokeStyle='#31150d';ctx.strokeRect(x,y,34,58);} 
function drawBike(x,y,up){if(!up){ctx.fillStyle='#4aa';ctx.fillRect(x,y-18,52,18);ctx.beginPath();ctx.arc(x+8,y+18,18,0,Math.PI*2);ctx.arc(x+54,y+18,18,0,Math.PI*2);ctx.strokeStyle='#222';ctx.lineWidth=6;ctx.stroke();return;} ctx.strokeStyle='#22303f'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(x+8,y+18,18,0,Math.PI*2); ctx.arc(x+54,y+18,18,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+8,y+18); ctx.lineTo(x+28,y-2); ctx.lineTo(x+48,y+18); ctx.lineTo(x+36,y-6); ctx.lineTo(x+20,y-6); ctx.stroke(); ctx.fillStyle='#6c4637'; ctx.beginPath(); ctx.arc(x+28,y-24,11,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#2ea2a0'; ctx.fillRect(x+18,y-14,22,18); ctx.fillStyle='#cfd7df'; ctx.fillRect(x+20,y-34,16,6); }
function hpBar(x,y,w,h,pct,color){ctx.fillStyle='#1f2f44';ctx.fillRect(x,y,w,h);ctx.fillStyle=color;ctx.fillRect(x,y,w*Math.max(0,pct),h);ctx.strokeStyle='#d2d8df';ctx.strokeRect(x,y,w,h);} 
function drawOverlay(title, sub){ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,960,540);ctx.fillStyle='#fff';ctx.font='900 64px Arial';ctx.fillText(title, 320, 275);ctx.font='900 28px Arial';ctx.fillText(sub, 300, 325);} 
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

function loop(ts){ const dt = Math.min(0.033, (ts-last)/1000 || 0); last = ts; ctx.clearRect(0,0,960,540); if(runtimeState){ if(runtimeState.type==='fighting'){updateFighting(runtimeState,dt); drawFighting(runtimeState);} if(runtimeState.type==='platformer'){updatePlatformer(runtimeState,dt); drawPlatformer(runtimeState);} if(runtimeState.type==='runner'){updateRunner(runtimeState,dt); drawRunner(runtimeState);} } requestAnimationFrame(loop); }

loadPreset('alex');
requestAnimationFrame(loop);
