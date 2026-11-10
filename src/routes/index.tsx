import { createFileRoute, Link } from "@tanstack/react-router";
import practice from "@/assets/quralo-practice.webp";
import { Button } from "@/components/ui/button";

const URL = "https://quralo-care-studio.lovable.app";
const TITLE = "Quralo — Gestionale per osteopati e fisioterapisti";
const DESC = "Gestionale per osteopati, chinesiologi e fisioterapisti: agenda, cartella clinica, consenso GDPR firmato e riattivazione pazienti.";
const FAQ = [
  { q: "Cos'è Quralo?", a: "Quralo è un gestionale web per studi di terapia manuale che unisce agenda, cartella clinica e strumenti per ricontattare i pazienti.", d: "Si usa dal browser, anche su tablet e smartphone in studio." },
  { q: "Per chi è Quralo?", a: "Quralo è pensato per osteopati, chinesiologi e fisioterapisti che lavorano in studio, da soli o in piccoli team.", d: "L'interfaccia è in italiano, con una versione inglese." },
  { q: "Come funzionano firma e consenso?", a: "Il paziente firma il consenso al trattamento dei dati direttamente sul tablet, e Quralo salva firma, data e versione del testo.", d: "Il consenso al marketing è separato e facoltativo. I testi di informativa sono modelli da validare con un DPO o un avvocato." },
  { q: "Come vengono gestiti i dati dei pazienti?", a: "Ogni professionista vede solo i propri pazienti, grazie a regole di accesso applicate dal database.", d: "Le pagine dell'area riservata non sono indicizzabili dai motori di ricerca." },
  { q: "Come funzionano riattivazione e recensioni?", a: "Quralo segnala i pazienti senza visite da 90 giorni e quelli visitati di recente, e prepara un messaggio WhatsApp che il terapista invia a mano.", d: "Solo i pazienti con consenso al marketing possono ricevere messaggi di riattivazione; nessun invio è automatico." },
  { q: "Cosa non fa Quralo?", a: "Quralo non fa diagnosi, non dà indicazioni cliniche e non invia messaggi automatici ai pazienti.", d: "Non sostituisce il commercialista né la consulenza legale sulla privacy." },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "website" }, { property: "og:url", content: `${URL}/` },
      { property: "og:locale", content: "it_IT" },
      { property: "og:image", content: `${URL}/og-quralo.jpg` },
      { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC }, { name: "twitter:image", content: `${URL}/og-quralo.jpg` },
    ],
    links: [{ rel: "canonical", href: `${URL}/` }, { rel: "preload", as: "image", href: practice, type: "image/webp" }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "Quralo", url: URL }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Quralo", applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "it", url: URL, description: DESC }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: `${f.a} ${f.d}` } })) }) },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { h: "Agenda e cartella clinica", p: "Prenotazioni senza sovrapposizioni, anamnesi, piano di trattamento e note di seduta per ogni paziente." },
  { h: "Consenso GDPR firmato", p: "Firma del paziente su tablet con data e versione dell'informativa salvate." },
  { h: "Riattivazione e recensioni", p: "Elenco dei pazienti da ricontattare e messaggi WhatsApp pronti, inviati sempre da te." },
];

function Home() {
  return (
    <>
      <header className="border-b bg-card"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <span className="text-xl font-bold">Quralo</span>
        <nav className="flex gap-2"><Button asChild variant="ghost"><Link to="/prevendita">Prevendita</Link></Button><Button asChild><Link to="/auth">Accedi</Link></Button></nav>
      </div></header>
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-4xl font-bold sm:text-5xl">Il gestionale per osteopati, chinesiologi e fisioterapisti</h1>
            <p className="mt-5 text-lg text-muted-foreground">Quralo riunisce agenda, cartella clinica, consenso GDPR e ricontatto dei pazienti in un'unica app per lo studio.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/prevendita">Partecipa alla prevendita</Link></Button><Button asChild size="lg" variant="outline"><Link to="/auth">Accedi</Link></Button></div>
          </div>
          <img src={practice} width={1536} height={1024} fetchPriority="high" alt="Terapista manuale al lavoro in uno studio luminoso con lettino da trattamento" className="h-auto w-full rounded-lg border" />
        </section>
        <section className="border-y bg-card"><div className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="text-2xl font-semibold">Cosa fa Quralo</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">{FEATURES.map((f) => <div key={f.h}><h3 className="font-semibold">{f.h}</h3><p className="mt-2 text-sm text-muted-foreground">{f.p}</p></div>)}</div>
        </div></section>
        <section className="mx-auto max-w-3xl px-5 py-12">
          <h2 className="text-2xl font-semibold">Domande frequenti</h2>
          <div className="mt-6 divide-y rounded-lg border bg-card">{FAQ.map((f) => <div key={f.q} className="p-5"><h3 className="font-semibold">{f.q}</h3><p className="mt-2">{f.a}</p><p className="mt-1 text-sm text-muted-foreground">{f.d}</p></div>)}</div>
        </section>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">Quralo · gestionale per terapisti manuali</footer>
    </>
  );
}
