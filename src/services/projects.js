
import { supabase } from './supabase.js';

export async function saveProjectToSupabase(project){
  if(!supabase) return {ok:false,reason:'supabase-not-configured'};
  const user=(await supabase.auth.getUser()).data.user;
  if(!user) return {ok:false,reason:'sign-in-required'};

  const row={
    creator_id:user.id,
    title:project.title,
    slug:project.slug,
    engine:project.manifest.engine,
    manifest:project.manifest,
    style_dna:project.styleDNA,
    status:'draft'
  };
  const {data,error}=await supabase.from('plx_projects').upsert(row,{onConflict:'slug'}).select().single();
  return error ? {ok:false,reason:error.message} : {ok:true,data};
}

export async function uploadSourceToSupabase(file, projectSlug){
  if(!supabase) return {ok:false,reason:'supabase-not-configured'};
  const user=(await supabase.auth.getUser()).data.user;
  if(!user) return {ok:false,reason:'sign-in-required'};
  const path=`${user.id}/${projectSlug}/${Date.now()}-${file.name}`;
  const {data,error}=await supabase.storage.from('plx-media').upload(path,file,{upsert:false});
  return error ? {ok:false,reason:error.message} : {ok:true,data};
}
