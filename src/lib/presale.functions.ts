import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { presaleSchema } from "./presale";
import type { Database } from "@/integrations/supabase/types";
export const submitPresale=createServerFn({method:"POST"}).inputValidator((input:unknown)=>presaleSchema.parse(input)).handler(async({data})=>{
 const url=process.env['SUPABASE_URL'],key=process.env['SUPABASE_PUBLISHABLE_KEY'];if(!url||!key)throw new Error("Service unavailable");
 const client=createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const headers=new Headers(init?.headers);if(key.startsWith("sb_")&&headers.get("Authorization")===`Bearer ${key}`)headers.delete("Authorization");headers.set("apikey",key);return fetch(input,{...init,headers});}}});
 const {error}=await client.from("presale_leads").insert({...data,phone:data.phone||null});if(error)throw new Error("Unable to save interest");return {ok:true};
});
