// src/hooks/useBarcodeScanner.ts
'use client';

import { useEffect, useRef } from 'react';
import { sound } from '@/lib/sound';

interface UseBarcodeScannerOptions {
    onScan: (barcode: string) => void;
    minChars?: number;
    maxIntervalMs?: number;
    enabled?: boolean;
}

export function useBarcodeScanner({
                                      onScan,
                                      minChars = 3,
                                      maxIntervalMs = 60,
                                      enabled = true,
                                  }: UseBarcodeScannerOptions) {
    const bufferRef = useRef<string>('');
    const lastKeyTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Allow physical barcode scanners even if focus is inside an input,
            // but bypass modifier keys (Shift, Ctrl, Alt)
            if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
                return;
            }

            const now = Date.now();
            const timeDiff = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            if (e.key === 'Enter') {
                const scannedCode = bufferRef.current.trim();
                bufferRef.current = '';

                // If buffer was collected rapidly and meets minimum length, fire barcode event
                if (scannedCode.length >= minChars) {
                    e.preventDefault();
                    sound.playScanBeep();
                    onScan(scannedCode);
                }
                return;
            }

            // Printable single character check
            if (e.key.length === 1) {
                // If elapsed time between keystrokes exceeds typical barcode rate, reset buffer
                if (timeDiff > maxIntervalMs && bufferRef.current.length > 0) {
                    bufferRef.current = '';
                }
                bufferRef.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [onScan, minChars, maxIntervalMs, enabled]);
}