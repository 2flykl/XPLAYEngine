const rules = [
  ['fighting', /\b(fight|fighter|versus|health bar|karate|martial|punch|kick|brawler|beat[- ]?em[- ]?up|enemy fighters?)\b/i, 5],
  ['fps', /\b(crosshair|first person|weapon foreground|ammo|reload|shooter|gun sight)\b/i, 5],
  ['rhythm', /\b(note lanes?|timing line|combo|beat|rhythm|music)\b/i, 4],
  ['puzzle', /\b(grid|tiles?|match[- ]?3|board|pieces?|puzzle)\b/i, 4],
  ['racing', /\b(car|vehicle|lap|speedometer|track|race|racing)\b/i, 4],
  ['platformer', /\b(platforms?|side[- ]?scroll|jump|ledge|floor plane|horizontal traversable)\b/i, 3],
  ['runner', /\b(run|runner|sprint|forward|obstacle course)\b/i, 3],
  ['dodge', /\b(dodge|avoid|hazard field|survive)\b/i, 3],
  ['collect', /\b(collect|pickup|relic|gather|find)\b/i, 3],
  ['openworld', /\b(open world|free roam|quest|npc|district|explore)\b/i, 3],
];

export function inferScreenshotGameGrammar(analysis={}, guide={}, userPrompt='') {
  const text = [
    analysis.player, analysis.environment, analysis.notableObjects,
    analysis.strongOpportunities, analysis.hud, analysis.camera,
    analysis.threats, guide.objective, guide.motionHints, guide.doNotChange,
    userPrompt
  ].filter(Boolean).join(' ');

  const scores = Object.fromEntries(['runner','dodge','collect','rhythm','puzzle','fps','fighting','openworld','racing','platformer'].map(k=>[k,0]));
  for (const [engine,re,weight] of rules) {
    const hits = text.match(new RegExp(re.source, 'ig')) || [];
    scores[engine] += hits.length * weight;
  }

  // Strong structural cue: visible side-view combat description should not drift into open world.
  if (/side[- ]?view|horizontal traversable|arena|combat plane/i.test(text) && /enemy|fighter|rival|combat|karate|martial/i.test(text)) {
    scores.fighting += 12;
    scores.platformer += 2;
  }

  // User-selected engine remains a hard contract when supplied.
  const lockedEngine = guide.engine || '';
  const ranked = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const recommended = lockedEngine || ranked[0]?.[0] || 'runner';

  return {
    recommended,
    scores,
    confidence: Math.min(100, Math.max(25, (ranked[0]?.[1] || 0) * 7)),
    evidence: text.slice(0,1200)
  };
}
