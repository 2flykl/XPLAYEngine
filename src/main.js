
import './styles/app.css';
import { PLXRuntime } from './core/PLXRuntime.js';
import { loadPLX } from './core/PLXLoader.js';
import { analyzeImageStyle } from './core/StyleDNA.js';
import { deriveVisualAssets } from './core/VisualAssetFactory.js';
import { analyzeVisualSource } from './services/vision.js';
import { remasterAsset } from './services/art.js';
import { calibratePromptLocal } from './services/calibrator.js';
import { directPLX, apiHealth } from './services/director.js';
import { pingSupabase } from './services/supabase.js';
import { saveProjectToSupabase } from './services/projects.js';
import { exportPLX } from './core/PLXExporter.js';
import { STYLE_LIBRARY, OVERLAY_LIBRARY, getStyle } from './core/StyleLibrary.js';
import { generateSurpriseIdeas, formatSuggestion } from './services/surprise.js';
import { applyMakeItBetter } from './services/makeBetter.js';
import { createStudioPlan, finishStudioBuild } from './core/StudioPipeline.js';
// Calibrate Prompt
const BASE_URL=import.meta.env.BASE_URL || './';
const publicUrl=(path='')=>{
  if(/^(data:|blob:|https?:)/.test(path)) return path;
  return `${BASE_URL}${String(path).replace(/^\.\//,'').replace(/^\//,'')}`;
};

const builtIns=[
 ['frontline','Frontline Echo','fps','First-Person Shooter','Flagship first-person target shooter. Aim, fire, reload, survive depth-rushing targets.'],
 ['streetclash','Street Clash','fighting','Fighting','Flagship one-on-one arcade fighter. Move, jump, punch, kick, block, KO.'],
 ['skybound','Skybound Dash','runner','Runner','Floating-island cinematic runner.'],
 ['rooftop','Rooftop Rush','dodge','Dodge','Top-down dodge and collect action.'],
 ['grove','Lantern Grove','collect','Collect','Exploration and collection PLX.'],
 ['beatline','Beatline City','rhythm','Rhythm','Four-lane music timing PLX.'],
 ['thoughtlink','Thought Link','puzzle','Puzzle','Memory-match puzzle PLX.'],
 ['driftlands','Driftlands','openworld','Open World','Quest-driven free-roam PLX.'],
 ['neonrace','Neon Circuit','racing','Racing','Fast top-down racing PLX.'],
 ['wildjump','Wild Jump','platformer','Platformer','Free-movement platforming PLX.']
];

const socialPosts=[
 {engine:'fps',title:'Terminal Zero',creator:'@novajay',name:'Nova Jay',caption:'A late-night airport photo became a first-person survival run.',played:1284,remixes:86,comments:34,cover:'social/posts/fps.jpg'},
 {engine:'fighting',title:'After Hours',creator:'@marcusvale',name:'Marcus Vale',caption:'One photo. One rival. One neon rooftop. Settle it in the ring.',played:992,remixes:61,comments:28,cover:'social/posts/fighting.jpg'},
 {engine:'runner',title:'Skyline Delivery',creator:'@tianarae',name:'Tiana Rae',caption:'Get the package across the city before anyone sees Flux.',played:1655,remixes:119,comments:46,cover:'social/posts/runner.jpg'},
 {engine:'rhythm',title:'Color Chase',creator:'@ayorose',name:'Ayo Rose',caption:'Stay camouflaged by matching the world on beat.',played:2204,remixes:184,comments:71,cover:'social/posts/rhythm.jpg'},
 {engine:'racing',title:'Neon Circuit',creator:'@devonmiles',name:'Devon Miles',caption:'A street photo turned into a midnight boost race.',played:743,remixes:39,comments:18,cover:'social/posts/racing.jpg'},
 {engine:'platformer',title:'Canopy Rush',creator:'@kenzow',name:'Kenzo W.',caption:'Tongue swing, wall cling, disappear, repeat.',played:1881,remixes:132,comments:54,cover:'social/posts/platformer.jpg'},
 {engine:'collect',title:'Lantern Grove',creator:'@miraeast',name:'Mira East',caption:'A calm photo became a glowing collectible hunt.',played:618,remixes:27,comments:12,cover:'social/posts/collect.jpg'},
 {engine:'dodge',title:'Rooftop Rush',creator:'@jaylenmade',name:'Jaylen Made',caption:'Dodge drones and catch energy drops above the city.',played:1354,remixes:73,comments:31,cover:'social/posts/dodge.jpg'},
 {engine:'openworld',title:'Driftlands',creator:'@samori',name:'Sam Ori',caption:'A single landscape turned into a tiny place worth exploring.',played:836,remixes:42,comments:19,cover:'social/posts/open_world.jpg'},
 {engine:'puzzle',title:'Thought Link',creator:'@nialane',name:'Nia Lane',caption:'Memory, color, and camouflage folded into one playable puzzle.',played:1109,remixes:56,comments:24,cover:'social/posts/puzzle.jpg'}
];

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
   <div class="heroFlux"><img src="${publicUrl('social/posts/runner.jpg')}" alt="XPLAY playable experience"></div>
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
   <img src="${publicUrl(`flux-pack/runtime/library/${engine === 'openworld' ? 'open_world' : engine}_library_example.png`)}" alt="${title}">
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

async function processMainImage(file) {
  const dataUrl = await readDataUrl(file);
  state.media.primary = {
    file,
    dataUrl,
    type: file.type,
    role: 'player',
    analysis: null
  };
  goToStep(2);
}

function renderStep1(container) {
  container.innerHTML = `
    <div style="text-align: center; max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 1</div>
      <h2 style="font-size: 32px; margin: 12px 0 6px;">Start with your main picture</h2>
      <p class="muted" style="margin-bottom: 24px;">Give XPLAY the image you want the game to be built around.</p>
      
      <div id="mainImageDrop" class="media-drop" style="border: 2px dashed var(--teal); padding: 48px 24px; text-align: center; border-radius: 20px; cursor: pointer; background: var(--mint); transition: all 0.2s;">
        <div style="font-size: 48px; margin-bottom: 12px;">📸</div>
        <b style="font-size: 18px; display: block; margin-bottom: 8px;">Drag & drop your main photo here</b>
        <span style="color: var(--soft); font-size: 14px; display: block; margin-bottom: 16px;">Supports PNG, JPG, JPEG</span>
        <button class="btn primary" id="uploadMainBtn" style="pointer-events: auto;">UPLOAD MAIN PICTURE</button>
        <input id="mainImageFile" type="file" accept="image/*" style="display: none;" />
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <button class="btn ghost" id="noPictureBtn">I DON'T HAVE A PICTURE</button>
      </div>
    </div>
  `;

  const dropArea = container.querySelector('#mainImageDrop');
  const fileInput = container.querySelector('#mainImageFile');
  const uploadBtn = container.querySelector('#uploadMainBtn');
  const noPicBtn = container.querySelector('#noPictureBtn');

  if (uploadBtn && fileInput) {
    uploadBtn.onclick = (e) => {
      e.stopPropagation();
      fileInput.click();
    };
  }

  if (dropArea && fileInput) {
    dropArea.onclick = () => fileInput.click();
    dropArea.ondragover = (e) => {
      e.preventDefault();
      dropArea.style.borderColor = 'var(--navy)';
      dropArea.style.background = '#d8ecea';
    };
    dropArea.ondragleave = () => {
      dropArea.style.borderColor = 'var(--teal)';
      dropArea.style.background = 'var(--mint)';
    };
    dropArea.ondrop = async (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await processMainImage(files[0]);
      }
    };
  }

  if (fileInput) {
    fileInput.onchange = async () => {
      if (fileInput.files.length > 0) {
        await processMainImage(fileInput.files[0]);
      }
    };
  }

  if (noPicBtn) {
    noPicBtn.onclick = () => {
      state.media.primary = null;
      state.styleDNA = fallbackDNA('no-picture');
      state.extraction = { ok: false, analysis: null, assets: {} };
      state.analysisCorrected = null;
      goToStep(4);
    };
  }
}

function renderStep2(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 0;">
      <div class="softPill">STEP 2</div>
      <h2 style="font-size: 28px; margin: 16px 0;">XPLAY IS READING YOUR WORLD…</h2>
      <div class="loading-bar-container" style="width: 100%; max-width: 400px; height: 6px; background: var(--line); border-radius: 3px; margin: 20px auto; overflow: hidden;">
        <div class="loading-bar-pulse" style="width: 50%; height: 100%; background: var(--teal); border-radius: 3px; animation: pulseLoading 1.5s infinite ease-in-out;"></div>
      </div>
      <p class="muted">Analyzing characters, environments, and game opportunities from your picture...</p>
    </div>
    <style>
      @keyframes pulseLoading {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
    </style>
  `;

  setTimeout(async () => {
    try {
      const dna = await analyzeImageStyle(state.media.primary.dataUrl);
      state.styleDNA = dna;
      const extraction = await safeAnalyzeVisualSource(state.media.primary.dataUrl, state.prompt || '');
      state.extraction = extraction;
      state.analysisCorrected = null;
      goToStep(3);
    } catch(e) {
      console.error(e);
      state.styleDNA = fallbackDNA('error-fallback');
      state.extraction = { ok: false, analysis: null, assets: {} };
      goToStep(3);
    }
  }, 1000);
}

function renderStep3(container) {
  const analysis = state.extraction?.analysis || localImageAnalysis(state.media.primary?.file, state.styleDNA);
  
  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 3</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">What XPLAY sees</h2>
      <p class="muted">Here is what XPLAY understood from your picture.</p>
      
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
          🐾 Flux says: "Wow, I can't wait to adapt to the ${analysis.environment}! It looks like a great spot."
        </div>
      </div>
      
      <h3 style="font-size: 18px; margin-bottom: 12px;">Did XPLAY understand the picture?</h3>
      <div class="cardActions">
        <button class="btn primary" id="confirmAnalysisBtn">YES, KEEP GOING</button>
        <button class="btn ghost" id="adjustAnalysisBtn">ADJUST WHAT XPLAY SEES</button>
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

  const confirmBtn = container.querySelector('#confirmAnalysisBtn');
  const adjustBtn = container.querySelector('#adjustAnalysisBtn');
  const saveBtn = container.querySelector('#saveCorrectionsBtn');
  const adjForm = container.querySelector('#adjustmentForm');

  if (confirmBtn) confirmBtn.onclick = () => goToStep(4);
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
      state.analysisCorrected = {
        player: container.querySelector('#correctPlayer')?.value || analysis.player,
        environment: container.querySelector('#correctEnvironment')?.value || analysis.environment,
        importantObject: container.querySelector('#correctObject')?.value || analysis.notableObjects
      };
      goToStep(4);
    };
  }
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
              <img src="${publicUrl(`flux-pack/runtime/library/${engineId === 'openworld' ? 'open_world' : engineId}_library_example.png`)}" alt="${title}" style="height: 120px; width: 100%; object-fit: cover;" />
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
  const environment = state.analysisCorrected?.environment || state.extraction?.analysis?.environment || (state.media.primary ? 'photo setting' : 'world');
  const player = state.analysisCorrected?.player || state.extraction?.analysis?.player || 'player';
  const obj = state.analysisCorrected?.importantObject || state.extraction?.analysis?.notableObjects || 'objects';

  if (engine === 'runner') return `“Turn the runway/setting into a moving obstacle course.”`;
  if (engine === 'fighting') return `“Use the runway/setting as an arena and your image as the fighter.”`;
  if (engine === 'fps') return `“Turn the location into a first-person defense scenario.”`;
  if (engine === 'dodge') return `“Weave through obstacles inside the ${environment}.”`;
  if (engine === 'collect') return `“Explore the ${environment} to gather ${obj}.”`;
  if (engine === 'rhythm') return `“Match the rhythm as icons float over the ${environment}.”`;
  if (engine === 'puzzle') return `“Assemble matching puzzle pairs of the ${player}.”`;
  if (engine === 'openworld') return `“Explore the wide coordinates of the ${environment}.”`;
  if (engine === 'racing') return `“Steer cars at high speed past airport/setting hazards.”`;
  if (engine === 'platformer') return `“Leap across platforms hovering above the ${environment}.”`;
  return `“Interpret the ${environment} into arcade gameplay.”`;
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
  const ana = analysis || (state.media.primary ? localImageAnalysis(state.media.primary?.file, state.styleDNA) : null);
  const player = state.analysisCorrected?.player || ana?.player || 'character';
  const environment = state.analysisCorrected?.environment || ana?.environment || 'world setting';
  const importantObject = state.analysisCorrected?.importantObject || ana?.notableObjects || 'objects';
  const hazards = ana?.possibleHazards || 'obstacles';
  const collectibles = ana?.possibleCollectibles || 'passports';

  let intent = userIntent ? userIntent.trim() : '';
  if (intent.endsWith('.')) intent = intent.slice(0, -1);

  if (engine === 'runner') {
    return `Run across the ${environment} collecting ${collectibles} while avoiding ${hazards}. ${intent ? `Style direction: ${intent}` : ''}`;
  } else if (engine === 'fighting') {
    return `Battle a rival beside the ${importantObject} while ${environment} traffic moves around the arena. ${intent ? `Special challenge: ${intent}` : ''}`;
  } else if (engine === 'fps') {
    return `Defend the runway at the ${environment} from incoming hazards like ${hazards}. Protect the ${player} and reload to survive. ${intent ? `Objective: ${intent}` : ''}`;
  } else if (engine === 'dodge') {
    return `Weave through incoming hazards like ${hazards} falling through the ${environment}, while picking up ${collectibles} for survival. ${intent ? `Pacing: ${intent}` : ''}`;
  } else if (engine === 'collect') {
    return `Roam around the ${environment} as the ${player} to gather ${collectibles}. Avoid hazardous spots and ${hazards} to unlock the final portal. ${intent ? `Details: ${intent}` : ''}`;
  } else if (engine === 'rhythm') {
    return `Hit the rhythmic beat indicators timed to the music tracks in the ${environment}. The ${player} reacts to combos and misses with stylish visual effects. ${intent ? `Vibe: ${intent}` : ''}`;
  } else if (engine === 'puzzle') {
    return `Test your memory and logic by matching tiles themed around ${environment}, featuring details of ${player} and ${importantObject}. ${intent ? `Solve rules: ${intent}` : ''}`;
  } else if (engine === 'openworld') {
    return `Explore the wide environment of ${environment} as the ${player}. Speak to ground characters, complete side quests, and uncover secrets near the ${importantObject}. ${intent ? `Storyline: ${intent}` : ''}`;
  } else if (engine === 'racing') {
    return `Steer your racing vehicle at high speed along the ${environment}. Dodge traffic carts and obstacles like ${hazards} while collecting booster tokens. ${intent ? `Track: ${intent}` : ''}`;
  } else if (engine === 'platformer') {
    return `Run and jump across platforms hovering above the ${environment}. Guide the ${player} to the exit gate while avoiding enemies and collecting ${collectibles}. ${intent ? `Goal: ${intent}` : ''}`;
  }

  return `Playable experience set in ${environment} as ${player}. ${intent}`;
}

function renderStep5(container) {
  if (!state.prompt) {
    state.prompt = generatePolishedPrompt(state.chosenEngine, state.extraction?.analysis, '');
  }

  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="softPill">STEP 5</div>
      <h2 style="font-size: 28px; margin: 12px 0 6px;">What should happen in your game?</h2>
      <p class="muted" style="margin-bottom: 20px;">Describe the game idea in plain words. Avoid technical game development jargon.</p>
      
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

  runBuildPipeline(container, logsEl);
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
  const optionArgs = {
    mode: state.mode,
    selectedEngine: state.chosenEngine,
    styleId: state.style || 'cinematic-photo',
    styleName: state.style ? getStyle(state.style).name : 'Cinematic Photo',
    overlayId: state.style ? getStyle(state.style).overlay : 'cinema',
    useSubject: true,
    useEnvironment: true,
    useObjects: true,
    usePalette: true
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
    extraction = await safeAnalyzeVisualSource(primaryImgUrl, state.prompt);
    state.extraction = extraction;
  }
  log(`Style DNA found brightness: ${dna.brightness}, saturation: ${dna.saturation}, mood: ${dna.mood}`);
  await new Promise(r => setTimeout(r, 250));
  await completeStep(1);

  await advanceStep(2);
  log("Step 3: Creating visual assets blueprint...");
  const plan = createStudioPlan({
    prompt: state.prompt,
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
    prompt: state.prompt,
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
  const rawManifest = manifestFrom(spec, dna, assets, optionArgs, state.prompt);
  
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

async function safeAnalyzeVisualSource(dataUrl, prompt) {
  const isStaticPages = location.hostname.endsWith('github.io');
  if (isStaticPages) {
    await new Promise(r => setTimeout(r, 600));
    return { ok: true, analysis: localImageAnalysis(state.media.primary?.file, state.styleDNA) };
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const r = await fetch('/api/vision/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ imageDataUrl: dataUrl, prompt, subjectHint: 'person' })
    });
    clearTimeout(id);
    if (!r.ok) throw new Error();
    return await r.json();
  } catch (e) {
    console.warn("Vision API failed or timed out, falling back to local analysis.");
    return { ok: true, analysis: localImageAnalysis(state.media.primary?.file, state.styleDNA) };
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

async function launchBuiltIn(id){const m=await loadPLX(id);launchManifest(m);}
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
 runtime.launch(m);
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
