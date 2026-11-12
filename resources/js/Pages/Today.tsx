import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

type Appt = {
    id: string;
    patient_id: string;
    patient_name: string;
    start_time: string;
    end_time: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
    service_type: string | null;
};
type Props = { date: string; appointments: Appt[]; growthReady: number };

const hhmm = (iso: string) =>
    new Date(iso).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
    });

export default function Today({ date, appointments, growthReady }: Props) {
    const { t } = useTranslation();
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight">
                    {t('today.title')} · {date}
                </h2>
            }
        >
            <Head title={t('today.title')} />
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
                <section className="space-y-3">
                    {appointments.length === 0 && (
                        <p className="text-muted-foreground">
                            {t('today.empty')}
                        </p>
                    )}
                    {appointments.map((a) => (
                        <div
                            key={a.id}
                            className="flex items-center justify-between rounded-lg border bg-card p-4"
                        >
                            <div>
                                <Link
                                    href={route('patients.show', a.patient_id)}
                                    className="font-medium hover:underline"
                                >
                                    {a.patient_name}
                                </Link>
                                <p className="text-sm text-muted-foreground">
                                    {hhmm(a.start_time)}–{hhmm(a.end_time)}
                                </p>
                            </div>
                            <Badge variant="secondary">
                                {t(`today.status.${a.status}`)}
                            </Badge>
                        </div>
                    ))}
                </section>
                <section className="flex items-center justify-between rounded-lg border bg-card p-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {t('today.growth')}
                        </p>
                        <p className="text-3xl font-semibold">{growthReady}</p>
                    </div>
                    <Button asChild>
                        <Link href={route('growth.index')}>
                            {t('today.growthCta')}
                        </Link>
                    </Button>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
