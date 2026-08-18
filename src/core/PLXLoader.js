const BASE_URL=import.meta.env.BASE_URL || './';
const pub=(p='')=>`${BASE_URL}${String(p).replace(/^\.\//,'').replace(/^\//,'')}`;

export async function loadPLX(id){
  const base=pub(`plx/${id}/`);
  const res=await fetch(`${base}manifest.json`);
  if(!res.ok)throw new Error(`Could not load PLX: ${id}`);
  const manifest=await res.json();
  manifest.__base=base;
  return manifest;
}
