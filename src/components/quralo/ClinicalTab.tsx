import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, formatDateTimeIt } from "@/lib/quralo";
import { Empty, ErrorBox, Loading, PatientSelect, Section } from "./common";

export function ClinicalTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [pid, setPid] = useState("");
  const [f, setF] = useState({ anamnesis: "", treatment_plan: "", session_notes: "" });
  const [saving, setSaving] = useState(false);
  const notes = useQuery({ queryKey: ["notes", filter], queryFn: async () => {
    let r = supabase.from("clinical_notes").select("*, patients(first_name,last_name)").order("created_at", { ascending: false });
    if (filter !== "all") r = r.eq("patient_id", filter);
    const { data, error } = await r; if (error) throw error; return data;
  } });
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!pid) return toast.error("Scegli il paziente.");
    if (!f.anamnesis.trim() && !f.treatment_plan.trim() && !f.session_notes.trim()) return toast.error("Compila almeno un campo.");
    setSaving(true);
    const { error } = await supabase.from("clinical_notes").insert({ patient_id: pid, anamnesis: f.anamnesis.trim() || null, treatment_plan: f.treatment_plan.trim() || null, session_notes: f.session_notes.trim() || null });
    setSaving(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Nota salvata."); setF({ anamnesis: "", treatment_plan: "", session_notes: "" }); qc.invalidateQueries({ queryKey: ["notes"] });
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Nuova nota clinica" description="Le note non si modificano: per correggere aggiungi una nuova nota.">
        <form onSubmit={save} className="space-y-3">
          <PatientSelect value={pid} onChange={setPid} />
          {(["anamnesis", "treatment_plan", "session_notes"] as const).map((k) => (
            <div key={k} className="space-y-1.5"><Label htmlFor={k}>{{ anamnesis: "Anamnesi", treatment_plan: "Piano di trattamento", session_notes: "Note di seduta" }[k]}</Label>
              <Textarea id={k} rows={3} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>))}
          <Button type="submit" className="h-11 w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Salva nota</Button>
        </form>
      </Section>
      <Section title="Storico note">
        <div className="mb-3"><PatientSelect value={filter} onChange={setFilter} allowAll /></div>
        {notes.isLoading ? <Loading /> : notes.isError ? <ErrorBox error={notes.error} onRetry={() => notes.refetch()} /> : !notes.data?.length ? <Empty>Nessuna nota.</Empty> : (
          <ul className="space-y-3">{notes.data.map((n) => (
            <li key={n.id} className="rounded-lg border p-3 text-sm">
              <p className="mb-1 text-xs text-muted-foreground">{formatDateTimeIt(n.created_at)} · {n.patients ? `${n.patients.first_name} ${n.patients.last_name}` : ""}</p>
              {n.anamnesis && <p><b>Anamnesi:</b> {n.anamnesis}</p>}{n.treatment_plan && <p><b>Piano:</b> {n.treatment_plan}</p>}{n.session_notes && <p><b>Seduta:</b> {n.session_notes}</p>}
            </li>))}</ul>)}
      </Section>
    </div>
  );
}
