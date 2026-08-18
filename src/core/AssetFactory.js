
import { getStyle } from './StyleLibrary.js';

export async function deriveLocalAssets(dataUrl, styleDNA={}, spec={}, options={}) {
  if(!dataUrl) return {};
  const img=await loadImage(dataUrl);
  const style=getStyle(options.styleId || 'cinematic-photo');
  const airport=!!spec.airportTheme || /airport|airfield|plane|jet|runway|boarding|flight/.test(`${spec.title||''} ${spec.environment||''}`.toLowerCase());

  const bg = airport ? makeAirportBackground(img,styleDNA,style,options) : makeGenericBackground(img,styleDNA,style,options);
  const hero = makeHero(img,styleDNA,style,options);
  const collectible = airport ? boardingPass(styleDNA,style) : themedToken(styleDNA,style);
  const hazard = airport ? luggage(styleDNA,style) : crate(styleDNA,style);
  const platform = airport ? runwayTile(styleDNA,style) : groundTile(styleDNA,style);
  const enemy = airport ? runwayOpponent(styleDNA,style) : rival(styleDNA,style);
  const npc = airport ? groundCrew(styleDNA,style) : citizen(styleDNA,style);

  // Full shared asset contract: every generated PLX gets all role keys.
  return {
    background:bg,
    player:hero,
    collectible,
    hazard,
    platform,
    enemy,
    npc,
    building: airport ? terminalBuilding(styleDNA,style) : genericBuilding(styleDNA,style),
    crosshair:crosshair(styleDNA,style),
    weapon:weapon(styleDNA,style),
    hitfx:hitFX(styleDNA,style),
    goal:finishGate(styleDNA,style),
    note:musicNote(styleDNA,style),
    car:airport ? serviceCar(styleDNA,style) : playerCar(styleDNA,style),
    enemyCar:airport ? baggageCart(styleDNA,style) : trafficCar(styleDNA,style),
    cardBack:cardBack(styleDNA,style),
    face0:cardFace(styleDNA,style,0),
    face1:cardFace(styleDNA,style,1),
    face2:cardFace(styleDNA,style,2),
    face3:cardFace(styleDNA,style,3),
  };
}

function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});}
function canvas(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),c);return c.toDataURL('image/png');}
function svgData(s){return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;}
function p(d){return d.palette||['#79afe0','#eef2f4','#303237','#666a70','#bcc0c4'];}

function makeAirportBackground(img,dna,style,options){
  const pal=p(dna);
  return canvas(960,600,(x)=>{
    // Real-photo layer keeps fabric of the upload.
    x.fillStyle=pal[0];x.fillRect(0,0,960,600);
    x.save();
    x.globalAlpha=style.artMode==='photo'?.76:.42;
    x.filter=style.artMode==='photo'?'contrast(1.07) saturate(.92)':'saturate(.7) blur(1px)';
    x.drawImage(img,0,0,960,600);
    x.restore();

    // Cinematic runway floor geometry over the source.
    const g=x.createLinearGradient(0,330,0,600);
    g.addColorStop(0,'rgba(45,55,62,.55)');
    g.addColorStop(1,'rgba(15,22,28,.92)');
    x.fillStyle=g;x.beginPath();x.moveTo(185,600);x.lineTo(345,330);x.lineTo(615,330);x.lineTo(785,600);x.closePath();x.fill();

    x.strokeStyle='#ffffff';x.lineWidth=8;x.setLineDash([24,24]);
    x.beginPath();x.moveTo(480,350);x.lineTo(480,600);x.stroke();x.setLineDash([]);

    x.strokeStyle='#24c9c5';x.lineWidth=4;
    x.beginPath();x.moveTo(280,600);x.lineTo(390,330);x.stroke();
    x.beginPath();x.moveTo(680,600);x.lineTo(570,330);x.stroke();

    // dark wash for game readability
    x.fillStyle='rgba(5,18,28,.30)';x.fillRect(0,0,960,600);
  });
}

function makeGenericBackground(img,dna,style){
  const pal=p(dna);
  return canvas(960,600,(x)=>{
    x.fillStyle=pal[2]||'#17283b';x.fillRect(0,0,960,600);
    x.globalAlpha=style.artMode==='photo'?.82:.48;x.drawImage(img,0,0,960,600);x.globalAlpha=1;
    if(style.artMode==='pixel-low'){x.imageSmoothingEnabled=false;}
    x.fillStyle='rgba(5,18,28,.25)';x.fillRect(0,0,960,600);
  });
}

function makeHero(img,dna,style,options){
  if(style.artMode==='photo' || options.characterSource==='photo'){
    return canvas(180,220,(x)=>{
      x.clearRect(0,0,180,220);
      x.save();rounded(x,22,8,136,156,28);x.clip();
      const sw=img.naturalWidth*.52,sh=img.naturalHeight*.74;
      x.drawImage(img,(img.naturalWidth-sw)/2,(img.naturalHeight-sh)/2,sw,sh,22,8,136,156);
      x.restore();
      x.fillStyle='#f5f7f8';rounded(x,45,150,90,42,12);x.fill();
      x.fillStyle='#23272c';x.fillRect(54,189,26,25);x.fillRect(100,189,26,25);
      x.strokeStyle='#24c9c5';x.lineWidth=4;rounded(x,22,8,136,156,28);x.stroke();
    });
  }
  const pix=style.artMode.startsWith('pixel');
  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="220" viewBox="0 0 160 220">
    <ellipse cx="80" cy="206" rx="34" ry="8" fill="rgba(0,0,0,.25)"/>
    <circle cx="80" cy="38" r="${pix?18:20}" fill="#7b4a2c"/>
    <path d="M46 76 Q80 56 114 76 L120 148 Q80 166 40 148Z" fill="#f4f5f5" stroke="#ccd4da" stroke-width="${pix?0:2}"/>
    <path d="M60 147 L51 210" stroke="#25282e" stroke-width="16" stroke-linecap="${pix?'square':'round'}"/>
    <path d="M100 147 L109 210" stroke="#25282e" stroke-width="16" stroke-linecap="${pix?'square':'round'}"/>
    <path d="M43 90 L25 140" stroke="#f4f5f5" stroke-width="12" stroke-linecap="${pix?'square':'round'}"/>
    <path d="M117 90 L135 140" stroke="#f4f5f5" stroke-width="12" stroke-linecap="${pix?'square':'round'}"/>
    <path d="M45 77 H115" stroke="#24c9c5" stroke-width="4" opacity=".75"/>
  </svg>`);
}

function boardingPass(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="108" height="70"><rect x="3" y="8" width="102" height="54" rx="12" fill="#fff"/><rect x="72" y="8" width="33" height="54" rx="10" fill="#24c9c5"/><rect x="14" y="20" width="40" height="6" rx="3" fill="#17283b"/><rect x="14" y="34" width="48" height="4" rx="2" fill="#aeb7bd"/><path d="M80 23 l15 12 -15 12" fill="none" stroke="#fff" stroke-width="5"/></svg>`);}
function themedToken(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84"><circle cx="42" cy="42" r="31" fill="#24c9c5"/><path d="M42 18 L51 34 L69 38 L56 51 L58 69 L42 61 L26 69 L28 51 L15 38 L33 34Z" fill="#fff" opacity=".85"/></svg>`);}
function luggage(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88"><rect x="18" y="24" width="52" height="44" rx="8" fill="#202833"/><rect x="32" y="17" width="26" height="10" rx="5" fill="#586572"/><rect x="26" y="30" width="38" height="6" rx="3" fill="#24c9c5"/><circle cx="30" cy="73" r="5"/><circle cx="58" cy="73" r="5"/></svg>`);}
function crate(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84"><rect x="14" y="14" width="56" height="56" rx="9" fill="#273442"/><path d="M24 24 L60 60 M60 24 L24 60" stroke="#24c9c5" stroke-width="6"/></svg>`);}
function runwayTile(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="280" height="90"><rect width="280" height="90" rx="14" fill="#626b72"/><path d="M30 46 H250" stroke="#fff" stroke-width="8" stroke-dasharray="18 18"/><path d="M8 10 L0 80 M272 10 L280 80" stroke="#24c9c5" stroke-width="4"/></svg>`);}
function groundTile(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="280" height="90"><rect width="280" height="90" rx="14" fill="#465563"/><rect width="280" height="14" rx="14" fill="#24c9c5" opacity=".55"/></svg>`);}
function runwayOpponent(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><circle cx="60" cy="32" r="18" fill="#85513a"/><path d="M34 55 Q60 39 86 55 V112 H34Z" fill="#ef596f"/><path d="M44 110 L40 153 M76 110 L80 153" stroke="#202833" stroke-width="14"/></svg>`);}
function rival(d,s){return runwayOpponent(d,s);}
function groundCrew(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><circle cx="60" cy="30" r="18" fill="#7b4a2c"/><path d="M34 52 Q60 38 86 52 V112 H34Z" fill="#ffbe3d"/><path d="M34 67 H86" stroke="#fff" stroke-width="5"/><path d="M45 110 L42 153 M75 110 L78 153" stroke="#28333d" stroke-width="14"/></svg>`);}
function citizen(d,s){return groundCrew(d,s);}
function terminalBuilding(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120"><rect x="6" y="34" width="168" height="76" rx="10" fill="#596673"/><g fill="#d8eef4">${[0,1,2,3,4].map(i=>`<rect x="${20+i*30}" y="48" width="20" height="18"/>`).join('')}</g><rect x="70" y="70" width="40" height="40" fill="#202833"/><rect y="25" width="180" height="11" rx="5" fill="#24c9c5"/></svg>`);}
function genericBuilding(d,s){return terminalBuilding(d,s);}
function crosshair(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><circle cx="36" cy="36" r="17" fill="none" stroke="#24c9c5" stroke-width="4"/><path d="M36 4V20 M36 52V68 M4 36H20 M52 36H68" stroke="#fff" stroke-width="4"/></svg>`);}
function weapon(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="380" height="150"><path d="M40 78 L250 40 L330 62 L320 92 L220 104 L190 138 L135 138 L150 103 L42 108Z" fill="#1a2633" stroke="#6d8293" stroke-width="5"/><rect x="230" y="64" width="78" height="20" rx="6" fill="#24c9c5"/></svg>`);}
function hitFX(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90"><path d="M45 4 L55 30 L84 20 L66 45 L84 70 L55 60 L45 86 L35 60 L6 70 L24 45 L6 20 L35 30Z" fill="#24c9c5"/></svg>`);}
function finishGate(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="150" height="180"><rect x="15" y="18" width="18" height="150" rx="8" fill="#17283b"/><rect x="117" y="18" width="18" height="150" rx="8" fill="#17283b"/><rect x="24" y="18" width="102" height="22" rx="10" fill="#24c9c5"/><text x="75" y="34" text-anchor="middle" font-family="Arial" font-size="13" font-weight="bold">FINISH</text></svg>`);}
function musicNote(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><path d="M46 12 V43 Q46 56 34 56 Q22 56 22 47 Q22 37 34 37 Q39 37 41 40 V23 L57 18 V39" fill="#a2e845" stroke="#17283b" stroke-width="3"/></svg>`);}
function serviceCar(d,s){return carSvg('#24c9c5');}
function playerCar(d,s){return carSvg('#24c9c5');}
function baggageCart(d,s){return carSvg('#ffb13b');}
function trafficCar(d,s){return carSvg('#ff5d7d');}
function carSvg(color){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="110" height="160"><path d="M24 16 H86 L102 50 V132 L86 148 H24 L8 132 V50Z" fill="${color}"/><rect x="30" y="34" width="50" height="34" rx="8" fill="#16283a"/><rect x="24" y="84" width="62" height="32" rx="10" fill="#1c2632"/></svg>`);}
function cardBack(d,s){return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="130"><rect width="100" height="130" rx="16" fill="#17283b"/><path d="M20 30 L37 30 L50 43 L63 30 L80 30 L63 50 L80 70 L63 70 L50 57 L37 70 L20 70 L37 50Z" fill="#24c9c5"/><text x="50" y="110" text-anchor="middle" fill="#fff" font-family="Arial" font-size="14">PLX</text></svg>`);}
function cardFace(d,s,i){const cols=['#24c9c5','#a2e845','#ff7cc9','#ffd36e'];return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="130"><rect width="100" height="130" rx="16" fill="#fff"/><circle cx="50" cy="58" r="${22+i*3}" fill="${cols[i]}"/><path d="M28 100 H72" stroke="#17283b" stroke-width="6" stroke-linecap="round"/></svg>`);}
function rounded(x,a,b,w,h,r){x.beginPath();x.roundRect(a,b,w,h,r);}
