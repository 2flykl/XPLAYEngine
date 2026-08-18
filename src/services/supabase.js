import { createClient } from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL; const anon=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase=(url&&anon)?createClient(url,anon):null;
export async function pingSupabase(){if(!supabase)return{connected:false,reason:'env-not-configured'};const {error}=await supabase.from('plx_projects').select('id').limit(1);return error?{connected:false,reason:error.message}:{connected:true};}
