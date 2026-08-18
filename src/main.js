
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
const state={mode:'ai',file:null,dataUrl:'',styleDNA:null,extraction:null};
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
   chosenEngine=engine;show('studio');syncChosenEngine();
   const prompt=views.studio.querySelector('#prompt');if(prompt)prompt.value=promptText||'';
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
     chosenEngine=card.dataset.engine;
     show('studio'); syncChosenEngine();
     return;
   }
   if(e.target.closest('.demoBtn') || e.target===card) launchBuiltIn(card.dataset.id);
 };
}

function renderStudio(){
  views.studio.innerHTML=`
  <div class="top">
    <div>
      <div class="pill">CREATE PLAYABLE</div>
      <h1>What do you want to make playable?</h1>
      <p class="softPill">Tell XPLAY your idea – upload media, pick a style, and watch the magic happen.</p>
    </div>
  </div>

  <div class="playerShell">
    <div class="sidepanel">
      <!-- Prompt Input -->
      <h3>Idea</h3>
      <textarea id="prompt" placeholder="Turn this picture into a fighting game where I battle a rival on the airport runway."></textarea>
      <div class="promptTools">
         <!-- Calibrate Prompt -->
         <button class="btn calibrate" id="calibratePrompt">✨ Calibrate my idea</button>
        <span id="calibrateNote">XPLAY can refine your brief without changing its meaning.</span>
      </div>

      <!-- Media Upload -->
      <h3>Media</h3>
      <input id="sourceFile" type="file" accept="image/*,video/*,audio/*" />
      <div id="sourcePreview" style="margin-top:12px"></div>

      <!-- Creation mode -->
      <h3>How should XPLAY work?</h3>
      <div class="modeSwitch">
        <button class="modeBtn active" data-mode="ai">Make it for me</button>
        <button class="modeBtn" data-mode="custom">Direct it myself</button>
      </div>

      <!-- Engine recommendation -->
      <h3>Recommended Game Type</h3>
      <div id="engineRecommend" class="recommendCard">
        <p>XPLAY recommends: <strong>Fighting</strong></p>
        <p>Because your idea sounds like a one‑on‑one battle.</p>
        <button class="btn primary" id="useRecommendedEngine">Use Fighting</button>
        <button class="btn ghost" id="showAllEngines">Show other game types</button>
      </div>
      <div id="engineOptions" class="engineGrid" hidden>
        ${builtIns.map(([id,title,engine,label,desc])=>`<div class="engineCard" data-engine="${engine}">
          <img src="${publicUrl(`flux-pack/runtime/library/${engine === 'openworld' ? 'open_world' : engine}_library_example.png`)}" alt="${title}" />
          <div class="cardbody"><div class="pill">${label}</div><h3>${title}</h3><div class="muted">${desc}</div></div>
        </div>`).join('')}
      </div>

      <!-- Style selection (curated) -->
      <h3>Choose a look</h3>
      <div id="styleCardsCurated" class="styleCards">
        ${STYLE_LIBRARY.slice(0,3).map(s=>`<button class="styleCard ${s.id==='cinematic-photo'?'active':''}" data-style="${s.id}"><b>${s.name}</b><span>${s.publicDescription}</span><em>${s.testComparable}</em></button>`).join('')}
        <button class="styleCard moreStyles" id="showMoreStyles">More styles ›</button>
      </div>
      <div id="styleOptions" class="styleGrid" hidden>
        ${STYLE_LIBRARY.map(s=>`<button class="styleCard" data-style="${s.id}"><b>${s.name}</b><span>${s.publicDescription}</span><em>${s.testComparable}</em></button>`).join('')}
      </div>

      <!-- Build Action -->
      <div class="cardActions">
        <button class="btn primary" id="buildBtn">Make it playable</button>
        <button class="btn secondary" id="surpriseBtn">Surprise Me</button>
        <button class="btn secondary" id="makeBetterBtn">Make Better</button>
      </div>
      <div id="buildStatus" class="controls">Waiting for inspiration.</div>
      <div id="surpriseResults" class="controls" style="margin-top:12px"></div>
    </div>

    <aside class="sidepanel" hidden>
      <h3>Advanced / Build details</h3>
      <div class="accordion" id="advancedDetails">
        <button class="accordionToggle">Show details</button>
        <div class="accordionContent">
          <p><strong>Engine:</strong> <span id="advEngine"></span></p>
          <p><strong>Director:</strong> <span id="advDirector"></span></p>
          <p><strong>Style DNA:</strong> <span id="advStyleDNA"></span></p>
          <p><strong>QA score:</strong> <span id="advQA"></span></p>
        </div>
      </div>
    </aside>
  </div>`;

  renderCustomControls();
  bindStudio();
}

function bindStudio(){
 const fileInput=views.studio.querySelector('#sourceFile');
 const preview=views.studio.querySelector('#sourcePreview');
 const prompt=views.studio.querySelector('#prompt');

 views.studio.querySelectorAll('.modeBtn').forEach(btn=>btn.onclick=()=>{
   state.mode=btn.dataset.mode;
   views.studio.querySelectorAll('.modeBtn').forEach(b=>b.classList.toggle('active',b===btn));
   renderCustomControls();
 });

 views.studio.querySelectorAll('.styleCard').forEach(btn=>btn.onclick=()=>{
   views.studio.querySelectorAll('.styleCard').forEach(b=>b.classList.remove('active'));
   btn.classList.add('active');
   const style=getStyle(btn.dataset.style);
   const suggested=style.overlay;
   const overlay=views.studio.querySelector('#overlaySelect');
   if(overlay) overlay.value=suggested;
 });

 fileInput.onchange=async()=>{
   state.file=fileInput.files[0]; if(!state.file)return;
   state.dataUrl=await readDataUrl(state.file);
   preview.innerHTML=`<img src="${state.dataUrl}" style="max-width:100%;max-height:340px;border-radius:16px">`;
   views.studio.querySelector('#buildStatus').textContent='Image loaded. Visual Intelligence will isolate subject, rebuild background, and propose objects.';
 };

 views.studio.querySelector('#airportBtn').onclick=()=>{
   prompt.value='running through the airport dodging items dropped by passing planes and collecting boarding passes';
 };

 views.studio.querySelector('#calibratePrompt').onclick=async()=>{
   const btn=views.studio.querySelector('#calibratePrompt');
   if(!prompt.value.trim()){views.studio.querySelector('#buildStatus').textContent='Write the basic game idea first, then calibrate it.';return;}
   btn.disabled=true;btn.textContent='Calibrating…';
   const options=readOptions();
   const sourceSummary=state.extraction?.analysis?`extraction quality ${state.extraction.analysis.qualityScore||0}/100, palette ${(state.extraction.analysis.palette||[]).join(', ')}`:'';
   try{
     const r=await fetch('/api/calibrate-prompt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:prompt.value,engine:options.selectedEngine,style:options.styleName,sourceSummary})});
     if(r.ok){const data=await r.json();prompt.value=data.prompt||prompt.value;}
     else prompt.value=calibratePromptLocal({prompt:prompt.value,engine:options.selectedEngine,style:options.styleName,sourceSummary});
   }catch{
     prompt.value=calibratePromptLocal({prompt:prompt.value,engine:options.selectedEngine,style:options.styleName,sourceSummary});
   }
   views.studio.querySelector('#buildStatus').textContent='Prompt calibrated. Review it or click Build PLX.';
   btn.disabled=false;btn.textContent='✦ Recalibrate Prompt';
 };
 
 // New button bindings
 views.studio.querySelector('#surpriseBtn').onclick=async()=>{
   if(!state.dataUrl){
     views.studio.querySelector('#buildStatus').textContent='Upload media first.';
     return;
   }
   const resultsDiv=views.studio.querySelector('#surpriseResults');
   resultsDiv.textContent='Generating surprise ideas…';
   const ideas=await generateSurpriseIdeas({imageDataUrl:state.dataUrl,prompt:prompt.value});
   resultsDiv.innerHTML=ideas.map(formatSuggestion).join('<hr/>');
 };
 
 views.studio.querySelector('#makeBetterBtn').onclick=async()=>{
   if(!state.lastManifest){
     views.studio.querySelector('#buildStatus').textContent='Build a PLX first.';
     return;
   }
   const improved=await applyMakeItBetter(state.lastManifest);
   state.lastManifest=improved;
   views.studio.querySelector('#buildStatus').textContent='Improved manifest applied.';
   renderBuildResult(improved.manifest);
 };

 views.studio.querySelector('#buildBtn').onclick=async()=>{
   if(!state.dataUrl){views.studio.querySelector('#buildStatus').textContent='Upload an image first.';return;}
   const status=views.studio.querySelector('#buildStatus');
   const options=readOptions();

   status.textContent='Stage 1/4 · Separating subject, environment, and object candidates…';
   const extraction=await analyzeVisualSource({imageDataUrl:state.dataUrl,prompt:prompt.value});
   state.extraction=extraction; renderExtraction(extraction);

   status.textContent='Stage 2/4 · Analyzing Style DNA…';
   const dna=await analyzeImageStyle(state.dataUrl); state.styleDNA=dna; renderDNA(dna);

   status.textContent='Stage 3/6 · Selecting specialist game director and production contract…';
   const plan=createStudioPlan({prompt:prompt.value,selectedEngine:options.selectedEngine,styleName:options.styleName,visualAnalysis:extraction.analysis});
   views.studio.querySelector('#studioPlan').innerHTML=studioPlanHTML(plan);

   status.textContent=`Stage 4/6 · ${plan.director} is directing gameplay, camera and asset roles…`;
   const spec=await directPLX({prompt:prompt.value,imageDataUrl:state.dataUrl,styleDNA:dna,visualAnalysis:extraction.analysis,options:{...options,selectedEngine:plan.engine,productionBlueprint:plan}});
   spec.engine=plan.engine; spec.productionBlueprint=plan;

   status.textContent='Stage 5/6 · Building isolated character, clean world, category-native props and environment layers…';
   let assets=await deriveVisualAssets(state.dataUrl,dna,spec,options,extraction);

   if(views.studio.querySelector('#aiRemaster')?.checked && extraction?.assets?.subject){
     status.textContent='Bonus pass · AI-remastering isolated subject into game art…';
     const remaster=await remasterAsset({imageDataUrl:extraction.assets.subject,role:'player',style:getStyle(options.styleId).name,prompt:prompt.value});
     if(remaster.ok && remaster.image) assets={...assets,player:remaster.image,remasterMode:'AI image remaster'};
   }
   renderAssets(assets);

   status.textContent='Stage 6/6 · Critic pass: repairing missing assets and validating the selected engine…';

   if(views.studio.querySelector('#qualityGate')?.checked && extraction.ok && extraction.analysis?.qualityScore<48){status.textContent='Extraction quality is too weak for showcase mode. Review the mask or use a cleaner source image.';return;}
   const rawManifest=manifestFrom(spec,dna,assets,options,prompt.value);
   const compiled=finishStudioBuild(rawManifest,assets);
   const manifest=compiled.manifest;
   studioProject={title:spec.title,slug:slugify(spec.title),styleDNA:dna,manifest,sourceFile:state.file};

   views.studio.querySelector('#direction').innerHTML=directionHTML(spec,options);
   views.studio.querySelector('#qaReport').innerHTML=qaHTML(compiled.audit);
   status.textContent=`Draft ready · ${spec.engineName || spec.engine} · ${getStyle(options.styleId).name} · QA ${compiled.audit.score}/100`;
    renderBuildResult(manifest);
    state.lastManifest=manifest;
   ['#playGenerated','#exportGenerated','#saveCloud'].forEach(q=>views.studio.querySelector(q).disabled=false);
 };

 views.studio.querySelector('#playGenerated').onclick=()=>studioProject&&launchManifest(studioProject.manifest);
 views.studio.querySelector('#exportGenerated').onclick=()=>studioProject&&exportPLX(studioProject);
 views.studio.querySelector('#saveCloud').onclick=async()=>{
   if(!studioProject)return;
   const r=await saveProjectToSupabase(studioProject);
   views.studio.querySelector('#buildStatus').textContent=r.ok?'Saved to Supabase.':`Cloud save: ${r.reason}`;
 };
}

function renderCustomControls(){
 const box=views.studio.querySelector('#customControls'); if(!box)return;
 box.innerHTML=state.mode==='custom'?`
   <h3>7 · Custom Source Control</h3>
   <div class="checkGrid">
     <label><input type="checkbox" id="useSubject" checked> Base character on uploaded subject</label>
     <label><input type="checkbox" id="useEnvironment" checked> Base environment on uploaded setting</label>
     <label><input type="checkbox" id="useObjects" checked> Derive game objects from upload theme</label>
     <label><input type="checkbox" id="usePalette" checked> Preserve source palette / Style DNA</label>
   </div>
   <label class="fieldLabel">Character treatment
     <select id="characterSource"><option value="photo">Photo composite</option><option value="illustrated">Illustrated hero</option></select>
   </label>`:`<div class="controls">AI Generated mode makes the art/gameplay decisions. Choose the PLX foundation only if you want to constrain the result.</div>`;
}

function renderBuildResult(manifest){
  // Simple build result overlay
  views.studio.innerHTML=`
  <div class="top"><div><div class="pill">BUILD COMPLETE</div><h1>${manifest.title}</h1><p class="softPill">${manifest.engine.toUpperCase()} • ${manifest.visualStyle ? getStyle(manifest.visualStyle).name : ''}</p></div></div>
  <div class="playerShell">
    <div class="sidepanel">
      <h3>Progress</h3>
      <ul class="buildProgress">
        <li class="done">Reading your world</li>
        <li class="done">Casting the player</li>
        <li class="done">Separating the environment</li>
        <li class="inProgress">Building game art</li>
        <li>Designing gameplay</li>
        <li>Adding the fun</li>
        <li>Playtesting</li>
        <li>Polishing</li>
      </ul>
      <div class="assetPreview"><div class="thumbGrid">${Object.entries(manifest.assets.images||{}).map(([k,v])=>`<figure><img src="${v}" alt="${k}"><figcaption>${k}</figcaption></figure>`).join('')}</div></div>
    </div>
    <aside class="sidepanel">
      <button class="btn primary" id="playBtn">▶ PLAY</button>
      <button class="btn ghost" id="remixBtn">REMIX</button>
      <button class="btn ghost" id="editBtn">KEEP EDITING</button>
      <button class="btn ghost" id="publishBtn">PUBLISH</button>
    </aside>
  </div>`;
  // Bind actions
  const studio = views.studio;
  studio.querySelector('#playBtn').onclick=()=>{launchManifest(manifest);};
  studio.querySelector('#remixBtn').onclick=()=>{show('studio');};
  studio.querySelector('#editBtn').onclick=()=>{show('studio');};
  studio.querySelector('#publishBtn').onclick=()=>{alert('Export PLX');};
}


function syncChosenEngine(){
 const sel=views.studio.querySelector('#engineSelect');
 if(sel && chosenEngine) sel.value=chosenEngine;
}

function readOptions(){
 const styleId=views.studio.querySelector('.styleCard.active')?.dataset.style || 'cinematic-photo';
 const style=getStyle(styleId);
 return {
   mode:state.mode,
   selectedEngine:views.studio.querySelector('#engineSelect')?.value || chosenEngine || '',
   styleId,styleName:style.name,
   overlayId:views.studio.querySelector('#overlaySelect')?.value || style.overlay,
   characterSource:views.studio.querySelector('#characterSource')?.value || (style.artMode==='photo'?'photo':'illustrated'),
   useSubject:state.mode==='custom' ? checked('#useSubject') : true,
   useEnvironment:state.mode==='custom' ? checked('#useEnvironment') : true,
   useObjects:state.mode==='custom' ? checked('#useObjects') : true,
   usePalette:state.mode==='custom' ? checked('#usePalette') : true,
   airportHint:/airport|plane|jet|runway|flight|boarding/.test(views.studio.querySelector('#prompt')?.value.toLowerCase()||'')
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
