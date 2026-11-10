import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarDays, Star, UserRoundPlus, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { localeFor } from "@/lib/i18n";
import { apptsLiteQuery, eventsQuery, fullName, patientsQuery, profileQuery, type Patient } from "@/lib/queries";
import { dayBounds, reactivationCandidates, reviewCandidates } from "@/lib/today";
import { Empty, ErrorBox, Loading, Section } from "./common";
import { FollowupDialog } from "./FollowupDialog";

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | null }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <Icon className="mb-3 size-5 text-primary" aria-hidden />
      <p className="text-3xl font-semibold tabular-nums">{value ?? "–"}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function useGrowthReadyCount() {
  const p = useQuery(patientsQuery), a = useQuery(apptsLiteQuery), e = useQuery(eventsQuery);
  if (!p.data || !a.data || !e.data) return 0;
  return reactivationCandidates(p.data, a.data).length + reviewCandidates(p.data, a.data, e.data).length;
}

export function TodayTab({ onSeeAll }: { onSeeAll: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  const [{ start, end }] = useState(() => dayBounds());
  const [selected, setSelected] = useState<Patient | null>(null);
  const today = useQuery({
    queryKey: ["appointments", "today", start.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("id,start_time,service_type,status,patients(first_name,last_name)")
        .neq("status", "cancelled").gte("start_time", start.toISOString()).lt("start_time", end.toISOString()).order("start_time");
      if (error) throw error; return data;
    },
  });
  const p = useQuery(patientsQuery), a = useQuery(apptsLiteQuery), e = useQuery(eventsQuery), profile = useQuery(profileQuery);
  const growthQueries = [p, a, e];
  const growthError = growthQueries.find((q) => q.isError);
  const ready = p.data && a.data && e.data;
  const now = Date.now();
  const dormant = ready ? reactivationCandidates(p.data, a.data, now) : [];
  const reviews = ready ? reviewCandidates(p.data, a.data, e.data, now) : [];
  const lastDays = (id: string) => {
    const times = (a.data ?? []).filter((x) => x.patient_id === id && x.status !== "cancelled").map((x) => new Date(x.start_time).getTime());
    return times.length ? Math.floor((now - Math.max(...times)) / 86_400_000) : 0;
  };
  const studio = profile.data?.studio_name || profile.data?.full_name || t("growth.practice");
  const fmtTime = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("today.title")}</h1>
        <p className="text-sm capitalize text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(start)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={CalendarDays} label={t("today.appointments")} value={today.data ? today.data.length : null} />
        <Stat icon={UserRoundPlus} label={t("today.reactivate")} value={ready ? dormant.length : null} />
        <Stat icon={Star} label={t("today.reviews")} value={ready ? reviews.length : null} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={t("today.agenda")}>
          {today.isLoading ? <Loading /> : today.isError ? <ErrorBox error={today.error} onRetry={() => today.refetch()} /> : !today.data?.length ? <Empty>{t("today.noAppts")}</Empty> : (
            <ul className="divide-y">
              {today.data.map((x) => (
                <li key={x.id} className="flex items-center gap-3 py-3">
                  <span className="w-14 shrink-0 font-semibold tabular-nums">{fmtTime.format(new Date(x.start_time))}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{x.patients ? `${x.patients.first_name} ${x.patients.last_name}` : ""}</p>
                    <p className="truncate text-sm text-muted-foreground">{t(`services.${x.service_type ?? "custom"}`)}</p>
                  </div>
                  <Badge variant={x.status === "scheduled" ? "default" : "outline"}>{t(`agenda.${x.status}`)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title={t("today.opportunities")} action={<Button variant="outline" size="sm" onClick={onSeeAll}>{t("today.seeAll")}</Button>}>
          {growthError ? <ErrorBox error={growthError.error} onRetry={() => growthQueries.forEach((q) => void q.refetch())} /> : !ready ? <Loading /> : !dormant.length ? <Empty>{t("today.noDormant")}</Empty> : (
            <ul className="divide-y">
              {dormant.slice(0, 3).map((pt) => (
                <li key={pt.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><p className="truncate font-medium">{fullName(pt)}</p><p className="text-sm text-muted-foreground">{t("today.lastVisit", { count: lastDays(pt.id) })}</p></div>
                  <Button size="sm" onClick={() => setSelected(pt)}>{t("today.write")}</Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <FollowupDialog patient={selected} days={selected ? lastDays(selected.id) : 0} studio={studio} onClose={() => setSelected(null)} />
    </div>
  );
}
