import { Button } from '@/Components/ui/button';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }: PageProps) {
    return (
        <>
            <Head title="CareConnect" />
            <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
                <h1 className="text-5xl text-primary">CareConnect</h1>
                <p className="max-w-md text-muted-foreground">
                    Il gestionale per lo studio del terapista.
                </p>
                <Button asChild>
                    {auth.user ? (
                        <Link href={route('dashboard')}>Dashboard</Link>
                    ) : (
                        <Link href={route('login')}>Accedi</Link>
                    )}
                </Button>
            </main>
        </>
    );
}
