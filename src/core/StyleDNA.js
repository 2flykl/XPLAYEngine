export async function analyzeImageStyle(dataUrl){
  if(!dataUrl) return fallbackDNA();
  try{
    const img = await loadImage(dataUrl, 4000);
    const c = document.createElement('canvas');
    c.width = 96; c.height = 96;
    const x = c.getContext('2d', { willReadFrequently:true });
    if(!x) return fallbackDNA('canvas-unavailable');
    x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0,0,c.width,c.height).data;

    const bins = new Map();
    let lum=0, saturation=0, samples=0;
    for(let i=0;i<d.length;i+=16){
      const r=d[i], g=d[i+1], b=d[i+2];
      const qr=Math.round(r/48)*48, qg=Math.round(g/48)*48, qb=Math.round(b/48)*48;
      const key=`${Math.min(255,qr)},${Math.min(255,qg)},${Math.min(255,qb)}`;
      bins.set(key,(bins.get(key)||0)+1);
      const max=Math.max(r,g,b), min=Math.min(r,g,b);
      lum += (r+g+b)/(3*255);
      saturation += max===0 ? 0 : (max-min)/max;
      samples++;
    }
    if(!samples) return fallbackDNA('no-samples');
    const palette=[...bins.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>{
      const [r,g,b]=k.split(',').map(Number);
      return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
    });
    while(palette.length<5) palette.push(['#0d223d','#24c9c5','#eef7f6','#b7ef4b','#ffffff'][palette.length]);

    const brightness=lum/samples;
    const sat=saturation/samples;
    return {
      palette,
      brightness:Number(brightness.toFixed(2)),
      saturation:Number(sat.toFixed(2)),
      mood: brightness<.35 ? 'moody' : brightness>.7 ? 'bright' : sat>.55 ? 'vibrant' : 'balanced',
      texture: sat>.55 ? 'bold-color' : 'soft-tonal',
      source:'browser-analysis'
    };
  } catch(error){
    console.warn('StyleDNA analysis fell back safely:', error);
    return fallbackDNA('analysis-fallback');
  }
}
function loadImage(src, timeoutMs=4000){
  return new Promise((resolve,reject)=>{
    const i=new Image();
    let settled=false;
    const timer=setTimeout(()=>{
      if(settled) return;
      settled=true;
      reject(new Error('StyleDNA image load timeout'));
    }, timeoutMs);
    i.onload=()=>{
      if(settled) return;
      settled=true;
      clearTimeout(timer);
      resolve(i);
    };
    i.onerror=()=>{
      if(settled) return;
      settled=true;
      clearTimeout(timer);
      reject(new Error('StyleDNA image load failed'));
    };
    i.src=src;
  });
}
function fallbackDNA(source='fallback'){return {palette:['#0d223d','#24c9c5','#eef7f6','#b7ef4b','#ffffff'],brightness:.5,saturation:.5,mood:'balanced',texture:'clean',source};}
