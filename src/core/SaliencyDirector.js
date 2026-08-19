/* XPLAY Saliency Director v4
 * Encodes a simple hierarchy: player > hazards/rewards > route > decoration.
 * Runtime scenes use the resulting depth/alpha/scale hints so density does not become noise.
 */
export const SALIENCY={player:1,hazard:.92,collectible:.88,goal:.9,route:.76,enemy:.86,prop:.48,background:.22,foreground:.4};
export function saliencyStyle(role='prop',baseScale=1){
  const s=SALIENCY[role]??.5;return {saliency:s,depth:Math.round(s*30),alpha:.55+s*.45,scale:baseScale*(.88+s*.18)};
}
export function scoreSaliencyHierarchy({player=1,hazard=.9,collectible=.85,background=.25}={}){
  const ok=player>hazard&&player>collectible&&hazard>background&&collectible>background;return {pass:ok,score:ok?100:55};
}
