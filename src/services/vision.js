export async function analyzeVisualSource({imageDataUrl,prompt='',subjectHint='person'}){
  try{
    const r=await fetch('/api/vision/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({imageDataUrl,prompt,subjectHint})});
    if(!r.ok) throw new Error(await r.text());
    return await r.json();
  }catch(error){
    return {ok:false,error:error.message,analysis:{qualityScore:0,qualityLabel:'offline',warnings:['Python Visual Intelligence service is not running.']},assets:{}};
  }
}
export async function visionHealth(){
  try{const r=await fetch('/api/vision/health');return await r.json();}
  catch(e){return {ok:false,provider:'offline'};}
}
