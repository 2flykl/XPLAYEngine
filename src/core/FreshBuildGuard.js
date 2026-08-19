const LEGACY_AIRPORT_TITLES = new Set([
  'Airport District','Runway Rush','Tarmac Drop','Gate Pass','Flight Call',
  'Gate Match','Airfield Zero','Hangar Clash','Runway Circuit','Terminal Jump'
]);

const AVIATION_RE = /\b(airport|airfield|airplane|plane|jet|runway|boarding|terminal|pilot|flight|hangar|tarmac)\b/i;

function currentText(context={}) {
  return [
    context.prompt,
    context.description,
    context.analysis?.player,
    context.analysis?.environment,
    context.analysis?.notableObjects,
    context.analysis?.strongOpportunities
  ].filter(Boolean).join(' ');
}

export function currentBuildSupportsAviation(context={}) {
  return AVIATION_RE.test(currentText(context));
}

export function scrubLegacyBuildDNA(manifest={}, context={}) {
  const m = manifest;
  const aviation = currentBuildSupportsAviation(context);

  // Old airport prototype flags are forbidden from surviving into unrelated builds.
  if (!aviation) {
    if (m.variant === 'airport') delete m.variant;
    if (m.airportTheme) delete m.airportTheme;

    if (LEGACY_AIRPORT_TITLES.has(String(m.title || '').trim())) {
      m.title = '';
    }

    const fields = ['environment','collectibles','hazards'];
    for (const field of fields) {
      if (typeof m[field] === 'string' && AVIATION_RE.test(m[field])) {
        delete m[field];
      }
    }
  }

  m.buildFreshness = {
    sourceBound: true,
    legacyAirportPurged: !aviation,
    evaluatedAt: new Date().toISOString()
  };
  return m;
}

export function sanitizeAssetRef(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const ref = sanitizeAssetRef(item);
      if (ref) return ref;
    }
    return '';
  }
  if (value && typeof value === 'object') {
    for (const key of ['image','url','src','dataUrl','dataURL','path']) {
      const ref = sanitizeAssetRef(value[key]);
      if (ref) return ref;
    }
  }
  return '';
}

export function sanitizeAssetMap(map={}) {
  const out = {};
  for (const [key,value] of Object.entries(map || {})) {
    const ref = sanitizeAssetRef(value);
    if (ref) out[key] = ref;
  }
  return out;
}
