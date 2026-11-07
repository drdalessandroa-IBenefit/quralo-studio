import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SERVICES, errorMessage, formatDateTimeIt, serviceLabel } from "@/lib/quralo";
import { Empty, ErrorBox, Loading, PatientSelect, Section } from "./common";

const STATUS: Record<string, string> = { scheduled: "Prenotato", completed: "Completato", cancelled: "Annullato", no_show: "Non presentato" };

export function AgendaTab() {
  const qc = useQueryClient();
  const [history, setHistory] = useState(false);
  const [pid, setPid] = useState(""); const [svc, setSvc] = useState<string>(SERVICES[0].id);
  const [date, setDate] = useState(""); const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const q = useQuery({ queryKey: ["appointments", "list", history], queryFn: async () => {
    let r = supabase.from("appointments").select("*, patients(first_name,last_name)").order("start_time");
    if (!history) { const d = new Date(); d.setHours(0, 0, 0, 0); r = r.gte("start_time", d.toISOString()); }
    const { data, error } = await r; if (error) throw error; return data;
  } });
  async function book(e: FormEvent) {
    e.preventDefault();
    if (!pid || !date || !time) return toast.error("Scegli paziente, data e ora.");
    const s = SERVICES.find((x) => x.id === svc)!;
    const start = new Date(`${date}T${time}`); const end = new Date(start.getTime() + s.minutes * 60000);
    setSaving(true);
    try {
      const { data: clash, error: ce } = await supabase.from("appointments").select("id").neq("status", "cancelled").lt("start_time", end.toISOString()).gt("end_time", start.toISOString()).limit(1);
      if (ce) throw ce;
      if (clash.length) { toast.error("In quell'orario hai gia' un appuntamento: scegli un altro orario."); return; }
      const { error } = await supabase.from("appointments").insert({ patient_id: pid, service_type: s.id, start_time: start.toISOString(), end_time: end.toISOString() });
      if (error) throw error;
      toast.success("Appuntamento prenotato."); setTime(""); qc.invalidateQueries({ queryKey: ["appointments"] });
    } catch (err) { toast.error(errorMessage(err)); } finally { setSaving(false); }
  }
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) return toast.error(errorMessage(error));
    toast.success(`Segnato come ${STATUS[status].toLowerCase()}.`); qc.invalidateQueries({ queryKey: ["appointments"] });
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Section title="Prenota">
        <form onSubmit={book} className="space-y-3">
          <PatientSelect value={pid} onChange={setPid} />
          <Select value={svc} onValueChange={setSvc}><SelectTrigger className="h-11 w-full" aria-label="Servizio"><SelectValue /></SelectTrigger>
            <SelectContent>{SERVICES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label} · {s.minutes} min</SelectItem>)}</SelectContent></Select>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="d">Data</Label><Input id="d" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="t">Ora</Label><Input id="t" type="time" step={300} className="h-11" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Prenota</Button>
        </form>
      </Section>
      <Section title="Appuntamenti" action={<label className="flex items-center gap-2 text-sm"><Checkbox checked={history} onCheckedChange={(v) => setHistory(v === true)} />Mostra anche lo storico</label>}>
        {q.isLoading ? <Loading /> : q.isError ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? <Empty>Nessun appuntamento.</Empty> : (
          <ul className="space-y-2">{q.data.map((a) => (
            <li key={a.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-medium">{a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : ""}</p>
                  <p className="text-sm text-muted-foreground">{formatDateTimeIt(a.start_time)} · {serviceLabel(a.service_type)}</p></div>
                <Badge variant={a.status === "scheduled" ? "default" : "outline"}>{STATUS[a.status]}</Badge>
              </div>
              {a.status === "scheduled" && <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" className="h-9" onClick={() => setStatus(a.id, "completed")}>Completato</Button>
                <Button size="sm" variant="outline" className="h-9" onClick={() => setStatus(a.id, "no_show")}>Non presentato</Button>
                <Button size="sm" variant="ghost" className="h-9 text-destructive" onClick={() => setStatus(a.id, "cancelled")}>Annulla</Button></div>}
            </li>))}</ul>)}
      </Section>
    </div>
  );
}
