const $=s=>document.querySelector(s);
let imageDataUrl='',packet=null;
const file=$('#file'),preview=$('#preview'),run=$('#run'),status=$('#status');
function setStage(n){[1,2,3].forEach(i=>$(`#s${i}`).classList.toggle('live',i===n));}
function msg(t,kind=''){status.className=`status ${kind}`;status.textContent=t;}
function read(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});}
file.onchange=async()=>{const f=file.files?.[0];if(!f)return;imageDataUrl=await read(f);preview.src=imageDataUrl;preview.hidden=false;run.disabled=false;msg('Ready. The same image will be passed to all three Beasts.');};
async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const out=await r.json().catch(()=>({}));if(!r.ok||!out.ok)throw new Error(out.error||`${url} failed (${r.status})`);return out;}
run.onclick=async()=>{
 if(!imageDataUrl)return;
 run.disabled=true;$('#downloadPacket').disabled=true;packet=null;
 try{
  setStage(1);msg('Vision Beast: reading literal visual truth…');
  const vision=await post('/api/vision/analyze',{imageDataUrl,prompt:'Analyze literally first. This result will be handed to a separate game interpreter. Do not invent mechanics that are not visible.'});
  $('#visionCard').hidden=false;$('#visionSummary').textContent=vision.description||vision.analysis?.fullDescription||'Vision completed.';$('#visionJson').textContent=JSON.stringify(vision,null,2);

  setStage(2);msg('Interpreter Beast: translating visual truth into a playable model…');
  const interpreter=await post('/api/beasts/interpreter',{imageDataUrl,vision,userIntent:$('#intent').value,selectedEngine:$('#engine').value});
  $('#interpCard').hidden=false;const gi=interpreter.interpretation?.game_identity||{};$('#interpSummary').textContent=`${String(gi.engine||'unknown').toUpperCase()} · ${gi.subgenre||''}\n${gi.why||''}\n\n${interpreter.interpretation?.handoff_summary||''}`;$('#interpJson').textContent=JSON.stringify(interpreter,null,2);

  setStage(3);msg('Asset Manifest Beast: deciding extract vs rebuild vs extend vs synthesize…');
  const manifest=await post('/api/beasts/assets/manifest',{imageDataUrl,vision,interpretation:interpreter.interpretation,selectedEngine:$('#engine').value,userLocks:[]});
  $('#manifestCard').hidden=false;$('#manifestSummary').textContent=manifest.manifest?.handoff_summary||manifest.manifest?.production_strategy?.summary||'Manifest complete.';$('#manifestJson').textContent=JSON.stringify(manifest,null,2);
  const assets=$('#assets');assets.innerHTML='';for(const a of manifest.manifest?.assets||[]){const d=document.createElement('div');d.className='asset';d.innerHTML=`<b>${a.name||a.id}</b><small>${a.category||'asset'} · ${a.source_status||''}</small><span class="tag">${String(a.strategy||'').toUpperCase()}</span><p style="font-size:11px;line-height:1.4;color:#596d7b">${a.visual_spec||a.source_evidence||''}</p>`;assets.appendChild(d);}
  packet={createdAt:new Date().toISOString(),sourceFile:file.files?.[0]?.name||'',vision,interpreter:interpreter.interpretation,assetManifest:manifest.manifest};
  $('#downloadPacket').disabled=false;msg(`Pipeline complete: ${(manifest.manifest?.assets||[]).length} asset requirements planned.`, 'good');
 }catch(e){console.error(e);msg(e.message,'bad');}
 finally{run.disabled=false;}
};
$('#downloadPacket').onclick=()=>{if(!packet)return;const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='xplay-plx-dna-packet.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
