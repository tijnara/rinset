'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (scannedText: string) => void;
}

export function QrScannerModal({
                                   isOpen,
                                   onClose,
                                   onScanSuccess,
                               }: QrScannerModalProps) {
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(true);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const triggerFeedback = () => {
        // Vibration feedback on supported mobile devices
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([40, 60, 40]);
        }

        // Audio confirmation beep
        try {
            const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5)
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } catch {
            // AudioContext unavailable or blocked by browser policy
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setCameraError(null);
        setIsStarting(true);

        const startScanner = async () => {
            try {
                const scanner = new Html5Qrcode('qr-reader-viewport');
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 15,
                        qrbox: { width: 220, height: 220 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        triggerFeedback();
                        onScanSuccess(decodedText.trim());
                        scanner.stop().catch(() => {});
                        onClose();
                    },
                    () => {
                        // Frame scan failure (no QR in frame); intentional noop
                    }
                );

                if (isMounted) setIsStarting(false);
            } catch (err: unknown) {
                if (!isMounted) return;
                const msg = err instanceof Error ? err.message : 'Camera access denied or unavailable.';
                setCameraError(msg);
                setIsStarting(false);
            }
        };

        const timer = setTimeout(startScanner, 100);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, [isOpen, onClose, onScanSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        <Camera className="w-5 h-5 text-sky-400" />
                        <h3 className="font-bold text-white text-base">Scan Basket / Ticket QR</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Camera Viewport */}
                <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-square flex items-center justify-center">
                    <div id="qr-reader-viewport" className="w-full h-full" />

                    {/* Scanner Targeting Reticle */}
                    {!cameraError && !isStarting && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-52 h-52 border-2 border-sky-400/80 rounded-2xl relative animate-pulse">
                                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-sky-400" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-sky-400" />
                                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-sky-400" />
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-sky-400" />
                            </div>
                        </div>
                    )}

                    {isStarting && !cameraError && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                            <span className="text-xs">Starting camera sensor...</span>
                        </div>
                    )}

                    {cameraError && (
                        <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center space-y-2 text-rose-400">
                            <AlertCircle className="w-8 h-8" />
                            <p className="text-xs font-semibold">{cameraError}</p>
                            <p className="text-[10px] text-slate-500">
                                Ensure camera permissions are allowed in your browser settings.
                            </p>
                        </div>
                    )}
                </div>

                <p className="text-center text-[11px] text-slate-400 font-sans">
                    Align the QR code from the printed receipt within the frame to locate the ticket.
                </p>
            </div>
        </div>
    );
}