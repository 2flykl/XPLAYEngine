const sampleText = `**Description:** [XPLAY REVERSE FORGE — SCREENSHOT TO GAME] The uploaded screenshot is a VISUAL SPECIFICATION, not merely inspiration. EXACT VISUAL BLUEPRINT: preserve the visible composition and spatial relationships as closely as technically possible. PRESERVE: layout, artStyle, camera, palette, levelStructure. Reconstruct visible player scale, camera framing, object relationships, spatial hierarchy, palette, environment grammar, apparent gameplay cues, and major landmarks. Infer only information that is not observable in the screenshot. Any inferred content must extend the screenshot’s established visual and gameplay grammar rather than replace it. I see Alex, a Black male character with a prominent afro wearing a white martial arts gi with a black belt and wrist wraps, fighting barefoot; executing an open-palm strike to the right inside Urban shipping dockyard or industrial facility at night featuring a reddish-brown shipping container labeled 'ZENITH INDUSTRIES', yellow 'DANGER' sign, metal ladder, green toxic/chemical barrels behind chain-link fence ('CAUTION KEEP OUT'), brick building entrance ('SECURITY LEVEL 3', room 'B7'), dark night sky with full moon, glowing blue/purple skyline with skyscrapers and industrial cranes, concrete floor with yellow-and-black hazard stripes, drain grates, and rivets. Important visible elements include Shipping container, Yellow 'DANGER' sign, Metal ladder, Green toxic/chemical barrels, Chain-link fence, Caution sign, Exterior lamp, Rusty brown oil drum, Combat knife. The strongest playable cues suggest fighting 95%, platformer 60%, dodge 45%. I will treat the screenshot as a visual specification and preserve its visible composition unless you tell me otherwise. PLAYER IDENTITY: source USER GAMEPLAY INTENT: Fight visible rivals in Urban shipping dockyard or industrial facility at night featuring a reddish-brown shipping container labeled 'ZENITH INDUSTRIES', yellow 'DANGER' sign, metal ladder, green toxic/chemical barrels behind chain-link fence ('CAUTION KEEP OUT'), brick building entrance ('SECURITY LEVEL 3', room 'B7'), dark night sky with full moon, glowing blue/purple skyline with skyscrapers and industrial cranes, concrete floor with yellow-and-black hazard stripes, drain grates, and rivets as Alex, a Black male character with a prominent afro wearing a white martial arts gi with a black belt and wrist wraps, fighting barefoot; executing an open-palm strike to the right, using the source combat plane and Shipping container, Yellow 'DANGER' sign, Metal ladder, Green toxic/chemical barrels, Chain-link fence, Caution sign, Exterior lamp, Rusty brown oil drum, Combat knife; support beat-em-up progression when multiple enemies are visible. Preserve the CURRENT screenshot camera, layout, player scale, palette, HUD language and major object relationships. Unknown facts remain unknown.`;

const els = {
  titleInput: document.getElementById('titleInput'),
  genreOverride: document.getElementById('genreOverride'),
  preserveCamera: document.getElementById('preserveCamera'),
  descriptionInput: document.getElementById('descriptionInput'),
  parseBtn: document.getElementById('parseBtn'),
  buildBtn: document.getElementById('buildBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  clearBtn: document.getElementById('clearBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  statusBar: document.getElementById('statusBar'),
  summaryGrid: document.getElementById('summaryGrid'),
  sceneJson: document.getElementById('sceneJson'),
  blueprintJson: document.getElementById('blueprintJson'),
  manifestJson: document.getElementById('manifestJson'),
  recommendations: document.getElementById('recommendations'),
  protoStatus: document.getElementById('protoStatus'),
  gameCanvas: document.getElementById('gameCanvas')
};

els.descriptionInput.value = sampleText;

let currentPacket = null;
let game = null;
let keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
  if (e.key.toLowerCase() === 'r' && currentPacket) startGame(currentPacket);
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

els.loadSampleBtn.onclick = () => {
  els.titleInput.value = 'Urban Shipping Clash';
  els.genreOverride.value = '';
  els.preserveCamera.value = 'true';
  els.descriptionInput.value = sampleText;
  setStatus('Sample description loaded.');
};

els.clearBtn.onclick = () => {
  els.titleInput.value = '';
  els.genreOverride.value = '';
  els.descriptionInput.value = '';
  setStatus('Cleared. Paste a new description to test another build.');
};

els.parseBtn.onclick = () => {
  currentPacket = buildAllPackets();
  renderOutputs(currentPacket);
  setStatus('Description parsed into scene packet, gameplay blueprint, and asset manifest.');
};

els.buildBtn.onclick = () => {
  currentPacket = buildAllPackets();
  renderOutputs(currentPacket);
  startGame(currentPacket);
  setStatus('Prototype built. Use arrow keys / WASD to move and Space to attack.');
};

els.downloadBtn.onclick = () => {
  if (!currentPacket) currentPacket = buildAllPackets();
  const blob = new Blob([JSON.stringify(currentPacket, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(currentPacket.meta.title || 'xplay-description-packet')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('Packet JSON downloaded.');
};

function setStatus(text) {
  els.statusBar.textContent = text;
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildAllPackets() {
  const text = (els.descriptionInput.value || '').trim();
  const title = (els.titleInput.value || '').trim() || inferTitle(text);
  const genreInfo = detectGenre(text, els.genreOverride.value);
  const player = parsePlayer(text);
  const enemies = parseEnemies(text, genreInfo.primary);
  const environment = parseEnvironment(text);
  const landmarks = parseVisibleElements(text, environment);
  const camera = parseCamera(text, genreInfo.primary);
  const gameplay = buildGameplay(title, genreInfo, player, enemies, environment, landmarks, camera);
  const assetManifest = buildAssetManifest(player, enemies, environment, landmarks, genreInfo.primary);

  return {
    meta: {
      title,
      createdAt: new Date().toISOString(),
      source: 'description-to-playable-lab',
      preserveCamera: els.preserveCamera.value === 'true',
      editableSourceText: true
    },
    scenePacket: {
      title,
      genreCandidates: genreInfo.candidates,
      primaryGenre: genreInfo.primary,
      camera,
      player,
      enemies,
      environment,
      landmarks,
      inferredRules: {
        preserveVisibleComposition: true,
        inferOnlyMissingDetails: true,
        useSceneAsSpecification: true
      },
      sourceText: text
    },
    gameplayBlueprint: gameplay,
    assetManifest,
    recommendations: buildRecommendations(genreInfo.primary, camera, landmarks)
  };
}

function inferTitle(text) {
  if (/alex/i.test(text) && /dockyard|shipping|container/i.test(text)) return 'Urban Shipping Clash';
  if (/racing/i.test(text)) return 'Street Circuit Draft';
  return 'XPLAY Prototype Draft';
}

function detectGenre(text, override) {
  const genres = {
    fighting: score(text, ['fight', 'fighting', 'beat-em-up', 'beat em up', 'brawler', 'rival', 'punch', 'kick', 'enemy']),
    platformer: score(text, ['platform', 'jump', 'ledge', 'terrain', 'collectible']),
    fps: score(text, ['crosshair', 'gun', 'aim', 'shooter', 'fps', 'first-person']),
    runner: score(text, ['runner', 'run', 'lane', 'speed']),
    dodge: score(text, ['dodge', 'avoid', 'evade']),
    puzzle: score(text, ['puzzle', 'match', 'grid']),
    rhythm: score(text, ['rhythm', 'beat', 'music', 'timing']),
    openworld: score(text, ['open world', 'explore', 'quest', 'district']),
    racing: score(text, ['racing', 'vehicle', 'track', 'boost']),
    collect: score(text, ['collect', 'gather', 'pickup'])
  };

  const candidates = Object.entries(genres)
    .map(([type, raw]) => ({ type, score: Math.min(0.99, Number(raw.toFixed(2))) }))
    .sort((a, b) => b.score - a.score);

  let primary = override || candidates[0]?.type || 'platformer';
  if (!override && candidates[0]?.score <= 0.1) primary = 'platformer';
  return { primary, candidates };
}

function score(text, words) {
  const lower = text.toLowerCase();
  let total = 0;
  words.forEach((w) => { if (lower.includes(w)) total += 1; });
  const hint = /fighting 95%/i.test(text) && words.includes('fighting') ? 6 : 0;
  return (total + hint) / Math.max(words.length, 6);
}

function parsePlayer(text) {
  const nameMatch = text.match(/I see\s+([A-Z][a-zA-Z0-9_-]+)/i) || text.match(/player candidate.*?named\s+([A-Z][a-zA-Z0-9_-]+)/i);
  const name = nameMatch ? nameMatch[1] : 'Player';
  const appearance = [];
  if (/afro/i.test(text)) appearance.push('afro');
  if (/white martial arts gi|white gi/i.test(text)) appearance.push('white gi');
  if (/black belt/i.test(text)) appearance.push('black belt');
  if (/wrist wrap/i.test(text)) appearance.push('wrist wraps');
  if (/barefoot/i.test(text)) appearance.push('barefoot');
  const actionMatch = text.match(/executing\s+([^.;]+)/i) || text.match(/pose\/action:\s*([^\n]+)/i);
  return {
    id: 'player',
    name,
    identity: /black male/i.test(text) ? 'Black male' : 'unknown',
    appearance,
    action: actionMatch ? cleanText(actionMatch[1]) : 'idle',
    startPosition: { x: 320, y: 366 },
    movement: '8-way side-view plane',
    controls: ['left', 'right', 'up', 'down', 'attack']
  };
}

function parseEnemies(text, genre) {
  const results = [];
  if (/combat knife|knife/i.test(text)) {
    results.push({ id: 'knife-punk', label: 'Knife Punk', role: 'enemy', weapon: 'knife', positionHint: 'left', x: 160, y: 360, hp: 3 });
  }
  if (/bandana/i.test(text)) {
    results.push({ id: 'bandana-rival', label: 'Bandana Rival', role: 'enemy', weapon: 'fists', positionHint: 'center-right', x: 560, y: 360, hp: 3 });
  }
  if (/multiple enemies|far-right|rivals/i.test(text)) {
    results.push({ id: 'dock-bruiser', label: 'Dock Bruiser', role: 'enemy', weapon: 'fists', positionHint: 'far-right', x: 760, y: 360, hp: 3 });
  }
  if (!results.length && genre === 'fighting') {
    results.push({ id: 'enemy-1', label: 'Enemy 1', role: 'enemy', weapon: 'fists', positionHint: 'right', x: 620, y: 360, hp: 3 });
    results.push({ id: 'enemy-2', label: 'Enemy 2', role: 'enemy', weapon: 'fists', positionHint: 'far-right', x: 760, y: 360, hp: 3 });
  }
  return results;
}

function parseEnvironment(text) {
  const typeMatch = text.match(/inside\s+([^.;]+)/i) || text.match(/location:\s*([^\n]+)/i);
  const location = typeMatch ? cleanText(typeMatch[1]) : 'Side-view game environment';
  const palette = [];
  if (/blue\/purple|blue\/purple skyline|blue\/purple/i.test(text)) palette.push('blue', 'purple');
  if (/yellow-and-black|yellow and black/i.test(text)) palette.push('yellow', 'black');
  if (/reddish-brown/i.test(text)) palette.push('reddish-brown');
  return {
    location,
    timeOfDay: /night/i.test(text) ? 'night' : 'unknown',
    palette: [...new Set(palette)],
    mood: /industrial|dockyard/i.test(text) ? 'industrial urban tension' : 'unspecified',
    levelPlane: /side-view|side-scrolling|combat plane/i.test(text) ? 'side-view combat plane' : '2D plane'
  };
}

function parseVisibleElements(text, environment) {
  const elements = [];
  const explicit = text.match(/Important visible elements include\s+([^.;]+)/i);
  if (explicit) {
    explicit[1].split(',').map(s => cleanText(s)).filter(Boolean).forEach(item => elements.push(item));
  }
  [
    ['ZENITH INDUSTRIES container', /zenith industries|shipping container/i],
    ['DANGER sign', /danger sign|yellow 'd a n g e r'|yellow 'DANGER'/i],
    ['metal ladder', /metal ladder|ladder/i],
    ['green barrels', /green toxic|barrels/i],
    ['chain-link fence', /chain-link fence/i],
    ['CAUTION KEEP OUT sign', /caution keep out/i],
    ['brick building B7', /security level 3|b7/i],
    ['oil drum', /oil drum|rusty brown oil drum/i],
    ['hazard-striped floor', /hazard stripes|yellow-and-black hazard/i],
    ['full moon skyline', /full moon|skyline/i]
  ].forEach(([label, regex]) => {
    if (regex.test(text) && !elements.some((e) => e.toLowerCase() === label.toLowerCase())) elements.push(label);
  });
  return elements;
}

function parseCamera(text, genre) {
  if (/side-scrolling|fixed 2d orthographic camera|side-view/i.test(text) || genre === 'fighting') {
    return {
      type: '2d-side-view',
      framing: 'medium wide',
      movementPlane: 'horizontal with depth lane',
      preserveCurrentFraming: els.preserveCamera.value === 'true'
    };
  }
  return {
    type: genre === 'fps' ? 'first-person' : '2d-generic',
    framing: 'adaptive',
    movementPlane: 'genre-dependent',
    preserveCurrentFraming: els.preserveCamera.value === 'true'
  };
}

function buildGameplay(title, genreInfo, player, enemies, environment, landmarks, camera) {
  const genre = genreInfo.primary;
  const blueprint = {
    title,
    engine: genre,
    overview: '',
    objective: '',
    playerStart: player.startPosition,
    controls: player.controls,
    camera,
    world: {
      width: 960,
      height: 540,
      floorY: 396,
      walkLaneTop: 300,
      walkLaneBottom: 396,
      layers: ['sky', 'background skyline', 'midground structures', 'combat plane', 'foreground props'],
      landmarks
    },
    enemies,
    rules: {},
    progression: []
  };

  if (genre === 'fighting') {
    blueprint.overview = 'Side-view beat-em-up graybox built from the description.';
    blueprint.objective = 'Defeat all visible enemies to clear the stage.';
    blueprint.rules = {
      attackRange: 70,
      enemyContactDamage: 0.18,
      playerAttackDamage: 1,
      enemiesAdvanceTowardPlayer: true,
      stageClearsWhenEnemiesDefeated: true
    };
    blueprint.progression = [
      'Spawn player and visible enemies on the combat plane.',
      'Preserve dockyard composition with container, fence, barrels, and warning props.',
      'Let player move on a shallow depth lane.',
      'Allow punch/open-palm attack to defeat enemies.',
      'Clear stage when all enemy HP reaches 0.'
    ];
  } else {
    blueprint.overview = 'Genre-selected prototype built from the description.';
    blueprint.objective = 'Reach a simple goal state based on the detected genre.';
    blueprint.rules = { placeholder: true };
    blueprint.progression = ['Prototype route established from text description.'];
  }

  return blueprint;
}

function buildAssetManifest(player, enemies, environment, landmarks, genre) {
  return {
    policy: {
      isolateFromLegacyAssets: true,
      useFreshPlaceholdersFirst: true,
      permitLaterReplacementWithExtractedArt: true
    },
    mustRepresentInGraybox: [
      `${player.name} player avatar`,
      ...enemies.map(e => e.label),
      ...landmarks.slice(0, 8)
    ],
    extractIfImageAvailableLater: [
      'player sprite reference',
      'enemy sprite references',
      'floor texture sample',
      'container signage sample',
      'UI / HUD language sample'
    ],
    generateLater: genre === 'fighting'
      ? ['combat hit effect', 'walk / attack animation set', 'layered skyline extension', 'dockyard prop variants']
      : ['genre-specific assets'],
    placeholdersNow: ['player shape', 'enemy shapes', 'barrels', 'container block', 'fence block', 'warning signs'],
    rejectLegacyIfNamed: ['sky', 'backgroundFar', 'backgroundMid', 'signatureJet', 'crosshair', 'terrain00'],
    environmentMood: environment.mood
  };
}

function buildRecommendations(genre, camera, landmarks) {
  const list = [
    {
      title: 'Best next step',
      body: 'Treat the text as a build specification and validate the gameplay loop in graybox before reconnecting to final asset generation.'
    },
    {
      title: 'Why this isolated lab helps',
      body: 'It removes stale Reverse Forge asset dependencies and proves the interpreter layer on its own.'
    },
    {
      title: 'Recommended pipeline',
      body: 'Description → Scene Packet → Gameplay Blueprint → Asset Manifest → Playable Graybox → Later Art Pass.'
    }
  ];
  if (genre === 'fighting') {
    list.push({
      title: 'Genre-specific suggestion',
      body: 'For beat-em-up scenes, preserve the side-view camera, horizontal progression, shallow vertical walk lane, and 3-enemy formation.'
    });
  }
  if (camera.type === '2d-side-view') {
    list.push({
      title: 'Camera rule',
      body: 'Keep the camera fixed and let the prototype prove character spacing, hit range, and stage readability.'
    });
  }
  if (landmarks.length) {
    list.push({
      title: 'Landmark priority',
      body: `Carry these major landmarks through every later step: ${landmarks.slice(0, 5).join(', ')}.`
    });
  }
  return list;
}

function cleanText(value) {
  return String(value || '').replace(/^[\s:;,-]+|[\s:;,-]+$/g, '').replace(/\s+/g, ' ');
}

function renderOutputs(packet) {
  els.sceneJson.textContent = JSON.stringify(packet.scenePacket, null, 2);
  els.blueprintJson.textContent = JSON.stringify(packet.gameplayBlueprint, null, 2);
  els.manifestJson.textContent = JSON.stringify(packet.assetManifest, null, 2);

  els.summaryGrid.innerHTML = '';
  const cards = [
    ['Title', packet.meta.title],
    ['Primary Genre', packet.scenePacket.primaryGenre],
    ['Player', packet.scenePacket.player.name],
    ['Enemies', String(packet.scenePacket.enemies.length)],
    ['Environment', packet.scenePacket.environment.timeOfDay + ' · ' + packet.scenePacket.environment.mood],
    ['Camera', packet.scenePacket.camera.type],
    ['Landmarks', String(packet.scenePacket.landmarks.length)],
    ['Goal', packet.gameplayBlueprint.objective]
  ];
  cards.forEach(([label, value]) => {
    const div = document.createElement('div');
    div.className = 'summary-card';
    div.innerHTML = `<div class="label">${label}</div><div class="value">${escapeHtml(value)}</div>`;
    els.summaryGrid.appendChild(div);
  });

  els.recommendations.innerHTML = packet.recommendations.map((r) => `
    <div class="rec-item">
      <b>${escapeHtml(r.title)}</b>
      <div>${escapeHtml(r.body)}</div>
    </div>
  `).join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function startGame(packet) {
  const canvas = els.gameCanvas;
  const ctx = canvas.getContext('2d');
  const bp = packet.gameplayBlueprint;

  game = {
    over: false,
    win: false,
    flashTimer: 0,
    player: {
      x: bp.playerStart.x,
      y: bp.playerStart.y,
      w: 34,
      h: 62,
      speed: 3.3,
      hp: 10,
      facing: 1,
      attackCooldown: 0,
      attackTimer: 0
    },
    enemies: bp.enemies.map((e, index) => ({
      ...e,
      w: 34,
      h: 58,
      speed: 1 + index * 0.08,
      alive: true,
      hurtTimer: 0,
      aiOffset: Math.random() * 40 - 20
    })),
    barrel: { x: 885, y: 348, w: 40, h: 64 },
    container: { x: 510, y: 170, w: 250, h: 135 },
    fence: { x: 180, y: 190, w: 290, h: 110 },
    floorY: bp.world.floorY,
    tick: 0
  };

  els.protoStatus.innerHTML = `
    <b>${escapeHtml(packet.meta.title)}</b><br>
    Engine: ${escapeHtml(bp.engine)}<br>
    Goal: ${escapeHtml(bp.objective)}<br>
    Enemies: ${bp.enemies.length}<br>
    Status: Prototype active.
  `;

  function loop() {
    if (!game) return;
    updateGame();
    drawGame(ctx, packet);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function updateGame() {
  if (!game || game.over) return;
  game.tick += 1;
  const p = game.player;
  const laneTop = 308;
  const laneBottom = 392;

  if ((keys['arrowleft'] || keys['a'])) { p.x -= p.speed; p.facing = -1; }
  if ((keys['arrowright'] || keys['d'])) { p.x += p.speed; p.facing = 1; }
  if ((keys['arrowup'] || keys['w'])) p.y -= p.speed * 0.7;
  if ((keys['arrowdown'] || keys['s'])) p.y += p.speed * 0.7;
  p.x = clamp(p.x, 42, 918);
  p.y = clamp(p.y, laneTop, laneBottom);

  if (p.attackCooldown > 0) p.attackCooldown--;
  if (p.attackTimer > 0) p.attackTimer--;

  if (keys[' '] && p.attackCooldown <= 0) {
    p.attackCooldown = 26;
    p.attackTimer = 10;
    game.flashTimer = 8;
    game.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const dx = enemy.x - p.x;
      const dy = Math.abs(enemy.y - p.y);
      const facingOk = p.facing === 1 ? dx > 0 : dx < 0;
      if (Math.abs(dx) < 76 && dy < 46 && facingOk) {
        enemy.hp -= 1;
        enemy.hurtTimer = 10;
        enemy.x += p.facing * 22;
        if (enemy.hp <= 0) enemy.alive = false;
      }
    });
  }

  game.enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    if (enemy.hurtTimer > 0) enemy.hurtTimer--;
    if (enemy.hurtTimer === 0) {
      const xDir = p.x > enemy.x ? 1 : -1;
      const yDir = p.y > enemy.y + enemy.aiOffset ? 1 : -1;
      enemy.x += xDir * enemy.speed;
      if (Math.abs(p.y - enemy.y) > 8) enemy.y += yDir * enemy.speed * 0.4;
    }
    const touching = rectsClose(p.x, p.y, enemy.x, enemy.y, 36, 48);
    if (touching && game.tick % 20 === 0) p.hp = Math.max(0, p.hp - 0.4);
  });

  if (game.flashTimer > 0) game.flashTimer--;
  if (p.hp <= 0) {
    game.over = true;
    game.win = false;
    els.protoStatus.innerHTML = `<b>Prototype result:</b><br>Player defeated. Press R to retry.`;
  }
  if (game.enemies.every((e) => !e.alive)) {
    game.over = true;
    game.win = true;
    els.protoStatus.innerHTML = `<b>Prototype result:</b><br>Stage clear. All visible enemies defeated. Press R to retry.`;
  }
}

function drawGame(ctx, packet) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);

  // sky
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#071126');
  grad.addColorStop(0.45, '#152147');
  grad.addColorStop(1, '#2f2431');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // moon
  ctx.fillStyle = '#d9dcff';
  ctx.beginPath();
  ctx.arc(610, 82, 20, 0, Math.PI * 2);
  ctx.fill();

  // skyline
  drawSkyline(ctx);

  // building left
  ctx.fillStyle = '#513423';
  ctx.fillRect(0, 120, 155, 215);
  ctx.fillStyle = '#27425a';
  ctx.fillRect(18, 162, 38, 38);
  ctx.fillStyle = '#9ad6e0';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('B7', 24, 188);
  ctx.fillStyle = '#492617';
  ctx.fillRect(18, 218, 65, 90);
  ctx.fillStyle = '#c4b69b';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('SECURITY', 28, 252);
  ctx.fillText('LEVEL 3', 28, 268);

  // lamp glow
  ctx.fillStyle = '#e0c56f';
  ctx.beginPath();
  ctx.arc(58, 140, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(224,197,111,0.15)';
  ctx.beginPath();
  ctx.arc(58, 140, 24, 0, Math.PI * 2);
  ctx.fill();

  // fence
  ctx.strokeStyle = '#79838d';
  ctx.strokeRect(game.fence.x, game.fence.y, game.fence.w, game.fence.h);
  for (let x = game.fence.x; x < game.fence.x + game.fence.w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, game.fence.y);
    ctx.lineTo(x + 16, game.fence.y + game.fence.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 16, game.fence.y);
    ctx.lineTo(x, game.fence.y + game.fence.h);
    ctx.stroke();
  }
  ctx.fillStyle = '#6b5f44';
  ctx.fillRect(244, 207, 92, 44);
  ctx.fillStyle = '#2b2530';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('CAUTION', 252, 226);
  ctx.fillText('KEEP OUT', 249, 243);

  // barrels
  drawBarrel(ctx, 186, 284, '#5a7d39');
  drawBarrel(ctx, 225, 284, '#5a7d39');

  // container
  ctx.fillStyle = '#713a24';
  ctx.fillRect(game.container.x, game.container.y, game.container.w, game.container.h);
  ctx.fillStyle = '#a45a35';
  for (let x = game.container.x + 24; x < game.container.x + game.container.w; x += 28) {
    ctx.fillRect(x, game.container.y, 4, game.container.h);
  }
  ctx.fillStyle = '#c08a4d';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('ZENITH', 542, 236);
  ctx.font = 'bold 22px Arial';
  ctx.fillText('INDUSTRIES', 523, 266);
  ctx.fillStyle = '#d8c141';
  ctx.fillRect(680, 208, 44, 44);
  ctx.fillStyle = '#2a2412';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('⚡', 695, 236);
  ctx.fillStyle = '#2a2412';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('DANGER', 674, 266);

  // ladder
  ctx.strokeStyle = '#aaaeb2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(768, 165); ctx.lineTo(768, 304);
  ctx.moveTo(790, 165); ctx.lineTo(790, 304);
  for (let y = 175; y < 300; y += 16) { ctx.moveTo(768, y); ctx.lineTo(790, y); }
  ctx.stroke();

  // ground
  ctx.fillStyle = '#47414b';
  ctx.fillRect(0, 312, w, h - 312);
  drawGroundDetails(ctx, w, h);

  // barrel foreground
  drawBarrel(ctx, game.barrel.x, game.barrel.y, '#72361f', true);

  // player + enemies
  drawPlayer(ctx, game.player);
  game.enemies.forEach(enemy => drawEnemy(ctx, enemy));

  // hit flash
  if (game.flashTimer > 0) {
    ctx.fillStyle = `rgba(255,240,180,${0.05 * game.flashTimer})`;
    ctx.fillRect(0, 0, w, h);
  }

  // HUD
  drawHud(ctx, packet);

  if (game.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px Arial';
    ctx.fillText(game.win ? 'STAGE CLEAR' : 'YOU LOSE', w / 2, h / 2 - 10);
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Press R to retry', w / 2, h / 2 + 28);
    ctx.textAlign = 'left';
  }
}

function drawSkyline(ctx) {
  ctx.fillStyle = '#1f274e';
  const heights = [80, 130, 110, 160, 100, 180, 150, 95, 200, 120, 165, 145, 92];
  heights.forEach((ht, i) => ctx.fillRect(200 + i * 46, 220 - ht, 28, ht));
  ctx.strokeStyle = '#2a466a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(794, 118); ctx.lineTo(845, 58); ctx.lineTo(897, 118);
  ctx.moveTo(310, 130); ctx.lineTo(350, 70); ctx.lineTo(390, 130);
  ctx.stroke();
}

function drawGroundDetails(ctx, w, h) {
  ctx.strokeStyle = '#5c5661';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 55) {
    ctx.beginPath();
    ctx.moveTo(x, 365 + (x % 2 ? 6 : -4));
    ctx.lineTo(x + 55, 360 + (x % 2 ? -4 : 6));
    ctx.stroke();
  }
  // hazard stripe edge
  for (let x = 0; x < w; x += 28) {
    ctx.fillStyle = x % 56 === 0 ? '#d0a62c' : '#1f2023';
    ctx.beginPath();
    ctx.moveTo(x, 514); ctx.lineTo(x + 20, 514); ctx.lineTo(x + 28, 540); ctx.lineTo(x + 8, 540); ctx.closePath();
    ctx.fill();
  }
  // drain grate
  ctx.fillStyle = '#33303a';
  ctx.fillRect(145, 364, 46, 10);
  ctx.strokeStyle = '#54515d';
  for (let x = 149; x < 188; x += 7) { ctx.beginPath(); ctx.moveTo(x, 364); ctx.lineTo(x, 374); ctx.stroke(); }
}

function drawBarrel(ctx, x, y, color, front = false) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 34, 52);
  ctx.strokeStyle = '#2b2528';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 34, 52);
  ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x + 34, y + 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + 36); ctx.lineTo(x + 34, y + 36); ctx.stroke();
  if (front) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + 5, y + 4, 7, 44);
  }
}

function drawPlayer(ctx, p) {
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, p.x, p.y + 34, 20, 8);
  // legs
  ctx.fillStyle = '#ece9df';
  ctx.fillRect(p.x - 14, p.y - 4, 12, 36);
  ctx.fillRect(p.x + 2, p.y - 4, 12, 36);
  // torso
  ctx.fillStyle = '#f7f5f1';
  ctx.fillRect(p.x - 18, p.y - 34, 36, 38);
  // belt
  ctx.fillStyle = '#161616';
  ctx.fillRect(p.x - 20, p.y - 2, 40, 4);
  // arms
  ctx.fillStyle = '#8a5936';
  if (p.attackTimer > 0) {
    ctx.fillRect(p.x + (p.facing > 0 ? 10 : -34), p.y - 28, 28, 8);
    ctx.fillRect(p.x - (p.facing > 0 ? 32 : -4), p.y - 22, 18, 8);
    // hit spark
    ctx.strokeStyle = '#ffce4f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const sx = p.x + (p.facing > 0 ? 40 : -40), sy = p.y - 24;
    ctx.moveTo(sx - 8, sy); ctx.lineTo(sx + 8, sy);
    ctx.moveTo(sx, sy - 8); ctx.lineTo(sx, sy + 8);
    ctx.moveTo(sx - 6, sy - 6); ctx.lineTo(sx + 6, sy + 6);
    ctx.moveTo(sx + 6, sy - 6); ctx.lineTo(sx - 6, sy + 6);
    ctx.stroke();
  } else {
    ctx.fillRect(p.x - 24, p.y - 28, 14, 8);
    ctx.fillRect(p.x + 10, p.y - 28, 14, 8);
  }
  // head
  ctx.fillStyle = '#8f603b';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 46, 14, 0, Math.PI * 2);
  ctx.fill();
  // afro
  ctx.fillStyle = '#191919';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 52, 17, 0, Math.PI * 2);
  ctx.fill();
  // wrists
  ctx.fillStyle = '#222';
  ctx.fillRect(p.x - 23, p.y - 28, 4, 8);
  ctx.fillRect(p.x + 19, p.y - 28, 4, 8);
}

function drawEnemy(ctx, enemy) {
  if (!enemy.alive) return;
  const hit = enemy.hurtTimer > 0;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, enemy.x, enemy.y + 32, 18, 7);
  ctx.fillStyle = hit ? '#ffd08a' : '#506b91';
  ctx.fillRect(enemy.x - 16, enemy.y - 30, 32, 34);
  ctx.fillStyle = '#295a91';
  ctx.fillRect(enemy.x - 12, enemy.y - 16, 24, 20);
  ctx.fillStyle = '#708445';
  ctx.fillRect(enemy.x - 14, enemy.y + 4, 12, 30);
  ctx.fillRect(enemy.x + 2, enemy.y + 4, 12, 30);
  ctx.fillStyle = '#c78657';
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y - 40, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = enemy.weapon === 'knife' ? '#c31d3c' : '#1d4fbf';
  ctx.fillRect(enemy.x - 14, enemy.y - 52, 28, 6);
  if (enemy.weapon === 'knife') {
    ctx.fillStyle = '#c9c9cb';
    ctx.fillRect(enemy.x + 16, enemy.y - 20, 12, 3);
    ctx.beginPath(); ctx.moveTo(enemy.x + 28, enemy.y - 20); ctx.lineTo(enemy.x + 35, enemy.y - 18.5); ctx.lineTo(enemy.x + 28, enemy.y - 17); ctx.fill();
  }
  // hp pips
  for (let i = 0; i < enemy.hp; i++) {
    ctx.fillStyle = '#f4bf38';
    ctx.fillRect(enemy.x - 14 + i * 10, enemy.y - 66, 8, 4);
  }
}

function drawHud(ctx, packet) {
  ctx.fillStyle = '#020305';
  ctx.fillRect(0, 0, 960, 66);
  ctx.fillStyle = '#f9cc37';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(packet.scenePacket.player.name.toUpperCase(), 74, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('0124500', 170, 24);
  ctx.fillText('×3', 304, 24);
  ctx.fillStyle = '#f99a25';
  ctx.font = 'bold 46px Arial';
  ctx.fillText(String(Math.max(0, 74 - Math.floor(game.tick / 90))).padStart(2, '0'), 466, 46);
  ctx.fillStyle = '#93b9ff';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('PRESS START', 730, 24);

  // player portrait + life bar
  ctx.fillStyle = '#314462';
  ctx.fillRect(14, 12, 42, 42);
  ctx.fillStyle = '#f1d34f';
  ctx.fillRect(76, 32, 126, 10);
  ctx.fillStyle = '#2da8e2';
  ctx.fillRect(76, 32, 126 * (game.player.hp / 10), 10);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(76, 32, 126, 10);

  // bottom bars
  ctx.fillStyle = '#020305';
  ctx.fillRect(0, 508, 960, 32);
  if (game.enemies[0]) enemyBar(ctx, 126, 'KNIFE', game.enemies[0]);
  if (game.enemies[1]) enemyBar(ctx, 700, 'BANDANA', game.enemies[1]);
  ctx.fillStyle = '#d5d9e2';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('STAGE 3-1', 418, 530);
}

function enemyBar(ctx, x, label, enemy) {
  ctx.fillStyle = '#32415f';
  ctx.fillRect(x - 74, 513, 26, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(label, x - 22, 529);
  ctx.fillStyle = '#c22828';
  ctx.fillRect(x + 52, 517, 108, 8);
  const hpRatio = Math.max(0, enemy.hp) / 3;
  ctx.fillStyle = '#f2bf38';
  ctx.fillRect(x + 52, 517, 108 * hpRatio, 8);
}

function rectsClose(x1, y1, x2, y2, xRange, yRange) {
  return Math.abs(x1 - x2) < xRange && Math.abs(y1 - y2) < yRange;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Initial parse so the page isn't empty.
currentPacket = buildAllPackets();
renderOutputs(currentPacket);
setStatus('Sample loaded. Parse or build whenever you are ready.');
