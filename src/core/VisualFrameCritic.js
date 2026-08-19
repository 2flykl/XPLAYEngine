/* Actual rendered-frame critic. Unlike manifest heuristics, this samples pixels from the Phaser canvas.
 * Metrics are intentionally model-free so they work offline on GitHub Pages.
 */
import { clamp } from './WorldMath.js';
import { visualObjective } from './ReferenceTargetModel.js';

function entropy(hist,total){let h=0;for(const n of hist){if(!n)continue;const p=n/total;h-=p*Math.log2(p);}return h;}

export function analyzeRenderedCanvas(canvas,{sample=4}={}){
  if(!canvas?.width||!canvas?.height)return {pass:false,error:'No render canvas'};
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return {pass:false,error:'Canvas pixels unavailable'};
  const {width:w,height:h}=canvas;let data;try{data=ctx.getImageData(0,0,w,h).data}catch{return {pass:false,error:'Frame is not pixel-readable'}}
  const hist=new Array(32).fill(0),colorBins=new Set(),cells=Array.from({length:48},()=>({n:0,sum:0,sum2:0}));
  let n=0,edges=0,varSum=0,mean=0,mean2=0,transparent=0;
  const lumAt=(x,y)=>{const i=(y*w+x)*4;return .2126*data[i]+.7152*data[i+1]+.0722*data[i+2]};
  for(let y=0;y<h;y+=sample)for(let x=0;x<w;x+=sample){const i=(y*w+x)*4,a=data[i+3];if(a<12){transparent++;continue;}const r=data[i],g=data[i+1],b=data[i+2],l=.2126*r+.7152*g+.0722*b;hist[Math.min(31,l>>3)]++;colorBins.add(`${r>>5},${g>>5},${b>>5}`);mean+=l;mean2+=l*l;n++;const cx=Math.min(7,Math.floor(x/w*8)),cy=Math.min(5,Math.floor(y/h*6)),cell=cells[cy*8+cx];cell.n++;cell.sum+=l;cell.sum2+=l*l;if(x+sample<w&&Math.abs(l-lumAt(x+sample,y))>24)edges++;if(y+sample<h&&Math.abs(l-lumAt(x,y+sample))>24)edges++;}
  if(!n)return {pass:false,error:'Empty rendered frame'};mean/=n;mean2/=n;const variance=Math.max(0,mean2-mean*mean);const edgeDensity=edges/(n*2);const luminanceEntropy=entropy(hist,n)/5;
  let activeCells=0,cellVariation=0;for(const c of cells){if(c.n<3)continue;const m=c.sum/c.n,v=Math.max(0,c.sum2/c.n-m*m);if(v>120){activeCells++;cellVariation+=Math.min(1,v/1800);}}
  const occupancy=activeCells/cells.length,spatialComplexity=cellVariation/cells.length,colorDiversity=clamp(colorBins.size/120);
  const rowActivity=[0,0,0,0,0,0],colActivity=[0,0,0,0,0,0,0,0];cells.forEach((c,i)=>{if(c.n<3)return;const m=c.sum/c.n,v=Math.max(0,c.sum2/c.n-m*m),a=Math.min(1,v/1600);rowActivity[Math.floor(i/8)]+=a;colActivity[i%8]+=a;});
  const foregroundActivity=clamp((rowActivity[4]+rowActivity[5])/16),midActivity=clamp((rowActivity[2]+rowActivity[3])/16),backgroundActivity=clamp((rowActivity[0]+rowActivity[1])/16);
  const depthBalance=clamp(1-(Math.max(foregroundActivity,midActivity,backgroundActivity)-Math.min(foregroundActivity,midActivity,backgroundActivity))/.7);
  const structuredEntropy=clamp(luminanceEntropy*(.55+.45*depthBalance));
  // Prototype-likeness rises with low detail, low occupancy, shallow layer balance and tiny palette diversity.
  const prototypeLikeness=clamp(1-(.23*structuredEntropy+.24*clamp(edgeDensity/.16)+.20*clamp(occupancy/.72)+.17*colorDiversity+.16*depthBalance));
  const score=Math.round(100*(.20*structuredEntropy+.22*clamp(edgeDensity/.16)+.21*clamp(occupancy/.72)+.14*colorDiversity+.11*clamp(spatialComplexity/.5)+.12*depthBalance));
  const qualityObjective=visualObjective({sceneEntropy:structuredEntropy,composition:clamp((occupancy+spatialComplexity)/1.2),artCoherence:clamp((colorDiversity+depthBalance)/2),depth:depthBalance,motion:.65,landmark:.7,novelty:colorDiversity,repetition:clamp(1-spatialComplexity),prototype:prototypeLikeness,readability:clamp(edgeDensity/.12)});
  return {pass:score>=72&&prototypeLikeness<=.32&&qualityObjective>=55,score,qualityObjective,metrics:{luminanceEntropy:+luminanceEntropy.toFixed(3),structuredEntropy:+structuredEntropy.toFixed(3),edgeDensity:+edgeDensity.toFixed(3),occupancy:+occupancy.toFixed(3),spatialComplexity:+spatialComplexity.toFixed(3),colorDiversity:+colorDiversity.toFixed(3),depthBalance:+depthBalance.toFixed(3),foregroundActivity:+foregroundActivity.toFixed(3),midActivity:+midActivity.toFixed(3),backgroundActivity:+backgroundActivity.toFixed(3),prototypeLikeness:+prototypeLikeness.toFixed(3),luminanceVariance:Math.round(variance),transparentRatio:+(transparent/(transparent+n)).toFixed(3)}};
}
