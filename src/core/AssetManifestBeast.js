import { sanitizeAssetMap, sanitizeAssetRef } from './FreshBuildGuard.js';

const ENGINE_REQUIRED = {
  runner:['player','platform','hazard','collectible'],
  dodge:['player','hazard','collectible'],
  collect:['player','collectible'],
  rhythm:['note'],
  puzzle:['cardBack','face0','face1','face2','face3'],
  fps:['weapon','crosshair','enemy','hitfx'],
  fighting:['player','enemy','platform','background'],
  openworld:['player','npc','building','collectible'],
  racing:['player','enemy','collectible'],
  platformer:['player','platform','hazard','collectible','goal']
};

const LEGACY_SCREENSHOT_DENY = new Set([
  'signatureJet','crosshair','weapon','playerFighter','enemyFighter','goal',
  'terrain00','terrain01','terrain02','terrain03','terrain04','terrain05','terrain06','terrain07','terrain08','terrain09','terrain10','terrain11','terrain12','terrain13','terrain14','terrain15','terrain16','terrain17','terrain18','terrain19','terrain20','terrain21','terrain22','terrain23',
  'prop00','prop01','prop02','prop03','prop04','prop05','prop06','prop07','prop08','prop09','prop10','prop11',
  'aiTerrain00','aiTerrain01','aiTerrain02','aiTerrain03','aiTerrain04','aiTerrain05','aiTerrain06','aiTerrain07','aiTerrain08','aiTerrain09','aiTerrain10','aiTerrain11','aiTerrain12','aiTerrain13','aiTerrain14','aiTerrain15',
  'aiProp00','aiProp01','aiProp02','aiProp03','aiProp04','aiProp05','aiProp06','aiProp07','aiProp08','aiProp09','aiProp10','aiProp11','aiProp12','aiProp13','aiProp14','aiProp15'
]);

const LEGACY_TOKEN_RE = /(jet|runway|airport|airfield|terminal|crosshair|weapon|signature|terrain\d\d|prop\d\d|aiTerrain\d\d|aiProp\d\d|playerFighter|enemyFighter)/i;

const CURRENT_ROLE_KEYS = [
  'referenceScene','background','player','enemy','platform','hazard','collectible','npc','building','goal','note','cardBack','face0','face1','face2','face3','crosshair','weapon','hitfx'
];

function currentImageAssets(source = {}) {
  const out = {};
  for (const key of CURRENT_ROLE_KEYS) {
    const ref = sanitizeAssetRef(source[key]);
    if (ref) out[key] = ref;
  }
  return out;
}

function screenshotOptionalKeys(engine='runner', analysis={}) {
  const text = [analysis?.player, analysis?.environment, analysis?.notableObjects, analysis?.strongOpportunities].filter(Boolean).join(' ').toLowerCase();
  const optional = new Set(['referenceScene']);
  if (engine === 'fighting') {
    optional.add('hitfx');
    if (/building|brick|container|dock|alley|city|industrial|fence/.test(text)) optional.add('building');
    if (/barrel|oil drum|danger|hazard|warning/.test(text)) optional.add('hazard');
  }
  if (engine === 'fps') {
    optional.add('weapon');
    optional.add('crosshair');
    optional.add('hitfx');
  }
  return [...optional];
}

function buildAllowedKeys({engine='runner', reverse=false, analysis={}} = {}) {
  const required = ENGINE_REQUIRED[engine] || ENGINE_REQUIRED.runner;
  const optional = reverse ? screenshotOptionalKeys(engine, analysis) : [];
  return [...new Set([...required, ...optional])];
}

function fallbackFor(key, source = {}, fallbackPool = {}) {
  return sanitizeAssetRef(source[key]) || sanitizeAssetRef(fallbackPool[key]);
}

function filterRejectedEntries(candidateImages = {}, allowedKeys = [], reverse = false) {
  const approved = {};
  const rejected = [];
  const allowedSet = new Set(allowedKeys);

  for (const [key, value] of Object.entries(sanitizeAssetMap(candidateImages))) {
    const ref = sanitizeAssetRef(value);
    if (!ref) continue;

    if (reverse && (LEGACY_SCREENSHOT_DENY.has(key) || LEGACY_TOKEN_RE.test(key))) {
      rejected.push({ key, reason: 'legacy_or_cross_build_asset_blocked' });
      continue;
    }

    if (!allowedSet.has(key)) {
      rejected.push({ key, reason: reverse ? 'not_approved_for_current_screenshot_build' : 'not_required_for_runtime_contract' });
      continue;
    }

    approved[key] = ref;
  }

  return { approved, rejected };
}

export function assembleApprovedAssetManifest({
  manifest = {},
  sourceAssets = {},
  fallbackAssets = {},
  provenance = {},
  buildId = ''
} = {}) {
  const engine = manifest.engine || 'runner';
  const reverse = !!manifest.reverseForge?.enabled;
  const analysis = manifest.visualIntelligence || manifest.reverseForge?.analysis || {};
  const allowedKeys = buildAllowedKeys({ engine, reverse, analysis });

  const currentAssets = currentImageAssets(sourceAssets);
  const fallbackCandidates = sanitizeAssetMap(fallbackAssets);
  const rawCandidates = { ...fallbackCandidates, ...currentAssets };

  const { approved, rejected } = filterRejectedEntries(rawCandidates, allowedKeys, reverse);

  // Enforce required contract assets, but prefer current-build assets over generic fallbacks.
  const required = ENGINE_REQUIRED[engine] || ENGINE_REQUIRED.runner;
  for (const key of required) {
    if (!approved[key]) {
      const chosen = fallbackFor(key, currentAssets, fallbackCandidates);
      if (chosen) {
        approved[key] = chosen;
      }
    }
  }

  // Screenshot builds should always remain anchored to the uploaded frame.
  if (reverse) {
    const sceneRef = sanitizeAssetRef(sourceAssets.referenceScene || sourceAssets.background || approved.background);
    if (sceneRef) {
      approved.referenceScene = sceneRef;
      approved.background ||= sceneRef;
    }
  }

  const missingRequired = required.filter((key) => !approved[key]);
  const approvedKeys = Object.keys(approved);

  const approvedProvenance = {};
  for (const key of approvedKeys) {
    approvedProvenance[key] = {
      buildId: buildId || manifest.buildId || '',
      role: key,
      source: currentAssets[key] ? 'current-build' : 'fallback-runtime',
      approvedByManifest: true,
      reverseLocked: reverse
    };
  }

  const referenceAssets = reverse
    ? sanitizeAssetMap({
        referenceScene: sourceAssets.referenceScene || sourceAssets.background,
        playerSource: sourceAssets.player,
        enemySource: sourceAssets.enemy,
        platformSource: sourceAssets.platform,
        buildingSource: sourceAssets.building,
        hazardSource: sourceAssets.hazard
      })
    : {};

  return {
    images: approved,
    referenceAssets,
    approvedKeys,
    rejected,
    missingRequired,
    reverseLocked: reverse,
    engine,
    buildId: buildId || manifest.buildId || '',
    provenance: approvedProvenance,
    audit: {
      requiredCount: required.length,
      approvedCount: approvedKeys.length,
      rejectedCount: rejected.length,
      sourceAssetCount: Object.keys(currentAssets).length,
      fallbackAssetCount: Object.keys(fallbackCandidates).length
    }
  };
}
