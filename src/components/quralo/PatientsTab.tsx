import { useMemo, useState, type FormEvent } from "react";
import { Loader2, PenLine, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { CF_REGEX, errorMessage, parseTags } from "@/lib/quralo";
import { fullName, patientsQuery, type Patient } from "@/lib/queries";
import { Empty, ErrorBox, Loading, Section } from "./common";
import { SignatureDialog } from "./SignatureDialog";

export function PatientsTab() {
  const q = useQuery(patientsQuery);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [signing, setSigning] = useState<Patient | null>(null);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((p) => !s || [p.first_name, p.last_name, p.email, p.phone, p.fiscal_code, ...p.tags].some((v) => v?.toLowerCase().includes(s)));
  }, [q.data, search]);

  return (
    <Section title="Pazienti e firma" description="Anagrafica, informativa privacy e consenso marketing."
      action={<Button className="h-11" onClick={() => setCreating(true)}><Plus />Nuovo paziente</Button>}>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Cerca paziente" placeholder="Cerca per nome, telefono, CF, tag..." className="h-11 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {q.isLoading ? <Loading /> : q.isError ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : list.length === 0 ? (
        <Empty>{q.data?.length ? "Nessun paziente corrisponde alla ricerca." : "Nessun paziente ancora. Aggiungi il primo!"}</Empty>
      ) : (
        <div className="divide-y rounded-lg border">
          <div className="hidden grid-cols-[1.4fr_1.4fr_1fr_auto_auto] gap-3 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
            <span>Nome</span><span>Contatti</span><span>Codice fiscale</span><span>Informativa</span><span>Marketing</span>
          </div>
          {list.map((p) => (
            <div key={p.id} className="grid gap-1.5 px-3 py-3 md:grid-cols-[1.4fr_1.4fr_1fr_auto_auto] md:items-center md:gap-3">
              <div><p className="font-medium">{fullName(p)}</p>
                {p.tags.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{p.tags.map((t) => <Badge key={t} variant="secondary" className="text-[11px]">{t}</Badge>)}</div>}</div>
              <div className="text-sm text-muted-foreground"><p>{p.phone || "—"}</p><p className="truncate">{p.email || ""}</p></div>
              <p className="font-mono text-xs">{p.fiscal_code || "—"}</p>
              <div>{p.consent_privacy ? <Badge className="bg-success-soft text-success hover:bg-success-soft">Firmata</Badge> : (
                <Button size="sm" variant="outline" className="h-9 border-warning-border bg-warning-soft text-warning" onClick={() => setSigning(p)}><PenLine className="size-3.5" />Da firmare</Button>)}</div>
              <div><Badge variant={p.consent_marketing ? "default" : "outline"}>{p.consent_marketing ? "Consenso si'" : "Nessun consenso"}</Badge></div>
            </div>
          ))}
        </div>
      )}
      <NewPatientDialog open={creating} onClose={() => setCreating(false)} onCreated={(p) => { setCreating(false); setSigning(p); }} />
      <SignatureDialog patient={signing} onClose={() => setSigning(null)} />
    </Section>
  );
}

const EMPTY = { first_name: "", last_name: "", email: "", phone: "", fiscal_code: "", tags: "", referred_by_code: "" };

function NewPatientDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: Patient) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null);
    const cf = f.fiscal_code.trim().toUpperCase();
    if (!f.first_name.trim() || !f.last_name.trim()) { setErr("Nome e cognome sono obbligatori."); return; }
    if (cf && !CF_REGEX.test(cf)) { setErr("Codice fiscale non valido. Controlla i 16 caratteri."); return; }
    setSaving(true);
    const { data, error } = await supabase.from("patients").insert({
      first_name: f.first_name.trim(), last_name: f.last_name.trim(),
      email: f.email.trim() || null, phone: f.phone.trim() || null, fiscal_code: cf || null,
      tags: parseTags(f.tags), referred_by_code: f.referred_by_code.trim().toUpperCase() || null,
    }).select().single();
    setSaving(false);
    if (error || !data) { setErr(errorMessage(error, "Salvataggio non riuscito.")); return; }
    toast.success("Paziente salvato. Ora la firma dell'informativa.");
    await qc.invalidateQueries({ queryKey: ["patients"] });
    setF(EMPTY); onCreated(data);
  }

  const field = (k: keyof typeof EMPTY, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1.5"><Label htmlFor={`np-${k}`}>{label}</Label><Input id={`np-${k}`} className="h-11" value={f[k]} onChange={set(k)} {...props} /></div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuovo paziente</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">{field("first_name", "Nome *", { required: true, autoComplete: "given-name" })}{field("last_name", "Cognome *", { required: true, autoComplete: "family-name" })}</div>
          <div className="grid gap-3 sm:grid-cols-2">{field("email", "Email", { type: "email", inputMode: "email" })}{field("phone", "Telefono", { type: "tel", inputMode: "tel", placeholder: "333 123 4567" })}</div>
          {field("fiscal_code", "Codice fiscale", { maxLength: 16, className: "h-11 font-mono uppercase", autoCapitalize: "characters" })}
          {field("tags", "Tag (separati da virgola)", { placeholder: "schiena, sportivo" })}
          {field("referred_by_code", "Codice amico (facoltativo)", { placeholder: "QRLXXXXX", className: "h-11 uppercase" })}
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={saving}>Annulla</Button>
            <Button type="submit" className="h-11" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Salva e firma</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
