
const qs=new URLSearchParams(location.search), gameId=qs.get('game');
const c=document.getElementById('c'),ctx=c.getContext('2d');
let M=null, stage=null, playerImg=null, oppImgs=[], keys={}, mouse={x:0,y:0,down:false};
let start=performance.now(), last=start, ended=false;

function fit(){c.width=Math.floor(c.clientWidth*devicePixelRatio);c.height=Math.floor(c.clientHeight*devicePixelRatio)}
addEventListener('resize',fit);fit();
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();mouse.x=(e.clientX-r.left)*devicePixelRatio;mouse.y=(e.clientY-r.top)*devicePixelRatio});
c.addEventListener('mousedown',()=>mouse.down=true);c.addEventListener('mouseup',()=>mouse.down=false);

async function img(src){const im=new Image();im.src=src;await im.decode();return im}
async function boot(){
 const r=await fetch(`/api/play-manifest/${gameId}`),j=await r.json(); if(!r.ok||!j.ok){document.body.innerHTML=`<pre>${j.error||r.statusText}</pre>`;return}
 M=j.manifest;document.getElementById('title').textContent=M.title;document.getElementById('genre').textContent=`${M.genre} · ${M.style}`;
 document.getElementById('help').innerHTML='<b>Controls:</b> '+Object.entries(M.controls).map(([k,v])=>`${k}: ${v}`).join(' · ');
 stage=await img(M.stage);playerImg=await img(M.player.atlas);for(const o of M.opponents)oppImgs.push(await img(o.atlas));
 init();requestAnimationFrame(loop);
}
function frameRect(actor,idx){
 const m=actor.map, col=idx%m.cols,row=Math.floor(idx/m.cols);
 return {sx:m.gutter+col*(m.cell+m.gutter),sy:m.gutter+row*(m.cell+m.gutter),sw:m.cell,sh:m.cell};
}
const S={};
function init(){
 const W=c.width,H=c.height;
 S.p={x:W*.24,y:H*.72,hp:100,energy:100,score:0,state:0,vx:0,vy:0,cool:0};
 S.enemies=[];
 for(let i=0;i<Math.max(3,M.opponents.length?4:3);i++)S.enemies.push({x:W*(.58+.1*(i%3)),y:H*(.65+.08*(i%2)),hp:70,actor:i%Math.max(1,M.opponents.length),state:0,cool:0});
 S.progress=0;S.tasks=0;S.combo=0;S.lane=1;S.speed=0;S.distance=0;S.notes=[];S.spawn=0;S.fear=0;S.objective='Begin';
}
function drawBg(){
 const W=c.width,H=c.height;
 const ar=stage.width/stage.height,cr=W/H;let dw,dh,dx,dy;
 if(ar>cr){dh=H;dw=dh*ar;dx=-(S.progress%(Math.max(1,dw-W)));dy=0}else{dw=W;dh=dw/ar;dx=0;dy=(H-dh)/2}
 ctx.globalAlpha=.92;ctx.drawImage(stage,dx,dy,dw,dh);ctx.globalAlpha=1;
 ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(0,0,W,H);
}
function drawActor(im,actor,x,y,state=0,scale=.23,flip=false){
 const r=frameRect(actor,state%actor.map.states.length),size=Math.min(c.width,c.height)*scale;
 ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
 ctx.drawImage(im,r.sx,r.sy,r.sw,r.sh,-size/2,-size,size,size);ctx.restore();
}
function hud(t){
 const W=c.width,H=c.height,p=S.p;
 ctx.fillStyle='#08111ddd';ctx.fillRect(18,18,Math.min(360,W*.34),72);
 ctx.fillStyle='#fff';ctx.font=`${18*devicePixelRatio}px system-ui`;ctx.fillText(M.player.name,32,45);
 ctx.fillStyle='#1c2c38';ctx.fillRect(32,55,220,14);ctx.fillStyle='#ffd44d';ctx.fillRect(32,55,220*p.hp/100,14);
 ctx.fillStyle='#fff';ctx.font=`${14*devicePixelRatio}px system-ui`;ctx.fillText(`SCORE ${Math.floor(p.score)}  ·  ${S.objective}`,32,88);
 document.getElementById('status').textContent=`${Math.max(0,Math.ceil(M.targetSeconds-t))}s · ${M.runtime.toUpperCase()}`;
}
function movePlayer(dt,speed=320){
 const p=S.p;if(keys['a']||keys['arrowleft'])p.x-=speed*dt;if(keys['d']||keys['arrowright'])p.x+=speed*dt;
 if(keys['w']||keys['arrowup'])p.y-=speed*.55*dt;if(keys['s']||keys['arrowdown'])p.y+=speed*.55*dt;
 p.x=Math.max(70,Math.min(c.width-70,p.x));p.y=Math.max(c.height*.42,Math.min(c.height*.9,p.y));
}
function brawler(dt){
 movePlayer(dt);const p=S.p;p.cool-=dt;const attack=(keys['j']||keys[' ']||keys['k'])&&p.cool<=0;
 if(attack){p.state=4;p.cool=.38}else p.state=(Math.abs((keys.a||keys.d)?1:0))?1:0;
 for(const e of S.enemies){if(e.hp<=0)continue;const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(d>95){e.x+=Math.sign(dx)*75*dt;e.y+=Math.sign(dy)*45*dt;e.state=1}else e.state=2;
  if(attack&&d<145){e.hp-=34;e.x-=Math.sign(dx)*26;p.score+=120;S.combo++}
  if(d<82&&e.cool<=0){p.hp-=7;e.cool=.8}e.cool-=dt;
 }
 S.enemies=S.enemies.filter(e=>e.hp>0);if(!S.enemies.length){S.progress+=120*dt;S.objective='Advance / next wave';if(S.progress>700&&S.tasks<2){S.tasks++;for(let i=0;i<4+S.tasks;i++)S.enemies.push({x:c.width*(.65+.07*(i%3)),y:c.height*(.63+.07*(i%3)),hp:75+S.tasks*15,actor:i%Math.max(1,M.opponents.length),state:0,cool:0});S.objective=`Wave ${S.tasks+1}`}}
 drawActor(playerImg,M.player,p.x,p.y,p.state,.23);S.enemies.forEach((e,i)=>drawActor(oppImgs[e.actor]||playerImg,M.opponents[e.actor]||M.player,e.x,e.y,e.state,.20,true));
}
function shooter(dt){
 movePlayer(dt,280);const p=S.p;p.cool-=dt;const fire=(mouse.down||keys[' '])&&p.cool<=0;if(fire){p.cool=.16;p.state=3}
 else p.state=keys['w']||keys['a']||keys['s']||keys['d']?1:2;
 for(const e of S.enemies){if(e.hp<=0)continue;const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(d>260){e.x+=Math.sign(dx)*55*dt;e.y+=Math.sign(dy)*25*dt}
   if(fire&&d<520){e.hp-=22;p.score+=90} if(d<220&&e.cool<=0){p.hp-=5;e.cool=1.0}e.cool-=dt;
 } S.enemies=S.enemies.filter(e=>e.hp>0);if(!S.enemies.length&&S.tasks<2){S.tasks++;for(let i=0;i<4+S.tasks;i++)S.enemies.push({x:c.width*(.56+.08*(i%4)),y:c.height*(.55+.08*(i%3)),hp:70,actor:i%Math.max(1,M.opponents.length),state:0,cool:0});S.objective=S.tasks===2?'Reach extraction':'Clear next sector'}else if(S.tasks>=2&&!S.enemies.length)S.progress+=70*dt;
 drawActor(playerImg,M.player,p.x,p.y,p.state,.22);S.enemies.forEach((e)=>{ctx.fillStyle='#ff5d5d';ctx.fillRect(e.x-35,e.y-92,70*e.hp/70,5);drawActor(oppImgs[e.actor]||playerImg,M.opponents[e.actor]||M.player,e.x,e.y,1,.18,true)});
}
function lifesim(dt){
 movePlayer(dt,240);const p=S.p;p.state=(keys['w']||keys['a']||keys['s']||keys['d']||keys['arrowleft']||keys['arrowright'])?1:0;
 if((keys['e']||keys[' '])&&p.cool<=0){p.cool=.6;S.tasks=Math.min(6,S.tasks+1);p.score+=100;S.objective=['Harvest crops','Deliver bread','Repair lantern','Meet villagers','Return to bakery','Evening complete'][Math.min(5,S.tasks)]}
 p.cool-=dt;drawActor(playerImg,M.player,p.x,p.y,p.state,.20);
 M.opponents.forEach((a,i)=>drawActor(oppImgs[i],a,c.width*(.58+.16*(i%2)),c.height*(.62+.11*(i%2)),0,.17,true));
}
function horror(dt){
 movePlayer(dt,230);const p=S.p;S.fear+=dt*.8;p.state=0;if(keys['shift']){p.energy=Math.max(0,p.energy-22*dt)}else p.energy=Math.min(100,p.energy+10*dt);
 const stalk=M.opponents[0];if(stalk&&oppImgs[0]){const ex=c.width*(.72-.002*S.fear*c.width/100),ey=c.height*.7;drawActor(oppImgs[0],stalk,ex,ey,Math.min(3,Math.floor(S.fear/12)),.18,true);if(Math.abs(p.x-ex)<120)p.hp-=10*dt}
 if((keys['e']||keys['f'])&&p.cool<=0){p.cool=.7;S.tasks++;S.objective=S.tasks<3?'Search next clue':'Escape the motel';p.score+=150}p.cool-=dt;drawActor(playerImg,M.player,p.x,p.y,p.state,.16);
}
function rpg(dt){
 movePlayer(dt,300);const p=S.p;p.cool-=dt;const hit=(keys['j']||keys['k']||keys['e'])&&p.cool<=0;if(hit){p.cool=.32;p.state=3}
 else p.state=(keys['w']||keys['a']||keys['s']||keys['d'])?1:0;
 for(const e of S.enemies){const d=Math.hypot(p.x-e.x,p.y-e.y);if(d>130){e.x+=Math.sign(p.x-e.x)*60*dt}if(hit&&d<175){e.hp-=28;p.score+=130}if(d<100&&e.cool<=0){p.hp-=8;e.cool=.9}e.cool-=dt}
 S.enemies=S.enemies.filter(e=>e.hp>0);if(!S.enemies.length&&S.tasks<2){S.tasks++;for(let i=0;i<3+S.tasks;i++)S.enemies.push({x:c.width*(.60+.08*(i%3)),y:c.height*(.62+.05*(i%2)),hp:80+S.tasks*30,actor:0,state:0,cool:0});S.objective=S.tasks===2?'Defeat guardian':'Destroy crystal cluster'}
 drawActor(playerImg,M.player,p.x,p.y,p.state,.21);S.enemies.forEach(e=>drawActor(oppImgs[0]||playerImg,M.opponents[0]||M.player,e.x,e.y,1,.18,true));
}
function racing(dt){
 const p=S.p;const accel=keys['w']||keys['arrowup'];const brake=keys['s']||keys['arrowdown'];p.vx+=(accel?420:-100)*dt;p.vx=Math.max(80,Math.min(720,p.vx));if(brake)p.vx=Math.max(60,p.vx-480*dt);if(keys[' '])p.vx=Math.min(900,p.vx+280*dt);
 if(keys['a']||keys['arrowleft'])p.x-=360*dt;if(keys['d']||keys['arrowright'])p.x+=360*dt;p.x=Math.max(c.width*.25,Math.min(c.width*.75,p.x));S.distance+=p.vx*dt;S.progress+=p.vx*.12*dt;p.score=S.distance;
 drawActor(playerImg,M.player,p.x,c.height*.77,(keys['a']?1:keys['d']?2:keys[' ']?3:0),.20);
 M.opponents.forEach((a,i)=>drawActor(oppImgs[i],a,c.width*(.42+.18*i+Math.sin(performance.now()/800+i)*.08),c.height*(.59+.04*i),3,.13,true));
 S.objective=S.distance<5000?'Sector 1':S.distance<11000?'Sector 2':'Final sprint';
}
function rhythm(dt){
 const now=(performance.now()-start)/1000;S.spawn-=dt;if(S.spawn<=0){S.spawn=.48;S.notes.push({lane:Math.floor(Math.random()*4),y:c.height*.25,hit:false})}
 const xs=[.36,.46,.56,.66].map(v=>c.width*v),line=c.height*.82;ctx.strokeStyle='#66d8ff';ctx.lineWidth=2;xs.forEach(x=>{ctx.beginPath();ctx.moveTo(x,c.height*.25);ctx.lineTo(x,line);ctx.stroke()});
 const buttons=['d','f','j','k'];for(const n of S.notes){n.y+=310*dt;const x=xs[n.lane];ctx.fillStyle='#ff4bea';ctx.beginPath();ctx.arc(x,n.y,20*devicePixelRatio,0,Math.PI*2);ctx.fill();if(Math.abs(n.y-line)<46&&keys[buttons[n.lane]]&&!n.hit){n.hit=true;S.combo++;S.p.score+=100+S.combo*5}}
 S.notes=S.notes.filter(n=>!n.hit&&n.y<c.height*.94);S.objective=`Combo ${S.combo}`;
 drawActor(playerImg,M.player,c.width*.22,c.height*.72,Math.min(5,S.combo%6),.23);if(M.opponents[0])drawActor(oppImgs[0],M.opponents[0],c.width*.82,c.height*.70,Math.floor(now)%4,.22,true);
}
function adventure(dt){
 movePlayer(dt,280);const p=S.p;p.state=(keys['w']||keys['a']||keys['s']||keys['d'])?1:0;p.cool-=dt;if((keys['e']||keys['j'])&&p.cool<=0){p.cool=.6;S.tasks++;p.score+=180;S.progress+=130;S.objective=S.tasks<2?'Activate next mechanism':'Reach the locomotive'}drawActor(playerImg,M.player,p.x,p.y,p.state,.20);if(M.opponents[0])for(const e of S.enemies.slice(0,3)){e.x+=Math.sign(p.x-e.x)*35*dt;drawActor(oppImgs[0],M.opponents[0],e.x,e.y,1,.13,true)}
}
function loop(now){
 if(!M)return;const dt=Math.min(.033,(now-last)/1000);last=now;const t=(now-start)/1000;
 drawBg();if(M.runtime==='brawler')brawler(dt);else if(M.runtime==='shooter')shooter(dt);else if(M.runtime==='lifesim')lifesim(dt);else if(M.runtime==='horror')horror(dt);else if(M.runtime==='rpg')rpg(dt);else if(M.runtime==='racing')racing(dt);else if(M.runtime==='rhythm')rhythm(dt);else adventure(dt);
 hud(t);
 if(t>=M.targetSeconds||S.p.hp<=0){ended=true;ctx.fillStyle='#000b';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`${54*devicePixelRatio}px system-ui`;ctx.fillText(S.p.hp<=0?'TRY AGAIN':'STAGE COMPLETE',c.width/2,c.height/2);ctx.font=`${20*devicePixelRatio}px system-ui`;ctx.fillText(`Score ${Math.floor(S.p.score)} · Reload page to replay`,c.width/2,c.height/2+55*devicePixelRatio);return}
 requestAnimationFrame(loop);
}
boot();
