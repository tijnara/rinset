'use client';

import { useState } from 'react';
import { Delete, Lock } from 'lucide-react';

interface PinPadProps {
    title?: string;
    subtitle?: string;
    errorMessage?: string | null;
    onComplete: (pin: string) => Promise<boolean | void>;
    onCancel?: () => void;
}

export function PinPad({
                           title = 'Enter 4-Digit Security PIN',
                           subtitle = 'Enter PIN to authorize access',
                           errorMessage,
                           onComplete,
                           onCancel,
                       }: PinPadProps) {
    const [pin, setPin] = useState<string>('');
    const [internalError, setInternalError] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const handleDigit = async (digit: string) => {
        if (pin.length >= 4 || isSubmitting) return;

        const newPin = pin + digit;
        setPin(newPin);
        setInternalError(false);

        if (newPin.length === 4) {
            setIsSubmitting(true);
            const success = await onComplete(newPin);
            if (success === false) {
                setInternalError(true);
                setPin('');
            }
            setIsSubmitting(false);
        }
    };

    const handleBackspace = () => {
        if (isSubmitting) return;
        setPin((prev) => prev.slice(0, -1));
        setInternalError(false);
    };

    const handleClear = () => {
        if (isSubmitting) return;
        setPin('');
        setInternalError(false);
    };

    const hasError = internalError || Boolean(errorMessage);

    return (
        <div className="w-full max-w-xs mx-auto flex flex-col items-center select-none">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
                <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white text-center">{title}</h3>
            <p className="text-xs text-slate-400 text-center mb-6 mt-1">{subtitle}</p>

            {/* 4-Dot Indicators */}
            <div className="flex space-x-4 mb-6">
                {[0, 1, 2, 3].map((idx) => (
                    <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                            hasError
                                ? 'bg-rose-500 animate-pulse'
                                : idx < pin.length
                                    ? 'bg-sky-400 scale-110 shadow-sm shadow-sky-400/50'
                                    : 'bg-slate-800 border border-slate-700'
                        }`}
                    />
                ))}
            </div>

            {hasError && (
                <p className="text-xs text-rose-400 font-semibold mb-4 text-center max-w-[260px]">
                    {errorMessage || 'Incorrect PIN. Try again.'}
                </p>
            )}

            {/* 3x4 Touch Grid */}
            <div className="grid grid-cols-3 gap-3 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                        key={digit}
                        type="button"
                        onClick={() => handleDigit(digit)}
                        disabled={isSubmitting}
                        className="h-16 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:bg-sky-500 active:text-slate-950 text-xl font-bold font-mono text-white transition flex items-center justify-center shadow-sm"
                    >
                        {digit}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={handleClear}
                    disabled={isSubmitting}
                    className="h-16 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white active:bg-slate-800 transition flex items-center justify-center"
                >
                    Clear
                </button>

                <button
                    type="button"
                    onClick={() => handleDigit('0')}
                    disabled={isSubmitting}
                    className="h-16 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:bg-sky-500 active:text-slate-950 text-xl font-bold font-mono text-white transition flex items-center justify-center shadow-sm"
                >
                    0
                </button>

                <button
                    type="button"
                    onClick={handleBackspace}
                    disabled={isSubmitting}
                    className="h-16 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white active:bg-slate-800 transition flex items-center justify-center"
                >
                    <Delete className="w-5 h-5" />
                </button>
            </div>

            {onCancel && (
                <button
                    onClick={onCancel}
                    className="mt-6 text-xs text-slate-500 hover:text-slate-300 font-medium transition"
                >
                    Cancel & Go Back
                </button>
            )}
        </div>
    );
}