/* XPLAY Level Composer v3
 * Constraint-driven level authoring. Uses seeded entropy, Poisson spacing and S-curve difficulty
 * instead of uniform random spawning.
 */
import { seeded, difficultyAt, reactionGap, poisson1D, entropyChoice, compositionScore } from './WorldMath.js';
import { solveTerrainStrip } from './TileWFC.js';
import { allocateProductionBudget } from './ProductionBudget.js';

const SECTION_NAMES=['intro','firstChallenge','combination','riskReward','signatureMoment','finalStretch','finish'];

export function composeRunnerLevel({seed='runner',length=7600,feel='action',speed=330,worldKit={}}={}){
  const rng=seeded(seed),history=[];const hazardKeys=worldKit.hazardKeys||['hazard'];const collectibleKeys=worldKit.collectibleKeys||['collectible'];const propKeys=worldKit.propKeys||[];
  const minGap=reactionGap(speed,feel==='challenge'?520:650,1.08);
  const hazardXs=poisson1D(length-900,minGap,{seed:`${seed}:hazards`,start:650,end:length-450});
  const sections=[];const placements={hazards:[],collectibles:[],props:[],events:[]};const productionBudget=allocateProductionBudget(100);
  const bounds=[0,.12,.27,.45,.62,.76,.92,1];
  for(let s=0;s<7;s++)sections.push({name:SECTION_NAMES[s],start:Math.round(bounds[s]*length),end:Math.round(bounds[s+1]*length)});
  hazardXs.forEach((x,i)=>{const progress=x/length,d=difficultyAt(progress,feel);if(rng()>.34+d*.62)return;const key=entropyChoice(hazardKeys,history,rng);history.push(key);placements.hazards.push({x,y:500,key,speed:-(speed+25+d*105),difficulty:d});});
  // Collectible trails are authored in arcs ahead of and between hazards, teaching safe motion lines.
  for(let base=360;base<length-300;base+=420+Math.round(rng()*160)){
    const progress=base/length,d=difficultyAt(progress,feel),count=4+Math.floor(d*4),amp=35+d*80;
    for(let i=0;i<count;i++){const t=i/Math.max(1,count-1),x=base+i*54,y=360-Math.sin(t*Math.PI)*amp;placements.collectibles.push({x,y,key:collectibleKeys[(Math.floor(progress*9)+i)%collectibleKeys.length],premium:d>.7&&i===Math.floor(count/2)});}
  }
  const propXs=poisson1D(length-200,118,{seed:`${seed}:props`,start:100,end:length-100});
  propXs.forEach((x,i)=>{if(!propKeys.length)return;placements.props.push({x,y:490-(i%4)*14,key:propKeys[(i*5+Math.floor(rng()*propKeys.length))%propKeys.length],scale:.42+(i%3)*.06});});
  placements.events.push({type:'signature',x:Math.round(length*.68),budget:productionBudget.signatureMoment});placements.events.push({type:'finish',x:length-190,budget:productionBudget.finish});
  const score=compositionScore({occupancy:.64,variety:Math.min(1,(new Set([...hazardKeys,...propKeys])).size/18),depth:.9,saliency:.88,repetition:.14});
  return {version:4,length,sections,placements,productionBudget,metrics:{compositionScore:Math.round(score),minReactionGap:Math.round(minGap)}};
}

export function composePlatformerLevel({seed='platformer',length=4200,feel='action',worldKit={}}={}){
  const rng=seeded(seed),terrain=worldKit.terrainKeys||['platform'],props=worldKit.propKeys||[],collectibles=worldKit.collectibleKeys||['collectible'],enemies=worldKit.enemyKeys||['enemy'];
  const sections=[];const platforms=[];const items=[];const foes=[];const dressing=[];const productionBudget=allocateProductionBudget(100);
  const bounds=[0,.12,.27,.45,.62,.76,.92,1];
  for(let s=0;s<7;s++)sections.push({name:SECTION_NAMES[s],start:Math.round(bounds[s]*length),end:Math.round(bounds[s+1]*length)});
  // Ground grammar: varied runs and purposeful gaps, with difficulty driving gap width and elevation.
  let x=0,ti=0;
  while(x<length){const p=x/length,d=difficultyAt(p,feel),run=260+Math.round(rng()*380*(1-d*.35)),gap=p<.1?28:55+Math.round(rng()*(85+d*90)),y=548-(rng()<.22?Math.round(30+rng()*55):0);const tileCount=Math.max(1,Math.ceil(Math.min(run,length-x)/124));const tileSequence=solveTerrainStrip(terrain,tileCount,{seed:`${seed}:ground:${ti}`});platforms.push({x,len:Math.min(run,length-x),y,keyOffset:ti,tileSequence});ti+=tileCount;x+=run+gap;}
  // Alternate route ledges follow a smooth wave rather than arbitrary coordinates.
  for(let lx=430,i=0;lx<length-300;lx+=290+Math.round(rng()*170),i++){const p=lx/length,d=difficultyAt(p,feel);const y=420-Math.sin(p*Math.PI*2.4)*70-d*80;const altLen=130+(i%3)*70, altTiles=solveTerrainStrip(terrain,Math.max(1,Math.ceil(altLen/124)),{seed:`${seed}:alt:${i}`});platforms.push({x:lx,len:altLen,y,keyOffset:8+i,alternate:true,tileSequence:altTiles});for(let j=0;j<3+(i%3);j++)items.push({x:lx+35+j*46,y:y-62-Math.sin(j/3*Math.PI)*28,key:collectibles[(i+j)%collectibles.length]});}
  const enemyXs=poisson1D(length-900,390,{seed:`${seed}:enemies`,start:620,end:length-320});enemyXs.forEach((ex,i)=>foes.push({x:ex,y:440,key:enemies[i%enemies.length],vx:i%2?72:-72}));
  const propXs=poisson1D(length-100,135,{seed:`${seed}:dressing`,start:80,end:length-80});propXs.forEach((px,i)=>{if(props.length)dressing.push({x:px,y:492-(i%5)*12,key:props[(i*7)%props.length],scale:.42+(i%4)*.04});});
  const score=compositionScore({occupancy:.68,variety:Math.min(1,(terrain.length+props.length+enemies.length)/36),depth:.9,saliency:.86,repetition:.12});
  return {version:4,length,sections,platforms,items,foes,dressing,productionBudget,signatureX:Math.round(length*.63),finishX:length-130,metrics:{compositionScore:Math.round(score),wfc:true}};
}
