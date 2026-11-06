'use client';

import React from 'react';
import { Delete, Check } from 'lucide-react';

interface PresetOption {
    label: string;
    value: number | string;
    isBump?: boolean;
}

interface TouchNumpadProps {
    value: string;
    onChange: (val: string) => void;
    onEnter?: () => void;
    allowDecimal?: boolean;
    maxLength?: number;
    presets?: PresetOption[];
    enterLabel?: string;
    className?: string;
}

export function TouchNumpad({
                                value,
                                onChange,
                                onEnter,
                                allowDecimal = true,
                                maxLength = 12,
                                presets = [],
                                enterLabel = 'Confirm',
                                className = '',
                            }: TouchNumpadProps) {
    const triggerHaptic = () => {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate(10);
            } catch {}
        }
    };

    const handleDigit = (digit: string) => {
        triggerHaptic();
        if (value.length >= maxLength) return;
        if (digit === '.') {
            if (!allowDecimal || value.includes('.')) return;
            onChange(value === '' ? '0.' : value + '.');
            return;
        }
        // Prevent double leading zeroes
        if (value === '0' && digit !== '.') {
            onChange(digit);
            return;
        }
        onChange(value + digit);
    };

    const handleBackspace = () => {
        triggerHaptic();
        if (value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    const handleClear = () => {
        triggerHaptic();
        onChange('');
    };

    const handlePresetClick = (preset: PresetOption) => {
        triggerHaptic();
        if (preset.isBump) {
            const current = parseFloat(value) || 0;
            const bump = typeof preset.value === 'number' ? preset.value : parseFloat(preset.value);
            const res = Math.max(0, current + bump);
            onChange(allowDecimal ? res.toFixed(1) : Math.round(res).toString());
        } else {
            onChange(preset.value.toString());
        }
    };

    return (
        <div className={`flex flex-col gap-2 select-none ${className}`}>
            {/* Quick Preset Buttons (if provided) */}
            {presets.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 pb-1">
                    {presets.map((preset, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handlePresetClick(preset)}
                            className="min-h-[48px] h-12 rounded-xl bg-slate-900 border border-slate-700 hover:border-sky-500 active:scale-95 text-sky-400 font-mono font-bold text-xs flex items-center justify-center transition shadow-sm"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Main 48px+ Numpad Grid */}
            <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                        key={digit}
                        type="button"
                        onClick={() => handleDigit(digit)}
                        className="min-h-[52px] h-14 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:bg-sky-500 active:text-slate-950 active:scale-95 text-white font-mono text-xl font-bold flex items-center justify-center transition shadow-md"
                    >
                        {digit}
                    </button>
                ))}

                {/* Bottom Row */}
                {allowDecimal ? (
                    <button
                        type="button"
                        onClick={() => handleDigit('.')}
                        className="min-h-[52px] h-14 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:bg-slate-700 active:scale-95 text-slate-300 font-mono text-2xl font-bold flex items-center justify-center transition shadow-md"
                    >
                        .
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="min-h-[52px] h-14 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-rose-500/20 active:scale-95 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center transition shadow-md"
                    >
                        CLR
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => handleDigit('0')}
                    className="min-h-[52px] h-14 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:bg-sky-500 active:text-slate-950 active:scale-95 text-white font-mono text-xl font-bold flex items-center justify-center transition shadow-md"
                >
                    0
                </button>

                <button
                    type="button"
                    onClick={handleBackspace}
                    className="min-h-[52px] h-14 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:bg-slate-700 active:scale-95 text-slate-400 hover:text-white flex items-center justify-center transition shadow-md"
                    title="Backspace"
                >
                    <Delete className="w-5 h-5" />
                </button>
            </div>

            {/* Action / Enter Button */}
            {onEnter && (
                <button
                    type="button"
                    onClick={() => {
                        triggerHaptic();
                        onEnter();
                    }}
                    className="mt-1 min-h-[50px] h-12 w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 active:scale-98 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-lg"
                >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{enterLabel}</span>
                </button>
            )}
        </div>
    );
}