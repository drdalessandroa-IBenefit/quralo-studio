import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CF_REGEX, errorMessage } from "@/lib/quralo";
import { profileQuery } from "@/lib/queries";
import { ErrorBox, Loading, Section } from "./common";

export function StudioTab() {
  const q = useQuery(profileQuery);
  const qc = useQueryClient();
  const [f, setF] = useState({ full_name: "", studio_name: "", fiscal_code: "", vat_number: "", google_review_url: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (q.data) setF({ full_name: q.data.full_name ?? "", studio_name: q.data.studio_name ?? "", fiscal_code: q.data.fiscal_code ?? "", vat_number: q.data.vat_number ?? "", google_review_url: q.data.google_review_url ?? "" }); }, [q.data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const cf = f.fiscal_code.trim().toUpperCase();
    if (cf && !CF_REGEX.test(cf)) return toast.error("Codice fiscale non valido.");
    if (f.vat_number && !/^[0-9]{11}$/.test(f.vat_number.trim())) return toast.error("La partita IVA deve avere 11 cifre.");
    if (f.google_review_url && !f.google_review_url.trim().startsWith("https://")) return toast.error("Il link Google deve iniziare con https://");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Sessione scaduta, accedi di nuovo."); }
    const { error } = await supabase.from("therapist_profiles").upsert({ id: u.user.id, full_name: f.full_name.trim() || null, studio_name: f.studio_name.trim() || null, fiscal_code: cf || null, vat_number: f.vat_number.trim() || null, google_review_url: f.google_review_url.trim() || null });
    setSaving(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Profilo salvato."); qc.invalidateQueries({ queryKey: ["profile"] });
  }
  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const fld = (k: keyof typeof f, label: string) => (<div className="space-y-1.5"><Label htmlFor={k}>{label}</Label><Input id={k} className="h-11" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>);
  return (
    <Section title="Studio" description="Dati del professionista usati in fatture, export e messaggi.">
      <form onSubmit={save} className="grid max-w-xl gap-3">
        {fld("full_name", "Nome e cognome")}{fld("studio_name", "Nome dello studio")}{fld("fiscal_code", "Codice fiscale professionista")}{fld("vat_number", "Partita IVA (11 cifre)")}{fld("google_review_url", "Link recensioni Google (https://...)")}
        <Button type="submit" className="h-11" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Salva profilo</Button>
      </form>
    </Section>
  );
}
