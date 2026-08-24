
let games=[],current=null;
const $=s=>document.querySelector(s);
const log=(m)=>{$('#log').textContent=`${new Date().toLocaleTimeString()}  ${m}\n`+$('#log').textContent};

async function j(url,opt){const r=await fetch(url,opt);const x=await r.json();if(!r.ok||x.ok===false)throw new Error(x.error||r.statusText);return x}
async function boot(){
  try{const h=await j('/api/health');$('#health').innerHTML=`<b>${h.openAIConfigured?'OpenAI READY':'OpenAI KEY MISSING'}</b><br>${h.model} · ${h.quality} quality`;}catch(e){$('#health').textContent=e.message}
  games=(await j('/api/games')).games;
  $('#games').innerHTML=games.map(g=>`<div class="game" data-id="${g.id}"><b>${g.title}</b><small>${g.genre}</small><small>${g.style}</small></div>`).join('');
  document.querySelectorAll('.game').forEach(el=>el.onclick=()=>select(el.dataset.id));
  select(games[0].id);
}
function select(id){
  current=games.find(g=>g.id===id);
  document.querySelectorAll('.game').forEach(x=>x.classList.toggle('active',x.dataset.id===id));
  $('#source').src=`/assets/source/${current.id}.png`;
  $('#title').textContent=current.title; $('#genre').textContent=current.genre; $('#style').textContent=current.style; $('#duration').textContent=`Target ${current.targetSeconds}s`;
  $('#analysis').textContent=current.analysisPrompt;
  $('#actors').innerHTML=(current.actors||[]).map(a=>`<div class="actor">
    <div class="actorHead"><div><b>${a.name}</b> — ${a.role}<br><small>${a.description}</small></div><button class="atlas" onclick="assemble('${a.id}')">Assemble atlas</button></div>
    <div class="states">${a.states.map(s=>`<button class="state" onclick="gen('${a.id}__${s}')">${s}</button>`).join('')}</div>
  </div>`).join('')+`<div class="actor"><div class="actorHead"><b>Props</b></div><div class="states">${(current.props||[]).map(p=>`<button class="state" onclick="gen('prop__${p}')">${p}</button>`).join('')}</div></div>`;
  refresh();
}
async function gen(assetId){
  const force=$('#force').checked;
  log(`Generating ${current.title} / ${assetId}${force?' (FORCED)':''}…`);
  try{
    const x=await j(`/api/generate/${current.id}/${assetId}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({force})});
    log(`${x.cached?'CACHE':'GENERATED'} ${assetId}${x.meta?.validation?` · validation ${x.meta.validation.pass?'PASS':'REVIEW'}`:''}`);
    refresh();
  }catch(e){log(`ERROR ${assetId}: ${e.message}`)}
}
async function assemble(actorId){
  try{const x=await j(`/api/assemble/${current.id}/${actorId}`,{method:'POST'});log(`Atlas assembled: ${actorId}`);refresh()}catch(e){log(`ATLAS ERROR: ${e.message}`)}
}
async function refresh(){
  const x=await j(`/api/cache/${current.id}`);
  const pngs=x.files.filter(f=>f.endsWith('.png'));
  $('#gallery').innerHTML=pngs.length?pngs.map(f=>{
    const label=f.replace('.png','');
    return `<div class="card"><img src="/cache/${current.id}/${f}?t=${Date.now()}"><div class="meta">${label}</div></div>`
  }).join(''):`<div class="note">No cached assets for this game yet. Start with the 3-call proof set.</div>`;
}
$('#stageBtn').onclick=()=>gen('stage');
$('#refreshBtn').onclick=refresh;
$('#proofBtn').onclick=async()=>{
  const first=current.actors?.[0], enemy=current.actors?.[1];
  const list=['stage'];
  if(first) list.push(`${first.id}__${first.states[0]}`);
  if(enemy) list.push(`${enemy.id}__${enemy.states[0]}`);
  for(const a of list) await gen(a);
};
boot();
