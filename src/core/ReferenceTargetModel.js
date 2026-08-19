/* XPLAY Reference Target Model v4
 * Reverse-engineered structural targets from polished commercial 2D game screenshots.
 * It never copies protected art; it captures measurable composition/density/animation goals.
 */
export const TARGETS={
  platformer:{terrain:20,props:16,hazards:4,collectibles:3,enemies:3,layers:5,ambient:3,screenOccupancy:[.58,.82],prototypeMax:.26,frameScore:78,heroScale:[.075,.22],signatureBudget:28},
  runner:{terrain:18,props:16,hazards:4,collectibles:3,enemies:2,layers:5,ambient:3,screenOccupancy:[.56,.80],prototypeMax:.27,frameScore:77,heroScale:[.07,.20],signatureBudget:30},
  fighting:{terrain:4,props:12,hazards:0,collectibles:0,enemies:1,layers:4,ambient:3,screenOccupancy:[.62,.90],prototypeMax:.24,frameScore:80,heroScale:[.16,.34],signatureBudget:32},
  fps:{terrain:4,props:14,hazards:0,collectibles:0,enemies:3,layers:4,ambient:3,screenOccupancy:[.55,.86],prototypeMax:.25,frameScore:79,heroScale:[.20,.42],signatureBudget:30}
};
export function targetFor(engine='runner'){return TARGETS[engine]||{terrain:10,props:10,hazards:2,collectibles:2,enemies:2,layers:4,ambient:2,screenOccupancy:[.5,.85],prototypeMax:.32,frameScore:72,signatureBudget:25};}

// Multi-objective visual quality function. High entropy alone is not enough: detail must remain
// coherent, layered and readable while repetition/prototype signals are explicitly penalized.
export function visualObjective({sceneEntropy=.5,composition=.5,artCoherence=.75,depth=.5,motion=.5,landmark=.5,novelty=.5,repetition=.3,prototype=.3,readability=.8}={}){
  const q=.22*sceneEntropy+.20*composition+.18*artCoherence+.15*depth+.10*motion+.10*landmark+.05*novelty-.20*repetition-.25*prototype;
  const constrained=readability<.7?q*.62:q;return Math.max(0,Math.min(100,Math.round(100*constrained)));
}
