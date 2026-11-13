import { SignaturePad, type SignaturePadHandle } from '@/Components/SignaturePad';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const PRIVACY_TEXT_VERSION = 'v1.0-2026-11';

export function SignatureDialog({
    patientId,
    patientName,
    open,
    onClose,
}: {
    patientId: string;
    patientName: string;
    open: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const pad = useRef<SignaturePadHandle>(null);
    const [marketing, setMarketing] = useState(false);
    const [empty, setEmpty] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save() {
        if (!pad.current) return;
        if (pad.current.isEmpty()) {
            setError(t('patients.signRequired'));
            return;
        }
        const blob = await pad.current.toBlob();
        if (!blob) {
            setError(t('patients.signFailed'));
            return;
        }
        setError(null);
        router.post(
            `/patients/${patientId}/signature`,
            {
                image: new File([blob], 'signature.png', { type: 'image/png' }),
                // Optional and never preselected: sent only when the patient ticks it.
                consent_marketing: marketing,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onSuccess: () => {
                    setMarketing(false);
                    onClose();
                },
                onError: () => setError(t('patients.signFailed')),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
            <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {t('patients.signTitle')} — {patientName}
                    </DialogTitle>
                    <DialogDescription>{t('patients.signVersion', { version: PRIVACY_TEXT_VERSION })}</DialogDescription>
                </DialogHeader>
                <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted p-3 text-sm leading-relaxed">
                    <p className="font-semibold">{t('patients.privacyHeading')}</p>
                    <p className="mt-2">{t('patients.privacyP1')}</p>
                    <p className="mt-2">{t('patients.privacyP2')}</p>
                    <p className="mt-2">{t('patients.privacyP3')}</p>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox
                        id="consent-marketing"
                        checked={marketing}
                        onCheckedChange={(v) => setMarketing(v === true)}
                        className="mt-0.5 size-5"
                    />
                    <Label htmlFor="consent-marketing" className="text-sm font-normal leading-snug">
                        <span className="font-medium">{t('patients.marketingOptional')}</span>{' '}
                        {t('patients.marketingText')}
                    </Label>
                </div>
                <SignaturePad ref={pad} onChange={setEmpty} />
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                <DialogFooter className="gap-2">
                    <Button variant="outline" className="h-11" onClick={onClose} disabled={saving}>
                        {t('patients.later')}
                    </Button>
                    <Button className="h-11" onClick={save} disabled={saving || empty}>
                        {saving && <Loader2 className="animate-spin" />}
                        {t('patients.saveSignature')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
