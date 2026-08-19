/* XPLAY Visual Repair Director v4
 * Turns rendered-pixel criticism into targeted runtime repair directives. This is the closed
 * loop after generation: render -> measure -> repair -> render again.
 */
export function planVisualRepairs(report={},passIndex=0){
  const m=report.metrics||{},actions=[];
  if((m.occupancy??1)<.58)actions.push({type:'density-boost',amount:passIndex?2:1,reason:'low screen occupancy'});
  if((m.edgeDensity??1)<.085)actions.push({type:'detail-boost',amount:1,reason:'low edge/detail density'});
  if((m.colorDiversity??1)<.42)actions.push({type:'palette-boost',amount:1,reason:'low color diversity'});
  if((m.spatialComplexity??1)<.18)actions.push({type:'layer-boost',amount:1,reason:'flat spatial composition'});
  if((m.prototypeLikeness??0)>.34)actions.push({type:'prototype-repair',amount:2,reason:'prototype likeness too high'});
  return actions.slice(0,4);
}
export function shouldRepair(report,passIndex=0){return passIndex<3&&(!report?.pass||((report.metrics?.prototypeLikeness||0)>.3));}
