import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Patient = Tables<"patients">;
export type Profile = Tables<"therapist_profiles">;

async function run<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

export const patientsQuery = queryOptions({
  queryKey: ["patients"],
  queryFn: () => run(supabase.from("patients").select("*").order("last_name").order("first_name")),
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u, error: ue } = await supabase.auth.getUser();
    if (ue || !u.user) throw ue ?? new Error("Sessione scaduta");
    return run<Profile | null>(supabase.from("therapist_profiles").select("*").eq("id", u.user.id).maybeSingle());
  },
});

export const apptsLiteQuery = queryOptions({
  queryKey: ["appointments", "lite"],
  queryFn: () => run(supabase.from("appointments").select("patient_id,start_time,status")),
});

export const eventsQuery = queryOptions({
  queryKey: ["marketing_events"],
  queryFn: () => run(supabase.from("marketing_events").select("patient_id,type,sent_at")),
});

export const referralQuery = queryOptions({
  queryKey: ["referral_codes"],
  queryFn: () => run(supabase.from("referral_codes").select("*")),
});

export const fullName = (p: Pick<Patient, "first_name" | "last_name">) => `${p.first_name} ${p.last_name}`;
