import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Sun, Users, FileText, CalendarDays, Receipt, Rocket, Building2, Inbox, LogOut, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TodayTab, useGrowthReadyCount } from "@/components/quralo/TodayTab";
import { PatientsTab } from "@/components/quralo/PatientsTab";
import { ClinicalTab } from "@/components/quralo/ClinicalTab";
import { AgendaTab } from "@/components/quralo/AgendaTab";
import { InvoicesTab } from "@/components/quralo/InvoicesTab";
import { GrowthTab } from "@/components/quralo/growth/GrowthTab";
import { StudioTab } from "@/components/quralo/StudioTab";
import { PresaleLeadsTab } from "@/components/quralo/PresaleLeadsTab";
import { LanguageSelector } from "@/components/quralo/LanguageSelector";
import { errorMessage } from "@/lib/quralo";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Oggi — CareConnect" },
      { name: "description", content: "Area riservata dello studio." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

const TABS = [
  { v: "oggi", icon: Sun },
  { v: "pazienti", icon: Users, C: PatientsTab },
  { v: "agenda", icon: CalendarDays, C: AgendaTab },
  { v: "cartella", icon: FileText, C: ClinicalTab },
  { v: "fatture", icon: Receipt, C: InvoicesTab },
  { v: "growth", icon: Rocket, C: GrowthTab },
  { v: "studio", icon: Building2, C: StudioTab },
  { v: "leads", icon: Inbox, C: PresaleLeadsTab },
] as const;

function Dashboard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState("oggi");
  const ready = useGrowthReadyCount();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(errorMessage(error)); return; }
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="min-h-screen gap-0 lg:flex-row">
      <aside className="sticky top-0 z-20 border-b bg-card lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-3 lg:py-5">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm"><HeartPulse className="size-5" /></div>
            <span className="text-lg font-bold tracking-tight">CareConnect</span>
          </div>
          <div className="lg:hidden"><LanguageSelector /></div>
        </div>
        <nav aria-label="Studio" className="overflow-x-auto px-2 pb-2 lg:overflow-visible">
          <TabsList className="h-auto w-max gap-1 bg-transparent p-0 lg:w-full lg:flex-col lg:items-stretch">
            {TABS.map(({ v, icon: Icon }) => (
              <TabsTrigger key={v} value={v} className="min-h-11 justify-start gap-2 rounded-lg px-3 text-muted-foreground data-[state=active]:bg-soft data-[state=active]:text-primary data-[state=active]:shadow-none">
                <Icon className="size-4" />{t(`nav.${v}`)}
                {v === "growth" && ready > 0 && <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground" aria-label={`${ready}`}>{ready}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </nav>
        <div className="hidden space-y-2 border-t px-4 py-4 lg:block">
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <div className="flex items-center justify-between"><LanguageSelector />
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="size-4" />{t("nav.exit")}</Button></div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <TabsContent value="oggi"><TodayTab onSeeAll={() => setTab("growth")} /></TabsContent>
        {TABS.map((x) => "C" in x ? <TabsContent key={x.v} value={x.v}><x.C /></TabsContent> : null)}
        <div className="mt-8 lg:hidden"><Button variant="outline" className="w-full" onClick={signOut}><LogOut className="size-4" />{t("nav.exit")}</Button></div>
      </main>
    </Tabs>
  );
}
