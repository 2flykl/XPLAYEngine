export const SCREENSHOT_PRESERVE_OPTIONS = [
  ['layout','Layout'],
  ['artStyle','Art style'],
  ['character','Character'],
  ['camera','Camera'],
  ['hud','HUD'],
  ['enemyPlacement','Enemy placement'],
  ['palette','Color palette'],
  ['levelStructure','Level structure']
];

export function defaultScreenshotGuide() {
  return {
    fidelity: 'blueprint',
    preserve: ['layout','artStyle','camera','palette','levelStructure'],
    objective: '',
    camera: 'auto',
    playerSource: 'source',
    doNotChange: '',
    motionHints: '',
    interpretationConfirmed: false
  };
}

export function summarizeScreenshotAnalysis(analysis = {}) {
  const player = analysis.player || 'a likely playable subject';
  const environment = analysis.environment || 'the visible environment';
  const objects = analysis.notableObjects || 'visible scene objects';
  const opportunities = analysis.strongOpportunities || 'arcade gameplay';
  return `I see ${player} inside ${environment}. Important visible elements include ${objects}. The strongest playable cues suggest ${opportunities}. I will treat the screenshot as a visual specification and preserve its visible composition unless you tell me otherwise.`;
}

export function buildScreenshotReconstructionPrompt(basePrompt = '', guide = {}, analysis = {}) {
  const fidelityText = {
    blueprint: 'EXACT VISUAL BLUEPRINT: preserve the visible composition and spatial relationships as closely as technically possible.',
    strong: 'STRONG REFERENCE: preserve the dominant composition, art language and major object relationships while allowing practical gameplay adjustments.',
    inspiration: 'LOOSE INSPIRATION: preserve the core visual DNA but allow broader redesign.'
  }[guide.fidelity || 'blueprint'];

  const preserve = (guide.preserve || []).join(', ') || 'visible composition';
  const inferred = summarizeScreenshotAnalysis(analysis);
  const extras = [
    guide.objective ? `PLAYER OBJECTIVE: ${guide.objective}` : '',
    guide.camera && guide.camera !== 'auto' ? `CAMERA LOCK: ${guide.camera}` : '',
    guide.playerSource ? `PLAYER IDENTITY: ${guide.playerSource}` : '',
    guide.doNotChange ? `DO NOT REDESIGN: ${guide.doNotChange}` : '',
    guide.motionHints ? `MOTION / PATROL HINTS: ${guide.motionHints}` : ''
  ].filter(Boolean).join('\n');

  return [
    '[XPLAY REVERSE FORGE — SCREENSHOT TO GAME]',
    'The uploaded screenshot is a VISUAL SPECIFICATION, not merely inspiration.',
    fidelityText,
    `PRESERVE: ${preserve}.`,
    'Reconstruct visible player scale, camera framing, object relationships, spatial hierarchy, palette, environment grammar, apparent gameplay cues, and major landmarks.',
    'Infer only information that is not observable in the screenshot. Any inferred content must extend the screenshot’s established visual and gameplay grammar rather than replace it.',
    inferred,
    extras,
    basePrompt ? `USER GAMEPLAY INTENT: ${basePrompt}` : 'USER GAMEPLAY INTENT: infer sensible playable rules from visible cues.'
  ].filter(Boolean).join('\n');
}
