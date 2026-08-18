import { buildProductionBlueprint } from '../directors/EngineDirectors.js';
import { auditPLX,repairManifest } from './PLXQualityGate.js';

export function createStudioPlan(args={}){
  return buildProductionBlueprint(args);
}

export function finishStudioBuild(manifest, assets={}){
  const fallbacks={
    player:assets.player,enemy:assets.enemy,hazard:assets.hazard,collectible:assets.collectible,
    platform:assets.platform,goal:assets.goal,background:assets.background,crosshair:assets.crosshair,
    weapon:assets.weapon,hitfx:assets.hitfx,note:assets.note,cardBack:assets.cardBack,
    face0:assets.face0,face1:assets.face1,face2:assets.face2,face3:assets.face3,
    npc:assets.npc,building:assets.building
  };
  let repaired=repairManifest(manifest,fallbacks);
  let audit=auditPLX(repaired);
  repaired.production ||= {};
  repaired.production.audit=audit;
  repaired.production.releaseClass=audit.pass?'arcade-draft':'needs-review';
  return {manifest:repaired,audit};
}
