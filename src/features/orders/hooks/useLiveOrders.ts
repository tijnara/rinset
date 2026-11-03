'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OrderBasket, OrderStatus } from '@/types/database';

export function useLiveOrders() {
    const [baskets, setBaskets] = useState<OrderBasket[]>([]);
    const [storeName, setStoreName] = useState<string>('Rinset Laundry');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const supabase = createClient();

    const fetchBaskets = useCallback(async () => {
        setIsLoading(true);

        const { data: store } = await supabase.from('stores').select('name').limit(1).single();
        if (store) setStoreName(store.name);

        // Fetch baskets joined with their parent order and customer info
        const { data, error } = await supabase
            .from('order_baskets')
            .select('*, order:orders(*, customer:customers(*))')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setBaskets(data as OrderBasket[]);
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchBaskets();

        // Subscribe to changes on order_baskets
        const channel = supabase
            .channel('realtime_order_baskets')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_baskets' },
                () => {
                    fetchBaskets();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchBaskets, supabase]);

    const updateBasketStatus = async (
        basketId: string,
        orderId: string,
        nextStatus: OrderStatus,
        machineSlot?: string | null
    ) => {
        const updatePayload: { status: OrderStatus; assigned_machine?: string | null } = {
            status: nextStatus,
        };

        if (nextStatus === 'ready_for_pickup' || nextStatus === 'claimed') {
            updatePayload.assigned_machine = null;
        } else if (machineSlot !== undefined) {
            updatePayload.assigned_machine = machineSlot;
        }

        // 1. Optimistic UI update
        setBaskets((prev) =>
            prev.map((b) => (b.id === basketId ? { ...b, ...updatePayload } : b))
        );

        // 2. Update order_baskets record
        await supabase.from('order_baskets').update(updatePayload).eq('id', basketId);

        // 3. Keep parent order status synced
        const { data: siblingBaskets } = await supabase
            .from('order_baskets')
            .select('status')
            .eq('order_id', orderId);

        if (siblingBaskets && siblingBaskets.length > 0) {
            const allClaimed = siblingBaskets.every((b) => b.status === 'claimed');
            const allReadyOrClaimed = siblingBaskets.every(
                (b) => b.status === 'ready_for_pickup' || b.status === 'claimed'
            );
            const anyWashingOrDrying = siblingBaskets.some(
                (b) => b.status === 'washing' || b.status === 'drying'
            );

            let computedOrderStatus: OrderStatus = 'received';
            if (allClaimed) {
                computedOrderStatus = 'claimed';
            } else if (allReadyOrClaimed) {
                computedOrderStatus = 'ready_for_pickup';
            } else if (anyWashingOrDrying) {
                computedOrderStatus = 'washing';
            }

            await supabase.from('orders').update({ status: computedOrderStatus }).eq('id', orderId);
        }

        fetchBaskets();
    };

    return {
        baskets,
        storeName,
        isLoading,
        updateBasketStatus,
        refreshOrders: fetchBaskets,
    };
}