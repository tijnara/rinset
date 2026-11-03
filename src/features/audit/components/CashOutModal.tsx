'use client';

import { useState } from 'react';
import { ExpenseCategory } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { Bubbles } from '@/components/icons/Bubbles';
import {
    X,
    Banknote,
    Droplet,
    Package,
    Coffee,
    Loader2,
    Printer,
    Check,
} from 'lucide-react';

interface CashOutModalProps {
    storeId: string;
    storeName: string;
    isOpen: boolean;
    onClose: () => void;
    onSaveExpense: (expense: {
        amount: number;
        category: ExpenseCategory;
        description: string;
    }) => Promise<boolean>;
}

const PRESETS = [
    {
        label: 'Water Refill',
        amount: 250,
        category: 'water_refill' as ExpenseCategory,
        desc: '5x 5-gallon purified drinking & wash water',
        icon: Droplet,
    },
    {
        label: 'Packaging Bags',
        amount: 180,
        category: 'packaging' as ExpenseCategory,
        desc: '1 bundle XL laundry plastic roll & packaging tape',
        icon: Package,
    },
    {
        label: 'Staff Merienda',
        amount: 150,
        category: 'staff_allowance' as ExpenseCategory,
        desc: 'Attendant meal / lunch allowance',
        icon: Coffee,
    },
    {
        label: 'Emergency Soap',
        amount: 220,
        category: 'soap_supplies' as ExpenseCategory,
        desc: 'Emergency liquid detergent refill pouch',
        icon: Bubbles,
    },
];

export function CashOutModal({
                                 storeId,
                                 storeName,
                                 isOpen,
                                 onClose,
                                 onSaveExpense,
                             }: CashOutModalProps) {
    const [amount, setAmount] = useState<number>(250);
    const [category, setCategory] = useState<ExpenseCategory>('water_refill');
    const [description, setDescription] = useState<string>('5x 5-gallon purified water refill');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastVoucher, setLastVoucher] = useState<{
        amount: number;
        desc: string;
        category: string;
        time: string;
    } | null>(null);

    if (!isOpen) return null;

    const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
        setAmount(preset.amount);
        setCategory(preset.category);
        setDescription(preset.desc);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0 || !description.trim()) return;

        setIsSubmitting(true);
        const success = await onSaveExpense({
            amount,
            category,
            description: description.trim(),
        });

        setIsSubmitting(false);
        if (success) {
            setLastVoucher({
                amount,
                desc: description.trim(),
                category,
                time: new Date().toLocaleTimeString('en-US', {
                    timeZone: 'Asia/Manila',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            });
        }
    };

    const handlePrintVoucher = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                            <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base leading-none">Register Cash-Out</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Petty cash drawn directly from register</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Voucher Success View */}
                {lastVoucher ? (
                    <div className="space-y-4 py-2">
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <Check className="w-4 h-4 stroke-[3]" />
              </span>
                            <p className="text-xs font-bold text-emerald-400">Cash-Out Logged Successfully</p>
                            <p className="text-2xl font-mono font-black text-white">{formatPHP(lastVoucher.amount)}</p>
                            <p className="text-xs text-slate-400">{lastVoucher.desc}</p>
                        </div>

                        {/* 58mm Thermal Voucher Printable Box */}
                        <div className="hidden print:block w-[58mm] bg-white text-black p-3 font-mono text-[10px] leading-tight mx-auto">
                            <div className="text-center pb-2 border-b border-dashed border-black">
                                <h2 className="text-xs font-black uppercase">{storeName}</h2>
                                <p className="text-[9px]">PETTY CASH EXPENSE VOUCHER</p>
                                <p className="text-[8px] text-gray-600">{lastVoucher.time}</p>
                            </div>
                            <div className="py-2 space-y-1 border-b border-dashed border-black">
                                <div className="flex justify-between font-black text-xs">
                                    <span>AMOUNT OUT:</span>
                                    <span>{formatPHP(lastVoucher.amount)}</span>
                                </div>
                                <p><strong>Reason:</strong> {lastVoucher.desc}</p>
                                <p><strong>Category:</strong> {lastVoucher.category}</p>
                            </div>
                            <div className="pt-3 text-[8px] space-y-3">
                                <p>Cashier Signature: __________________</p>
                                <p className="text-center text-gray-500">Keep this in cash drawer for Z-Reading audit</p>
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                type="button"
                                onClick={handlePrintVoucher}
                                className="flex-1 h-12 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print 58mm Voucher</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Quick Common Presets */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Quick Expense Presets
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PRESETS.map((p) => {
                                    const Icon = p.icon;
                                    const isSelected = amount === p.amount && category === p.category;

                                    return (
                                        <button
                                            key={p.label}
                                            type="button"
                                            onClick={() => handleApplyPreset(p)}
                                            className={`p-2.5 rounded-xl border text-left flex items-start space-x-2 transition ${
                                                isSelected
                                                    ? 'bg-rose-500/15 border-rose-500/50 text-white'
                                                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <span className="text-xs font-semibold block text-slate-200 truncate">{p.label}</span>
                                                <span className="font-mono text-[11px] text-rose-400 font-bold">{formatPHP(p.amount)}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Amount & Category */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1 font-semibold">Amount (PHP):</label>
                                <input
                                    type="number"
                                    step="5"
                                    required
                                    value={amount || ''}
                                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-base font-mono font-bold text-rose-400 focus:border-rose-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1 font-semibold">Expense Category:</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                                >
                                    <option value="water_refill">Water Refill</option>
                                    <option value="packaging">Packaging Supplies</option>
                                    <option value="soap_supplies">Detergent Refill</option>
                                    <option value="staff_allowance">Staff Allowance / Food</option>
                                    <option value="maintenance">Maintenance / Repair</option>
                                    <option value="other">Other Outflow</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1 font-semibold">Expense Particulars / Description:</label>
                            <textarea
                                required
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. 5x purified water containers, official receipt #1049"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none placeholder-slate-600 resize-none"
                            />
                        </div>

                        <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-[11px] text-rose-300">
                            <strong>Notice:</strong> This immediately deducts from today's expected cash in the drawer and will be reflected on the daily Z-Reading audit slip.
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || amount <= 0 || !description.trim()}
                            className="w-full h-12 bg-rose-500 hover:bg-rose-400 active:bg-rose-600 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-lg"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <span>Confirm Cash Out ({formatPHP(amount)})</span>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}