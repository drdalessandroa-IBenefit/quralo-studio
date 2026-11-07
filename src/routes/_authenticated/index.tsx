import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Users, FileText, CalendarDays, Receipt, Rocket, Building2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PatientsTab } from "@/components/quralo/PatientsTab";
import { ClinicalTab } from "@/components/quralo/ClinicalTab";
import { AgendaTab } from "@/components/quralo/AgendaTab";
import { InvoicesTab } from "@/components/quralo/InvoicesTab";
import { GrowthTab } from "@/components/quralo/growth/GrowthTab";
import { StudioTab } from "@/components/quralo/StudioTab";
import { errorMessage } from "@/lib/quralo";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Quralo — Il tuo studio" },
      { name: "description", content: "Pazienti, agenda, fatture e crescita dello studio di terapia manuale." },
      { property: "og:title", content: "Quralo — Il tuo studio" },
      { property: "og:description", content: "Pazienti, agenda, fatture e crescita dello studio di terapia manuale." },
    ],
  }),
  component: Dashboard,
});

const TABS = [
  { v: "pazienti", label: "Pazienti", icon: Users, C: PatientsTab },
  { v: "cartella", label: "Cartella", icon: FileText, C: ClinicalTab },
  { v: "agenda", label: "Agenda", icon: CalendarDays, C: AgendaTab },
  { v: "fatture", label: "Fatture e TS", icon: Receipt, C: InvoicesTab },
  { v: "growth", label: "Growth", icon: Rocket, C: GrowthTab },
  { v: "studio", label: "Studio", icon: Building2, C: StudioTab },
] as const;

function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(errorMessage(error)); return; }
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Tabs defaultValue="pazienti" className="min-h-screen gap-0">
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">Q</div>
            <span className="text-lg font-bold tracking-tight">Quralo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Esci"><LogOut className="size-4" /><span className="hidden sm:inline">Esci</span></Button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl overflow-x-auto px-2 pb-2">
          <TabsList className="h-auto w-max gap-1 bg-transparent p-0">
            {TABS.map(({ v, label, icon: Icon }) => (
              <TabsTrigger key={v} value={v} className="h-10 gap-1.5 rounded-lg px-3 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-none">
                <Icon className="size-4" />{label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-5">
        {TABS.map(({ v, C }) => (
          <TabsContent key={v} value={v}><C /></TabsContent>
        ))}
      </main>
    </Tabs>
  );
}
