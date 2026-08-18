import { deriveLocalAssets } from './AssetFactory.js';
function dataSvg(svg){return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;}
const C={navy:'#10283d',teal:'#24c9c5',lime:'#a7e34b',white:'#f7fbfc',orange:'#ffb347',pink:'#ff6ab5',red:'#ef5b6a',purple:'#7868e6',steel:'#6b7f8c'};
const svg=(w,h,body)=>dataSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
function fallbacks(engine='runner'){
 const common={
  collectible:svg(96,96,`<circle cx="48" cy="48" r="35" fill="${C.teal}"/><path d="M48 21l8 17 19 3-14 14 4 20-17-9-17 9 4-20-14-14 19-3z" fill="white"/>`),
  hazard:svg(110,100,`<path d="M15 80L55 12 95 80Z" fill="${C.orange}" stroke="${C.navy}" stroke-width="7"/><path d="M53 35v24" stroke="white" stroke-width="8"/><circle cx="53" cy="70" r="5" fill="white"/>`),
  enemy:svg(120,140,`<circle cx="60" cy="37" r="25" fill="${C.red}" stroke="${C.navy}" stroke-width="6"/><rect x="28" y="62" width="64" height="55" rx="17" fill="${C.navy}" stroke="${C.red}" stroke-width="5"/><circle cx="48" cy="36" r="5" fill="white"/><circle cx="72" cy="36" r="5" fill="white"/>`),
  platform:svg(260,82,`<rect x="4" y="8" width="252" height="66" rx="18" fill="#425565" stroke="${C.teal}" stroke-width="5"/><path d="M20 28H240" stroke="white" opacity=".28" stroke-width="4"/>`)
 };
 const sets={
  runner:{hazard:svg(110,100,`<rect x="20" y="25" width="70" height="55" rx="12" fill="${C.navy}" stroke="${C.orange}" stroke-width="5"/><path d="M35 25v-9h40v9" fill="none" stroke="${C.steel}" stroke-width="6"/><circle cx="38" cy="85" r="7"/><circle cx="72" cy="85" r="7"/>`),collectible:svg(130,80,`<rect x="8" y="12" width="114" height="56" rx="12" fill="white"/><rect x="84" y="12" width="38" height="56" rx="10" fill="${C.teal}"/><path d="M92 27l19 13-19 13" fill="none" stroke="white" stroke-width="6"/><path d="M20 29h44M20 43h36" stroke="${C.navy}" stroke-width="5"/>`)},
  dodge:{hazard:svg(110,110,`<path d="M55 10l34 20v42L55 92 21 72V30z" fill="${C.red}" stroke="${C.navy}" stroke-width="6"/><circle cx="55" cy="50" r="14" fill="#081824"/><path d="M10 28l20 12M100 28L80 40M10 76l20-12M100 76L80 64" stroke="${C.teal}" stroke-width="7"/>`),collectible:svg(90,90,`<path d="M45 5l30 18v44L45 85 15 67V23z" fill="${C.lime}" stroke="${C.navy}" stroke-width="5"/><path d="M34 43h22M45 32v22" stroke="${C.navy}" stroke-width="6"/>`)},
  collect:{collectible:svg(88,112,`<path d="M44 8c20 18 24 42 7 58 10 1 18 7 18 18 0 14-11 22-25 22S19 98 19 84c0-11 8-17 18-18C20 50 24 26 44 8z" fill="${C.lime}" stroke="${C.navy}" stroke-width="5"/><circle cx="44" cy="84" r="9" fill="white"/>`),hazard:svg(120,95,`<path d="M5 83c18-28 28-46 42-63 8 19 12 29 18 42 7-10 14-20 25-33 10 19 17 35 25 54z" fill="#3b8b5d" stroke="${C.navy}" stroke-width="5"/>`)},
  rhythm:{note:svg(90,90,`<path d="M58 13v44c0 16-11 25-25 25-10 0-18-6-18-15 0-10 9-17 21-17 5 0 9 1 12 3V24l28-8v17z" fill="${C.pink}" stroke="${C.navy}" stroke-width="4"/>`),collectible:svg(90,90,`<circle cx="45" cy="45" r="35" fill="${C.purple}"/><path d="M28 45h34M45 28v34" stroke="white" stroke-width="7"/>`)},
  fps:{enemy:svg(130,150,`<path d="M65 8l44 24v55l-44 25-44-25V32z" fill="${C.navy}" stroke="${C.red}" stroke-width="6"/><rect x="37" y="38" width="56" height="32" rx="12" fill="#07131e"/><circle cx="52" cy="54" r="6" fill="${C.teal}"/><circle cx="78" cy="54" r="6" fill="${C.teal}"/><path d="M44 91h42" stroke="${C.red}" stroke-width="7"/>`),weapon:svg(390,150,`<path d="M30 92l210-50 105 28-16 39-103 12-45 24h-72l26-34-105 8z" fill="${C.navy}" stroke="${C.steel}" stroke-width="6"/><rect x="224" y="68" width="96" height="22" rx="7" fill="${C.teal}"/><circle cx="175" cy="91" r="13" fill="${C.purple}"/>`),crosshair:svg(90,90,`<circle cx="45" cy="45" r="21" fill="none" stroke="${C.teal}" stroke-width="5"/><path d="M45 3v22M45 65v22M3 45h22M65 45h22" stroke="white" stroke-width="5"/>`)},
  fighting:{enemy:svg(150,210,`<circle cx="76" cy="34" r="24" fill="#875336" stroke="${C.navy}" stroke-width="5"/><path d="M38 65q38-24 76 0l10 78q-48 24-96 0z" fill="${C.red}" stroke="${C.navy}" stroke-width="6"/><path d="M49 140l-9 60M101 140l11 60" stroke="${C.navy}" stroke-width="18"/><path d="M40 82L13 128M112 82l25 46" stroke="#875336" stroke-width="14"/>`)},
  openworld:{collectible:svg(90,100,`<path d="M45 7l31 20-12 59H26L14 27z" fill="${C.orange}" stroke="${C.navy}" stroke-width="5"/><circle cx="45" cy="48" r="13" fill="${C.teal}"/>`),npc:svg(110,160,`<circle cx="55" cy="31" r="19" fill="#875336"/><path d="M28 52q27-17 54 0v66H28z" fill="${C.purple}" stroke="${C.navy}" stroke-width="5"/><path d="M39 116l-4 40M70 116l5 40" stroke="${C.navy}" stroke-width="13"/>`),building:svg(180,145,`<rect x="8" y="35" width="164" height="102" rx="10" fill="#526b79" stroke="${C.navy}" stroke-width="6"/><rect x="28" y="53" width="32" height="27" fill="#dff6fa"/><rect x="76" y="53" width="32" height="27" fill="#dff6fa"/><rect x="124" y="53" width="28" height="27" fill="#dff6fa"/><rect x="70" y="96" width="42" height="41" fill="${C.navy}"/><rect x="8" y="24" width="164" height="17" rx="8" fill="${C.teal}"/>`)},
  racing:{enemy:svg(110,165,`<path d="M25 10h60l18 40v84l-18 20H25L7 134V50z" fill="${C.red}" stroke="${C.navy}" stroke-width="5"/><rect x="28" y="30" width="54" height="38" rx="9" fill="#142838"/><path d="M20 94h70" stroke="white" opacity=".4" stroke-width="5"/>`),collectible:svg(100,120,`<path d="M20 8h60v104H20z" rx="15" fill="${C.teal}" stroke="${C.navy}" stroke-width="5"/><path d="M50 20L30 65h18l-7 35 30-50H52z" fill="white"/>`)},
  platformer:{enemy:svg(110,105,`<path d="M17 73c0-31 17-55 38-55s38 24 38 55c0 13-9 21-38 21s-38-8-38-21z" fill="#6bc76c" stroke="${C.navy}" stroke-width="5"/><circle cx="43" cy="55" r="5"/><circle cx="67" cy="55" r="5"/><path d="M34 20L24 4M76 20L86 4" stroke="${C.pink}" stroke-width="7"/>`),collectible:svg(85,90,`<circle cx="42" cy="49" r="28" fill="${C.orange}" stroke="${C.navy}" stroke-width="5"/><path d="M42 20c4-14 14-17 22-14-5 11-12 16-22 14z" fill="${C.lime}"/>`),platform:svg(260,80,`<path d="M5 28h250v46H5z" fill="#73543b" stroke="${C.navy}" stroke-width="5"/><path d="M5 28c35-18 62 3 88-8 29-12 61 7 88-5 26-11 43-1 74 13H5z" fill="#5fc86c"/>`)},
  puzzle:{collectible:svg(92,92,`<path d="M10 10h72v72H10z" rx="14" fill="${C.purple}" stroke="${C.navy}" stroke-width="5"/><path d="M28 30h36v32H28z" fill="white" opacity=".85"/>`)}
 };
 return {...common,...(sets[engine]||{})};
}
function extractedOK(extraction){const a=extraction?.analysis||{};return extraction?.ok && (a.qualityScore||0)>=72;}
export async function deriveVisualAssets(dataUrl,styleDNA={},spec={},options={},extraction=null){
 const base=await deriveLocalAssets(dataUrl,styleDNA,spec,{...options,characterSource:'illustrated'});
 const ex=extraction?.assets||{}; const objects=(ex.objects||[]).map(x=>x.image).filter(Boolean); const fb=fallbacks(spec.engine||options.selectedEngine||'runner');
 const useExtracted=options.useObjects!==false && extractedOK(extraction);
 return {
   ...base,...fb,
   background:options.useEnvironment!==false&&(ex.backgroundClean||ex.mid)?(ex.backgroundClean||ex.mid):base.background,
   player:options.useSubject!==false&&ex.subject?ex.subject:base.player,
   hazard:useExtracted&&objects[0]?objects[0]:(fb.hazard||base.hazard),
   collectible:useExtracted&&objects[1]?objects[1]:(fb.collectible||base.collectible),
   enemy:useExtracted&&objects[2]?objects[2]:(fb.enemy||base.enemy),
   npc:fb.npc||base.npc,building:fb.building||base.building,note:fb.note||base.note,weapon:fb.weapon||base.weapon,crosshair:fb.crosshair||base.crosshair,
   parallax:{far:ex.far||ex.backgroundClean||base.background,mid:ex.mid||ex.backgroundClean||base.background,near:ex.near||ex.backgroundClean||base.background},
   extractionMeta:{...(extraction?.analysis||{}),objectUseMode:useExtracted?'clean extracted objects':'premium themed fallbacks'}
 };
}
