import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type PatientRow = {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    fiscal_code: string | null;
    tags: string[];
    consent_privacy: boolean;
    privacy_signed: boolean;
    consent_marketing: boolean;
};

const EMPTY = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    fiscal_code: '',
    tags: '',
    referred_by_code: '',
};

export default function Index({
    patients,
    search: initialSearch,
}: {
    patients: PatientRow[];
    search: string;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(initialSearch);
    const [creating, setCreating] = useState(false);
    const form = useForm(EMPTY);

    const runSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/patients',
            search ? { search } : {},
            { preserveState: true, replace: true },
        );
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/patients', {
            onSuccess: () => {
                form.reset();
                setCreating(false);
            },
        });
    };

    const field = (
        k: keyof typeof EMPTY,
        label: string,
        props: React.InputHTMLAttributes<HTMLInputElement> = {},
    ) => (
        <div className="space-y-1.5">
            <Label htmlFor={`np-${k}`}>{label}</Label>
            <Input
                id={`np-${k}`}
                className="h-11"
                value={form.data[k]}
                onChange={(e) => form.setData(k, e.target.value)}
                {...props}
            />
            {form.errors[k] && (
                <p className="text-sm text-destructive">{form.errors[k]}</p>
            )}
        </div>
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight">
                    {t('patients.title')}
                </h2>
            }
        >
            <Head title={t('patients.title')} />
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        {t('patients.description')}
                    </p>
                    <Button className="h-11" onClick={() => setCreating(true)}>
                        <Plus />
                        {t('patients.new')}
                    </Button>
                </div>

                <form onSubmit={runSearch} className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        aria-label={t('patients.searchLabel')}
                        placeholder={t('patients.searchPlaceholder')}
                        className="h-11 pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>

                {patients.length === 0 ? (
                    <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                        {initialSearch
                            ? t('patients.noMatch')
                            : t('patients.empty')}
                    </p>
                ) : (
                    <div className="divide-y rounded-lg border">
                        <div className="hidden grid-cols-[1.4fr_1.4fr_1fr_auto_auto] gap-3 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
                            <span>{t('patients.colName')}</span>
                            <span>{t('patients.colContacts')}</span>
                            <span>{t('patients.colFiscalCode')}</span>
                            <span>{t('patients.colPrivacy')}</span>
                            <span>{t('patients.colMarketing')}</span>
                        </div>
                        {patients.map((p) => (
                            <div
                                key={p.id}
                                className="grid gap-1.5 px-3 py-3 md:grid-cols-[1.4fr_1.4fr_1fr_auto_auto] md:items-center md:gap-3"
                            >
                                <div>
                                    <Link
                                        href={`/patients/${p.id}`}
                                        className="font-medium hover:underline"
                                    >
                                        {p.first_name} {p.last_name}
                                    </Link>
                                    {p.tags.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {p.tags.map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="secondary"
                                                    className="text-[11px]"
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <p>{p.phone || '—'}</p>
                                    <p className="truncate">{p.email || ''}</p>
                                </div>
                                <p className="font-mono text-xs">
                                    {p.fiscal_code || '—'}
                                </p>
                                <div>
                                    <Badge
                                        variant={
                                            p.privacy_signed
                                                ? 'default'
                                                : 'outline'
                                        }
                                    >
                                        {p.privacy_signed
                                            ? t('patients.signed')
                                            : t('patients.toSign')}
                                    </Badge>
                                </div>
                                <div>
                                    <Badge
                                        variant={
                                            p.consent_marketing
                                                ? 'default'
                                                : 'outline'
                                        }
                                    >
                                        {p.consent_marketing
                                            ? t('patients.marketingYes')
                                            : t('patients.marketingNo')}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Dialog
                    open={creating}
                    onOpenChange={(o) => !o && !form.processing && setCreating(false)}
                >
                    <DialogContent className="max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('patients.new')}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                {field('first_name', t('patients.firstName'), {
                                    required: true,
                                    autoComplete: 'given-name',
                                })}
                                {field('last_name', t('patients.lastName'), {
                                    required: true,
                                    autoComplete: 'family-name',
                                })}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {field('email', t('patients.email'), {
                                    type: 'email',
                                    inputMode: 'email',
                                })}
                                {field('phone', t('patients.phone'), {
                                    type: 'tel',
                                    inputMode: 'tel',
                                })}
                            </div>
                            {field('fiscal_code', t('patients.fiscalCode'), {
                                maxLength: 16,
                                className: 'h-11 font-mono uppercase',
                            })}
                            {field('tags', t('patients.tags'), {
                                placeholder: 'schiena, sportivo',
                            })}
                            {field('referred_by_code', t('patients.referral'), {
                                placeholder: 'QRLXXXXX',
                                className: 'h-11 uppercase',
                            })}
                            <DialogFooter className="gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11"
                                    onClick={() => setCreating(false)}
                                    disabled={form.processing}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    className="h-11"
                                    disabled={form.processing}
                                >
                                    {t('patients.save')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AuthenticatedLayout>
    );
}
