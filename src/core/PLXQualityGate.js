import { ENGINE_DIRECTORS } from '../directors/EngineDirectors.js';

const isBad = v => !v || /black|placeholder|square/i.test(String(v));

export function auditPLX(manifest){
  const engine=manifest?.engine;
  const director=ENGINE_DIRECTORS[engine];
  const issues=[];
  const assets=manifest?.assets?.images||{};
  if(!director) return {score:0,pass:false,issues:[`Unknown engine: ${engine}`],repairs:[]};

  for(const key of director.requiredAssets){
    if(isBad(assets[key])) issues.push(`Missing/weak ${key} asset`);
  }

  if(engine==='fps'){
    ['enemy','crosshair','weapon','hitfx'].forEach(k=>{if(!assets[k])issues.push(`FPS requires ${k}`);});
  }
  if(engine==='fighting'){
    if(!assets.player)issues.push('Fighting requires player');
    if(!assets.enemy)issues.push('Fighting requires rival');
    if(!assets.platform)issues.push('Fighting requires arena floor');
  }

  const score=Math.max(0,100-issues.length*13);
  return {score,pass:score>=74,issues,repairs:issues.map(x=>`Auto-repair: ${x}`),director:director.name};
}

export function repairManifest(manifest,fallbacks={}){
  const out=structuredClone(manifest);
  const director=ENGINE_DIRECTORS[out.engine];
  out.assets ||= {}; out.assets.images ||= {};
  const assets=out.assets.images;
  for(const key of director?.requiredAssets||[]){
    if(isBad(assets[key]) && fallbacks[key]) assets[key]=fallbacks[key];
  }
  out.production ||= {};
  out.production.director=director?.name;
  out.production.scroll=director?.scroll;
  out.production.qa=director?.qa||[];
  return out;
}
