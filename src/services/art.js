export async function remasterAsset({imageDataUrl,role='player',style='premium arcade',prompt=''}){
  try{
    const r=await fetch('/api/remaster-asset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({imageDataUrl,role,style,prompt})});
    if(!r.ok){const j=await r.json().catch(()=>({}));return {ok:false,error:j.error||'Remaster unavailable'};}
    return await r.json();
  }catch(error){return {ok:false,error:error.message};}
}
