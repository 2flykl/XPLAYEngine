const engineDefs = {
  runner:{name:'Runner',template:'adaptive-runner',camera:'side',objective:'Reach the finish while collecting target items',keywords:/run|runner|sprint|chase|forward/},
  dodge:{name:'Dodge',template:'adaptive-dodge',camera:'top-down',objective:'Survive the hazard sequence',keywords:/dodge|avoid|escape|falling|hazard/},
  collect:{name:'Collect',template:'adaptive-collect',camera:'top-down',objective:'Collect all target items',keywords:/collect|gather|find|hunt|relic|item/},
  rhythm:{name:'Rhythm',template:'adaptive-rhythm',camera:'fixed',objective:'Hit cues on timing and build score',keywords:/rhythm|beat|music|song|tempo|drum|dance/},
  puzzle:{name:'Puzzle',template:'adaptive-puzzle',camera:'fixed',objective:'Complete the puzzle',keywords:/puzzle|connect|match|memory|solve|thought|sequence/},
  fps:{name:'First-Person Shooter',template:'adaptive-fps',camera:'first-person',objective:'Clear the enemy wave',keywords:/first person|fps|shooter|shoot|target|blaster/},
  fighting:{name:'Fighting',template:'adaptive-fighter',camera:'side',objective:'Defeat the rival fighter',keywords:/fight|fighting|boxing|martial|karate|versus|1v1|duel|beat-em-up|brawler/},
  openworld:{name:'Open World',template:'adaptive-openworld',camera:'top-down',objective:'Explore the world and complete the quest',keywords:/open world|free roam|free-roam|quest|npc|sandbox/},
  racing:{name:'Racing',template:'adaptive-racing',camera:'top-down',objective:'Reach the finish line',keywords:/race|racing|drive|driving|car|vehicle/},
  platformer:{name:'Platformer',template:'adaptive-platformer',camera:'side',objective:'Reach the level goal',keywords:/platformer|platform game|jump across|side scroll|side-view/}
};

export function localDirect(prompt='', styleDNA={}, options={}) {
  const p = String(prompt || '').toLowerCase();
  const requested = options.selectedEngine && engineDefs[options.selectedEngine] ? options.selectedEngine : '';
  let engine = requested;

  if(!engine){
    engine='runner';
    for(const [id,def] of Object.entries(engineDefs)){
      if(def.keywords.test(p)){ engine=id; break; }
    }
  }

  const def=engineDefs[engine];
  const currentEnvironment = options.visualAnalysis?.environment || inferWorld(p,engine);

  return {
    title: options.manualTitle || makeFreshTitle(prompt,engine,options.visualAnalysis),
    engine,
    engineName:def.name,
    template:def.template,
    camera:def.camera,
    objective:def.objective,
    playerRole: options.useSubject===false ? 'AI-created hero' : 'Primary subject / upload-derived hero',
    environment:currentEnvironment,
    collectibles:defaultCollectible(engine),
    hazards:defaultHazard(engine),
    artDirection:`${options.styleName || 'Cinematic Photo'} using ${styleDNA.mood || 'balanced'} source DNA`,
    duration:['openworld','platformer'].includes(engine)?75:55,
    difficulty:options.difficulty || 'medium',
    scenePlan:[
      'Cold-open with immediate player and objective readability',
      'World geometry reconstructed from the current upload',
      'Primary mechanic introduced in the first 5 seconds',
      'Escalating challenge/reward rhythm',
      'Signature gameplay event',
      'Readable finish / victory state'
    ],
    assetPrompts:{
      player:'clean isolated source-derived arcade hero with consistent silhouette',
      background:'reconstruct CURRENT source environment into game-ready depth layers',
      collectible:'high-readability collectible derived from CURRENT source grammar',
      hazard:'current-source-aware obstacle with clean game silhouette',
      effect:'arcade impact, pickup, movement, and success effects'
    },
    polish:['parallax','camera easing','impact feedback','particle accents','arcade HUD','quality-gated extraction'],
    sourceBound:true,
    options,
    directorMode:options.mode==='custom'?'custom-local':'ai-local'
  };
}

function defaultCollectible(e){
  return ({runner:'shards',dodge:'boosts',collect:'relics',rhythm:'beat notes',puzzle:'idea cards',fps:'intel chips',fighting:'combo energy',openworld:'quest relics',racing:'boost tokens',platformer:'gems'})[e];
}
function defaultHazard(e){
  return ({runner:'obstacles',dodge:'moving hazards',collect:'patrol hazards',rhythm:'miss timing',puzzle:'wrong matches',fps:'enemy targets',fighting:'rival attacks',openworld:'hostile patrols',racing:'traffic',platformer:'enemies'})[e];
}
function inferWorld(p,e){
  if(e==='fighting') return 'side-view combat arena derived from the current source';
  if(e==='fps') return 'first-person action zone derived from the current source';
  if(e==='openworld') return 'free-roam world derived from the current source';
  if(e==='racing') return 'high-speed circuit derived from the current source';
  if(e==='platformer') return 'layered side-scrolling level derived from the current source';
  if(/city|street|roof/.test(p)) return 'stylized city derived from the current source';
  if(/forest|tree|grove|nature/.test(p)) return 'organic nature world derived from the current source';
  if(/sky|cloud|fly/.test(p)) return 'floating sky world derived from the current source';
  if(/space|planet|star/.test(p)) return 'space world derived from the current source';
  return 'world derived from the current uploaded media';
}
function makeFreshTitle(prompt,e,analysis={}){
  const env=String(analysis?.environment||'').replace(/\b(an?|the)\b/gi,'').trim();
  const genreNames={runner:'Rush',dodge:'Escape',collect:'Quest',rhythm:'Beat',puzzle:'Grid',fps:'Zero',fighting:'Clash',openworld:'District',racing:'Circuit',platformer:'Run'};
  const safeEnv=env.split(/\s+/).filter(Boolean).slice(0,2).join(' ');
  if(safeEnv) return `${titleCase(safeEnv)} ${genreNames[e]||'PLX'}`.trim();
  const clean=String(prompt||'').replace(/\[[^\]]+\]/g,' ').replace(/\bXPLAY\b/gi,' ').trim().split(/\s+/).slice(0,3).join(' ');
  return clean ? titleCase(clean) : `New ${engineDefs[e]?.name || 'PLX'}`;
}
function titleCase(s){return String(s).replace(/\b\w/g,c=>c.toUpperCase());}
