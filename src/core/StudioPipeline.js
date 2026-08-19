import { buildProductionBlueprint } from '../directors/EngineDirectors.js';
import { auditPLX, repairManifest } from './PLXQualityGate.js';
import { generateWorldDNA, generateArtBible, generateLevelBlueprint, forgeWorldKit } from './WorldForge.js';

export function createStudioPlan(args={}){
  return buildProductionBlueprint(args);
}

export function finishStudioBuild(manifest, assets={}){
  // 1. Generate World DNA and Art Bible
  const dna = generateWorldDNA(manifest.engine, manifest.description, manifest.feel || 'action', {
    airportTheme: manifest.variant === 'airport',
    palette: manifest.styleDNA?.palette
  });
  const artBible = generateArtBible(dna, manifest.visualStyle || 'cinematic-photo');
  const blueprint = generateLevelBlueprint(manifest.engine, dna);

  manifest.worldDNA = dna;
  manifest.artBible = artBible;
  manifest.levelBlueprint = blueprint;

  // Forge world kit assets based on DNA
  const forged = forgeWorldKit(dna, artBible);
  
  // Merge forged assets with derived assets
  const combinedAssets = {
    ...forged,
    ...assets
  };

  // Ensure backgrounds and terrain tiles are overridden by procedural forge if empty
  if (!combinedAssets.background) combinedAssets.background = forged.sky;
  if (!combinedAssets.platform) combinedAssets.platform = forged.platform;

  const fallbacks={
    player:combinedAssets.player,enemy:combinedAssets.enemy,hazard:combinedAssets.hazard,collectible:combinedAssets.collectible,
    platform:combinedAssets.platform,goal:combinedAssets.goal,background:combinedAssets.background,crosshair:combinedAssets.crosshair,
    weapon:combinedAssets.weapon,hitfx:combinedAssets.hitfx,note:combinedAssets.note,cardBack:combinedAssets.cardBack,
    face0:combinedAssets.face0,face1:combinedAssets.face1,face2:combinedAssets.face2,face3:combinedAssets.face3,
    npc:combinedAssets.npc,building:combinedAssets.building
  };
  let repaired=repairManifest(manifest,fallbacks);
  let audit=auditPLX(repaired);
  repaired.production ||= {};
  repaired.production.audit=audit;
  repaired.production.releaseClass=audit.pass?'arcade-draft':'needs-review';
  
  // Attach forged assets back to manifest
  repaired.assets.images = {
    ...repaired.assets.images,
    background: fallbacks.background,
    platform: fallbacks.platform,
    collectible: fallbacks.collectible,
    hazard: fallbacks.hazard
  };

  return {manifest:repaired,audit};
}
