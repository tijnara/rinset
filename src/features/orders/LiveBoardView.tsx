'use client';

import { useState } from 'react';
import { Order, OrderStatus } from '@/types/database';
import { useLiveOrders } from '@/features/orders/hooks/useLiveOrders';
import { KanbanColumn } from '@/features/orders/components/KanbanColumn';
import { SettleClaimModal } from '@/features/orders/components/SettleClaimModal';
import { QrScannerModal } from '@/features/orders/components/QrScannerModal';
import { Navbar } from '@/components/layout/Navbar';
import {
    Clock,
    Sparkles,
    Wind,
    CheckCircle2,
    PackageCheck,
    Search,
    Camera,
    LucideIcon,
} from 'lucide-react';

interface LaneConfig {
    key: OrderStatus;
    label: string;
    icon: LucideIcon;
    color: string;
}

const LANES: LaneConfig[] = [
    { key: 'received', label: 'Received / Queue', icon: Clock, color: 'text-amber-400 border-amber-500/30' },
    { key: 'washing', label: 'Washing', icon: Sparkles, color: 'text-sky-400 border-sky-500/30' },
    { key: 'drying', label: 'Drying', icon: Wind, color: 'text-indigo-400 border-indigo-500/30' },
    { key: 'ready_for_pickup', label: 'Ready for Claim', icon: CheckCircle2, color: 'text-emerald-400 border-emerald-500/30' },
    { key: 'claimed', label: 'Claimed', icon: PackageCheck, color: 'text-slate-500 border-slate-700' },
];

export function LiveBoardView() {
    const { orders, storeName, updateOrderStatus, refreshOrders } = useLiveOrders();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [orderToSettle, setOrderToSettle] = useState<Order | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

    const filteredOrders = orders.filter((o) => {
        const q = searchQuery.toLowerCase();
        const matchesTag = o.basket_tag.toLowerCase().includes(q);
        const matchesNum = o.order_number.toLowerCase().includes(q);
        const matchesCustomer = o.customer?.full_name?.toLowerCase().includes(q) ?? false;
        return matchesTag || matchesNum || matchesCustomer;
    });

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            <Navbar storeName={storeName} />

            {/* Filter, Search & Camera Scanner Bar */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex w-full sm:w-80 gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search basket tag, order #, or customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="px-3.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 rounded-xl flex items-center justify-center transition shadow-sm"
                        title="Scan Basket QR Code"
                    >
                        <Camera className="w-4 h-4 stroke-[2.2]" />
                    </button>
                </div>

                <div className="text-xs text-slate-400 flex items-center space-x-4">
          <span>
            Active Baskets: <strong className="text-white">{orders.filter(o => o.status !== 'claimed' && o.status !== 'cancelled').length}</strong>
          </span>
                    <span>
            Ready for Pickup: <strong className="text-emerald-400">{orders.filter(o => o.status === 'ready_for_pickup').length}</strong>
          </span>
                </div>
            </div>

            {/* Realtime Kanban Columns Grid */}
            <div className="flex-1 overflow-x-auto p-4 flex space-x-4">
                {LANES.map((lane) => (
                    <KanbanColumn
                        key={lane.key}
                        statusKey={lane.key}
                        label={lane.label}
                        icon={lane.icon}
                        colorClass={lane.color}
                        orders={filteredOrders.filter((o) => o.status === lane.key)}
                        onAdvance={updateOrderStatus}
                        onSettle={(order) => setOrderToSettle(order)}
                    />
                ))}
            </div>

            {/* Settle & Claim Payment Modal */}
            <SettleClaimModal
                order={orderToSettle}
                onClose={() => setOrderToSettle(null)}
                onSuccess={() => {
                    refreshOrders();
                }}
            />

            {/* Camera QR Tag Scanner Modal */}
            <QrScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={(scannedText) => {
                    setSearchQuery(scannedText);
                }}
            />
        </div>
    );
}