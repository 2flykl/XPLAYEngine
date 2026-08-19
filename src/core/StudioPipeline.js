import { buildProductionBlueprint } from '../directors/EngineDirectors.js';
import { auditPLX, repairManifest } from './PLXQualityGate.js';
import { generateWorldDNA, generateArtBible, generateLevelBlueprint, forgeWorldKit } from './WorldForge.js';
import { targetFor } from './ReferenceTargetModel.js';

export function createStudioPlan(args={}){ return buildProductionBlueprint(args); }

export function finishStudioBuild(manifest,assets={}){
  const dna=generateWorldDNA(manifest.engine,manifest.description||manifest.prompt||'',manifest.feel||'action',{airportTheme:manifest.variant==='airport',palette:manifest.styleDNA?.palette,environment:manifest.visualIntelligence?.environment});
  const artBible=generateArtBible(dna,manifest.visualStyle||'speed-16');
  const blueprint=generateLevelBlueprint(manifest.engine,dna);
  const forged=forgeWorldKit(dna,artBible);

  manifest.worldDNA=dna; manifest.artBible=artBible; manifest.levelBlueprint=blueprint; manifest.worldKit=forged.meta; manifest.targetQuality=targetFor(manifest.engine);
  manifest.assets ||= {}; manifest.assets.images ||= {}; manifest.parallax ||= {};

  const combined={...forged.assets,...assets};
  const finalImages={...forged.assets,...manifest.assets.images,...assets};
  // Prefer a coherent AI-manufactured pack when present; otherwise keep deterministic local forge assets.
  const aiTerrain=Object.keys(finalImages).filter(k=>/^aiTerrain\d+$/.test(k)).sort();
  const aiProps=Object.keys(finalImages).filter(k=>/^aiProp\d+$/.test(k)).sort();
  const aiActors=Object.keys(finalImages).filter(k=>/^aiActor\d+$/.test(k)).sort();
  if(aiTerrain.length>=12) forged.meta.terrainKeys=aiTerrain;
  if(aiProps.length>=12) forged.meta.propKeys=aiProps;
  if(aiActors.length>=12){forged.meta.hazardKeys=aiActors.slice(0,4);forged.meta.enemyKeys=aiActors.slice(4,8);forged.meta.collectibleKeys=aiActors.slice(8,12);forged.meta.signatureKeys=aiActors.slice(12,16);}
  forged.meta.counts={...forged.meta.counts,terrain:forged.meta.terrainKeys.length,props:forged.meta.propKeys.length,hazards:forged.meta.hazardKeys.length,collectibles:forged.meta.collectibleKeys.length,enemies:forged.meta.enemyKeys.length};
  forged.meta.productionArt=aiTerrain.length?'ai-batch-pack':'local-forge';
  // Preserve a real extracted source subject when present, but never let weak runtime fallbacks replace the richer world kit.
  if(assets.player) finalImages.player=assets.player;
  if(!finalImages.player) finalImages.player=forged.assets.playerFighter;
  if(manifest.engine==='fighting'){
    finalImages.player=assets.player||forged.assets.playerFighter;
    finalImages.enemy=assets.enemy||forged.assets.enemyFighter;
  }
  const reverse=!!manifest.reverseForge?.enabled;
  finalImages.background=reverse?(assets.referenceScene||assets.background||finalImages.aiBackground||forged.assets.sky):(finalImages.aiBackground||assets.background||forged.assets.sky);
  finalImages.platform=reverse?(assets.platform||assets.terrain00||forged.assets.terrain00):(finalImages[forged.meta.terrainKeys[0]]||assets.platform||forged.assets.terrain00);
  finalImages.collectible=finalImages[forged.meta.collectibleKeys[0]]||forged.assets.collectible00;
  finalImages.hazard=finalImages[forged.meta.hazardKeys[0]]||forged.assets.hazard00;
  finalImages.enemy=manifest.engine==='fighting'?finalImages.enemy:(finalImages[forged.meta.enemyKeys[0]]||forged.assets.enemy00);
  manifest.assets.images=finalImages;
  // A generated hero background becomes the far plate while local layers provide deterministic depth structure.
  manifest.parallax=reverse?(assets.parallax||{far:finalImages.background,mid:finalImages.background,near:finalImages.background}):{far:finalImages.aiBackground||forged.assets.backgroundFar,mid:forged.assets.backgroundMid,near:forged.assets.backgroundNear};
  if(reverse){
    forged.meta.productionArt='reverse-forge-source-derived';
    forged.meta.referenceLocked=true;
    forged.meta.ambientSystems=['source-frame-parallax','camera-preserving-overlay','runtime-feedback'];
    manifest.worldKit=forged.meta;
  }

  const fallbacks={...combined,player:finalImages.player,enemy:finalImages.enemy,hazard:finalImages.hazard,collectible:finalImages.collectible,platform:finalImages.platform,goal:assets.goal||forged.assets.goal,background:finalImages.background,crosshair:assets.crosshair||forged.assets.crosshair,weapon:assets.weapon||forged.assets.weapon,hitfx:forged.assets.hitfx};
  let repaired=repairManifest(manifest,fallbacks); const audit=auditPLX(repaired);
  repaired.production ||= {}; repaired.production.audit=audit; repaired.production.releaseClass=audit.pass?'world-forged':'needs-review'; repaired.production.worldForgeVersion=4; repaired.production.referenceTarget='commercial-2d-structural-v1';
  return {manifest:repaired,audit};
}
