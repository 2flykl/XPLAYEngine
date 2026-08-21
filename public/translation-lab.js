
const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://localhost:8787'
  : 'https://xplay-api-246473132693.us-central1.run.app';

const $ = (s)=>document.querySelector(s);
let imageDataUrl = '';
let lastPacket = null;

$('#imageFile').addEventListener('change', async (e)=>{
  const f = e.target.files?.[0];
  if (!f) return;
  imageDataUrl = await new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(f);
  });
  $('#preview').src = imageDataUrl;
  $('#previewWrap').hidden = false;
});

$('#runBtn').addEventListener('click', async ()=>{
  const analysis = $('#analysis').value.trim();
  if (analysis.length < 20) return setStatus('Paste the detailed Vision analysis first.', true);

  setStatus('Running Interpreter Beast…');
  $('#runBtn').disabled = true;
  $('#results').hidden = true;

  try {
    const r = await fetch(`${API}/api/beasts/translation/run`, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        analysis,
        imageDataUrl,
        selectedEngine: $('#engine').value,
        userIntent: $('#intent').value.trim(),
        mustKeep: $('#mustKeep').value.trim()
      })
    });
    const out = await r.json().catch(()=>({}));
    if (!r.ok || !out.ok) throw new Error(out.error || `HTTP ${r.status}`);

    lastPacket = out;
    $('#interpreter').textContent = JSON.stringify(out.interpreter,null,2);
    $('#assets').textContent = JSON.stringify(out.assetManifest,null,2);
    $('#builder').textContent = JSON.stringify(out.builderPacket,null,2);
    $('#results').hidden = false;
    setStatus('All 3 translation packets created successfully.');
  } catch(e) {
    setStatus(e.message || String(e), true);
  } finally {
    $('#runBtn').disabled = false;
  }
});

$('#downloadBtn').addEventListener('click', ()=>{
  if(!lastPacket) return;
  const blob = new Blob([JSON.stringify(lastPacket,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='xplay-playable-translation-packet.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

function setStatus(msg, bad=false){
  const el=$('#status');
  el.textContent=msg;
  el.className=bad?'status bad':'status';
}
