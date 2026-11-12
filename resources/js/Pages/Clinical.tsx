import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Note = {
    id: string;
    patient_id: string;
    patient_name: string;
    anamnesis: string | null;
    treatment_plan: string | null;
    session_notes: string | null;
    created_at: string;
};
type Patient = { id: string; first_name: string; last_name: string };

const selectClass =
    'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const FIELDS = ['anamnesis', 'treatment_plan', 'session_notes'] as const;

export default function Clinical({
    notes,
    patients,
    filter,
}: {
    notes: Note[];
    patients: Patient[];
    filter: string;
}) {
    const { t, i18n } = useTranslation();
    const form = useForm({
        patient_id: '',
        anamnesis: '',
        treatment_plan: '',
        session_notes: '',
    });
    const errors = form.errors as Record<string, string | undefined>;
    const fmt = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'short',
        timeStyle: 'short',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/clinical-notes', {
            preserveScroll: true,
            onSuccess: () =>
                form.setData({ ...form.data, anamnesis: '', treatment_plan: '', session_notes: '' }),
        });
    };
    const setFilter = (id: string) =>
        router.get('/clinical-notes', id ? { patient_id: id } : {}, {
            preserveState: true,
            replace: true,
        });

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight">{t('nav.cartella')}</h2>}
        >
            <Head title={t('nav.cartella')} />
            <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:grid-cols-2">
                <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
                    <h3 className="font-semibold">{t('clinical.new')}</h3>
                    <p className="text-sm text-muted-foreground">{t('clinical.appendOnly')}</p>
                    <Label htmlFor="patient">{t('nav.pazienti')}</Label>
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
                        <p role="alert" className="text-sm text-destructive">{t('clinical.choosePatient')}</p>
                    )}
                    {FIELDS.map((k) => (
                        <div key={k} className="space-y-1.5">
                            <Label htmlFor={k}>{t(`clinical.${k}`)}</Label>
                            <Textarea
                                id={k}
                                rows={3}
                                value={form.data[k]}
                                onChange={(e) => form.setData(k, e.target.value)}
                            />
                        </div>
                    ))}
                    {errors.anamnesis && (
                        <p role="alert" className="text-sm text-destructive">{t('clinical.atLeastOne')}</p>
                    )}
                    <Button className="h-11 w-full" disabled={form.processing}>
                        {t('clinical.save')}
                    </Button>
                </form>

                <section className="rounded-lg border p-4">
                    <h3 className="mb-3 font-semibold">{t('clinical.history')}</h3>
                    <select
                        aria-label={t('nav.pazienti')}
                        className={`${selectClass} mb-3`}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="">{t('clinical.all')}</option>
                        {patients.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.last_name} {p.first_name}
                            </option>
                        ))}
                    </select>
                    {notes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('clinical.empty')}</p>
                    ) : (
                        <ul className="space-y-3">
                            {notes.map((n) => (
                                <li key={n.id} className="rounded-lg border p-3 text-sm">
                                    <p className="mb-1 text-xs text-muted-foreground">
                                        {fmt.format(new Date(n.created_at))} · {n.patient_name}
                                    </p>
                                    {FIELDS.map(
                                        (k) =>
                                            n[k] && (
                                                <p key={k} className="whitespace-pre-wrap">
                                                    <b>{t(`clinical.${k}`)}:</b> {n[k]}
                                                </p>
                                            ),
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
