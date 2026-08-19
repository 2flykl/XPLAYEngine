const now = () => new Date().toISOString();

function hashString(input='') {
  let h = 2166136261;
  for (let i=0;i<input.length;i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8,'0');
}

export function createBuildId({sourceDataUrl='', prompt='', engine='', timestamp=Date.now()}={}) {
  return `plx-${hashString(`${sourceDataUrl.slice(0,512)}|${prompt}|${engine}|${timestamp}`)}-${timestamp.toString(36)}`;
}

export function createBuildDNA({
  sourceDataUrl='',
  prompt='',
  engine='',
  feel='',
  style='',
  analysis={},
  screenshotGuide=null,
  sourceFileName='',
  buildId=''
}={}) {
  const id = buildId || createBuildId({sourceDataUrl,prompt,engine});
  return {
    version: 1,
    buildId: id,
    createdAt: now(),
    source: {
      fingerprint: hashString(sourceDataUrl.slice(0,4096)),
      fileName: sourceFileName || '',
      hasImage: !!sourceDataUrl,
      type: screenshotGuide ? 'screenshot' : 'standard-media'
    },
    intent: {
      prompt,
      engine,
      feel,
      style
    },
    vision: {
      analysis: analysis || {},
      confidence: Number(analysis?.qualityScore || 0),
      semanticProvider: analysis?.provider || analysis?.qualityLabel || 'unknown'
    },
    locks: {
      genre: engine || '',
      camera: screenshotGuide?.camera && screenshotGuide.camera !== 'auto' ? screenshotGuide.camera : '',
      preserve: screenshotGuide?.preserve || [],
      exactVisualBlueprint: screenshotGuide?.fidelity === 'blueprint',
      doNotChange: screenshotGuide?.doNotChange || '',
      objective: screenshotGuide?.objective || '',
      motionHints: screenshotGuide?.motionHints || ''
    },
    sceneGraph: {
      player: analysis?.player || '',
      environment: analysis?.environment || '',
      objects: analysis?.notableObjects || '',
      vehicles: analysis?.vehicles || '',
      gameplaySignals: analysis?.strongOpportunities || '',
      camera: analysis?.camera || '',
      hud: analysis?.hud || '',
      threats: analysis?.threats || '',
      objective: analysis?.objective || ''
    },
    art: {
      palette: analysis?.dominantColors || '',
      style,
      playerIdentityLocked: true,
      sourceIdentityRequired: true
    },
    runtime: {
      engine,
      controls: '',
      objective: '',
      requiredAssets: [],
      startupDeadlineMs: 4500
    },
    fun: {
      profile: '',
      onboardingSeconds: 6,
      firstRewardSeconds: 8,
      firstChallengeSeconds: 12,
      signatureMomentRequired: true
    },
    provenance: {
      sourceBuildId: id,
      assets: {},
      staleAssetPolicy: 'reject'
    },
    qa: {
      preflightPassed: false,
      runtimeMounted: false,
      firstInputObserved: false,
      winReachable: false,
      failReachable: false,
      screenshotCompared: false
    }
  };
}

export function lockBuildDNA(dna, field, value, confidence=1) {
  dna ||= {};
  dna.lockedFacts ||= {};
  dna.lockedFacts[field] = { value, confidence, lockedAt: now() };
  return dna;
}

export function fact(dna, field, fallback='') {
  return dna?.lockedFacts?.[field]?.value ?? fallback;
}
