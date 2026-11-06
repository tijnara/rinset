'use client';

import { useState, ComponentType, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OrderBasket, Order, OrderStatus } from '@/types/database';
import { useLiveOrders } from '@/features/orders/hooks/useLiveOrders';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
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
    Sun,
    SunMedium,
    X,
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
const DONE_TAGS_KEY = 'rinset_done_tags';
const GLARE_MODE_KEY = 'rinset_glare_mode';

export function LiveBoardView() {
    const storeId = useAuthStore((state) => state.storeId);
    const authStoreName = useAuthStore((state) => state.storeName);
    const user = useAuthStore((state) => state.user);
    const rawRole = useAuthStore((state) => (state as any).role || state.user?.role);
    const isUnlocked = useAuthStore((state) => (state as any).isUnlocked);

    // OWNER VERIFICATION: Strictly 'owner' or unlocked PIN session
    const isOwner =
        (rawRole as string) === 'owner' ||
        ((user as any)?.role as string) === 'owner' ||
        Boolean(isUnlocked);

    const { baskets, storeName: hookStoreName, updateBasketStatus, refreshOrders } = useLiveOrders();

    const storeName = authStoreName || hookStoreName || 'Rinset Laundry';

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [orderToSettle, setOrderToSettle] = useState<Order | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
    const [isGlareMode, setIsGlareMode] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(GLARE_MODE_KEY);
                if (saved) setIsGlareMode(saved === 'true');
            } catch {}
        }
    }, []);

    const toggleGlareMode = () => {
        setIsGlareMode((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem(GLARE_MODE_KEY, String(next));
            }
            return next;
        });
    };

    const handleBarcodeGunScan = useCallback(
        (code: string) => {
            const clean = code.trim().toUpperCase();
            setSearchQuery(clean);

            const match = baskets.find(
                (b) =>
                    (b.basket_tag?.toUpperCase() === clean || b.order?.order_number?.toUpperCase() === clean) &&
                    b.status === 'ready_for_pickup' &&
                    b.order &&
                    b.order.payment_status !== 'paid'
            );

            if (match?.order) {
                setOrderToSettle(match.order);
            }
        },
        [baskets]
    );

    useBarcodeScanner({
        onScan: handleBarcodeGunScan,
        enabled: true,
    });

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

    // Fold & Store: Auto-clears dryer timers when laundry moves to shelf/rack
    const handleConfirmStorage = async (location: string) => {
        if (!storageTarget) return;
        const supabase = createClient();
        const cleanTag = String(storageTarget.basket_tag || '').toUpperCase();

        // Immediately remove active drum timer and completion badge for this basket
        if (typeof window !== 'undefined') {
            try {
                const savedTimers = localStorage.getItem(LOCAL_TIMERS_KEY);
                if (savedTimers) {
                    const timers = JSON.parse(savedTimers);
                    let changed = false;
                    Object.keys(timers).forEach((drum) => {
                        if (timers[drum]?.basket_tag?.toUpperCase() === cleanTag) {
                            delete timers[drum];
                            changed = true;
                        }
                    });
                    if (changed) localStorage.setItem(LOCAL_TIMERS_KEY, JSON.stringify(timers));
                }

                const savedDone = localStorage.getItem(DONE_TAGS_KEY);
                if (savedDone) {
                    const doneTags = JSON.parse(savedDone);
                    if (doneTags[cleanTag]) {
                        delete doneTags[cleanTag];
                        localStorage.setItem(DONE_TAGS_KEY, JSON.stringify(doneTags));
                    }
                }
            } catch {}
        }

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
        window.dispatchEvent(new CustomEvent('rinset:timers-updated'));
        window.dispatchEvent(new CustomEvent('rinset:order-updated'));
        refreshOrders();
    };

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

        try {
            const saved = localStorage.getItem(LOCAL_TIMERS_KEY);
            const timers = saved ? JSON.parse(saved) : {};

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
        } catch {}

        setAssignTarget(null);
        window.dispatchEvent(new CustomEvent('rinset:timers-updated'));
        window.dispatchEvent(new CustomEvent('rinset:order-updated'));
        refreshOrders();
    };

    return (
        <div
            className={`min-h-screen text-slate-100 flex flex-col font-sans select-none transition-colors duration-200 ${
                isGlareMode ? 'bg-black' : 'bg-slate-950'
            }`}
        >
            <Navbar storeName={storeName} />

            {/* MACHINE STATUS OVERVIEW STRIP: RESTRICTED TO OWNER ONLY */}
            {isOwner && (
                <MachineStatusOverview baskets={baskets} isGlareMode={isGlareMode} />
            )}

            {/* Control Strip */}
            <div
                className={`p-3 sm:p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-3 flex-shrink-0 transition-colors ${
                    isGlareMode
                        ? 'bg-black border-slate-700'
                        : 'bg-slate-900/60 border-slate-800'
                }`}
            >
                <div className="flex w-full sm:w-96 gap-2">
                    {/* SEARCH BAR WITH UNCLIPPED ICON PADDING */}
                    <div className="relative flex-1 flex items-center">
                        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search / Scan barcode gun..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full min-h-[48px] h-12 rounded-2xl pl-11 pr-10 text-xs sm:text-sm font-semibold text-white placeholder-slate-500 focus:outline-none transition ${
                                isGlareMode
                                    ? 'bg-slate-900 border-2 border-slate-700 focus:border-sky-400'
                                    : 'bg-slate-900/90 border border-slate-800 focus:border-sky-500'
                            }`}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 w-5 h-5 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="min-h-[48px] h-12 px-4 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 active:scale-95 text-slate-950 rounded-2xl flex items-center justify-center transition shadow-md"
                        title="Scan Basket QR Code via Tablet Camera"
                    >
                        <Camera className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    <button
                        type="button"
                        onClick={toggleGlareMode}
                        className={`min-h-[48px] h-12 px-3.5 rounded-2xl border flex items-center justify-center transition active:scale-95 ${
                            isGlareMode
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-lg'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Toggle Tropical Sunlight Glare Mode"
                    >
                        {isGlareMode ? <Sun className="w-5 h-5 fill-current" /> : <SunMedium className="w-5 h-5" />}
                    </button>
                </div>

                <div className="text-xs text-slate-300 flex items-center space-x-4 font-mono font-bold">
          <span>
            Active: <strong className="text-white text-sm">{baskets.filter((b) => b.status !== 'claimed').length}</strong>
          </span>
                    <span>
            Ready for Pickup: <strong className="text-emerald-400 text-sm">{baskets.filter((b) => b.status === 'ready_for_pickup').length}</strong>
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

            <footer
                className={`py-5 pb-24 lg:pb-6 text-center border-t mt-auto select-none flex-shrink-0 transition-colors ${
                    isGlareMode ? 'bg-black border-slate-800' : 'bg-slate-950 border-slate-800/80'
                }`}
            >
                <p className="text-xs text-slate-500 font-mono tracking-wider">
                    Rinset 2026 by tijnara
                </p>
            </footer>

            <AssignMachineModal
                basket={assignTarget?.basket || null}
                targetStatus={assignTarget?.targetStatus || null}
                activeBaskets={baskets}
                isOpen={Boolean(assignTarget)}
                onClose={() => setAssignTarget(null)}
                onConfirm={handleAssignMachineAndStartTimer}
            />

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