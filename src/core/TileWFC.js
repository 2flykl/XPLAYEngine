/* XPLAY Tile WFC v4
 * Constraint solver for terrain adjacency. It prevents visually rich tiles from being
 * assembled as a collage by solving a compatible tile strip/grid before placement.
 */
import { seeded } from './WorldMath.js';

const DEFAULT_SEMANTICS = [
  ['center','flat','flat'],['left-edge','void','flat'],['right-edge','flat','void'],['inner-corner','flat','flat'],
  ['outer-corner','flat','flat'],['slope-up','low','high'],['slope-down','high','low'],['ramp','low','high'],
  ['thin-platform','void','void'],['wide-platform','flat','flat'],['bridge','flat','flat'],['ledge','flat','void'],
  ['wall','wall','wall'],['overhang','flat','flat'],['moving-platform','void','void'],['checkpoint','flat','flat'],
  ['finish','flat','flat'],['alternate-material','flat','flat'],['decal-a','flat','flat'],['decal-b','flat','flat'],
  ['damaged-a','flat','flat'],['damaged-b','flat','flat'],['special','flat','flat'],['center-alt','flat','flat']
];

function compatible(a,b){
  if(!a||!b)return true;
  const ar=a.right, bl=b.left;
  if(ar==='void'||bl==='void') return ar===bl;
  if(ar==='wall'||bl==='wall') return ar===bl;
  if(ar==='high') return bl==='high'||bl==='flat';
  if(ar==='low') return bl==='low'||bl==='flat';
  return bl==='flat'||bl===ar;
}

export function buildTerrainCatalog(keys=[]){
  return keys.map((key,i)=>{
    const [name,left,right]=DEFAULT_SEMANTICS[i%DEFAULT_SEMANTICS.length];
    return {key,name,left,right,weight:['center','wide-platform','alternate-material','decal-a','decal-b','damaged-a','damaged-b','center-alt'].includes(name)?4:1};
  });
}

function weightedPick(options,rng){
  let total=options.reduce((s,o)=>s+(o.weight||1),0),r=rng()*total;
  for(const o of options){r-=o.weight||1;if(r<=0)return o;}return options[options.length-1];
}

export function solveTerrainStrip(keys=[],count=24,{seed='xplay-wfc',start='flat',end='flat'}={}){
  const catalog=buildTerrainCatalog(keys);if(!catalog.length)return [];
  const rng=seeded(seed),cells=Array.from({length:count},()=>catalog.slice());
  const boundaryOk=(cell,index)=>cell.filter(t=>(index!==0||t.left===start||t.left==='flat')&&(index!==count-1||t.right===end||t.right==='flat'));
  cells[0]=boundaryOk(cells[0],0);cells[count-1]=boundaryOk(cells[count-1],count-1);
  for(let i=0;i<count;i++){
    const left=i?cells[i-1][0]:null;
    let candidates=cells[i].filter(t=>!left||compatible(left,t));
    if(!candidates.length)candidates=catalog.filter(t=>!left||compatible(left,t));
    // Penalize obvious repetition while keeping WFC compatibility.
    const recent=cells.slice(Math.max(0,i-4),i).map(c=>c[0]?.key);
    candidates=candidates.map(t=>({...t,weight:(t.weight||1)/(1+recent.filter(k=>k===t.key).length*2.4)}));
    const chosen=weightedPick(candidates,rng)||catalog[0];cells[i]=[chosen];
    if(i+1<count)cells[i+1]=cells[i+1].filter(t=>compatible(chosen,t));
  }
  return cells.map(c=>c[0]?.key||catalog[0].key);
}

export function solveTerrainGrid(keys=[],width=16,height=6,{seed='xplay-grid'}={}){
  const rng=seeded(seed),catalog=buildTerrainCatalog(keys),grid=Array.from({length:height},()=>Array(width).fill(null));
  if(!catalog.length)return grid;
  for(let y=0;y<height;y++){
    const strip=solveTerrainStrip(keys,width,{seed:`${seed}:${y}`});
    for(let x=0;x<width;x++)grid[y][x]=strip[x]||catalog[Math.floor(rng()*catalog.length)].key;
  }
  return grid;
}
