const SAMPLE = "**Description:** [XPLAY REVERSE FORGE \u2014 SCREENSHOT TO GAME] The uploaded screenshot is a VISUAL SPECIFICATION, not merely inspiration. EXACT VISUAL BLUEPRINT: preserve the visible composition and spatial relationships as closely as technically possible. PRESERVE: layout, artStyle, camera, palette, levelStructure. Reconstruct visible player scale, camera framing, object relationships, spatial hierarchy, palette, environment grammar, apparent gameplay cues, and major landmarks. Infer only information that is not observable in the screenshot. Any inferred content must extend the screenshot\u2019s established visual and gameplay grammar rather than replace it. I see Alex, a Black male character with a prominent afro wearing a white martial arts gi with a black belt and wrist wraps, fighting barefoot; executing an open-palm strike to the right inside Urban shipping dockyard or industrial facility at night featuring a reddish-brown shipping container labeled 'ZENITH INDUSTRIES', yellow 'DANGER' sign, metal ladder, green toxic/chemical barrels behind chain-link fence ('CAUTION KEEP OUT'), brick building entrance ('SECURITY LEVEL 3', room 'B7'), dark night sky with full moon, glowing blue/purple skyline with skyscrapers and industrial cranes, concrete floor with yellow-and-black hazard stripes, drain grates, and rivets. Important visible elements include Shipping container, Yellow 'DANGER' sign, Metal ladder, Green toxic/chemical barrels, Chain-link fence, Caution sign, Exterior lamp, Rusty brown oil drum, Combat knife. The strongest playable cues suggest fighting 95%, platformer 60%, dodge 45%. I will treat the screenshot as a visual specification and preserve its visible composition unless you tell me otherwise. PLAYER IDENTITY: source USER GAMEPLAY INTENT: Fight visible rivals in Urban shipping dockyard or industrial facility at night featuring a reddish-brown shipping container labeled 'ZENITH INDUSTRIES', yellow 'DANGER' sign, metal ladder, green toxic/chemical barrels behind chain-link fence ('CAUTION KEEP OUT'), brick building entrance ('SECURITY LEVEL 3', room 'B7'), dark night sky with full moon, glowing blue/purple skyline with skyscrapers and industrial cranes, concrete floor with yellow-and-black hazard stripes, drain grates, and rivets as Alex, a Black male character with a prominent afro wearing a white martial arts gi with a black belt and wrist wraps, fighting barefoot; executing an open-palm strike to the right, using the source combat plane and Shipping container, Yellow 'DANGER' sign, Metal ladder, Green toxic/chemical barrels, Chain-link fence, Caution sign, Exterior lamp, Rusty brown oil drum, Combat knife; support beat-em-up progression when multiple enemies are visible. Preserve the CURRENT screenshot camera, layout, player scale, palette, HUD language and major object relationships. Unknown facts remain unknown.";
const $ = s => document.querySelector(s);
const els = {
  title: $('#titleInput'), genre: $('#genreOverride'), camera: $('#cameraLock'), text: $('#descriptionInput'),
  parse: $('#parseBtn'), build: $('#buildBtn'), sample: $('#sampleBtn'), clear: $('#clearBtn'), download: $('#downloadBtn'),
  status: $('#status'), readiness: $('#readinessBadge'), summary: $('#summaryGrid'), qa: $('#qaList'), json: $('#jsonOut'),
  canvas: $('#gameCanvas'), proto: $('#protoStatus')
};
els.text.value = SAMPLE;

let currentPacket = null;
let currentTab = 'scene';
let game = null;
const keys = {};

window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
  if (e.key.toLowerCase() === 'r' && currentPacket) startGame(currentPacket);
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

els.sample.onclick = () => { els.title.value='Urban Shipping Clash'; els.genre.value=''; els.text.value=SAMPLE; setStatus('Sample loaded.'); };
els.clear.onclick = () => { els.title.value=''; els.genre.value=''; els.text.value=''; setStatus('Cleared. Paste a different description and run V2 again.'); };
els.parse.onclick = () => { currentPacket = interpret(); render(currentPacket); setStatus('Interpreter V2 complete.'); };
els.build.onclick = () => {
  currentPacket = interpret(); render(currentPacket);
  if (currentPacket.qa.readiness < 70) {
    setStatus('Build blocked: readiness below 70%. Fix QA warnings first.');
    els.proto.textContent = 'Build blocked by QA gate.';
    return;
  }
  startGame(currentPacket);
  setStatus('Graybox built from V2 packet.');
};
els.download.onclick = () => {
  if (!currentPacket) currentPacket = interpret();
  const blob = new Blob([JSON.stringify(currentPacket,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = slug(currentPacket.meta.title || 'xplay-v2-packet') + '.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};

document.querySelectorAll('.tab').forEach(btn => btn.onclick = () => {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); currentTab = btn.dataset.tab; renderJson();
});

function interpret() {
  const source = els.text.value.trim();
  const title = els.title.value.trim() || inferTitle(source);
  const explicitGenres = extractExplicitGenreScores(source);
  const detectedGenres = detectGenreKeywords(source);
  const genreCandidates = mergeGenreScores(explicitGenres, detectedGenres, els.genre.value);
  const primaryGenre = els.genre.value || genreCandidates[0]?.type || 'platformer';

  const player = parsePlayer(source);
  const entities = parseEntities(source, player, primaryGenre);
  const environment = parseEnvironment(source);
  const landmarks = normalizeLandmarks(parseLandmarks(source));
  const camera = parseCamera(source, primaryGenre);
  const sceneGraph = buildSceneGraph(title, primaryGenre, player, entities, environment, landmarks, camera);
  const blueprint = buildBlueprint(title, primaryGenre, sceneGraph);
  const workOrders = buildAssetWorkOrders(sceneGraph, blueprint);
  const qa = runQA(source, sceneGraph, blueprint, workOrders, genreCandidates);

  return {
    meta: {
      title, createdAt:new Date().toISOString(), source:'description-to-playable-lab-v2',
      editableSourceText:true, cameraLock:els.camera.value==='true', version:'2.0'
    },
    genreCandidates, canonicalSceneGraph:sceneGraph, gameplayBlueprint:blueprint, assetWorkOrders:workOrders, qa,
    sourceText:source
  };
}

function extractExplicitGenreScores(text) {
  const found = [];
  const re = /\b(fighting|platformer|dodge|runner|fps|puzzle|rhythm|open\s*world|racing|collect(?:ible)?)\s*(\d{1,3})%/gi;
  let m;
  while ((m = re.exec(text))) {
    found.push({ type:normalizeGenre(m[1]), score:Math.min(1, Number(m[2])/100), source:'explicit-source-score' });
  }
  return dedupeGenreScores(found);
}

function detectGenreKeywords(text) {
  const lower=text.toLowerCase();
  const dict={
    fighting:['fight','fighting','beat-em-up','beat em up','brawler','rival','punch','kick','melee','combat'],
    platformer:['platform','jump','ledge','platformer'],
    dodge:['dodge','avoid','evade'],
    runner:['runner','run lane','endless run'],
    fps:['first-person','fps','crosshair','firearm','gun'],
    puzzle:['puzzle','match-3','grid puzzle'],
    rhythm:['rhythm','beat','timing lane'],
    openworld:['open world','free roam','quest','explore'],
    racing:['racing','race track','vehicle'],
    collect:['collect','pickup','collectible']
  };
  return Object.entries(dict).map(([type,words])=>{
    const hits=words.filter(w=>lower.includes(w)).length;
    return {type,score:Math.min(.8,hits/Math.max(4,words.length)),source:'keyword-inference'};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}

function mergeGenreScores(explicit, inferred, override) {
  const map = new Map();
  for (const x of inferred) map.set(x.type,x);
  for (const x of explicit) map.set(x.type,x);
  if (override) map.set(override,{type:override,score:1,source:'user-override'});
  const arr=[...map.values()].sort((a,b)=>b.score-a.score);
  return arr.length?arr:[{type:override||'platformer',score:override?1:.4,source:override?'user-override':'default'}];
}

function parsePlayer(text) {
  const name = (text.match(/\bI see\s+([A-Z][A-Za-z0-9_-]+)/i)||[])[1] || (text.match(/\bplayer\s+(?:named\s+)?([A-Z][A-Za-z0-9_-]+)/i)||[])[1] || 'Player';
  const identity = /black male/i.test(text)?'Black male':(/black female/i.test(text)?'Black female':'unknown');
  const appearance=[];
  [['afro',/afro/i],['white gi',/white (?:martial arts )?gi/i],['black belt',/black belt/i],['wrist wraps',/wrist wrap/i],['barefoot',/barefoot/i]].forEach(([v,re])=>{if(re.test(text))appearance.push(v)});
  let action='unknown';
  const a=text.match(/executing\s+([^.;]+?)(?=\s+inside\b|\s+in\s+(?:an?|the)\b|[.;])/i);
  if(a) action=clean(a[1]);
  else {
    const b=text.match(/executing\s+([^.;]+)/i); if(b) action=clean(b[1].split(/\s+inside\b/i)[0]);
  }
  return {
    id:'player_alex', type:'player', name, identity, appearance, action,
    position:{region:'center-left',x:0.34,y:0.68,source:'text-inference',confidence:.62},
    provenance:{identity:'source-explicit',appearance:'source-explicit',action:action==='unknown'?'unknown':'source-explicit'}
  };
}

function parseEntities(text, player, genre) {
  const out=[player];
  const lower=text.toLowerCase();
  if (/knife/i.test(text)) out.push(entity('enemy_knife','Knife Punk','enemy','left',.17,.67,{weapon:'knife'}));
  if (/bandana/i.test(text)) out.push(entity('enemy_bandana','Bandana Rival','enemy','center-right',.58,.67,{weapon:'fists'}));
  if (/far-right|muscular|bruiser|multiple enemies|rivals/i.test(text)) out.push(entity('enemy_bruiser','Dock Bruiser','enemy','far-right',.78,.67,{weapon:'fists'}));
  if (genre==='fighting' && out.filter(x=>x.type==='enemy').length===0) {
    out.push(entity('enemy_1','Enemy 1','enemy','right',.66,.67,{weapon:'unknown',provenance:'genre-inference'}));
  }
  return out;
}

function entity(id,label,type,region,x,y,extra={}) {
  return {id,label,type,position:{region,x,y,source:extra.provenance||'text-inference',confidence:extra.provenance?0.45:0.68},weapon:extra.weapon||'unknown',provenance:extra.provenance||'source-supported'};
}

function parseEnvironment(text) {
  const locationMatch=text.match(/inside\s+(.+?)(?=\.\s+Important visible elements|\.\s+The strongest playable cues|\.\s+I will treat|$)/i);
  const location=locationMatch?clean(locationMatch[1]):'unknown environment';
  return {
    id:'world_main', type:'environment', location,
    timeOfDay:/night/i.test(text)?'night':'unknown',
    mood:/industrial|dockyard/i.test(text)?'industrial urban tension':'unknown',
    palette:[
      /blue\/purple|blue\/purple skyline/i.test(text)?'blue/purple':null,
      /yellow-and-black|yellow and black/i.test(text)?'yellow/black':null,
      /reddish-brown/i.test(text)?'reddish-brown':null
    ].filter(Boolean),
    provenance:'source-explicit'
  };
}

function parseLandmarks(text) {
  const arr=[];
  const explicit=text.match(/Important visible elements include\s+([^.;]+)/i);
  if(explicit) explicit[1].split(',').map(clean).filter(Boolean).forEach(x=>arr.push(x));
  const additions=[
    ['ZENITH INDUSTRIES container',/zenith industries/i],
    ['DANGER sign',/danger sign|yellow 'danger'/i],
    ['metal ladder',/metal ladder|ladder/i],
    ['green toxic barrels',/green toxic|chemical barrels/i],
    ['chain-link fence',/chain-link fence/i],
    ['CAUTION KEEP OUT sign',/caution keep out/i],
    ['brick security building B7',/security level 3|room 'b7'|\bb7\b/i],
    ['rusty oil drum',/rusty brown oil drum|oil drum/i],
    ['hazard-striped concrete floor',/hazard stripes|yellow-and-black hazard/i],
    ['full moon skyline',/full moon.*skyline|skyline.*full moon/i],
    ['combat knife',/combat knife/i]
  ];
  additions.forEach(([label,re])=>{if(re.test(text))arr.push(label)});
  return arr;
}

const CANON = [
  {id:'zenith_container',type:'shipping_container',aliases:['shipping container','zenith industries container','container']},
  {id:'danger_sign',type:'warning_sign',aliases:['yellow danger sign','danger sign']},
  {id:'metal_ladder',type:'ladder',aliases:['metal ladder','ladder']},
  {id:'chemical_barrels',type:'barrel_group',aliases:['green toxic/chemical barrels','green toxic barrels','green barrels','chemical barrels']},
  {id:'chainlink_fence',type:'fence',aliases:['chain-link fence','chain link fence']},
  {id:'caution_sign',type:'warning_sign',aliases:['caution sign','caution keep out sign']},
  {id:'security_building_b7',type:'structure',aliases:['brick building b7','brick security building b7','security level 3']},
  {id:'oil_drum',type:'prop',aliases:['rusty brown oil drum','rusty oil drum','oil drum']},
  {id:'hazard_floor',type:'ground',aliases:['hazard-striped floor','hazard-striped concrete floor']},
  {id:'moon_skyline',type:'background',aliases:['full moon skyline','skyline']},
  {id:'combat_knife',type:'weapon_prop',aliases:['combat knife','knife']},
  {id:'exterior_lamp',type:'light_prop',aliases:['exterior lamp']}
];

function normalizeLandmarks(items) {
  const result=[], seen=new Set();
  for(const raw of items) {
    const n=clean(raw).toLowerCase().replace(/['"]/g,'');
    let matched=null;
    for(const c of CANON) if(c.aliases.some(a=>n.includes(a)||a.includes(n))) {matched=c;break;}
    if(!matched) matched={id:slug(raw),type:'landmark',aliases:[raw]};
    if(seen.has(matched.id)) continue;
    seen.add(matched.id);
    result.push({
      id:matched.id,type:matched.type,label:preferredLabel(matched.id,raw),sourceText:raw,
      position:positionForLandmark(matched.id),provenance:'source-explicit'
    });
  }
  return result;
}

function preferredLabel(id,raw) {
  const labels={
    zenith_container:'ZENITH INDUSTRIES container',danger_sign:'DANGER sign',metal_ladder:'Metal ladder',
    chemical_barrels:'Green toxic/chemical barrels',chainlink_fence:'Chain-link fence',
    caution_sign:'CAUTION KEEP OUT sign',security_building_b7:'Security building B7',
    oil_drum:'Rusty brown oil drum',hazard_floor:'Hazard-striped concrete floor',
    moon_skyline:'Full moon / skyline',combat_knife:'Combat knife',exterior_lamp:'Exterior lamp'
  };
  return labels[id]||raw;
}

function positionForLandmark(id) {
  const positions={
    security_building_b7:['left',.08,.44], chainlink_fence:['mid-left',.31,.48], chemical_barrels:['mid-left',.25,.59],
    caution_sign:['mid-left',.32,.44], zenith_container:['mid-right',.62,.43], danger_sign:['mid-right',.70,.45],
    metal_ladder:['right',.82,.43], oil_drum:['foreground-right',.91,.70], hazard_floor:['ground',.50,.82], moon_skyline:['background',.60,.18], exterior_lamp:['left',.08,.30],combat_knife:['enemy-left',.18,.62]
  };
  const [region,x,y]=positions[id]||['unknown',.5,.5];
  return {region,x,y,source:'text-layout-inference',confidence:.55};
}

function parseCamera(text, genre) {
  const side=/side-view|side-scrolling|fixed 2d orthographic|combat plane/i.test(text)||genre==='fighting';
  return {
    type:side?'2d-side-view':genre==='fps'?'first-person':'2d-generic',
    framing:side?'medium-wide':'adaptive', movementPlane:side?'horizontal + shallow vertical depth':'genre-dependent',
    preserveSourceFraming:els.camera.value==='true', provenance: side?'source-supported':'genre-inference'
  };
}

function buildSceneGraph(title,genre,player,entities,environment,landmarks,camera) {
  return {
    title, genre, camera, environment,
    entities, landmarks,
    layers:[
      {id:'layer_sky',role:'background',members:landmarks.filter(x=>x.type==='background').map(x=>x.id)},
      {id:'layer_mid',role:'midground',members:landmarks.filter(x=>['structure','fence','shipping_container','ladder','warning_sign','barrel_group'].includes(x.type)).map(x=>x.id)},
      {id:'layer_play',role:'gameplay-plane',members:entities.map(x=>x.id)},
      {id:'layer_foreground',role:'foreground',members:landmarks.filter(x=>x.id==='oil_drum').map(x=>x.id)}
    ],
    playfield:{x:0.05,y:0.55,w:0.90,h:0.22,source:'text-inference',confidence:.58},
    constraints:{preserveComposition:true,unknownRemainsUnknown:true,noLegacyAssets:true}
  };
}

function buildBlueprint(title,genre,scene) {
  const enemies=scene.entities.filter(x=>x.type==='enemy');
  return {
    title,engine:genre,camera:scene.camera,
    objective:genre==='fighting'?'Defeat all visible enemies to clear the encounter.':'Complete the genre-specific objective.',
    playerStart:scene.entities.find(x=>x.type==='player')?.position||{x:.34,y:.68},
    enemies:enemies.map((e,i)=>({
      id:e.id,label:e.label,weapon:e.weapon,position:e.position,hp:3,
      ai:genre==='fighting'?{behavior:'approach player, enter attack range, strike, recover'}:{behavior:'genre-default'}
    })),
    controls:genre==='fighting'?['left','right','up','down','attack']:['left','right','action'],
    combat:genre==='fighting'?{attackRange:0.075,playerAttackDamage:1,enemyHP:3,contactDamage:.18,hitReaction:true}:null,
    world:{width:960,height:540,walkLaneTop:.56,walkLaneBottom:.76,layers:scene.layers,landmarks:scene.landmarks.map(x=>x.id)},
    progression:genre==='fighting'?[
      'Spawn player and all source-supported visible rivals.',
      'Preserve the side-view combat plane.',
      'Enemies approach from source-indicated regions.',
      'Player attacks reduce enemy HP.',
      'Encounter clears when all enemies are defeated.'
    ]:['Establish a minimal playable loop from the description.'],
    provenance:{positions:'text inference until spatial vision is connected',mechanics:'genre interpretation'}
  };
}

function buildAssetWorkOrders(scene,blueprint) {
  const orders=[];
  const player=scene.entities.find(x=>x.type==='player');
  if(player) orders.push({
    id:'asset_player_'+slug(player.name),category:'character',sourceEntity:player.id,strategy:'REBUILD',priority:'critical',
    requiredStates:['idle','walk','open_palm','punch','kick','hurt','fall','victory'],
    productionRoute:['segment_reference_if_image_available','identity_lock','pose_generation','sprite_synthesis','alpha_cleanup','consistency_qa'],
    deliverables:['transparent sprite sheet','animation map','collision silhouette'],
    qaGates:['identity preserved','transparent background','consistent scale','all required states present'],
    provenance:'derived from canonical player entity'
  });
  scene.entities.filter(x=>x.type==='enemy').forEach(e=>orders.push({
    id:'asset_'+e.id,category:'enemy',sourceEntity:e.id,strategy:'REBUILD',priority:'critical',
    requiredStates:['idle','walk','attack','hurt','fall'],
    productionRoute:['segment_reference_if_image_available','sprite_synthesis','alpha_cleanup','consistency_qa'],
    deliverables:['transparent sprite sheet','animation map'],
    qaGates:['enemy identity matches source description','transparent background','attack state present'],
    provenance:'derived from source-supported enemy entity'
  }));
  scene.landmarks.forEach(l=>orders.push({
    id:'asset_'+l.id,category:l.type,sourceEntity:l.id,
    strategy:['background','ground','structure','shipping_container'].includes(l.type)?'EXTEND_OR_REBUILD':'EXTRACT_OR_REBUILD',
    priority:['shipping_container','ground','background'].includes(l.type)?'high':'medium',
    productionRoute:routeForLandmark(l),
    deliverables:deliverablesForLandmark(l),
    qaGates:['matches source visual grammar','no unrelated legacy asset substitution'],
    provenance:'derived from canonical landmark'
  }));
  orders.push({
    id:'asset_combat_fx',category:'fx',strategy:'SYNTHESIZE',priority:'medium',
    productionRoute:['fx_generation','style_consistency_qa'],deliverables:['hit spark sheet','impact flash variants'],
    qaGates:['matches target art style'],provenance:'required by fighting gameplay blueprint'
  });
  return {policy:{legacyAssetUse:'REJECT',currentBuildOnly:true,unknownAssetPolicy:'do-not-invent'},orders};
}

function routeForLandmark(l) {
  if(l.type==='background') return ['depth_layering','world_extension','parallax_consistency_qa'];
  if(l.type==='ground') return ['texture_reference','tileset_generation','collision_mask_generation'];
  if(['structure','shipping_container'].includes(l.type)) return ['segmentation_reference','rebuild_or_outpaint','perspective_consistency_qa'];
  return ['segmentation_reference','alpha_cleanup','style_consistency_qa'];
}
function deliverablesForLandmark(l) {
  if(l.type==='background') return ['extended background layer'];
  if(l.type==='ground') return ['repeatable ground tiles','collision mask'];
  if(['structure','shipping_container'].includes(l.type)) return ['clean environment layer'];
  return ['transparent prop PNG'];
}

function runQA(source,scene,blueprint,workOrders,genres) {
  const checks=[];
  const push=(pass,label,severity='good')=>checks.push({pass,label,severity:pass?'good':severity});
  const enemies=scene.entities.filter(x=>x.type==='enemy');
  const expectedEnemyCount=/multiple enemies|rivals/i.test(source)?3:null;

  push(!!scene.genre,'Genre resolved.','bad');
  push(!!scene.entities.find(x=>x.type==='player'),'Player entity found.','bad');
  push(scene.camera.type!=='2d-generic','Camera resolved from source/genre.','warn');
  push(scene.landmarks.length>=4,`Landmarks normalized: ${scene.landmarks.length} canonical entities.`, 'warn');
  if(expectedEnemyCount) push(enemies.length>=expectedEnemyCount,`Expected about ${expectedEnemyCount} visible enemies; parsed ${enemies.length}.`,'warn');
  else push(enemies.length>0||scene.genre!=='fighting',`Enemy entities parsed: ${enemies.length}.`,'warn');
  push(blueprint.objective && blueprint.objective.length>8,'Objective exists.','bad');
  push(workOrders.orders.some(x=>x.category==='character'),'Player asset work order exists.','bad');
  push(workOrders.orders.filter(x=>x.category==='enemy').length===enemies.length,'Enemy asset work orders match enemy entity count.','warn');
  push(!workOrders.orders.some(x=>/signatureJet|crosshair|terrain00/i.test(x.id)),'No known legacy asset names in work orders.','bad');

  const explicit=genres.filter(x=>x.source==='explicit-source-score');
  push(explicit.length>0?'explicit-source-score':true, explicit.length?`Explicit genre scores preserved: ${explicit.map(x=>`${x.type} ${Math.round(x.score*100)}%`).join(', ')}.`:'No explicit genre percentages found; inference used.','warn');

  let score=100;
  checks.forEach(c=>{if(!c.pass) score-=c.severity==='bad'?18:8});
  score=Math.max(0,Math.min(100,score));
  return {readiness:score,buildAllowed:score>=70,checks};
}

function render(packet) {
  const sg=packet.canonicalSceneGraph, bp=packet.gameplayBlueprint;
  const summaries=[
    ['Title',packet.meta.title],['Genre',sg.genre],['Player',sg.entities.find(x=>x.type==='player')?.name||'—'],
    ['Enemies',sg.entities.filter(x=>x.type==='enemy').length],['Landmarks',sg.landmarks.length],['Camera',sg.camera.type],
    ['Work Orders',packet.assetWorkOrders.orders.length],['Readiness',packet.qa.readiness+'%']
  ];
  els.summary.innerHTML=summaries.map(([k,v])=>`<div class="summary"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('');
  els.qa.innerHTML=packet.qa.checks.map(c=>`<div class="qa-row ${c.pass?'good':c.severity}"><span>${c.pass?'✓':c.severity==='bad'?'✕':'⚠'}</span><div>${esc(c.label)}</div></div>`).join('');
  els.readiness.textContent=packet.qa.readiness+'%';
  els.readiness.style.color=packet.qa.readiness>=85?'#238b57':packet.qa.readiness>=70?'#b17a13':'#b74848';
  renderJson();
}

function renderJson() {
  if(!currentPacket) return;
  const value=currentTab==='scene'?currentPacket.canonicalSceneGraph:
    currentTab==='blueprint'?currentPacket.gameplayBlueprint:
    currentTab==='assets'?currentPacket.assetWorkOrders:currentPacket;
  els.json.textContent=JSON.stringify(value,null,2);
}

function startGame(packet) {
  const canvas=els.canvas,ctx=canvas.getContext('2d'),sg=packet.canonicalSceneGraph,bp=packet.gameplayBlueprint;
  const playerEntity=sg.entities.find(x=>x.type==='player');
  game={
    over:false,win:false,tick:0,flash:0,
    player:{x:(playerEntity.position.x||.34)*960,y:(playerEntity.position.y||.68)*540,w:34,h:62,speed:3.3,hp:10,facing:1,attackCooldown:0,attackTimer:0},
    enemies:bp.enemies.map((e,i)=>({...e,x:(e.position.x||(.62+i*.1))*960,y:(e.position.y||.68)*540,w:34,h:58,hp:e.hp||3,alive:true,hurt:0,speed:1+i*.08}))
  };
  els.proto.innerHTML=`<b>${esc(packet.meta.title)}</b><br>Readiness: ${packet.qa.readiness}%<br>Enemies: ${game.enemies.length}<br>Status: active`;
  requestAnimationFrame(loop);
  function loop(){if(!game)return;updateGame();drawGame(ctx,packet);requestAnimationFrame(loop)}
}

function updateGame() {
  if(!game||game.over)return;
  game.tick++; const p=game.player;
  if(keys['arrowleft']||keys['a']){p.x-=p.speed;p.facing=-1} if(keys['arrowright']||keys['d']){p.x+=p.speed;p.facing=1}
  if(keys['arrowup']||keys['w'])p.y-=p.speed*.7; if(keys['arrowdown']||keys['s'])p.y+=p.speed*.7;
  p.x=clamp(p.x,42,918); p.y=clamp(p.y,305,405);
  if(p.attackCooldown>0)p.attackCooldown--; if(p.attackTimer>0)p.attackTimer--;
  if(keys[' ']&&p.attackCooldown<=0){
    p.attackCooldown=24;p.attackTimer=10;game.flash=7;
    game.enemies.forEach(e=>{if(!e.alive)return;const dx=e.x-p.x,dy=Math.abs(e.y-p.y),face=p.facing>0?dx>0:dx<0;if(Math.abs(dx)<78&&dy<48&&face){e.hp--;e.hurt=10;e.x+=p.facing*24;if(e.hp<=0)e.alive=false}});
  }
  game.enemies.forEach(e=>{
    if(!e.alive)return;if(e.hurt>0){e.hurt--;return}
    const dx=p.x-e.x,dy=p.y-e.y;if(Math.abs(dx)>42)e.x+=Math.sign(dx)*e.speed;if(Math.abs(dy)>8)e.y+=Math.sign(dy)*e.speed*.45;
    if(Math.abs(dx)<34&&Math.abs(dy)<42&&game.tick%18===0)p.hp=Math.max(0,p.hp-.35);
  });
  if(game.flash>0)game.flash--;
  if(p.hp<=0){game.over=true;game.win=false;els.proto.innerHTML='<b>Player defeated.</b><br>Press R to retry.'}
  if(game.enemies.every(e=>!e.alive)){game.over=true;game.win=true;els.proto.innerHTML='<b>Stage clear.</b><br>Press R to retry.'}
}

function drawGame(ctx,packet) {
  const sg=packet.canonicalSceneGraph,w=960,h=540;
  ctx.clearRect(0,0,w,h);
  const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#071126');g.addColorStop(.45,'#16244e');g.addColorStop(1,'#2f2530');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#dedfff';ctx.beginPath();ctx.arc(620,86,20,0,Math.PI*2);ctx.fill();
  skyline(ctx);
  // building
  ctx.fillStyle='#53331f';ctx.fillRect(0,120,160,210);ctx.fillStyle='#21405a';ctx.fillRect(22,160,40,38);ctx.fillStyle='#a8d8dd';ctx.font='bold 22px Arial';ctx.fillText('B7',28,187);
  ctx.fillStyle='#321f18';ctx.fillRect(18,220,72,88);ctx.fillStyle='#c6b69d';ctx.font='bold 11px Arial';ctx.fillText('SECURITY',28,251);ctx.fillText('LEVEL 3',28,267);
  // fence
  ctx.strokeStyle='#75818a';ctx.lineWidth=2;ctx.strokeRect(176,190,300,112);for(let x=176;x<476;x+=16){ctx.beginPath();ctx.moveTo(x,190);ctx.lineTo(x+16,302);ctx.stroke();ctx.beginPath();ctx.moveTo(x+16,190);ctx.lineTo(x,302);ctx.stroke()}
  ctx.fillStyle='#6c6045';ctx.fillRect(244,208,94,44);ctx.fillStyle='#24242c';ctx.font='bold 13px Arial';ctx.fillText('CAUTION',252,226);ctx.fillText('KEEP OUT',250,243);
  barrel(ctx,190,280,'#5b7f3b');barrel(ctx,228,280,'#5b7f3b');
  // container
  ctx.fillStyle='#713a24';ctx.fillRect(510,170,255,136);ctx.fillStyle='#9b5130';for(let x=530;x<760;x+=28)ctx.fillRect(x,170,4,136);ctx.fillStyle='#bd8847';ctx.font='bold 30px Arial';ctx.fillText('ZENITH',545,235);ctx.font='bold 20px Arial';ctx.fillText('INDUSTRIES',526,264);
  ctx.fillStyle='#d7c23c';ctx.fillRect(678,207,46,46);ctx.fillStyle='#28220f';ctx.font='bold 12px Arial';ctx.fillText('DANGER',674,267);
  // ladder
  ctx.strokeStyle='#aaa';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(780,166);ctx.lineTo(780,306);ctx.moveTo(800,166);ctx.lineTo(800,306);for(let y=176;y<304;y+=16){ctx.moveTo(780,y);ctx.lineTo(800,y)}ctx.stroke();
  // floor
  ctx.fillStyle='#47414a';ctx.fillRect(0,310,w,h-310);for(let x=0;x<w;x+=56){ctx.strokeStyle='#5b5560';ctx.beginPath();ctx.moveTo(x,370);ctx.lineTo(x+56,362);ctx.stroke()}
  for(let x=0;x<w;x+=28){ctx.fillStyle=x%56===0?'#d0a52c':'#202124';ctx.beginPath();ctx.moveTo(x,514);ctx.lineTo(x+20,514);ctx.lineTo(x+28,540);ctx.lineTo(x+8,540);ctx.closePath();ctx.fill()}
  barrel(ctx,890,346,'#74381f');
  drawPlayer(ctx,game.player);game.enemies.forEach((e,i)=>drawEnemy(ctx,e,i));
  hud(ctx,packet);
  if(game.flash>0){ctx.fillStyle=`rgba(255,236,170,${game.flash*.04})`;ctx.fillRect(0,0,w,h)}
  if(game.over){ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 42px Arial';ctx.fillText(game.win?'STAGE CLEAR':'YOU LOSE',480,280);ctx.font='bold 18px Arial';ctx.fillText('Press R to retry',480,318);ctx.textAlign='left'}
}

function drawPlayer(ctx,p) {
  shadow(ctx,p.x,p.y+34);ctx.fillStyle='#ece9df';ctx.fillRect(p.x-14,p.y-4,12,36);ctx.fillRect(p.x+2,p.y-4,12,36);ctx.fillStyle='#f7f5f1';ctx.fillRect(p.x-18,p.y-34,36,38);ctx.fillStyle='#161616';ctx.fillRect(p.x-20,p.y-2,40,4);
  ctx.fillStyle='#8a5936';if(p.attackTimer>0){ctx.fillRect(p.x+(p.facing>0?10:-38),p.y-28,30,8);const sx=p.x+(p.facing>0?44:-44),sy=p.y-24;ctx.strokeStyle='#ffd04f';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(sx-8,sy);ctx.lineTo(sx+8,sy);ctx.moveTo(sx,sy-8);ctx.lineTo(sx,sy+8);ctx.stroke()}else{ctx.fillRect(p.x-24,p.y-28,14,8);ctx.fillRect(p.x+10,p.y-28,14,8)}
  ctx.fillStyle='#8f603b';ctx.beginPath();ctx.arc(p.x,p.y-46,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#171717';ctx.beginPath();ctx.arc(p.x,p.y-53,18,0,Math.PI*2);ctx.fill();
}

function drawEnemy(ctx,e,i) {
  if(!e.alive)return;shadow(ctx,e.x,e.y+32);ctx.fillStyle=e.hurt>0?'#ffd087':['#6b4051','#3c5f8e','#486c48'][i%3];ctx.fillRect(e.x-16,e.y-30,32,34);ctx.fillStyle=['#78344c','#315489','#47663d'][i%3];ctx.fillRect(e.x-12,e.y-16,24,20);ctx.fillStyle='#71834b';ctx.fillRect(e.x-14,e.y+4,12,30);ctx.fillRect(e.x+2,e.y+4,12,30);ctx.fillStyle='#c88758';ctx.beginPath();ctx.arc(e.x,e.y-40,13,0,Math.PI*2);ctx.fill();ctx.fillStyle=i===0?'#cf3151':'#2452b9';ctx.fillRect(e.x-14,e.y-52,28,6);
  if(e.weapon==='knife'){ctx.fillStyle='#d4d4d5';ctx.fillRect(e.x+16,e.y-20,13,3)}
  for(let hp=0;hp<e.hp;hp++){ctx.fillStyle='#f2bd39';ctx.fillRect(e.x-14+hp*10,e.y-66,8,4)}
}

function hud(ctx,packet) {
  ctx.fillStyle='#020305';ctx.fillRect(0,0,960,66);ctx.fillRect(0,508,960,32);ctx.fillStyle='#f1cc38';ctx.font='bold 18px Arial';ctx.fillText((packet.canonicalSceneGraph.entities.find(x=>x.type==='player')?.name||'PLAYER').toUpperCase(),74,24);ctx.fillStyle='#fff';ctx.fillText('0124500',170,24);ctx.fillText('×3',304,24);ctx.fillStyle='#f59a23';ctx.font='bold 44px Arial';ctx.fillText(String(Math.max(0,74-Math.floor(game.tick/90))).padStart(2,'0'),466,46);ctx.fillStyle='#92b7ff';ctx.font='bold 20px Arial';ctx.fillText('PRESS START',730,24);
  ctx.fillStyle='#314462';ctx.fillRect(14,12,42,42);ctx.fillStyle='#d6c04a';ctx.fillRect(76,32,126,10);ctx.fillStyle='#2da8e2';ctx.fillRect(76,32,126*(game.player.hp/10),10);ctx.strokeStyle='#fff';ctx.strokeRect(76,32,126,10);
  ctx.fillStyle='#d5d9e2';ctx.font='bold 17px Arial';ctx.fillText('STAGE 3-1',420,530);
  game.enemies.slice(0,2).forEach((e,i)=>{const x=i?700:126,label=i?'BANDANA':'KNIFE';ctx.fillStyle='#fff';ctx.fillText(label,x-22,529);ctx.fillStyle='#c22828';ctx.fillRect(x+52,517,108,8);ctx.fillStyle='#f2bf38';ctx.fillRect(x+52,517,108*Math.max(0,e.hp)/3,8)})
}

function skyline(ctx) {ctx.fillStyle='#1f274e';[80,130,110,160,100,180,150,95,200,120,165,145,92].forEach((ht,i)=>ctx.fillRect(200+i*46,220-ht,28,ht));ctx.strokeStyle='#294667';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(795,118);ctx.lineTo(845,58);ctx.lineTo(898,118);ctx.stroke()}
function barrel(ctx,x,y,color) {ctx.fillStyle=color;ctx.fillRect(x,y,34,52);ctx.strokeStyle='#292529';ctx.lineWidth=2;ctx.strokeRect(x,y,34,52);ctx.beginPath();ctx.moveTo(x,y+12);ctx.lineTo(x+34,y+12);ctx.moveTo(x,y+36);ctx.lineTo(x+34,y+36);ctx.stroke()}
function shadow(ctx,x,y) {ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y,20,7,0,0,Math.PI*2);ctx.fill()}
function inferTitle(t) {return /alex/i.test(t)&&/dockyard|shipping|container/i.test(t)?'Urban Shipping Clash':'XPLAY Prototype Draft'}
function normalizeGenre(g) {g=g.toLowerCase().replace(/\s+/g,'');if(g==='openworld')return'openworld';if(g==='collectible')return'collect';return g}
function dedupeGenreScores(arr) {const m=new Map();arr.forEach(x=>{if(!m.has(x.type)||m.get(x.type).score<x.score)m.set(x.type,x)});return[...m.values()]}
function slug(s) {return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function clean(s) {return String(s||'').replace(/^[\s:;,-]+|[\s:;,-]+$/g,'').replace(/\s+/g,' ')}
function clamp(v,a,b) {return Math.max(a,Math.min(b,v))}
function esc(v) {return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function setStatus(s) {els.status.textContent=s}

currentPacket=interpret();render(currentPacket);setStatus('Sample loaded. V2 is ready.');
