'use client';

import { useState } from 'react';
import { TouchNumpad } from '@/components/ui/TouchNumpad';
import { X, Scale, AlertTriangle, Check, Layers } from 'lucide-react';

interface QuickWeightModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (weightKg: number) => void;
    serviceName?: string;
    unitPrice?: number;
}

export function QuickWeightModal({
                                     isOpen,
                                     onClose,
                                     onConfirm,
                                     serviceName = 'Wash & Dry Load',
                                     unitPrice = 35,
                                 }: QuickWeightModalProps) {
    const [weightStr, setWeightStr] = useState<string>('7.0');

    if (!isOpen) return null;

    const weightNum = parseFloat(weightStr) || 0;
    const isOverweight = weightNum > 8.0;
    const capacityPercent = Math.min(100, Math.round((weightNum / 8.0) * 100));
    const estimatedCost = weightNum * unitPrice;

    const WEIGHT_PRESETS = [
        { label: '5.0 kg', value: '5.0' },
        { label: '7.0 kg', value: '7.0' },
        { label: '8.0 kg', value: '8.0' },
        { label: '+0.5', value: 0.5, isBump: true },
        { label: '+1.0', value: 1.0, isBump: true },
    ];

    const handleConfirm = () => {
        if (weightNum > 0) {
            onConfirm(weightNum);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
                    <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                            <Scale className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm text-white">{serviceName}</h2>
                            <p className="text-[11px] text-slate-400 font-mono">₱{unitPrice.toFixed(2)}/kg</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Weight Display Area */}
                <div className="p-4 space-y-3 bg-slate-950/50">
                    <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Measured Scale Weight
            </span>
                        <span className="font-mono text-sm font-bold text-emerald-400">
              Est: ₱{estimatedCost.toFixed(2)}
            </span>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center">
                        <div className="font-mono text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
                            <span>{weightStr || '0'}</span>
                            <span className="text-base font-bold text-sky-400">kg</span>
                        </div>

                        {/* Quick Adjustment Bumps */}
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => {
                                    const next = Math.max(0, weightNum - 0.5);
                                    setWeightStr(next.toFixed(1));
                                }}
                                className="min-h-[48px] px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 active:scale-95 text-slate-300 font-mono font-bold text-sm transition"
                            >
                                -0.5
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = weightNum + 0.5;
                                    setWeightStr(next.toFixed(1));
                                }}
                                className="min-h-[48px] px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 active:scale-95 text-sky-400 font-mono font-bold text-sm transition"
                            >
                                +0.5
                            </button>
                        </div>
                    </div>

                    {/* 8kg Drum Capacity Meter */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono font-bold">
                            <span className="text-slate-400">Drum Load Capacity (Max 8.0 kg)</span>
                            <span className={isOverweight ? 'text-amber-400' : 'text-sky-400'}>
                {capacityPercent}% ({weightNum.toFixed(1)} / 8.0 kg)
              </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    isOverweight ? 'bg-amber-400' : 'bg-sky-400'
                                }`}
                                style={{ width: `${capacityPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Overweight Capacity Warning */}
                    {isOverweight && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2 animate-in fade-in">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                            <span className="text-[11px] leading-tight">
                Exceeds standard 8.0 kg machine load. Recommend splitting into 2 baskets.
              </span>
                        </div>
                    )}
                </div>

                {/* Tablet Touch Numpad */}
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                    <TouchNumpad
                        value={weightStr}
                        onChange={setWeightStr}
                        onEnter={handleConfirm}
                        allowDecimal={true}
                        maxLength={5}
                        presets={WEIGHT_PRESETS}
                        enterLabel={`Add ${weightNum.toFixed(1)} kg to Ticket (₱${estimatedCost.toFixed(2)})`}
                    />
                </div>
            </div>
        </div>
    );
}