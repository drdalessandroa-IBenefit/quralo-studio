import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Appointment = {
    id: string;
    patient_id: string;
    patient_name: string;
    start_time: string;
    end_time: string;
    minutes: number;
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
    service_type: string | null;
};
type Patient = { id: string; first_name: string; last_name: string };
type Service = { id: string; label: string; minutes: number };

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const selectClass =
    'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

export default function Agenda({
    appointments,
    patients,
    services,
    history,
}: {
    appointments: Appointment[];
    patients: Patient[];
    services: Service[];
    history: boolean;
}) {
    const { t, i18n } = useTranslation();
    const form = useForm({
        patient_id: '',
        service_type: services[0]?.id ?? 'custom',
        minutes: 30,
        date: today(),
        time: '',
    });
    const custom = form.data.service_type === 'custom';

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const start = new Date(`${form.data.date}T${form.data.time}`);
        if (!form.data.patient_id || !form.data.time || isNaN(start.getTime())) {
            form.setError('start_time' as never, t('agenda.invalid'));
            return;
        }
        form.transform((d) => ({
            patient_id: d.patient_id,
            service_type: d.service_type,
            minutes: custom ? d.minutes : undefined,
            start_time: start.toISOString(),
        }));
        form.post('/agenda', {
            preserveScroll: true,
            onSuccess: () => form.setData('time', ''),
        });
    };

    const errors = form.errors as Record<string, string | undefined>;
    const fmt = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'short',
        timeStyle: 'short',
    });
    const setStatus = (id: string, status: string) =>
        router.patch(`/agenda/${id}/status`, { status }, { preserveScroll: true });
    const toggleHistory = (v: boolean) =>
        router.get('/agenda', v ? { history: 1 } : {}, { preserveState: true, replace: true });

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight">{t('nav.agenda')}</h2>}
        >
            <Head title={t('nav.agenda')} />
            <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:grid-cols-[360px_1fr]">
                <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
                    <h3 className="font-semibold">{t('agenda.book')}</h3>
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
                    {errors.patient_id && <p className="text-sm text-destructive">{errors.patient_id}</p>}
                    <Label htmlFor="service">{t('agenda.service')}</Label>
                    <select
                        id="service"
                        className={selectClass}
                        value={form.data.service_type}
                        onChange={(e) => form.setData('service_type', e.target.value)}
                    >
                        {[...services.map((s) => s.id), 'custom'].map((id) => (
                            <option key={id} value={id}>
                                {t(`services.${id}`)}
                            </option>
                        ))}
                    </select>
                    {custom && (
                        <div className="space-y-1.5">
                            <Label htmlFor="duration">{t('agenda.duration')}</Label>
                            <Input
                                id="duration"
                                type="number"
                                min={10}
                                max={240}
                                step={5}
                                required
                                value={form.data.minutes}
                                onChange={(e) => form.setData('minutes', Number(e.target.value))}
                            />
                            {errors.minutes && <p className="text-sm text-destructive">{t('agenda.durationError')}</p>}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="d">{t('agenda.date')}</Label>
                            <Input
                                id="d"
                                type="date"
                                required
                                className="h-11"
                                value={form.data.date}
                                onChange={(e) => e.target.value && form.setData('date', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="t">{t('agenda.time')}</Label>
                            <Input
                                id="t"
                                type="time"
                                required
                                step={300}
                                className="h-11"
                                value={form.data.time}
                                onChange={(e) => form.setData('time', e.target.value)}
                            />
                        </div>
                    </div>
                    {errors.start_time && (
                        <p role="alert" className="text-sm text-destructive">
                            {errors.start_time.includes('sovrappone') ? t('agenda.clash') : errors.start_time}
                        </p>
                    )}
                    <Button className="h-11 w-full" disabled={form.processing}>
                        {t('agenda.book')}
                    </Button>
                </form>

                <section className="rounded-lg border p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold">{t('agenda.appointments')}</h3>
                        <Button asChild variant="outline" size="sm">
                            <a href={`/agenda/export.ics${history ? '?history=1' : ''}`}>
                                <Download />
                                {t('agenda.exportWeek')}
                            </a>
                        </Button>
                    </div>
                    <label className="mb-4 flex items-center gap-2 text-sm">
                        <Checkbox checked={history} onCheckedChange={(v) => toggleHistory(v === true)} />
                        {t('agenda.history')}
                    </label>
                    {errors.status && <p role="alert" className="mb-2 text-sm text-destructive">{errors.status}</p>}
                    {appointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('agenda.empty')}</p>
                    ) : (
                        <ul className="space-y-3">
                            {appointments.map((a) => (
                                <li key={a.id} className="rounded-lg border p-3">
                                    <div className="flex flex-wrap justify-between gap-2">
                                        <div>
                                            <p className="font-medium">{a.patient_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {fmt.format(new Date(a.start_time))} · {t(`services.${a.service_type ?? 'custom'}`)} ·{' '}
                                                {t('agenda.minutes', { count: a.minutes })}
                                            </p>
                                        </div>
                                        <Badge variant={a.status === 'scheduled' ? 'default' : 'outline'}>
                                            {t(`agenda.${a.status}`)}
                                        </Badge>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {a.status === 'scheduled' &&
                                            ['completed', 'no_show', 'cancelled'].map((s) => (
                                                <Button key={s} size="sm" variant="outline" onClick={() => setStatus(a.id, s)}>
                                                    {t(`agenda.${s}`)}
                                                </Button>
                                            ))}
                                        <Button asChild size="sm" variant="ghost">
                                            <a href={`/agenda/${a.id}/ics`}>
                                                <Download />
                                                {t('agenda.export')}
                                            </a>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
