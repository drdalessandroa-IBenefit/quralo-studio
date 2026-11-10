import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorMessage } from "@/lib/quralo";
import { patientsQuery, fullName } from "@/lib/queries";

export function Loading({ label, rows = 3 }: { label?: string; rows?: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="space-y-2 py-2">
      <span className="sr-only">{label ?? t("common.loading")}</span>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg bg-soft" />)}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t, i18n } = useTranslation();
  return (
    <Alert variant="destructive" className="my-3">
      <AlertCircle className="size-4" />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{i18n.language === "it" ? errorMessage(error) : t("common.error")}</span>
        {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>{t("common.retry")}</Button>}
      </AlertDescription>
    </Alert>
  );
}

export function Section({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function PatientSelect({ value, onChange, id, placeholder, allowAll }: {
  value: string; onChange: (v: string) => void; id?: string; placeholder?: string; allowAll?: boolean;
}) {
  const { t } = useTranslation();
  const q = useQuery(patientsQuery);
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  return (
    <Select value={value} onValueChange={onChange} disabled={q.isLoading}>
      <SelectTrigger id={id} aria-label={t("common.patient")} className="h-11 w-full"><SelectValue placeholder={q.isLoading ? t("common.loading") : placeholder ?? t("common.patient")} /></SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">{t("common.allPatients")}</SelectItem>}
        {q.data?.map((p) => <SelectItem key={p.id} value={p.id}>{fullName(p)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
