
import './styles/app.css';
import { PLXRuntime } from './core/PLXRuntime.js';
import { loadPLX } from './core/PLXLoader.js';
import { analyzeImageStyle } from './core/StyleDNA.js';
import { deriveVisualAssets } from './core/VisualAssetFactory.js';
import { analyzeVisualSource } from './services/vision.js';
import { remasterAsset } from './services/art.js';
import { forgeProductionArtPack } from './services/worldArtForge.js';
import { calibratePromptLocal } from './services/calibrator.js';
import { directPLX, apiHealth } from './services/director.js';
import { pingSupabase } from './services/supabase.js';
import { saveProjectToSupabase } from './services/projects.js';
import { exportPLX } from './core/PLXExporter.js';
import { STYLE_LIBRARY, OVERLAY_LIBRARY, getStyle } from './core/StyleLibrary.js';
import { generateSurpriseIdeas, formatSuggestion } from './services/surprise.js';
import { applyMakeItBetter } from './services/makeBetter.js';
import { createStudioPlan, finishStudioBuild } from './core/StudioPipeline.js';
import { defaultScreenshotGuide, summarizeScreenshotAnalysis, buildScreenshotReconstructionPrompt, SCREENSHOT_PRESERVE_OPTIONS } from './core/ScreenshotReconstructionDirector.js';
// Calibrate Prompt
const BASE_URL=import.meta.env.BASE_URL || './';
const publicUrl=(path='')=>{
  if(/^(data:|blob:|https?:)/.test(path)) return path;
  return `${BASE_URL}${String(path).replace(/^\.\//,'').replace(/^\//,'')}`;
};
const previewUrl=(id)=>{
  try{const cached=localStorage.getItem(`xplay:runtime-preview:${id}`);if(cached)return cached;}catch{}
  return publicUrl(`plx/${id}/preview.png`);
};


const builtIns=[
 ['frontline','Terminal Zero','fps','First-Person Shooter','First-person runway defense with weapon recoil, depth-rushing enemies, impact FX and a signature wave.'],
 ['streetclash','After Hours','fighting','Fighting','Two-character neon rooftop fighter with punch, kick, block, special meter, hit-stop and KO.'],
 ['skybound','Skyline Delivery','runner','Runner','High-speed city delivery run with authored routes, collectible arcs, hazards and layered parallax.'],
 ['rooftop','Rooftop Rush','dodge','Dodge','Top-down rooftop escape with a unique courier, moving hazards and energy pickups.'],
 ['grove','Lantern Grove','collect','Collect','Atmospheric exploration hunt with a distinct ranger character, relics and reactive world dressing.'],
 ['beatline','Beatline City','rhythm','Rhythm','Four-lane music timing game with a dedicated performer, stage lighting and combo feedback.'],
 ['thoughtlink','Gem Circuit','puzzle','Puzzle','Colorful match-3 puzzle board with cascades, score chains and tactile gem feedback.'],
 ['driftlands','Driftlands','openworld','Open World','Quest-driven free-roam world with its own explorer, districts, NPCs and landmarks.'],
 ['neonrace','Neon Circuit','racing','Racing','Top-down neon street race with a dedicated vehicle, traffic, boosts and finish sequence.'],
 ['wildjump','Canopy Rush','platformer','Platformer','Layered adventure platformer with a dedicated hero, authored terrain, enemies, collectibles and a signature event.']
];

const socialPosts=[
 {engine:'puzzle',title:'Gem Drop',creator:'@davidplays',name:'David',caption:'I turned a color study into a juicy match-3 puzzle. Chain four gems and the whole board starts to cascade.',played:2419,remixes:204,comments:91,cover:'plx/thoughtlink/preview.png'},
 {engine:'fps',title:'Terminal Zero',creator:'@novajay',name:'Nova Jay',caption:'A late-night airport photo became a first-person runway defense game.',played:1284,remixes:86,comments:34,cover:'plx/frontline/preview.png'},
 {engine:'fighting',title:'After Hours',creator:'@marcusvale',name:'Marcus Vale',caption:'One photo. One rival. One neon rooftop. Settle it in the ring.',played:992,remixes:61,comments:28,cover:'plx/streetclash/preview.png'},
 {engine:'runner',title:'Skyline Delivery',creator:'@tianarae',name:'Tiana Rae',caption:'Race the skyline, grab delivery tokens, and survive the rush-hour gaps.',played:1655,remixes:119,comments:46,cover:'plx/skybound/preview.png'},
 {engine:'rhythm',title:'Beatline City',creator:'@ayorose',name:'Ayo Rose',caption:'A performance clip became a four-lane neon rhythm stage.',played:2204,remixes:184,comments:71,cover:'plx/beatline/preview.png'},
 {engine:'racing',title:'Neon Circuit',creator:'@devonmiles',name:'Devon Miles',caption:'A street photo turned into a midnight boost race.',played:743,remixes:39,comments:18,cover:'plx/neonrace/preview.png'},
 {engine:'platformer',title:'Canopy Rush',creator:'@kenzow',name:'Kenzo W.',caption:'A forest photo became a layered platform world full of jumps, routes and hidden rewards.',played:1881,remixes:132,comments:54,cover:'plx/wildjump/preview.png'},
 {engine:'collect',title:'Lantern Grove',creator:'@miraeast',name:'Mira East',caption:'A calm photo became a glowing collectible hunt.',played:618,remixes:27,comments:12,cover:'plx/grove/preview.png'},
 {engine:'dodge',title:'Rooftop Rush',creator:'@jaylenmade',name:'Jaylen Made',caption:'Dodge drones and catch energy drops above the city.',played:1354,remixes:73,comments:31,cover:'plx/rooftop/preview.png'},
 {engine:'openworld',title:'Driftlands',creator:'@samori',name:'Sam Ori',caption:'A single landscape turned into a tiny place worth exploring.',played:836,remixes:42,comments:19,cover:'plx/driftlands/preview.png'}
];

const demoIdForEngine=(engine)=>builtIns.find(x=>x[2]===engine)?.[0]||'skybound';

let studioProject=null;
let chosenEngine='';
const state={
  mode:'ai',
  media:{
    primary:null, // { file, dataUrl, type, role, analysis }
    extra1:null,
    extra2:null
  },
  styleDNA:null,
  extraction:null,
  currentStep:1,
  analysisCorrected:null,
  chosenEngine:'',
  prompt:'',
  feel:'',
  style:'', // visual style ID
  htmlContext:'', // raw html
  htmlMode:'', // 'inspiration' or 'game'
  creationLane:'standard', // 'standard' or 'screenshot'
  screenshotGuide: defaultScreenshotGuide(),
  lastManifest:null
};
Object.defineProperty(state, 'file', {
  get() { return state.media.primary?.file || null; },
  set(v) { if(!state.media.primary) state.media.primary = {}; state.media.primary.file = v; }
});
Object.defineProperty(state, 'dataUrl', {
  get() { return state.media.primary?.dataUrl || ''; },
  set(v) { if(!state.media.primary) state.media.primary = {}; state.media.primary.dataUrl = v; }
});
const runtime=new PLXRuntime();
window.runtime = runtime;

document.querySelector('#app').innerHTML=`
<div class="app">
<aside class="sidebar">
 <div class="brand"><span class="mark"></span><div>XPLAY<div class="sub">Playable media</div></div></div>
 <div class="nav">
   <button class="active" data-view="feed">For You</button>
   <button data-view="library">Explore PLXs</button>
   <button data-view="studio">Create</button>
   <button data-view="runtime">Play Lab</button>
   <button data-view="backend">System</button>
 </div>
 <div class="sideCreate">
   <div class="sideCreateEyebrow">MAKE SOMETHING</div>
   <div>Turn a photo, song or idea into something people can play.</div>
   <button class="btn primary" id="sideCreateBtn">Create a PLX</button>
 </div>
</aside>
<main class="main">
 <section id="feedView"></section>
 <section id="libraryView" hidden></section>
 <section id="studioView" hidden></section>
 <section id="runtimeView" hidden></section>
 <section id="backendView" hidden></section>
</main>
</div>`;

const views={
 feed:document.querySelector('#feedView'),
 library:document.querySelector('#libraryView'),
 studio:document.querySelector('#studioView'),
 runtime:document.querySelector('#runtimeView'),
 backend:document.querySelector('#backendView')
};

renderFeed(); renderLibrary(); renderStudio(); renderRuntimeShell(); renderBackend();
document.querySelector('#sideCreateBtn').onclick=()=>show('studio');

function show(name){
 runtime.destroy();
 Object.entries(views).forEach(([k,v])=>v.hidden=k!==name);
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
 if(name==='studio') goToStep(state.currentStep);
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));


function renderFeed(){
 const comments={
   fps:['That reload animation sold it.','I would absolutely remix this with my own airport photo.'],
   fighting:['The rooftop arena is clean.','This is exactly how I want social media to feel: play first, talk after.'],
   rhythm:['The camouflage-on-beat idea is wild.','I stayed for three runs without realizing it.']
 };
 views.feed.innerHTML=`
 <div class="feedHero">
   <div class="feedHeroCopy">
     <div class="softPill">PLAY WHAT PEOPLE IMAGINED</div>
     <h1>Scroll less.<br><span>Play more.</span></h1>
     <p>Pictures, songs and ideas become little worlds. No algorithm lecture. No creator tools in your face. If something catches you, play it.</p>
     <div class="heroActions"><button class="btn primary" id="heroCreate">Make a PLX</button><button class="btn ghost" id="heroExplore">Explore the arcade</button></div>
   </div>
   <div class="heroVisual"><img src="${publicUrl('plx/skybound/preview.png')}" alt="Runner gameplay preview"></div>
 </div>
 <div class="feedIntro">
   <div><b>Fresh on XPLAY</b><span>Playable posts from a mock community feed</span></div>
   <div class="liveDot"><i></i> LIVE STAGE PREVIEW</div>
 </div>
 <div class="socialFeed" id="socialFeed"></div>
 <div class="feedEnd">
   <div class="softPill">YOU MADE IT TO THE BOTTOM</div>
   <h2>Good feeds should leave you wanting to make something.</h2>
   <button class="btn primary" id="endCreate">Create your first PLX</button>
 </div>`;
 const feed=views.feed.querySelector('#socialFeed');
 socialPosts.forEach((post,index)=>{
   const built=builtIns.find(x=>x[2]===post.engine);
   const demoId=built?.[0]||'skybound';
   const genre=built?.[3]||post.engine;
   feed.insertAdjacentHTML('beforeend',`
    <article class="socialPost" data-engine="${post.engine}" data-demo="${demoId}">
      <div class="postHead">
        <img class="creatorAvatar" src="${publicUrl(post.cover)}" alt="${post.name}">
        <div class="creatorMeta"><b>${post.name}</b><span>${post.creator} · ${index<2?'just now':`${index+2}h`}</span></div>
        <button class="postMore" aria-label="More">•••</button>
      </div>
      <div class="postWords">${post.caption}</div>
      <button class="postMedia playPost" aria-label="Play ${post.title}">
        <img src="${publicUrl(post.cover)}" alt="${post.title}">
        <span class="playOrb">▶</span>
        <span class="postGenre">${genre}</span>
        <span class="postPlayHint">Tap to play</span>
      </button>
      <div class="postTitleRow"><div><b>${post.title}</b><span>${genre} PLX</span></div><span class="tinyBadge">PLAYABLE</span></div>
      <div class="postActions">
        <button class="playedBtn">✓ Played it <span>${post.played.toLocaleString()}</span></button>
        <button class="remixBtn">↗ Remix <span>${post.remixes}</span></button>
        <button class="commentBtn">◌ Talk <span>${post.comments}</span></button>
        <button class="shareBtn">Share</button>
      </div>
      <div class="commentPeek" hidden>${(comments[post.engine]||['This is fun in a way a normal post is not.','Remixing this later.']).map((c,i)=>`<p><b>${i?'@playmore':'@firsttry'}</b> ${c}</p>`).join('')}</div>
    </article>`);
 });
  const openStudio=(engine,promptText)=>{
    state.chosenEngine=engine;
    chosenEngine=engine;
    state.prompt=promptText||'';
    state.currentStep=1;
    show('studio');
  };
 feed.onclick=e=>{
   const post=e.target.closest('.socialPost');if(!post)return;
   if(e.target.closest('.playPost')) return launchBuiltIn(post.dataset.demo);
   if(e.target.closest('.remixBtn')){
     const data=socialPosts.find(x=>x.engine===post.dataset.engine);
     return openStudio(post.dataset.engine,`Remix the spirit of "${data?.title||'this PLX'}" using my uploaded media. Keep the ${post.dataset.engine} gameplay foundation but reinterpret the world, hazards, collectibles and art direction from my source.`);
   }
   if(e.target.closest('.playedBtn')){
     const b=e.target.closest('.playedBtn');b.classList.toggle('activePlayed');
     const count=b.querySelector('span');count.textContent=Number(String(count.textContent).replace(/,/g,''))+(b.classList.contains('activePlayed')?1:-1);
     return;
   }
   if(e.target.closest('.commentBtn')){
     const peek=post.querySelector('.commentPeek');peek.hidden=!peek.hidden;return;
   }
   if(e.target.closest('.shareBtn')){e.target.closest('.shareBtn').textContent='Link copied';return;}
 };
 views.feed.querySelector('#heroCreate').onclick=()=>show('studio');
 views.feed.querySelector('#heroExplore').onclick=()=>show('library');
 views.feed.querySelector('#endCreate').onclick=()=>show('studio');
}

function renderLibrary(){
 views.library.innerHTML=`
 <div class="top"><div><div class="pill">10 / 10 SPECIALIST PLX DIRECTORS</div><h1>Choose a specialist PLX studio</h1>
 <div class="muted">All 10 PLX categories are included: Runner, Dodge, Collect, Rhythm, Puzzle, FPS, Fighting, Open World, Racing, and Platformer. Each PLX is directed by a specialist game studio with its own camera, movement, art contract and quality rules. <b>FPS and Fighting are flagship engines and appear first.</b></div><div class="categoryRail">${builtIns.map(([, , ,label])=>`<span>${label}</span>`).join('')}</div></div></div>
 <div class="grid" id="library"></div>`;
 const box=views.library.querySelector('#library');
 builtIns.forEach(([id,title,engine,label,desc])=>box.insertAdjacentHTML('beforeend',`
 <article class="card" data-id="${id}" data-engine="${engine}">
   <img src="${previewUrl(id)}" alt="${title}">
   <div class="cardbody"><div class="pill">${label}</div><h3>${title}</h3><div class="muted">${desc}</div>
     <div class="cardActions">
       <button class="btn primary demoBtn">Launch Demo</button>
       <button class="btn ghost useBtn">Use this PLX</button>
     </div>
   </div>
 </article>`));
 box.onclick=e=>{
   const card=e.target.closest('.card'); if(!card)return;
    if(e.target.closest('.useBtn')){
      state.chosenEngine=card.dataset.engine;
      chosenEngine=card.dataset.engine;
      state.currentStep=1;
      show('studio');
      return;
    }
   if(e.target.closest('.demoBtn') || e.target===card) launchBuiltIn(card.dataset.id);
 };
}

function fallbackDNA(source='fallback'){return {palette:['#0d223d','#24c9c5','#eef7f6','#b7ef4b','#ffffff'],brightness:.5,saturation:.5,mood:'balanced',texture:'clean',source};}

function renderStudio(){
  goToStep(state.currentStep);
}

function getStepLabel(s) {
  switch(s) {
    case 1: return "Picture";
    case 3: return "Analysis";
    case 4: return "Game Type";
    case 5: return "Description";
    case 6: return "Feel";
    case 7: return "Style";
    case 8: return "Extra Media";
    case 9: return "HTML Code";
    case 10: return "Review";
    default: return "";
  }
}

function goToStep(stepNum) {
  state.currentStep = stepNum;
  
  views.studio.innerHTML = `
    <div class="top">
      <div>
        <div class="pill">CREATE PLX EXPERIENCE</div>
        <h1>Create your own PLX</h1>
      </div>
    </div>
    
    <div class="playerShell" style="grid-template-columns: 1fr; max-width: 800px; margin: 0 auto; width: 100%;">
      <div class="sidepanel">
        <div class="step-indicator-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid var(--line); padding-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          ${[1, 3, 4, 5, 6, 7, 8, 9, 10].map(s => {
            const label = getStepLabel(s);
            const isActive = s === stepNum;
            const isCompleted = s < stepNum;
            const color = isActive ? 'var(--teal)' : isCompleted ? '#20a39f' : 'var(--muted)';
            const fw = isActive ? '800' : 'normal';
            return `<span style="font-size: 12px; font-weight: ${fw}; color: ${color}; cursor: ${isCompleted ? 'pointer' : 'default'}" class="step-nav-btn" data-step="${s}">
              ${isCompleted ? '✓ ' : ''}${label}
            </span>`;
          }).join('<span style="color: var(--line);">→</span>')}
        </div>
        
        <div id="stepContainer"></div>
      </div>
    </div>
  `;

  views.studio.querySelectorAll('.step-nav-btn').forEach(btn => {
    btn.onclick = () => {
      const targetStep = parseInt(btn.dataset.step);
      if (targetStep < state.currentStep) {
        goToStep(targetStep);
      }
    };
  });

  const container = views.studio.querySelector('#stepContainer');
  if (!container) return;

  switch(stepNum) {
    case 1: renderStep1(container); break;
    case 2: renderStep2(container); break;
    case 3: renderStep3(container); break;
    case 4: renderStep4(container); break;
    case 5: renderStep5(container); break;
    case 6: renderStep6(container); break;
    case 7: renderStep7(container); break;
    case 8: renderStep8(container); break;
    case 9: renderStep9(container); break;
    case 10: renderStep10(container); break;
    case 11: renderStep11(container); break;
  }
}

async function processMainImage(file, lane = state.creationLane || 'standard') {
  const dataUrl = await readDataUrl(file);
  state.creationLane = lane;
  state.media.primary = {
    file,
    dataUrl,
    type: file.type,
    role: lane === 'screenshot' ? 'reference-screenshot' : 'player',
    analysis: null
  };
  state.styleDNA = null;
  state.extraction = null;
  state.analysisCorrected = null;
  state.chosenEngine = '';
  chosenEngine = '';
  if (lane === 'screenshot') state.screenshotGuide = defaultScreenshotGuide();
  goToStep(2);
}

function renderStep1(container) {
  const isScreenshot = state.creationLane === 'screenshot';
  container.innerHTML = `
    <div style="text-align: center; max-width: 720px; margin: 0 auto;">
      <div class="softPill">STEP 1</div>
      <h2 style="font-size: 32px; margin: 12px 0 6px;">Choose how you want to start</h2>
      <p class="muted" style="margin-bottom: 24px;">The original XPLAY creator is still here. Screenshot → Game is an additional test lane.</p>

      <div class="creationLaneGrid">
        <button class="creationLaneCard ${!isScreenshot ? 'activeLane' : ''}" id="standardLaneBtn">
          <span class="laneIcon">✨</span><b>Original Creator</b><small>Upload a photo, let XPLAY analyze it, then choose game type, feel and style.</small>
        </button>
        <button class="creationLaneCard ${isScreenshot ? 'activeLane' : ''}" id="screenshotLaneBtn">
          <span class="laneIcon">🧬</span><b>Screenshot → Game <em>TEST</em></b><small>Use a game screenshot or visual mockup as a reconstruction target.</small>
        </button>
      </div>

      <div class="reverseForgeNotice" ${isScreenshot ? '' : 'hidden'}>
        <b>XPLAY Reverse Forge</b>
        <span>The screenshot becomes a visual specification. XPLAY will try to preserve its layout, camera, art language and visible gameplay cues.</span>
      </div>

      <div id="mainImageDrop" class="media-drop" style="border: 2px dashed var(--teal); padding: 42px 24px; text-align: center; border-radius: 20px; cursor: pointer; background: var(--mint); transition: all 0.2s;">
        <div style="font-size: 48px; margin-bottom: 12px;">${isScreenshot ? '🕹️' : '📸'}</div>
        <b style="font-size: 18px; display: block; margin-bottom: 8px;">${isScreenshot ? 'Drop the screenshot you want turned into a game' : 'Drag & drop your main photo here'}</b>
        <span style="color: var(--soft); font-size: 14px; display: block; margin-bottom: 16px;">Supports PNG, JPG, JPEG</span>
        <button class="btn primary" id="uploadMainBtn" style="pointer-events: auto;">${isScreenshot ? 'UPLOAD GAME SCREENSHOT' : 'UPLOAD MAIN PICTURE'}</button>
        <input id="mainImageFile" type="file" accept="image/*" style="display: none;" />
      </div>
      <div style="text-align: center; margin-top: 20px;" ${isScreenshot ? 'hidden' : ''}>
        <button class="btn ghost" id="noPictureBtn">I DON'T HAVE A PICTURE</button>
      </div>
    </div>
  `;

  const standardLaneBtn = container.querySelector('#standardLaneBtn');
  const screenshotLaneBtn = container.querySelector('#screenshotLaneBtn');
  const dropArea = container.querySelector('#mainImageDrop');
  const fileInput = container.querySelector('#mainImageFile');
  const uploadBtn = container.querySelector('#uploadMainBtn');
  const noPicBtn = container.querySelector('#noPictureBtn');

  if (standardLaneBtn) standardLaneBtn.onclick = () => { state.creationLane = 'standard'; goToStep(1); };
  if (screenshotLaneBtn) screenshotLaneBtn.onclick = () => {
    state.creationLane = 'screenshot';
    state.screenshotGuide = state.screenshotGuide || defaultScreenshotGuide();
    goToStep(1);
  };

  if (uploadBtn && fileInput) uploadBtn.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
  if (dropArea && fileInput) {
    dropArea.onclick = () => fileInput.click();
    dropArea.ondragover = (e) => { e.preventDefault(); dropArea.style.borderColor = 'var(--navy)'; dropArea.style.background = '#d8ecea'; };
    dropArea.ondragleave = () => { dropArea.style.borderColor = 'var(--teal)'; dropArea.style.background = 'var(--mint)'; };
    dropArea.ondrop = async (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) await processMainImage(files[0], state.creationLane);
    };
  }
  if (fileInput) fileInput.onchange = async () => {
    if (fileInput.files.length > 0) await processMainImage(fileInput.files[0], state.creationLane);
  };
  if (noPicBtn) noPicBtn.onclick = () => {
    state.creationLane = 'standard';
    state.media.primary = null;
    state.styleDNA = fallbackDNA('no-picture');
    state.extraction = { ok: false, analysis: null, assets: {} };
    state.analysisCorrected = null;
    goToStep(4);
  };
}

function renderStep2(container) {
  const isScreenshot = state.creationLane === 'screenshot';
  const fileName = state.media.primary?.file?.name || 'uploaded image';
  container.innerHTML = `
    <div style="text-align:center;max-width:720px;margin:0 auto;">
      <div class="softPill">STEP 2</div>
      <h2 style="font-size:30px;margin:14px 0 8px;">${isScreenshot ? 'Analyze the screenshot before we build' : 'Analyze your picture'}</h2>
      <p class="muted">${isScreenshot ? 'XPLAY will inspect visual DNA, camera structure, HUD zones, scene composition and likely game grammar. Nothing is inferred until you press Analyze.' : 'XPLAY will inspect the uploaded picture and identify useful game ingredients.'}</p>
      <div style="margin:22px auto;max-width:620px;border:1px solid var(--line);border-radius:18px;padding:14px;background:#fff;box-shadow:var(--shadow);">
        <img src="${state.media.primary?.dataUrl || ''}" alt="${fileName}" style="width:100%;max-height:360px;object-fit:contain;border-radius:12px;background:#07131e;" />
        <div style="display:flex;justify-content:space-between;gap:10px;margin-top:10px;font-size:12px;color:var(--soft);"><span>${fileName}</span><span>${isScreenshot ? 'REVERSE FORGE SOURCE' : 'PRIMARY SOURCE'}</span></div>
      </div>
      <div id="analysisStatus" class="reverseForgeMini" style="margin:14px auto;max-width:620px;text-align:left;">${isScreenshot ? '🧬 Ready. Press Analyze Screenshot to start a fresh read of this exact image.' : 'Ready to analyze.'}</div>
      <button class="btn primary" id="runAnalysisBtn" style="padding:14px 24px;min-width:240px;">${isScreenshot ? '🧬 ANALYZE SCREENSHOT' : 'ANALYZE PICTURE'}</button>
      <button class="btn ghost" id="replaceImageBtn" style="padding:14px 20px;margin-left:8px;">CHOOSE ANOTHER IMAGE</button>
    </div>`;

  const analyzeBtn=container.querySelector('#runAnalysisBtn');
  const replaceBtn=container.querySelector('#replaceImageBtn');
  const status=container.querySelector('#analysisStatus');
  if(replaceBtn) replaceBtn.onclick=()=>goToStep(1);
  if(analyzeBtn) analyzeBtn.onclick=async()=>{
    analyzeBtn.disabled=true;
    analyzeBtn.textContent='ANALYZING…';
    if(status) status.innerHTML='⟳ Extracting color DNA, composition, scene bands and gameplay cues…';
    try{
      const dna=await withTimeout(analyzeImageStyle(state.media.primary.dataUrl),5000,'Style analysis timed out');
      state.styleDNA=dna;
      const analysisPrompt=isScreenshot
        ? 'Analyze this as a GAMEPLAY SCREENSHOT. Identify likely game genre, camera/viewpoint, player candidates, number/type of visible opponents, HUD, traversable play space, hazards/weapons, environment, art style, palette, and apparent objective. Do not assume airport/runway content unless visibly present.'
        : state.prompt||'';
      const extraction=await safeAnalyzeVisualSource(state.media.primary.dataUrl,analysisPrompt);
      state.extraction=extraction;
      state.analysisCorrected=null;
      if(status) status.innerHTML=`✓ Analysis complete · ${extraction.analysisMode||'visual analysis'}`;
      setTimeout(()=>goToStep(3),180);
    }catch(e){
      console.error(e);
      state.styleDNA=state.styleDNA||fallbackDNA('analysis-fallback');
      state.extraction=await localScreenshotExtraction(state.media.primary.dataUrl,state.styleDNA,state.media.primary?.file);
      if(status) status.innerHTML='⚠ Remote vision was unavailable. XPLAY created a local screenshot-DNA analysis instead of inventing unrelated objects.';
      analyzeBtn.disabled=false;analyzeBtn.textContent=isScreenshot?'🧬 ANALYZE SCREENSHOT':'ANALYZE PICTURE';
      setTimeout(()=>goToStep(3),450);
    }
  };
}

function renderStep3(container) {
  const analysis = state.extraction?.analysis || localImageAnalysis(state.media.primary?.file, state.styleDNA);
  const isScreenshot = state.creationLane === 'screenshot';
  const guide = state.screenshotGuide || defaultScreenshotGuide();
  
  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 3</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">${isScreenshot ? 'What XPLAY will reconstruct' : 'What XPLAY sees'}</h2>
      <p class="muted">${isScreenshot ? 'Confirm the reconstruction target before the Beast builds from it.' : 'Here is what XPLAY understood from your picture.'}</p>
      
      <div style="background: white; border: 1px solid var(--line); border-radius: 16px; padding: 24px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <h3 style="margin-top: 0; font-size: 18px; border-bottom: 1px solid var(--line); padding-bottom: 10px; color: var(--navy);">XPLAY SEES</h3>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px; display: grid; gap: 12px; line-height: 1.5;">
          <li>👤 <b>Player Candidate:</b> <span>${analysis.player}</span></li>
          <li>🌄 <b>Environment:</b> <span>${analysis.environment}</span></li>
          <li>🚗 <b>Vehicles:</b> <span>${analysis.vehicles}</span></li>
          <li>📦 <b>Notable Objects:</b> <span>${analysis.notableObjects}</span></li>
          <li>🎨 <b>Dominant Colors:</b> <span>${analysis.dominantColors}</span></li>
          <li>✨ <b>Opportunities:</b> <span>${analysis.strongOpportunities}</span></li>
        </ul>
        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed var(--line); font-size: 12.5px; color: var(--teal); font-style: italic;">
          🐾 XPLAY sees: "Wow, I can't wait to adapt to the ${analysis.environment}! It looks like a great spot."
        </div>
      </div>
      
      ${isScreenshot ? `
      <div class="reverseForgePanel">
        <div class="reverseForgeSummary"><b>AI INTERPRETATION</b><p>${summarizeScreenshotAnalysis(analysis)}</p></div>
        <label class="fieldLabel">USE SCREENSHOT AS
          <select id="shotFidelity" class="forgeSelect">
            <option value="blueprint" ${guide.fidelity==='blueprint'?'selected':''}>Exact visual blueprint</option>
            <option value="strong" ${guide.fidelity==='strong'?'selected':''}>Strong reference</option>
            <option value="inspiration" ${guide.fidelity==='inspiration'?'selected':''}>Loose inspiration</option>
          </select>
        </label>
        <div class="fieldLabel" style="margin-top:14px;">PRESERVE FROM SCREENSHOT</div>
        <div class="preserveChipGrid">
          ${SCREENSHOT_PRESERVE_OPTIONS.map(([id,label])=>`<label class="preserveChip"><input type="checkbox" data-preserve="${id}" ${guide.preserve.includes(id)?'checked':''}> ${label}</label>`).join('')}
        </div>
        <div class="forgeTwoCol">
          <label class="fieldLabel">CAMERA / VIEWPOINT
            <select id="shotCamera" class="forgeSelect">
              ${[['auto','Let AI infer'],['side-view','Side view'],['top-down','Top-down'],['first-person','First-person'],['isometric','Isometric'],['behind-character','Behind character']].map(([v,l])=>`<option value="${v}" ${guide.camera===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </label>
          <label class="fieldLabel">PLAYABLE CHARACTER
            <select id="shotPlayer" class="forgeSelect">
              ${[['source','Use character in screenshot'],['uploaded','Use another uploaded character'],['new','Create a new character']].map(([v,l])=>`<option value="${v}" ${guide.playerSource===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </label>
        </div>
        <label class="fieldLabel">GAME OBJECTIVE <span class="optionalTag">OPTIONAL</span>
          <input id="shotObjective" class="forgeInput" value="${guide.objective || ''}" placeholder="Example: Sneak past guards and reach the exit." />
        </label>
        <label class="fieldLabel">DO NOT CHANGE <span class="optionalTag">OPTIONAL</span>
          <input id="shotDontChange" class="forgeInput" value="${guide.doNotChange || ''}" placeholder="Example: Keep the skyline, two guards and red sight cones." />
        </label>
        <label class="fieldLabel">MOTION / PATROL HINTS <span class="optionalTag">OPTIONAL</span>
          <input id="shotMotion" class="forgeInput" value="${guide.motionHints || ''}" placeholder="Example: Guards patrol left/right; spotlight sweeps every 4 seconds." />
        </label>
      </div>` : ''}

      <h3 style="font-size: 18px; margin-bottom: 12px;">${isScreenshot ? 'Does this reconstruction target look right?' : 'Did XPLAY understand the picture?'}</h3>
      <div class="cardActions">
        <button class="btn primary" id="confirmAnalysisBtn">${isScreenshot ? 'LOOKS RIGHT — KEEP GOING' : 'YES, KEEP GOING'}</button>
        <button class="btn ghost" id="adjustAnalysisBtn">ADJUST WHAT XPLAY SEES</button>
        ${isScreenshot ? '<button class="btn ghost" id="reanalyzeShotBtn">RE-ANALYZE SCREENSHOT</button>' : ''}
      </div>
      
      <div id="adjustmentForm" style="display: none; margin-top: 24px; border-top: 1px solid var(--line); padding-top: 20px;">
        <h3 style="font-size: 18px; margin-bottom: 16px;">Adjust settings</h3>
        <label class="fieldLabel">PLAYER CANDIDATE
          <input type="text" id="correctPlayer" style="width:100%; padding:12px; border:1px solid var(--line); border-radius:12px; margin-top:6px; font-size: 14px;" value="${analysis.player}" />
        </label>
        <label class="fieldLabel" style="margin-top:14px; display:block;">ENVIRONMENT
          <input type="text" id="correctEnvironment" style="width:100%; padding:12px; border:1px solid var(--line); border-radius:12px; margin-top:6px; font-size: 14px;" value="${analysis.environment}" />
        </label>
        <label class="fieldLabel" style="margin-top:14px; display:block;">IMPORTANT OBJECTS
          <input type="text" id="correctObject" style="width:100%; padding:12px; border:1px solid var(--line); border-radius:12px; margin-top:6px; font-size: 14px;" value="${analysis.notableObjects}" />
        </label>
        <button class="btn primary" id="saveCorrectionsBtn" style="margin-top: 18px; width: 100%;">SAVE CORRECTIONS & KEEP GOING</button>
      </div>
    </div>
  `;

  const saveScreenshotGuide = () => {
    if (!isScreenshot) return;
    const next = state.screenshotGuide || defaultScreenshotGuide();
    next.fidelity = container.querySelector('#shotFidelity')?.value || 'blueprint';
    next.camera = container.querySelector('#shotCamera')?.value || 'auto';
    next.playerSource = container.querySelector('#shotPlayer')?.value || 'source';
    next.objective = container.querySelector('#shotObjective')?.value?.trim() || '';
    next.doNotChange = container.querySelector('#shotDontChange')?.value?.trim() || '';
    next.motionHints = container.querySelector('#shotMotion')?.value?.trim() || '';
    next.preserve = [...container.querySelectorAll('[data-preserve]:checked')].map(x=>x.dataset.preserve);
    next.interpretationConfirmed = true;
    state.screenshotGuide = next;
  };

  const confirmBtn = container.querySelector('#confirmAnalysisBtn');
  const adjustBtn = container.querySelector('#adjustAnalysisBtn');
  const saveBtn = container.querySelector('#saveCorrectionsBtn');
  const reanalyzeBtn = container.querySelector('#reanalyzeShotBtn');
  const adjForm = container.querySelector('#adjustmentForm');

  if (confirmBtn) confirmBtn.onclick = () => { saveScreenshotGuide(); goToStep(4); };
  if (adjustBtn) {
    adjustBtn.onclick = () => {
      if (adjForm) {
        adjForm.style.display = adjForm.style.display === 'none' ? 'block' : 'none';
        adjForm.scrollIntoView({ behavior: 'smooth' });
      }
    };
  }
  if (saveBtn) {
    saveBtn.onclick = () => {
      saveScreenshotGuide();
      const corrected={
        player: container.querySelector('#correctPlayer')?.value?.trim() || analysis.player,
        environment: container.querySelector('#correctEnvironment')?.value?.trim() || analysis.environment,
        notableObjects: container.querySelector('#correctObject')?.value?.trim() || analysis.notableObjects
      };
      state.analysisCorrected = { player:corrected.player, environment:corrected.environment, importantObject:corrected.notableObjects };
      state.extraction ||= {ok:true,assets:{}};
      state.extraction.analysis={...(state.extraction.analysis||analysis),...corrected,analysisSource:'user-corrected'};
      state.extraction.analysisMode='User-corrected screenshot analysis';
      goToStep(3);
    };
  }
  if(reanalyzeBtn) reanalyzeBtn.onclick=()=>goToStep(2);
}

function renderStep4(container) {
  const recommended = getRecommendedEngines();
  
  container.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <div class="softPill">STEP 4</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">What kind of game do you want to make?</h2>
      <p class="muted" style="margin-bottom: 24px;">Select the gameplay foundation for your PLX experience.</p>
      
      <div class="grid" style="grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;" id="engineCardsGrid">
        ${builtIns.map(([id, title, engineId, label, desc]) => {
          const isRec = recommended.includes(engineId);
          const isSelected = state.chosenEngine === engineId;
          const borderStyle = isSelected ? '2px solid var(--teal)' : '1px solid var(--line)';
          const bgStyle = isSelected ? 'var(--mint)' : '#fff';
          const recBadge = isRec ? `<span class="softPill" style="position: absolute; top: 12px; right: 12px; background: #e2f9f8; color: #0d8c87; font-size: 9px; padding: 4px 8px;">RECOMMENDED</span>` : '';
          const customSentence = getCustomEngineSentence(engineId);
          
          return `
            <div class="card engineCard" data-engine="${engineId}" style="position: relative; border: ${borderStyle}; background: ${bgStyle}; cursor: pointer; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;">
              <img src="${publicUrl(`plx/${demoIdForEngine(engineId)}/preview.png`)}" alt="${title}" style="height: 120px; width: 100%; object-fit: cover;" />
              <div class="cardbody" style="padding: 14px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--muted); margin-bottom: 4px;">${label}</div>
                  <h3 style="margin: 0 0 6px 0; font-size: 18px; color: var(--navy);">${title}</h3>
                  <p style="font-size: 12px; color: var(--soft); line-height: 1.4; margin: 0 0 10px 0;">${desc}</p>
                </div>
                <div style="font-size: 12px; font-style: italic; color: var(--navy); border-top: 1px solid var(--line); padding-top: 8px; margin-top: auto;">
                  ${customSentence}
                </div>
              </div>
              ${recBadge}
            </div>
          `;
        }).join('')}
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 1px solid var(--line); padding-top: 20px;">
        <span id="selectedEngineText" style="font-weight: 800; font-size: 16px; color: var(--navy);">
          ${state.chosenEngine ? `Selected: ${state.chosenEngine.toUpperCase()} ✓` : 'Select a game type to continue'}
        </span>
        <button class="btn primary" id="confirmEngineBtn" ${state.chosenEngine ? '' : 'disabled'}>CONTINUE TO DESCRIPTION</button>
      </div>
    </div>
  `;

  const cards = container.querySelectorAll('.engineCard');
  const confirmBtn = container.querySelector('#confirmEngineBtn');
  const txt = container.querySelector('#selectedEngineText');

  cards.forEach(card => {
    card.onclick = () => {
      const engineId = card.dataset.engine;
      state.chosenEngine = engineId;
      chosenEngine = engineId;
      
      cards.forEach(c => {
        c.style.border = '1px solid var(--line)';
        c.style.background = '#fff';
      });
      card.style.border = '2px solid var(--teal)';
      card.style.background = 'var(--mint)';
      
      if (txt) txt.textContent = `Selected: ${engineId.toUpperCase()} ✓`;
      if (confirmBtn) confirmBtn.disabled = false;
    };
  });

  if (confirmBtn) confirmBtn.onclick = () => goToStep(5);
}

function getCustomEngineSentence(engine) {
  const analysis=state.extraction?.analysis||{};
  const environment=state.analysisCorrected?.environment||analysis.environment||'the uploaded scene';
  const player=state.analysisCorrected?.player||analysis.player||'the visible player character';
  const obj=state.analysisCorrected?.importantObject||analysis.notableObjects||'visible landmarks';
  const shot=state.creationLane==='screenshot';
  if(shot){
    const map={
      runner:`Preserve the screenshot's camera and turn its route into a readable high-speed run.`,
      fighting:`Preserve the visible combat plane, fighters, HUD and arena composition as the fighting stage.`,
      fps:`Preserve the screenshot's perspective and rebuild visible targets, cover and HUD as a first-person encounter.`,
      dodge:`Preserve the play space and convert visible threats into timed dodge patterns.`,
      collect:`Preserve the scene layout and make visible landmarks/objects drive an exploration-collection loop.`,
      rhythm:`Preserve the environment and HUD language while turning its visual cues into timed rhythm targets.`,
      puzzle:`Preserve the screenshot's art language and rebuild its visible objects as the puzzle vocabulary.`,
      openworld:`Use the screenshot as the anchor district and extend its visual grammar beyond the frame.`,
      racing:`Preserve the visible route/camera and extend the environment into a raceable course.`,
      platformer:`Preserve the side-view composition and turn visible ledges/floors into collision-authored platforms.`
    }; return `“${map[engine]||`Reconstruct ${environment} without replacing its visible DNA.`}”`;
  }
  return `“Build the ${engine} mechanics directly from ${environment}, ${player}, and ${obj}.”`;
}

function getRecommendedEngines() {
  const analysis = state.extraction?.analysis || (state.media.primary ? localImageAnalysis(state.media.primary?.file, state.styleDNA) : null);
  if (!analysis) return ['runner', 'fps', 'fighting'];
  const opportunities = String(analysis.strongOpportunities || '').toLowerCase();
  const list = [];
  if (opportunities.includes('runner')) list.push('runner');
  if (opportunities.includes('dodge')) list.push('dodge');
  if (opportunities.includes('collect')) list.push('collect');
  if (opportunities.includes('rhythm')) list.push('rhythm');
  if (opportunities.includes('puzzle')) list.push('puzzle');
  if (opportunities.includes('fps')) list.push('fps');
  if (opportunities.includes('fight') || opportunities.includes('combat')) list.push('fighting');
  if (opportunities.includes('open world')) list.push('openworld');
  if (opportunities.includes('race') || opportunities.includes('racing')) list.push('racing');
  if (opportunities.includes('platform')) list.push('platformer');

  const defaults = ['runner', 'fps', 'fighting', 'platformer', 'dodge', 'collect'];
  for (const d of defaults) {
    if (list.length >= 3) break;
    if (!list.includes(d)) list.push(d);
  }
  return list.slice(0, 3);
}

function generatePolishedPrompt(engine, analysis, userIntent) {
  const ana=analysis||state.extraction?.analysis||{};
  const player=state.analysisCorrected?.player||ana.player||'visible player character';
  const environment=state.analysisCorrected?.environment||ana.environment||'uploaded world';
  const importantObject=state.analysisCorrected?.importantObject||ana.notableObjects||'visible landmarks';
  const hazards=ana.possibleHazards||'visible threats and obstacles';
  const collectibles=ana.possibleCollectibles||'scene-derived rewards';
  const intent=(userIntent||'').trim().replace(/\.$/,'');
  const tail=intent?` User direction: ${intent}.`:'';
  const shot=state.creationLane==='screenshot';
  const visualLock=shot?' Preserve the source screenshot camera, layout, player scale, palette, HUD language and major object relationships; infer only missing gameplay information.':'';
  const templates={
    runner:`Run through ${environment}, collecting ${collectibles} while avoiding ${hazards}.`,
    fighting:`Fight rivals inside ${environment}, using the visible combat plane and ${importantObject} as the authored arena.`,
    fps:`Defend and navigate ${environment} from a first-person view using scene-derived targets, cover and hazards.`,
    dodge:`Move through ${environment} while reading and avoiding ${hazards}.`,
    collect:`Explore ${environment} as ${player}, gather ${collectibles}, and use ${importantObject} as progression landmarks.`,
    rhythm:`Play a rhythm challenge staged inside ${environment}, with the character and HUD reacting to combos and misses.`,
    puzzle:`Build a tactile puzzle from the visual vocabulary of ${environment}, ${player}, and ${importantObject}.`,
    openworld:`Use ${environment} as the anchor district, then extend its established visual grammar into explorable connected spaces.`,
    racing:`Race through a course derived from ${environment}, using scene-authentic obstacles, route markers and speed cues.`,
    platformer:`Run, jump and traverse a side-scrolling level reconstructed from ${environment}, keeping visible ledges, hazards and landmarks readable.`
  };
  return `${templates[engine]||`Create a playable ${engine} experience from ${environment}.`}${visualLock}${tail}`;
}

function renderStep5(container) {
  if (!state.prompt) {
    state.prompt = generatePolishedPrompt(state.chosenEngine, state.extraction?.analysis, '');
  }

  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 5</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">What should happen in your game?</h2>
      <p class="muted" style="margin-bottom: 20px;">${state.creationLane === 'screenshot' ? 'Tell XPLAY what should happen. The screenshot remains the visual target; this box supplies the missing gameplay intent.' : 'Describe the game idea in plain words. Avoid technical game development jargon.'}</p>
      ${state.creationLane === 'screenshot' ? `<div class="reverseForgeMini">🧬 <b>Visual lock active:</b> ${state.screenshotGuide?.fidelity === 'blueprint' ? 'Exact visual blueprint' : state.screenshotGuide?.fidelity === 'strong' ? 'Strong reference' : 'Loose inspiration'}</div>` : ''}
      
      <div style="position: relative;">
        <textarea id="promptArea" style="width: 100%; min-height: 160px; padding: 16px; border: 1px solid var(--line); border-radius: 16px; font-size: 15px; line-height: 1.5; outline: none; transition: border-color 0.2s;" placeholder="Describe what the player does...">${state.prompt}</textarea>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
          <button class="btn" id="helpWriteBtn" style="background: linear-gradient(135deg, var(--navy), var(--teal)); color: white; border: 0; box-shadow: 0 4px 12px rgba(36,201,197,0.18); font-size: 13px; padding: 8px 16px;">
            ✦ HELP ME WRITE THIS
          </button>
        </div>
      </div>
      
      <button class="btn primary" id="confirmDescriptionBtn" style="margin-top: 24px; width: 100%; padding: 14px;">CONTINUE TO GAME FEEL</button>
    </div>
  `;

  const ta = container.querySelector('#promptArea');
  const helpBtn = container.querySelector('#helpWriteBtn');
  const confirmBtn = container.querySelector('#confirmDescriptionBtn');

  if (ta) {
    ta.oninput = () => { state.prompt = ta.value; };
  }
  if (helpBtn) {
    helpBtn.onclick = () => {
      const textVal = ta?.value || '';
      const polished = generatePolishedPrompt(state.chosenEngine, state.extraction?.analysis, textVal);
      if (ta) ta.value = polished;
      state.prompt = polished;
    };
  }
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      state.prompt = ta?.value || state.prompt;
      goToStep(6);
    };
  }
}

function renderStep6(container) {
  const options = [
    { id: 'action', title: '💥 ACTION', desc: 'High pacing, quick response times, intense camera shake, frequent rewards.' },
    { id: 'exploration', title: '🗺️ EXPLORATION', desc: 'Relaxed pacing, wider scenery scroll, smooth camera focus, steady collection.' },
    { id: 'challenge', title: '🏆 CHALLENGE', desc: 'Steep difficulty ramp, high hazard density, punishing obstacles, technical movements.' },
    { id: 'story', title: '📖 STORY', desc: 'Conversational cues, clear narrative highlights, easy controls, atmospheric mood.' },
    { id: 'rhythm', title: '🎵 RHYTHM', desc: 'Beat-synced movement, musical pacing, combo scores, flashy color effects.' },
    { id: 'relaxed', title: '🌿 RELAXED', desc: 'Gentle curve, calm ambient colors, low stress, casual play.' }
  ];

  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 6</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">What should this game feel like?</h2>
      <p class="muted" style="margin-bottom: 24px;">This choice guides the AI Beast to calibrate physics, speed, camera, and encounter rules.</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;" id="feelGrid">
        ${options.map(o => {
          const isSelected = state.feel === o.id;
          const borderStyle = isSelected ? '2px solid var(--teal)' : '1px solid var(--line)';
          const bgStyle = isSelected ? 'var(--mint)' : '#fff';
          return `
            <div class="card feelCard" data-feel="${o.id}" style="border: ${borderStyle}; background: ${bgStyle}; padding: 18px; border-radius: 16px; cursor: pointer; display: flex; flex-direction: column; gap: 6px;">
              <b style="font-size: 16px; color: var(--navy);">${o.title}</b>
              <span style="font-size: 12px; color: var(--soft); line-height: 1.3;">${o.desc}</span>
            </div>
          `;
        }).join('')}
      </div>
      
      <button class="btn primary" id="confirmFeelBtn" style="margin-top: 28px; width: 100%; padding: 14px;" ${state.feel ? '' : 'disabled'}>CONTINUE TO VISUAL STYLE</button>
    </div>
  `;

  const cards = container.querySelectorAll('.feelCard');
  const confirmBtn = container.querySelector('#confirmFeelBtn');

  cards.forEach(card => {
    card.onclick = () => {
      const feelId = card.dataset.feel;
      state.feel = feelId;
      cards.forEach(c => {
        c.style.border = '1px solid var(--line)';
        c.style.background = '#fff';
      });
      card.style.border = '2px solid var(--teal)';
      card.style.background = 'var(--mint)';
      if (confirmBtn) confirmBtn.disabled = false;
    };
  });

  if (confirmBtn) confirmBtn.onclick = () => goToStep(7);
}

function renderStep7(container) {
  const styles = [
    { id: 'cinematic-photo', name: 'CINEMATIC', desc: 'Source-inspired realism with arcade polish.', detail: 'High contrast photorealism' },
    { id: 'speed-16', name: 'ARCADE 16', desc: 'Bold sprite-based retro action.', detail: 'Layered parallax, neon glow' },
    { id: 'storybook', name: 'ANIMATED', desc: 'Stylized illustrated characters.', detail: 'Warm colors, smooth lines' },
    { id: 'block-sandbox', name: 'NEON', desc: 'High-energy futuristic visuals.', detail: 'Vibrant colors, glow bloom' },
    { id: 'graphic-novel', name: 'COMIC', desc: 'Graphic-panel action.', detail: 'Ink outlines, halftone shadows' },
    { id: 'mascot-64', name: 'DREAMSCAPE', desc: 'Surreal atmospheric transformation.', detail: 'Vibrant soft vignettes' }
  ];

  const recommendedStyle = getRecommendedStyle();

  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 7</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">How should it look?</h2>
      <p class="muted" style="margin-bottom: 24px;">Choose the aesthetic style of your game's visual design.</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;" id="styleGrid">
        ${styles.map(s => {
          const isSelected = state.style === s.id;
          const isRec = recommendedStyle === s.id;
          const borderStyle = isSelected ? '2px solid var(--teal)' : '1px solid var(--line)';
          const bgStyle = isSelected ? 'var(--mint)' : '#fff';
          const recBadge = isRec ? `<span class="softPill" style="position: absolute; top: 10px; right: 10px; background: #e2f9f8; color: #0d8c87; font-size: 8px; padding: 2px 6px;">XPLAY RECOMMENDS</span>` : '';
          
          return `
            <div class="card styleCardCustom" data-style="${s.id}" style="border: ${borderStyle}; background: ${bgStyle}; padding: 18px; border-radius: 16px; cursor: pointer; display: flex; flex-direction: column; gap: 6px; position: relative;">
              <b style="font-size: 15px; color: var(--navy); margin-top: 6px;">${s.name}</b>
              <span style="font-size: 12px; color: var(--soft); line-height: 1.3;">${s.desc}</span>
              <span style="font-size: 10px; color: #8696a5; margin-top: 6px;">${s.detail}</span>
              ${recBadge}
            </div>
          `;
        }).join('')}
      </div>
      
      <button class="btn primary" id="confirmStyleBtn" style="margin-top: 28px; width: 100%; padding: 14px;" ${state.style ? '' : 'disabled'}>CONTINUE TO EXTRA MEDIA</button>
    </div>
  `;

  const cards = container.querySelectorAll('.styleCardCustom');
  const confirmBtn = container.querySelector('#confirmStyleBtn');

  cards.forEach(card => {
    card.onclick = () => {
      const styleId = card.dataset.style;
      state.style = styleId;
      cards.forEach(c => {
        c.style.border = '1px solid var(--line)';
        c.style.background = '#fff';
      });
      card.style.border = '2px solid var(--teal)';
      card.style.background = 'var(--mint)';
      if (confirmBtn) confirmBtn.disabled = false;
    };
  });

  if (confirmBtn) confirmBtn.onclick = () => goToStep(8);
}

function getRecommendedStyle() {
  if (!state.styleDNA) return 'cinematic-photo';
  const mood = state.styleDNA.mood;
  const brightness = state.styleDNA.brightness;
  if (mood === 'bright') return 'storybook';
  if (mood === 'vibrant') return 'block-sandbox';
  if (brightness < 0.35) return 'cinematic-photo';
  return 'speed-16';
}

function renderStep8(container) {
  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 8</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">Give XPLAY more to work with</h2>
      <p class="muted" style="margin-bottom: 24px;">Upload up to 2 extra files (character, environment layers, or props) to influence the build.</p>
      
      <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
        <div style="border: 1px solid var(--line); padding: 16px; border-radius: 16px; background: #fff; display: flex; align-items: center; gap: 16px;">
          <div style="width: 80px; height: 80px; border-radius: 12px; background: var(--mint); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--line);">
            ${state.media.primary ? `<img src="${state.media.primary.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 24px;">📸</span>`}
          </div>
          <div>
            <b style="display: block; font-size: 15px; color: var(--navy);">Primary Source File</b>
            <span style="font-size: 12px; color: var(--soft);">${state.media.primary ? state.media.primary.file.name : 'No image uploaded (Prompt-only mode)'}</span>
            <span style="display: block; font-size: 11px; color: var(--teal); font-weight: 800; margin-top: 4px;">ROLE: MAIN CHARACTER / PLAYER</span>
          </div>
        </div>

        <div style="border: 1px dashed var(--line); padding: 16px; border-radius: 16px; background: #fff; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div id="extra1Preview" style="width: 80px; height: 80px; border-radius: 12px; background: #fbfcfd; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--line);">
              ${state.media.extra1 ? `<img src="${state.media.extra1.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 24px; color: #a0b2b8;">➕</span>`}
            </div>
            <div>
              <b style="display: block; font-size: 15px; color: var(--navy);">Extra Context File 1</b>
              <span id="extra1Meta" style="font-size: 12px; color: var(--soft);">${state.media.extra1 ? state.media.extra1.file.name : 'Optional character, scenery, or prop'}</span>
              <div id="extra1RoleContainer" style="margin-top: 6px; ${state.media.extra1 ? '' : 'display: none;'}">
                <select id="extra1Role" style="padding: 4px 8px; font-size: 11px; border-radius: 6px;">
                  <option value="hazard" ${state.media.extra1?.role === 'hazard' ? 'selected' : ''}>Role: Hazard / Obstacle</option>
                  <option value="collectible" ${state.media.extra1?.role === 'collectible' ? 'selected' : ''}>Role: Collectible Item</option>
                  <option value="player" ${state.media.extra1?.role === 'player' ? 'selected' : ''}>Role: Alternate Character</option>
                  <option value="background" ${state.media.extra1?.role === 'background' ? 'selected' : ''}>Role: Main Environment</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <button class="btn ghost" id="extra1Btn" style="padding: 8px 14px; font-size: 12px;">
              ${state.media.extra1 ? 'Remove' : 'Upload'}
            </button>
            <input type="file" id="extra1Input" accept="image/*,video/*,audio/*" style="display: none;" />
          </div>
        </div>

        <div style="border: 1px dashed var(--line); padding: 16px; border-radius: 16px; background: #fff; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div id="extra2Preview" style="width: 80px; height: 80px; border-radius: 12px; background: #fbfcfd; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--line);">
              ${state.media.extra2 ? `<img src="${state.media.extra2.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 24px; color: #a0b2b8;">➕</span>`}
            </div>
            <div>
              <b style="display: block; font-size: 15px; color: var(--navy);">Extra Context File 2</b>
              <span id="extra2Meta" style="font-size: 12px; color: var(--soft);">${state.media.extra2 ? state.media.extra2.file.name : 'Optional character, scenery, or prop'}</span>
              <div id="extra2RoleContainer" style="margin-top: 6px; ${state.media.extra2 ? '' : 'display: none;'}">
                <select id="extra2Role" style="padding: 4px 8px; font-size: 11px; border-radius: 6px;">
                  <option value="collectible" ${state.media.extra2?.role === 'collectible' ? 'selected' : ''}>Role: Collectible Item</option>
                  <option value="hazard" ${state.media.extra2?.role === 'hazard' ? 'selected' : ''}>Role: Hazard / Obstacle</option>
                  <option value="player" ${state.media.extra2?.role === 'player' ? 'selected' : ''}>Role: Alternate Character</option>
                  <option value="background" ${state.media.extra2?.role === 'background' ? 'selected' : ''}>Role: Main Environment</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <button class="btn ghost" id="extra2Btn" style="padding: 8px 14px; font-size: 12px;">
              ${state.media.extra2 ? 'Remove' : 'Upload'}
            </button>
            <input type="file" id="extra2Input" accept="image/*,video/*,audio/*" style="display: none;" />
          </div>
        </div>
      </div>
      
      <button class="btn primary" id="confirmExtraBtn" style="margin-top: 28px; width: 100%; padding: 14px;">CONTINUE TO HTML CODE</button>
    </div>
  `;

  const btn1 = container.querySelector('#extra1Btn');
  const input1 = container.querySelector('#extra1Input');
  const roleSelect1 = container.querySelector('#extra1Role');
  const roleSelect2 = container.querySelector('#extra2Role');
  const btn2 = container.querySelector('#extra2Btn');
  const input2 = container.querySelector('#extra2Input');
  const confirmBtn = container.querySelector('#confirmExtraBtn');

  if (btn1 && input1) {
    btn1.onclick = () => {
      if (state.media.extra1) { state.media.extra1 = null; goToStep(8); }
      else { input1.click(); }
    };
    input1.onchange = async () => {
      if (input1.files.length > 0) {
        const file = input1.files[0];
        const dataUrl = await readDataUrl(file);
        state.media.extra1 = { file, dataUrl, type: file.type, role: 'hazard' };
        goToStep(8);
      }
    };
  }
  if (roleSelect1) {
    roleSelect1.onchange = () => { if (state.media.extra1) state.media.extra1.role = roleSelect1.value; };
  }
  if (btn2 && input2) {
    btn2.onclick = () => {
      if (state.media.extra2) { state.media.extra2 = null; goToStep(8); }
      else { input2.click(); }
    };
    input2.onchange = async () => {
      if (input2.files.length > 0) {
        const file = input2.files[0];
        const dataUrl = await readDataUrl(file);
        state.media.extra2 = { file, dataUrl, type: file.type, role: 'collectible' };
        goToStep(8);
      }
    };
  }
  if (roleSelect2) {
    roleSelect2.onchange = () => { if (state.media.extra2) state.media.extra2.role = roleSelect2.value; };
  }
  if (confirmBtn) confirmBtn.onclick = () => goToStep(9);
}

function renderStep9(container) {
  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 9</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">Have your own HTML?</h2>
      <p class="muted" style="margin-bottom: 20px;">Paste HTML/CSS/JavaScript if you already have a playable prototype or idea.</p>
      
      <textarea id="htmlContentArea" style="width: 100%; min-height: 180px; padding: 16px; border: 1px solid var(--line); border-radius: 16px; font-family: monospace; font-size: 13px; line-height: 1.5; outline: none; transition: border-color 0.2s;" placeholder="Paste <html> or <canvas> game code here...">${state.htmlContext}</textarea>
      
      <div class="cardActions" style="margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <button class="btn ghost" id="htmlUseGameBtn" style="padding: 12px;">USE THIS AS MY GAME</button>
        <button class="btn ghost" id="htmlUseInspBtn" style="padding: 12px;">USE THIS AS INSPIRATION</button>
      </div>
      
      <div style="text-align: center; margin-top: 24px; border-top: 1px solid var(--line); padding-top: 20px;">
        <button class="btn primary" id="confirmHtmlBtn" style="width: 100%; padding: 14px;">CONTINUE TO REVIEW</button>
      </div>
    </div>
  `;

  const ta = container.querySelector('#htmlContentArea');
  const gameBtn = container.querySelector('#htmlUseGameBtn');
  const inspBtn = container.querySelector('#htmlUseInspBtn');
  const confirmBtn = container.querySelector('#confirmHtmlBtn');

  if (ta) {
    ta.oninput = () => {
      state.htmlContext = ta.value;
      if (!ta.value.trim()) {
        state.htmlMode = '';
        gameBtn.style.border = '1px solid var(--line)';
        gameBtn.style.background = '#fff';
        inspBtn.style.border = '1px solid var(--line)';
        inspBtn.style.background = '#fff';
      }
    };
  }

  if (state.htmlMode === 'game' && gameBtn) {
    gameBtn.style.border = '2px solid var(--teal)';
    gameBtn.style.background = 'var(--mint)';
  } else if (state.htmlMode === 'inspiration' && inspBtn) {
    inspBtn.style.border = '2px solid var(--teal)';
    inspBtn.style.background = 'var(--mint)';
  }

  if (gameBtn) {
    gameBtn.onclick = () => {
      if (!ta?.value.trim()) { alert("Please paste some HTML code first."); return; }
      state.htmlMode = 'game';
      gameBtn.style.border = '2px solid var(--teal)';
      gameBtn.style.background = 'var(--mint)';
      if (inspBtn) { inspBtn.style.border = '1px solid var(--line)'; inspBtn.style.background = '#fff'; }
    };
  }
  if (inspBtn) {
    inspBtn.onclick = () => {
      if (!ta?.value.trim()) { alert("Please paste some HTML code first."); return; }
      state.htmlMode = 'inspiration';
      inspBtn.style.border = '2px solid var(--teal)';
      inspBtn.style.background = 'var(--mint)';
      if (gameBtn) { gameBtn.style.border = '1px solid var(--line)'; gameBtn.style.background = '#fff'; }
    };
  }
  if (confirmBtn) confirmBtn.onclick = () => goToStep(10);
}

function renderStep10(container) {
  let fileCount = 0;
  if (state.media.primary) fileCount++;
  if (state.media.extra1) fileCount++;
  if (state.media.extra2) fileCount++;

  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 10</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">Your PLX</h2>
      <p class="muted" style="margin-bottom: 24px;">Review your choices before building the playable experience.</p>
      
      <div style="background: white; border: 1px solid var(--line); border-radius: 20px; padding: 24px; box-shadow: var(--shadow); margin-bottom: 28px; display: grid; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 20px; border-bottom: 1px solid var(--line); padding-bottom: 16px;">
          <div style="width: 100px; height: 100px; border-radius: 16px; background: var(--mint); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${state.media.primary ? `<img src="${state.media.primary.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 32px;">🎮</span>`}
          </div>
          <div>
            <h3 style="margin: 0 0 6px 0; font-size: 22px; color: var(--navy);">Custom PLX Draft</h3>
            <span class="softPill" style="font-size: 10px;">${state.chosenEngine.toUpperCase()} ENGINE</span>
          </div>
        </div>

        <div style="display: grid; gap: 12px; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f2f6f7; padding-bottom: 8px;">
            <span style="color: var(--soft);">Game Type:</span>
            <b style="color: var(--navy); text-transform: capitalize;">${state.chosenEngine}</b>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f2f6f7; padding-bottom: 8px;">
            <span style="color: var(--soft);">Feel:</span>
            <b style="color: var(--navy); text-transform: capitalize;">${state.feel || 'Standard'}</b>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f2f6f7; padding-bottom: 8px;">
            <span style="color: var(--soft);">Visual Style:</span>
            <b style="color: var(--navy);">${state.style ? getStyle(state.style).name : 'Default'}</b>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f2f6f7; padding-bottom: 8px;">
            <span style="color: var(--soft);">Extra Files:</span>
            <b style="color: var(--navy);">${fileCount} file(s) total</b>
          </div>
          ${state.creationLane === 'screenshot' ? `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f2f6f7; padding-bottom: 8px;"><span style="color: var(--soft);">Creation Method:</span><b style="color: var(--navy);">Screenshot → Game / Reverse Forge</b></div><div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f2f6f7; padding-bottom: 8px;"><span style="color: var(--soft);">Screenshot Fidelity:</span><b style="color: var(--navy);">${state.screenshotGuide?.fidelity || 'blueprint'}</b></div>` : ''}
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f2f6f7; padding-bottom: 8px;">
            <span style="color: var(--soft);">HTML Override:</span>
            <b style="color: var(--navy);">${state.htmlMode ? `Enabled (${state.htmlMode === 'game' ? 'Direct play' : 'Inspiration'})` : 'Disabled'}</b>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <span style="color: var(--soft);">Idea Prompt:</span>
            <p style="margin: 0; background: #fafbfc; border: 1px solid var(--line); border-radius: 12px; padding: 12px; font-size: 13px; color: #334d52; line-height: 1.5;">${state.prompt || 'No descriptive prompt'}</p>
          </div>
        </div>
      </div>

      <div class="cardActions" style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
        <button class="btn primary" id="buildPlxBtn" style="padding: 14px; font-size: 16px;">BUILD MY PLX</button>
        <button class="btn ghost" id="editPlxBtn" style="padding: 14px; font-size: 16px;">EDIT</button>
      </div>
    </div>
  `;

  const buildBtn = container.querySelector('#buildPlxBtn');
  const editBtn = container.querySelector('#editPlxBtn');

  if (buildBtn) buildBtn.onclick = () => goToStep(11);
  if (editBtn) editBtn.onclick = () => goToStep(1);
}

function renderStep11(container) {
  const steps = [
    "Reading your world",
    "Casting your game",
    "Building the environment",
    "Creating your character",
    "Designing gameplay",
    "Adding motion",
    "Making it fun",
    "Playtesting",
    "Final touches",
    "Ready to play"
  ];

  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px 0;">
      <div class="softPill">BUILDING EXPERIENCE</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">Building your PLX</h2>
      <p class="muted" style="margin-bottom: 24px;">The AI Beast is assembling your assets, scene directors, and style configurations.</p>
      
      <div style="background: white; border: 1px solid var(--line); border-radius: 20px; padding: 24px; box-shadow: var(--shadow); margin-bottom: 24px;">
        <ul id="buildStepsList" style="list-style: none; padding: 0; margin: 0; display: grid; gap: 14px;">
          ${steps.map((s, idx) => `
            <li class="build-step-item" data-index="${idx}" style="display: flex; align-items: center; gap: 12px; font-size: 15px; color: var(--muted); font-weight: 500;">
              <span class="status-indicator" style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: var(--muted);">
                ${idx + 1}
              </span>
              <span>${s}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="accordion" style="background: #fafcfd; border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin-bottom: 20px;">
        <button id="toggleLogsBtn" class="accordionToggle" style="width: 100%; text-align: left; background: none; border: none; font-weight: bold; color: var(--navy); cursor: pointer; padding: 4px 0; display: flex; justify-content: space-between;">
          <span>Show Build Diagnostics</span>
          <span id="accordionArrow">▼</span>
        </button>
        <div id="buildLogsContent" style="display: none; margin-top: 10px; font-family: monospace; font-size: 11px; background: #162835; color: #a9ffd5; padding: 12px; border-radius: 8px; max-height: 180px; overflow-y: auto; white-space: pre-wrap;">
          [BUILDER LOG] Initiating PLX builder pipeline...
        </div>
      </div>
    </div>
    <style>
      @keyframes spinSpinner {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  const logsEl = container.querySelector('#buildLogsContent');
  const toggleBtn = container.querySelector('#toggleLogsBtn');
  const arrowEl = container.querySelector('#accordionArrow');

  if (toggleBtn && logsEl) {
    toggleBtn.onclick = () => {
      const show = logsEl.style.display === 'none';
      logsEl.style.display = show ? 'block' : 'none';
      if (arrowEl) arrowEl.textContent = show ? '▲' : '▼';
    };
  }

  runBuildPipeline(container, logsEl).catch(error=>{
    console.error('Build pipeline failed',error);
    if(logsEl) logsEl.innerHTML += `\n[BUILD ERROR] ${String(error?.stack||error)}`;
    const box=container.querySelector('#buildProgressContainer')||container;
    box.insertAdjacentHTML('beforeend',`<div style="margin-top:18px;padding:18px;border:1px solid #ef5b6a;border-radius:14px;background:#fff4f5;color:#7b2431"><b>Build stopped instead of hanging.</b><br>${String(error?.message||error)}<div style="margin-top:12px"><button class="btn ghost" id="retryBuildBtn">RETRY BUILD</button> <button class="btn ghost" id="editBuildBtn">BACK TO REVIEW</button></div></div>`);
    box.querySelector('#retryBuildBtn')?.addEventListener('click',()=>goToStep(11));
    box.querySelector('#editBuildBtn')?.addEventListener('click',()=>goToStep(10));
  });
}

async function runBuildPipeline(container, logsEl) {
  function log(msg) {
    if (logsEl) {
      logsEl.innerHTML += `\n[BUILDER LOG] ${msg}`;
      logsEl.scrollTop = logsEl.scrollHeight;
    }
  }

  const items = container.querySelectorAll('.build-step-item');
  
  async function advanceStep(idx) {
    if (idx >= items.length) return;
    const item = items[idx];
    const ind = item.querySelector('.status-indicator');
    
    item.style.color = 'var(--navy)';
    item.style.fontWeight = '700';
    if (ind) {
      ind.style.borderColor = 'var(--teal)';
      ind.style.background = 'var(--mint)';
      ind.style.color = '#0c7c78';
      ind.innerHTML = '⟳';
      ind.style.animation = 'spinSpinner 1s infinite linear';
    }
  }

  async function completeStep(idx) {
    if (idx >= items.length) return;
    const item = items[idx];
    const ind = item.querySelector('.status-indicator');
    
    item.style.color = '#20a39f';
    item.style.fontWeight = '600';
    if (ind) {
      ind.style.borderColor = '#20a39f';
      ind.style.background = '#e2f9f8';
      ind.style.color = '#158c88';
      ind.innerHTML = '✓';
      ind.style.animation = 'none';
    }
  }

  await advanceStep(0);
  log("Step 1: Reading media inputs...");
  const effectivePrompt = state.creationLane === 'screenshot'
    ? buildScreenshotReconstructionPrompt(state.prompt, state.screenshotGuide, state.extraction?.analysis || {})
    : state.prompt;
  if (state.creationLane === 'screenshot') log("Reverse Forge visual-spec lock enabled. Screenshot constraints will guide scene reconstruction.");
  const optionArgs = {
    mode: state.mode,
    selectedEngine: state.chosenEngine,
    styleId: state.style || 'cinematic-photo',
    styleName: state.style ? getStyle(state.style).name : 'Cinematic Photo',
    overlayId: state.style ? getStyle(state.style).overlay : 'cinema',
    useSubject: true,
    useEnvironment: true,
    useObjects: true,
    usePalette: true,
    reverseForge: state.creationLane === 'screenshot',
    screenshotGuide: state.screenshotGuide,
    screenshotAnalysis: state.extraction?.analysis || null
  };
  await new Promise(r => setTimeout(r, 200));
  await completeStep(0);

  await advanceStep(1);
  log("Step 2: Performing image and color style DNA analysis...");
  const primaryImgUrl = state.media.primary?.dataUrl || '';
  let dna = state.styleDNA;
  if (!dna) {
    dna = await analyzeImageStyle(primaryImgUrl);
    state.styleDNA = dna;
  }
  let extraction = state.extraction;
  if (!extraction && primaryImgUrl) {
    extraction = await safeAnalyzeVisualSource(primaryImgUrl, effectivePrompt);
    state.extraction = extraction;
  }
  log(`Style DNA found brightness: ${dna.brightness}, saturation: ${dna.saturation}, mood: ${dna.mood}`);
  await new Promise(r => setTimeout(r, 250));
  await completeStep(1);

  await advanceStep(2);
  log("Step 3: Creating visual assets blueprint...");
  const plan = createStudioPlan({
    prompt: effectivePrompt,
    selectedEngine: state.chosenEngine,
    styleName: optionArgs.styleName,
    visualAnalysis: extraction?.analysis
  });
  log(`Selected specialist director: ${plan.director}`);
  await new Promise(r => setTimeout(r, 200));
  await completeStep(2);

  await advanceStep(3);
  log("Step 4: Executing director spec for graphics...");
  const spec = await directPLX({
    prompt: effectivePrompt,
    imageDataUrl: primaryImgUrl,
    styleDNA: dna,
    visualAnalysis: extraction?.analysis,
    options: { ...optionArgs, selectedEngine: plan.engine, productionBlueprint: plan }
  });
  spec.engine = plan.engine;
  spec.productionBlueprint = plan;
  await new Promise(r => setTimeout(r, 200));
  await completeStep(3);

  await advanceStep(4);
  log("Step 5: Invoking Visual Asset Factory...");
  let assets = await deriveVisualAssets(primaryImgUrl, dna, spec, optionArgs, extraction);
  // Production Art Forge: when the local/API image model is available, batch-manufacture a coherent world pack.
  // Static GitHub Pages skips this automatically and uses the deterministic local World Forge.
  let productionPack = null;
  if (spec.engine !== 'html') {
    log("Step 5b: Asking the Production Art Forge for cohesive sprite/tile/background sheets...");
    productionPack = await forgeProductionArtPack({prompt: effectivePrompt, engine: spec.engine, style: optionArgs.styleName, imageDataUrl: primaryImgUrl, visualAnalysis: extraction?.analysis});
    if (productionPack?.assets) {
      assets = {...assets, ...productionPack.assets};
      log(`Production Art Forge returned ${Object.keys(productionPack.assets).length} sliced game assets.`);
    } else {
      log("Production Art Forge unavailable — continuing with local deterministic World Forge.");
    }
  }
  
  if (state.htmlMode === 'game') {
    log("Overriding engine to html...");
    spec.engine = 'html';
    assets.html = state.htmlContext;
  }

  if (state.media.extra1?.dataUrl) {
    const ex = state.media.extra1;
    const role = ex.role || (ex.file?.name?.toLowerCase().includes('character') ? 'player' : 'hazard');
    log(`Integrating Extra File 1 (${ex.file.name}) with role: ${role}`);
    if (role === 'player') {
      assets.player = await cropImageToAsset(ex.dataUrl, 180, 220, true);
    } else if (role === 'background') {
      assets.background = await cropImageToAsset(ex.dataUrl, 960, 600, false);
    } else if (role === 'collectible') {
      assets.collectible = ex.dataUrl;
    } else if (role === 'hazard') {
      assets.hazard = ex.dataUrl;
    } else if (role === 'enemy') {
      assets.enemy = ex.dataUrl;
    }
  }
  if (state.media.extra2?.dataUrl) {
    const ex = state.media.extra2;
    const role = ex.role || (ex.file?.name?.toLowerCase().includes('collect') ? 'collectible' : 'collectible');
    log(`Integrating Extra File 2 (${ex.file.name}) with role: ${role}`);
    if (role === 'player') {
      assets.player = await cropImageToAsset(ex.dataUrl, 180, 220, true);
    } else if (role === 'background') {
      assets.background = await cropImageToAsset(ex.dataUrl, 960, 600, false);
    } else if (role === 'collectible') {
      assets.collectible = ex.dataUrl;
    } else if (role === 'hazard') {
      assets.hazard = ex.dataUrl;
    } else if (role === 'enemy') {
      assets.enemy = ex.dataUrl;
    }
  }

  await new Promise(r => setTimeout(r, 200));
  await completeStep(4);

  await advanceStep(5);
  log("Step 6: Calibrating gameplay physics and feel parameters...");
  const feelModifier = {
    action: { gravity: 950, speed: 450, description: "Fast, punchy pacing with high impact" },
    exploration: { gravity: 800, speed: 280, description: "Smooth pacing and wider search areas" },
    challenge: { gravity: 1050, speed: 500, description: "Punishing speed curve and sharp reaction requirements" },
    story: { gravity: 700, speed: 250, description: "Calm narrative pacing" },
    rhythm: { gravity: 0, speed: 300, description: "Beat synced grid flow" },
    relaxed: { gravity: 650, speed: 220, description: "Calm ambient pacing" }
  };
  const feelConf = feelModifier[state.feel] || feelModifier.action;
  log(`Applying feel configurations: ${feelConf.description}`);
  await new Promise(r => setTimeout(r, 200));
  await completeStep(5);

  await advanceStep(6);
  log("Step 7: Applying Quality Gates and fun multiplier variables...");
  const rawManifest = manifestFrom(spec, dna, assets, optionArgs, effectivePrompt);
  if (state.creationLane === 'screenshot') {
    rawManifest.reverseForge = { enabled:true, guide:state.screenshotGuide, sourceType:'screenshot', reconstructionPrompt:effectivePrompt, analysis:state.extraction?.analysis||{} };
  }
  if (productionPack) {
    rawManifest.generatedAnimations = productionPack.animation;
    rawManifest.productionArtProvenance = productionPack.provenance;
    rawManifest.characterBible = productionPack.characterBible;
  }
  
  rawManifest.feel = state.feel;
  if (state.feel && rawManifest.physics) {
    if (rawManifest.physics.gravity > 0) {
      rawManifest.physics.gravity = feelConf.gravity;
    }
    rawManifest.physics.speed = feelConf.speed;
  }
  
  await new Promise(r => setTimeout(r, 200));
  await completeStep(6);

  await advanceStep(7);
  log("Step 8: Assembling final compiled manifest...");
  const compiled = finishStudioBuild(rawManifest, assets);
  const manifest = compiled.manifest;
  if (state.creationLane === 'screenshot') {
    manifest.reverseForge = { ...(manifest.reverseForge||{}), enabled:true, guide:state.screenshotGuide, sourceType:'screenshot', reconstructionPrompt:effectivePrompt, analysis:state.extraction?.analysis||{} };
  }
  
  if (state.htmlMode === 'game') {
    manifest.engine = 'html';
    manifest.assets.images = {};
    manifest.assets.html = state.htmlContext;
  }
  
  studioProject = {
    title: spec.title,
    slug: slugify(spec.title),
    styleDNA: dna,
    manifest,
    sourceFile: state.media.primary?.file || null
  };
  state.lastManifest = manifest;
  log(`Playtest validation score: ${compiled.audit.score}/100. Verification: ${compiled.audit.pass ? 'PASS' : 'WARNING'}`);
  await new Promise(r => setTimeout(r, 200));
  await completeStep(7);

  await advanceStep(8);
  log("Step 9: Preparing results display overlay...");
  await new Promise(r => setTimeout(r, 200));
  await completeStep(8);

  await advanceStep(9);
  log("Step 10: Compilation complete! Loading result screen.");
  await new Promise(r => setTimeout(r, 250));
  await completeStep(9);

  renderBuildResult(manifest);
}

function cropImageToAsset(dataUrl, w, h, isCharacter) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      if (!x) { resolve(dataUrl); return; }
      if (isCharacter) {
        x.clearRect(0,0,w,h);
        x.save();
        x.beginPath();
        x.roundRect(22, 8, 136, 156, 28);
        x.clip();
        const sw = img.naturalWidth * 0.7;
        const sh = img.naturalHeight * 0.8;
        x.drawImage(img, (img.naturalWidth - sw)/2, (img.naturalHeight - sh)/2, sw, sh, 22, 8, 136, 156);
        x.restore();
        x.fillStyle = '#f5f7f8';
        x.beginPath();
        x.roundRect(45, 150, 90, 42, 12);
        x.fill();
        x.fillStyle = '#23272c';
        x.fillRect(54, 189, 26, 25);
        x.fillRect(100, 189, 26, 25);
        x.strokeStyle = '#24c9c5';
        x.lineWidth = 4;
        x.beginPath();
        x.roundRect(22, 8, 136, 156, 28);
        x.stroke();
      } else {
        x.drawImage(img, 0, 0, w, h);
      }
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function inferMediaRole(ex, index) {
  const name = (ex.file?.name || '').toLowerCase();
  if (name.includes('player') || name.includes('character') || name.includes('me') || name.includes('hero') || name.includes('person') || name.includes('face')) return 'player';
  if (name.includes('bg') || name.includes('background') || name.includes('runway') || name.includes('environment') || name.includes('road') || name.includes('stage') || name.includes('scene') || name.includes('map') || name.includes('sky')) return 'background';
  if (name.includes('enemy') || name.includes('boss') || name.includes('rival') || name.includes('opponent') || name.includes('monster') || name.includes('drone')) return 'enemy';
  if (name.includes('hazard') || name.includes('obstacle') || name.includes('spikes') || name.includes('luggage') || name.includes('rock') || name.includes('mine') || name.includes('crate')) return 'hazard';
  if (name.includes('collectible') || name.includes('item') || name.includes('coin') || name.includes('pass') || name.includes('ticket') || name.includes('gem') || name.includes('star') || name.includes('gold')) return 'collectible';
  return index === 1 ? 'hazard' : 'collectible';
}

function withTimeout(promise,ms,message='Operation timed out'){
  let t;const timeout=new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error(message)),ms)});
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(t));
}

async function localScreenshotExtraction(dataUrl,styleDna,file){
  const analysis=await analyzeScreenshotLocally(dataUrl,styleDna,file);
  return {ok:true,analysis,assets:{},analysisMode:'browser screenshot DNA (local fallback)'};
}

async function analyzeScreenshotLocally(dataUrl,styleDna,file){
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=dataUrl});
  const c=document.createElement('canvas');c.width=192;c.height=120;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,c.width,c.height);
  const data=x.getImageData(0,0,c.width,c.height).data;let lum=0,sat=0,topDark=0,bottomDark=0;
  const rowLuma=(yy)=>{let t=0;for(let xx=0;xx<c.width;xx++){const i=(yy*c.width+xx)*4;t+=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255}return t/c.width};
  for(let i=0;i<data.length;i+=4){const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);lum+=(r*.2126+g*.7152+b*.0722);sat+=mx?((mx-mn)/mx):0}
  const n=data.length/4;lum/=n;sat/=n;
  for(let y=0;y<18;y++)topDark+=rowLuma(y);topDark/=18;for(let y=102;y<120;y++)bottomDark+=rowLuma(y);bottomDark/=18;
  let horizontal=0;for(let y=58;y<108;y++){let row=0;for(let xx=1;xx<c.width;xx++){const i=(y*c.width+xx)*4,j=(y*c.width+xx-1)*4;row+=Math.abs(data[i]-data[j])+Math.abs(data[i+1]-data[j+1])+Math.abs(data[i+2]-data[j+2]);}if(row>horizontal)horizontal=row;}
  const hudLikely=topDark<.28||bottomDark<.30;
  const sideViewLikely=horizontal>9000;
  const palette=(styleDna?.palette||[]).slice(0,5);
  const darkScene=lum<.45;
  const player=sideViewLikely?'A prominent foreground character on a side-view gameplay plane':'A prominent foreground playable subject';
  const environment=`${darkScene?'dark, high-contrast ':'colorful '}arcade gameplay scene with ${sideViewLikely?'a horizontal traversable floor/arena':'a clearly framed play space'}`;
  const notableObjects=`${hudLikely?'HUD/status bands, ':''}multiple foreground actor/object silhouettes, gameplay floor, layered background structures`;
  const strongOpportunities=sideViewLikely&&hudLikely?'Fighting / beat-em-up or side-view action':'Platformer / runner / action';
  return {player,environment,vehicles:'No reliable vehicle detection in browser fallback',notableObjects,dominantColors:palette.join(', ')||'source-derived palette',mood:darkScene?'dramatic arcade':'bright arcade',motionPotential:'High action potential',possibleHazards:'Visible opponents, weapons, obstacles or scene-authored threats',possibleCollectibles:'Scene-derived pickups or score rewards',strongOpportunities,qualityScore:58,qualityLabel:'local screenshot DNA',warnings:['Remote semantic vision is not connected on this static host; this analysis uses actual pixel/composition data and does not invent airport content.'],camera:sideViewLikely?'side-view':'unknown',hud:hudLikely?'HUD detected':'HUD uncertain',artStyle:'retro/arcade screenshot',analysisSource:'local-pixel-dna'};
}

async function safeAnalyzeVisualSource(dataUrl, prompt) {
  const apiBase=(import.meta.env.VITE_XPLAY_API_BASE_URL||'').replace(/\/$/,'');
  const endpoint=apiBase?`${apiBase}/api/vision/analyze`:'/api/vision/analyze';
  try {
    const controller=new AbortController();const id=setTimeout(()=>controller.abort(),5000);
    const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,body:JSON.stringify({imageDataUrl:dataUrl,prompt,subjectHint:state.creationLane==='screenshot'?'game screenshot':'person'})});
    clearTimeout(id);
    if(!r.ok)throw new Error(`Vision HTTP ${r.status}`);
    const out=await r.json();
    if(!out?.analysis)throw new Error('Vision returned no analysis');
    return {...out,analysisMode:'AI semantic vision'};
  } catch(e) {
    console.warn('AI Vision unavailable; using screenshot DNA fallback.',e);
    if(state.creationLane==='screenshot')return await localScreenshotExtraction(dataUrl,state.styleDNA,state.media.primary?.file);
    return {ok:true,analysis:localImageAnalysis(state.media.primary?.file,state.styleDNA),assets:{},analysisMode:'local photo heuristic'};
  }
}

function localImageAnalysis(file, styleDna) {
  const name = (file?.name || '').toLowerCase();
  let player = 'A person standing in the center';
  let environment = 'An outdoor urban space';
  let vehicles = 'None detected';
  let notableObjects = 'Street elements';
  let dominantColors = (styleDna?.palette || []).slice(0, 3).join(', ');
  let mood = styleDna?.mood || 'balanced';
  let motionPotential = 'Moderate pacing';
  let possibleHazards = 'Obstacles and debris';
  let possibleCollectibles = 'Glowing orbs or tokens';
  let strongOpportunities = 'Runner or Dodge action';

  if (name.includes('airport') || name.includes('plane') || name.includes('runway') || name.includes('flight') || name.includes('jet') || name.includes('terminal')) {
    player = 'A traveler or ground crew member';
    environment = 'Airport runway and airfield';
    vehicles = 'Private aircraft and luggage carts';
    notableObjects = 'Luggage bags and airport traffic cones';
    motionPotential = 'High speed scrolling along the runway';
    possibleHazards = 'Stray luggage, service vehicles, and crossing aircraft';
    possibleCollectibles = 'Passports, boarding passes, and golden tickets';
    strongOpportunities = 'Runner, FPS, or Fighting games';
  } else if (name.includes('car') || name.includes('race') || name.includes('road') || name.includes('vehicle')) {
    player = 'A sleek race car driver';
    environment = 'Highway or racing circuit';
    vehicles = 'Fast sports cars and traffic';
    notableObjects = 'Traffic barriers and speed boosters';
    motionPotential = 'High speed steering and lane changes';
    possibleHazards = 'Traffic blocks and road hazards';
    possibleCollectibles = 'Fuel canisters and turbo coins';
    strongOpportunities = 'Racing or Dodge games';
  } else if (name.includes('fight') || name.includes('rival') || name.includes('clash')) {
    player = 'A martial arts competitor';
    environment = 'Rooftop arena or street background';
    vehicles = 'None';
    notableObjects = 'Breakable crates and platforms';
    motionPotential = 'Dynamic side-to-side movement and jumping';
    possibleHazards = 'Enemy attacks and falling objects';
    possibleCollectibles = 'Health packs and power-up tokens';
    strongOpportunities = 'Fighting or Platformer games';
  } else if (name.includes('person') || name.includes('character') || name.includes('hero') || name.includes('me') || name.includes('photo')) {
    player = 'A stylish modern protagonist';
    environment = 'A detailed street setting';
    vehicles = 'City traffic';
    notableObjects = 'Urban street elements';
    motionPotential = 'Acrobatic jumping and dodging';
    possibleHazards = 'Incoming street obstacles';
    possibleCollectibles = 'Sparkling coins and gear items';
    strongOpportunities = 'Runner, Platformer, or Rhythm games';
  }

  return {
    player,
    environment,
    vehicles,
    notableObjects,
    dominantColors,
    mood,
    motionPotential,
    possibleHazards,
    possibleCollectibles,
    strongOpportunities
  };
}

function renderBuildResult(manifest) {
  views.studio.innerHTML = `
    <div class="top">
      <div>
        <div class="pill">BUILD COMPLETE</div>
        <h1>${manifest.title}</h1>
        <p class="softPill">${manifest.engine.toUpperCase()} • ${manifest.visualStyle ? getStyle(manifest.visualStyle).name : ''}</p>
      </div>
    </div>
    
    <div class="playerShell">
      <div class="sidepanel">
        <h3>Build Summary</h3>
        <p><strong>Description:</strong> ${manifest.description || 'No description provided'}</p>
        <p><strong>Engine:</strong> ${manifest.engine}</p>
        <p><strong>Pacing (Feel):</strong> ${manifest.feel || 'Standard'}</p>
        
        <div class="assetPreview" style="margin-top: 18px;">
          <h3>Assembled Assets</h3>
          ${manifest.engine === 'html' ? `
            <div style="padding: 12px; background: #fafcfd; border: 1px solid var(--line); border-radius: 12px; font-family: monospace; font-size: 11px;">
              [HTML GAME CODE INJECTED]
            </div>
          ` : `
            <div class="thumbGrid">
              ${Object.entries(manifest.assets?.images || {}).filter(([k,v]) => v).map(([k,v]) => `
                <figure>
                  <img src="${v}" alt="${k}" />
                  <figcaption>${k}</figcaption>
                </figure>
              `).join('')}
            </div>
          `}
        </div>
      </div>
      
      <aside class="sidepanel" style="display: flex; flex-direction: column; gap: 12px;">
        <button class="btn primary" id="playBtn" style="padding: 14px; font-size: 16px;">▶ PLAY</button>
        <button class="btn primary" id="makeBetterBtn" style="background: linear-gradient(135deg, #7b45e8, #24c9c5); color: white; padding: 12px; font-size: 14px;">
          ✦ MAKE IT BETTER
        </button>
        <button class="btn ghost" id="editBtn" style="padding: 11px;">KEEP EDITING</button>
        <button class="btn ghost" id="remixBtn" style="padding: 11px;">REMIX</button>
        <button class="btn ghost" id="exportBtn" style="padding: 11px;">EXPORT PLX</button>
        
        <div id="buildStatus" class="muted" style="font-size: 12px; text-align: center; margin-top: 8px;"></div>
      </aside>
    </div>
  `;

  const studio = views.studio;
  
  const playBtn = studio.querySelector('#playBtn');
  const makeBetterBtn = studio.querySelector('#makeBetterBtn');
  const editBtn = studio.querySelector('#editBtn');
  const remixBtn = studio.querySelector('#remixBtn');
  const exportBtn = studio.querySelector('#exportBtn');
  const statusMsg = studio.querySelector('#buildStatus');

  if (playBtn) playBtn.onclick = () => launchManifest(manifest);

  if (makeBetterBtn) {
    makeBetterBtn.onclick = async () => {
      if (statusMsg) statusMsg.textContent = 'Analyzing and improving PLX rules...';
      const improved = await applyMakeItBetter(manifest);
      state.lastManifest = improved;
      if (statusMsg) statusMsg.textContent = 'Improved manifest applied!';
      setTimeout(() => {
        renderBuildResult(improved);
      }, 800);
    };
  }

  if (editBtn) editBtn.onclick = () => goToStep(10);

  if (remixBtn) {
    remixBtn.onclick = () => {
      state.media = { primary: null, extra1: null, extra2: null };
      state.styleDNA = null;
      state.extraction = null;
      state.analysisCorrected = null;
      state.chosenEngine = '';
      state.prompt = '';
      state.feel = '';
      state.style = '';
      state.htmlContext = '';
      state.htmlMode = '';
      state.creationLane = 'standard';
      state.screenshotGuide = defaultScreenshotGuide();
      state.lastManifest = null;
      goToStep(1);
    };
  }

  if (exportBtn) {
    exportBtn.onclick = () => {
      if (studioProject) exportPLX(studioProject);
    };
  }
}

function syncChosenEngine(){
  // Kept for backward compatibility
}

function readOptions(){
  const styleId = state.style || 'cinematic-photo';
  const style = getStyle(styleId);
  return {
    mode: state.mode,
    selectedEngine: state.chosenEngine || chosenEngine || '',
    styleId,
    styleName: style.name,
    overlayId: style.overlay,
    characterSource: style.artMode==='photo'?'photo':'illustrated',
    useSubject: true,
    useEnvironment: true,
    useObjects: true,
    usePalette: true,
    airportHint: /airport|plane|jet|runway|flight|boarding/.test((state.prompt || '').toLowerCase())
  };
}

function manifestFrom(spec,dna,a,o,description){
 const images={
   background:a.background,player:a.player,collectible:a.collectible,hazard:a.hazard,platform:a.platform,
   enemy:a.enemy,npc:a.npc,building:a.building,crosshair:a.crosshair,weapon:a.weapon,hitfx:a.hitfx,
   goal:a.goal,note:a.note,car:a.car,enemyCar:a.enemyCar,cardBack:a.cardBack,
   face0:a.face0,face1:a.face1,face2:a.face2,face3:a.face3
 };
 // Existing scenes use "player" for the racing car, so swap automatically.
 if(spec.engine==='racing'){images.player=a.car;images.enemy=a.enemyCar;}
 return {
   __base:'',title:spec.title,description:description||spec.objective,engine:spec.engine,duration:spec.duration||55,
   theme:{background:dna.palette[0]},physics:{gravity:['runner','fighting','platformer'].includes(spec.engine)?900:0},
   objective:{label:spec.objective},creatorSpec:spec,styleDNA:dna,visualStyle:o.styleId,overlay:o.overlayId,
   variant:spec.airportTheme?'airport':'generic',visualIntelligence:a.extractionMeta||null,parallax:a.parallax||null,
   production:{blueprint:spec.productionBlueprint||null},assets:{images}
 };
}

function renderRuntimeShell(){
 views.runtime.innerHTML=`
 <div class="top"><div><div class="pill" id="runtimePill">PLX RUNTIME</div><h1 id="runtimeTitle">Choose or generate a PLX</h1><div class="muted" id="runtimeDesc"></div></div>
 <button class="btn ghost" id="libraryBtn">Back to Library</button></div>
 <div class="playerShell">
  <div><div id="game-container" class="gameWrap" data-overlay="none"></div><div class="controls" id="controls">Launch a PLX to start.</div></div>
  <aside class="sidepanel"><h3>Runtime contract</h3>
    <div class="stat"><span>Engine</span><b id="engineName">—</b></div>
    <div class="stat"><span>Style</span><b id="styleName">—</b></div>
    <div class="stat"><span>Overlay</span><b id="overlayName">—</b></div>
    <div class="stat"><span>Renderer</span><b>Phaser</b></div>
    <div class="stat"><span>Assets</span><b>Manifest driven</b></div>
  </aside>
 </div>`;
 views.runtime.querySelector('#libraryBtn').onclick=()=>show('library');
}

async function renderBackend(){
 views.backend.innerHTML=`
 <div class="top"><div><div class="pill">PRODUCTION READINESS</div><h1>Cloud + AI</h1>
 <div class="muted">Local generation is release-candidate quality for themed/composited drafts. Arbitrary photorealistic sprite generation requires the image-generation API hook.</div></div></div>
 <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
  <div class="sidepanel"><h3>Local API</h3><div class="stat"><span>Server</span><b id="apiHealth">Checking…</b></div><div class="stat"><span>AI Director</span><b id="aiHealth">Checking…</b></div><div class="stat"><span>Visual Intelligence</span><b id="visionHealth">Checking…</b></div><div class="stat"><span>Image Remaster</span><b id="imageHealth">Checking…</b></div></div>
  <div class="sidepanel"><h3>Supabase</h3><div class="stat"><span>Client</span><b id="supaHealth">Checking…</b></div><div class="stat"><span>Projects</span><b>plx_projects</b></div></div>
 </div>
 <div class="sidepanel" style="margin-top:18px"><h3>Photorealistic path</h3>
 <div class="muted">Cinematic Photo works now by compositing the real upload into the game. For newly invented photorealistic characters, poses, enemies and sprite sheets, add an OpenAI API key to the existing server-side image-generation hook. No extra desktop software is required.</div></div>`;
 await new Promise(r=>setTimeout(r,900)); const a=await apiHealth();views.backend.querySelector('#apiHealth').textContent=a.ok?'Running':'Not running';views.backend.querySelector('#aiHealth').textContent=a.aiConfigured?'Configured':'Local Director';views.backend.querySelector('#visionHealth').textContent=a.visionConfigured?`${a.visionProvider} online`:'Offline — start Python service';views.backend.querySelector('#imageHealth').textContent=a.imageModelConfigured?'Configured':'Optional';
 const s=await pingSupabase();views.backend.querySelector('#supaHealth').textContent=s.connected?'Connected':'Not configured / schema pending';
}

async function launchBuiltIn(id){const m=await loadPLX(id);m.__id=id;launchManifest(m);}
function launchManifest(m){
 show('runtime');
 views.runtime.querySelector('#runtimeTitle').textContent=m.title;
 views.runtime.querySelector('#runtimeDesc').textContent=m.description||'';
 views.runtime.querySelector('#runtimePill').textContent=m.engine.toUpperCase();
 views.runtime.querySelector('#engineName').textContent=m.engine;
 views.runtime.querySelector('#controls').textContent=controlsFor(m.engine);
 const style=getStyle(m.visualStyle||'cinematic-photo');
 views.runtime.querySelector('#styleName').textContent=style.name;
 const ov=OVERLAY_LIBRARY.find(x=>x.id===(m.overlay||'none')) || OVERLAY_LIBRARY[0];
 views.runtime.querySelector('#overlayName').textContent=ov.name;
 views.runtime.querySelector('#game-container').dataset.overlay=m.overlay||'none';
 try{
  runtime.launch(m);
  setTimeout(()=>{
    const host=views.runtime.querySelector('#game-container');
    if(host && !host.querySelector('canvas,iframe')) showRuntimeFailure(new Error('The game renderer did not mount a canvas.'));
  },2500);
 }catch(error){
  console.error('Runtime launch failed',error);
  showRuntimeFailure(error);
 }
}

function showRuntimeFailure(error){
 const host=views.runtime.querySelector('#game-container');if(!host)return;
 host.innerHTML=`<div style="height:100%;display:grid;place-items:center;padding:40px;text-align:center;color:#fff;background:#101820"><div><h2>Game renderer stopped</h2><p>${String(error?.message||error||'Unknown runtime error')}</p><button class="btn primary" id="runtimeBackToBuild">BACK TO BUILD</button></div></div>`;
 host.querySelector('#runtimeBackToBuild')?.addEventListener('click',()=>show('studio'));
}

function renderExtraction(x){
 const box=views.studio.querySelector('#extractionPreview'); if(!box)return;
 if(!x?.ok){box.innerHTML=`<div class="qualityBad">Visual Intelligence offline. Start BIG-GULP-START.bat or vision-service/start_vision.bat.</div>`;return;}
 const a=x.analysis||{}, z=x.assets||{};
 const tiles=[['Isolated Subject',z.subject],['Subject Mask',z.subjectMask],['Clean Background',z.backgroundClean],['Far Layer',z.far],['Mid Layer',z.mid],['Near Layer',z.near],...(z.objects||[]).slice(0,4).map((o,i)=>[`Object ${i+1}`,o.image])];
 box.innerHTML=`<div class="qualityBar"><b>Extraction ${a.qualityScore||0}/100</b><span>${a.qualityLabel||'unknown'}</span></div><div class="thumbGrid extractionGrid">${tiles.filter(t=>t[1]).map(([k,v])=>`<figure><img src="${v}"><figcaption>${k}</figcaption></figure>`).join('')}</div>${(a.warnings||[]).map(w=>`<div class="qualityWarn">${w}</div>`).join('')}`;
}

function renderDNA(d){
 views.studio.querySelector('#styleDNA').innerHTML=`<div class="palette">${d.palette.map(c=>`<i style="background:${c}"></i>`).join('')}</div>
 <div class="stat"><span>Mood</span><b>${d.mood}</b></div><div class="stat"><span>Brightness</span><b>${Math.round(d.brightness*100)}%</b></div><div class="stat"><span>Saturation</span><b>${Math.round(d.saturation*100)}%</b></div>`;
}
function renderAssets(a){
 const keys=['background','player','collectible','hazard','enemy','npc','building','goal'];
 views.studio.querySelector('#assetPreview').innerHTML=`<div class="thumbGrid">${keys.filter(k=>a[k]).map(k=>`<figure><img src="${a[k]}"><figcaption>${k}</figcaption></figure>`).join('')}</div>`;
}
function directionHTML(s,o){return `<div class="stat"><span>Title</span><b>${s.title}</b></div><div class="stat"><span>Mode</span><b>${o.mode==='ai'?'AI Generated':'Custom'}</b></div><div class="stat"><span>Engine</span><b>${s.engineName||s.engine}</b></div><div class="stat"><span>Template</span><b>${s.template}</b></div><div class="stat"><span>Camera</span><b>${s.camera}</b></div><div class="stat"><span>World</span><b>${s.environment}</b></div><div class="stat"><span>Style</span><b>${o.styleName}</b></div>`;}

function studioPlanHTML(p){
 return `<div class="stat"><span>Director</span><b>${p.director}</b></div>
 <div class="stat"><span>Camera</span><b>${p.camera}</b></div>
 <div class="stat"><span>Movement</span><b>${p.movement}</b></div>
 <div class="stat"><span>Scroll</span><b>${p.scroll.axis} · ${p.scroll.direction}</b></div>
 <div class="stat"><span>Extraction</span><b>${p.extractionPolicy}</b></div>
 <div class="directorTags">${p.mechanics.map(x=>`<span>${x}</span>`).join('')}</div>
 <div class="miniHint"><b>Signature beats:</b> ${p.signatureMoments.join(' → ')}</div>`;
}
function qaHTML(q){
 const cls=q.pass?'qualityGood':'qualityWarn';
 return `<div class="${cls}"><b>${q.pass?'PASS':'REVIEW'} · ${q.score}/100 · ${q.director||''}</b></div>
 ${q.issues.length?`<div class="miniHint">${q.issues.join('<br>')}</div>`:'<div class="miniHint">Required runtime and asset contract satisfied.</div>'}`;
}

function controlsFor(e){return ({runner:'Space / ↑ to jump. Auto-run.',dodge:'WASD / arrows to move.',collect:'WASD / arrows to explore.',rhythm:'D F J K to hit notes.',puzzle:'Click cards to match pairs.',fps:'Move mouse to aim · click to fire · R reload.',fighting:'A/D move · W jump · J punch · K kick · L block.',openworld:'WASD/arrows roam · E interact.',racing:'A/D or Left/Right steer.',platformer:'A/D move · W/Up jump.'})[e];}
function slugify(s){return String(s||'new-plx').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);}
function readDataUrl(f){return new Promise((r,j)=>{const x=new FileReader();x.onload=()=>r(x.result);x.onerror=j;x.readAsDataURL(f);});}
function checked(q){return !!views.studio.querySelector(q)?.checked;}
