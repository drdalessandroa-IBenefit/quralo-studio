import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type StudioForm = {
    full_name: string;
    studio_name: string;
    fiscal_code: string;
    vat_number: string;
    google_review_url: string;
};

export default function Studio({ profile }: { profile: StudioForm }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors, recentlySuccessful } =
        useForm<StudioForm>(profile);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/studio', { preserveScroll: true });
    };

    const field = (k: keyof StudioForm, label: string) => (
        <div className="space-y-1.5">
            <Label htmlFor={k}>{label}</Label>
            <Input
                id={k}
                className="h-11"
                value={data[k]}
                onChange={(e) => setData(k, e.target.value)}
            />
            {errors[k] && (
                <p className="text-sm text-destructive">{errors[k]}</p>
            )}
        </div>
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight">
                    {t('studio.title')}
                </h2>
            }
        >
            <Head title={t('studio.title')} />
            <div className="mx-auto max-w-xl px-4 py-8">
                <p className="mb-4 text-sm text-muted-foreground">
                    {t('studio.description')}
                </p>
                <form onSubmit={submit} className="grid gap-3">
                    {field('full_name', t('studio.fullName'))}
                    {field('studio_name', t('studio.studioName'))}
                    {field('fiscal_code', t('studio.fiscalCode'))}
                    {field('vat_number', t('studio.vatNumber'))}
                    {field('google_review_url', t('studio.googleUrl'))}
                    <Button type="submit" className="h-11" disabled={processing}>
                        {t('studio.save')}
                    </Button>
                    {recentlySuccessful && (
                        <p className="text-sm text-muted-foreground">
                            {t('studio.saved')}
                        </p>
                    )}
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
