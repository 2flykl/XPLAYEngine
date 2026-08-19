import { createBuildDNA, lockBuildDNA } from './BuildDNA.js';
import { inferScreenshotGameGrammar } from './ScreenshotGameGrammar.js';
import { stampAssets, rejectStaleAssets } from './AssetProvenance.js';
import { preflightManifest } from './ManifestPreflight.js';

export function beginBeastBuild({
  sourceDataUrl='',
  sourceFileName='',
  prompt='',
  engine='',
  feel='',
  style='',
  analysis={},
  screenshotGuide=null
}={}) {
  const dna=createBuildDNA({sourceDataUrl,sourceFileName,prompt,engine,feel,style,analysis,screenshotGuide});
  const grammar=screenshotGuide ? inferScreenshotGameGrammar(analysis,{...screenshotGuide,engine},prompt) : null;

  if(engine) lockBuildDNA(dna,'engine',engine,1);
  if(grammar?.recommended) lockBuildDNA(dna,'visualGameGrammar',grammar.recommended,grammar.confidence/100);
  if(analysis?.environment) lockBuildDNA(dna,'environment',analysis.environment,Math.min(1,(analysis.qualityScore||50)/100));
  if(analysis?.player) lockBuildDNA(dna,'player',analysis.player,Math.min(1,(analysis.qualityScore||50)/100));

  dna.gameGrammar=grammar;
  return dna;
}

export function bindManifestToBuild(manifest={}, dna={}, assets={}) {
  manifest.buildDNA=dna;
  manifest.buildId=dna.buildId;
  manifest.assetProvenance=stampAssets(assets,dna.buildId);

  // A high-confidence upstream lock wins over downstream reinterpretation.
  const lockedEngine=dna?.lockedFacts?.engine?.value;
  if(lockedEngine) manifest.engine=lockedEngine;

  if(dna?.locks?.exactVisualBlueprint) {
    manifest.reverseForge ||= {};
    manifest.reverseForge.enabled=true;
    manifest.reverseForge.buildId=dna.buildId;
    manifest.reverseForge.preserve=dna.locks.preserve;
  }

  const freshness=rejectStaleAssets(
    manifest.assets?.images || {},
    manifest.assetProvenance || {},
    dna.buildId
  );
  manifest.assets ||= {};
  manifest.assets.images=freshness.assets;
  manifest.provenanceAudit={rejectedStaleAssets:freshness.rejected};

  preflightManifest(manifest);
  return manifest;
}

export function finalizeBuildDNA(manifest={}) {
  const dna=manifest.buildDNA;
  if(!dna)return manifest;
  dna.runtime.engine=manifest.engine;
  dna.runtime.controls=manifest.runtimeContract?.controls || '';
  dna.runtime.objective=manifest.runtimeContract?.objective || manifest.objective?.label || '';
  dna.runtime.requiredAssets=manifest.runtimeContract?.requiredAssets || [];
  dna.qa.preflightPassed=!!manifest.preflight?.passed;
  return manifest;
}
