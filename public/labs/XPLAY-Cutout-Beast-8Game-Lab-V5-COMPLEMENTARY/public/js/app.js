
let games=[],current=null;const $=s=>document.querySelector(s);
const log=m=>{$('#log').textContent=`${new Date().toLocaleTimeString()}  ${m}\n`+$('#log').textContent};
async function j(u,o){const r=await fetch(u,o);const x=await r.json();if(!r.ok||x.ok===false)throw new Error(x.error||r.statusText);return x}
async function boot(){const h=await j('/api/health');$('#health').innerHTML=`<b>${h.openAIConfigured?'OpenAI READY':'OPENAI KEY MISSING'}</b><br>${h.model} · ${h.quality}<br>${h.mode}`;games=(await j('/api/games')).games;$('#games').innerHTML=games.map(g=>`<div class="game" data-id="${g.id}"><b>${g.title}</b><small>${g.genre}</small><small>${g.style}</small></div>`).join('');document.querySelectorAll('.game').forEach(e=>e.onclick=()=>select(e.dataset.id));select(games[0].id)}
function select(id){current=games.find(g=>g.id===id);document.querySelectorAll('.game').forEach(e=>e.classList.toggle('active',e.dataset.id===id));$('#source').src=`/assets/source/${current.id}.png`;$('#title').textContent=current.title;$('#genre').textContent=current.genre;$('#style').textContent=current.style;$('#duration').textContent=`Target ${current.targetSeconds}s`;$('#analysis').textContent=current.analysisPrompt;$('#actors').innerHTML=(current.actors||[]).map(a=>`<div class="actor"><div class="actorHead"><div><b>${a.name}</b> — ${a.role}<br><small>${a.states.length} states · ${a.sheet.columns}×${a.sheet.rows} sheet</small><br><small>${a.description}</small></div><button onclick="genSheet('${a.id}')">Generate ${a.name} sheet</button></div><div class="states">${a.states.map(s=>`<span class="state">${s}</span>`).join('')}</div></div>`).join('');refresh()}
async function genStage(){try{log('Generating clean stage…');const x=await j(`/api/generate-stage/${current.id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({force:$('#force').checked})});log(`${x.cached?'CACHE':'GENERATED'} stage`);refresh()}catch(e){log('ERROR '+e.message)}}
async function genSheet(id){try{log(`Generating sprite sheet: ${id}…`);const x=await j(`/api/generate-sheet/${current.id}/${id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({force:$('#force').checked})});log(`${x.cached?'CACHE':'GENERATED'} ${id} sheet · sliced/trimmed/repacked`);refresh()}catch(e){log('ERROR '+e.message)}}

async function genComplementary(){
  try{
    log(`Generating complementary support sheet for ${current.title}…`);
    const x=await j(`/api/generate-complementary/${current.id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({force:$('#force').checked})});
    log(`${x.cached?'CACHE':'GENERATED'} complementary sprite sheet · support assets / props / pickups`);
    refresh();
  }catch(e){log(`COMPLEMENTARY ERROR: ${e.message}`)}
}

async function refresh(){const x=await j(`/api/cache/${current.id}`);const pngs=x.files.filter(f=>f.endsWith('.png'));$('#gallery').innerHTML=pngs.length?pngs.map(f=>`<div class="card"><img src="/cache/${current.id}/${f}?t=${Date.now()}"><div class="meta">${f.replace('.png','')}</div></div>`).join(''):`<div class="note">No cached assets yet.</div>`}
async function buildPlay(){
  try{
    log(`Building playable: ${current.title}…`);
    const x=await j(`/api/build/${current.id}`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    log(`BUILT ${x.runtime} runtime · ${x.buildId}`);
    window.open(x.playUrl,'_blank');
  }catch(e){log(`BUILD ERROR: ${e.message}`)}
}
$('#stageBtn').onclick=genStage;$('#buildBtn').onclick=buildPlay;$('#compBtn').onclick=genComplementary;$('#refreshBtn').onclick=refresh;$('#proofBtn').onclick=async()=>{await genStage();if(current.actors?.[0])await genSheet(current.actors[0].id);if(current.actors?.[1])await genSheet(current.actors[1].id)};
boot();
