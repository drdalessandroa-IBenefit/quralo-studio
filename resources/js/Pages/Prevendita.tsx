import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export default function Prevendita({ professions }: { professions: string[] }) {
    const { t } = useTranslation();
    const success = (usePage().props as { flash?: { success?: boolean } })
        .flash?.success;
    const form = useForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        profession: professions[0] ?? 'osteopath',
        consent_privacy: false,
        website: '', // honeypot: hidden from humans
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/prevendita', {
            onSuccess: () => form.reset(),
        });
    };
    const field = (
        k: 'first_name' | 'last_name' | 'email' | 'phone',
        label: string,
        type = 'text',
    ) => (
        <div className="space-y-1">
            <Label htmlFor={k}>{label}</Label>
            <Input
                id={k}
                type={type}
                value={form.data[k]}
                onChange={(e) => form.setData(k, e.target.value)}
            />
            {form.errors[k] && (
                <p className="text-sm text-destructive">{form.errors[k]}</p>
            )}
        </div>
    );
    return (
        <>
            <Head title={t('presale.seoTitle')}>
                <meta name="description" content={t('presale.seoDesc')} />
                <link rel="canonical" href="https://careconnect.app/prevendita" />
            </Head>
            <main className="mx-auto max-w-md space-y-4 px-4 py-12">
                <h1 className="text-3xl text-primary">{t('presale.title')}</h1>
                {success ? (
                    <p role="status">{t('presale.thanks')}</p>
                ) : (
                    <form onSubmit={submit} className="space-y-4">
                        {field('first_name', t('presale.firstName'))}
                        {field('last_name', t('presale.lastName'))}
                        {field('email', t('presale.email'), 'email')}
                        {field('phone', t('presale.phone'), 'tel')}
                        <div className="space-y-1">
                            <Label htmlFor="profession">
                                {t('presale.profession')}
                            </Label>
                            <select
                                id="profession"
                                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={form.data.profession}
                                onChange={(e) =>
                                    form.setData('profession', e.target.value)
                                }
                            >
                                {professions.map((p) => (
                                    <option key={p} value={p}>
                                        {t(`presale.professions.${p}`)}
                                    </option>
                                ))}
                            </select>
                            {form.errors.profession && (
                                <p className="text-sm text-destructive">
                                    {form.errors.profession}
                                </p>
                            )}
                        </div>
                        {/* Honeypot */}
                        <div
                            aria-hidden="true"
                            className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                        >
                            <label htmlFor="website">Website</label>
                            <input
                                id="website"
                                name="website"
                                tabIndex={-1}
                                autoComplete="off"
                                value={form.data.website}
                                onChange={(e) =>
                                    form.setData('website', e.target.value)
                                }
                            />
                        </div>
                        <div className="flex items-start gap-2">
                            <Checkbox
                                id="consent"
                                checked={form.data.consent_privacy}
                                onCheckedChange={(v) =>
                                    form.setData('consent_privacy', v === true)
                                }
                            />
                            <Label htmlFor="consent">
                                {t('presale.consent')}
                            </Label>
                        </div>
                        {form.errors.consent_privacy && (
                            <p className="text-sm text-destructive">
                                {form.errors.consent_privacy}
                            </p>
                        )}
                        <Button type="submit" disabled={form.processing}>
                            {t('presale.submit')}
                        </Button>
                    </form>
                )}
                <Link href="/" className="text-sm text-muted-foreground underline">
                    CareConnect
                </Link>
            </main>
        </>
    );
}
