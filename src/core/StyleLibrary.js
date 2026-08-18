
export const STYLE_LIBRARY = [
  {
    id:'cinematic-photo',
    name:'Cinematic Photo',
    publicDescription:'Photographic environments, cinematic contrast, restrained UI, realistic surface treatment.',
    testComparable:'Test reference: modern cinematic open-world realism',
    artMode:'photo',
    overlay:'cinema',
    paletteMode:'source',
    fidelity:'high'
  },
  {
    id:'mascot-64',
    name:'Mascot 64',
    publicDescription:'Chunky 3D-era silhouettes, bright materials, playful scale, wide readable environments.',
    testComparable:'Test reference: late-1990s 3D mascot platformer',
    artMode:'illustrated',
    overlay:'soft-vignette',
    paletteMode:'bright',
    fidelity:'medium'
  },
  {
    id:'speed-16',
    name:'Speed 16',
    publicDescription:'Saturated 16-bit arcade look, layered parallax, bold sprites, fast visual rhythm.',
    testComparable:'Test reference: 16-bit high-speed platformer',
    artMode:'pixel',
    overlay:'scanline-light',
    paletteMode:'saturated',
    fidelity:'medium'
  },
  {
    id:'arcade-8',
    name:'Arcade 8',
    publicDescription:'Simple 8-bit forms, limited palette, crisp readability, classic arcade framing.',
    testComparable:'Test reference: early console platform game',
    artMode:'pixel-low',
    overlay:'crt',
    paletteMode:'limited',
    fidelity:'low'
  },
  {
    id:'graphic-novel',
    name:'Graphic Novel',
    publicDescription:'Cel-shaded forms, ink outlines, dramatic framing, story-driven presentation.',
    testComparable:'Test reference: narrative comic-book adventure',
    artMode:'ink',
    overlay:'comic',
    paletteMode:'contrast',
    fidelity:'medium'
  },
  {
    id:'block-sandbox',
    name:'Block Sandbox',
    publicDescription:'Modular block forms, toy-like proportions, bright social-world presentation.',
    testComparable:'Test reference: blocky creator/social sandbox',
    artMode:'block',
    overlay:'clean',
    paletteMode:'bright',
    fidelity:'medium'
  },
  {
    id:'storybook',
    name:'Storybook Animation',
    publicDescription:'Polished family-animation feel, rounded shapes, expressive staging, soft lighting.',
    testComparable:'Test reference: premium family animation',
    artMode:'storybook',
    overlay:'bloom',
    paletteMode:'warm',
    fidelity:'high'
  },
  {
    id:'retro-handheld',
    name:'Retro Handheld',
    publicDescription:'Small-palette handheld graphics, chunky motion, nostalgic screen treatment.',
    testComparable:'Test reference: classic portable-console game',
    artMode:'pixel-low',
    overlay:'handheld',
    paletteMode:'limited',
    fidelity:'low'
  }
];

export const OVERLAY_LIBRARY = [
  {id:'none',name:'None',description:'Clean native render.'},
  {id:'cinema',name:'Cinema',description:'Letterbox, subtle grain, cinematic contrast.'},
  {id:'soft-vignette',name:'Soft Vignette',description:'Darkened edges and depth emphasis.'},
  {id:'scanline-light',name:'Light Scanlines',description:'Subtle arcade scanline texture.'},
  {id:'crt',name:'CRT',description:'Scanlines, vignette and slight glow.'},
  {id:'comic',name:'Comic Ink',description:'Halftone texture and panel-like contrast.'},
  {id:'bloom',name:'Soft Bloom',description:'Gentle glow and lifted highlights.'},
  {id:'handheld',name:'Handheld Screen',description:'Muted display texture and compact-screen feel.'},
  {id:'film-grain',name:'Film Grain',description:'Photographic grain without changing game logic.'},
  {id:'vhs',name:'VHS',description:'Retro tape noise and faint horizontal distortion.'}
];

export function getStyle(id){
  return STYLE_LIBRARY.find(s=>s.id===id) || STYLE_LIBRARY[0];
}
