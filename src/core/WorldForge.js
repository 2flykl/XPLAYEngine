/* src/core/WorldForge.js */
// Procedural World Forge Asset & Level System for XPLAY.

import { getStyle } from './StyleLibrary.js';

// 1. World DNA Generator
export function generateWorldDNA(engine, prompt, feel, customData = {}) {
  const isAirport = /airport|plane|jet|runway|flight|boarding|terminal/.test((prompt || '').toLowerCase()) || !!customData.airportTheme;
  const environment = isAirport ? 'Airport runway and airfield' : 'Outdoor street avenue';
  const player = isAirport ? 'Traveler running for a flight' : 'Acrobatic street runner';
  const landmark = isAirport ? 'Private luxury jet' : 'Modern skyscrapers skyline';
  const palette = customData.palette || ['#0d223d', '#24c9c5', '#eef7f6', '#b7ef4b', '#ffffff'];

  return {
    genre: engine,
    camera: ['fps', 'rhythm', 'puzzle'].includes(engine) ? 'fixed' : 'follow',
    worldScale: '32px',
    tileGrammar: [
      'ground-center', 'ground-edge-left', 'ground-edge-right', 
      'ledge', 'corner-inner', 'corner-outer', 'slope-up', 'slope-down',
      'platform-thin', 'platform-moving', 'terminal-wall', 'hangar-roof'
    ],
    playerScale: '72px',
    environmentVocabulary: [
      'skyline', 'clouds', 'hangars', 'terminal towers', 'runway lines', 'distance planes'
    ],
    propVocabulary: [
      'luggage-stack', 'traffic-cones', 'baggage-carts', 'runway-lights', 
      'barriers', 'fuel-barrels', 'ground-crew-signs', 'terminal-clocks'
    ],
    enemyVocabulary: [
      'patrol-drone', 'security-robot', 'runway-sweeper', 'baggage-thrower'
    ],
    collectibleLanguage: {
      primary: 'passport',
      secondary: 'boarding-pass',
      elite: 'golden-ticket'
    },
    hazardLanguage: [
      'stray-luggage', 'incoming-baggage-cart', 'runway-cone-barrier', 'low-flying-drone'
    ],
    movementGrammar: ['run', 'jump', 'slide', 'wall-cling'],
    animationGrammar: ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'hurt', 'victory', 'defeat'],
    FXGrammar: ['hit-spark', 'collect-flash', 'jump-smoke', 'dust-landing', 'defeat-burst'],
    palette: palette,
    depth: 4,
    sceneDensity: 85,
    lighting: 'warm-top-left',
    materialLanguage: 'pixel-brushed-metal',
    signatureLandmark: landmark,
    signatureMechanic: engine === 'runner' ? 'high-speed-dash' : 'counter-strike',
    signatureEvent: isAirport ? 'low-flying-jet-flyover' : 'sudden-neon-blizzard',
    finishState: 'terminal-exit-gate',
    failState: 'defeat-by-hazard'
  };
}

// 2. Art Bible Compiler
export function generateArtBible(worldDNA, styleId) {
  const styles = {
    'cinematic-photo': { rendering: 'high-contrast photorealism', outlines: 'none', shadow: 'realistic soft shadows', contrast: { bg: '40%', play: '95%' } },
    'speed-16': { rendering: '16-bit saturated pixel-art', outlines: '2px dark navy', shadow: 'dithered shadow drops', contrast: { bg: '50%', play: '90%' } },
    'storybook': { rendering: 'polished animated illustration', outlines: '1.5px warm outline', shadow: 'soft ambient shadows', contrast: { bg: '45%', play: '95%' } },
    'block-sandbox': { rendering: 'modular block voxels', outlines: 'none', shadow: 'sharp directional shadows', contrast: { bg: '60%', play: '90%' } },
    'graphic-novel': { rendering: 'cel-shaded ink sketch', outlines: '3px bold black', shadow: 'halftone crosshatch', contrast: { bg: '30%', play: '100%' } },
    'mascot-64': { rendering: 'vibrant flat vector colors', outlines: '1px clean border', shadow: 'flat drop shadows', contrast: { bg: '40%', play: '92%' } }
  };
  const aesthetic = styles[styleId] || styles['cinematic-photo'];

  return {
    targetResolution: '960x600',
    pixelDensity: '2x',
    renderingStyle: aesthetic.rendering,
    perspective: 'side-view 2D',
    outlineTreatment: aesthetic.outlines,
    palette: worldDNA.palette,
    lightingDirection: 'top-left 45deg',
    shadowTreatment: aesthetic.shadow,
    materialTreatment: 'matte textures with light metallic reflection',
    environmentContrast: aesthetic.contrast.bg,
    foregroundContrast: '15%',
    playableLayerContrast: aesthetic.contrast.play,
    characterProportions: '3 head tall classic proportions',
    animationFrameRate: '12 fps',
    FXStyle: 'additive blend particles',
    UIStyle: 'modern neon arcade with clean typography',
    typographyDirection: 'sans-serif bold uppercase',
    spriteScaleRules: { player: '72x96', enemy: '64x80', collectible: '32x32', hazard: '48x48' }
  };
}

// 3. Level Blueprint Builder
export function generateLevelBlueprint(engine, worldDNA) {
  const isAirport = worldDNA.signatureLandmark.toLowerCase().includes('jet') || worldDNA.signatureLandmark.toLowerCase().includes('runway');
  return {
    intro: {
      pacing: 'safe',
      terrain: 'flat runway ground',
      description: 'Tutorial zone. Teach basic controls and introduce a safe passport collectible.'
    },
    firstChallenge: {
      pacing: 'medium',
      obstacles: isAirport ? ['stray luggage pile'] : ['street barrier'],
      description: 'First barrier setup. Force a simple jump over a single hazard.'
    },
    combination: {
      pacing: 'intense',
      description: 'Combine platforms and moving obstacles. Collectibles hover above the main runway.'
    },
    riskReward: {
      pacing: 'tactical',
      description: 'Optional high route along the terminal ledge or roof structure for golden tokens.'
    },
    signatureMoment: {
      pacing: 'spectacular',
      event: worldDNA.signatureEvent,
      description: isAirport 
        ? 'A private jet roars low overhead across the skyline, generating air turbulences.' 
        : 'The neon lights of the skyscrapers flicker dynamically to reveal high value collectibles.'
    },
    finalStretch: {
      pacing: 'maximum',
      description: 'Fast paced obstacle run. Heavy hazard frequency.'
    },
    finish: {
      pacing: 'triumphant',
      structure: worldDNA.finishState,
      description: 'Satisfying finish gate arrival with celebration triggers.'
    }
  };
}

// Helper: Procedural Canvas Renderer
function canvas(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (x) drawFn(x, c);
  return c.toDataURL('image/png');
}

// 4. World Forge Asset Manufacturing Kit
export function forgeWorldKit(worldDNA, artBible) {
  const P = artBible.palette;
  const primary = P[1] || '#24c9c5';
  const dark = P[0] || '#0d223d';
  const light = P[2] || '#eef7f6';
  const accent = P[3] || '#b7ef4b';

  const assets = {
    // Parallax background layers
    sky: canvas(960, 600, (x) => {
      const g = x.createLinearGradient(0, 0, 0, 600);
      g.addColorStop(0, dark);
      g.addColorStop(1, '#1b3b5c');
      x.fillStyle = g; x.fillRect(0, 0, 960, 600);
      // Subtle background clouds
      x.fillStyle = 'rgba(255, 255, 255, 0.08)';
      x.beginPath(); x.ellipse(200, 150, 180, 45, 0, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(750, 180, 240, 55, 0, 0, Math.PI * 2); x.fill();
    }),

    backgroundFar: canvas(960, 600, (x) => {
      // Draw far mountains or terminal silhouette
      x.fillStyle = 'rgba(27, 59, 92, 0.45)';
      // Silhouette mountains
      x.beginPath();
      x.moveTo(0, 600);
      x.lineTo(150, 320); x.lineTo(320, 410);
      x.lineTo(550, 280); x.lineTo(750, 450);
      x.lineTo(960, 300); x.lineTo(960, 600);
      x.closePath(); x.fill();
    }),

    backgroundMid: canvas(960, 600, (x) => {
      // Draw hangars, airport radar tower or buildings
      x.fillStyle = 'rgba(36, 201, 197, 0.28)';
      // Draw simple blocky structures representing terminal radar tower
      x.fillRect(100, 350, 180, 250);
      x.fillRect(160, 200, 60, 150); // radar stem
      x.beginPath(); x.arc(190, 200, 50, 0, Math.PI, true); x.fill(); // radar dish
      
      x.fillRect(520, 380, 320, 220); // hangar
      x.beginPath(); x.ellipse(680, 380, 160, 70, 0, Math.PI, 0); x.fill(); // hangar roof
    }),

    backgroundNear: canvas(960, 600, (x) => {
      // Close props, airport lights and taxi lanes
      x.fillStyle = 'rgba(238, 247, 246, 0.14)';
      x.fillRect(0, 480, 960, 120);
      // Small runway guidance poles
      x.fillStyle = primary;
      for (let i = 0; i < 960; i += 240) {
        x.fillRect(i + 80, 420, 6, 60);
        x.beginPath(); x.arc(i + 83, 420, 8, 0, Math.PI * 2); x.fill();
      }
    }),

    // Cohesive Tileset - packed as separate assets or tiles
    platform: canvas(280, 90, (x) => {
      // Concrete runway/grass tiles
      x.fillStyle = '#4a5759'; // concrete slate
      x.fillRect(4, 12, 272, 70);
      
      // Top grassy/runway edge border
      x.fillStyle = primary;
      x.fillRect(4, 12, 272, 8);
      
      // Taxi markings
      x.strokeStyle = '#ffffff';
      x.lineWidth = 4;
      x.setLineDash([12, 12]);
      x.beginPath(); x.moveTo(20, 50); x.lineTo(260, 50); x.stroke(); x.setLineDash([]);
      
      // Outline border
      x.strokeStyle = dark;
      x.lineWidth = 4;
      x.strokeRect(4, 12, 272, 70);
    }),

    // Detailed props (luggage stack, cones, radar)
    propLuggageStack: canvas(80, 80, (x) => {
      // Draw stacked suitcases
      const colors = [accent, primary, '#ff7c9c'];
      for(let i = 0; i < 3; i++) {
        x.fillStyle = colors[i];
        x.fillRect(10 + i * 8, 50 - i * 14, 48, 24);
        x.strokeStyle = dark;
        x.lineWidth = 3;
        x.strokeRect(10 + i * 8, 50 - i * 14, 48, 24);
        // Handle
        x.strokeRect(26 + i * 8, 30 - i * 14, 16, 8);
      }
    }),

    propCone: canvas(40, 40, (x) => {
      x.fillStyle = '#ff7f36'; // safety orange
      x.beginPath();
      x.moveTo(20, 4); x.lineTo(6, 36); x.lineTo(34, 36);
      x.closePath(); x.fill();
      x.strokeStyle = dark; x.lineWidth = 3; x.stroke();
      // White strip
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.moveTo(20, 16); x.lineTo(13, 28); x.lineTo(27, 28);
      x.closePath(); x.fill();
    }),

    // Flagship collectibles
    collectible: canvas(48, 48, (x) => {
      // A passport booklet
      x.fillStyle = '#1c3144'; // navy booklet
      x.fillRect(8, 8, 32, 32);
      x.strokeStyle = dark; x.lineWidth = 3; x.strokeRect(8, 8, 32, 32);
      // Gold emblem print
      x.fillStyle = accent;
      x.beginPath(); x.arc(24, 24, 6, 0, Math.PI * 2); x.fill();
      x.fillRect(16, 12, 16, 3);
    }),

    collectiblePass: canvas(48, 48, (x) => {
      // Boarding pass ticket
      x.fillStyle = '#ffffff';
      x.fillRect(4, 12, 40, 24);
      x.strokeStyle = dark; x.lineWidth = 3; x.strokeRect(4, 12, 40, 24);
      // Stripe
      x.fillStyle = primary;
      x.fillRect(32, 12, 12, 24);
      x.fillStyle = dark;
      x.fillRect(8, 20, 16, 3);
    }),

    // Flagship hazards
    hazard: canvas(64, 64, (x) => {
      // A safety airport barrier with red/white diagonal strips
      x.fillStyle = '#cccccc';
      x.fillRect(10, 46, 8, 14);
      x.fillRect(46, 46, 8, 14);
      x.fillStyle = '#ffffff';
      x.fillRect(4, 18, 56, 24);
      // Diagonal red strips
      x.fillStyle = '#ef5b6a';
      for(let i = 0; i < 5; i++) {
        x.beginPath();
        x.moveTo(8 + i * 10, 18); x.lineTo(18 + i * 10, 18);
        x.lineTo(8 + i * 10, 42); x.lineTo(-2 + i * 10, 42);
        x.closePath(); x.fill();
      }
      x.strokeStyle = dark; x.lineWidth = 3;
      x.strokeRect(4, 18, 56, 24);
    }),

    // UI overlays
    uiHeart: canvas(32, 32, (x) => {
      x.fillStyle = '#ff4d6d';
      x.beginPath();
      x.moveTo(16, 28);
      x.bezierCurveTo(4, 18, 2, 8, 16, 4);
      x.bezierCurveTo(30, 8, 28, 18, 16, 28);
      x.closePath(); x.fill();
      x.strokeStyle = dark; x.lineWidth = 2.5; x.stroke();
    })
  };

  return assets;
}

// 5. Visual Critic & Quality Gate Heuristics
export function analyzeVisualQuality(manifest) {
  const issues = [];
  const assets = manifest.assets?.images || {};
  let emptySpaceRatio = 0.2; // mock simulation
  
  // Rule checks
  if (!assets.background) {
    issues.push("Empty background: no sky or environment layer detected.");
  }
  if (!assets.player) {
    issues.push("No playable character asset in the manifest contract.");
  }
  if (!assets.platform && ['runner', 'platformer', 'fighting'].includes(manifest.engine)) {
    issues.push("Missing core terrain or floor tiles.");
  }
  
  // Custom diagnostic scoring
  const scores = {
    playability: assets.player && assets.background ? 100 : 0,
    genreCorrectness: ['runner', 'fighting', 'fps', 'platformer'].includes(manifest.engine) ? 100 : 80,
    artCoherence: assets.player && assets.collectible && assets.hazard ? 90 : 65,
    sceneDensity: assets.background && assets.platform && assets.hazard ? 85 : 55,
    visualPolish: assets.crosshair || assets.uiHeart || assets.collectiblePass ? 88 : 70
  };

  const overallScore = Math.round((scores.playability + scores.artCoherence + scores.sceneDensity + scores.visualPolish) / 4);
  const pass = overallScore >= 78 && scores.playability === 100;

  return {
    overallScore,
    pass,
    scores,
    issues,
    repairRoute: issues.map(issue => {
      if (issue.includes("background")) return { target: "background", action: "forgeWorldKit:sky" };
      if (issue.includes("character") || issue.includes("player")) return { target: "player", action: "deriveLocalAssets:hero" };
      if (issue.includes("terrain") || issue.includes("floor")) return { target: "platform", action: "forgeWorldKit:platform" };
      return { target: "fallback", action: "visualRepairPass" };
    })
  };
}
