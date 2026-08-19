/* XPLAY Atlas Critic v4
 * Pixel-level consistency checks for generated contact sheets. It catches common AI sheet
 * failures: wildly different scale, blank cells, inconsistent background contamination and
 * near-duplicate frames before the atlas is accepted.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function stats(data,w,h){let n=0,minX=w,minY=h,maxX=0,maxY=0,lum=0,lum2=0;const colors=new Set();for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){const i=(y*w+x)*4,a=data[i+3];if(a<20)continue;const l=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];n++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);lum+=l;lum2+=l*l;colors.add(`${data[i]>>5},${data[i+1]>>5},${data[i+2]>>5}`);}const area=n?((maxX-minX+1)*(maxY-minY+1))/(w*h):0;const mean=n?lum/n:0;return {n,area,mean,var:n?Math.max(0,lum2/n-mean*mean):0,colors:colors.size};}
export async function critiqueGridDataUrl(dataUrl,cols=4,rows=4){
  if(!dataUrl)return {pass:false,score:0,issues:['missing sheet']};
  const img=new Image();img.src=dataUrl;await new Promise((r,j)=>{img.onload=r;img.onerror=j});const sw=Math.floor(img.naturalWidth/cols),sh=Math.floor(img.naturalHeight/rows);const cv=document.createElement('canvas');cv.width=sw;cv.height=sh;const x=cv.getContext('2d',{willReadFrequently:true});const cells=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){x.clearRect(0,0,sw,sh);x.drawImage(img,c*sw,r*sh,sw,sh,0,0,sw,sh);cells.push(stats(x.getImageData(0,0,sw,sh).data,sw,sh));}
  const active=cells.filter(c=>c.n>8);if(active.length<cols*rows*.85)return {pass:false,score:35,issues:[`blank/failed cells ${cols*rows-active.length}`],metrics:{active:active.length}};
  const areas=active.map(c=>c.area),means=active.map(c=>c.mean),colors=active.map(c=>c.colors);const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;const sd=a=>{const m=avg(a);return Math.sqrt(avg(a.map(v=>(v-m)**2)))};const areaCV=sd(areas)/(avg(areas)||1),lumCV=sd(means)/(avg(means)||1),colorCV=sd(colors)/(avg(colors)||1);
  const scaleConsistency=clamp(1-areaCV/.65),toneConsistency=clamp(1-lumCV/.55),styleConsistency=clamp(1-colorCV/.85);const diversity=clamp(sd(means)/28+sd(areas)/.18);const score=Math.round(100*(.34*scaleConsistency+.26*toneConsistency+.26*styleConsistency+.14*diversity));const issues=[];if(scaleConsistency<.58)issues.push('character/object scale varies too much between cells');if(styleConsistency<.55)issues.push('palette/style varies too much between cells');if(toneConsistency<.5)issues.push('lighting/background contamination varies too much');
  return {pass:score>=68&&issues.length===0,score,issues,metrics:{scaleConsistency:+scaleConsistency.toFixed(3),toneConsistency:+toneConsistency.toFixed(3),styleConsistency:+styleConsistency.toFixed(3),poseDiversity:+diversity.toFixed(3),activeCells:active.length}};
}
