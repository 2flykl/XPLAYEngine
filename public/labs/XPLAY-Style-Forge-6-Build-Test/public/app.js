
const $=s=>document.querySelector(s);
let packet=null,blueprint=null,styles={},cacheState={};
const runtime={};

async function fetchJson(url,opts={}){
  const r=await fetch(url,opts); const t=await r.text(); let j;
  try{j=JSON.parse(t)}catch{throw new Error(`Non-JSON from server (${r.status}): ${t.slice(0,160)}`)}
  if(!r.ok||!j.ok)throw new Error(j.error||`Request failed ${r.status}`); return j;
}
async function loadCheckpoint(){
  const j=await fetchJson('/api/checkpoint');
  packet=j.packet; blueprint=j.blueprint;
  $('#packetOut').textContent=JSON.stringify(packet,null,2);
  $('#blueprintOut').textContent=JSON.stringify(blueprint,null,2);
}
async function loadStyles(){
  const j=await fetchJson('/api/styles'); styles=j.styles; renderStyles();
}
async function refreshCache(){
  const j=await fetchJson('/api/cache'); cacheState=j.state; applyCache();
}
$('#health').onclick=async()=>{try{alert(JSON.stringify(await fetchJson('/api/health'),null,2))}catch(e){alert(e.message)}};
$('#checkpoint').onclick=()=>loadCheckpoint().catch(e=>alert(e.message));
$('#cacheState').onclick=()=>refreshCache().catch(e=>alert(e.message));

function renderStyles(){
  const grid=$('#styleGrid'); grid.innerHTML='';
  for(const [id,s] of Object.entries(styles)){
    const card=document.createElement('article'); card.className='style-card'; card.dataset.style=id;
    card.innerHTML=`
      <h3>${s.label}</h3>
      <div class="desc">${s.description}</div>
      <div class="status" id="${id}_status">${id==='64bit'?'master checkpoint ready':'not generated'}</div>
      <div class="controls">
        <button data-gen="${id}" data-kind="stage">Stage</button>
        <button data-gen="${id}" data-kind="player">Player</button>
        <button data-gen="${id}" data-kind="enemies">Enemies</button>
        <button data-genall="${id}">Generate Missing</button>
        <button data-build="${id}" class="secondary">Build Playable</button>
        <button data-clear="${id}" class="warn">Clear Cache</button>
      </div>
      <div class="assets">
        <div class="assetBox"><h4>Stage</h4><img id="${id}_stage"/></div>
        <div class="assetBox"><h4>Player</h4><img id="${id}_player" class="sprite"/></div>
        <div class="assetBox"><h4>Enemies</h4><img id="${id}_enemies" class="sprite"/></div>
      </div>
      <canvas id="${id}_canvas" width="960" height="540"></canvas>
      <div class="legend">A/D or arrows move · W/S depth · Space attacks · each style uses the same canonical packet and frame layout</div>`;
    grid.appendChild(card);
  }
  document.querySelectorAll('[data-gen]').forEach(b=>b.onclick=()=>generate(b.dataset.gen,b.dataset.kind,b));
  document.querySelectorAll('[data-genall]').forEach(b=>b.onclick=()=>generateMissing(b.dataset.gen,b));
  document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>buildPlayable(b.dataset.build));
  document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>clearStyle(b.dataset.clear));
}
function masterUrl(kind){return kind==='stage'?'/master/stage.png':kind==='player'?'/master/alex-sheet.png':'/master/enemy-atlas.png'}
function applyCache(){
  for(const id of Object.keys(styles)){
    let count=0;
    for(const kind of ['stage','player','enemies']){
      let url=cacheState?.[id]?.[kind];
      if(id==='64bit'&&!url)url=masterUrl(kind);
      const img=document.getElementById(`${id}_${kind}`);
      if(img&&url){img.src=url;count++}
    }
    const st=document.getElementById(`${id}_status`);
    if(st)st.textContent=count===3?(id==='64bit'?'master/cached ready':'3/3 cached'):`${count}/3 ready`;
  }
}
async function generate(style,kind,btn,force=false){
  try{
    btn.disabled=true; const old=btn.textContent; btn.textContent='Working…';
    const j=await fetchJson(`/api/generate/${style}/${kind}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({force})});
    document.getElementById(`${style}_${kind}`).src=j.url;
    await refreshCache();
    if(j.source==='openai') alert(`${styles[style].label} ${kind} generated and saved to local cache.`);
    btn.textContent=old;
  }catch(e){alert(e.message)}finally{btn.disabled=false}
}
async function generateMissing(style,btn){
  try{
    btn.disabled=true;btn.textContent='Generating missing…';
    for(const kind of ['stage','player','enemies']){
      const existing=cacheState?.[style]?.[kind] || (style==='64bit'?masterUrl(kind):null);
      if(!existing){
        const j=await fetchJson(`/api/generate/${style}/${kind}`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
        document.getElementById(`${style}_${kind}`).src=j.url;
        await refreshCache();
      }
    }
  }catch(e){alert(e.message)}finally{btn.disabled=false;btn.textContent='Generate Missing'}
}
async function clearStyle(style){
  if(style==='64bit'){alert('64-bit master checkpoint is built in. Clearing cache will not remove the canonical master assets.')}
  try{await fetchJson(`/api/cache/clear/${style}`,{method:'POST'}); await refreshCache()}catch(e){alert(e.message)}
}

const keys={};
window.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key===' ')e.preventDefault()});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});

function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}
async function buildPlayable(style){
  if(!blueprint)await loadCheckpoint();
  try{
    const stageSrc=document.getElementById(`${style}_stage`).src;
    const playerSrc=document.getElementById(`${style}_player`).src;
    const enemySrc=document.getElementById(`${style}_enemies`).src;
    if(!stageSrc||!playerSrc||!enemySrc)throw new Error('Generate or load all three assets for this style first.');
    const stage=await loadImg(stageSrc),player=await loadImg(playerSrc),enemiesImg=await loadImg(enemySrc);
    const canvas=document.getElementById(`${style}_canvas`),ctx=canvas.getContext('2d');
    runtime[style]={canvas,ctx,stage,player,enemiesImg,last:performance.now(),cam:0,time:20,
      p:{x:260,y:390,hp:160,maxHp:160,state:'idle',face:1,attack:0,hitDone:false,hurt:0},
      enemies:blueprint.enemies.map((e,i)=>({x:640+i*210,y:390+(i%2)*18,hp:e.hp,maxHp:e.hp,row:i,state:'idle',hurt:0,attack:0,cd:i*.25,dead:false,face:-1}))};
    requestAnimationFrame(ts=>loop(style,ts));
  }catch(e){alert(e.message)}
}
function loop(style,ts){
  const g=runtime[style];if(!g)return;
  const dt=Math.min(.033,(ts-g.last)/1000||.016);g.last=ts;update(g,dt);draw(g);
  if(!(g.win||g.lose))requestAnimationFrame(t=>loop(style,t));
}
function update(g,dt){
  const p=g.p;g.time-=dt;p.attack=Math.max(0,p.attack-dt);p.hurt=Math.max(0,p.hurt-dt);
  let mx=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0);
  let my=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);
  if(mx)p.face=mx>0?1:-1;
  if((keys[' ']||keys['space'])&&p.attack<=0&&p.hurt<=0){p.attack=.30;p.hitDone=false;p.state='attack'}
  if(p.hurt>0)p.state='hurt';
  else if(p.attack>0){
    p.state='attack';
    if(!p.hitDone&&p.attack<.16){
      const hx=p.x+p.face*70;
      g.enemies.forEach(e=>{if(!e.dead&&Math.abs(e.x-hx)<100&&Math.abs(e.y-p.y)<48){e.hp=Math.max(0,e.hp-30);e.hurt=.25;e.state='hurt';e.x+=p.face*24;if(e.hp<=0)e.dead=true}});
      p.hitDone=true;
    }
  }else{
    p.x+=mx*185*dt;p.y+=my*100*dt;p.x=Math.max(50,Math.min(2750,p.x));p.y=Math.max(340,Math.min(430,p.y));p.state=(mx||my)?'walk':'idle'
  }
  g.enemies.forEach(e=>{
    if(e.dead)return;e.hurt=Math.max(0,e.hurt-dt);e.attack=Math.max(0,e.attack-dt);e.cd=Math.max(0,e.cd-dt);
    const dx=p.x-e.x,dy=p.y-e.y;
    if(e.hurt>0){e.state='hurt';return}
    if(e.attack>0){e.state='attack';if(e.attack<.16&&Math.abs(dx)<78&&Math.abs(dy)<45){if(p.hurt<=0){p.hp=Math.max(0,p.hp-8);p.hurt=.2}}return}
    if(Math.hypot(dx,dy)>82){e.x+=Math.sign(dx)*75*dt;e.y+=Math.sign(dy)*35*dt;e.state='walk';e.face=dx>0?1:-1}
    else if(e.cd<=0){e.attack=.34;e.cd=.75+Math.random()*.35;e.state='attack'}else e.state='idle'
  });
  const desired=Math.max(0,Math.min(1840,p.x-340+p.face*100));g.cam+=(desired-g.cam)*Math.min(1,dt*6);
  if(g.enemies.every(e=>e.dead)){g.win=true;p.state='victory'}if(p.hp<=0||g.time<=0)g.lose=!g.win
}
function draw(g){
  const {ctx}=g;ctx.clearRect(0,0,960,540);
  const aspect=g.stage.width/g.stage.height,drawW=540*aspect;
  for(let x=-g.cam%drawW-drawW;x<960+drawW;x+=drawW)ctx.drawImage(g.stage,x,0,drawW,540);
  const actors=[...g.enemies.filter(e=>!e.dead),g.p].sort((a,b)=>a.y-b.y);
  actors.forEach(a=>a===g.p?drawPlayer(g,a):drawEnemy(g,a));
  ctx.fillStyle='rgba(0,0,0,.88)';ctx.fillRect(0,0,960,62);ctx.fillStyle='#fff';ctx.font='bold 20px Arial';ctx.fillText('ALEX',50,24);
  ctx.fillStyle='#2b210e';ctx.fillRect(50,34,180,14);ctx.fillStyle='#e7b93c';ctx.fillRect(50,34,180*(g.p.hp/g.p.maxHp),14);
  ctx.fillStyle='#efb22c';ctx.font='bold 46px Arial';ctx.fillText(String(Math.max(0,Math.ceil(g.time))).padStart(2,'0'),460,48);
  ctx.fillStyle='rgba(0,0,0,.85)';ctx.fillRect(0,500,960,40);ctx.fillStyle='#fff';ctx.font='bold 16px Arial';ctx.fillText('STAGE 3-1',430,526);
  if(g.win||g.lose){ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,62,960,438);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 58px Arial';ctx.fillText(g.win?'STAGE CLEAR':'FAILED',480,275);ctx.textAlign='left'}
}
function frame(ctx,img,cols,rows,col,row,x,y,w,h,face){
  const fw=img.width/cols,fh=img.height/rows;ctx.save();ctx.translate(x-gCurrentCam,0);ctx.scale(face,1);
  ctx.drawImage(img,col*fw,row*fh,fw,fh,-w/2,-h+y+10,w,h);ctx.restore();
}
let gCurrentCam=0;
function drawPlayer(g,p){
  gCurrentCam=g.cam;let col=0,row=0;if(p.state==='walk')col=1+(Math.floor(performance.now()/140)%3);if(p.state==='attack'){row=1;col=p.attack>.15?0:1}if(p.state==='hurt'){row=1;col=2}if(p.state==='victory'){row=1;col=3}
  drawShadow(g.ctx,p.x-g.cam,p.y);drawFrame(g.ctx,g.player,4,2,col,row,p.x-g.cam,p.y,150,170,p.face)
}
function drawEnemy(g,e){
  let col={idle:0,walk:1,attack:2,hurt:3}[e.state]??0;drawShadow(g.ctx,e.x-g.cam,e.y);drawFrame(g.ctx,g.enemiesImg,4,3,col,e.row,e.x-g.cam,e.y,140,158,e.face);
  g.ctx.fillStyle='#151515';g.ctx.fillRect(e.x-g.cam-40,e.y+18,80,7);g.ctx.fillStyle='#e34d4d';g.ctx.fillRect(e.x-g.cam-40,e.y+18,80*(e.hp/e.maxHp),7)
}
function drawFrame(ctx,img,cols,rows,col,row,x,y,w,h,face){
  const fw=img.width/cols,fh=img.height/rows;ctx.save();ctx.translate(x,y);ctx.scale(face,1);ctx.drawImage(img,col*fw,row*fh,fw,fh,-w/2,-h+12,w,h);ctx.restore()
}
function drawShadow(ctx,x,y){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+8,30,8,0,0,Math.PI*2);ctx.fill()}
Promise.all([loadCheckpoint(),loadStyles()]).then(refreshCache).catch(e=>alert(e.message));
