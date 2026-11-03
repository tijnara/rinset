'use client';

import { useState } from 'react';
import { CatalogItem } from '@/types/database';
import { formatPHP } from '@/lib/calculations';
import { X, Check } from 'lucide-react';

interface WeightModalProps {
    item: CatalogItem | null;
    onClose: () => void;
    onConfirm: (item: CatalogItem, weight: number) => void;
}

export function WeightModal({ item, onClose, onConfirm }: WeightModalProps) {
    const [weightStr, setWeightStr] = useState<string>('5.0');

    if (!item) return null;

    const handleKeyPress = (val: string) => {
        if (val === 'C') {
            setWeightStr('0');
            return;
        }
        if (val === '⌫') {
            setWeightStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
            return;
        }
        if (val === '.') {
            if (!weightStr.includes('.')) setWeightStr((prev) => prev + '.');
            return;
        }
        setWeightStr((prev) => (prev === '0' ? val : prev + val));
    };

    const parsedWeight = parseFloat(weightStr) || 0;
    const billableWeight = Math.max(item.minimum_quantity || 0, parsedWeight);
    const estimatedTotal = billableWeight * item.unit_price;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                    <div>
                        <h3 className="text-lg font-bold text-white">{item.name}</h3>
                        <p className="text-xs text-sky-400 font-mono">
                            {formatPHP(item.unit_price)}/kg (Min {item.minimum_quantity} kg)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Big Weight Scale Display */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider block">Scale Weight</span>
                        <span className="text-3xl font-mono font-black text-white">{weightStr}</span>
                        <span className="text-sm text-slate-400 ml-1">kg</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 uppercase tracking-wider block">Estimated</span>
                        <span className="text-2xl font-mono font-bold text-emerald-400">
              {formatPHP(estimatedTotal)}
            </span>
                    </div>
                </div>

                {/* Quick Weight Preset Buttons */}
                <div className="grid grid-cols-4 gap-2">
                    {['5.0', '6.0', '7.0', '8.0'].map((preset) => (
                        <button
                            key={preset}
                            onClick={() => setWeightStr(preset)}
                            className="py-2.5 bg-slate-800/80 hover:bg-slate-700 active:bg-sky-600 rounded-lg text-sm font-mono font-semibold text-slate-200 transition"
                        >
                            {preset} kg
                        </button>
                    ))}
                </div>

                {/* On-Screen Touch Numpad */}
                <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((btn) => (
                        <button
                            key={btn}
                            onClick={() => handleKeyPress(btn)}
                            className="h-12 bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-lg font-bold font-mono text-white rounded-xl flex items-center justify-center transition shadow-sm"
                        >
                            {btn}
                        </button>
                    ))}
                </div>

                {/* Confirm Button */}
                <button
                    onClick={() => {
                        if (parsedWeight > 0) {
                            onConfirm(item, parsedWeight);
                            onClose();
                        }
                    }}
                    className="w-full h-14 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold text-base rounded-xl flex items-center justify-center space-x-2 shadow-lg transition"
                >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                    <span>Add to Basket ({parsedWeight} kg)</span>
                </button>
            </div>
        </div>
    );
}