const PRESETS = {
  alex: {
    title: 'Urban Shipping Clash',
    genre: 'fighting',
    ref: './assets/ref/alex_dockyard_reference.svg',
    description: `**Description:** [XPLAY REVERSE FORGE — SCREENSHOT TO GAME] The uploaded screenshot is a VISUAL SPECIFICATION, not merely inspiration. EXACT VISUAL BLUEPRINT: preserve the visible composition and spatial relationships as closely as technically possible. PRESERVE: layout, artStyle, camera, palette, levelStructure. Reconstruct visible player scale, camera framing, object relationships, spatial hierarchy, palette, environment grammar, apparent gameplay cues, and major landmarks. Infer only information that is not observable in the screenshot. Any inferred content must extend the screenshot’s established visual and gameplay grammar rather than replace it. I see Alex, a Black male character with a prominent afro wearing a white martial arts gi with a black belt and wrist wraps, fighting barefoot; executing an open-palm strike to the right inside an urban shipping dockyard or industrial facility at night featuring a reddish-brown shipping container labeled 'ZENITH INDUSTRIES', yellow 'DANGER' sign, metal ladder, green toxic/chemical barrels behind chain-link fence ('CAUTION KEEP OUT'), brick building entrance ('SECURITY LEVEL 3', room 'B7'), dark night sky with full moon, glowing blue/purple skyline with skyscrapers and industrial cranes, concrete floor with yellow-and-black hazard stripes, drain grates, and rivets. Important visible elements include Shipping container, Yellow 'DANGER' sign, Metal ladder, Green toxic/chemical barrels, Chain-link fence, Caution sign, Exterior lamp, Rusty brown oil drum, Combat knife. The strongest playable cues suggest fighting 95%, platformer 60%, dodge 45%. PLAYER IDENTITY: Alex. USER GAMEPLAY INTENT: Fight visible rivals in the dockyard, preserve the current camera, layout, player scale, palette, HUD language, and major object relationships. Unknown facts remain unknown.`
  },
  nova: {
    title: 'Neon Rooftop Relay',
    genre: 'platformer',
    ref: './assets/ref/nova_rooftop_reference.svg',
    description: `**Description:** [XPLAY VISION — SCREENSHOT TO GAME] The screenshot is a VISUAL SPECIFICATION. Preserve visible composition, camera, palette, player scale, level structure, and object relationships. I see Nova, a Black female rooftop courier wearing a yellow windbreaker, black cargo pants, red sneakers, and a compact backpack, captured mid-jump from a concrete rooftop ledge toward a suspended maintenance platform. The scene is a rainy neon city at dusk with wet reflective rooftops, ventilation fans, antennas, scaffold towers, glowing billboards, a distant elevated train, and narrow gaps between buildings. Important visible elements include three rooftop platforms at different heights, a red warning light, a hanging cable, an AC unit, a collectible blue data shard, a broken railing, and a lit EXIT doorway on the far-right roof. The strongest playable cues suggest platformer 96%, runner 54%, dodge 38%. PLAYER IDENTITY: Nova. USER GAMEPLAY INTENT: Control Nova in a precision side-view platformer. Run and jump across the visible rooftops, collect the blue data shard, avoid falling into gaps, and reach the EXIT doorway. Preserve the current side-view camera, rooftop spacing, vertical platform hierarchy, rainy neon palette, and major landmarks. Unknown facts remain unknown.`
  },
  malik: {
    title: 'Riverside Rush',
    genre: 'runner',
    ref: './assets/ref/malik_riverside_reference.svg',
    description: `**Description:** [XPLAY VISION — SCREENSHOT TO GAME] The screenshot is a VISUAL SPECIFICATION. Preserve visible composition, camera, palette, subject scale, track spacing, and major environmental landmarks. I see Malik, a Black male cyclist wearing a silver helmet, teal racing jersey, black cycling shorts, and white shoes, riding fast from left to right on a riverside elevated bike path at sunrise. The path curves through a modern city with glass towers, trees, orange safety barriers, lane markers, street lamps, and a river visible below. Important visible elements include a broken lane section ahead, three floating yellow checkpoint rings, a low maintenance barrier, a puddle reflecting the skyline, and a finish gantry far in the distance. The strongest playable cues suggest runner 94%, racing 68%, dodge 51%. PLAYER IDENTITY: Malik. USER GAMEPLAY INTENT: Build a forward-scrolling speed runner where Malik automatically advances and the player changes lanes, jumps hazards, and passes through checkpoint rings. Preserve the current side camera, rhythm of obstacles, and sunrise riverside look. Unknown facts remain unknown.`
  }
};

const els = {
  title: document.getElementById('titleInput'), genre: document.getElementById('genreSelect'), presetName: document.getElementById('presetName'), desc: document.getElementById('descriptionInput'),
  parse: document.getElementById('parseBtn'), build: document.getElementById('buildBtn'), triptych: document.getElementById('triptychBtn'), export: document.getElementById('exportBtn'),
  status: document.getElementById('statusBox'), ref: document.getElementById('referenceImage'), statusPill: document.getElementById('statusPill'),
  packetSummary: document.getElementById('packetSummary'), thresholdSummary: document.getElementById('thresholdSummary'), masterPromptOut: document.getElementById('masterPromptOut'),
  preview64: document.getElementById('preview64'), previewPS2: document.getElementById('previewPS2'), previewPC: document.getElementById('previewPC'),
  prompt64: document.getElementById('prompt64'), promptPS2: document.getElementById('promptPS2'), promptPC: document.getElementById('promptPC')
};

let currentPreset = 'alex';
let packet = null;
let runtimeState = null;
let keys = {};
let last = 0;

function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function setStatus(msg,bad=false){els.status.textContent=msg; els.status.style.color = bad ? '#a43737' : '#5f7487'; els.statusPill.textContent = bad ? 'Triptych mode: issue' : 'Triptych mode: ready';}

function loadPreset(name){
  currentPreset = name;
  const p = PRESETS[name];
  els.title.value = p.title;
  els.genre.value = '';
  els.presetName.value = name;
  els.desc.value = p.description;
  els.ref.src = p.ref;
  parseText();
  buildRuntime();
  generateTriptych();
  setStatus(`Loaded ${name} preset and refreshed runtime + style triptych.`, false);
}

document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>loadPreset(btn.dataset.preset)));
els.parse.addEventListener('click', parseText);
els.build.addEventListener('click', buildRuntime);
els.triptych.addEventListener('click', generateTriptych);
els.export.addEventListener('click', exportPacket);
window.addEventListener('keydown', e=>{keys[e.key.toLowerCase()] = true; if (e.key===' ') e.preventDefault(); if (e.key.toLowerCase()==='r') buildRuntime();});
window.addEventListener('keyup', e=>{keys[e.key.toLowerCase()] = false;});

function parseText(){
  const text = els.desc.value.trim();
  const base = PRESETS[currentPreset];
  const forcedGenre = els.genre.value;
  const genre = forcedGenre || detectGenre(text, base.genre);
  const title = els.title.value.trim() || base.title;
  const player = detectPlayer(currentPreset);
  const environment = detectEnvironment(genre);
  const landmarks = detectLandmarks(currentPreset).map((label,i)=>({id:slug(label), label, index:i+1}));
  const enemies = buildEnemies(currentPreset, genre);
  const goals = buildGoals(genre);
  const runtime = buildRuntimeProfile(genre);
  const styles = buildStylePrompts(title, genre, player, environment, landmarks);
  const masterPrompt = buildMasterTriptychPrompt(title, genre, player, environment, landmarks);
  packet = {
    title, genre, preset: currentPreset, sourceDescription: text,
    player, environment, landmarks, enemies, goals, runtime,
    thresholdChecks: { usesFreshPage:true, avoidsLegacyAssets:true, gameplayLocked:true, threeVisualTargets:true, targetRuntimeSeconds: runtime.targetSeconds },
    masterPrompt, styles
  };
  els.packetSummary.innerHTML = `<strong>${packet.genre}</strong> · ${packet.player.name} · ${packet.landmarks.length} landmarks · ${packet.enemies.length} enemies/hazards`;
  els.thresholdSummary.innerHTML = `Fresh path: yes<br>Legacy asset loop: removed<br>Three style outputs: enabled<br>Target duration: ${runtime.targetSeconds}s`;
  els.masterPromptOut.textContent = packet.masterPrompt;
  setStatus(`Parsed description into a locked ${genre} packet with three visual targets.`, false);
}

function detectGenre(text, fallback){ const t=text.toLowerCase(); if(/platformer|rooftop|jump across/.test(t)) return 'platformer'; if(/runner|cycling|auto-advance|checkpoint rings/.test(t)) return 'runner'; if(/fighting|beat.?em.?up|fight visible rivals/.test(t)) return 'fighting'; return fallback; }
function detectPlayer(preset){ if(preset==='alex') return {name:'Alex', identity:'Black male martial artist', outfit:['white gi','black belt','wrist wraps','barefoot'], accent:'afro'}; if(preset==='nova') return {name:'Nova', identity:'Black female courier', outfit:['yellow windbreaker','black cargo pants','red sneakers','compact backpack'], accent:'agile rooftop silhouette'}; return {name:'Malik', identity:'Black male cyclist', outfit:['silver helmet','teal racing jersey','cycling shorts','white shoes'], accent:'bike posture'}; }
function detectEnvironment(genre){ if(genre==='fighting') return {location:'urban dockyard at night', palette:['deep blue','rust red','yellow hazard','industrial gray'], mood:'industrial combat tension', camera:'2D side-view'}; if(genre==='platformer') return {location:'rainy neon rooftops at dusk', palette:['violet dusk','blue neon','wet gray concrete'], mood:'nimble rooftop traversal', camera:'2D side-view'}; return {location:'sunrise riverside bike path', palette:['gold sunrise','teal river','steel gray roadway'], mood:'speed and momentum', camera:'2D side-view'}; }
function detectLandmarks(preset){ if(preset==='alex') return ['ZENITH INDUSTRIES container','DANGER sign','metal ladder','green barrels','chain-link fence','security building B7','moon skyline','hazard-striped floor']; if(preset==='nova') return ['stacked rooftops','hanging cable','AC unit','blue shard','broken railing','EXIT doorway','warning light','distant train']; return ['curving bike path','checkpoint rings','maintenance barrier','river','finish gantry','street lamps','puddle','city skyline']; }
function buildEnemies(preset, genre){ if(preset==='alex') return [{name:'Knife Punk', role:'melee left rival'},{name:'Bandana Bruiser', role:'center-right rival'},{name:'Dock Bruiser', role:'far-right rival'}]; if(genre==='platformer') return [{name:'fall gaps', role:'platform hazard'}]; return [{name:'lane barrier set', role:'runner hazards'}]; }
function buildGoals(genre){ if(genre==='fighting') return ['Defeat the visible rivals.','Survive long enough for a readable encounter.','Preserve the screenshot-style combat plane.']; if(genre==='platformer') return ['Traverse the rooftops.','Collect the blue shard.','Reach the EXIT doorway.']; return ['Advance automatically.','Dodge hazards.','Pass through checkpoint rings and reach the finish.']; }
function buildRuntimeProfile(genre){ if(genre==='fighting') return {targetSeconds:20, worldWidth:2200, scroll:true, passivePlayerDrain:0.8, playerSpeed:180, enemySpeed:90}; if(genre==='platformer') return {targetSeconds:20, worldWidth:2400, scroll:true, gravity:1800, runSpeed:210, jumpVelocity:620}; return {targetSeconds:20, worldWidth:2600, scroll:true, autoSpeed:250, laneCount:3, jumpVelocity:520}; }

function buildMasterTriptychPrompt(title, genre, player, env, landmarks){
  return `[XPLAY STYLE TRIPTYCH UPGRADE]\nTitle: ${title}\nGenre: ${genre}\nMission: Reinterpret one locked gameplay packet into three visual eras while keeping gameplay rules, timing, player identity, enemy roles, major landmarks, and camera logic intact.\nPreserve: ${env.camera}, core layout, encounter spacing, win/loss conditions, movement readability, and landmarks (${landmarks.map(x=>x.label).join(', ')}).\nPlayer: ${player.name}, ${player.identity}, cues: ${player.outfit.join(', ')}.\nEnvironment: ${env.location}. Palette anchor: ${env.palette.join(', ')}. Mood: ${env.mood}.\nOutput required: (1) 64-bit interpretation, (2) PlayStation 2 interpretation, (3) modern PC interpretation. Only upgrade the visual layer; do not change gameplay structure.`;
}

function buildStylePrompts(title, genre, player, env, landmarks){
  const base = `Title: ${title}\nGenre: ${genre}\nPlayer: ${player.name}, ${player.identity}, cues: ${player.outfit.join(', ')}.\nEnvironment: ${env.location}. Preserve landmarks: ${landmarks.map(x=>x.label).join(', ')}. Keep gameplay unchanged.`;
  return {
    n64: `[XPLAY VISUAL TARGET — 64-BIT]\n${base}\nVisual target: late-90s 64-bit console style. Use chunky silhouettes, low-poly forms, simplified textures, bold color blocking, light vertex shading, foggy depth, and readable arcade HUD energy. Preserve the same camera and encounter composition.` ,
    ps2: `[XPLAY VISUAL TARGET — PLAYSTATION 2]\n${base}\nVisual target: early-2000s PlayStation 2 era action-game graphics. Use more defined 3D geometry, richer stage props, stronger texture work, sharper silhouettes, baked lighting feel, and more animated environmental detail while keeping the same side-view play logic.` ,
    modern: `[XPLAY VISUAL TARGET — MODERN PC]\n${base}\nVisual target: contemporary PC graphics. Use high-fidelity materials, dynamic lighting, improved character readability, denser background detail, atmospheric depth, and polished VFX. Preserve gameplay lanes, platform spacing, collision readability, and the same core composition.`
  };
}

function generateTriptych(){
  if(!packet) parseText();
  els.prompt64.textContent = packet.styles.n64;
  els.promptPS2.textContent = packet.styles.ps2;
  els.promptPC.textContent = packet.styles.modern;
  els.preview64.src = makePreview('n64', packet);
  els.previewPS2.src = makePreview('ps2', packet);
  els.previewPC.src = makePreview('modern', packet);
  setStatus('Generated three visual style outputs: 64-bit, PlayStation 2, and modern PC.', false);
}

function exportPacket(){
  if(!packet) parseText();
  const blob = new Blob([JSON.stringify(packet, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(packet.title)}-triptych-packet.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function esc(s){return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

function makePreview(style, packet){
  const p = packet;
  const themes = {
    n64: {bg1:'#15234b',bg2:'#2c3e78',ground:'#4a3f53',accent:'#d4ad4b',card:'#2d5a7f',container:'#91543b',fog:'rgba(255,255,255,.08)', label:'64-BIT'},
    ps2: {bg1:'#0c1838',bg2:'#243868',ground:'#403845',accent:'#f2b533',card:'#4c84b8',container:'#83462d',fog:'rgba(255,255,255,.05)', label:'PS2'},
    modern: {bg1:'#070e1d',bg2:'#263460',ground:'#352f39',accent:'#ffc63d',card:'#86b9ff',container:'#713b27',fog:'rgba(255,180,80,.08)', label:'MODERN PC'}
  };
  const t = themes[style];
  const title = esc(p.title);
  const player = esc(p.player.name.toUpperCase());
  const leftEnemy = esc((p.enemies[0]||{name:'RIVAL'}).name.toUpperCase());
  const rightEnemy = esc((p.enemies[1]||p.enemies[0]||{name:'RIVAL'}).name.toUpperCase());

  let scene = '';
  if (p.genre === 'fighting') {
    scene = `
      <rect x="0" y="0" width="960" height="540" fill="url(#sky)"/>
      <circle cx="720" cy="76" r="24" fill="rgba(255,255,255,.8)"/>
      <g opacity=".9">
        <rect x="20" y="0" width="920" height="72" fill="#050608"/>
        <rect x="28" y="18" width="64" height="42" fill="#143056" rx="2"/>
        <text x="110" y="30" fill="#dce7ff" font-size="18" font-weight="900">${player}</text>
        <rect x="110" y="38" width="182" height="14" fill="#203458" rx="2"/><rect x="110" y="38" width="154" height="14" fill="#efc34b" rx="2"/>
        <rect x="110" y="58" width="142" height="10" fill="#203458" rx="2"/><rect x="110" y="58" width="102" height="10" fill="#4db8ff" rx="2"/>
        <text x="400" y="34" fill="#fff" font-size="22" font-weight="900">0124500</text>
        <text x="510" y="34" fill="#fff" font-size="20" font-weight="900">×3</text>
        <text x="610" y="34" fill="#ffc83c" font-size="54" font-weight="900">74</text>
        <text x="770" y="34" fill="#dce7ff" font-size="22" font-weight="900">PRESS START</text>
      </g>
      <g opacity=".35">
        <rect x="40" y="146" width="30" height="140" fill="#263d6c"/>
        <rect x="98" y="120" width="36" height="166" fill="#2d467a"/>
        <rect x="164" y="156" width="26" height="130" fill="#253d6a"/>
        <rect x="730" y="110" width="32" height="176" fill="#28467c"/>
        <rect x="780" y="136" width="22" height="150" fill="#314e8a"/>
        <rect x="830" y="102" width="40" height="184" fill="#2d4678"/>
      </g>
      <rect x="0" y="310" width="960" height="230" fill="#312b37"/>
      <rect x="0" y="330" width="960" height="210" fill="${t.ground}"/>
      <line x1="0" y1="330" x2="960" y2="330" stroke="#c9ab44" stroke-width="6" stroke-dasharray="24 18" opacity=".75"/>
      <g>
        <rect x="50" y="160" width="128" height="160" fill="#543225"/>
        <rect x="74" y="216" width="58" height="82" fill="#2b1a14"/>
        <text x="80" y="204" fill="#c7af88" font-size="16" font-weight="700">SECURITY</text>
        <text x="84" y="224" fill="#c7af88" font-size="16" font-weight="700">LEVEL 3</text>
        <rect x="62" y="172" width="46" height="38" fill="#1c4f73" rx="2"/>
        <text x="74" y="199" fill="#bde1ff" font-size="26" font-weight="900">B7</text>
      </g>
      <g><rect x="190" y="230" width="182" height="88" fill="none" stroke="#9ab3d1" stroke-width="4"/>
        <path d="M190 230 L372 318 M372 230 L190 318 M212 230 L394 318 M394 230 L212 318" stroke="#8aa3c0" stroke-width="3" opacity=".8"/>
        <rect x="245" y="248" width="78" height="48" fill="#7b6a33" opacity=".95"/><text x="253" y="270" fill="#1a1a1a" font-size="16" font-weight="900">CAUTION</text><text x="250" y="288" fill="#1a1a1a" font-size="16" font-weight="900">KEEP OUT</text></g>
      <rect x="255" y="292" width="34" height="36" fill="#4f6c2e"/><rect x="295" y="292" width="34" height="36" fill="#4f6c2e"/>
      <g><rect x="420" y="198" width="278" height="132" fill="${t.container}"/>
        <line x1="450" y1="198" x2="450" y2="330" stroke="#9d6a4e"/><line x1="490" y1="198" x2="490" y2="330" stroke="#9d6a4e"/><line x1="530" y1="198" x2="530" y2="330" stroke="#9d6a4e"/><line x1="570" y1="198" x2="570" y2="330" stroke="#9d6a4e"/><line x1="610" y1="198" x2="610" y2="330" stroke="#9d6a4e"/>
        <text x="472" y="262" fill="rgba(232,201,141,.55)" font-size="56" font-weight="900">ZENITH</text>
        <text x="482" y="304" fill="rgba(232,201,141,.55)" font-size="34" font-weight="900">INDUSTRIES</text>
        <rect x="612" y="228" width="56" height="56" fill="#ba9b2e"/>
        <text x="618" y="292" fill="#2b180e" font-size="18" font-weight="900">DANGER</text>
        <text x="633" y="262" fill="#8d3a20" font-size="34" font-weight="900">⚡</text></g>
      <g stroke="#9ab3d1" stroke-width="4"><line x1="710" y1="198" x2="710" y2="324"/><line x1="730" y1="198" x2="730" y2="324"/>
        <line x1="710" y1="216" x2="730" y2="216"/><line x1="710" y1="236" x2="730" y2="236"/><line x1="710" y1="256" x2="730" y2="256"/><line x1="710" y1="276" x2="730" y2="276"/><line x1="710" y1="296" x2="730" y2="296"/></g>
      <rect x="862" y="344" width="40" height="72" fill="#753b23" rx="3"/>
      <g opacity=".92">${drawFigure('enemy-left', 156, 373, style, 'knife')} ${drawFigure('player', 420, 374, style, 'hero')} ${drawFigure('enemy-mid', 650, 369, style, 'bandana')} ${drawFigure('enemy-right', 826, 370, style, 'bruiser')}</g>
      <polygon points="570,300 600,270 624,302 592,330" fill="#ffd048" opacity=".95"/>
      <g opacity=".9"><rect x="0" y="500" width="960" height="40" fill="#000"/>
      <text x="68" y="526" fill="#fff" font-size="22" font-weight="900">${leftEnemy}</text><rect x="170" y="510" width="150" height="14" fill="#203458"/><rect x="170" y="510" width="124" height="14" fill="#cb3a3a"/>
      <text x="414" y="526" fill="#b3bac3" font-size="22" font-weight="900">STAGE 3-1</text>
      <text x="615" y="526" fill="#fff" font-size="22" font-weight="900">${rightEnemy}</text><rect x="780" y="510" width="140" height="14" fill="#203458"/><rect x="780" y="510" width="118" height="14" fill="#cb3a3a"/></g>
      <rect x="0" y="0" width="960" height="540" fill="${t.fog}"/>
      <rect x="720" y="18" rx="13" ry="13" width="196" height="34" fill="rgba(7,11,22,.6)" stroke="rgba(255,255,255,.15)"/><text x="738" y="41" fill="#dfe9ff" font-size="18" font-weight="900">${t.label} VISUAL TARGET</text>
    `;
  } else if (p.genre === 'platformer') {
    scene = `
      <rect x="0" y="0" width="960" height="540" fill="url(#sky)"/>
      <rect x="0" y="0" width="960" height="72" fill="#050608"/>
      <text x="60" y="34" fill="#f0d15a" font-size="22" font-weight="900">${player}</text>
      <text x="186" y="34" fill="#fff" font-size="20" font-weight="900">ROOFTOP RELAY</text>
      <text x="470" y="46" fill="#f4be37" font-size="56" font-weight="900">20</text>
      <text x="760" y="34" fill="#9ee8ff" font-size="20" font-weight="900">SHARD ?</text>
      <g opacity=".18"><rect x="50" y="120" width="50" height="220" fill="#fff"/><rect x="132" y="142" width="38" height="198" fill="#d7e4ff"/><rect x="220" y="100" width="56" height="240" fill="#fff"/><rect x="788" y="126" width="42" height="214" fill="#fff"/></g>
      <g>${platformScene(style)}</g>
      <rect x="0" y="0" width="960" height="540" fill="${t.fog}"/>
      <rect x="720" y="18" rx="13" ry="13" width="196" height="34" fill="rgba(7,11,22,.6)" stroke="rgba(255,255,255,.15)"/><text x="738" y="41" fill="#dfe9ff" font-size="18" font-weight="900">${t.label} VISUAL TARGET</text>
    `;
  } else {
    scene = `
      <rect x="0" y="0" width="960" height="540" fill="url(#sky)"/>
      <rect x="0" y="0" width="960" height="72" fill="#050608"/>
      <text x="60" y="34" fill="#2dd0c8" font-size="22" font-weight="900">${player}</text>
      <text x="170" y="34" fill="#fff" font-size="20" font-weight="900">RIVERSIDE RUSH</text>
      <text x="470" y="46" fill="#f4be37" font-size="56" font-weight="900">20</text>
      <text x="772" y="34" fill="#fff" font-size="20" font-weight="900">SCORE 000</text>
      <g>${runnerScene(style)}</g>
      <rect x="0" y="0" width="960" height="540" fill="${t.fog}"/>
      <rect x="720" y="18" rx="13" ry="13" width="196" height="34" fill="rgba(7,11,22,.6)" stroke="rgba(255,255,255,.15)"/><text x="738" y="41" fill="#dfe9ff" font-size="18" font-weight="900">${t.label} VISUAL TARGET</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${t.bg1}"/><stop offset="100%" stop-color="${t.bg2}"/></linearGradient>
    </defs>
    ${scene}
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function drawFigure(id, x, y, style, type){
  const cfg = {
    n64: {scale:1, stroke:'#20242f', sw:4, head:15, torsoW:36, torsoH:42, legW:13, legH:44, armW:12, armH:34, outline:true},
    ps2: {scale:1.04, stroke:'#1a2230', sw:3, head:14, torsoW:34, torsoH:44, legW:12, legH:46, armW:10, armH:32, outline:false},
    modern: {scale:1.08, stroke:'#101722', sw:2, head:13, torsoW:32, torsoH:46, legW:11, legH:48, armW:9, armH:34, outline:false}
  }[style];
  const skins = {hero:'#6d4a36', knife:'#825239', bandana:'#825239', bruiser:'#7a5238'};
  const outfits = {
    hero:{top:'#f1efe8', legs:'#f1efe8', hair:'#13151b', accent:'#13151b'},
    knife:{top:'#4f282a', legs:'#7a335f', hair:'#d544aa', accent:'#d7dce4'},
    bandana:{top:'#406890', legs:'#463a37', hair:'#d65f42', accent:'#ffcb4d'},
    bruiser:{top:'#477198', legs:'#556a37', hair:'#2f56a4', accent:'#d5b65c'}
  }[type];
  const s=cfg.scale, tW=cfg.torsoW*s, tH=cfg.torsoH*s, lW=cfg.legW*s, lH=cfg.legH*s, aW=cfg.armW*s, aH=cfg.armH*s, r=cfg.head*s;
  const ox = x, oy = y;
  const outline = cfg.outline ? `stroke="${cfg.stroke}" stroke-width="${cfg.sw}"` : '';
  return `<g id="${id}">
    <circle cx="${ox}" cy="${oy-76*s}" r="${r}" fill="${skins[type]}" ${outline}/>
    ${type==='hero' ? `<ellipse cx="${ox}" cy="${oy-84*s}" rx="${16*s}" ry="${14*s}" fill="${outfits.hair}"/>` : `<rect x="${ox-10*s}" y="${oy-88*s}" width="${20*s}" height="${6*s}" fill="${outfits.hair}" ${outline}/>`}
    <rect x="${ox-tW/2}" y="${oy-60*s}" width="${tW}" height="${tH}" rx="6" fill="${outfits.top}" ${outline}/>
    <rect x="${ox-tW/2-10*s}" y="${oy-56*s}" width="${aW}" height="${aH}" rx="5" fill="${skins[type]}" transform="rotate(${type==='hero'?-18:12} ${ox-tW/2-10*s} ${oy-56*s})" ${outline}/>
    <rect x="${ox+tW/2-1*s}" y="${oy-56*s}" width="${aW}" height="${aH}" rx="5" fill="${skins[type]}" transform="rotate(${type==='hero'?80:-16} ${ox+tW/2-1*s} ${oy-56*s})" ${outline}/>
    <rect x="${ox-lW-4*s}" y="${oy-18*s}" width="${lW}" height="${lH}" rx="4" fill="${outfits.legs}" transform="rotate(${type==='hero'?8:2} ${ox-lW-4*s} ${oy-18*s})" ${outline}/>
    <rect x="${ox+3*s}" y="${oy-18*s}" width="${lW}" height="${lH}" rx="4" fill="${outfits.legs}" transform="rotate(${type==='hero'?-8:-2} ${ox+3*s} ${oy-18*s})" ${outline}/>
    ${type==='knife' ? `<rect x="${ox+tW/2+12*s}" y="${oy-36*s}" width="${18*s}" height="${4*s}" fill="#dce0e8" ${outline}/>` : ''}
    ${type==='bandana' ? `<polygon points="${ox+34*s},${oy-22*s} ${ox+60*s},${oy-46*s} ${ox+64*s},${oy-18*s}" fill="#ffcc49"/>` : ''}
  </g>`;
}

function platformScene(style){
  const tone = style==='n64' ? {plat:'#474c5e', edge:'#9aa3bf', hero:'#f1c73d'} : style==='ps2' ? {plat:'#272f39', edge:'#74839c', hero:'#f3d04d'} : {plat:'#1f2733', edge:'#8793ac', hero:'#49d7ff'};
  return `
    <rect x="40" y="390" width="260" height="24" fill="${tone.plat}"/><rect x="40" y="390" width="260" height="4" fill="${tone.edge}"/>
    <rect x="360" y="300" width="140" height="18" fill="${tone.plat}"/><rect x="360" y="300" width="140" height="4" fill="${tone.edge}"/>
    <rect x="560" y="390" width="220" height="24" fill="${tone.plat}"/><rect x="560" y="390" width="220" height="4" fill="${tone.edge}"/>
    <rect x="860" y="345" width="70" height="64" fill="#d7f2ff"/><text x="874" y="381" fill="#183155" font-size="18" font-weight="900">EXIT</text>
    <polygon points="430,260 442,272 430,284 418,272" fill="${tone.hero}"/>
    ${drawFigure('nova', 116, 374, style, 'hero')}
  `;
}

function runnerScene(style){
  const road = style==='n64' ? '#5e6f7e' : style==='ps2' ? '#556877' : '#4d6170';
  const river = style==='modern' ? '#4d8ac3' : '#6a9ec3';
  return `
    <rect x="0" y="290" width="960" height="30" fill="${river}" opacity=".6"/>
    <rect x="0" y="320" width="960" height="180" fill="${road}"/>
    <line x1="0" y1="350" x2="960" y2="350" stroke="#dde5ef" stroke-width="4" stroke-dasharray="20 18" opacity=".8"/>
    <line x1="0" y1="400" x2="960" y2="400" stroke="#dde5ef" stroke-width="4" stroke-dasharray="20 18" opacity=".8"/>
    <circle cx="520" cy="300" r="18" fill="#f1d74e" fill-opacity=".2" stroke="#f1d74e" stroke-width="6"/>
    <circle cx="680" cy="400" r="18" fill="#f1d74e" fill-opacity=".2" stroke="#f1d74e" stroke-width="6"/>
    <circle cx="840" cy="350" r="18" fill="#f1d74e" fill-opacity=".2" stroke="#f1d74e" stroke-width="6"/>
    <rect x="598" y="366" width="44" height="16" fill="#c5754b"/><rect x="612" y="342" width="14" height="24" fill="#c5754b"/>
    <rect x="896" y="210" width="6" height="110" fill="#ecf1f4"/><rect x="870" y="228" width="54" height="8" fill="#ecf1f4"/>
    ${drawBikeFigure(160, 365, style)}
  `;
}

function drawBikeFigure(x,y,style){
  const body = style==='modern' ? '#2fb3b1' : '#3ca3a2';
  const stroke = style==='n64' ? '#1f2a35' : '#243240';
  const width = style==='n64' ? 4 : 3;
  return `
    <g>
      <circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${stroke}" stroke-width="${width+2}"/>
      <circle cx="${x+52}" cy="${y}" r="20" fill="none" stroke="${stroke}" stroke-width="${width+2}"/>
      <polyline points="${x},${y} ${x+20},${y-22} ${x+46},${y} ${x+30},${y-22} ${x+12},${y-22}" fill="none" stroke="${stroke}" stroke-width="${width}"/>
      <circle cx="${x+28}" cy="${y-44}" r="11" fill="#6e4a37"/>
      <rect x="${x+17}" y="${y-34}" width="22" height="18" fill="${body}"/>
      <rect x="${x+19}" y="${y-55}" width="16" height="6" fill="#dfe8ef"/>
    </g>`;
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function buildRuntime(){ if(!packet) parseText(); if(packet.genre==='fighting') runtimeState=createFightingState(); else if(packet.genre==='platformer') runtimeState=createPlatformerState(); else runtimeState=createRunnerState(); setStatus(`Built ${packet.genre} runtime. The visual layers can now be compared across 3 eras.`, false); }
function createFightingState(){ return {type:'fighting', cameraX:0, worldW:packet.runtime.worldWidth, time:packet.runtime.targetSeconds, done:false, win:false, player:{x:220,y:362,w:34,h:74,hp:100,maxHp:100,dir:1,attackCd:0,hitCd:0}, enemies:[{x:130,y:364,w:32,h:68,hp:4,dir:1,kind:'knife'},{x:620,y:360,w:34,h:72,hp:4,dir:-1,kind:'bandana'},{x:880,y:360,w:34,h:72,hp:4,dir:-1,kind:'bruiser'},{x:1160,y:362,w:32,h:68,hp:4,dir:-1,kind:'knife'}] }; }
function createPlatformerState(){ return {type:'platformer', cameraX:0, worldW:packet.runtime.worldWidth, time:packet.runtime.targetSeconds, done:false, win:false, shard:false, player:{x:110,y:325,w:28,h:54,vx:0,vy:0,onGround:false,dir:1}, platforms:[{x:40,y:390,w:260,h:25},{x:360,y:300,w:140,h:18},{x:560,y:390,w:220,h:25},{x:860,y:345,w:160,h:18},{x:1130,y:285,w:150,h:18},{x:1440,y:330,w:210,h:18},{x:1740,y:275,w:170,h:18},{x:2050,y:390,w:220,h:25}], collectible:{x:430,y:260,r:10,collected:false}, exit:{x:2210,y:330,w:40,h:60} }; }
function createRunnerState(){ return {type:'runner', cameraX:0, worldW:packet.runtime.worldWidth, time:packet.runtime.targetSeconds, done:false, win:false, player:{x:120,y:330,w:74,h:44,vy:0,jumping:false,lane:1}, hazards:[{x:560,lane:1,w:46,h:18},{x:860,lane:2,w:54,h:18},{x:1180,lane:0,w:60,h:18},{x:1530,lane:1,w:52,h:18},{x:1880,lane:2,w:48,h:18}], rings:[{x:700,lane:0,r:17,hit:false},{x:1020,lane:2,r:17,hit:false},{x:1350,lane:1,r:17,hit:false},{x:1670,lane:0,r:17,hit:false},{x:2120,lane:1,r:17,hit:false}], score:0, health:100}; }

function updateFighting(s, dt){ if(s.done) return; const p=s.player; const speed=packet.runtime.playerSpeed; if(keys['arrowleft']||keys['a']){p.x-=speed*dt;p.dir=-1;} if(keys['arrowright']||keys['d']){p.x+=speed*dt;p.dir=1;} if(keys['arrowup']||keys['w']) p.y-=100*dt; if(keys['arrowdown']||keys['s']) p.y+=100*dt; p.y=Math.max(330,Math.min(392,p.y)); p.x=Math.max(50,Math.min(s.worldW-70,p.x)); p.attackCd=Math.max(0,p.attackCd-dt); if(p.hitCd>0) p.hitCd-=dt; if((keys[' ']||keys['enter']) && p.attackCd<=0){ p.attackCd=0.45; s.enemies.forEach(e=>{ if(e.hp<=0) return; const dx=e.x-p.x; const inDir=p.dir===1 ? dx>0&&dx<76 : dx<0&&dx>-76; const sameLane=Math.abs(e.y-p.y)<45; if(inDir&&sameLane) e.hp-=1; }); } p.hp-=packet.runtime.passivePlayerDrain*dt; s.enemies.forEach(e=>{ if(e.hp<=0) return; const dx=p.x-e.x, dir=Math.sign(dx)||1; if(Math.abs(dx)>54) e.x += dir*packet.runtime.enemySpeed*dt; if(Math.abs(e.y-p.y)>10) e.y += Math.sign(p.y-e.y)*50*dt; if(Math.abs(dx)<40 && Math.abs(e.y-p.y)<40 && p.hitCd<=0){ p.hp-=10; p.hitCd=0.8; } }); s.enemies=s.enemies.filter(e=>e.hp>0); s.time -= dt; s.cameraX = clamp(p.x-320,0,s.worldW-960); if(s.enemies.length===0){s.done=true;s.win=true;} if(p.hp<=0||s.time<=0){s.done=true;s.win=s.enemies.length===0;} }
function updatePlatformer(s, dt){ if(s.done) return; const p=s.player; const speed=packet.runtime.runSpeed; if(keys['arrowleft']||keys['a']){p.vx=-speed;p.dir=-1;} else if(keys['arrowright']||keys['d']){p.vx=speed;p.dir=1;} else p.vx=0; if((keys['arrowup']||keys['w']||keys[' '])&&p.onGround){p.vy=-packet.runtime.jumpVelocity;p.onGround=false;} p.vy += packet.runtime.gravity*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.onGround=false; s.platforms.forEach(pl=>{ if(p.x+p.w>pl.x&&p.x<pl.x+pl.w&&p.y+p.h>pl.y&&p.y+p.h<pl.y+18&&p.vy>=0){p.y=pl.y-p.h;p.vy=0;p.onGround=true;} }); if(!s.collectible.collected && Math.hypot((p.x+p.w/2)-s.collectible.x,(p.y+p.h/2)-s.collectible.y)<28) s.collectible.collected=true; if(p.x+p.w>s.exit.x && p.y+p.h>s.exit.y && s.collectible.collected){s.done=true;s.win=true;} if(p.y>560){s.done=true;s.win=false;} p.x=clamp(p.x,0,s.worldW-p.w); s.cameraX=clamp(p.x-260,0,s.worldW-960); s.time -= dt; if(s.time<=0){s.done=true;s.win=false;} }
function updateRunner(s, dt){ if(s.done) return; const p=s.player; const laneY=[280,330,380]; if((keys['arrowup']||keys['w'])&&p.lane>0){p.lane--; keys['arrowup']=keys['w']=false;} if((keys['arrowdown']||keys['s'])&&p.lane<2){p.lane++; keys['arrowdown']=keys['s']=false;} if((keys[' ']||keys['enter'])&&!p.jumping){p.vy=-packet.runtime.jumpVelocity; p.jumping=true;} p.vy += 1500*dt; p.y += p.vy*dt; const baseY=laneY[p.lane]; if(p.y>=baseY){p.y=baseY;p.vy=0;p.jumping=false;} s.cameraX += packet.runtime.autoSpeed*dt; s.time -= dt; s.health=Math.max(0,s.health-0.5*dt); s.hazards.forEach(h=>{ const hx=h.x-s.cameraX, hy=laneY[h.lane]+26; if(hx<p.x+p.w && hx+h.w>p.x && Math.abs(hy-(p.y+30))<30 && !p.jumping) s.health -= 30*dt; }); s.rings.forEach(r=>{ const rx=r.x-s.cameraX, ry=laneY[r.lane]-20; if(!r.hit && Math.hypot((p.x+36)-rx,(p.y+10)-ry)<32){r.hit=true;s.score+=100;} }); if(s.cameraX>=s.worldW-960){s.done=true;s.win=true;} if(s.health<=0||s.time<=0){s.done=true;s.win=s.cameraX>=s.worldW-960;} }

function drawOverlay(title, sub){ ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,960,540); ctx.fillStyle='#fff'; ctx.font='900 64px Arial'; ctx.fillText(title, 320, 275); ctx.font='900 28px Arial'; ctx.fillText(sub, 300, 325); }
function hpBar(x,y,w,h,pct,color){ ctx.fillStyle='#1f2f44'; ctx.fillRect(x,y,w,h); ctx.fillStyle=color; ctx.fillRect(x,y,w*Math.max(0,pct),h); ctx.strokeStyle='#d2d8df'; ctx.strokeRect(x,y,w,h); }

function drawFighting(s){ const cam=s.cameraX; drawDockyardBackground(cam); drawFightHUD(s); drawFightEnvironment(cam); drawCharacter(s.player, '#f0efea', '#111', cam, 'hero'); s.enemies.forEach(e=>drawEnemy(e, cam)); if(s.player.attackCd>0.2) drawSlash(s.player, cam); if(s.done) drawOverlay(s.win?'YOU WIN':'YOU LOSE', s.win?'Stage clear. Press R to retry.':'Press R to retry.'); }
function drawPlatformer(s){ const cam=s.cameraX; drawRooftopBackground(cam); drawPlatformHUD(s,'NOVA'); s.platforms.forEach(pl=>drawPlatform(pl, cam)); if(!s.collectible.collected) drawShard(s.collectible.x-cam,s.collectible.y); drawExit(s.exit.x-cam,s.exit.y); drawCharacter(s.player, '#f2c43d', '#202633', cam, 'nova'); if(s.done) drawOverlay(s.win?'DELIVERED':'FAILED', s.win?'Route complete. Press R to retry.':'Press R to retry.'); }
function drawRunner(s){ const cam=s.cameraX; drawRunnerBackground(cam); drawRunnerHUD(s); const laneY=[280,330,380]; s.hazards.forEach(h=>drawBarrier(h.x-cam,laneY[h.lane]+22)); s.rings.forEach(r=>{ if(!r.hit) drawRing(r.x-cam,laneY[r.lane]-20); }); drawBike(s.player.x,s.player.y); drawFinish(s.worldW-cam-100,215); if(s.done) drawOverlay(s.win?'FINISH':'CRASHED OUT', s.win?'Great run. Press R to retry.':'Press R to retry.'); }

function drawDockyardBackground(cam){ const g=ctx.createLinearGradient(0,0,0,540); g.addColorStop(0,'#061427'); g.addColorStop(1,'#1f2541'); ctx.fillStyle=g; ctx.fillRect(0,0,960,540); ctx.fillStyle='rgba(230,235,255,.85)'; ctx.beginPath(); ctx.arc(700,80,26,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#253355'; [520,560,600,640,700,760,812].forEach((x,i)=>ctx.fillRect((x*1.1-cam*0.18)%1100-100, 100 + (i%3)*30, 24 + (i%2)*12, 170)); ctx.fillStyle='#1a1622'; ctx.fillRect(0,298,960,242); ctx.fillStyle='#2d2936'; ctx.fillRect(0,318,960,222); ctx.strokeStyle='rgba(220,180,40,.65)'; ctx.lineWidth=5; ctx.setLineDash([18,14]); ctx.beginPath(); ctx.moveTo(0,318); ctx.lineTo(960,318); ctx.stroke(); ctx.setLineDash([]); }
function drawFightEnvironment(cam){ drawBuilding(60-cam,156); drawFence(170-cam,225); drawBarrels(200-cam,300); drawContainer(420-cam,195); drawLadder(650-cam,190); drawOilDrum(870-cam,338); }
function drawFightHUD(s){ ctx.fillStyle='#000'; ctx.fillRect(0,0,960,66); ctx.fillStyle='#f0a424'; ctx.font='900 20px Arial'; ctx.fillText('ALEX', 74, 24); ctx.fillStyle='#fff'; ctx.fillText(String(Math.max(0,Math.floor((100-s.player.hp)*1000)).toString().padStart(7,'0')), 175, 24); ctx.fillText('×3', 365, 24); ctx.fillStyle='#d49225'; ctx.font='900 58px Arial'; ctx.fillText(String(Math.ceil(s.time)).padStart(2,'0'), 475, 50); ctx.fillStyle='#4864a2'; ctx.font='900 24px Arial'; ctx.fillText('PRESS START', 734, 28); hpBar(72,32,124,14,s.player.hp/100,'#d9b44c'); ctx.fillStyle='#0c1d39'; ctx.fillRect(16,14,38,38); if(s.enemies[0]){ctx.fillStyle='#000';ctx.fillRect(0,500,960,40); hpBar(155,510,130,12,(s.enemies[0].hp||0)/4,'#c63939'); ctx.fillStyle='#fff'; ctx.font='900 22px Arial'; ctx.fillText('KNIFE', 70, 523);} if(s.enemies[1]){hpBar(748,510,130,12,(s.enemies[1].hp||0)/4,'#c63939'); ctx.fillStyle='#fff'; ctx.fillText('BANDANA', 598, 523);} ctx.fillStyle='#a7adb8'; ctx.fillText('STAGE 3-1', 403, 523); }
function drawRooftopBackground(cam){ const g=ctx.createLinearGradient(0,0,0,540); g.addColorStop(0,'#5b4f8a'); g.addColorStop(1,'#1b2743'); ctx.fillStyle=g; ctx.fillRect(0,0,960,540); ctx.fillStyle='rgba(255,255,255,.12)'; for(let i=0;i<14;i++) ctx.fillRect(i*100-(cam*0.15%100), 140+((i%3)*20), 40, 180); ctx.strokeStyle='rgba(180,220,255,.15)'; for(let i=0;i<30;i++){ ctx.beginPath(); ctx.moveTo((i*45+cam*0.3)%1000,0); ctx.lineTo((i*45+cam*0.3)%1000-20,540); ctx.stroke(); } }
function drawPlatformHUD(s,name){ ctx.fillStyle='#000'; ctx.fillRect(0,0,960,66); ctx.fillStyle='#f5d35f'; ctx.font='900 20px Arial'; ctx.fillText(name, 76, 24); ctx.fillStyle='#fff'; ctx.fillText('ROOFTOP RELAY', 160, 24); ctx.fillStyle='#d49225'; ctx.font='900 58px Arial'; ctx.fillText(String(Math.ceil(s.time)).padStart(2,'0'), 470, 50); ctx.fillStyle='#9fe8ff'; ctx.font='900 24px Arial'; ctx.fillText(s.collectible.collected ? 'SHARD ✓' : 'SHARD ?', 730, 28); hpBar(70,32,124,14,1,'#4fd6ff'); }
function drawRunnerBackground(cam){ const g=ctx.createLinearGradient(0,0,0,540); g.addColorStop(0,'#f6c679'); g.addColorStop(1,'#74c2d7'); ctx.fillStyle=g; ctx.fillRect(0,0,960,540); ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(820,90,34,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#7993ab'; for(let i=0;i<8;i++) ctx.fillRect(i*140-(cam*0.12%140), 150+(i%3)*20, 34+(i%2)*20, 150); ctx.fillStyle='#6fa0c4'; ctx.fillRect(0,360,960,180); ctx.fillStyle='#566d7a'; ctx.beginPath(); ctx.moveTo(0,290); for(let x=0;x<=960;x+=40){ const y=300 + Math.sin((x+cam)*0.01)*15; ctx.lineTo(x,y); } ctx.lineTo(960,420); ctx.lineTo(0,420); ctx.closePath(); ctx.fill(); ctx.strokeStyle='#d9dde5'; ctx.lineWidth=4; for(let y of [300,350,400]){ ctx.setLineDash([18,16]); ctx.beginPath(); ctx.moveTo(0,y+30); ctx.lineTo(960,y+30); ctx.stroke(); } ctx.setLineDash([]); }
function drawRunnerHUD(s){ ctx.fillStyle='#000'; ctx.fillRect(0,0,960,66); ctx.fillStyle='#2ec1c0'; ctx.font='900 20px Arial'; ctx.fillText('MALIK', 72, 24); ctx.fillStyle='#fff'; ctx.fillText('RIVERSIDE RUSH', 160, 24); ctx.fillStyle='#d49225'; ctx.font='900 58px Arial'; ctx.fillText(String(Math.ceil(s.time)).padStart(2,'0'), 470, 50); ctx.fillStyle='#fff'; ctx.font='900 22px Arial'; ctx.fillText('SCORE ' + s.score, 745, 28); hpBar(70,32,180,14,s.health/100,'#25a6a6'); }
function drawPlatform(pl, cam){ctx.fillStyle='#222830';ctx.fillRect(pl.x-cam, pl.y, pl.w, pl.h); ctx.fillStyle='#677288'; ctx.fillRect(pl.x-cam, pl.y, pl.w, 4);} function drawShard(x,y){ctx.fillStyle='#4dd7ff';ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x+12,y);ctx.lineTo(x,y+12);ctx.lineTo(x-12,y);ctx.closePath();ctx.fill();} function drawExit(x,y){ctx.fillStyle='#d7f2ff';ctx.fillRect(x,y,34,58);ctx.fillStyle='#1d3654';ctx.font='700 14px Arial';ctx.fillText('EXIT',x+3,y+32);} function drawBarrier(x,y){ctx.fillStyle='#d6784c';ctx.fillRect(x,y,42,18);ctx.fillRect(x+2,y-24,14,24);} function drawRing(x,y){ctx.strokeStyle='#f3db4e';ctx.lineWidth=6;ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.stroke();} function drawFinish(x,y){ctx.strokeStyle='#ecf1f4';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+95);ctx.stroke();ctx.beginPath();ctx.moveTo(x-26,y+18);ctx.lineTo(x+48,y+18);ctx.stroke();ctx.fillStyle='#1b3557';ctx.font='900 18px Arial';ctx.fillText('FINISH',x-16,y-8);} 
function drawCharacter(p, bodyColor, legColor, cam, type){ const x=p.x-cam,y=p.y; const skin='#6a4637'; ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(x+p.w/2, y-58, 12, 0, Math.PI*2); ctx.fill(); if(type==='hero'){ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(x+p.w/2, y-66, 12, 0, Math.PI*2); ctx.fill(); ctx.fillStyle='#ececec'; ctx.fillRect(x+4, y-46, 28, 38); ctx.fillStyle='#151925'; ctx.fillRect(x+13, y-12, 8, 18); ctx.fillStyle=skin; ctx.fillRect(x-6, y-40, 9, 30); ctx.fillRect(x+31, y-40, 9, 26); ctx.fillStyle='#ececec'; ctx.fillRect(x+2, y-6, 12, 32); ctx.fillRect(x+20, y-6, 12, 32);} else {ctx.fillStyle='#f0c336'; ctx.fillRect(x+2,y-42,24,30); ctx.fillStyle='#202430'; ctx.fillRect(x+7,y-12,7,28); ctx.fillRect(x+17,y-12,7,28); ctx.fillStyle=skin; ctx.fillRect(x-5,y-36,7,20); ctx.fillRect(x+25,y-36,7,14);} }
function drawEnemy(e, cam){ const x=e.x-cam,y=e.y, skin='#7b5338'; ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(x+e.w/2,y-58,11,0,Math.PI*2); ctx.fill(); if(e.kind==='knife'){ctx.fillStyle='#8b447a'; ctx.fillRect(x+4,y-42,24,30); ctx.fillStyle='#401f38'; ctx.fillRect(x+8,y-12,8,28); ctx.fillRect(x+18,y-12,8,28); ctx.fillStyle='#cb57ab'; ctx.fillRect(x+6,y-68,20,7); ctx.fillStyle=skin; ctx.fillRect(x+28,y-34,7,18); ctx.fillStyle='#d7dce4'; ctx.fillRect(x+34,y-30,14,4);} else if(e.kind==='bandana'){ctx.fillStyle='#4b6f97'; ctx.fillRect(x+3,y-42,26,30); ctx.fillStyle='#3c2c25'; ctx.fillRect(x+8,y-12,8,28); ctx.fillRect(x+18,y-12,8,28); ctx.fillStyle='#cb563a'; ctx.fillRect(x+8,y-68,18,7);} else {ctx.fillStyle='#4d6f90'; ctx.fillRect(x+2,y-42,28,30); ctx.fillStyle='#556c37'; ctx.fillRect(x+8,y-12,8,28); ctx.fillRect(x+18,y-12,8,28); ctx.fillStyle='#2b4f9d'; ctx.fillRect(x+8,y-68,18,7);} }
function drawSlash(p, cam){ const x=p.x-cam+(p.dir===1?44:-14); ctx.fillStyle='rgba(245,198,70,.9)'; ctx.beginPath(); ctx.moveTo(x,p.y-30); ctx.lineTo(x+18*p.dir,p.y-42); ctx.lineTo(x+28*p.dir,p.y-20); ctx.lineTo(x+10*p.dir,p.y-8); ctx.closePath(); ctx.fill(); }
function drawBuilding(x,y){ctx.fillStyle='#4b2e25';ctx.fillRect(x,y,120,150);ctx.fillStyle='#2d1c16';ctx.fillRect(x+18,y+52,55,78);ctx.fillStyle='#87b8db';ctx.font='900 26px Arial';ctx.fillText('B7',x+28,y+34);ctx.fillStyle='#d7b894';ctx.font='14px Arial';ctx.fillText('SECURITY',x+18,y+78);ctx.fillText('LEVEL 3',x+18,y+96);ctx.fillStyle='rgba(199,165,71,.8)';ctx.beginPath();ctx.arc(x+42,y+4,10,0,Math.PI*2);ctx.fill();}
function drawFence(x,y){ctx.strokeStyle='#7d8aa2';ctx.lineWidth=3;ctx.strokeRect(x,y,170,76);for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(x+i*18,y);ctx.lineTo(x+i*18+36,y+76);ctx.stroke();ctx.beginPath();ctx.moveTo(x+i*18,y+76);ctx.lineTo(x+i*18+36,y);ctx.stroke();}ctx.fillStyle='#866f33';ctx.fillRect(x+55,y+20,48,34);ctx.fillStyle='#111';ctx.font='700 12px Arial';ctx.fillText('CAUTION',x+58,y+38);ctx.fillText('KEEP OUT',x+55,y+51);} function drawBarrels(x,y){ctx.fillStyle='#557a2e';ctx.fillRect(x,y,28,30);ctx.fillRect(x+34,y,28,30);} function drawContainer(x,y){ctx.fillStyle='#7c432c';ctx.fillRect(x,y,218,116);ctx.strokeStyle='#8f614a';for(let xx=32;xx<218;xx+=35){ctx.beginPath();ctx.moveTo(x+xx,y);ctx.lineTo(x+xx,y+116);ctx.stroke();}ctx.fillStyle='rgba(190,140,84,.6)';ctx.font='900 42px Arial';ctx.fillText('ZENITH',x+34,y+69);ctx.font='900 30px Arial';ctx.fillText('INDUSTRIES',x+34,y+101);ctx.fillStyle='#bba233';ctx.fillRect(x+147,y+29,46,46);ctx.fillStyle='#2d1808';ctx.font='900 19px Arial';ctx.fillText('DANGER',x+143,y+88);ctx.fillStyle='#7b2d2d';ctx.font='26px Arial';ctx.fillText('⚡',x+161,y+61);} function drawLadder(x,y){ctx.strokeStyle='#a7b6ca';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+115);ctx.moveTo(x+18,y);ctx.lineTo(x+18,y+115);for(let i=0;i<6;i++){ctx.moveTo(x,y+15+i*18);ctx.lineTo(x+18,y+15+i*18);}ctx.stroke();} function drawOilDrum(x,y){ctx.fillStyle='#6d3721';ctx.fillRect(x,y,34,58);ctx.strokeStyle='#31150d';ctx.strokeRect(x,y,34,58);} function drawBike(x,y){ctx.strokeStyle='#22303f'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(x+8,y+18,18,0,Math.PI*2); ctx.arc(x+54,y+18,18,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+8,y+18); ctx.lineTo(x+28,y-2); ctx.lineTo(x+48,y+18); ctx.lineTo(x+36,y-6); ctx.lineTo(x+20,y-6); ctx.stroke(); ctx.fillStyle='#6c4637'; ctx.beginPath(); ctx.arc(x+28,y-24,11,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#2ea2a0'; ctx.fillRect(x+18,y-14,22,18); ctx.fillStyle='#cfd7df'; ctx.fillRect(x+20,y-34,16,6); }

function loop(ts){ const dt=Math.min(0.033, (ts-last)/1000 || 0); last=ts; ctx.clearRect(0,0,960,540); if(runtimeState){ if(runtimeState.type==='fighting'){updateFighting(runtimeState,dt); drawFighting(runtimeState);} else if(runtimeState.type==='platformer'){updatePlatformer(runtimeState,dt); drawPlatformer(runtimeState);} else {updateRunner(runtimeState,dt); drawRunner(runtimeState);} } requestAnimationFrame(loop); }

loadPreset('alex');
requestAnimationFrame(loop);
