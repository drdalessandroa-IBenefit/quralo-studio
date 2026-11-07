import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import { PRIVACY_TEXT_VERSION, errorMessage } from "@/lib/quralo";
import { fullName, type Patient } from "@/lib/queries";

export function SignatureDialog({ patient, onClose }: { patient: Patient | null; onClose: () => void }) {
  const pad = useRef<SignaturePadHandle>(null);
  const qc = useQueryClient();
  const [marketing, setMarketing] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!patient || !pad.current) return;
    if (pad.current.isEmpty()) { toast.error("Serve la firma del paziente prima di salvare."); return; }
    setSaving(true);
    try {
      const { data: u, error: ue } = await supabase.auth.getUser();
      if (ue || !u.user) throw ue ?? new Error("Sessione scaduta, accedi di nuovo.");
      const blob = await pad.current.toBlob();
      if (!blob) throw new Error("Impossibile leggere la firma, riprova.");
      const path = `${u.user.id}/${patient.id}_${Date.now()}.png`;
      const up = await supabase.storage.from("signatures").upload(path, blob, { contentType: "image/png", upsert: false });
      if (up.error) throw up.error;
      const now = new Date().toISOString();
      const { error } = await supabase.from("patients").update({
        consent_privacy: true, consent_date: now, consent_text_version: PRIVACY_TEXT_VERSION, signature_path: path,
        consent_marketing: marketing, consent_marketing_date: marketing ? now : null,
      }).eq("id", patient.id);
      if (error) throw error;
      toast.success("Informativa firmata e salvata.");
      await qc.invalidateQueries({ queryKey: ["patients"] });
      setMarketing(false); onClose();
    } catch (e) {
      toast.error(errorMessage(e, "Salvataggio della firma non riuscito."));
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={!!patient} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Firma informativa — {patient && fullName(patient)}</DialogTitle>
          <DialogDescription>Versione testo {PRIVACY_TEXT_VERSION}</DialogDescription>
        </DialogHeader>
        <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted p-3 text-sm leading-relaxed">
          <p className="font-semibold">Informativa sul trattamento dei dati personali (artt. 13 e 14 Reg. UE 2016/679 – GDPR)</p>
          <p className="mt-2">Il titolare del trattamento, professionista sanitario dello studio, tratta i tuoi dati personali, inclusi i dati relativi alla salute, esclusivamente per finalita' di cura (valutazione, trattamento e follow-up) e per la gestione amministrativa e fiscale delle prestazioni, compresi gli obblighi verso il Sistema Tessera Sanitaria.</p>
          <p className="mt-2">I dati sono conservati per il tempo previsto dalla legge, non sono diffusi e possono essere comunicati solo a soggetti obbligati per legge o a fornitori tecnici nominati responsabili. Puoi esercitare in ogni momento i diritti di accesso, rettifica, cancellazione, limitazione, portabilita' e opposizione, e proporre reclamo al Garante per la protezione dei dati personali.</p>
          <p className="mt-2">Firmando dichiari di aver preso visione della presente informativa.</p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox id="mkt" checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} className="mt-0.5 size-5" />
          <Label htmlFor="mkt" className="text-sm font-normal leading-snug">
            <span className="font-medium">Facoltativo.</span> Acconsento a ricevere messaggi WhatsApp di promemoria, inviti a controlli e richieste di recensione. Posso revocare il consenso in qualsiasi momento, senza alcuna conseguenza sulle cure.
          </Label>
        </div>
        <SignaturePad ref={pad} onChange={setEmpty} />
        <DialogFooter className="gap-2">
          <Button variant="outline" className="h-11" onClick={onClose} disabled={saving}>Firma piu' tardi</Button>
          <Button className="h-11" onClick={save} disabled={saving || empty}>{saving && <Loader2 className="animate-spin" />}Salva firma</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
