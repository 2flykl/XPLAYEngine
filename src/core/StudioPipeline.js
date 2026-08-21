import { buildProductionBlueprint } from '../directors/EngineDirectors.js';
import { auditPLX, repairManifest } from './PLXQualityGate.js';
import { generateWorldDNA, generateArtBible, generateLevelBlueprint, forgeWorldKit } from './WorldForge.js';
import { targetFor } from './ReferenceTargetModel.js';
import { scrubLegacyBuildDNA, sanitizeAssetMap } from './FreshBuildGuard.js';
import { assemblePlayableManifest, validatePlayableManifest } from './PlayableManifestAssembler.js';
import { directFunFactor } from './FunFactorDirector.js';
import { preflightManifest } from './ManifestPreflight.js';
import { finalizeBuildDNA } from './BeastOrchestrator.js';
import { assembleApprovedAssetManifest } from './AssetManifestBeast.js';

export function createStudioPlan(args={}){ return buildProductionBlueprint(args); }

export function finishStudioBuild(manifest,assets={}){
  manifest=scrubLegacyBuildDNA(manifest,{
    prompt:manifest.prompt||manifest.description||'',
    description:manifest.description||'',
    analysis:manifest.visualIntelligence||{}
  });

  assets=sanitizeAssetMap(assets);

  const reverse=!!manifest.reverseForge?.enabled;
  const dna=generateWorldDNA(
    manifest.engine,
    manifest.description||manifest.prompt||'',
    manifest.feel||'action',
    {
      airportTheme:false,
      palette:manifest.styleDNA?.palette,
      environment:manifest.visualIntelligence?.environment
    }
  );

  const artBible=generateArtBible(dna,manifest.visualStyle||'speed-16');
  const blueprint=generateLevelBlueprint(manifest.engine,dna);
  const forged=forgeWorldKit(dna,artBible);

  manifest.worldDNA=dna;
  manifest.artBible=artBible;
  manifest.levelBlueprint=blueprint;
  manifest.worldKit=forged.meta;
  manifest.targetQuality=targetFor(manifest.engine);

  manifest.assets ||= {};
  manifest.assets.images ||= {};
  manifest.parallax ||= {};

  const combined={...forged.assets,...assets};
  const finalImages={...forged.assets,...manifest.assets.images,...assets};

  const aiTerrain=Object.keys(finalImages).filter(k=>/^aiTerrain\d+$/.test(k)).sort();
  const aiProps=Object.keys(finalImages).filter(k=>/^aiProp\d+$/.test(k)).sort();
  const aiActors=Object.keys(finalImages).filter(k=>/^aiActor\d+$/.test(k)).sort();

  if(aiTerrain.length>=12) forged.meta.terrainKeys=aiTerrain;
  if(aiProps.length>=12) forged.meta.propKeys=aiProps;
  if(aiActors.length>=12){
    forged.meta.hazardKeys=aiActors.slice(0,4);
    forged.meta.enemyKeys=aiActors.slice(4,8);
    forged.meta.collectibleKeys=aiActors.slice(8,12);
    forged.meta.signatureKeys=aiActors.slice(12,16);
  }

  forged.meta.counts={
    ...forged.meta.counts,
    terrain:forged.meta.terrainKeys.length,
    props:forged.meta.propKeys.length,
    hazards:forged.meta.hazardKeys.length,
    collectibles:forged.meta.collectibleKeys.length,
    enemies:forged.meta.enemyKeys.length
  };
  forged.meta.productionArt=aiTerrain.length?'ai-batch-pack':'local-forge';

  if(assets.player) finalImages.player=assets.player;
  if(!finalImages.player) finalImages.player=forged.assets.playerFighter;

  if(manifest.engine==='fighting'){
    finalImages.player=assets.player||forged.assets.playerFighter;
    finalImages.enemy=assets.enemy||forged.assets.enemyFighter;
  }

  finalImages.background=reverse
    ? (assets.referenceScene||assets.background||finalImages.aiBackground||forged.assets.sky)
    : (finalImages.aiBackground||assets.background||forged.assets.sky);

  finalImages.platform=reverse
    ? (assets.platform||assets.terrain00||forged.assets.terrain00)
    : (finalImages[forged.meta.terrainKeys[0]]||assets.platform||forged.assets.terrain00);

  finalImages.collectible=finalImages[forged.meta.collectibleKeys[0]]||assets.collectible||forged.assets.collectible00;
  finalImages.hazard=finalImages[forged.meta.hazardKeys[0]]||assets.hazard||forged.assets.hazard00;
  finalImages.enemy=manifest.engine==='fighting'
    ? finalImages.enemy
    : (finalImages[forged.meta.enemyKeys[0]]||assets.enemy||forged.assets.enemy00);

  const runtimeFallbacks=sanitizeAssetMap(finalImages);

  manifest.parallax=reverse
    ? sanitizeAssetMap(assets.parallax||{
        far:finalImages.background,
        mid:finalImages.background,
        near:finalImages.background
      })
    : sanitizeAssetMap({
        far:finalImages.aiBackground||forged.assets.backgroundFar,
        mid:forged.assets.backgroundMid,
        near:forged.assets.backgroundNear
      });

  if(reverse){
    forged.meta.productionArt='reverse-forge-source-derived';
    forged.meta.referenceLocked=true;
    forged.meta.ambientSystems=['source-frame-parallax','camera-preserving-overlay','runtime-feedback'];
    forged.meta.propKeys=[];
    forged.meta.terrainKeys=[];
    manifest.worldKit=forged.meta;
  }

  const approvedAssetManifest=assembleApprovedAssetManifest({
    manifest,
    sourceAssets:assets,
    fallbackAssets:runtimeFallbacks,
    provenance:manifest.assetProvenance||{},
    buildId:manifest.buildId
  });

  manifest.assets.images=approvedAssetManifest.images;
  manifest.assets.reference=approvedAssetManifest.referenceAssets;
  manifest.assetManifest={
    engine:approvedAssetManifest.engine,
    buildId:approvedAssetManifest.buildId,
    approvedKeys:approvedAssetManifest.approvedKeys,
    rejected:approvedAssetManifest.rejected,
    missingRequired:approvedAssetManifest.missingRequired,
    reverseLocked:approvedAssetManifest.reverseLocked,
    audit:approvedAssetManifest.audit,
    provenance:approvedAssetManifest.provenance
  };

  const fallbacks={
    ...combined,
    player:finalImages.player,
    enemy:finalImages.enemy,
    hazard:finalImages.hazard,
    collectible:finalImages.collectible,
    platform:finalImages.platform,
    goal:assets.goal||forged.assets.goal,
    background:finalImages.background,
    crosshair:assets.crosshair||forged.assets.crosshair,
    weapon:assets.weapon||forged.assets.weapon,
    hitfx:forged.assets.hitfx
  };

  let repaired=repairManifest(manifest,fallbacks);
  repaired=assemblePlayableManifest(repaired);
  repaired=directFunFactor(repaired);

  const playabilityAudit=validatePlayableManifest(repaired);
  const preflight=preflightManifest(repaired);
  const audit=auditPLX(repaired);

  repaired.production ||= {};
  repaired.production.audit=audit;
  repaired.production.playabilityAudit=playabilityAudit;
  repaired.production.preflight=preflight;
  repaired.production.releaseClass=(audit.pass && playabilityAudit.pass && preflight.passed)
    ? 'playable-world-forged'
    : 'needs-review';
  repaired.production.worldForgeVersion=5;
  repaired.production.referenceTarget='commercial-2d-structural-v2';

  repaired=finalizeBuildDNA(repaired);

  return {
    manifest:repaired,
    audit:{...audit,playability:playabilityAudit,preflight}
  };
}
