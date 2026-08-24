
const STORAGE_KEY='xplay-openworld-fpv-v2';
const $=s=>document.querySelector(s);

const fileInput=$('#fileInput'), generatePlayableBtn=$('#generatePlayableBtn');
const saveBtn=$('#saveBtn'),loadBtn=$('#loadBtn'),clearBtn=$('#clearBtn');
const sourceCanvas=$('#sourceCanvas'),sourceCtx=sourceCanvas.getContext('2d');
const viewCanvas=$('#viewCanvas'),ctx=viewCanvas.getContext('2d');
const mapCanvas=$('#mapCanvas'),mapCtx=mapCanvas.getContext('2d');
const progress=$('#progress'),regionGallery=$('#regionGallery');
const captureToggle=$('#captureToggle'),placeToggle=$('#placeToggle'),cropSize=$('#cropSize'),cropSizeLabel=$('#cropSizeLabel'),landmarkGallery=$('#landmarkGallery');

let sourceImage=null,sourceFile=null,sourceDataURL=null;
let regions=[],regionImages=[],selectedLandmarkId=null,mouseLook=false,lastMouseX=0;
let state={
  worldId:null,
  player:{x:180,y:0,a:0,speed:190},
  landmarks:[],
  captured:[],
  keys:{}
};

async function j(url,opt){
  const r=await fetch(url,opt); const x=await r.json();
  if(!r.ok||x.ok===false)throw new Error(x.error||r.statusText);
  return x;
}
async function image(src){const im=new Image();im.src=src;await im.decode();return im}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function angNorm(a){while(a<-Math.PI)a+=Math.PI*2;while(a>Math.PI)a-=Math.PI*2;return a}

async function health(){
  try{
    const h=await j('/api/health');
    $('#apiStatus').textContent=h.openAIConfigured?`Image API READY · ${h.imageModel}`:'Image API key missing';
  }catch(e){$('#apiStatus').textContent='Server unavailable'}
}

function drawSource(){
  sourceCtx.clearRect(0,0,sourceCanvas.width,sourceCanvas.height);
  sourceCtx.fillStyle='#07131f';sourceCtx.fillRect(0,0,sourceCanvas.width,sourceCanvas.height);
  if(!sourceImage){sourceCtx.fillStyle='#9fbedb';sourceCtx.font='18px sans-serif';sourceCtx.fillText('Upload screenshot',20,36);return}
  const s=Math.min(sourceCanvas.width/sourceImage.width,sourceCanvas.height/sourceImage.height);
  const w=sourceImage.width*s,h=sourceImage.height*s,x=(sourceCanvas.width-w)/2,y=(sourceCanvas.height-h)/2;
  sourceCtx.drawImage(sourceImage,x,y,w,h);
}

function renderRegionGallery(){
  regionGallery.innerHTML='';
  regions.forEach((r,i)=>{
    const d=document.createElement('div');d.className='regionCard';
    d.innerHTML=`<img src="${r.url}"><div>Region ${i+1} · world position ${r.x}, ${r.y}</div>`;
    regionGallery.appendChild(d);
  });
}

async function generateWorld(){
  if(!sourceFile){alert('Choose a screenshot first.');return}
  progress.textContent='Environment Beast is generating 3 connected world regions…';
  generatePlayableBtn.disabled=true;
  try{
    const fd=new FormData();fd.append('image',sourceFile);
    const x=await j('/api/generate-world',{method:'POST',body:fd});
    state.worldId=x.worldId;
    regions=[
      {id:'seed',x:0,y:0,url:sourceDataURL},
      {id:'region-1',x:1200,y:0,url:x.regions[0]},
      {id:'region-2',x:2400,y:250,url:x.regions[1]},
      {id:'region-3',x:3600,y:-180,url:x.regions[2]}
    ];
    regionImages=[];
    for(const r of regions)regionImages.push(await image(r.url));
    state.player={x:180,y:0,a:0,speed:190};
    progress.textContent='Playable world generated. Use WASD/QE or mouse-drag to explore.';
    renderRegionGallery();updateMeta();render();
  }catch(e){
    progress.textContent='Generation failed: '+e.message;
  }finally{generatePlayableBtn.disabled=false}
}

function regionForPlayer(){
  if(!regions.length)return null;
  let best=regions[0],bd=Infinity;
  regions.forEach(r=>{const d=Math.hypot(state.player.x-r.x,state.player.y-r.y);if(d<bd){bd=d;best=r}});
  return best;
}

function drawFPV(){
  ctx.clearRect(0,0,viewCanvas.width,viewCanvas.height);
  if(!regions.length){
    ctx.fillStyle='#06111d';ctx.fillRect(0,0,viewCanvas.width,viewCanvas.height);
    ctx.fillStyle='#d8efff';ctx.font='28px sans-serif';ctx.fillText('Generate Playable World',60,90);
    ctx.font='16px sans-serif';ctx.fillStyle='#9fbedb';ctx.fillText('The playable viewport will use screenshot-matched environment regions — not colored geometry.',60,126);
    return;
  }

  const current=regionForPlayer();
  const idx=regions.indexOf(current);
  const im=regionImages[idx];
  if(!im)return;

  const W=viewCanvas.width,H=viewCanvas.height;
  // First-person pan: heading shifts crop horizontally; movement slightly zooms/parallaxes.
  const fovCrop=0.72;
  const sw=im.width*fovCrop, sh=im.height*fovCrop;
  const angle01=((state.player.a%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/(Math.PI*2);
  let sx=angle01*(im.width-sw);
  const movePulse=(Math.sin((state.player.x+state.player.y)*0.02)+1)*0.5;
  const sy=clamp(im.height*0.08+movePulse*im.height*0.035,0,im.height-sh);
  ctx.drawImage(im,sx,sy,sw,sh,0,0,W,H);

  // Neighbor-region visual continuity strips at the edges.
  const localDist=Math.hypot(state.player.x-current.x,state.player.y-current.y);
  if(localDist>650){
    const next=regionImages[Math.min(idx+1,regionImages.length-1)];
    if(next&&next!==im){
      ctx.globalAlpha=clamp((localDist-650)/380,0,.42);
      ctx.drawImage(next,0,0,next.width*.45,next.height, W*.72,0,W*.28,H);
      ctx.globalAlpha=1;
    }
  }

  // Screenshot-derived landmark billboards.
  drawLandmarks();

  // Simple HUD.
  ctx.fillStyle='rgba(0,14,28,.70)';ctx.fillRect(18,18,315,72);
  ctx.fillStyle='#fff';ctx.font='bold 24px sans-serif';ctx.fillText('OPEN WORLD SCOUT',30,47);
  ctx.font='14px sans-serif';ctx.fillStyle='#d2ebff';
  ctx.fillText(`Region ${idx+1}/${regions.length} · ${current.id}`,30,70);
  ctx.fillText(`World ${state.player.x.toFixed(0)}, ${state.player.y.toFixed(0)}`,180,70);
  ctx.strokeStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.moveTo(W/2-9,H/2);ctx.lineTo(W/2+9,H/2);ctx.stroke();ctx.beginPath();ctx.moveTo(W/2,H/2-9);ctx.lineTo(W/2,H/2+9);ctx.stroke();
}

const lmCache={};
function drawLandmarks(){
  const W=viewCanvas.width,H=viewCanvas.height,fov=Math.PI/2.6;
  const arr=state.landmarks.map(l=>{
    const dx=l.x-state.player.x,dy=l.y-state.player.y,dist=Math.hypot(dx,dy),ang=angNorm(Math.atan2(dy,dx)-state.player.a);
    return {...l,dist,ang}
  }).filter(l=>l.dist>8&&Math.abs(l.ang)<fov*.6).sort((a,b)=>b.dist-a.dist);

  for(const l of arr){
    const cap=state.captured.find(x=>x.id===l.typeId);if(!cap)continue;
    if(!lmCache[cap.id]){const im=new Image();im.src=cap.dataURL;lmCache[cap.id]=im}
    const im=lmCache[cap.id];if(!im.complete)continue;
    const x=(.5+l.ang/fov)*W,scale=clamp(900/l.dist,.14,2.5),size=150*scale,y=H*.74;
    ctx.drawImage(im,x-size/2,y-size,size,size);
  }
}

function drawMap(){
  mapCtx.clearRect(0,0,mapCanvas.width,mapCanvas.height);
  mapCtx.fillStyle='#07131f';mapCtx.fillRect(0,0,mapCanvas.width,mapCanvas.height);
  const minX=-200,maxX=4200,minY=-900,maxY=900;
  const X=x=>(x-minX)/(maxX-minX)*mapCanvas.width;
  const Y=y=>(y-minY)/(maxY-minY)*mapCanvas.height;
  mapCtx.strokeStyle='#2f80ff';mapCtx.lineWidth=3;mapCtx.beginPath();
  regions.forEach((r,i)=>{if(i===0)mapCtx.moveTo(X(r.x),Y(r.y));else mapCtx.lineTo(X(r.x),Y(r.y))});mapCtx.stroke();
  regions.forEach((r,i)=>{mapCtx.fillStyle='#44d7ff';mapCtx.beginPath();mapCtx.arc(X(r.x),Y(r.y),9,0,Math.PI*2);mapCtx.fill();mapCtx.fillStyle='#fff';mapCtx.font='12px sans-serif';mapCtx.fillText(`R${i+1}`,X(r.x)+12,Y(r.y)+4)});
  state.landmarks.forEach(l=>{mapCtx.fillStyle='#7dff9f';mapCtx.beginPath();mapCtx.arc(X(l.x),Y(l.y),5,0,Math.PI*2);mapCtx.fill()});
  mapCtx.fillStyle='#ffd85a';mapCtx.beginPath();mapCtx.arc(X(state.player.x),Y(state.player.y),7,0,Math.PI*2);mapCtx.fill();
}

function updateMeta(){
  $('#worldText').textContent=state.worldId||'—';$('#regionText').textContent=regions.length;$('#landmarkText').textContent=state.landmarks.length;
  $('#posX').textContent=state.player.x.toFixed(0);$('#posY').textContent=state.player.y.toFixed(0);$('#heading').textContent=Math.round((state.player.a*180/Math.PI+360)%360);
}

function render(){drawSource();drawFPV();drawMap();updateMeta()}

function saveMemory(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify({state,sourceDataURL,regions}));
  progress.textContent='World memory saved locally.';
}
async function loadMemory(){
  const raw=localStorage.getItem(STORAGE_KEY);if(!raw){alert('No saved world memory.');return}
  const d=JSON.parse(raw);state=d.state;sourceDataURL=d.sourceDataURL;regions=d.regions||[];
  if(sourceDataURL){sourceImage=await image(sourceDataURL)}
  regionImages=[];for(const r of regions)regionImages.push(await image(r.url));
  renderRegionGallery();render();progress.textContent='World memory loaded.';
}
function clearMemory(){localStorage.removeItem(STORAGE_KEY);progress.textContent='Saved memory cleared.'}

function captureLandmark(e){
  if(!captureToggle.checked||!sourceImage)return;
  const rect=sourceCanvas.getBoundingClientRect(),cx=(e.clientX-rect.left)/rect.width*sourceCanvas.width,cy=(e.clientY-rect.top)/rect.height*sourceCanvas.height;
  const s=Math.min(sourceCanvas.width/sourceImage.width,sourceCanvas.height/sourceImage.height),w=sourceImage.width*s,h=sourceImage.height*s,ox=(sourceCanvas.width-w)/2,oy=(sourceCanvas.height-h)/2;
  if(cx<ox||cx>ox+w||cy<oy||cy>oy+h)return;
  const ix=(cx-ox)/s,iy=(cy-oy)/s,size=Number(cropSize.value),sx=clamp(ix-size/2,0,sourceImage.width-size),sy=clamp(iy-size/2,0,sourceImage.height-size);
  const cv=document.createElement('canvas');cv.width=size;cv.height=size;cv.getContext('2d').drawImage(sourceImage,sx,sy,size,size,0,0,size,size);
  const id='lm-'+Date.now();state.captured.push({id,name:`Landmark ${state.captured.length+1}`,dataURL:cv.toDataURL('image/png')});selectedLandmarkId=id;gallery();
}
function gallery(){
  landmarkGallery.innerHTML='';state.captured.forEach(l=>{const b=document.createElement('button');b.className='galleryItem'+(l.id===selectedLandmarkId?' selected':'');b.innerHTML=`<img src="${l.dataURL}"><span>${l.name}</span>`;b.onclick=()=>{selectedLandmarkId=l.id;gallery()};landmarkGallery.appendChild(b)})
}
function placeLandmark(){
  const lm=state.captured.find(x=>x.id===selectedLandmarkId);if(!lm)return;
  state.landmarks.push({id:'placed-'+Date.now(),typeId:lm.id,x:state.player.x+Math.cos(state.player.a)*250,y:state.player.y+Math.sin(state.player.a)*250});
  updateMeta();
}

function move(dt){
  const s=state.player.speed*(state.keys['shift']?2:1)*dt;
  const fx=Math.cos(state.player.a),fy=Math.sin(state.player.a),rx=Math.cos(state.player.a+Math.PI/2),ry=Math.sin(state.player.a+Math.PI/2);
  if(state.keys['w']){state.player.x+=fx*s;state.player.y+=fy*s}
  if(state.keys['s']){state.player.x-=fx*s;state.player.y-=fy*s}
  if(state.keys['a']){state.player.x-=rx*s;state.player.y-=ry*s}
  if(state.keys['d']){state.player.x+=rx*s;state.player.y+=ry*s}
  if(state.keys['q'])state.player.a-=1.6*dt;if(state.keys['e'])state.player.a+=1.6*dt;
}

fileInput.onchange=async e=>{sourceFile=e.target.files[0];if(!sourceFile)return;sourceDataURL=URL.createObjectURL(sourceFile);sourceImage=await image(sourceDataURL);drawSource();progress.textContent='Screenshot loaded. Click Generate Playable World.'};
generatePlayableBtn.onclick=generateWorld;saveBtn.onclick=saveMemory;loadBtn.onclick=loadMemory;clearBtn.onclick=clearMemory;
cropSize.oninput=()=>cropSizeLabel.textContent=cropSize.value;sourceCanvas.onclick=captureLandmark;
viewCanvas.onmousedown=e=>{if(placeToggle.checked){placeLandmark();return}mouseLook=true;lastMouseX=e.clientX};window.onmouseup=()=>mouseLook=false;window.onmousemove=e=>{if(mouseLook){state.player.a+=(e.clientX-lastMouseX)*.005;lastMouseX=e.clientX}};
window.onkeydown=e=>state.keys[e.key.toLowerCase()]=true;window.onkeyup=e=>state.keys[e.key.toLowerCase()]=false;

let last=performance.now();
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;move(dt);drawFPV();drawMap();updateMeta();requestAnimationFrame(loop)}
health();render();requestAnimationFrame(loop);
