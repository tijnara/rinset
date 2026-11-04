'use client';

import { useState } from 'react';
import { X, PackageCheck } from 'lucide-react';
import { OrderBasket } from '@/types/database';

interface AssignStorageModalProps {
    basket: OrderBasket | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (location: string) => void;
}

const COMMON_LOCATIONS = ['Rack A', 'Rack B', 'Rack C', 'Shelf 01', 'Shelf 02', 'Hanger Rail'];

export function AssignStorageModal({ basket, isOpen, onClose, onConfirm }: AssignStorageModalProps) {
    const [customLocation, setCustomLocation] = useState('');

    if (!isOpen || !basket) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        <PackageCheck className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-white text-base">Assign Storage Location</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-xs text-slate-400">Where are you placing Basket <strong className="text-sky-400">{basket.basket_tag}</strong> for the customer to claim?</p>

                <div className="grid grid-cols-2 gap-2">
                    {COMMON_LOCATIONS.map((loc) => (
                        <button
                            key={loc}
                            onClick={() => onConfirm(loc)}
                            className="p-2.5 rounded-xl border bg-slate-950 border-slate-800 hover:border-emerald-500 text-slate-300 text-xs font-bold transition"
                        >
                            {loc}
                        </button>
                    ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex space-x-2">
                    <input
                        type="text"
                        placeholder="Custom Shelf (e.g. Back Room)"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                    />
                    <button
                        onClick={() => customLocation && onConfirm(customLocation)}
                        disabled={!customLocation}
                        className="px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}