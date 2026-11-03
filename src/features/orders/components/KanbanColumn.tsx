'use client';

import { Order, OrderStatus } from '@/types/database';
import { OrderCard } from './OrderCard';
import { LucideIcon } from 'lucide-react';

interface KanbanColumnProps {
    statusKey: OrderStatus;
    label: string;
    icon: LucideIcon;
    colorClass: string;
    orders: Order[];
    onAdvance: (orderId: string, nextStatus: OrderStatus) => void;
}

export function KanbanColumn({
                                 label,
                                 icon: Icon,
                                 colorClass,
                                 orders,
                                 onAdvance,
                             }: KanbanColumnProps) {
    return (
        <div className="w-80 flex-shrink-0 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col max-h-[calc(100vh-8.5rem)]">
            {/* Column Lane Header */}
            <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 rounded-t-2xl">
                <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${colorClass}`} />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            {label}
          </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono font-bold text-slate-400">
          {orders.length}
        </span>
            </div>

            {/* Cards Scrollable Stream */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {orders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-600">
                        No baskets in this stage
                    </div>
                ) : (
                    orders.map((order) => (
                        <OrderCard key={order.id} order={order} onAdvance={onAdvance} />
                    ))
                )}
            </div>
        </div>
    );
}