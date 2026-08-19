/* XPLAY Character Bible v4
 * Locks visual identity before pose generation. The image model is asked to preserve this
 * canonical identity across every animation cell instead of reinventing the hero per pose.
 */
export function buildCharacterBible({visualAnalysis={},prompt='',style='polished arcade',role='player'}={}){
  const subject=visualAnalysis.primarySubject||visualAnalysis.subject||visualAnalysis.player||'source-inspired original hero';
  const clothing=visualAnalysis.clothing||visualAnalysis.apparel||'preserve source clothing silhouette and dominant colors';
  const palette=visualAnalysis.palette||visualAnalysis.dominantColors||[];
  const traits=visualAnalysis.subjectTraits||visualAnalysis.features||[];
  return {
    version:4,role,subject,clothing,palette:Array.isArray(palette)?palette.slice(0,8):[],traits:Array.isArray(traits)?traits.slice(0,10):[],
    style,identityLock:`Same exact ${role} in every frame: same face structure, skin tone, hair, clothing, footwear, proportions, accessories and silhouette. Do not redesign between poses.`,
    silhouetteLock:'Keep head/body ratio and limb lengths stable across all frames.',
    scaleLock:'Center full body in every atlas cell at the same apparent scale and ground line.',
    promptContext:String(prompt||'').slice(0,600)
  };
}
export function characterBiblePrompt(bible={}){
  return `${bible.identityLock||''} ${bible.silhouetteLock||''} ${bible.scaleLock||''} Subject: ${bible.subject||'original hero'}. Clothing: ${bible.clothing||'consistent costume'}. Palette anchors: ${(bible.palette||[]).join(', ')||'source colors'}.`;
}
