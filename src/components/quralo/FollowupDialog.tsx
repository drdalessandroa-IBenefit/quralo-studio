import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Patient } from "@/lib/queries";
import { FollowupPatient } from "./growth/FollowupPatient";

export function FollowupDialog({ patient, days, studio, onClose }: { patient: Patient | null; days: number; studio: string; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!patient} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("today.preview")}</DialogTitle></DialogHeader>
        {patient && <FollowupPatient patient={patient} days={days} studio={studio} />}
      </DialogContent>
    </Dialog>
  );
}
