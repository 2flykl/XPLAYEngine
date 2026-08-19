import { sanitizeAssetMap } from './FreshBuildGuard.js';

const required = {
  runner:['player','platform','hazard','collectible'],
  dodge:['player','hazard'],
  collect:['player','collectible'],
  rhythm:['note'],
  puzzle:['cardBack'],
  fps:['weapon','crosshair','enemy'],
  fighting:['player','enemy'],
  openworld:['player'],
  racing:['player'],
  platformer:['player','platform','goal']
};

export function preflightManifest(manifest={}) {
  const errors=[], warnings=[];
  const engine=manifest.engine || '';
  if(!engine) errors.push('Missing engine.');
  if(!required[engine]) errors.push(`Unknown engine: ${engine}`);

  manifest.assets ||= {};
  manifest.assets.images = sanitizeAssetMap(manifest.assets.images || {});
  manifest.assets.audio = sanitizeAssetMap(manifest.assets.audio || {});
  manifest.parallax = sanitizeAssetMap(manifest.parallax || {});

  const images=manifest.assets.images;
  for(const key of required[engine] || []) {
    if(!images[key]) warnings.push(`Missing preferred asset "${key}" for ${engine}. Runtime fallback may be used.`);
  }

  const anim=manifest.generatedAnimations?.player || {};
  for(const [state,frames] of Object.entries(anim)) {
    const list=Array.isArray(frames)?frames:[frames];
    for(const f of list) {
      if(typeof f !== 'string' && !(f && typeof f==='object')) {
        warnings.push(`Invalid generated animation frame in ${state}; entry will be ignored.`);
      }
    }
  }

  manifest.preflight = {
    passed: errors.length===0,
    errors,
    warnings,
    checkedAt:new Date().toISOString()
  };
  return manifest.preflight;
}
