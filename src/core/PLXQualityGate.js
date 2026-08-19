import { ENGINE_DIRECTORS } from '../directors/EngineDirectors.js';
import { analyzeVisualQuality } from './WorldForge.js';

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

  // 1. Visual QA Critic Loop Integration
  const visualQA = analyzeVisualQuality(manifest);
  if (!visualQA.pass) {
    visualQA.issues.forEach(iss => issues.push(`Visual QA: ${iss}`));
  }

  const score = Math.max(0, Math.min(100, Math.round((100 - issues.length * 10) * 0.4 + visualQA.overallScore * 0.6)));
  
  // Establish strict pass criteria based on the new visual standards
  const pass = score >= 80 && visualQA.pass;

  return {
    score,
    pass,
    issues,
    repairs: issues.map(x=>`Auto-repair: ${x}`),
    director: director.name,
    visualQA: visualQA.scores
  };
}

export function repairManifest(manifest,fallbacks={}){
  const out=structuredClone(manifest);
  const director=ENGINE_DIRECTORS[out.engine];
  out.assets ||= {}; out.assets.images ||= {};
  const assets=out.assets.images;
  
  // Apply direct required asset fallbacks
  for(const key of director?.requiredAssets||[]){
    if(isBad(assets[key]) && fallbacks[key]) assets[key]=fallbacks[key];
  }

  // Perform repair routing based on Visual Critic Analysis
  const qualityAudit = analyzeVisualQuality(out);
  if (!qualityAudit.pass) {
    for (const repair of qualityAudit.repairRoute) {
      if (fallbacks[repair.target]) {
        assets[repair.target] = fallbacks[repair.target];
      }
    }
  }

  out.production ||= {};
  out.production.director=director?.name;
  out.production.scroll=director?.scroll;
  out.production.qa=director?.qa||[];
  return out;
}
