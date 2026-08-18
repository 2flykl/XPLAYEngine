from pathlib import Path

p = Path('src/main.js')
s = p.read_text(encoding='utf-8')

# Match current AI-first markup IDs.
s = s.replace("const previewContainer=views.studio.querySelector('#sourcePreview');", "const previewContainer=views.studio.querySelector('#mediaPreview');")
s = s.replace("views.studio.querySelector('#buildStatus').textContent", "views.studio.querySelector('#statusMessage').textContent")

# Preserve backward-compatible primary source after multi-upload.
s = s.replace("state.media.push({file:f,dataUrl,type:f.type,role,analysis:null});", "state.media.push({file:f,dataUrl,type:f.type,role,analysis:null});\n      if(!state.dataUrl){ state.file=f; state.dataUrl=dataUrl; }")
s = s.replace("state.media=[];\n    previewContainer.innerHTML='';", "state.media=[]; state.file=null; state.dataUrl='';\n    if(previewContainer) previewContainer.innerHTML='';")
s = s.replace("previewContainer.appendChild(card);", "if(previewContainer) previewContainer.appendChild(card);")

# Never let removed legacy controls crash the whole app.
s = s.replace("views.studio.querySelector('#airportBtn').onclick=()=>{", "const airportBtn=views.studio.querySelector('#airportBtn'); if(airportBtn) airportBtn.onclick=()=>{")
s = s.replace("views.studio.querySelector('#makeBetterBtn').onclick=async()=>{", "const makeBetterBtn=views.studio.querySelector('#makeBetterBtn'); if(makeBetterBtn) makeBetterBtn.onclick=async()=>{")
s = s.replace("views.studio.querySelector('#buildBtn').onclick=async()=>{", "const buildBtn=views.studio.querySelector('#buildBtn'); if(buildBtn) buildBtn.onclick=async()=>{")
s = s.replace("views.studio.querySelector('#playGenerated').onclick=()=>studioProject&&launchManifest(studioProject.manifest);", "const playGenerated=views.studio.querySelector('#playGenerated'); if(playGenerated) playGenerated.onclick=()=>studioProject&&launchManifest(studioProject.manifest);")
s = s.replace("views.studio.querySelector('#exportGenerated').onclick=()=>studioProject&&exportPLX(studioProject);", "const exportGenerated=views.studio.querySelector('#exportGenerated'); if(exportGenerated) exportGenerated.onclick=()=>studioProject&&exportPLX(studioProject);")
s = s.replace("views.studio.querySelector('#saveCloud').onclick=async()=>{", "const saveCloud=views.studio.querySelector('#saveCloud'); if(saveCloud) saveCloud.onclick=async()=>{")
s = s.replace("['#playGenerated','#exportGenerated','#saveCloud'].forEach(q=>views.studio.querySelector(q).disabled=false);", "['#playGenerated','#exportGenerated','#saveCloud'].forEach(q=>{const el=views.studio.querySelector(q); if(el) el.disabled=false;});")

# Guard optional detail panels from legacy build code.
s = s.replace("views.studio.querySelector('#studioPlan').innerHTML=studioPlanHTML(plan);", "const studioPlanEl=views.studio.querySelector('#studioPlan'); if(studioPlanEl) studioPlanEl.innerHTML=studioPlanHTML(plan);")
s = s.replace("views.studio.querySelector('#direction').innerHTML=directionHTML(spec,options);", "const directionEl=views.studio.querySelector('#direction'); if(directionEl) directionEl.innerHTML=directionHTML(spec,options);")
s = s.replace("views.studio.querySelector('#qaReport').innerHTML=qaHTML(compiled.audit);", "const qaEl=views.studio.querySelector('#qaReport'); if(qaEl) qaEl.innerHTML=qaHTML(compiled.audit);")

# Wire ANALYZE MY IDEA for the current AI-first shell.
marker = "// New button bindings"
analyze_code = """
 const analyzeBtn=views.studio.querySelector('#analyzeBtn');
 if(analyzeBtn) analyzeBtn.onclick=async()=>{
   const status=views.studio.querySelector('#statusMessage');
   const text=(prompt?.value||'').trim();
   if(!text && !(state.media||[]).length){ if(status) status.textContent='Add an idea or upload media first.'; return; }
   try{
     if(status) status.textContent='XPLAY is reading your idea…';
     const q=text.toLowerCase();
     let engine='runner';
     if(/fight|battle|rival|punch|kick|duel/.test(q)) engine='fighting';
     else if(/shoot|gun|drone|enemy|target|fire/.test(q)) engine='fps';
     else if(/race|car|drive|speed|vehicle/.test(q)) engine='racing';
     else if(/jump|platform|roof|climb/.test(q)) engine='platformer';
     else if(/dodge|avoid|weave|falling/.test(q)) engine='dodge';
     else if(/collect|passport|run|runner|sprint|airport|runway/.test(q)) engine='runner';
     chosenEngine=engine;
     const label=(builtIns.find(x=>x[2]===engine)?.[3])||engine;
     const mediaCount=(state.media||[]).length;
     if(status) status.innerHTML=`<b>XPLAY recommends ${label}</b><br>${mediaCount?`I’m using ${mediaCount} uploaded file${mediaCount===1?'':'s'} as context. `:''}${text?`Your idea points toward ${label.toLowerCase()} gameplay.`:'I’ll use the uploaded media to shape the world.'}<br><button class="btn primary" id="buildRecommended" style="margin-top:10px">BUILD THIS</button>`;
     const buildRecommended=views.studio.querySelector('#buildRecommended');
     if(buildRecommended) buildRecommended.onclick=()=>{
       const demo=builtIns.find(x=>x[2]===engine);
       if(status) status.textContent=`Ready. Launching a ${label} proof-of-play while the full creator pipeline is being finished.`;
       if(demo) launchBuiltIn(demo[0]);
     };
   }catch(err){
     console.error('Creator analysis failed',err);
     if(status) status.textContent='XPLAY hit a snag understanding that. Try again or change one of the files.';
   }
 };
"""
if marker in s and "const analyzeBtn=views.studio.querySelector('#analyzeBtn');" not in s:
    s = s.replace(marker, analyze_code + "\n " + marker)

# Make Surprise Me safe when old result container is gone.
s = s.replace("views.studio.querySelector('#surpriseBtn').onclick=async()=>{", "const surpriseBtn=views.studio.querySelector('#surpriseBtn'); if(surpriseBtn) surpriseBtn.onclick=async()=>{")
s = s.replace("const resultsDiv=views.studio.querySelector('#surpriseResults');\n   resultsDiv.textContent='Generating surprise ideas…';", "const resultsDiv=views.studio.querySelector('#surpriseResults') || views.studio.querySelector('#statusMessage');\n   if(resultsDiv) resultsDiv.textContent='Generating surprise ideas…';")
s = s.replace("resultsDiv.innerHTML=ideas.map(formatSuggestion).join('<hr/>');", "if(resultsDiv) resultsDiv.innerHTML=ideas.map(formatSuggestion).join('<hr/>');")

p.write_text(s, encoding='utf-8')
print('Applied XPLAY live-stage creator repair')
