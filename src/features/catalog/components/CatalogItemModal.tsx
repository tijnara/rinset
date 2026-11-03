'use client';

import { useState, useEffect } from 'react';
import { CatalogItem, PricingType } from '@/types/database';
import { X, Check } from 'lucide-react';

interface CatalogItemModalProps {
    item: CatalogItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (itemData: Partial<CatalogItem>) => Promise<void>;
}

export function CatalogItemModal({ item, isOpen, onClose, onSave }: CatalogItemModalProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Services');
    const [pricingType, setPricingType] = useState<PricingType>('per_kilo');
    const [unitPrice, setUnitPrice] = useState<number>(35);
    const [minQty, setMinQty] = useState<number>(5);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (item) {
            setName(item.name);
            setCategory(item.category);
            setPricingType(item.pricing_type);
            setUnitPrice(item.unit_price);
            setMinQty(item.minimum_quantity || 0);
        } else {
            setName('');
            setCategory('Services');
            setPricingType('per_kilo');
            setUnitPrice(35);
            setMinQty(5);
        }
    }, [item, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        await onSave({
            id: item?.id,
            name: name.trim(),
            category: category.trim(),
            pricing_type: pricingType,
            unit_price: unitPrice,
            minimum_quantity: pricingType === 'per_kilo' ? minQty : 0,
            is_active: item ? item.is_active : true,
        });
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-base">
                        {item ? 'Edit Price & Service' : 'Add New Service / Item'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Item / Service Name:</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Wash-Dry-Fold (Regular)"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Category:</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                            >
                                <option value="Services">Services</option>
                                <option value="Bulky">Bulky</option>
                                <option value="Retail">Retail</option>
                                <option value="Specialty">Specialty</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Pricing Type:</label>
                            <select
                                value={pricingType}
                                onChange={(e) => setPricingType(e.target.value as PricingType)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                            >
                                <option value="per_kilo">Per Kilo (Scale)</option>
                                <option value="per_piece">Per Piece</option>
                                <option value="per_load">Per Load</option>
                                <option value="consumable">Retail Sachet</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Price (PHP):</label>
                            <input
                                type="number"
                                step="0.5"
                                required
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                            />
                        </div>

                        {pricingType === 'per_kilo' && (
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Minimum Floor (kg):</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={minQty}
                                    onChange={(e) => setMinQty(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 mt-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow transition"
                    >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Save Configuration</span>
                    </button>
                </form>
            </div>
        </div>
    );
}