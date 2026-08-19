/* XPLAY Production Budget v4
 * Allocates disproportionate visual/gameplay effort to signature moments instead of
 * spreading polish uniformly across every section.
 */
const DEFAULT={intro:.08,firstChallenge:.10,combination:.12,riskReward:.14,signatureMoment:.28,finalStretch:.18,finish:.10};
export function allocateProductionBudget(total=100,overrides={}){
  const weights={...DEFAULT,...overrides};const sum=Object.values(weights).reduce((a,b)=>a+b,0)||1;
  const out={};for(const [k,v] of Object.entries(weights))out[k]=Math.round(total*v/sum);
  const diff=total-Object.values(out).reduce((a,b)=>a+b,0);out.signatureMoment=(out.signatureMoment||0)+diff;return out;
}
export function budgetAtSection(name,total=100){return allocateProductionBudget(total)[name]||10;}
