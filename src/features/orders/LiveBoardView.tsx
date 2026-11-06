'use client';

import { useState, ComponentType } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OrderBasket, Order, OrderStatus } from '@/types/database';
import { useLiveOrders } from '@/features/orders/hooks/useLiveOrders';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { KanbanColumn } from '@/features/orders/components/KanbanColumn';
import { SettleClaimModal } from '@/features/orders/components/SettleClaimModal';
import { QrScannerModal } from '@/features/orders/components/QrScannerModal';
import { MachineStatusOverview } from '@/features/orders/components/MachineStatusOverview';
import { AssignMachineModal } from '@/features/orders/components/AssignMachineModal';
import { AssignStorageModal } from '@/features/orders/components/AssignStorageModal';
import { Navbar } from '@/components/layout/Navbar';
import { Bubbles } from '@/components/icons/Bubbles';
import {
    Clock,
    Wind,
    CheckCircle2,
    PackageCheck,
    Search,
    Camera,
} from 'lucide-react';

interface LaneConfig {
    key: OrderStatus;
    label: string;
    icon: ComponentType<{ className?: string }>;
    color: string;
}

const LANES: LaneConfig[] = [
    { key: 'received', label: 'Received / Queue', icon: Clock, color: 'text-amber-400 border-amber-500/30' },
    { key: 'washing', label: 'Washing', icon: Bubbles, color: 'text-sky-400 border-sky-500/30' },
    { key: 'drying', label: 'Drying', icon: Wind, color: 'text-indigo-400 border-indigo-500/30' },
    { key: 'ready_for_pickup', label: 'Ready for Claim', icon: CheckCircle2, color: 'text-emerald-400 border-emerald-500/30' },
    { key: 'claimed', label: 'Claimed', icon: PackageCheck, color: 'text-slate-500 border-slate-700' },
];

const LOCAL_TIMERS_KEY = 'rinset_active_drum_timers';

export function LiveBoardView() {
    const storeId = useAuthStore((state) => state.storeId);
    const authStoreName = useAuthStore((state) => state.storeName);
    const { baskets, storeName: hookStoreName, updateBasketStatus, refreshOrders } = useLiveOrders();

    const storeName = authStoreName || hookStoreName || 'Rinset Laundry';

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [orderToSettle, setOrderToSettle] = useState<Order | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

    const [assignTarget, setAssignTarget] = useState<{
        basket: OrderBasket;
        targetStatus: OrderStatus;
    } | null>(null);

    const [storageTarget, setStorageTarget] = useState<OrderBasket | null>(null);

    const filteredBaskets = baskets.filter((b) => {
        const q = searchQuery.toLowerCase();
        const matchesTag = b.basket_tag?.toLowerCase().includes(q) ?? false;
        const matchesNum = b.order?.order_number?.toLowerCase().includes(q) ?? false;
        const customerDisplayName =
            (b.order as any)?.customer_name ||
            b.order?.customer?.full_name ||
            (b.order?.customer as any)?.name ||
            '';
        const matchesCustomer = customerDisplayName.toLowerCase().includes(q);
        const matchesMachine = b.assigned_machine?.toLowerCase().includes(q) ?? false;
        const matchesLocation = b.order?.storage_location?.toLowerCase().includes(q) ?? false;
        return matchesTag || matchesNum || matchesCustomer || matchesMachine || matchesLocation;
    });

    const handleConfirmStorage = async (location: string) => {
        if (!storageTarget) return;
        const supabase = createClient();

        let query = supabase
            .from('orders')
            .update({ storage_location: location })
            .eq('id', storageTarget.order_id);

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { error: storageErr } = await query;
        if (storageErr) {
            console.warn('[Storage Update Notice]', storageErr.message);
        }

        await updateBasketStatus(storageTarget.id, storageTarget.order_id, 'ready_for_pickup', null);

        setStorageTarget(null);
        refreshOrders();
    };

    // Automatically start cycle timer when a machine drum is appointed
    const handleAssignMachineAndStartTimer = async (
        basketId: string,
        orderId: string,
        nextStatus: OrderStatus,
        machineId: string
    ) => {
        await updateBasketStatus(basketId, orderId, nextStatus, machineId);

        const isDryer = machineId.toUpperCase().startsWith('D') || nextStatus === 'drying';
        const durationMinutes = isDryer ? 45 : 35;
        const now = new Date();
        const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
        const cleanBasketTag = assignTarget?.basket?.basket_tag || '';

        // 1. Sync timer state into local storage for immediate cross-component sync
        try {
            const saved = localStorage.getItem(LOCAL_TIMERS_KEY);
            const timers = saved ? JSON.parse(saved) : {};

            // If moving from another drum, clear previous assignment
            Object.keys(timers).forEach((k) => {
                if (timers[k]?.basket_tag?.toUpperCase() === cleanBasketTag.toUpperCase()) {
                    delete timers[k];
                }
            });

            timers[machineId.toUpperCase()] = {
                basket_tag: cleanBasketTag,
                started_at: now.toISOString(),
                ends_at: endsAt.toISOString(),
                status: 'running',
                type: isDryer ? 'dryer' : 'washer',
                duration_minutes: durationMinutes,
            };

            localStorage.setItem(LOCAL_TIMERS_KEY, JSON.stringify(timers));
        } catch {
            // Ignored
        }

        setAssignTarget(null);
        window.dispatchEvent(new CustomEvent('rinset:timers-updated'));
        window.dispatchEvent(new CustomEvent('rinset:order-updated'));
        refreshOrders();
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            <Navbar storeName={storeName} />

            <MachineStatusOverview baskets={baskets} />

            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row justify-between items-center gap-3 flex-shrink-0">
                <div className="flex w-full sm:w-80 gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search basket, ticket #, shelf location..."
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
            Active Baskets: <strong className="text-white">{baskets.filter((b) => b.status !== 'claimed').length}</strong>
          </span>
                    <span>
            Ready for Pickup: <strong className="text-emerald-400">{baskets.filter((b) => b.status === 'ready_for_pickup').length}</strong>
          </span>
                </div>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 overflow-x-auto p-4 flex space-x-4">
                {LANES.map((lane) => (
                    <KanbanColumn
                        key={lane.key}
                        statusKey={lane.key}
                        label={lane.label}
                        icon={lane.icon}
                        colorClass={lane.color}
                        baskets={filteredBaskets.filter((b) => b.status === lane.key)}
                        onAdvance={updateBasketStatus}
                        onRequestAssign={(basket, targetStatus) =>
                            setAssignTarget({ basket, targetStatus })
                        }
                        onRequestStorage={(basket) => setStorageTarget(basket)}
                        onSettle={(order) => setOrderToSettle(order)}
                    />
                ))}
            </div>

            {/* App Footer */}
            <footer className="py-5 pb-24 lg:pb-6 text-center border-t border-slate-800/80 mt-auto select-none bg-slate-950 flex-shrink-0">
                <p className="text-xs text-slate-400 font-mono tracking-wider">
                    Rinset 2026 by tijnara
                </p>
            </footer>

            {/* Machine Drum Selection Modal */}
            <AssignMachineModal
                basket={assignTarget?.basket || null}
                targetStatus={assignTarget?.targetStatus || null}
                activeBaskets={baskets}
                isOpen={Boolean(assignTarget)}
                onClose={() => setAssignTarget(null)}
                onConfirm={handleAssignMachineAndStartTimer}
            />

            {/* Storage Shelf / Cubby Modal */}
            <AssignStorageModal
                basket={storageTarget}
                isOpen={Boolean(storageTarget)}
                onClose={() => setStorageTarget(null)}
                onConfirm={handleConfirmStorage}
            />

            <SettleClaimModal
                order={orderToSettle}
                onClose={() => setOrderToSettle(null)}
                onSuccess={() => {
                    refreshOrders();
                }}
            />

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