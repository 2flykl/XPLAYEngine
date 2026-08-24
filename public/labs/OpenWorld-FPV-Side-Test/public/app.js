const STORAGE_KEY = 'xplay-openworld-fpv-side-test-v1';

const fileInput = document.getElementById('fileInput');
const generateBtn = document.getElementById('generateBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const clearBtn = document.getElementById('clearBtn');
const captureToggle = document.getElementById('captureToggle');
const placeToggle = document.getElementById('placeToggle');
const cropSize = document.getElementById('cropSize');
const cropSizeLabel = document.getElementById('cropSizeLabel');
const landmarkGallery = document.getElementById('landmarkGallery');

const seedText = document.getElementById('seedText');
const chunkText = document.getElementById('chunkText');
const landmarkText = document.getElementById('landmarkText');
const posX = document.getElementById('posX');
const posY = document.getElementById('posY');
const heading = document.getElementById('heading');

const sourceCanvas = document.getElementById('sourceCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const viewCanvas = document.getElementById('viewCanvas');
const viewCtx = viewCanvas.getContext('2d');
const mapCanvas = document.getElementById('mapCanvas');
const mapCtx = mapCanvas.getContext('2d');

let sourceImage = null;
let sourceDataURL = null;
let selectedLandmarkId = null;
let mouseLookActive = false;
let lastMouseX = 0;
const landmarkImageCache = {};

const state = {
  seed: null,
  palette: null,
  world: { chunks: {}, landmarks: [], nextLandmarkId: 1 },
  player: { x: 0, y: 0, a: 0, speed: 3.2 },
  capturedLandmarks: [],
  keys: {}
};

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a,b,t) { return a + (b-a)*t; }
function angNorm(a){ while (a < -Math.PI) a += Math.PI*2; while (a > Math.PI) a -= Math.PI*2; return a; }
function rgba(arr){ return `rgba(${arr[0]},${arr[1]},${arr[2]},${arr[3] ?? 1})`; }

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({img, dataURL: reader.result});
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function drawSourcePreview() {
  sourceCtx.clearRect(0,0,sourceCanvas.width,sourceCanvas.height);
  sourceCtx.fillStyle = '#0b1726';
  sourceCtx.fillRect(0,0,sourceCanvas.width,sourceCanvas.height);
  if (!sourceImage) {
    sourceCtx.fillStyle = '#9fbedb';
    sourceCtx.font = '18px sans-serif';
    sourceCtx.fillText('Upload a screenshot to seed the world.', 20, 40);
    return;
  }
  const scale = Math.min(sourceCanvas.width / sourceImage.width, sourceCanvas.height / sourceImage.height);
  const w = sourceImage.width * scale;
  const h = sourceImage.height * scale;
  const x = (sourceCanvas.width - w) / 2;
  const y = (sourceCanvas.height - h) / 2;
  sourceCtx.drawImage(sourceImage, x, y, w, h);
}

function sampleBandAverage(ctx, w, h, y0, y1) {
  const img = ctx.getImageData(0, Math.floor(y0*h), w, Math.max(1, Math.floor((y1-y0)*h))).data;
  let r=0,g=0,b=0,c=0;
  for (let i=0; i<img.length; i+=4) { r += img[i]; g += img[i+1]; b += img[i+2]; c++; }
  return [Math.round(r/c), Math.round(g/c), Math.round(b/c)];
}

function buildPaletteFromSource() {
  const temp = document.createElement('canvas');
  temp.width = sourceImage.width;
  temp.height = sourceImage.height;
  const ctx = temp.getContext('2d');
  ctx.drawImage(sourceImage,0,0);
  const sky = sampleBandAverage(ctx, temp.width, temp.height, 0.0, 0.28);
  const mid = sampleBandAverage(ctx, temp.width, temp.height, 0.28, 0.68);
  const ground = sampleBandAverage(ctx, temp.width, temp.height, 0.68, 1.0);
  return { sky, mid, ground };
}

function currentSourceRect() {
  const scale = Math.min(sourceCanvas.width / sourceImage.width, sourceCanvas.height / sourceImage.height);
  const w = sourceImage.width * scale;
  const h = sourceImage.height * scale;
  const x = (sourceCanvas.width - w) / 2;
  const y = (sourceCanvas.height - h) / 2;
  return { x,y,w,h,scale };
}

function worldKey(cx, cy) { return `${cx},${cy}`; }
function getChunk(cx, cy) {
  const key = worldKey(cx,cy);
  if (!state.world.chunks[key]) {
    state.world.chunks[key] = generateChunk(cx, cy);
    updateMeta();
  }
  return state.world.chunks[key];
}

function generateChunk(cx, cy) {
  const seed = hashString(`${state.seed}:${cx}:${cy}`);
  const rnd = mulberry32(seed);
  const items = [];
  const motifCount = 2 + Math.floor(rnd()*4);
  for (let i=0; i<motifCount; i++) {
    const gx = cx*200 + rnd()*200;
    const gy = cy*200 + rnd()*200;
    const kindRoll = rnd();
    const kind = kindRoll < 0.25 ? 'tower' : kindRoll < 0.5 ? 'rock' : kindRoll < 0.75 ? 'crate' : 'marker';
    items.push({
      id: `obj-${cx}-${cy}-${i}`,
      x: gx,
      y: gy,
      z: 0,
      size: 20 + rnd()*42,
      hue: Math.floor(rnd()*360),
      kind
    });
  }
  return { cx, cy, items };
}

function ensureNearbyChunks() {
  const cx = Math.floor(state.player.x / 200);
  const cy = Math.floor(state.player.y / 200);
  for (let yy=-2; yy<=2; yy++) {
    for (let xx=-2; xx<=2; xx++) getChunk(cx+xx, cy+yy);
  }
}

function resetWorld() {
  if (!sourceImage || !sourceDataURL) { alert('Upload a screenshot first.'); return; }
  state.seed = hashString(sourceDataURL + ':' + sourceImage.width + 'x' + sourceImage.height).toString(16);
  state.palette = buildPaletteFromSource();
  state.world = { chunks: {}, landmarks: [], nextLandmarkId: 1 };
  state.player = { x: 100, y: 100, a: 0, speed: 3.2 };
  ensureNearbyChunks();
  updateMeta();
  renderAll();
}

function saveMemory() {
  const payload = {
    sourceDataURL,
    seed: state.seed,
    palette: state.palette,
    world: state.world,
    player: state.player,
    capturedLandmarks: state.capturedLandmarks
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  alert('World memory saved locally.');
}

function loadMemory() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { alert('No saved memory found.'); return; }
  const data = JSON.parse(raw);
  state.seed = data.seed;
  state.palette = data.palette;
  state.world = data.world;
  state.player = data.player;
  state.capturedLandmarks = data.capturedLandmarks || [];
  selectedLandmarkId = state.capturedLandmarks[0]?.id || null;
  if (data.sourceDataURL) {
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      sourceDataURL = data.sourceDataURL;
      drawSourcePreview();
      rebuildGallery();
      updateMeta();
      renderAll();
    };
    img.src = data.sourceDataURL;
  } else {
    updateMeta();
    renderAll();
  }
}

function clearMemory() {
  localStorage.removeItem(STORAGE_KEY);
  alert('Saved local memory cleared.');
}

function updateMeta() {
  seedText.textContent = state.seed || '—';
  chunkText.textContent = Object.keys(state.world.chunks).length;
  landmarkText.textContent = state.world.landmarks.length;
  posX.textContent = state.player.x.toFixed(1);
  posY.textContent = state.player.y.toFixed(1);
  heading.textContent = Math.round((state.player.a * 180 / Math.PI + 360) % 360);
}

function captureLandmarkFromSource(mx, my) {
  if (!sourceImage) return;
  const rect = sourceCanvas.getBoundingClientRect();
  const x = mx - rect.left;
  const y = my - rect.top;
  const sr = currentSourceRect();
  if (x < sr.x || x > sr.x + sr.w || y < sr.y || y > sr.y + sr.h) return;

  const imgX = (x - sr.x) / sr.scale;
  const imgY = (y - sr.y) / sr.scale;
  const size = parseInt(cropSize.value, 10);
  const sx = clamp(Math.round(imgX - size/2), 0, sourceImage.width - size);
  const sy = clamp(Math.round(imgY - size/2), 0, sourceImage.height - size);

  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.drawImage(sourceImage, sx, sy, size, size, 0, 0, size, size);
  const id = 'cap-' + Date.now() + '-' + Math.floor(Math.random()*1000);
  state.capturedLandmarks.push({ id, name: `Landmark ${state.capturedLandmarks.length+1}`, dataURL: c.toDataURL('image/png') });
  selectedLandmarkId = id;
  rebuildGallery();
}

function rebuildGallery() {
  landmarkGallery.innerHTML = '';
  for (const lm of state.capturedLandmarks) {
    const item = document.createElement('button');
    item.className = 'galleryItem' + (lm.id === selectedLandmarkId ? ' selected' : '');
    item.type = 'button';
    item.innerHTML = `<img src="${lm.dataURL}" alt="${lm.name}"><span>${lm.name}</span>`;
    item.addEventListener('click', () => {
      selectedLandmarkId = lm.id;
      rebuildGallery();
    });
    landmarkGallery.appendChild(item);
  }
}

function placeSelectedLandmark() {
  const lm = state.capturedLandmarks.find(x => x.id === selectedLandmarkId);
  if (!lm) return;
  const dist = 90;
  const px = state.player.x + Math.cos(state.player.a) * dist;
  const py = state.player.y + Math.sin(state.player.a) * dist;
  state.world.landmarks.push({
    id: state.world.nextLandmarkId++,
    typeId: lm.id,
    x: px,
    y: py,
    size: 34
  });
  updateMeta();
}

function renderSkyAndGround() {
  const w = viewCanvas.width, h = viewCanvas.height;
  const horizon = h * 0.45;
  const sky = state.palette?.sky || [20,40,70];
  const mid = state.palette?.mid || [60,80,100];
  const ground = state.palette?.ground || [55,50,45];

  const skyGrad = viewCtx.createLinearGradient(0,0,0,horizon);
  skyGrad.addColorStop(0, rgba([...sky,1]));
  skyGrad.addColorStop(1, rgba([Math.max(sky[0]-15,0),Math.max(sky[1]-15,0),Math.max(sky[2]-15,0),1]));
  viewCtx.fillStyle = skyGrad;
  viewCtx.fillRect(0,0,w,horizon);

  viewCtx.fillStyle = `rgba(${mid[0]},${mid[1]},${mid[2]},0.35)`;
  for (let i=0; i<25; i++) {
    const x = (i*97 + ((state.player.a*180/Math.PI)*5)) % (w+100) - 50;
    const bw = 40 + (i%5)*32;
    const bh = 70 + (i%7)*22;
    viewCtx.fillRect(x, horizon - bh, bw, bh);
  }

  const groundGrad = viewCtx.createLinearGradient(0,horizon,0,h);
  groundGrad.addColorStop(0, rgba([ground[0]+20,ground[1]+20,ground[2]+20,1]));
  groundGrad.addColorStop(1, rgba([Math.max(ground[0]-20,0),Math.max(ground[1]-20,0),Math.max(ground[2]-20,0),1]));
  viewCtx.fillStyle = groundGrad;
  viewCtx.fillRect(0,horizon,w,h-horizon);

  viewCtx.strokeStyle = 'rgba(255,255,255,0.12)';
  for (let i=1; i<12; i++) {
    const y = lerp(horizon, h, i/12);
    viewCtx.beginPath();
    viewCtx.moveTo(0,y); viewCtx.lineTo(w,y); viewCtx.stroke();
  }
}

function allObjectsNearby() {
  const out = [];
  const cx = Math.floor(state.player.x / 200);
  const cy = Math.floor(state.player.y / 200);
  for (let yy=-2; yy<=2; yy++) {
    for (let xx=-2; xx<=2; xx++) {
      out.push(...getChunk(cx+xx, cy+yy).items);
    }
  }
  for (const lm of state.world.landmarks) out.push({...lm, kind: 'landmark'});
  return out;
}

function drawWorldObjects() {
  const w = viewCanvas.width, h = viewCanvas.height;
  const horizon = h * 0.45;
  const fov = Math.PI / 2.7;

  const objects = allObjectsNearby().map(obj => {
    const dx = obj.x - state.player.x;
    const dy = obj.y - state.player.y;
    const dist = Math.hypot(dx, dy);
    const ang = angNorm(Math.atan2(dy, dx) - state.player.a);
    return { obj, dist, ang };
  }).filter(o => o.dist > 5 && Math.abs(o.ang) < fov * 0.7)
    .sort((a,b)=>b.dist-a.dist);

  for (const entry of objects) {
    const { obj, dist, ang } = entry;
    const sx = (0.5 + ang / fov) * w;
    const scale = clamp(900 / dist, 0.12, 5);
    const baseY = horizon + (h-horizon) * 0.62;
    const size = (obj.size || 30) * scale;
    const bottomY = baseY + clamp((obj.y - state.player.y)*0.03, -30, 30);

    if (obj.kind === 'landmark') {
      const cap = state.capturedLandmarks.find(x => x.id === obj.typeId);
      if (cap) {
        if (!landmarkImageCache[cap.id]) { const img = new Image(); img.src = cap.dataURL; landmarkImageCache[cap.id] = img; }
        const img = landmarkImageCache[cap.id];
        if (img.complete) viewCtx.drawImage(img, sx - size*0.7, bottomY - size*1.7, size*1.4, size*1.4);
        viewCtx.fillStyle = 'rgba(0,0,0,0.55)';
        viewCtx.fillRect(sx - 44, bottomY - size*1.85 - 22, 88, 18);
        viewCtx.fillStyle = '#fff';
        viewCtx.font = '12px sans-serif';
        viewCtx.fillText(cap.name, sx - 36, bottomY - size*1.85 - 8);
      }
      continue;
    }

    if (obj.kind === 'tower') drawTower(sx, bottomY, size, obj.hue);
    else if (obj.kind === 'rock') drawRock(sx, bottomY, size, obj.hue);
    else if (obj.kind === 'crate') drawCrate(sx, bottomY, size, obj.hue);
    else drawMarker(sx, bottomY, size, obj.hue);
  }
}

function hueColor(h, s=70, l=55, a=1){ return `hsla(${h},${s}%,${l}%,${a})`; }
function drawTower(x, y, s, hue) {
  viewCtx.fillStyle = hueColor(hue, 30, 30, .95);
  viewCtx.fillRect(x-s*0.3, y-s*2.2, s*0.6, s*2.2);
  viewCtx.fillStyle = hueColor(hue, 70, 65, .8);
  viewCtx.beginPath(); viewCtx.arc(x, y-s*2.2, s*0.22, 0, Math.PI*2); viewCtx.fill();
}
function drawRock(x, y, s, hue) {
  viewCtx.fillStyle = hueColor(hue, 20, 40, .95);
  viewCtx.beginPath();
  viewCtx.ellipse(x, y-s*0.45, s*0.9, s*0.55, 0, 0, Math.PI*2);
  viewCtx.fill();
}
function drawCrate(x, y, s, hue) {
  viewCtx.fillStyle = hueColor(hue, 45, 38, .95);
  viewCtx.fillRect(x-s*0.7, y-s*0.95, s*1.4, s*0.95);
  viewCtx.strokeStyle = 'rgba(255,255,255,.2)';
  viewCtx.strokeRect(x-s*0.7, y-s*0.95, s*1.4, s*0.95);
}
function drawMarker(x, y, s, hue) {
  viewCtx.strokeStyle = hueColor(hue, 90, 65, .95);
  viewCtx.lineWidth = Math.max(2, s*0.08);
  viewCtx.beginPath();
  viewCtx.moveTo(x, y-s*1.6); viewCtx.lineTo(x, y-s*0.2); viewCtx.stroke();
  viewCtx.fillStyle = hueColor(hue, 90, 65, .95);
  viewCtx.beginPath(); viewCtx.arc(x, y-s*1.7, s*0.18, 0, Math.PI*2); viewCtx.fill();
}

function drawCrosshair() {
  const w = viewCanvas.width, h = viewCanvas.height;
  viewCtx.strokeStyle = 'rgba(255,255,255,0.7)';
  viewCtx.lineWidth = 1.5;
  viewCtx.beginPath(); viewCtx.moveTo(w/2-10, h/2); viewCtx.lineTo(w/2+10, h/2); viewCtx.stroke();
  viewCtx.beginPath(); viewCtx.moveTo(w/2, h/2-10); viewCtx.lineTo(w/2, h/2+10); viewCtx.stroke();
}

function drawHUD() {
  viewCtx.fillStyle = 'rgba(0,14,28,0.72)';
  viewCtx.fillRect(16, 16, 270, 74);
  viewCtx.fillStyle = '#fff';
  viewCtx.font = 'bold 24px sans-serif';
  viewCtx.fillText('SCOUT VIEW', 28, 44);
  viewCtx.font = '15px sans-serif';
  viewCtx.fillStyle = '#d2ebff';
  viewCtx.fillText(`Seed ${state.seed || '—'}`, 28, 68);
  viewCtx.fillText(`Landmarks ${state.world.landmarks.length}`, 160, 68);

  viewCtx.fillStyle = 'rgba(0,14,28,0.72)';
  viewCtx.fillRect(viewCanvas.width - 230, 16, 214, 52);
  viewCtx.fillStyle = '#fff';
  viewCtx.font = '15px sans-serif';
  viewCtx.fillText(`Position ${state.player.x.toFixed(0)}, ${state.player.y.toFixed(0)}`, viewCanvas.width - 220, 40);
  viewCtx.fillText(`Heading ${Math.round((state.player.a*180/Math.PI+360)%360)}°`, viewCanvas.width - 220, 60);
}

function renderView() {
  viewCtx.clearRect(0,0,viewCanvas.width,viewCanvas.height);
  renderSkyAndGround();
  drawWorldObjects();
  drawCrosshair();
  drawHUD();
}

function renderMap() {
  mapCtx.clearRect(0,0,mapCanvas.width,mapCanvas.height);
  mapCtx.fillStyle = '#081524';
  mapCtx.fillRect(0,0,mapCanvas.width,mapCanvas.height);
  const scale = 0.6;
  const ox = mapCanvas.width/2 - state.player.x*scale;
  const oy = mapCanvas.height/2 - state.player.y*scale;

  // chunks
  Object.values(state.world.chunks).forEach(chunk => {
    const x = ox + chunk.cx*200*scale;
    const y = oy + chunk.cy*200*scale;
    mapCtx.fillStyle = 'rgba(80,160,220,0.09)';
    mapCtx.fillRect(x, y, 200*scale, 200*scale);
    mapCtx.strokeStyle = 'rgba(80,160,220,0.25)';
    mapCtx.strokeRect(x, y, 200*scale, 200*scale);
  });

  // objects
  for (const obj of allObjectsNearby()) {
    const x = ox + obj.x*scale;
    const y = oy + obj.y*scale;
    mapCtx.fillStyle = obj.kind === 'landmark' ? '#7dff9f' : '#44c8ff';
    mapCtx.beginPath(); mapCtx.arc(x,y, obj.kind === 'landmark' ? 4 : 2.5, 0, Math.PI*2); mapCtx.fill();
  }

  // player
  const px = ox + state.player.x*scale;
  const py = oy + state.player.y*scale;
  mapCtx.fillStyle = '#ffdb62';
  mapCtx.beginPath(); mapCtx.arc(px,py,6,0,Math.PI*2); mapCtx.fill();
  mapCtx.strokeStyle = '#ffdb62';
  mapCtx.beginPath();
  mapCtx.moveTo(px,py);
  mapCtx.lineTo(px + Math.cos(state.player.a)*18, py + Math.sin(state.player.a)*18);
  mapCtx.stroke();
}

function renderAll() {
  drawSourcePreview();
  renderView();
  renderMap();
  updateMeta();
}

function movePlayer(dt) {
  const speed = state.player.speed * dt * 0.06;
  const forwardX = Math.cos(state.player.a), forwardY = Math.sin(state.player.a);
  const rightX = Math.cos(state.player.a + Math.PI/2), rightY = Math.sin(state.player.a + Math.PI/2);
  if (state.keys['w']) { state.player.x += forwardX * speed; state.player.y += forwardY * speed; }
  if (state.keys['s']) { state.player.x -= forwardX * speed; state.player.y -= forwardY * speed; }
  if (state.keys['a']) { state.player.x -= rightX * speed; state.player.y -= rightY * speed; }
  if (state.keys['d']) { state.player.x += rightX * speed; state.player.y += rightY * speed; }
  if (state.keys['q']) { state.player.a -= 0.03 * dt; }
  if (state.keys['e']) { state.player.a += 0.03 * dt; }
  ensureNearbyChunks();
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(32, now - last);
  last = now;
  movePlayer(dt);
  renderView();
  renderMap();
  updateMeta();
  requestAnimationFrame(tick);
}

cropSize.addEventListener('input', () => cropSizeLabel.textContent = cropSize.value);
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const {img, dataURL} = await loadImageFromFile(file);
  sourceImage = img;
  sourceDataURL = dataURL;
  drawSourcePreview();
});
generateBtn.addEventListener('click', resetWorld);
saveBtn.addEventListener('click', saveMemory);
loadBtn.addEventListener('click', loadMemory);
clearBtn.addEventListener('click', clearMemory);

sourceCanvas.addEventListener('click', (e) => {
  if (!captureToggle.checked || !sourceImage) return;
  captureLandmarkFromSource(e.clientX, e.clientY);
});

viewCanvas.addEventListener('mousedown', (e) => {
  if (placeToggle.checked) {
    placeSelectedLandmark();
    return;
  }
  mouseLookActive = true;
  lastMouseX = e.clientX;
});
window.addEventListener('mouseup', () => mouseLookActive = false);
window.addEventListener('mousemove', (e) => {
  if (!mouseLookActive) return;
  const dx = e.clientX - lastMouseX;
  lastMouseX = e.clientX;
  state.player.a += dx * 0.005;
});
window.addEventListener('keydown', e => { state.keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { state.keys[e.key.toLowerCase()] = false; });

// initial placeholder
renderAll();
requestAnimationFrame(tick);
