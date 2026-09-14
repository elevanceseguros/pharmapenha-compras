import {defineConfig,loadEnv} from 'vite';

export default defineConfig(({mode})=>{
 const fileEnv=loadEnv(mode,process.cwd(),'');
 const env={...fileEnv,...process.env};
 const supabaseUrl=env.VITE_SUPABASE_URL||env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL||'';
 const supabaseKey=env.VITE_SUPABASE_ANON_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY||env.SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY||env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
 return {define:{__SUPABASE_URL__:JSON.stringify(supabaseUrl),__SUPABASE_KEY__:JSON.stringify(supabaseKey)}};
});
