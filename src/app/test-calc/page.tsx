'use client';

import { useState } from 'react';
import {
    CartItem,
    calculateOrderTotal,
    calculatePayment,
    formatPHP,
} from '@/lib/calculations';

export default function TestCalcPage() {
    const [weight, setWeight] = useState<number>(3.5);
    const [cash, setCash] = useState<number>(500);

    const cart: CartItem[] = [
        {
            id: '1',
            name: 'Wash-Dry-Fold (Regular)',
            pricingType: 'per_kilo',
            unitPrice: 35,
            quantity: weight,
            minimumQuantity: 5,
        },
        {
            id: '2',
            name: 'Ariel Detergent Pod',
            pricingType: 'consumable',
            unitPrice: 15,
            quantity: 2,
        },
    ];

    const order = calculateOrderTotal(cart, { rushFee: 30 });
    const payment = calculatePayment(order.netPayable, cash, 0);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex justify-center items-center">
            <div className="w-full max-w-md bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
                <h2 className="text-xl font-bold text-sky-400">Rinset Calculation Engine Test</h2>

                <div className="space-y-2">
                    <label className="text-sm text-slate-400">Scale Weight (kg):</label>
                    <input
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                    <span className="text-xs text-slate-500">
            (Minimum load rule: 5kg @ ₱35/kg)
          </span>
                </div>

                <div className="border-t border-slate-700 pt-4 space-y-2 text-sm">
                    {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between">
                            <span>{item.name} ({item.billableQuantity} {item.pricingType === 'per_kilo' ? 'kg' : 'pcs'})</span>
                            <span className="font-mono">{formatPHP(item.itemTotal)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between text-amber-400">
                        <span>Rush Fee</span>
                        <span className="font-mono">{formatPHP(order.rushFee)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-emerald-400 border-t border-slate-700 pt-2">
                        <span>Total Payable:</span>
                        <span className="font-mono">{formatPHP(order.netPayable)}</span>
                    </div>
                </div>

                <div className="space-y-2 border-t border-slate-700 pt-4">
                    <label className="text-sm text-slate-400">Cash Tendered (₱):</label>
                    <input
                        type="number"
                        value={cash}
                        onChange={(e) => setCash(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                </div>

                <div className="p-3 bg-slate-950 rounded-lg flex justify-between font-mono text-sm">
                    <span>Change:</span>
                    <span className="text-emerald-400 font-bold">{formatPHP(payment.changeDue)}</span>
                </div>
            </div>
        </div>
    );
}