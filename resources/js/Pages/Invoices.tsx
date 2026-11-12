import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Invoice = {
    id: string;
    invoice_number: string;
    issued_at: string;
    patient_name: string;
    total_cents: number;
    cash_cents: number;
    pos_cents: number;
    stamp_duty_due: boolean;
};
type Patient = { id: string; first_name: string; last_name: string; has_valid_cf: boolean };

const STAMP_THRESHOLD_CENTS = 7747;
const selectClass = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

// euro string -> integer cents (rounded); NaN-safe
const toCents = (v: string): number => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const euro = (cents: number, lang: string) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(cents / 100);

export default function Invoices({
    invoices,
    patients,
    professionalCf,
}: {
    invoices: Invoice[];
    patients: Patient[];
    professionalCf: boolean;
}) {
    const { t, i18n } = useTranslation();
    const form = useForm({ patient_id: '', total: '', cash: '', allow_without_cf: false });
    const errors = form.errors as Record<string, string | undefined>;
    const now = new Date();
    const [month, setMonth] = useState(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    );

    const total = toCents(form.data.total);
    const cash = toCents(form.data.cash);
    const pos = total - cash; // read-only, derived
    const patient = patients.find((p) => p.id === form.data.patient_id);
    const cfBlocked = !!patient && !patient.has_valid_cf && !form.data.allow_without_cf;
    const invalid = !patient || total <= 0 || cash < 0 || pos < 0 || cfBlocked;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            patient_id: d.patient_id,
            total_cents: toCents(d.total),
            cash_cents: toCents(d.cash),
            allow_without_cf: d.allow_without_cf,
        }));
        form.post('/invoices', {
            preserveScroll: true,
            onSuccess: () => form.setData({ ...form.data, total: '', cash: '' }),
        });
    };

    const [y, m] = month.split('-');

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight">{t('invoices.title')}</h2>}
        >
            <Head title={t('invoices.title')} />
            <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:grid-cols-2">
                <div className="space-y-4">
                    <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
                        <h3 className="font-semibold">{t('invoices.new')}</h3>
                        <p className="text-sm text-muted-foreground">{t('invoices.issueOnly')}</p>
                        <Label htmlFor="patient">{t('invoices.patient')}</Label>
                        <select
                            id="patient"
                            className={selectClass}
                            value={form.data.patient_id}
                            onChange={(e) => form.setData('patient_id', e.target.value)}
                        >
                            <option value="" />
                            {patients.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.last_name} {p.first_name}
                                </option>
                            ))}
                        </select>
                        {errors.patient_id && (
                            <p role="alert" className="text-sm text-destructive">{errors.patient_id}</p>
                        )}
                        <Label htmlFor="total">{t('invoices.total')}</Label>
                        <Input
                            id="total"
                            inputMode="decimal"
                            className="h-11"
                            value={form.data.total}
                            onChange={(e) => form.setData('total', e.target.value)}
                        />
                        <Label htmlFor="cash">{t('invoices.cash')}</Label>
                        <Input
                            id="cash"
                            inputMode="decimal"
                            className="h-11"
                            value={form.data.cash}
                            onChange={(e) => form.setData('cash', e.target.value)}
                        />
                        <Label htmlFor="pos">{t('invoices.pos')}</Label>
                        <Input
                            id="pos"
                            readOnly
                            className="h-11 bg-muted"
                            value={total > 0 ? (pos / 100).toFixed(2) : ''}
                        />
                        {errors.cash_cents && (
                            <p role="alert" className="text-sm text-destructive">{t('invoices.incoherent')}</p>
                        )}
                        {total > STAMP_THRESHOLD_CENTS && (
                            <p role="status" className="rounded-md border border-amber-400 bg-amber-50 p-2 text-sm text-amber-900">
                                {t('invoices.stamp')}
                            </p>
                        )}
                        {patient && !patient.has_valid_cf && (
                            <div className="space-y-2">
                                <p role="alert" className="text-sm text-destructive">{t('invoices.cfBlocked')}</p>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={form.data.allow_without_cf}
                                        onChange={(e) => form.setData('allow_without_cf', e.target.checked)}
                                    />
                                    {t('invoices.noCf')}
                                </label>
                            </div>
                        )}
                        <Button className="h-11 w-full" disabled={form.processing || invalid}>
                            {t('invoices.issue')}
                        </Button>
                    </form>

                    <section className="space-y-3 rounded-lg border p-4">
                        <h3 className="font-semibold">{t('invoices.export')}</h3>
                        <p className="text-sm text-muted-foreground">{t('invoices.exportNote')}</p>
                        <Label htmlFor="month">{t('invoices.month')}</Label>
                        <Input
                            id="month"
                            type="month"
                            className="h-11"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        />
                        {!professionalCf && (
                            <p role="alert" className="text-sm text-destructive">{t('invoices.needProfCf')}</p>
                        )}
                        {errors.export && (
                            <p role="alert" className="text-sm text-destructive">{errors.export}</p>
                        )}
                        <Button asChild={professionalCf} className="h-11 w-full" disabled={!professionalCf || !month}>
                            {professionalCf ? (
                                <a href={`/invoices/export.csv?year=${y}&month=${Number(m)}`}>
                                    {t('invoices.download')}
                                </a>
                            ) : (
                                <span>{t('invoices.download')}</span>
                            )}
                        </Button>
                    </section>
                </div>

                <section className="rounded-lg border p-4">
                    <h3 className="mb-3 font-semibold">{t('invoices.history')}</h3>
                    {invoices.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('invoices.empty')}</p>
                    ) : (
                        <ul className="space-y-3">
                            {invoices.map((i) => (
                                <li key={i.id} className="rounded-lg border p-3 text-sm">
                                    <p className="font-medium">
                                        {i.invoice_number} · {euro(i.total_cents, i18n.language)}
                                        {i.stamp_duty_due && (
                                            <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900">
                                                {t('invoices.stampYes')}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(i.issued_at).toLocaleDateString(i18n.language)} · {i.patient_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('invoices.cash')}: {euro(i.cash_cents, i18n.language)} · POS:{' '}
                                        {euro(i.pos_cents, i18n.language)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
