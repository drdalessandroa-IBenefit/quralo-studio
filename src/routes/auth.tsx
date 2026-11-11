import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, MailCheck, HeartPulse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage } from "@/lib/quralo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
  },
  head: () => ({
    links: [{ rel: "canonical", href: "https://quralo-care-studio.lovable.app/auth" }],
    meta: [
      { property: "og:url", content: "https://quralo-care-studio.lovable.app/auth" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Accedi — CareConnect" },
      { name: "description", content: "Accedi a CareConnect, il motore di acquisizione e fidelizzazione per terapisti manuali." },
      { property: "og:title", content: "Accedi — CareConnect" },
      { property: "og:description", content: "Il motore di acquisizione e fidelizzazione per terapisti manuali." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function login(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(errorMessage(error)); return; }
    navigate({ to: "/app" });
  }
  async function signup(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setLoading(false);
    if (error) { setError(errorMessage(error)); return; }
    if (data.session) navigate({ to: "/app" }); else setSent(true);
  }

  const fields = (
    <>
      <div className="space-y-1.5"><Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" required minLength={8} className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    </>
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-md shadow-primary/20"><HeartPulse className="size-6" /></div>
          <h1 className="text-2xl font-bold tracking-tight">CareConnect</h1>
          <p className="mt-1 text-sm text-muted-foreground">Riempi l'agenda, fidelizza i pazienti.</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          {sent ? (
            <div className="space-y-2 text-center">
              <MailCheck className="mx-auto size-10 text-primary" />
              <p className="font-semibold">Controlla la tua email</p>
              <p className="text-sm text-muted-foreground">Ti abbiamo inviato un link a {email} per confermare l'account.</p>
              <Button variant="outline" className="mt-2 w-full" onClick={() => setSent(false)}>Torna all'accesso</Button>
            </div>
          ) : (
            <Tabs defaultValue="login" onValueChange={() => setError(null)}>
              <TabsList className="mb-4 grid w-full grid-cols-2"><TabsTrigger value="login">Accedi</TabsTrigger><TabsTrigger value="signup">Registrati</TabsTrigger></TabsList>
              <TabsContent value="login"><form onSubmit={login} className="space-y-4">{fields}
                <Button type="submit" className="h-11 w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Accedi</Button></form></TabsContent>
              <TabsContent value="signup"><form onSubmit={signup} className="space-y-4">{fields}
                <p className="text-xs text-muted-foreground">Password di almeno 8 caratteri.</p>
                <Button type="submit" className="h-11 w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Crea account</Button></form></TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
