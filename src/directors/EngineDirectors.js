export const ENGINE_DIRECTORS = {
  runner:{
    id:'runner',name:'Runner Director',camera:'side',movement:'auto-forward',
    scroll:{axis:'x',direction:'left',parallax:[.12,.28,.55]},
    requiredAssets:['player','background','platform','hazard','collectible','goal'],
    mechanics:['auto-run','jump','slide','collect','speed escalation'],
    signature:['foreground fly-bys','mid-run set piece','finish burst'],
    qa:['world scrolls opposite player travel','hazards have silhouettes','platforms never render as black rectangles']
  },
  dodge:{
    id:'dodge',name:'Dodge Director',camera:'top-down',movement:'free-lane',
    scroll:{axis:'y',direction:'down',parallax:[.08,.22,.42]},
    requiredAssets:['player','background','hazard','collectible'],
    mechanics:['free movement','spawn lanes','near miss','survival timer'],
    signature:['warning telegraphs','hazard wave','survival climax'],
    qa:['hazards approach player','spawn lanes readable','no static wallpaper pretending to move']
  },
  collect:{
    id:'collect',name:'Collect Director',camera:'top-down',movement:'free-roam',
    scroll:{axis:'camera',direction:'follow',parallax:[0,0,0]},
    requiredAssets:['player','background','collectible','hazard','goal'],
    mechanics:['explore','collect','avoid','unlock goal'],
    signature:['collection streak','world reveal','final pickup flourish'],
    qa:['camera follows player','collectibles visually distinct','world does not auto-scroll without cause']
  },
  rhythm:{
    id:'rhythm',name:'Rhythm Director',camera:'fixed',movement:'timing',
    scroll:{axis:'y',direction:'down',parallax:[0,.04,.08]},
    requiredAssets:['player','background','note','hitfx'],
    mechanics:['four lanes','timing windows','combo','miss recovery'],
    signature:['combo escalation','music-reactive performer','final chorus burst'],
    qa:['notes move toward hit line','timing lanes readable','background motion never fights note direction']
  },
  puzzle:{
    id:'puzzle',name:'Puzzle Director',camera:'fixed',movement:'board',
    scroll:{axis:'none',direction:'static',parallax:[0,0,0]},
    requiredAssets:['background','cardBack','face0','face1','face2','face3'],
    mechanics:['inspect','match','feedback','completion'],
    signature:['reveal animation','smart hint','completion transform'],
    qa:['no fake scrolling','click targets readable','all cards use themed faces']
  },
  fps:{
    id:'fps',name:'FPS Director',camera:'first-person',movement:'depth assault',
    scroll:{axis:'depth',direction:'toward-camera',parallax:[0,0,0]},
    requiredAssets:['background','enemy','crosshair','weapon','hitfx'],
    mechanics:['aim','fire','reload','enemy depth approach','health'],
    signature:['opening threat scan','depth rush wave','elite target finale'],
    qa:['crosshair always visible','weapon foreground always visible','targets scale with depth','click hit detection works','reload works','FPS is registered in runtime']
  },
  fighting:{
    id:'fighting',name:'Fighting Director',camera:'side arena',movement:'two-fighter',
    scroll:{axis:'none',direction:'arena-camera',parallax:[.02,.04,.06]},
    requiredAssets:['player','enemy','background','platform','hitfx'],
    mechanics:['walk','jump','punch','kick','block','enemy AI','health','KO'],
    signature:['round intro','hit-stop feeling','KO finish'],
    qa:['both fighters spawn','floor collision works','player attacks reduce rival health','enemy attacks reduce player health','KO resolves','Fighting is registered in runtime']
  },
  openworld:{
    id:'openworld',name:'Open World Director',camera:'follow',movement:'free-roam',
    scroll:{axis:'camera',direction:'follow',parallax:[0,0,0]},
    requiredAssets:['player','background','npc','building','collectible','goal'],
    mechanics:['roam','interact','quest','discover'],
    signature:['district reveal','NPC objective','quest completion'],
    qa:['camera follows player','world bounds exceed screen','no automatic directional scroll']
  },
  racing:{
    id:'racing',name:'Racing Director',camera:'chase/top-down',movement:'forward-speed',
    scroll:{axis:'y',direction:'down',parallax:[.15,.35,.7]},
    requiredAssets:['player','enemy','background','collectible','hazard','goal'],
    mechanics:['steer','traffic','boost','speed escalation','finish'],
    signature:['boost tunnel','traffic squeeze','finish sprint'],
    qa:['road moves toward player','traffic approaches player','car is not rendered as generic player block']
  },
  platformer:{
    id:'platformer',name:'Platformer Director',camera:'side follow',movement:'free-side',
    scroll:{axis:'x',direction:'left',parallax:[.1,.25,.5]},
    requiredAssets:['player','background','platform','enemy','collectible','goal'],
    mechanics:['run','jump','platform collision','enemy avoidance','goal'],
    signature:['vertical branch','tongue/special opportunity','goal flourish'],
    qa:['camera/world move opposite travel','platform collision works','no geometric black placeholder actors']
  }
};

const SCORE_RULES = [
 ['fps',/\b(fps|first[- ]person|shoot|shooter|gun|blaster|target|sniper|crosshair|fire at)\b/i,9],
 ['fighting',/\b(fight|fighter|boxing|boxing match|martial|karate|kickbox|versus|vs\.?|duel|brawl|1v1)\b/i,9],
 ['racing',/\b(race|racing|drive|driving|car|vehicle|motorcycle|road)\b/i,8],
 ['rhythm',/\b(rhythm|beat|music|song|dance|tempo|drum|note)\b/i,8],
 ['puzzle',/\b(puzzle|match|memory|solve|connect|sequence|logic)\b/i,8],
 ['openworld',/\b(open world|free roam|sandbox|quest|explore a city|explore the world)\b/i,8],
 ['platformer',/\b(platform|platformer|jump across|climb platforms|side scrolling)\b/i,7],
 ['dodge',/\b(dodge|avoid|falling|incoming|survive|weave)\b/i,6],
 ['collect',/\b(collect|gather|find all|hunt for|relic|pickup)\b/i,5],
 ['runner',/\b(run|running|sprint|chase|escape|dash)\b/i,4]
];

export function chooseDirector(prompt='', selectedEngine=''){
  if(selectedEngine && ENGINE_DIRECTORS[selectedEngine]) return ENGINE_DIRECTORS[selectedEngine];
  let best='runner',bestScore=0;
  for(const [id,re,score] of SCORE_RULES){
    if(re.test(prompt) && score>bestScore){best=id;bestScore=score;}
  }
  return ENGINE_DIRECTORS[best];
}

export function buildProductionBlueprint({prompt='',selectedEngine='',styleName='Arcade HD',visualAnalysis=null}={}){
  const d=chooseDirector(prompt,selectedEngine);
  const sourceQuality=Number(visualAnalysis?.qualityScore||0);
  const extractionPolicy=sourceQuality>=72?'use-isolated-source':sourceQuality>=50?'use-source-with-fallback':'prefer-generated-fallback';
  return {
    version:'studio-blueprint-1',
    director:d.name,
    engine:d.id,
    camera:d.camera,
    movement:d.movement,
    scroll:d.scroll,
    requiredAssets:d.requiredAssets,
    mechanics:d.mechanics,
    signatureMoments:d.signature,
    qualityRules:d.qa,
    styleName,
    extractionPolicy,
    productionIntent:'Build an authored arcade experience from source media, not a photograph with game objects pasted over it.',
    assetCasting:{
      player:'primary subject if clean; otherwise stylized source-derived hero',
      environment:'reconstructed setting split into useful game layers',
      enemies:'source-relevant characters/objects or category-native themed fallback',
      hazards:'objects that read instantly at gameplay speed',
      collectibles:'positive, high-contrast objects derived from prompt/source',
      fx:'category-specific impact, pickup, movement, success and failure feedback'
    }
  };
}
