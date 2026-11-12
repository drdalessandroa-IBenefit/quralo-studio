import { Badge } from '@/Components/ui/badge';
import { SignatureDialog } from '@/Components/SignatureDialog';
import { Button } from '@/Components/ui/button';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PatientRow } from './Index';

export default function Show({ patient }: { patient: PatientRow }) {
    const { t } = useTranslation();
    const [signing, setSigning] = useState(false);
    const name = `${patient.first_name} ${patient.last_name}`;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight">
                    {t('patients.detailTitle')}
                </h2>
            }
        >
            <Head title={name} />
            <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
                <Button asChild variant="outline">
                    <Link href="/patients">{t('patients.backToList')}</Link>
                </Button>
                <h1 className="text-xl font-semibold">{name}</h1>
                {patient.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {patient.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
                <dl className="grid gap-2 text-sm">
                    <div>
                        <dt className="text-muted-foreground">{t('patients.phone')}</dt>
                        <dd>{patient.phone || '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">{t('patients.email')}</dt>
                        <dd className="break-all">{patient.email || '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">{t('patients.fiscalCode')}</dt>
                        <dd className="font-mono">{patient.fiscal_code || '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">{t('patients.colPrivacy')}</dt>
                        <dd className="flex flex-wrap items-center gap-2">
                            {patient.privacy_signed ? t('patients.signed') : t('patients.toSign')}
                            {patient.privacy_signed ? (
                                <a
                                    href={`/patients/${patient.id}/signature`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary underline"
                                >
                                    {t('patients.viewSignature')}
                                </a>
                            ) : (
                                <Button size="sm" onClick={() => setSigning(true)}>
                                    {t('patients.sign')}
                                </Button>
                            )}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">{t('patients.colMarketing')}</dt>
                        <dd>{patient.consent_marketing ? t('patients.marketingYes') : t('patients.marketingNo')}</dd>
                    </div>
                </dl>
            </div>
            {!patient.privacy_signed && (
                <SignatureDialog
                    patientId={patient.id}
                    patientName={name}
                    open={signing}
                    onClose={() => setSigning(false)}
                />
            )}
        </AuthenticatedLayout>
    );
}
