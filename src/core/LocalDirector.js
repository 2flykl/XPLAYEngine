
const engineDefs = {
  runner:{
    name:'Runner', template:'adaptive-runner', camera:'side',
    objective:'Reach the finish while collecting target items',
    keywords:/run|runner|sprint|chase|forward/
  },
  dodge:{
    name:'Dodge', template:'adaptive-dodge', camera:'top-down',
    objective:'Survive the hazard sequence',
    keywords:/dodge|avoid|escape|falling|hazard/
  },
  collect:{
    name:'Collect', template:'adaptive-collect', camera:'top-down',
    objective:'Collect all target items',
    keywords:/collect|gather|find|hunt|relic|item/
  },
  rhythm:{
    name:'Rhythm', template:'adaptive-rhythm', camera:'fixed',
    objective:'Hit cues on timing and build score',
    keywords:/rhythm|beat|music|song|tempo|drum|dance/
  },
  puzzle:{
    name:'Puzzle', template:'adaptive-puzzle', camera:'fixed',
    objective:'Complete the puzzle',
    keywords:/puzzle|connect|match|memory|solve|thought|sequence/
  },
  fps:{
    name:'First-Person Shooter', template:'adaptive-fps', camera:'first-person',
    objective:'Clear the enemy wave',
    keywords:/first person|fps|shooter|shoot|target|blaster/
  },
  fighting:{
    name:'Fighting', template:'adaptive-fighter', camera:'side',
    objective:'Defeat the rival fighter',
    keywords:/fight|fighting|boxing|martial|versus|1v1|duel/
  },
  openworld:{
    name:'Open World', template:'adaptive-openworld', camera:'top-down',
    objective:'Explore the world and complete the quest',
    keywords:/open world|free roam|free-roam|quest|npc|sandbox/
  },
  racing:{
    name:'Racing', template:'adaptive-racing', camera:'top-down',
    objective:'Reach the finish line',
    keywords:/race|racing|drive|driving|car|vehicle/
  },
  platformer:{
    name:'Platformer', template:'adaptive-platformer', camera:'side',
    objective:'Reach the level goal',
    keywords:/platformer|platform game|jump across|side scroll/
  }
};

export function localDirect(prompt='', styleDNA={}, options={}) {
  const p = prompt.toLowerCase();
  const requested = options.selectedEngine && engineDefs[options.selectedEngine] ? options.selectedEngine : '';
  let engine = requested;

  if(!engine){
    engine = 'runner';
    for(const [id,def] of Object.entries(engineDefs)){
      if(def.keywords.test(p)){ engine=id; break; }
    }
  }

  const airport = /airport|airfield|plane|jet|runway|boarding|terminal|pilot|flight|hangar/.test(p) || options.airportHint;
  const def = engineDefs[engine];

  return {
    title: options.manualTitle || makeTitle(prompt,engine,airport),
    engine,
    engineName:def.name,
    template:def.template,
    camera:def.camera,
    objective:def.objective,
    playerRole: options.useSubject===false ? 'AI-created hero' : 'Primary subject / upload-derived hero',
    environment: airport ? airportWorld(engine) : inferWorld(p,engine),
    collectibles: airport ? airportCollectible(engine) : defaultCollectible(engine),
    hazards: airport ? airportHazard(engine) : defaultHazard(engine),
    artDirection: `${options.styleName || 'Cinematic Photo'} using ${styleDNA.mood || 'balanced'} source DNA`,
    duration:['openworld','platformer'].includes(engine)?75:55,
    difficulty:options.difficulty || 'medium',
    scenePlan:[
      'Cold-open title sting with immediate player readability',
      'Layered environment with foreground occlusion and parallax',
      'Primary mechanic introduced in first 5 seconds',
      'Escalating hazard/collectible rhythm',
      'Mid-run visual event or camera beat',
      'High-contrast finish / victory presentation'
    ],
    assetPrompts:{
      player:'clean isolated source-derived arcade hero with consistent silhouette',
      background:'reconstructed source environment split into cinematic depth layers',
      collectible:'themed high-readability collectible derived from source objects',
      hazard:'source-aware obstacle with clean game silhouette',
      effect:'arcade impact, pickup, speed, and success effects'
    },
    polish:['parallax','camera easing','impact feedback','particle accents','arcade HUD','quality-gated extraction'],
    airportTheme:airport,
    options,
    directorMode: options.mode==='custom' ? 'custom-local' : 'ai-local'
  };
}

function defaultCollectible(e){
  return ({
    runner:'shards',dodge:'boosts',collect:'relics',rhythm:'beat notes',puzzle:'idea cards',
    fps:'intel chips',fighting:'combo energy',openworld:'quest relics',racing:'boost tokens',platformer:'gems'
  })[e];
}
function defaultHazard(e){
  return ({
    runner:'obstacles',dodge:'moving hazards',collect:'patrol hazards',rhythm:'miss timing',puzzle:'wrong matches',
    fps:'enemy targets',fighting:'rival attacks',openworld:'hostile patrols',racing:'traffic',platformer:'enemies'
  })[e];
}
function airportCollectible(e){
  return ({
    runner:'boarding passes',dodge:'flight tags',collect:'boarding passes',rhythm:'flight-call notes',puzzle:'travel cards',
    fps:'intel badges',fighting:'combo badges',openworld:'airport access cards',racing:'boost beacons',platformer:'flight tokens'
  })[e];
}
function airportHazard(e){
  return ({
    runner:'falling luggage and service carts',dodge:'falling cargo and runway debris',collect:'moving baggage carts',
    rhythm:'mistimed flight cues',puzzle:'wrong gate matches',fps:'hostile runway targets',fighting:'rival ground-crew fighter',
    openworld:'restricted-zone patrols',racing:'airport service traffic',platformer:'baggage and maintenance hazards'
  })[e];
}
function airportWorld(e){
  return ({
    runner:'airport runway sprint',dodge:'runway hazard gauntlet',collect:'airport apron collection zone',
    rhythm:'airport rhythm stage',puzzle:'terminal puzzle board',fps:'first-person airfield mission',
    fighting:'hangar-side fighting arena',openworld:'free-roam airport campus',racing:'service-road airport circuit',
    platformer:'layered airport platform course'
  })[e];
}
function inferWorld(p,e){
  if(e==='fighting') return 'cinematic street arena';
  if(e==='fps') return 'first-person action zone';
  if(e==='openworld') return 'multi-district free-roam world';
  if(e==='racing') return 'high-speed road circuit';
  if(e==='platformer') return 'layered side-scrolling level';
  if(/city|street|roof/.test(p)) return 'stylized city';
  if(/forest|tree|grove|nature/.test(p)) return 'organic nature world';
  if(/sky|cloud|fly/.test(p)) return 'floating sky world';
  if(/space|planet|star/.test(p)) return 'space world';
  return 'world derived from uploaded media';
}
function makeTitle(prompt,e,airport){
  if(airport) return ({
    runner:'Runway Rush',dodge:'Tarmac Drop',collect:'Gate Pass',rhythm:'Flight Call',
    puzzle:'Gate Match',fps:'Airfield Zero',fighting:'Hangar Clash',openworld:'Airport District',
    racing:'Runway Circuit',platformer:'Terminal Jump'
  })[e];
  const base=prompt.trim().split(/\s+/).slice(0,4).join(' ');
  return base ? base.replace(/\b\w/g,c=>c.toUpperCase()) : `New ${e.toUpperCase()} PLX`;
}
