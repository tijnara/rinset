'use client';

import { ComponentType } from 'react';
import { OrderBasket, Order, OrderStatus } from '@/types/database';
import { OrderCard } from './OrderCard';

interface KanbanColumnProps {
    statusKey: OrderStatus;
    label: string;
    icon: ComponentType<{ className?: string }>;
    colorClass: string;
    baskets: OrderBasket[];
    onAdvance: (basketId: string, orderId: string, nextStatus: OrderStatus, machineSlot?: string | null) => void;
    onRequestAssign: (basket: OrderBasket, targetStatus: OrderStatus) => void;
    onRequestStorage: (basket: OrderBasket) => void;
    onSettle: (order: Order) => void;
}

export function KanbanColumn({
                                 statusKey,
                                 label,
                                 icon: Icon,
                                 colorClass,
                                 baskets,
                                 onAdvance,
                                 onRequestAssign,
                                 onRequestStorage,
                                 onSettle,
                             }: KanbanColumnProps) {
    return (
        <div className="w-80 flex-shrink-0 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col max-h-[calc(100vh-12rem)] select-none">
            <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 rounded-t-2xl">
                <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${colorClass}`} />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            {label}
          </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono font-bold text-slate-400">
          {baskets.length}
        </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {baskets.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-600">
                        No baskets in this stage
                    </div>
                ) : (
                    baskets.map((basket) => (
                        <OrderCard
                            key={basket.id}
                            basket={basket}
                            onAdvance={onAdvance}
                            onRequestAssign={onRequestAssign}
                            onRequestStorage={onRequestStorage}
                            onSettle={onSettle}
                        />
                    ))
                )}
            </div>
        </div>
    );
}