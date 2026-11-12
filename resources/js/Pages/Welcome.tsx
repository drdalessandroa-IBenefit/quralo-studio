import { Button } from '@/Components/ui/button';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function Welcome({ auth }: PageProps) {
    const { t } = useTranslation();
    return (
        <>
            <Head title={t('presale.seoTitle')}>
                <meta name="description" content={t('presale.seoDesc')} />
                <link rel="canonical" href="https://careconnect.app/" />
            </Head>
            <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
                <p className="text-sm uppercase tracking-wide text-muted-foreground">
                    {t('presale.tagline')}
                </p>
                <h1 className="max-w-2xl text-5xl text-primary">
                    {t('presale.h1')}
                </h1>
                <p className="max-w-md text-muted-foreground">
                    {t('presale.sub')}
                </p>
                <div className="flex gap-3">
                    <Button asChild>
                        <Link href="/prevendita">{t('presale.cta')}</Link>
                    </Button>
                    <Button asChild variant="outline">
                        {auth?.user ? (
                            <Link href={route('dashboard')}>
                                {t('nav.oggi')}
                            </Link>
                        ) : (
                            <Link href={route('login')}>
                                {t('presale.login')}
                            </Link>
                        )}
                    </Button>
                </div>
            </main>
        </>
    );
}
