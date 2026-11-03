'use client';

import { useState } from 'react';
import { useCustomers, CustomerWithMetrics } from './hooks/useCustomers';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { Navbar } from '@/components/layout/Navbar';
import { formatPHP } from '@/lib/formatters';
import { Users, Search, AlertCircle, Eye, UserPlus } from 'lucide-react';

export function CustomerView() {
    const { customers, storeName, createCustomer } = useCustomers();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithMetrics | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const filtered = customers.filter((c) => {
        const q = searchQuery.toLowerCase();
        const nameMatch = c.full_name.toLowerCase().includes(q);
        const phoneMatch = c.mobile_number?.includes(q) ?? false;
        return nameMatch || phoneMatch;
    });

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            <Navbar storeName={storeName} />

            <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto space-y-5">
                {/* Header, Search & Add Customer Button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-sky-400" />
                            Customer Directory & CRM
                        </h2>
                        <p className="text-xs text-slate-400">
                            {customers.length} registered customers • Track repeat visits & uncollected balances
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by name or mobile (09...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                            />
                        </div>

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="h-10 px-4 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow whitespace-nowrap"
                        >
                            <UserPlus className="w-4 h-4 stroke-[2.5]" />
                            <span>Add Customer</span>
                        </button>
                    </div>
                </div>

                {/* Customer Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((customer) => (
                        <div
                            key={customer.id}
                            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition space-y-3"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-sm text-white">{customer.full_name}</h3>
                                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                                        {customer.mobile_number || 'No mobile registered'}
                                    </p>
                                </div>

                                {customer.unpaidBalance > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Utang: {formatPHP(customer.unpaidBalance)}
                  </span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                                <div>
                                    <span className="text-[10px] text-slate-500 block">Visits</span>
                                    <span className="font-bold text-slate-200">{customer.totalVisits}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block">Total Kg</span>
                                    <span className="font-bold text-slate-200">{customer.totalWeightKg} kg</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block">Paid</span>
                                    <span className="font-bold text-emerald-400">{formatPHP(customer.totalSpent)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedCustomer(customer)}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-sky-500 active:text-slate-950 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Order History</span>
                            </button>
                        </div>
                    ))}
                </div>
            </main>

            {/* Add Customer Modal */}
            <AddCustomerModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={createCustomer}
            />

            {/* Detail & History Modal */}
            <CustomerDetailModal
                customer={selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
            />
        </div>
    );
}