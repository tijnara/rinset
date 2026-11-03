'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface QrScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (scannedText: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const qrElementId = 'rinset-camera-reader';
        const scanner = new Html5Qrcode(qrElementId);
        scannerRef.current = scanner;

        const startScanner = async () => {
            try {
                await scanner.start(
                    { facingMode: 'environment' }, // Back camera on mobile/tablets
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        // Success handler
                        onScanSuccess(decodedText);
                        scanner.stop().then(() => onClose());
                    },
                    () => {
                        // Scanning in progress (no-op)
                    }
                );
            } catch (err) {
                console.error('Camera access denied or failed:', err);
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, [isOpen, onClose, onScanSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2 text-white">
                        <Camera className="w-5 h-5 text-sky-400" />
                        <h3 className="font-bold text-base">Scan Basket Tag</h3>
                    </div>
                    <button
                        onClick={() => {
                            if (scannerRef.current && scannerRef.current.isScanning) {
                                scannerRef.current.stop().then(() => onClose());
                            } else {
                                onClose();
                            }
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Camera Video Viewfinder */}
                <div className="w-full h-64 bg-black rounded-2xl overflow-hidden relative border border-slate-800">
                    <div id="rinset-camera-reader" className="w-full h-full" />
                </div>

                <p className="text-center text-xs text-slate-400">
                    Point camera at the QR code printed on the basket tag.
                </p>
            </div>
        </div>
    );
}