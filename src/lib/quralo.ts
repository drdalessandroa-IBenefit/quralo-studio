// Pure business rules for Quralo. Kept dependency-free so they are easy to test.

export const PRIVACY_TEXT_VERSION = "v1.0-2026-11";

export const SERVICES = [
  { id: "prima_visita", label: "Prima visita", minutes: 60 },
  { id: "controllo", label: "Trattamento di controllo", minutes: 30 },
  { id: "avanzato", label: "Trattamento avanzato", minutes: 45 },
] as const;
export type ServiceId = (typeof SERVICES)[number]["id"];

export const serviceLabel = (id: string | null) =>
  SERVICES.find((s) => s.id === id)?.label ?? id ?? "—";

export const CF_REGEX =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

export const isValidCF = (cf: string | null | undefined) =>
  !!cf && CF_REGEX.test(cf.trim().toUpperCase());

/** Digits only, strip 00, add 39 when missing and ≤11 digits; valid only if ≥11 digits. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!d.startsWith("39") && d.length <= 11) d = "39" + d;
  return d.length >= 11 ? d : null;
}

/** "12,50" or "12.50" -> 1250. Returns null when not a valid non-negative amount. */
export function eurosToCents(input: string): number | null {
  const t = input.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "" || !/^\d+(\.\d{0,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

export const STAMP_DUTY_THRESHOLD_CENTS = 7747;

const eurFmt = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export const formatEuro = (cents: number) => eurFmt.format(cents / 100);
export const formatCentsPlain = (cents: number) =>
  (cents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

/** ISO date "2026-11-07" -> "07/11/2026" */
export const formatDateIt = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const formatDateTimeIt = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });

export const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateReferralCode(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = rand(5);
  let out = "QRL";
  // 256 is a multiple of 32: modulo has no bias.
  for (const b of bytes) out += REFERRAL_ALPHABET[b % REFERRAL_ALPHABET.length];
  return out;
}

export const fillTemplate = (tpl: string, vars: { nome: string; studio: string }) =>
  tpl.replaceAll("{nome}", vars.nome).replaceAll("{studio}", vars.studio);

export const whatsappUrl = (phone: string, text: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

export const DORMANT_TEMPLATE =
  "Ciao {nome}, sono {studio}. E' un po' che non ci vediamo: se ti fa piacere fissare un controllo, rispondi pure a questo messaggio. Se non vuoi piu' ricevere messaggi scrivi STOP.";

export const parseTags = (raw: string) =>
  Array.from(new Set(raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)));

const DAY = 86_400_000;

export interface ApptLite { patient_id: string; start_time: string; status: string }
export interface EventLite { patient_id: string; type: string; sent_at: string }

export function contactedWithin(events: EventLite[], patientId: string, type: string, days: number, now = Date.now()) {
  return events.some((e) => e.patient_id === patientId && e.type === type && now - new Date(e.sent_at).getTime() < days * DAY);
}

/** Has ≥1 non-cancelled appointment and none in the last 90 days (nor in the future). */
export function isDormant(appts: ApptLite[], patientId: string, now = Date.now()) {
  const mine = appts.filter((a) => a.patient_id === patientId && a.status !== "cancelled");
  if (mine.length === 0) return false;
  return mine.every((a) => new Date(a.start_time).getTime() < now - 90 * DAY);
}

export function hadRecentCompleted(appts: ApptLite[], patientId: string, now = Date.now()) {
  return appts.some(
    (a) => a.patient_id === patientId && a.status === "completed" &&
      new Date(a.start_time).getTime() <= now && now - new Date(a.start_time).getTime() <= 14 * DAY,
  );
}

export interface CsvRow {
  therapistCf: string; patientCf: string; issuedAt: string; number: string;
  totalCents: number; cashCents: number; posCents: number; stamp: boolean;
}

export function buildInvoicesCsv(rows: CsvRow[]): string {
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  const head = ["CF professionista", "CF paziente", "Data", "Numero documento", "Importo", "Contanti", "POS", "Bollo dovuto"];
  const lines = rows.map((r) => [
    r.therapistCf, r.patientCf, formatDateIt(r.issuedAt), r.number,
    formatCentsPlain(r.totalCents), formatCentsPlain(r.cashCents), formatCentsPlain(r.posCents), r.stamp ? "SI" : "NO",
  ].map(esc).join(";"));
  return "\uFEFF" + [head.join(";"), ...lines].join("\r\n");
}

interface PgLikeError { message?: string; code?: string }

export function errorMessage(err: unknown, fallback = "Operazione non riuscita. Riprova."): string {
  if (!err) return fallback;
  const e = err as PgLikeError;
  if (e.code === "23P01") return "Questo orario si sovrappone a un altro appuntamento.";
  if (e.code === "23505") return "Esiste gia' un elemento con questi dati.";
  if (e.code === "23514") return "Alcuni dati non rispettano il formato richiesto.";
  if (e.code === "42501") return "Non hai i permessi per questa operazione.";
  const msg = e.message ?? "";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Connessione assente. Controlla la rete e riprova.";
  if (/Invalid login credentials/i.test(msg)) return "Email o password non corretti.";
  if (/Email not confirmed/i.test(msg)) return "Conferma prima la tua email tramite il link ricevuto.";
  if (/User already registered/i.test(msg)) return "Esiste gia' un account con questa email.";
  return msg || fallback;
}
