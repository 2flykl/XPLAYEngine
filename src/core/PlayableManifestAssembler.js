const CONTRACTS = {
  runner:      { required:['player','platform','hazard','collectible'], controls:'←/→ move · ↑/Space jump', objective:'Reach the finish' },
  dodge:       { required:['player','hazard','collectible'], controls:'WASD / arrows move', objective:'Survive the hazard field' },
  collect:     { required:['player','collectible'], controls:'WASD / arrows explore', objective:'Collect every objective item' },
  rhythm:      { required:['note'], controls:'D F J K hit notes', objective:'Stay on beat and build score' },
  puzzle:      { required:['cardBack','face0','face1','face2','face3'], controls:'Click / tap pieces', objective:'Solve the board' },
  fps:         { required:['weapon','crosshair','enemy','hitfx'], controls:'Mouse aim · click fire · R reload', objective:'Clear the threat wave' },
  fighting:    { required:['player','enemy'], controls:'A/D move · W jump · J punch · K kick · L block', objective:'Win the round' },
  openworld:   { required:['player','npc','building','collectible'], controls:'WASD / arrows explore', objective:'Explore, interact, complete the objective' },
  racing:      { required:['player','enemy','collectible'], controls:'A/D or ←/→ steer', objective:'Reach the finish line' },
  platformer:  { required:['player','platform','hazard','collectible','goal'], controls:'←/→ move · ↑/Space jump', objective:'Reach the goal' }
};

const alias = (images, key) => {
  if (images[key]) return images[key];
  const groups = {
    player:['playerFighter','aiActor0','enemyFighter','npc'],
    enemy:['enemyFighter','aiActor1','hazard'],
    platform:['terrain00','aiTerrain0','background'],
    hazard:['hazard00','aiActor2','enemy'],
    collectible:['collectible00','aiActor8','goal'],
    goal:['collectible','building'],
    npc:['aiActor3','player'],
    building:['terrain01','background'],
    weapon:['aiProp0','hazard'],
    crosshair:['hitfx'],
    hitfx:['collectible'],
    note:['collectible'],
    cardBack:['terrain00','platform'],
    face0:['collectible'],
    face1:['hazard'],
    face2:['enemy'],
    face3:['goal']
  };
  return (groups[key] || []).map(k=>images[k]).find(Boolean);
};

export function assemblePlayableManifest(input={}) {
  const manifest = structuredClone ? structuredClone(input) : JSON.parse(JSON.stringify(input));
  const engine = manifest.engine || 'runner';
  const contract = CONTRACTS[engine] || CONTRACTS.runner;

  manifest.assets ||= {};
  manifest.assets.images ||= {};
  const images = manifest.assets.images;

  for (const key of contract.required) {
    if (!images[key]) {
      const candidate = alias(images, key);
      if (candidate) images[key] = candidate;
    }
  }

  // Screenshot builds should remain visually anchored to the uploaded frame.
  if (manifest.reverseForge?.enabled && images.referenceScene) {
    images.background ||= images.referenceScene;
    manifest.parallax ||= {
      far: images.referenceScene,
      mid: images.referenceScene,
      near: images.referenceScene
    };
  }

  manifest.runtimeContract = {
    ...(manifest.runtimeContract || {}),
    engine,
    controls: manifest.runtimeContract?.controls || contract.controls,
    objective: manifest.objective?.label || contract.objective,
    requiredAssets: contract.required,
    assembledAt: new Date().toISOString(),
    completionRequired: true
  };

  manifest.playability = {
    ...(manifest.playability || {}),
    inputReady: true,
    winStateRequired: true,
    failStateRequired: true,
    retryRequired: true,
    noBlankCanvas: true,
    maxStartupMs: 4500
  };

  return manifest;
}

export function validatePlayableManifest(manifest={}) {
  const engine = manifest.engine || 'runner';
  const contract = CONTRACTS[engine] || CONTRACTS.runner;
  const images = manifest.assets?.images || {};
  const missing = contract.required.filter(k => !images[k]);
  return {
    pass: missing.length === 0,
    engine,
    missing,
    controls: contract.controls,
    objective: manifest.objective?.label || contract.objective
  };
}
