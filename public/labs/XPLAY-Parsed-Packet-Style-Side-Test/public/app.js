const $ = (s) => document.querySelector(s);
let packet = null;
let blueprint = null;
let styles = {};
let cacheState = {};
const runtime = {};
const keys = {};

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});


async function fetchJsonAllowPartial(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 180)}`); }
  if (!res.ok && !data.failed) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 180)}`);
  }
  if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function loadCheckpoint() {
  const data = await fetchJson('/api/checkpoint');
  packet = data.packet;
  blueprint = data.blueprint;
  $('#packetOut').textContent = JSON.stringify(packet, null, 2);
  $('#blueprintOut').textContent = JSON.stringify(blueprint, null, 2);
}

async function loadStyles() {
  const data = await fetchJson('/api/styles');
  styles = data.styles;
  renderStyles();
}

async function refreshCache() {
  const data = await fetchJson('/api/cache');
  cacheState = data.state;
  applyCache();
}

$('#healthBtn').onclick = async () => {
  try { alert(JSON.stringify(await fetchJson('/api/health'), null, 2)); }
  catch (e) { alert(e.message); }
};
$('#checkpointBtn').onclick = () => loadCheckpoint().catch((e) => alert(e.message));
$('#cacheBtn').onclick = () => refreshCache().catch((e) => alert(e.message));

function renderStyles() {
  const grid = $('#styleGrid');
  grid.innerHTML = '';
  for (const [id, style] of Object.entries(styles)) {
    const card = document.createElement('article');
    card.className = 'styleCard';
    card.innerHTML = `
      <h3>${style.label}</h3>
      <div class="desc">${style.description}</div>
      <div class="status" id="${id}_status">${id === 'source64' ? 'source ready' : 'not generated'}</div>
      <div class="controls">
        <button data-generate="${id}:stage">Stage</button>
        <button data-generate="${id}:player">Player</button>
        <button data-generate="${id}:enemies">Enemies</button>
        <button data-genall="${id}">Generate Missing</button>
        <button data-build="${id}" class="secondary">Build Playable</button>
        <button data-rerender="${id}" class="warn">Force Re-render Style</button>
        <button data-clear="${id}" class="warn">Clear Cache</button>
      </div>
      <div class="assets">
        <div class="assetBlock"><h4>Stage</h4><img id="${id}_stage" alt="stage"></div>
        <div class="assetBlock"><h4>Player</h4><img id="${id}_player" class="sprite" alt="player"></div>
        <div class="assetBlock"><h4>Enemies</h4><img id="${id}_enemies" class="sprite" alt="enemies"></div>
      </div>
      <canvas id="${id}_canvas" width="960" height="540"></canvas>
      <div class="legend">A/D or arrows move · W/S depth · Space attacks · Same parsed checkpoint, different style builds.</div>
    `;
    grid.appendChild(card);
  }
  document.querySelectorAll('[data-generate]').forEach((btn) => {
    btn.onclick = () => {
      const [style, kind] = btn.dataset.generate.split(':');
      generateAsset(style, kind, btn);
    };
  });
  document.querySelectorAll('[data-genall]').forEach((btn) => {
    btn.onclick = () => generateMissing(btn.dataset.genall, btn);
  });
  document.querySelectorAll('[data-build]').forEach((btn) => {
    btn.onclick = () => buildPlayable(btn.dataset.build);
  });
  document.querySelectorAll('[data-rerender]').forEach((btn) => {
    btn.onclick = () => forceRerenderStyle(btn.dataset.rerender, btn);
  });
  document.querySelectorAll('[data-clear]').forEach((btn) => {
    btn.onclick = () => clearStyle(btn.dataset.clear);
  });
}

function applyCache() {
  for (const styleId of Object.keys(styles)) {
    let count = 0;
    for (const kind of ['stage', 'player', 'enemies']) {
      const url = cacheState?.[styleId]?.[kind];
      const img = document.getElementById(`${styleId}_${kind}`);
      if (img && url) {
        img.src = url;
        count++;
      }
    }
    const status = document.getElementById(`${styleId}_status`);
    if (status) {
      status.textContent = count === 3 ? (styleId === 'source64' ? 'source ready' : '3/3 cached') : `${count}/3 ready`;
    }
  }
}

async function generateAsset(style, kind, btn, force = false) {
  const old = btn.textContent;
  try {
    btn.disabled = true;
    btn.textContent = 'Working…';
    const data = await fetchJson(`/api/generate/${style}/${kind}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ force })
    });
    const img = document.getElementById(`${style}_${kind}`);
    if (img) img.src = data.url;
    await refreshCache();
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

async function generateMissing(style, btn) {
  const old = btn.textContent;
  try {
    btn.disabled = true;
    btn.textContent = 'Generating…';
    const result = await fetchJsonAllowPartial(`/api/generate-missing/${style}`, { method: 'POST' });
    await refreshCache();
    if (result.failed?.length) {
      const detail = result.failed.map(x => `${x.kind}: ${x.error}`).join('\n');
      alert(`${styles[style].label} partially generated.\n\n${detail}`);
    }
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

async function forceRerenderStyle(style, btn) {
  const old = btn.textContent;
  try {
    if (style === 'source64') return alert('Source / 64-bit is the canonical checkpoint and is not re-rendered.');
    btn.disabled = true;
    btn.textContent = 'Re-rendering all 3…';
    const result = await fetchJsonAllowPartial(`/api/regenerate-style/${style}`, { method: 'POST' });
    await refreshCache();
    if (result.failed?.length) {
      alert(`${styles[style].label} re-render completed with failures:\n\n${result.failed.map(x => `${x.kind}: ${x.error}`).join('\n')}`);
    } else {
      alert(`${styles[style].label} completely re-rendered with new style-divergence prompts.`);
    }
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

async function clearStyle(style) {
  try {
    const data = await fetchJson(`/api/cache/clear/${style}`, { method: 'POST' });
    if (data.note) alert(data.note);
    await refreshCache();
  } catch (e) {
    alert(e.message);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function buildPlayable(styleId) {
  if (!blueprint) await loadCheckpoint();
  try {
    const stageSrc = document.getElementById(`${styleId}_stage`).src;
    const playerSrc = document.getElementById(`${styleId}_player`).src;
    const enemiesSrc = document.getElementById(`${styleId}_enemies`).src;
    if (!stageSrc || !playerSrc || !enemiesSrc) {
      throw new Error('Load or generate all three assets for this style first.');
    }
    const [stage, playerSheet, enemyAtlas] = await Promise.all([
      loadImage(stageSrc), loadImage(playerSrc), loadImage(enemiesSrc)
    ]);
    const canvas = document.getElementById(`${styleId}_canvas`);
    const ctx = canvas.getContext('2d');
    runtime[styleId] = {
      canvas, ctx, stage, playerSheet, enemyAtlas,
      last: performance.now(),
      time: blueprint.stage.targetSeconds,
      camX: 0,
      player: {
        x: 260, y: 392, hp: blueprint.player.hp, maxHp: blueprint.player.hp,
        face: 1, state: 'idle', attackTimer: 0, hurtTimer: 0, hitApplied: false
      },
      enemies: blueprint.enemies.map((enemy, idx) => ({
        x: 620 + idx * 190,
        y: 388 + ((idx % 2) * 18),
        hp: enemy.hp, maxHp: enemy.hp,
        speed: enemy.speed, row: idx,
        face: -1, state: idx === 1 ? 'hurt' : 'idle',
        attackTimer: 0, hurtTimer: idx === 1 ? 0.25 : 0, cooldown: idx * 0.18,
        dead: false
      })),
      win: false, lose: false
    };
    requestAnimationFrame((ts) => gameLoop(styleId, ts));
  } catch (e) {
    alert(e.message);
  }
}

function gameLoop(styleId, ts) {
  const g = runtime[styleId];
  if (!g) return;
  const dt = Math.min(0.033, ((ts - g.last) || 16) / 1000);
  g.last = ts;
  updateGame(g, dt);
  drawGame(g);
  if (!g.win && !g.lose) requestAnimationFrame((next) => gameLoop(styleId, next));
}

function updateGame(g, dt) {
  const p = g.player;
  g.time = Math.max(0, g.time - dt);
  p.attackTimer = Math.max(0, p.attackTimer - dt);
  p.hurtTimer = Math.max(0, p.hurtTimer - dt);

  const moveX = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
  const moveY = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);

  if (moveX) p.face = moveX > 0 ? 1 : -1;

  if ((keys[' '] || keys['space']) && p.attackTimer <= 0 && p.hurtTimer <= 0) {
    p.attackTimer = 0.30;
    p.hitApplied = false;
    p.state = 'attack';
  }

  if (p.hurtTimer > 0) {
    p.state = 'hurt';
  } else if (p.attackTimer > 0) {
    p.state = 'attack';
    if (!p.hitApplied && p.attackTimer < 0.16) {
      const hitX = p.x + (p.face * blueprint.player.attackRange * 0.8);
      for (const enemy of g.enemies) {
        if (enemy.dead) continue;
        if (Math.abs(enemy.x - hitX) < blueprint.player.attackRange && Math.abs(enemy.y - p.y) < 52) {
          enemy.hp = Math.max(0, enemy.hp - blueprint.player.attackDamage);
          enemy.hurtTimer = 0.28;
          enemy.state = 'hurt';
          enemy.x += p.face * 26;
          if (enemy.hp <= 0) enemy.dead = true;
        }
      }
      p.hitApplied = true;
    }
  } else {
    p.x += moveX * blueprint.player.speed * dt;
    p.y += moveY * 108 * dt;
    p.x = Math.max(60, Math.min(blueprint.stage.worldWidth - 60, p.x));
    p.y = Math.max(340, Math.min(430, p.y));
    p.state = (moveX || moveY) ? 'walk' : 'idle';
  }

  for (const enemy of g.enemies) {
    if (enemy.dead) continue;
    enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;

    if (enemy.hurtTimer > 0) {
      enemy.state = 'hurt';
      continue;
    }
    if (enemy.attackTimer > 0) {
      enemy.state = 'attack';
      if (enemy.attackTimer < 0.14 && Math.abs(dx) < 76 && Math.abs(dy) < 42 && p.hurtTimer <= 0) {
        p.hp = Math.max(0, p.hp - (enemy.row === 0 ? 11 : 8));
        p.hurtTimer = 0.22;
      }
      continue;
    }

    if (Math.abs(dx) > 90 || Math.abs(dy) > 44) {
      enemy.x += Math.sign(dx) * enemy.speed * dt;
      enemy.y += Math.sign(dy) * 40 * dt;
      enemy.face = dx > 0 ? 1 : -1;
      enemy.state = 'walk';
    } else if (enemy.cooldown <= 0) {
      enemy.attackTimer = 0.34;
      enemy.cooldown = 0.7 + (Math.random() * 0.35);
      enemy.state = 'attack';
    } else {
      enemy.state = 'idle';
    }
  }

  const desiredCam = Math.max(0, Math.min(blueprint.stage.worldWidth - 960, p.x - 360));
  g.camX += (desiredCam - g.camX) * Math.min(1, dt * 6);

  if (g.enemies.every((enemy) => enemy.dead)) g.win = true;
  if (p.hp <= 0 || g.time <= 0) g.lose = !g.win;
}

function drawGame(g) {
  const ctx = g.ctx;
  ctx.clearRect(0, 0, 960, 540);

  const stageW = 960;
  const stageH = 540;
  const drawW = stageW;
  const drawH = stageH;
  for (let x = - (g.camX % drawW) - drawW; x < 960 + drawW; x += drawW) {
    ctx.drawImage(g.stage, x, 0, drawW, drawH);
  }

  const entities = [...g.enemies.filter((e) => !e.dead), g.player].sort((a, b) => a.y - b.y);
  for (const entity of entities) {
    if (entity === g.player) drawPlayer(g, entity);
    else drawEnemy(g, entity);
  }

  drawHud(g);
  if (g.win || g.lose) drawOverlay(g);
}

function drawHud(g) {
  const ctx = g.ctx;
  ctx.fillStyle = 'rgba(0,0,0,.88)';
  ctx.fillRect(0, 0, 960, 66);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('ALEX', 48, 24);
  ctx.fillStyle = '#3a2911';
  ctx.fillRect(48, 36, 190, 14);
  ctx.fillStyle = '#e6b63f';
  ctx.fillRect(48, 36, 190 * (g.player.hp / g.player.maxHp), 14);
  ctx.fillStyle = '#2f89c7';
  ctx.fillRect(48, 53, 110, 7);
  ctx.fillStyle = '#e6b63f';
  ctx.font = 'bold 42px Arial';
  ctx.fillText(String(Math.ceil(g.time)).padStart(2, '0'), 460, 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('PRESS START', 760, 24);
  ctx.fillText('0124500', 150, 24);
  ctx.fillText('x3', 250, 24);

  ctx.fillStyle = 'rgba(0,0,0,.8)';
  ctx.fillRect(0, 500, 960, 40);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('STAGE 3-1', 430, 526);

  const alive = g.enemies.filter((e) => !e.dead);
  if (alive[0]) drawEnemyBar(ctx, 36, 468, 'KNIFE', alive.find((e) => e.row === 0) || g.enemies[0]);
  if (alive[1] || alive[2]) drawEnemyBar(ctx, 340, 468, 'BANDANNA', alive.find((e) => e.row === 1) || g.enemies[1]);
}

function drawEnemyBar(ctx, x, y, label, enemy) {
  ctx.fillStyle = 'rgba(0,0,0,.82)';
  ctx.fillRect(x, y, 230, 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(label, x + 8, y + 19);
  ctx.fillStyle = '#411616';
  ctx.fillRect(x + 72, y + 8, 146, 12);
  ctx.fillStyle = '#d24d49';
  ctx.fillRect(x + 72, y + 8, 146 * Math.max(0, enemy.hp / enemy.maxHp), 12);
}

function drawOverlay(g) {
  const ctx = g.ctx;
  ctx.fillStyle = 'rgba(0,0,0,.56)';
  ctx.fillRect(0, 66, 960, 434);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 58px Arial';
  ctx.fillText(g.win ? 'STAGE CLEAR' : 'FAILED', 480, 260);
  ctx.font = 'bold 24px Arial';
  ctx.fillText(g.win ? 'Parsed packet side test complete.' : 'Press Build Playable to retry.', 480, 300);
  ctx.textAlign = 'left';
}

function drawPlayer(g, p) {
  drawShadow(g.ctx, p.x - g.camX, p.y);
  let col = 0, row = 0;
  if (p.state === 'walk') col = 1 + (Math.floor(performance.now() / 150) % 3);
  if (p.state === 'attack') { row = 1; col = p.attackTimer > 0.15 ? 0 : 1; }
  if (p.state === 'hurt') { row = 1; col = 2; }
  if (g.win) { row = 1; col = 3; }
  drawFrame(g.ctx, g.playerSheet, 4, 2, col, row, p.x - g.camX, p.y, 150, 172, p.face);

  if (p.state === 'attack' && p.attackTimer < 0.17) {
    const sx = p.x - g.camX + (p.face * 58);
    g.ctx.strokeStyle = '#ffd454';
    g.ctx.lineWidth = 4;
    g.ctx.beginPath();
    g.ctx.moveTo(sx - 10, p.y - 26);
    g.ctx.lineTo(sx + 10, p.y - 6);
    g.ctx.moveTo(sx + 10, p.y - 26);
    g.ctx.lineTo(sx - 10, p.y - 6);
    g.ctx.stroke();
  }
}

function drawEnemy(g, enemy) {
  drawShadow(g.ctx, enemy.x - g.camX, enemy.y);
  const stateToCol = { idle: 0, walk: 1, attack: 2, hurt: 3 };
  drawFrame(g.ctx, g.enemyAtlas, 4, 3, stateToCol[enemy.state] ?? 0, enemy.row, enemy.x - g.camX, enemy.y, 140, 160, enemy.face);
}

function drawFrame(ctx, img, cols, rows, col, row, x, y, w, h, face) {
  const fw = img.width / cols;
  const fh = img.height / rows;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.drawImage(img, col * fw, row * fh, fw, fh, -w / 2, -h + 12, w, h);
  ctx.restore();
}

function drawShadow(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

Promise.all([loadCheckpoint(), loadStyles()])
  .then(refreshCache)
  .catch((e) => alert(e.message));
