import { Button } from '@/Components/ui/button';
import { Eraser } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface SignaturePadHandle {
    toBlob: () => Promise<Blob | null>;
    isEmpty: () => boolean;
}

export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (empty: boolean) => void }>(
    function SignaturePad({ onChange }, ref) {
        const { t } = useTranslation();
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const drawing = useRef(false);
        const last = useRef<{ x: number; y: number } | null>(null);
        const [empty, setEmpty] = useState(true);

        // Internal resolution = displayed size x devicePixelRatio, so strokes follow the finger exactly.
        const resize = useCallback(() => {
            const c = canvasRef.current;
            if (!c) return;
            const rect = c.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            c.width = Math.round(rect.width * dpr);
            c.height = Math.round(rect.height * dpr);
            const ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = getComputedStyle(c).color;
            setEmpty(true);
            onChange?.(true);
        }, [onChange]);

        useEffect(() => {
            resize();
            const ro = new ResizeObserver(() => resize());
            if (canvasRef.current) ro.observe(canvasRef.current);
            return () => ro.disconnect();
        }, [resize]);

        const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        function down(e: React.PointerEvent<HTMLCanvasElement>) {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = pos(e);
            const ctx = e.currentTarget.getContext('2d');
            const p = last.current;
            if (ctx) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fill();
            }
            if (empty) {
                setEmpty(false);
                onChange?.(false);
            }
        }
        function move(e: React.PointerEvent<HTMLCanvasElement>) {
            if (!drawing.current || !last.current) return;
            const ctx = e.currentTarget.getContext('2d');
            if (!ctx) return;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last.current = p;
        }
        function up() {
            drawing.current = false;
            last.current = null;
        }

        useImperativeHandle(
            ref,
            () => ({
                isEmpty: () => empty,
                toBlob: () =>
                    new Promise((res) =>
                        canvasRef.current ? canvasRef.current.toBlob((b) => res(b), 'image/png') : res(null),
                    ),
            }),
            [empty],
        );

        return (
            <div className="space-y-2">
                <canvas
                    ref={canvasRef}
                    aria-label={t('patients.padLabel')}
                    className="h-48 w-full touch-none rounded-lg border-2 border-dashed border-input bg-card text-foreground sm:h-56"
                    style={{ touchAction: 'none' }}
                    onPointerDown={down}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={up}
                    onPointerLeave={up}
                />
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {empty ? t('patients.padHint') : t('patients.padCaptured')}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={resize}>
                        <Eraser className="size-4" />
                        {t('patients.padClear')}
                    </Button>
                </div>
            </div>
        );
    },
);
