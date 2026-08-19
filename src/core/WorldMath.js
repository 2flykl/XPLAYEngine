/* XPLAY World Math v3
 * Deterministic composition math for authored-looking generated PLXs.
 * The goal is not randomness; it is controlled variation, pacing and readable density.
 */

export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export const logistic=(x,k=8,x0=.5)=>1/(1+Math.exp(-k*(x-x0)));

export function hashString(input='xplay'){
  let h=2166136261>>>0;
  for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}

export function mulberry32(seed){
  let a=seed>>>0;
  return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};
}

export function seeded(seedLike='xplay'){
  return mulberry32(typeof seedLike==='number'?seedLike:hashString(String(seedLike)));
}

function hash2(x,y,seed=0){
  let h=Math.imul((x|0)^seed,374761393)+Math.imul(y|0,668265263);
  h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967295;
}

export function valueNoise2D(x,y,seed=0){
  const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const sx=xf*xf*(3-2*xf),sy=yf*yf*(3-2*yf);
  const n00=hash2(xi,yi,seed),n10=hash2(xi+1,yi,seed),n01=hash2(xi,yi+1,seed),n11=hash2(xi+1,yi+1,seed);
  return lerp(lerp(n00,n10,sx),lerp(n01,n11,sx),sy);
}

export function fbm2D(x,y,{octaves=5,lacunarity=2,gain=.5,seed=0}={}){
  let amp=.5,freq=1,sum=0,norm=0;
  for(let i=0;i<octaves;i++){sum+=valueNoise2D(x*freq,y*freq,seed+i*1013)*amp;norm+=amp;freq*=lacunarity;amp*=gain;}
  return norm?sum/norm:0;
}

// Difficulty is deliberately S-curved: generous teaching window, fast middle escalation, soft cap.
export function difficultyAt(progress,feel='action'){
  const profiles={relaxed:{k:4,max:.68},story:{k:5,max:.72},exploration:{k:5,max:.76},rhythm:{k:7,max:.9},challenge:{k:10,max:1},action:{k:8,max:.94}};
  const p=profiles[feel]||profiles.action;
  return .12+p.max*logistic(clamp(progress),p.k,.54);
}

// Reaction-safe obstacle gap in pixels. Faster games automatically create wider recognition windows.
export function reactionGap(speedPxPerSec,reactionMs=620,safety=1.22){
  return Math.max(96,(speedPxPerSec*(reactionMs/1000))*safety);
}

// 1D Poisson-disc sampler: natural spacing without the obvious grid/repetition of x += constant.
export function poisson1D(length,minGap,{seed='xplay',start=0,end=length,maxAttempts=5000}={}){
  const rng=seeded(seed),pts=[];let attempts=0;
  while(attempts++<maxAttempts){
    const p=start+rng()*Math.max(0,end-start);
    if(pts.every(q=>Math.abs(p-q)>=minGap))pts.push(p);
    if(pts.length>=Math.floor((end-start)/minGap*.82))break;
  }
  return pts.sort((a,b)=>a-b);
}

// Weighted choice penalizes recent repetition, approximating maximum-entropy asset selection.
export function entropyChoice(items,history=[],rng=Math.random){
  if(!items?.length)return null;
  const recent=new Map();history.slice(-6).forEach((v,i)=>recent.set(v,(recent.get(v)||0)+(i+1)));
  const weights=items.map(v=>1/(1+(recent.get(v)||0)*1.7));
  const total=weights.reduce((a,b)=>a+b,0);let r=rng()*total;
  for(let i=0;i<items.length;i++){r-=weights[i];if(r<=0)return items[i];}
  return items[items.length-1];
}

// Composition score used by LevelComposer to reject visually dead candidate sections.
export function compositionScore({occupancy=.5,variety=.5,depth=.5,saliency=.5,repetition=.5}={}){
  const occ=1-Math.min(1,Math.abs(occupancy-.62)/.62); // sweet spot near 62% occupied visual field
  return 100*(.27*occ+.23*clamp(variety)+.18*clamp(depth)+.20*clamp(saliency)+.12*(1-clamp(repetition)));
}

export function parallaxFactor(depthIndex,totalLayers=5,gamma=1.55){
  const z=clamp(depthIndex/Math.max(1,totalLayers-1));
  return Math.pow(1-z,gamma);
}
