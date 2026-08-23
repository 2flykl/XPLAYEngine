const $ = s => document.querySelector(s);
const packetOut = $('#packetOut');
const blueprintOut = $('#blueprintOut');
const sourcePreview = $('#sourcePreview');
const fileInput = $('#file');
const contextInput = $('#context');
const serverS = $('#serverS');
const visionS = $('#visionS');
const interpS = $('#interpS');
let sourceFile = null;
let packet = null;
let blueprint = null;
let styles = {
  '64bit': { assets: { stage:null, player:null, enemies:null }, game:null, raf:0 },
  'modernpc': { assets: { stage:null, player:null, enemies:null }, game:null, raf:0 }
};

async function jsonFetch(url, opts={}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error(`Server returned non-JSON (${res.status}): ${text.slice(0,180)}`); }
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function setSource(file) {
  sourceFile = file;
  sourcePreview.src = URL.createObjectURL(file);
}

fileInput.addEventListener('change', () => {
  const f = fileInput.files?.[0];
  if (!f) return;
  if (!f.type.startsWith('image/')) return alert('Please choose a PNG/JPEG/WebP image.');
  setSource(f);
});

$('#sample').onclick = async () => {
  try {
    const r = await fetch('assets/alex-source.png', { cache: 'no-store' });
    const b = await r.blob();
    setSource(new File([b], 'alex-source.png', { type: b.type || 'image/png' }));
  } catch (err) { alert(err.message); }
};

$('#health').onclick = async () => {
  try {
    const j = await jsonFetch('/api/health');
    serverS.textContent = j.configured ? `ready · ${j.port}` : 'key missing';
    alert(JSON.stringify(j, null, 2));
  } catch (err) { alert(err.message); }
};

$('#analyze').onclick = async () => {
  try {
    if (!sourceFile) await $('#sample').onclick();
    if (!sourceFile) throw new Error('No image selected.');
    visionS.textContent = 'analyzing…';
    const fd = new FormData();
    fd.append('image', sourceFile);
    fd.append('context', contextInput.value || '');
    const j = await jsonFetch('/api/vision/lock', { method: 'POST', body: fd });
    packet = j.packet;
    packetOut.textContent = JSON.stringify(packet, null, 2);
    visionS.textContent = 'LOCKED';
  } catch (err) {
    visionS.textContent = 'error';
    alert(err.message);
  }
};

$('#interpret').onclick = async () => {
  try {
    if (!packet) throw new Error('Analyze + Lock Packet first.');
    const j = await jsonFetch('/api/interpreter/build', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ packet })
    });
    blueprint = j.blueprint;
    blueprintOut.textContent = JSON.stringify(blueprint, null, 2);
    interpS.textContent = 'built';
  } catch (err) { alert(err.message); }
};

for (const btn of document.querySelectorAll('[data-kind]')) {
  btn.addEventListener('click', async () => {
    const style = btn.dataset.style;
    const kind = btn.dataset.kind;
    try {
      if (!packet) throw new Error('Lock the vision packet first.');
      if (!sourceFile) await $('#sample').onclick();
      btn.disabled = true;
      btn.textContent = 'Generating…';
      const fd = new FormData();
      fd.append('image', sourceFile);
      fd.append('packet', JSON.stringify(packet));
      fd.append('style', style);
      const j = await jsonFetch(`/api/assets/${kind}`, { method: 'POST', body: fd });
      styles[style].assets[kind] = j.imageDataUrl;
      $(`#${style}_${kind}`).src = j.imageDataUrl;
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = {
        stage: 'Generate Stage',
        player: 'Generate Alex Sheet',
        enemies: 'Generate Enemy Atlas'
      }[kind];
    }
  });
}

for (const btn of document.querySelectorAll('[data-build]')) {
  btn.addEventListener('click', () => buildPlayable(btn.dataset.build));
}
for (const btn of document.querySelectorAll('[data-reset]')) {
  btn.addEventListener('click', () => resetPlayable(btn.dataset.reset));
}
window.addEventListener('keydown', e => {
  if ((e.key === ' ' || e.code === 'Space') && ['TEXTAREA','INPUT'].includes(document.activeElement.tagName)) return;
  if (e.key === ' ') e.preventDefault();
  if (e.key.toLowerCase() === 'r') {
    resetPlayable('64bit');
    resetPlayable('modernpc');
  }
});

const keyState = {};
window.addEventListener('keydown', e => { keyState[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { keyState[e.key.toLowerCase()] = false; });

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function createExtensionProps(packet, worldWidth) {
  const props = [];
  const landmarks = (packet?.landmarks || []).join(' | ').toLowerCase();
  for (let x = 920; x < worldWidth; x += 360) {
    if (landmarks.includes('barrel')) props.push({ type: 'barrels', x: x + 40, y: 382 });
    if (landmarks.includes('container')) props.push({ type: 'container', x: x + 140, y: 326, w: 220, h: 134 });
    if (landmarks.includes('ladder')) props.push({ type: 'ladder', x: x + 294, y: 195, h: 132 });
    if (landmarks.includes('fence')) props.push({ type: 'fence', x: x + 8, y: 260, w: 180, h: 90 });
    if (landmarks.includes('danger')) props.push({ type: 'danger', x: x + 210, y: 286 });
  }
  return props;
}

async function buildPlayable(style) {
  try {
    if (!blueprint) throw new Error('Build Interpreter Beast first.');
    const stage = await loadImage(styles[style].assets.stage);
    const playerSheet = await loadImage(styles[style].assets.player);
    const enemyAtlas = await loadImage(styles[style].assets.enemies);
    const canvas = $(`#${style}_canvas`);
    const ctx = canvas.getContext('2d');
    const viewportWidth = canvas.width;
    const viewportHeight = canvas.height;
    const worldWidth = Math.max(2800, blueprint.stage.worldWidth);
    const enemies = blueprint.enemies.map((e, i) => ({
      x: 620 + i * 220,
      y: 390 + (i % 2 === 0 ? 0 : 18),
      hp: e.maxHp,
      maxHp: e.maxHp,
      moveSpeed: e.moveSpeed,
      attackDamage: e.attackDamage,
      name: e.displayName,
      hurtTimer: 0,
      attackTimer: 0,
      attackDone: false,
      state: 'idle',
      row: i,
      facing: -1,
      dead: false,
      attackCooldown: 0.5 + i * 0.18,
      aiTimer: 0
    }));

    styles[style].game = {
      style,
      ctx,
      canvas,
      stage,
      playerSheet,
      enemyAtlas,
      worldWidth,
      viewportWidth,
      viewportHeight,
      timeLeft: blueprint.stage.targetSeconds,
      cameraX: 0,
      extensionProps: createExtensionProps(packet, worldWidth),
      player: {
        x: 280,
        y: 390,
        hp: blueprint.player.hp,
        maxHp: blueprint.player.hp,
        moveSpeed: blueprint.player.moveSpeed,
        depthSpeed: blueprint.player.depthSpeed,
        attackRange: blueprint.player.attackRange,
        attackDamage: blueprint.player.attackDamage,
        attackDuration: blueprint.player.attackDuration,
        hurtDuration: blueprint.player.hurtDuration,
        state: 'idle',
        facing: 1,
        vx: 0,
        attackTimer: 0,
        attackHitDone: false,
        hurtTimer: 0,
        invuln: 0,
        win: false,
        lose: false
      },
      enemies,
      lastTs: performance.now(),
      running: true
    };
    cancelAnimationFrame(styles[style].raf);
    const loop = ts => {
      const g = styles[style].game;
      if (!g || !g.running) return;
      const dt = Math.min(0.033, (ts - g.lastTs) / 1000 || 0.016);
      g.lastTs = ts;
      updateGame(g, dt);
      drawGame(g);
      styles[style].raf = requestAnimationFrame(loop);
    };
    styles[style].raf = requestAnimationFrame(loop);
  } catch (err) { alert(err.message); }
}

function resetPlayable(style) {
  if (styles[style].game) buildPlayable(style);
}

function updateGame(g, dt) {
  const p = g.player;
  if (p.win || p.lose) {
    p.state = p.win ? 'victory' : 'hurt';
    return;
  }
  g.timeLeft = Math.max(0, g.timeLeft - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.hurtTimer = Math.max(0, p.hurtTimer - dt);
  p.attackTimer = Math.max(0, p.attackTimer - dt);
  let mx = 0, my = 0;
  if (keyState['a'] || keyState['arrowleft']) mx -= 1;
  if (keyState['d'] || keyState['arrowright']) mx += 1;
  if (keyState['w'] || keyState['arrowup']) my -= 1;
  if (keyState['s'] || keyState['arrowdown']) my += 1;
  p.vx = mx * p.moveSpeed;
  if (mx !== 0) p.facing = mx > 0 ? 1 : -1;

  const attackPressed = keyState[' '] || keyState['space'];
  if (attackPressed && p.attackTimer <= 0 && p.hurtTimer <= 0) {
    p.attackTimer = p.attackDuration;
    p.attackHitDone = false;
    p.state = 'attack';
  }

  if (p.hurtTimer > 0) {
    p.state = 'hurt';
  } else if (p.attackTimer > 0) {
    p.state = 'attack';
    if (!p.attackHitDone && p.attackTimer <= p.attackDuration * 0.55) {
      const hitX = p.x + p.facing * 88;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - hitX) < p.attackRange && Math.abs(e.y - p.y) < 46) {
          e.hp = Math.max(0, e.hp - p.attackDamage);
          e.hurtTimer = 0.24;
          e.state = 'hurt';
          e.x += p.facing * 26;
          if (e.hp <= 0) e.dead = true;
        }
      }
      p.attackHitDone = true;
    }
  } else {
    p.x += mx * p.moveSpeed * dt;
    p.y += my * p.depthSpeed * dt;
    p.x = Math.max(60, Math.min(g.worldWidth - 60, p.x));
    p.y = Math.max(338, Math.min(430, p.y));
    p.state = mx !== 0 || my !== 0 ? 'walk' : 'idle';
  }

  for (const e of g.enemies) {
    if (e.dead) continue;
    e.hurtTimer = Math.max(0, e.hurtTimer - dt);
    e.attackTimer = Math.max(0, e.attackTimer - dt);
    e.aiTimer = Math.max(0, e.aiTimer - dt);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (e.hurtTimer > 0) {
      e.state = 'hurt';
      continue;
    }
    if (e.attackTimer > 0) {
      e.state = 'attack';
      if (!e.attackDone && e.attackTimer <= 0.22 && Math.abs(dx) < 82 && Math.abs(dy) < 44 && p.invuln <= 0) {
        p.hp = Math.max(0, p.hp - e.attackDamage);
        p.hurtTimer = p.hurtDuration;
        p.invuln = 0.4;
        p.x += (dx < 0 ? 1 : -1) * 12;
        e.attackDone = true;
      }
      continue;
    }
    if (dist > 88) {
      const press = e.aiTimer <= 0;
      if (press) {
        const stepx = Math.sign(dx) * e.moveSpeed * dt;
        const stepy = Math.sign(dy) * Math.min(Math.abs(dy), 35) * dt;
        e.x += stepx;
        e.y += stepy;
        e.state = 'walk';
        e.facing = dx >= 0 ? 1 : -1;
      } else {
        e.state = 'idle';
      }
    } else {
      e.state = 'idle';
      if (e.aiTimer <= 0) {
        e.attackTimer = 0.42;
        e.attackDone = false;
        e.aiTimer = 0.65 + Math.random() * 0.4;
      }
    }
  }

  const lead = p.facing * 120 + p.vx * 0.08;
  const desired = clamp(p.x - g.viewportWidth * 0.38 + lead, 0, g.worldWidth - g.viewportWidth);
  g.cameraX += (desired - g.cameraX) * Math.min(1, dt * 6);

  if (g.enemies.every(e => e.dead)) { p.win = true; p.state = 'victory'; }
  if (p.hp <= 0 || g.timeLeft <= 0) { p.lose = true; }
}

function drawGame(g) {
  const ctx = g.ctx;
  const cam = g.cameraX;
  ctx.clearRect(0,0,g.viewportWidth,g.viewportHeight);
  drawBackdrop(g, ctx, cam);
  drawGroundEffects(g, ctx, cam);
  const actors = [...g.enemies.filter(e => !e.dead), g.player].sort((a,b) => a.y - b.y);
  for (const actor of actors) {
    if (actor === g.player) drawPlayer(g, ctx, actor, cam);
    else drawEnemy(g, ctx, actor, cam);
  }
  drawHud(g, ctx);
  if (g.player.win || g.player.lose) drawOverlay(g, ctx);
}

function drawBackdrop(g, ctx, cam) {
  ctx.fillStyle = '#08182d';
  ctx.fillRect(0,0,g.viewportWidth,g.viewportHeight);
  if (g.stage) {
    const targetH = g.viewportHeight;
    const aspect = g.stage.width / g.stage.height;
    const drawW = targetH * aspect;
    for (let x = -cam % drawW - drawW; x < g.viewportWidth + drawW; x += drawW) {
      ctx.drawImage(g.stage, x, 0, drawW, targetH);
    }
  } else {
    const grad = ctx.createLinearGradient(0,0,0,g.viewportHeight);
    grad.addColorStop(0, '#071b32');
    grad.addColorStop(1, '#322434');
    ctx.fillStyle = grad; ctx.fillRect(0,0,g.viewportWidth,g.viewportHeight);
  }
  for (const p of g.extensionProps) drawExtensionProp(ctx, p, cam);
}

function drawExtensionProp(ctx, p, cam) {
  const x = p.x - cam;
  if (x < -300 || x > 1260) return;
  if (p.type === 'container') {
    ctx.fillStyle = '#7f412d'; ctx.fillRect(x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    for (let i=0;i<6;i++) ctx.strokeRect(x + i*34, p.y, 28, p.h);
    ctx.fillStyle = 'rgba(220,190,120,.45)'; ctx.font = 'bold 26px Arial'; ctx.fillText('ZENITH', x+48, p.y+54);
  } else if (p.type === 'barrels') {
    ctx.fillStyle = '#556f2a'; ctx.fillRect(x, p.y-46, 26, 46); ctx.fillRect(x+28, p.y-46, 26, 46);
  } else if (p.type === 'ladder') {
    ctx.strokeStyle = '#bcc8d1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x,p.y); ctx.lineTo(x,p.y+p.h); ctx.moveTo(x+18,p.y); ctx.lineTo(x+18,p.y+p.h); ctx.stroke();
    for (let y=0;y<p.h;y+=18){ ctx.beginPath(); ctx.moveTo(x,y+p.y); ctx.lineTo(x+18,y+p.y); ctx.stroke(); }
  } else if (p.type === 'fence') {
    ctx.strokeStyle = '#9caebb'; ctx.strokeRect(x,p.y,p.w,p.h);
    for (let i=0;i<p.w;i+=18){ ctx.beginPath(); ctx.moveTo(x+i,p.y); ctx.lineTo(x+i-18,p.y+p.h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+i,p.y+p.h); ctx.lineTo(x+i-18,p.y); ctx.stroke(); }
  } else if (p.type === 'danger') {
    ctx.fillStyle = '#8e5f16'; ctx.fillRect(x,p.y,44,52); ctx.fillStyle='#f5d446'; ctx.fillText('⚡',x+11,p.y+36);
  }
}

function drawGroundEffects(g, ctx, cam) {
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(0, 460, g.viewportWidth, 80);
  ctx.strokeStyle = '#d6b534'; ctx.lineWidth = 4;
  for (let x = -cam % 120; x < g.viewportWidth; x += 120) {
    ctx.beginPath(); ctx.moveTo(x, 422); ctx.lineTo(x+32, 422); ctx.stroke();
  }
}

function drawPlayer(g, ctx, p, cam) {
  const x = p.x - cam;
  const y = p.y;
  drawShadow(ctx, x, y);
  if (g.playerSheet) {
    const fw = g.playerSheet.width / 4;
    const fh = g.playerSheet.height / 2;
    let sx = 0, sy = 0;
    if (p.state === 'idle') { sx = 0; sy = 0; }
    else if (p.state === 'walk') { sx = 1 + Math.floor(performance.now() / 150) % 3; sy = 0; if (sx>3) sx=1; }
    else if (p.state === 'attack') { sx = p.attackTimer > p.attackDuration * 0.5 ? 0 : 1; sy = 1; }
    else if (p.state === 'hurt') { sx = 2; sy = 1; }
    else if (p.state === 'victory') { sx = 3; sy = 1; }
    drawFrame(ctx, g.playerSheet, fw, fh, sx, sy, x, y, 150, 170, p.facing);
  } else {
    drawFallbackFighter(ctx, x, y, '#f0ebde', '#3f261c', p.state, p.facing);
  }
}

function drawEnemy(g, ctx, e, cam) {
  const x = e.x - cam;
  const y = e.y;
  drawShadow(ctx, x, y);
  if (g.enemyAtlas) {
    const rows = Math.max(1, packet.enemies.length);
    const fw = g.enemyAtlas.width / 4;
    const fh = g.enemyAtlas.height / rows;
    let col = 0;
    if (e.state === 'idle') col = 0;
    else if (e.state === 'walk') col = 1;
    else if (e.state === 'attack') col = 2;
    else if (e.state === 'hurt') col = 3;
    drawFrame(ctx, g.enemyAtlas, fw, fh, col, e.row, x, y, 138, 156, e.facing);
  } else {
    drawFallbackEnemy(ctx, x, y, e.row, e.state, e.facing);
  }
  ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(x-42,y+22,84,7);
  ctx.fillStyle = '#e74f4f'; ctx.fillRect(x-42,y+22,84*(e.hp/e.maxHp),7);
}

function drawFrame(ctx, img, fw, fh, sx, sy, x, y, dw, dh, facing=1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing >= 0 ? 1 : -1, 1);
  ctx.drawImage(img, sx*fw, sy*fh, fw, fh, -dw/2, -dh + 10, dw, dh);
  ctx.restore();
}

function drawFallbackFighter(ctx, x, y, suit, skin, state, facing) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing >= 0 ? 1 : -1, 1);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0,-95,15,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = suit; ctx.fillRect(-22,-80,44,52); ctx.fillRect(-20,-28,14,40); ctx.fillRect(6,-28,14,40);
  ctx.fillStyle = '#101010'; ctx.fillRect(-16,-28,32,5);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath();
  if (state === 'attack') { ctx.moveTo(10,-60); ctx.lineTo(50,-52); }
  else { ctx.moveTo(10,-60); ctx.lineTo(28,-42); }
  ctx.moveTo(-10,-60); ctx.lineTo(-30,-42); ctx.stroke();
  ctx.restore();
}

function drawFallbackEnemy(ctx, x, y, row, state, facing) {
  const colors = [['#7c2f57','#9e72c7'],['#3d678f','#d66b42'],['#54793b','#4766b1']][row % 3];
  ctx.save(); ctx.translate(x, y); ctx.scale(facing >= 0 ? 1 : -1, 1);
  ctx.fillStyle = '#7a543b'; ctx.beginPath(); ctx.arc(0,-92,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = colors[0]; ctx.fillRect(-22,-78,44,52); ctx.fillRect(-18,-26,14,38); ctx.fillRect(4,-26,14,38);
  ctx.fillStyle = colors[1]; if (state === 'attack') ctx.fillRect(18,-56,26,6); else ctx.fillRect(12,-56,18,6);
  ctx.restore();
}

function drawShadow(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(x, y+8, 28, 8, 0, 0, Math.PI*2); ctx.fill();
}

function drawHud(g, ctx) {
  ctx.fillStyle = 'rgba(0,0,0,.9)'; ctx.fillRect(0,0,g.viewportWidth,66);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.fillText((packet?.player?.name || 'ALEX').toUpperCase(), 54, 26);
  ctx.fillStyle = '#2b210f'; ctx.fillRect(54,36,184,14); ctx.fillStyle = '#e0b93e'; ctx.fillRect(54,36,184*(g.player.hp/g.player.maxHp),14);
  ctx.fillStyle = '#efb531'; ctx.font = 'bold 52px Arial'; ctx.fillText(String(Math.ceil(g.timeLeft)).padStart(2,'0'), 468, 52);
  ctx.fillStyle = '#d7e3ff'; ctx.font = 'bold 18px Arial'; ctx.fillText('PRESS START', g.viewportWidth - 180, 28);
  ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(0,g.viewportHeight-40,g.viewportWidth,40); ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.fillText('STAGE 3-1', 430, g.viewportHeight - 14);
}

function drawOverlay(g, ctx) {
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0,66,g.viewportWidth,g.viewportHeight-66);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 62px Arial';
  ctx.fillText(g.player.win ? 'STAGE CLEAR' : 'FAILED', g.viewportWidth/2, 270);
  ctx.font = 'bold 22px Arial'; ctx.fillText('Press R to retry', g.viewportWidth/2, 308); ctx.textAlign = 'left';
}
