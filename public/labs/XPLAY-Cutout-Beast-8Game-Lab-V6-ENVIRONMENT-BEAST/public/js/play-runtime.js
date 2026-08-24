
const qs=new URLSearchParams(location.search), gameId=qs.get('game');
const c=document.getElementById('c'),ctx=c.getContext('2d');
let M=null, stage=null, playerImg=null, oppImgs=[], compImg=null, envChunks=[], envFar=[], keys={}, mouse={x:0,y:0,down:false};
let start=performance.now(), last=start, ended=false;
let camera={x:0,y:0,shake:0};

function fit(){c.width=Math.floor(c.clientWidth*devicePixelRatio);c.height=Math.floor(c.clientHeight*devicePixelRatio)}
addEventListener('resize',fit);fit();
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();mouse.x=(e.clientX-r.left)*devicePixelRatio;mouse.y=(e.clientY-r.top)*devicePixelRatio});
c.addEventListener('mousedown',()=>mouse.down=true);c.addEventListener('mouseup',()=>mouse.down=false);

async function img(src){const im=new Image();im.src=src;await im.decode();return im}

async function boot(){
 const r=await fetch(`/api/play-manifest/${gameId}`),j=await r.json();
 if(!r.ok||!j.ok){document.body.innerHTML=`<pre>${j.error||r.statusText}</pre>`;return}
 M=j.manifest;
 document.getElementById('title').textContent=M.title;
 document.getElementById('genre').textContent=`${M.genre} · ${M.style}`;
 document.getElementById('help').innerHTML='<b>Controls:</b> '+Object.entries(M.controls).map(([k,v])=>`${k}: ${v}`).join(' · ');

 stage=await img(M.stage);
 playerImg=await img(M.player.atlas);
 for(const o of M.opponents)oppImgs.push(await img(o.atlas));
 if(M.complementary?.atlas){try{compImg=await img(M.complementary.atlas)}catch{}}

 if(M.environment?.chunks?.length){
   for(const ch of M.environment.chunks){
     envChunks.push(await img(ch.url));
     envFar.push(await img(ch.farUrl));
   }
 }
 init();
 requestAnimationFrame(loop);
}

function frameRect(actor,idx){
 const m=actor.map,col=idx%m.cols,row=Math.floor(idx/m.cols);
 return {sx:m.gutter+col*(m.cell+m.gutter),sy:m.gutter+row*(m.cell+m.gutter),sw:m.cell,sh:m.cell};
}
function compRect(idx){
 if(!M.complementary)return null;
 const m=M.complementary.map,col=idx%m.cols,row=Math.floor(idx/m.cols);
 return {sx:m.gutter+col*(m.cell+m.gutter),sy:m.gutter+row*(m.cell+m.gutter),sw:m.cell,sh:m.cell};
}
const S={};

function init(){
 const W=c.width,H=c.height;
 const worldW=M.environment?.worldWidth || W*1.8;
 const worldH=M.environment?.worldHeight || H;
 S.p={x:worldW*.08,y:worldH*.68,hp:100,energy:100,score:0,state:0,vx:0,vy:0,cool:0};
 S.enemies=[];
 const spawnList=M.environment?.spawnPoints || [];
 if(spawnList.length){
   spawnList.forEach((sp,i)=>S.enemies.push({x:sp.x,y:sp.y,hp:70,actor:i%Math.max(1,M.opponents.length),state:0,cool:0}));
 } else {
   for(let i=0;i<4;i++)S.enemies.push({x:worldW*(.36+.14*(i%4)),y:worldH*(.62+.04*(i%2)),hp:70,actor:i%Math.max(1,M.opponents.length),state:0,cool:0});
 }
 S.progress=0;S.tasks=0;S.combo=0;S.lane=1;S.speed=0;S.distance=0;S.notes=[];S.spawn=0;S.fear=0;S.objective='Begin';
 S.worldW=worldW;S.worldH=worldH;
 camera.x=0;camera.y=0;
}

function worldToScreen(x,y){return {x:x-camera.x,y:y-camera.y}}

function updateCamera(dt){
 const W=c.width,H=c.height;
 const env=M.environment;
 if(!env){
   camera.x=0;camera.y=0;return;
 }
 const maxX=Math.max(0,env.worldWidth-W);
 const maxY=Math.max(0,env.worldHeight-H);
 let targetX=Math.max(0,Math.min(maxX,S.p.x-W*.32));
 let targetY=Math.max(0,Math.min(maxY,S.p.y-H*.66));

 if(M.runtime==='racing'){
   targetX=Math.max(0,Math.min(maxX,S.distance*.28));
   targetY=0;
 }
 if(M.runtime==='rhythm'){
   targetX=Math.max(0,Math.min(maxX,((performance.now()-start)/1000)*35));
   targetY=0;
 }
 camera.x += (targetX-camera.x)*Math.min(1,dt*4.5);
 camera.y += (targetY-camera.y)*Math.min(1,dt*3.5);
}

function drawWorld(){
 const W=c.width,H=c.height;
 if(!M.environment || !envChunks.length){
   const ar=stage.width/stage.height,cr=W/H;let dw,dh,dx,dy;
   if(ar>cr){dh=H;dw=dh*ar;dx=-(camera.x*.2%(Math.max(1,dw-W)));dy=0}else{dw=W;dh=dw/ar;dx=0;dy=(H-dh)/2}
   ctx.globalAlpha=.96;ctx.drawImage(stage,dx,dy,dw,dh);ctx.globalAlpha=1;
   return;
 }
 const env=M.environment;
 const chunkW=env.chunkWidth;

 // Far parallax layer
 for(let i=0;i<envFar.length;i++){
   const x=i*chunkW-camera.x*.20;
   const drawW=chunkW*1.08;
   ctx.globalAlpha=.72;
   ctx.drawImage(envFar[i],x,-camera.y*.06,drawW,H*1.05);
 }
 ctx.globalAlpha=1;

 // Main traversable world
 for(let i=0;i<envChunks.length;i++){
   const x=i*chunkW-camera.x;
   if(x>W || x+chunkW<0)continue;
   ctx.drawImage(envChunks[i],x,-camera.y,chunkW,Math.max(H,env.worldHeight));
 }

 // Atmospheric depth veil
 const grad=ctx.createLinearGradient(0,0,0,H);
 grad.addColorStop(0,'rgba(10,18,28,.05)');
 grad.addColorStop(1,'rgba(0,0,0,.16)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
}

function drawActor(im,actor,wx,wy,state=0,scale=.23,flip=false){
 const p=worldToScreen(wx,wy),r=frameRect(actor,state%actor.map.states.length),size=Math.min(c.width,c.height)*scale;
 if(p.x<-size||p.x>c.width+size||p.y<-size||p.y>c.height+size)return;
 ctx.save();ctx.translate(p.x,p.y);if(flip)ctx.scale(-1,1);
 ctx.drawImage(im,r.sx,r.sy,r.sw,r.sh,-size/2,-size,size,size);ctx.restore();
}

function drawComplementary(){
 if(!compImg||!M.complementary)return;
 const props=M.environment?.obstacles || [];
 const m=M.complementary.map;
 props.slice(0,8).forEach((o,i)=>{
   const p=worldToScreen(o.x,o.y);
   const r=compRect(i%m.states.length); if(!r)return;
   const size=Math.min(c.width,c.height)*.10;
   if(p.x<-size||p.x>c.width+size)return;
   ctx.drawImage(compImg,r.sx,r.sy,r.sw,r.sh,p.x-size/2,p.y-size,size,size);
 });
}

function hud(t){
 const p=S.p;
 ctx.fillStyle='#08111ddd';ctx.fillRect(18,18,Math.min(360,c.width*.34),72);
 ctx.fillStyle='#fff';ctx.font=`${18*devicePixelRatio}px system-ui`;ctx.fillText(M.player.name,32,45);
 ctx.fillStyle='#1c2c38';ctx.fillRect(32,55,220,14);ctx.fillStyle='#ffd44d';ctx.fillRect(32,55,220*p.hp/100,14);
 ctx.fillStyle='#fff';ctx.font=`${14*devicePixelRatio}px system-ui`;ctx.fillText(`SCORE ${Math.floor(p.score)}  ·  ${S.objective}`,32,88);
 const worldInfo=M.environment?` · WORLD ${Math.floor(camera.x)}/${M.environment.worldWidth}`:' · STATIC FALLBACK';
 document.getElementById('status').textContent=`${Math.max(0,Math.ceil(M.targetSeconds-t))}s · ${M.runtime.toUpperCase()}${worldInfo}`;
}

function movePlayer(dt,speed=320){
 const p=S.p;
 if(keys['a']||keys['arrowleft'])p.x-=speed*dt;if(keys['d']||keys['arrowright'])p.x+=speed*dt;
 if(keys['w']||keys['arrowup'])p.y-=speed*.55*dt;if(keys['s']||keys['arrowdown'])p.y+=speed*.55*dt;
 p.x=Math.max(40,Math.min(S.worldW-40,p.x));
 p.y=Math.max(S.worldH*.34,Math.min(S.worldH*.90,p.y));
}

function brawler(dt){
 movePlayer(dt);const p=S.p;p.cool-=dt;const attack=(keys['j']||keys[' ']||keys['k'])&&p.cool<=0;
 p.state=attack?4:((keys.a||keys.d)?1:0);if(attack)p.cool=.38;
 for(const e of S.enemies){if(e.hp<=0)continue;const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(d>95){e.x+=Math.sign(dx)*75*dt;e.y+=Math.sign(dy)*45*dt;e.state=1}else e.state=2;
  if(attack&&d<145){e.hp-=34;e.x-=Math.sign(dx)*26;p.score+=120;S.combo++}
  if(d<82&&e.cool<=0){p.hp-=7;e.cool=.8}e.cool-=dt;}
 S.enemies=S.enemies.filter(e=>e.hp>0);
 if(!S.enemies.length){S.tasks++;S.objective=`Advance to zone ${Math.min(3,S.tasks+1)}`;const nx=Math.min(S.worldW-250,p.x+900);for(let i=0;i<4;i++)S.enemies.push({x:nx+i*90,y:S.worldH*(.60+.05*(i%2)),hp:75+S.tasks*10,actor:i%Math.max(1,M.opponents.length),state:0,cool:0})}
 drawActor(playerImg,M.player,p.x,p.y,p.state,.23);S.enemies.forEach(e=>drawActor(oppImgs[e.actor]||playerImg,M.opponents[e.actor]||M.player,e.x,e.y,e.state,.20,true));
}

function shooter(dt){
 movePlayer(dt,300);const p=S.p;p.cool-=dt;const fire=(mouse.down||keys[' '])&&p.cool<=0;if(fire){p.cool=.16;p.state=3}else p.state=(keys['w']||keys['a']||keys['s']||keys['d'])?1:2;
 for(const e of S.enemies){if(e.hp<=0)continue;const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(d>260){e.x+=Math.sign(dx)*55*dt;e.y+=Math.sign(dy)*25*dt}if(fire&&d<620){e.hp-=22;p.score+=90}if(d<220&&e.cool<=0){p.hp-=5;e.cool=1}e.cool-=dt}
 S.enemies=S.enemies.filter(e=>e.hp>0);
 if(!S.enemies.length&&S.tasks<3){S.tasks++;const x=Math.min(S.worldW-500,p.x+1000);for(let i=0;i<4+S.tasks;i++)S.enemies.push({x:x+i*110,y:S.worldH*(.56+.05*(i%3)),hp:75,actor:i%Math.max(1,M.opponents.length),state:0,cool:0});S.objective=S.tasks===3?'Reach extraction':'Push to next street sector'}
 drawActor(playerImg,M.player,p.x,p.y,p.state,.22);S.enemies.forEach(e=>{const sp=worldToScreen(e.x,e.y);ctx.fillStyle='#ff5d5d';ctx.fillRect(sp.x-35,sp.y-92,70*e.hp/75,5);drawActor(oppImgs[e.actor]||playerImg,M.opponents[e.actor]||M.player,e.x,e.y,1,.18,true)});
}

function lifesim(dt){
 movePlayer(dt,240);const p=S.p;p.state=(keys['w']||keys['a']||keys['s']||keys['d']||keys['arrowleft']||keys['arrowright'])?1:0;
 if((keys['e']||keys[' '])&&p.cool<=0){p.cool=.6;S.tasks=Math.min(6,S.tasks+1);p.score+=100;S.objective=['Harvest crops','Deliver bread','Repair lantern','Meet villagers','Return to bakery','Evening complete'][Math.min(5,S.tasks)]}
 p.cool-=dt;drawActor(playerImg,M.player,p.x,p.y,p.state,.20);
 M.opponents.forEach((a,i)=>drawActor(oppImgs[i],a,S.worldW*(.35+.24*(i%2)),S.worldH*(.56+.12*(i%2)),0,.17,true));
}

function horror(dt){
 movePlayer(dt,230);const p=S.p;S.fear+=dt*.8;p.state=0;if(keys['shift'])p.energy=Math.max(0,p.energy-22*dt);else p.energy=Math.min(100,p.energy+10*dt);
 const stalk=M.opponents[0];if(stalk&&oppImgs[0]){const ex=Math.min(S.worldW-200,p.x+700-Math.min(500,S.fear*8)),ey=S.worldH*.68;drawActor(oppImgs[0],stalk,ex,ey,Math.min(3,Math.floor(S.fear/12)),.18,true);if(Math.abs(p.x-ex)<120)p.hp-=10*dt}
 if((keys['e']||keys['f'])&&p.cool<=0){p.cool=.7;S.tasks++;S.objective=S.tasks<3?'Search next clue':'Escape the motel';p.score+=150}p.cool-=dt;drawActor(playerImg,M.player,p.x,p.y,p.state,.16);
}

function rpg(dt){
 movePlayer(dt,300);const p=S.p;p.cool-=dt;const hit=(keys['j']||keys['k']||keys['e'])&&p.cool<=0;if(hit){p.cool=.32;p.state=3}else p.state=(keys['w']||keys['a']||keys['s']||keys['d'])?1:0;
 for(const e of S.enemies){const d=Math.hypot(p.x-e.x,p.y-e.y);if(d>130)e.x+=Math.sign(p.x-e.x)*60*dt;if(hit&&d<175){e.hp-=28;p.score+=130}if(d<100&&e.cool<=0){p.hp-=8;e.cool=.9}e.cool-=dt}
 S.enemies=S.enemies.filter(e=>e.hp>0);
 if(!S.enemies.length&&S.tasks<3){S.tasks++;const x=Math.min(S.worldW-500,p.x+900);for(let i=0;i<3+S.tasks;i++)S.enemies.push({x:x+i*100,y:S.worldH*(.58+.04*(i%2)),hp:80+S.tasks*30,actor:0,state:0,cool:0});S.objective=S.tasks===3?'Defeat guardian':'Reach next crystal zone'}
 drawActor(playerImg,M.player,p.x,p.y,p.state,.21);S.enemies.forEach(e=>drawActor(oppImgs[0]||playerImg,M.opponents[0]||M.player,e.x,e.y,1,.18,true));
}

function racing(dt){
 const p=S.p;const accel=keys['w']||keys['arrowup'];const brake=keys['s']||keys['arrowdown'];
 p.vx+=(accel?420:-100)*dt;p.vx=Math.max(80,Math.min(720,p.vx));if(brake)p.vx=Math.max(60,p.vx-480*dt);if(keys[' '])p.vx=Math.min(900,p.vx+280*dt);
 if(keys['a']||keys['arrowleft'])p.y-=260*dt;if(keys['d']||keys['arrowright'])p.y+=260*dt;
 p.y=Math.max(S.worldH*.50,Math.min(S.worldH*.78,p.y));
 S.distance+=p.vx*dt;p.x=Math.min(S.worldW-200,S.distance*.42+300);p.score=S.distance;
 drawActor(playerImg,M.player,p.x,p.y,(keys['a']?1:keys['d']?2:keys[' ']?3:0),.20);
 M.opponents.forEach((a,i)=>drawActor(oppImgs[i],a,p.x+520+i*260,S.worldH*(.58+.05*i),3,.13,true));
 S.objective=S.distance<5000?'Sector 1':S.distance<11000?'Sector 2':'Final sprint';
}

function rhythm(dt){
 const now=(performance.now()-start)/1000;S.spawn-=dt;if(S.spawn<=0){S.spawn=.48;S.notes.push({lane:Math.floor(Math.random()*4),y:c.height*.25,hit:false})}
 const xs=[.36,.46,.56,.66].map(v=>c.width*v),line=c.height*.82;ctx.strokeStyle='#66d8ff';ctx.lineWidth=2;xs.forEach(x=>{ctx.beginPath();ctx.moveTo(x,c.height*.25);ctx.lineTo(x,line);ctx.stroke()});
 const buttons=['d','f','j','k'];for(const n of S.notes){n.y+=310*dt;const x=xs[n.lane];ctx.fillStyle='#ff4bea';ctx.beginPath();ctx.arc(x,n.y,20*devicePixelRatio,0,Math.PI*2);ctx.fill();if(Math.abs(n.y-line)<46&&keys[buttons[n.lane]]&&!n.hit){n.hit=true;S.combo++;S.p.score+=100+S.combo*5}}
 S.notes=S.notes.filter(n=>!n.hit&&n.y<c.height*.94);S.objective=`Combo ${S.combo}`;S.p.x=Math.min(S.worldW-300,400+now*55);
 drawActor(playerImg,M.player,S.p.x,S.worldH*.70,Math.min(5,S.combo%6),.23);if(M.opponents[0])drawActor(oppImgs[0],M.opponents[0],S.p.x+900,S.worldH*.68,Math.floor(now)%4,.22,true);
}

function adventure(dt){
 movePlayer(dt,290);const p=S.p;p.state=(keys['w']||keys['a']||keys['s']||keys['d'])?1:0;p.cool-=dt;
 if((keys['e']||keys['j'])&&p.cool<=0){p.cool=.6;S.tasks++;p.score+=180;S.objective=S.tasks<3?'Activate next mechanism':'Reach the locomotive'}
 drawActor(playerImg,M.player,p.x,p.y,p.state,.20);
 if(M.opponents[0])for(const e of S.enemies.slice(0,4)){e.x+=Math.sign(p.x-e.x)*35*dt;drawActor(oppImgs[0],M.opponents[0],e.x,e.y,1,.13,true)}
}

function loop(now){
 if(!M)return;
 const dt=Math.min(.033,(now-last)/1000);last=now;const t=(now-start)/1000;
 updateCamera(dt);drawWorld();drawComplementary();
 if(M.runtime==='brawler')brawler(dt);
 else if(M.runtime==='shooter')shooter(dt);
 else if(M.runtime==='lifesim')lifesim(dt);
 else if(M.runtime==='horror')horror(dt);
 else if(M.runtime==='rpg')rpg(dt);
 else if(M.runtime==='racing')racing(dt);
 else if(M.runtime==='rhythm')rhythm(dt);
 else adventure(dt);
 hud(t);
 if(t>=M.targetSeconds||S.p.hp<=0){
   ended=true;ctx.fillStyle='#000b';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`${54*devicePixelRatio}px system-ui`;ctx.fillText(S.p.hp<=0?'TRY AGAIN':'STAGE COMPLETE',c.width/2,c.height/2);ctx.font=`${20*devicePixelRatio}px system-ui`;ctx.fillText(`Score ${Math.floor(S.p.score)} · Reload page to replay`,c.width/2,c.height/2+55*devicePixelRatio);return;
 }
 requestAnimationFrame(loop);
}
boot();
