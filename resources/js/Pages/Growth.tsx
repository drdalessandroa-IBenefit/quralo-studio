import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Copy, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Row = {
    id: string;
    first_name: string;
    name: string;
    phone: string;
    tags: string[];
    days?: number | null;
};
type Referral = {
    id: string;
    code: string;
    patient_id: string;
    patient: string;
    uses: number;
};
type Props = {
    studio: string;
    googleReviewUrl: string | null;
    dormant: Row[];
    dormantExcludedNoConsent: number;
    reviews: Row[];
    tags: string[];
    tag: string | null;
    campaign: Row[];
    referrals: Referral[];
    patients: { id: string; name: string }[];
};
type EventType = 'dormant' | 'review' | 'campaign';

const fill = (tpl: string, vars: Record<string, string>) =>
    Object.entries(vars).reduce(
        (s, [k, v]) => s.split(`{${k}}`).join(v),
        tpl,
    );

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-3 rounded-lg border bg-card p-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            {children}
        </section>
    );
}

/** One patient, one editable preview, one manual wa.me open that is logged. */
function MessageRow({
    row,
    template,
    vars,
    type,
}: {
    row: Row;
    template: string;
    vars: Record<string, string>;
    type: EventType;
}) {
    const { t } = useTranslation();
    const [edited, setEdited] = useState<string | null>(null);
    const message = edited ?? fill(template, { ...vars, nome: row.first_name });

    const [blockedUrl, setBlockedUrl] = useState<string | null>(null);

    const open = () => {
        const url = `https://wa.me/${row.phone}?text=${encodeURIComponent(message)}`;
        // Open synchronously from the click gesture. No 'noopener' feature
        // (it always returns null); harden via opener = null instead.
        const w = window.open(url, '_blank');
        if (w) w.opener = null;
        else setBlockedUrl(url);
        // Always log: the therapist's click is the intent to contact.
        router.post(
            '/growth/events',
            { patient_id: row.id, type },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <article className="rounded-lg border p-3">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-medium">{row.name}</h4>
                {row.days != null && (
                    <span className="text-sm text-muted-foreground">
                        {t('growth.lastVisit', { count: row.days })}
                    </span>
                )}
            </div>
            <Label htmlFor={`msg-${type}-${row.id}`}>
                {t('growth.message')}
            </Label>
            <Textarea
                id={`msg-${type}-${row.id}`}
                className="mt-1 min-h-24"
                maxLength={1000}
                value={message}
                onChange={(e) => setEdited(e.target.value)}
            />
            <Button className="mt-2" onClick={open}>
                <MessageCircle className="mr-2 h-4 w-4" />
                {t('growth.open')}
            </Button>
            {blockedUrl && (
                <p className="mt-2 text-sm">
                    {t('growth.popup')}{' '}
                    <a
                        href={blockedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                    >
                        wa.me
                    </a>
                </p>
            )}
        </article>
    );
}

export default function Growth(p: Props) {
    const { t } = useTranslation();
    const studio = p.studio || t('growth.practice');
    const vars = { studio };
    const [template, setTemplate] = useState(t('growth.campaignTemplate'));
    const [patientId, setPatientId] = useState('');

    const copy = (text: string) =>
        navigator.clipboard.writeText(text).catch(() => undefined);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight">
                    {t('growth.title')}
                </h2>
            }
        >
            <Head title={t('growth.title')} />
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
                <Section title={t('growth.title')}>
                    {p.dormantExcludedNoConsent > 0 && (
                        <p className="text-sm text-amber-700">
                            {t('growth.excluded', {
                                count: p.dormantExcludedNoConsent,
                            })}
                        </p>
                    )}
                    {!p.dormant.length ? (
                        <p className="text-sm text-muted-foreground">
                            {t('growth.empty')}
                        </p>
                    ) : (
                        p.dormant.map((r) => (
                            <MessageRow
                                key={r.id}
                                row={r}
                                type="dormant"
                                template={t('growth.template')}
                                vars={vars}
                            />
                        ))
                    )}
                </Section>

                <Section title={t('growth.reviews')}>
                    {!p.googleReviewUrl ? (
                        <p className="text-sm text-muted-foreground">
                            {t('growth.noReviewUrl')}{' '}
                            <Link href="/studio" className="underline">
                                {t('growth.studioLink')}
                            </Link>
                        </p>
                    ) : !p.reviews.length ? (
                        <p className="text-sm text-muted-foreground">
                            {t('growth.reviewsEmpty')}
                        </p>
                    ) : (
                        p.reviews.map((r) => (
                            <MessageRow
                                key={r.id}
                                row={r}
                                type="review"
                                template={t('growth.reviewTemplate')}
                                vars={{ ...vars, link: p.googleReviewUrl! }}
                            />
                        ))
                    )}
                </Section>

                <Section title={t('growth.referral')}>
                    <div className="flex flex-wrap gap-2">
                        <select
                            aria-label={t('common.patient')}
                            className="h-10 rounded-md border bg-background px-3 text-sm"
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                        >
                            <option value="">{t('common.patient')}</option>
                            {p.patients.map((x) => (
                                <option key={x.id} value={x.id}>
                                    {x.name}
                                </option>
                            ))}
                        </select>
                        <Button
                            disabled={!patientId}
                            onClick={() =>
                                router.post(
                                    '/growth/referral-codes',
                                    { patient_id: patientId },
                                    { preserveScroll: true },
                                )
                            }
                        >
                            {t('growth.generate')}
                        </Button>
                    </div>
                    {!p.referrals.length ? (
                        <p className="text-sm text-muted-foreground">
                            {t('growth.noCodes')}
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {p.referrals.map((r) => (
                                <li
                                    key={r.id}
                                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                                >
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            {r.patient} -{' '}
                                            {t('growth.uses', {
                                                count: r.uses,
                                            })}
                                        </p>
                                        <span className="font-mono font-semibold">
                                            {r.code}
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            copy(
                                                fill(
                                                    t('growth.referralMessage'),
                                                    { studio, codice: r.code },
                                                ),
                                            )
                                        }
                                    >
                                        <Copy className="mr-2 h-4 w-4" />
                                        {t('common.copy')}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title={t('growth.campaigns')}>
                    <Label htmlFor="tag">{t('growth.segment')}</Label>
                    <select
                        id="tag"
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={p.tag ?? ''}
                        onChange={(e) =>
                            router.get(
                                '/growth',
                                e.target.value ? { tag: e.target.value } : {},
                                { preserveScroll: true, preserveState: true },
                            )
                        }
                    >
                        <option value="">{t('growth.pickTag')}</option>
                        {p.tags.map((tg) => (
                            <option key={tg} value={tg}>
                                {tg}
                            </option>
                        ))}
                    </select>
                    <Label htmlFor="tpl">{t('growth.template_label')}</Label>
                    <Textarea
                        id="tpl"
                        className="min-h-24"
                        maxLength={1000}
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                    />
                    {p.tag &&
                        (!p.campaign.length ? (
                            <p className="text-sm text-muted-foreground">
                                {t('growth.campaignEmpty')}
                            </p>
                        ) : (
                            p.campaign.map((r) => (
                                <MessageRow
                                    key={r.id}
                                    row={r}
                                    type="campaign"
                                    template={template}
                                    vars={vars}
                                />
                            ))
                        ))}
                </Section>
            </div>
        </AuthenticatedLayout>
    );
}
