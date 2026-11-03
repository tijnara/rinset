'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Customer, Order } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { User, Phone, AlertCircle, Check } from 'lucide-react';

interface CustomerSuggestion extends Customer {
    unpaidBalance: number;
}

interface CustomerAutocompleteProps {
    customerName: string;
    customerMobile: string;
    onSelect: (name: string, mobile: string) => void;
    onNameChange: (name: string) => void;
    onMobileChange: (mobile: string) => void;
}

export function CustomerAutocomplete({
                                         customerName,
                                         customerMobile,
                                         onSelect,
                                         onNameChange,
                                         onMobileChange,
                                     }: CustomerAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeCustomerDebt, setActiveCustomerDebt] = useState<number>(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search Supabase when typing name or mobile
    useEffect(() => {
        const query = customerMobile.trim() || customerName.trim();
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('customers')
                .select('*, orders(net_payable, total_paid, payment_status, status)')
                .or(`full_name.ilike.%${query}%,mobile_number.ilike.%${query}%`)
                .limit(5);

            if (data) {
                const mapped: CustomerSuggestion[] = data.map((c) => {
                    const orders = (c.orders as Order[]) || [];
                    const debt = orders
                        .filter((o) => o.payment_status !== 'paid' && o.status !== 'cancelled')
                        .reduce((sum, o) => sum + (Number(o.net_payable) - Number(o.total_paid || 0)), 0);

                    return {
                        ...c,
                        unpaidBalance: debt,
                    };
                });
                setSuggestions(mapped);
                setIsOpen(mapped.length > 0);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [customerName, customerMobile]);

    const handleSelectCustomer = (cust: CustomerSuggestion) => {
        onSelect(cust.full_name, cust.mobile_number || '');
        setActiveCustomerDebt(cust.unpaidBalance);
        setIsOpen(false);
    };

    return (
        <div className="space-y-2 relative" ref={dropdownRef}>
            {/* Name Input with Autocomplete Dropdown */}
            <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => {
                        onNameChange(e.target.value);
                        setActiveCustomerDebt(0);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />

                {/* Live Search Popup */}
                {isOpen && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/60 animate-in fade-in duration-100">
                        {suggestions.map((cust) => (
                            <button
                                key={cust.id}
                                type="button"
                                onClick={() => handleSelectCustomer(cust)}
                                className="w-full px-3 py-2.5 text-left hover:bg-slate-800/80 flex items-center justify-between transition group"
                            >
                                <div>
                                    <p className="text-xs font-semibold text-white group-hover:text-sky-400 transition">
                                        {cust.full_name}
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-mono">{cust.mobile_number || 'No mobile'}</p>
                                </div>

                                {cust.unpaidBalance > 0 ? (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400">
                    Debt: {formatPHP(cust.unpaidBalance)}
                  </span>
                                ) : (
                                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Clean
                  </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Mobile Input */}
            <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Mobile (0917... for SMS alerts)"
                    value={customerMobile}
                    onChange={(e) => {
                        onMobileChange(e.target.value);
                        setActiveCustomerDebt(0);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
            </div>

            {/* Active Unpaid Debt Banner in Ticket */}
            {activeCustomerDebt > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/60 flex items-center space-x-2 text-rose-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <p className="text-[11px] leading-tight">
                        <strong>Notice:</strong> This customer has an uncollected balance of{' '}
                        <span className="font-mono font-bold text-rose-400">{formatPHP(activeCustomerDebt)}</span>.
                    </p>
                </div>
            )}
        </div>
    );
}