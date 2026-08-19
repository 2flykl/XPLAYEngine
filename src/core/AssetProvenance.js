export function stampAssets(assets={}, buildId='') {
  const provenance = {};
  for (const key of Object.keys(assets || {})) {
    provenance[key] = { buildId, role:key, accepted:true };
  }
  return provenance;
}

export function rejectStaleAssets(assets={}, provenance={}, buildId='') {
  const clean = {};
  const rejected = [];
  for (const [key,value] of Object.entries(assets || {})) {
    const p = provenance?.[key];
    if (p?.buildId && buildId && p.buildId !== buildId) {
      rejected.push({key,from:p.buildId,expected:buildId});
      continue;
    }
    clean[key] = value;
  }
  return { assets:clean, rejected };
}

export function assertCurrentBuild(manifest={}, buildId='') {
  const current = manifest?.buildDNA?.buildId || manifest?.buildId || '';
  if (buildId && current && current !== buildId) {
    throw new Error(`Stale build detected: manifest ${current} does not match active build ${buildId}.`);
  }
  return true;
}
