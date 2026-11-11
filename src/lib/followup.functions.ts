import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const recordFollowup = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({patientId:z.string().uuid(),type:z.enum(["dormant","care_reminder"]),openedAt:z.string().datetime()}).parse(input)).handler(async({data,context})=>{
 const {error}=await context.supabase.from("marketing_events").insert({patient_id:data.patientId,therapist_id:context.userId,type:data.type,sent_at:data.openedAt});if(error)throw new Error("Could not record contact");return {ok:true};
});
