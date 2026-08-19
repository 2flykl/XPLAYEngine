import { fbm2D, hashString } from './WorldMath.js';
import { targetFor } from './ReferenceTargetModel.js';
/* XPLAY World Forge v2
 * Manufactures cohesive, genre-aware world kits before the runtime starts.
 * All outputs are static-friendly data URLs so GitHub Pages can run them.
 */

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hex=(v,fallback)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:fallback;

function canvas(w,h,draw){
  const c=document.createElement('canvas'); c.width=w;c.height=h;
  const x=c.getContext('2d'); if(x){x.imageSmoothingEnabled=false;draw(x,c);} return c.toDataURL('image/png');
}
function rr(x,a,b,w,h,r){x.beginPath();x.roundRect(a,b,w,h,r);}
function stars(x,w,h,count=40,alpha=.35){
  x.save();x.fillStyle=`rgba(255,255,255,${alpha})`;
  for(let i=0;i<count;i++){const px=(i*137)%w,py=(i*83)%Math.max(1,h*.72),r=1+(i%3);x.fillRect(px,py,r,r);}x.restore();
}
function noise(x,w,h,alpha=.08,step=8,seed=1337){
  x.save();for(let yy=0;yy<h;yy+=step)for(let xx=0;xx<w;xx+=step){const n=fbm2D(xx/w*5,yy/h*5,{octaves:4,gain:.55,seed});x.fillStyle=`rgba(255,255,255,${alpha*n})`;x.fillRect(xx,yy,step,step);}x.restore();
}

function label(x,text,y,color='rgba(255,255,255,.32)'){x.save();x.fillStyle=color;x.font='700 10px Arial';x.fillText(text,8,y);x.restore();}

export function generateWorldDNA(engine,prompt='',feel='action',customData={}){
  const q=`${prompt} ${customData.environment||''}`.toLowerCase();
  const airport=/airport|plane|jet|runway|flight|boarding|terminal|hangar/.test(q)||customData.airportTheme;
  const city=/city|street|rooftop|downtown|urban/.test(q);
  const nature=/forest|jungle|tree|mountain|island|garden/.test(q);
  const theme=airport?'airport':nature?'canopy':city?'city':'xplay';
  const palettes={
    airport:['#081b2f','#18b6c9','#e9f5f6','#ffcb4c','#ff5f6d','#697f8e'],
    canopy:['#10281f','#3ea86a','#e9f7de','#ffc857','#ff6b6b','#536b58'],
    city:['#11182d','#30c7d9','#f5f7ff','#a9ef53','#ff5f8f','#66758d'],
    xplay:['#0d223d','#24c9c5','#eef7f6','#b7ef4b','#ff6a86','#6b7f8c']
  };
  const palette=(customData.palette?.length?customData.palette:palettes[theme]).map((v,i)=>hex(v,palettes[theme][i%palettes[theme].length]));
  return {
    version:3, genre:engine, theme, feel, seed:hashString(`${engine}|${prompt}|${feel}|${theme}`),
    camera:['fps','rhythm','puzzle'].includes(engine)?'fixed':'follow',
    worldScale:32, playerScale:engine==='fighting'?150:92,
    tileGrammar:['ground-center','ground-edge-left','ground-edge-right','inner-corner','outer-corner','slope-up','slope-down','ramp','thin-platform','wide-platform','bridge','ledge','wall','overhang','moving-platform','checkpoint','finish','alternate-material','decal-a','decal-b','damaged-a','damaged-b','special'],
    environmentVocabulary:airport?['sky','distant-city','terminal','hangars','control-tower','parked-aircraft','moving-aircraft','runway-lights','service-road']:nature?['sky','distant-canopy','tree-trunks','vines','mist','waterfall','birds']:['sky','distant-city','mid-buildings','near-rooftops','signage','traffic'],
    propVocabulary:airport?['luggage','luggage-cart','cone','runway-light','fuel-drum','barrier','tug','gate-sign','windsock','baggage-stack','service-crate','terminal-sign','beacon','boarding-stairs','maintenance-box','jet-bridge','fuel-hose','tool-cart']:['crate','lamp','sign','bench','barrier','plant','vent','speaker','banner','machine','box','light','pipe','terminal','marker','post'],
    enemyVocabulary:engine==='fps'?['drone-scout','drone-heavy','drone-elite']:engine==='fighting'?['rival-a','rival-b']:['patrol-bot','rolling-hazard','flying-drone'],
    collectibleLanguage:{primary:airport?'passport':'token',secondary:airport?'boarding-pass':'gem',elite:airport?'golden-ticket':'star'},
    hazardLanguage:airport?['rolling-luggage','service-cart','barrier','aircraft-crossing']:['barrier','rolling-crate','drone','spike'],
    movementGrammar:engine==='runner'?['run','jump','slide']:engine==='platformer'?['run','jump','fall','land']:engine==='fighting'?['walk','jump','punch','kick','block','special']:engine==='fps'?['aim','fire','reload']:['move'],
    animationGrammar:['idle','run','jump','fall','land','hurt','victory','defeat'],
    FXGrammar:['hit-spark','collect-flash','jump-dust','landing-dust','speed-streak','signature-burst'],
    palette, depth:5, sceneDensity:90,
    lighting:'warm-top-left', materialLanguage:airport?'painted-concrete-and-brushed-metal':'stylized-textured-surfaces',
    signatureLandmark:airport?'Private jet and terminal skyline':theme==='canopy'?'Ancient canopy tower':'XPLAY skyline beacon',
    signatureMechanic:engine==='runner'?'risk-reward-route':engine==='fighting'?'special-combo':engine==='fps'?'pressure-wave':'vertical-route-choice',
    signatureEvent:airport?'low-jet-flyover':theme==='canopy'?'canopy-light-burst':'neon-skyline-pulse',
    finishState:airport?'terminal-gate':'xplay-finish-gate', failState:'hazard-defeat'
  };
}

export function generateArtBible(dna,styleId='speed-16'){
  const presets={
    'cinematic-photo':{rendering:'cinematic illustrated realism',outline:'1px cool edge',shadow:'soft directional',grain:.08},
    'speed-16':{rendering:'high-detail 16-bit inspired pixel art',outline:'2px deep navy',shadow:'clustered pixel shadow',grain:.13},
    'storybook':{rendering:'polished animated illustration',outline:'2px warm ink',shadow:'soft painted',grain:.06},
    'graphic-novel':{rendering:'cel-shaded graphic novel',outline:'3px dark ink',shadow:'halftone',grain:.15},
    'mascot-64':{rendering:'64-bit arcade illustration',outline:'2px clean dark edge',shadow:'crisp soft shadow',grain:.09}
  }; const p=presets[styleId]||presets['speed-16'];
  return {version:3,targetResolution:'960x600',renderingStyle:p.rendering,perspective:dna.genre==='fps'?'first-person pseudo-3D':'side-view 2D',outlineTreatment:p.outline,palette:dna.palette,lightingDirection:'top-left 45deg',shadowTreatment:p.shadow,textureGrain:p.grain,environmentContrast:55,playableLayerContrast:94,foregroundContrast:72,characterProportions:dna.genre==='fighting'?'large arcade fighter':'heroic compact arcade',animationFrameRate:12,FXStyle:'bright additive arcade bursts',UIStyle:'clean modern arcade',spriteScaleRules:{player:dna.genre==='fighting'?'150x220':'88x112',enemy:dna.genre==='fighting'?'150x220':'72x88',collectible:'40x40',hazard:'64x64'}};
}

export function generateLevelBlueprint(engine,dna){
  const airport=dna.theme==='airport';
  return {
    intro:{pacing:'safe',length:.12,description:airport?'Open runway with a clear collectible trail and terminal landmark.':'Readable opening that teaches movement.'},
    firstChallenge:{pacing:'medium',length:.14,description:'One hazard family introduced with generous recovery space.'},
    combination:{pacing:'building',length:.18,description:'Layer terrain, collectibles and moving hazards.'},
    riskReward:{pacing:'choice',length:.17,description:'A higher-value alternate route with stronger visual landmarks.'},
    signatureMoment:{pacing:'spectacle',length:.14,event:dna.signatureEvent,description:airport?'A low jet crossing, runway lights pulsing and a premium collectible arc.':'World landmark animates during a high-value sequence.'},
    finalStretch:{pacing:'maximum',length:.17,description:'Fast combination of established challenges without visual clutter.'},
    finish:{pacing:'triumphant',length:.08,structure:dna.finishState,description:'Distinct finish architecture and celebration.'}
  };
}

function makeSky(dna){const P=dna.palette;return canvas(960,600,x=>{const g=x.createLinearGradient(0,0,0,600);g.addColorStop(0,P[0]);g.addColorStop(.52,'#214968');g.addColorStop(1,'#507d91');x.fillStyle=g;x.fillRect(0,0,960,600);stars(x,960,320,26,.14);for(let i=0;i<7;i++){x.fillStyle='rgba(255,255,255,.10)';x.beginPath();x.ellipse(80+i*155,110+(i%3)*58,80+(i%2)*35,22,0,0,Math.PI*2);x.fill();}noise(x,960,600,.04,12);});}
function makeFar(dna){const P=dna.palette;return canvas(960,600,x=>{x.clearRect(0,0,960,600);x.fillStyle='rgba(8,27,47,.58)';for(let i=0;i<18;i++){const w=50+(i%4)*18,h=95+(i%5)*35,px=i*58-20;x.fillRect(px,600-h,w,h);for(let yy=600-h+15;yy<590;yy+=19)for(let xx=px+10;xx<px+w-8;xx+=16){x.fillStyle=i%3?'rgba(255,220,120,.10)':'rgba(36,201,197,.08)';x.fillRect(xx,yy,5,8);x.fillStyle='rgba(8,27,47,.58)';}}label(x,dna.theme==='airport'?'DISTANT TERMINAL DISTRICT':'DISTANT WORLD',580);});}
function makeMid(dna){const P=dna.palette;return canvas(960,600,x=>{x.clearRect(0,0,960,600);x.fillStyle='rgba(16,40,61,.78)';if(dna.theme==='airport'){for(let i=0;i<4;i++){const px=40+i*250;x.fillRect(px,390,205,150);x.fillStyle='rgba(36,201,197,.16)';x.fillRect(px+12,407,180,12);x.fillStyle='rgba(16,40,61,.78)';}x.fillRect(720,240,42,300);x.fillStyle='rgba(36,201,197,.35)';x.beginPath();x.ellipse(741,240,75,28,0,0,Math.PI*2);x.fill();}else{for(let i=0;i<7;i++){x.beginPath();x.arc(80+i*145,410,70+(i%3)*15,Math.PI,0);x.lineTo(160+i*145,570);x.lineTo(i*145,570);x.closePath();x.fill();}}noise(x,960,600,.06,10);});}
function makeNear(dna){const P=dna.palette;return canvas(960,600,x=>{x.clearRect(0,0,960,600);x.fillStyle='rgba(4,12,21,.35)';x.fillRect(0,505,960,95);x.fillStyle=P[1];for(let i=0;i<9;i++){const px=35+i*120;x.fillRect(px,458,4,48);x.beginPath();x.arc(px+2,457,7,0,Math.PI*2);x.fill();}x.strokeStyle='rgba(255,255,255,.20)';x.lineWidth=3;x.setLineDash([18,20]);x.beginPath();x.moveTo(0,550);x.lineTo(960,550);x.stroke();x.setLineDash([]);});}

function makeTile(dna,index){const P=dna.palette;return canvas(128,72,x=>{const base=index%3===0?'#46555d':index%3===1?'#59676e':'#3e4b52';x.fillStyle=base;x.fillRect(2,10,124,60);const g=x.createLinearGradient(0,10,0,70);g.addColorStop(0,'rgba(255,255,255,.13)');g.addColorStop(1,'rgba(0,0,0,.18)');x.fillStyle=g;x.fillRect(2,10,124,60);x.fillStyle=P[1];x.fillRect(2,10,124,6);x.strokeStyle=P[0];x.lineWidth=3;x.strokeRect(2,10,124,60);x.strokeStyle='rgba(255,255,255,.36)';x.lineWidth=2;if(index%4===0){x.setLineDash([14,10]);x.beginPath();x.moveTo(10,40);x.lineTo(118,40);x.stroke();x.setLineDash([]);}if(index%4===1){for(let i=0;i<4;i++){x.beginPath();x.moveTo(12+i*30,58);x.lineTo(27+i*30,25);x.stroke();}}if(index%4===2){x.fillStyle='rgba(255,203,76,.42)';x.fillRect(12,22,104,5);x.fillRect(12,52,104,5);}if(index%4===3){for(let i=0;i<7;i++){x.fillStyle='rgba(10,20,28,.35)';x.fillRect(8+i*18,26+(i%2)*17,9,4);}}noise(x,128,72,.12,6);});}

function propArt(dna,i){const P=dna.palette;return canvas(72,72,x=>{x.clearRect(0,0,72,72);const type=i%12;x.strokeStyle=P[0];x.lineWidth=3;if(type===0){x.fillStyle='#ff7d39';x.beginPath();x.moveTo(36,6);x.lineTo(17,62);x.lineTo(55,62);x.closePath();x.fill();x.stroke();x.fillStyle='#fff';x.fillRect(25,35,22,7);}else if(type===1){for(let s=0;s<3;s++){x.fillStyle=[P[3],P[1],P[4]][s%3];rr(x,7+s*8,42-s*14,48,25,5);x.fill();x.stroke();}}else if(type===2){x.fillStyle='#697780';rr(x,8,34,56,23,5);x.fill();x.stroke();x.fillStyle=P[3];x.fillRect(16,25,40,8);x.fillStyle=P[0];x.beginPath();x.arc(19,61,6,0,Math.PI*2);x.arc(53,61,6,0,Math.PI*2);x.fill();}else if(type===3){x.fillStyle=P[1];x.fillRect(33,20,6,43);x.beginPath();x.arc(36,18,9,0,Math.PI*2);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(36,18,3,0,Math.PI*2);x.fill();}else if(type===4){x.fillStyle='#59656b';rr(x,12,22,48,42,7);x.fill();x.stroke();x.fillStyle=P[3];x.fillRect(18,29,36,7);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(21,43,30,13);}else if(type===5){x.fillStyle='#fff';rr(x,6,18,60,34,4);x.fill();x.stroke();x.fillStyle=P[4];for(let k=0;k<4;k++){x.beginPath();x.moveTo(8+k*16,18);x.lineTo(20+k*16,18);x.lineTo(5+k*16,52);x.lineTo(-7+k*16,52);x.closePath();x.fill();}}else if(type===6){x.fillStyle=P[0];x.fillRect(30,17,8,48);x.fillStyle=P[3];x.beginPath();x.moveTo(38,20);x.lineTo(65,30);x.lineTo(38,38);x.closePath();x.fill();}else if(type===7){x.fillStyle=P[2];rr(x,7,13,58,45,6);x.fill();x.stroke();x.fillStyle=P[0];x.font='bold 10px Arial';x.fillText('GATE',18,30);x.fillStyle=P[1];x.fillRect(14,38,44,5);}else if(type===8){x.fillStyle='#c7d2d7';x.fillRect(34,13,4,52);x.fillStyle=P[4];x.beginPath();x.moveTo(38,16);x.lineTo(59,24);x.lineTo(38,32);x.closePath();x.fill();}else if(type===9){x.fillStyle='#5c6870';rr(x,8,30,56,34,5);x.fill();x.stroke();x.fillStyle=P[1];x.fillRect(12,35,48,8);x.fillStyle='#fff';x.fillRect(17,48,12,9);x.fillRect(39,48,12,9);}else if(type===10){x.fillStyle=P[0];rr(x,8,24,56,40,6);x.fill();x.stroke();x.fillStyle=P[1];x.fillRect(14,31,44,6);x.fillStyle=P[2];x.fillRect(16,44,40,13);}else{x.fillStyle='#858f94';x.fillRect(31,16,10,46);x.fillStyle=P[4];x.beginPath();x.arc(36,14,10,0,Math.PI*2);x.fill();x.fillStyle='rgba(255,255,255,.65)';x.beginPath();x.arc(32,11,3,0,Math.PI*2);x.fill();}noise(x,72,72,.08,6);});}
function collectibleArt(dna,i){const P=dna.palette;return canvas(48,48,x=>{x.clearRect(0,0,48,48);x.strokeStyle=P[0];x.lineWidth=3;if(i%3===0){x.fillStyle='#17344f';rr(x,8,5,32,38,4);x.fill();x.stroke();x.fillStyle=P[3];x.beginPath();x.arc(24,24,6,0,Math.PI*2);x.fill();x.fillRect(16,11,16,3);}else if(i%3===1){x.fillStyle='#fff';rr(x,4,11,40,27,4);x.fill();x.stroke();x.fillStyle=P[1];x.fillRect(32,11,12,27);x.fillStyle=P[0];x.fillRect(9,19,18,3);x.fillRect(9,26,14,3);}else{x.fillStyle=P[3];x.beginPath();for(let p=0;p<10;p++){const a=-Math.PI/2+p*Math.PI/5,r=p%2?8:18,xp=24+Math.cos(a)*r,yp=24+Math.sin(a)*r;p?x.lineTo(xp,yp):x.moveTo(xp,yp);}x.closePath();x.fill();x.stroke();}});}
function hazardArt(dna,i){const P=dna.palette;return canvas(76,64,x=>{x.clearRect(0,0,76,64);x.strokeStyle=P[0];x.lineWidth=3;switch(i%4){case 0:x.fillStyle=P[4];rr(x,9,25,58,27,6);x.fill();x.stroke();x.fillStyle=P[0];x.beginPath();x.arc(22,55,6,0,Math.PI*2);x.arc(55,55,6,0,Math.PI*2);x.fill();break;case 1:x.fillStyle='#fff';x.fillRect(5,22,66,25);x.strokeRect(5,22,66,25);x.fillStyle=P[4];for(let k=0;k<5;k++){x.beginPath();x.moveTo(7+k*15,22);x.lineTo(19+k*15,22);x.lineTo(7+k*15,47);x.lineTo(-5+k*15,47);x.closePath();x.fill();}break;case 2:x.fillStyle='#ff7d39';x.beginPath();x.moveTo(38,5);x.lineTo(16,58);x.lineTo(60,58);x.closePath();x.fill();x.stroke();x.fillStyle='#fff';x.fillRect(27,33,22,7);break;default:x.fillStyle='#697780';rr(x,10,26,56,25,6);x.fill();x.stroke();x.fillStyle=P[3];x.fillRect(17,18,42,10);x.beginPath();x.arc(22,55,6,0,Math.PI*2);x.arc(55,55,6,0,Math.PI*2);x.fillStyle=P[0];x.fill();}});}
function enemyArt(dna,i){const P=dna.palette;return canvas(88,88,x=>{x.clearRect(0,0,88,88);x.strokeStyle=P[0];x.lineWidth=4;const heavy=i%3===1,elite=i%3===2;x.fillStyle=elite?P[3]:heavy?P[4]:P[1];x.beginPath();x.moveTo(44,8);x.lineTo(74,24);x.lineTo(68,62);x.lineTo(44,78);x.lineTo(20,62);x.lineTo(14,24);x.closePath();x.fill();x.stroke();x.fillStyle=P[0];rr(x,25,28,38,23,8);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(36,39,4,0,Math.PI*2);x.arc(52,39,4,0,Math.PI*2);x.fill();if(heavy){x.fillStyle=P[0];x.fillRect(6,47,18,9);x.fillRect(64,47,18,9);}if(elite){x.strokeStyle=P[3];x.lineWidth=3;x.beginPath();x.arc(44,43,37,0,Math.PI*2);x.stroke();}});}
function finishGate(dna){const P=dna.palette;return canvas(128,170,x=>{x.clearRect(0,0,128,170);x.fillStyle=P[0];rr(x,10,15,18,145,6);x.fill();rr(x,100,15,18,145,6);x.fill();x.fillStyle=P[1];rr(x,18,14,92,25,8);x.fill();x.fillStyle=P[2];x.font='900 13px Arial';x.fillText('XPLAY GATE',27,31);x.fillStyle='rgba(255,255,255,.18)';x.fillRect(29,42,70,112);});}
function jet(dna){const P=dna.palette;return canvas(300,105,x=>{x.clearRect(0,0,300,105);x.fillStyle=P[2];x.strokeStyle=P[0];x.lineWidth=4;x.beginPath();x.moveTo(16,55);x.quadraticCurveTo(84,32,188,37);x.lineTo(258,20);x.lineTo(232,43);x.lineTo(286,54);x.lineTo(232,64);x.lineTo(258,88);x.lineTo(187,67);x.quadraticCurveTo(72,74,16,55);x.closePath();x.fill();x.stroke();x.fillStyle=P[1];x.fillRect(78,45,116,7);for(let i=0;i<5;i++){x.fillStyle=P[0];x.beginPath();x.arc(102+i*25,55,4,0,Math.PI*2);x.fill();}});}
function fighter(dna,variant=0){const P=dna.palette;return canvas(150,220,x=>{x.clearRect(0,0,150,220);const skin=variant?'#704731':'#8f5d3d',cloth=variant?P[4]:P[1];x.strokeStyle=P[0];x.lineWidth=6;x.fillStyle=skin;x.beginPath();x.arc(75,35,27,0,Math.PI*2);x.fill();x.stroke();x.fillStyle=cloth;x.beginPath();x.moveTo(42,69);x.quadraticCurveTo(75,52,108,69);x.lineTo(119,151);x.quadraticCurveTo(75,171,31,151);x.closePath();x.fill();x.stroke();x.strokeStyle=skin;x.lineWidth=17;x.beginPath();x.moveTo(42,85);x.lineTo(13,130);x.moveTo(108,85);x.lineTo(137,126);x.stroke();x.strokeStyle=P[0];x.lineWidth=22;x.beginPath();x.moveTo(58,150);x.lineTo(48,212);x.moveTo(92,150);x.lineTo(103,212);x.stroke();x.fillStyle=P[2];x.beginPath();x.arc(64,32,4,0,Math.PI*2);x.arc(85,32,4,0,Math.PI*2);x.fill();});}
function weapon(dna){const P=dna.palette;return canvas(410,190,x=>{x.clearRect(0,0,410,190);x.fillStyle=P[0];x.strokeStyle='#7f949f';x.lineWidth=5;x.beginPath();x.moveTo(24,128);x.lineTo(225,57);x.lineTo(365,81);x.lineTo(350,126);x.lineTo(230,137);x.lineTo(176,174);x.lineTo(86,174);x.lineTo(119,138);x.closePath();x.fill();x.stroke();x.fillStyle=P[1];rr(x,232,76,103,23,7);x.fill();x.fillStyle=P[3];x.beginPath();x.arc(190,109,14,0,Math.PI*2);x.fill();noise(x,410,190,.07,8);});}
function crosshair(dna){const P=dna.palette;return canvas(96,96,x=>{x.clearRect(0,0,96,96);x.strokeStyle=P[1];x.lineWidth=4;x.beginPath();x.arc(48,48,22,0,Math.PI*2);x.stroke();x.strokeStyle='#fff';x.beginPath();x.moveTo(48,5);x.lineTo(48,27);x.moveTo(48,69);x.lineTo(48,91);x.moveTo(5,48);x.lineTo(27,48);x.moveTo(69,48);x.lineTo(91,48);x.stroke();x.fillStyle=P[4];x.beginPath();x.arc(48,48,3,0,Math.PI*2);x.fill();});}
function hitfx(dna){const P=dna.palette;return canvas(96,96,x=>{x.translate(48,48);for(let i=0;i<12;i++){x.rotate(Math.PI/6);x.fillStyle=i%2?P[3]:P[4];x.fillRect(16,-2,25+(i%3)*8,4);}x.fillStyle='#fff';x.beginPath();x.arc(0,0,10,0,Math.PI*2);x.fill();});}

export function forgeWorldKit(dna,artBible){
  const assets={sky:makeSky(dna),backgroundFar:makeFar(dna),backgroundMid:makeMid(dna),backgroundNear:makeNear(dna),goal:finishGate(dna),signatureJet:jet(dna),weapon:weapon(dna),crosshair:crosshair(dna),hitfx:hitfx(dna),playerFighter:fighter(dna,0),enemyFighter:fighter(dna,1)};
  const terrainKeys=[],propKeys=[],hazardKeys=[],collectibleKeys=[],enemyKeys=[];
  for(let i=0;i<24;i++){const k=`terrain${String(i).padStart(2,'0')}`;assets[k]=makeTile(dna,i);terrainKeys.push(k);}
  for(let i=0;i<18;i++){const k=`prop${String(i).padStart(2,'0')}`;assets[k]=propArt(dna,i);propKeys.push(k);}
  for(let i=0;i<4;i++){const k=`hazard${String(i).padStart(2,'0')}`;assets[k]=hazardArt(dna,i);hazardKeys.push(k);}
  for(let i=0;i<3;i++){const k=`collectible${String(i).padStart(2,'0')}`;assets[k]=collectibleArt(dna,i);collectibleKeys.push(k);}
  for(let i=0;i<3;i++){const k=`enemy${String(i).padStart(2,'0')}`;assets[k]=enemyArt(dna,i);enemyKeys.push(k);}
  assets.background=assets.sky;assets.platform=assets.terrain00;assets.collectible=assets.collectible00;assets.hazard=assets.hazard00;assets.enemy=assets.enemy00;
  const meta={version:3,terrainKeys,propKeys,hazardKeys,collectibleKeys,enemyKeys,backgroundKeys:['sky','backgroundFar','backgroundMid','backgroundNear'],ambientSystems:['moving-clouds','runway-light-pulse','signature-traffic'],counts:{terrain:terrainKeys.length,props:propKeys.length,hazards:hazardKeys.length,collectibles:collectibleKeys.length,enemies:enemyKeys.length,layers:5,ambient:3},math:{seed:dna.seed,noise:'fBm-4-octave',placement:'entropy+poisson',difficulty:'logistic-s-curve',parallax:'depth-power-law'}};
  return {assets,meta};
}

export function analyzeVisualQuality(manifest){
  const imgs=manifest?.assets?.images||{},wk=manifest?.worldKit||{}; const c=wk.counts||{};const issues=[];
  const t=targetFor(manifest?.engine);const required={terrain:t.terrain,props:t.props,hazards:t.hazards,collectibles:t.collectibles,layers:t.layers,ambient:t.ambient,enemies:t.enemies};
  if(!imgs.background)issues.push('No environment background.'); if(!imgs.player)issues.push('No player asset.');
  if(['runner','platformer','fighting'].includes(manifest?.engine)&&!imgs.platform)issues.push('No terrain/floor asset.');
  if((c.terrain||0)<required.terrain && ['runner','platformer'].includes(manifest?.engine))issues.push(`World kit terrain density too low (${c.terrain||0}/${required.terrain}).`);
  if((c.props||0)<required.props)issues.push(`World kit prop diversity too low (${c.props||0}/${required.props}).`);
  if((c.layers||0)<required.layers)issues.push(`Background depth too low (${c.layers||0}/${required.layers}).`);
  if((c.ambient||0)<required.ambient)issues.push(`Ambient motion systems too low (${c.ambient||0}/${required.ambient}).`);
  if((c.enemies||0)<required.enemies && ['platformer','runner','fps'].includes(manifest?.engine))issues.push(`Enemy family diversity too low (${c.enemies||0}/${required.enemies}).`);
  const scores={
    playability:imgs.player&&imgs.background?100:40,
    genreCorrectness:manifest?.engine?95:0,
    artCoherence:manifest?.artBible&&manifest?.worldDNA?92:65,
    sceneDensity:clamp(45+(c.terrain||0)*1.2+(c.props||0)*1.1,0,100),
    visualPolish:clamp(58+(c.layers||0)*5+(c.ambient||0)*5,0,100),
    assetDiversity:clamp((c.terrain||0)*1.5+(c.props||0)*2+(c.hazards||0)*4+(c.collectibles||0)*3,0,100)
  };
  const overallScore=Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/Object.keys(scores).length);
  return {overallScore,pass:issues.length===0&&overallScore>=82,scores,issues,repairRoute:issues.map(i=>({target:i.includes('background')?'background':i.includes('terrain')?'platform':'worldKit',action:'reforge-world-kit'}))};
}
