'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OrderBasket, OrderStatus } from '@/types/database';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function useLiveOrders() {
    const authStoreId = useAuthStore((state) => state.storeId);
    const authStoreName = useAuthStore((state) => state.storeName);
    const setStore = useAuthStore((state) => state.setStore);

    const [baskets, setBaskets] = useState<OrderBasket[]>([]);
    const [storeName, setStoreName] = useState<string>(authStoreName || 'Rinset Laundry');
    const [storeId, setStoreId] = useState<string | null>(authStoreId);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchBaskets = useCallback(async () => {
        setIsLoading(true);
        const supabase = createClient();
        let currentStoreId = authStoreId;
        let currentStoreName = authStoreName;

        // 1. Resolve store from auth membership if not yet hydrated in Zustand
        if (!currentStoreId) {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const { data: member } = await supabase
                    .from('store_members')
                    .select('store_id, store:stores(id, name, branch_code)')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .limit(1)
                    .maybeSingle();

                if (member) {
                    currentStoreId = member.store_id;
                    const storeData: any = Array.isArray(member.store) ? member.store[0] : member.store;
                    currentStoreName = storeData?.name || 'Rinset Laundry';
                }
            }

            // 2. Fallback to first available active store
            if (!currentStoreId) {
                const { data: fallbackStore } = await supabase
                    .from('stores')
                    .select('id, name')
                    .limit(1)
                    .maybeSingle();

                if (fallbackStore) {
                    currentStoreId = fallbackStore.id;
                    currentStoreName = fallbackStore.name;
                }
            }

            if (currentStoreId && currentStoreName) {
                setStore(currentStoreId, currentStoreName);
            }
        }

        if (currentStoreId) {
            setStoreId(currentStoreId);
            setStoreName(currentStoreName || 'Rinset Laundry');

            // 3. Fetch baskets strictly scoped to the active store_id
            const { data, error } = await supabase
                .from('order_baskets')
                .select('*, order:orders(*, customer:customers(*))')
                .eq('store_id', currentStoreId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setBaskets(data as OrderBasket[]);
            }
        }

        setIsLoading(false);
    }, [authStoreId, authStoreName, setStore]);

    useEffect(() => {
        fetchBaskets();

        const activeStoreId = authStoreId || storeId;
        if (!activeStoreId) return;

        const supabase = createClient();

        // Store-isolated Realtime channel
        const channel = supabase
            .channel(`realtime_order_baskets_${activeStoreId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'order_baskets',
                    filter: `store_id=eq.${activeStoreId}`,
                },
                () => {
                    fetchBaskets();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchBaskets, authStoreId, storeId]);

    const updateBasketStatus = async (
        basketId: string,
        orderId: string,
        nextStatus: OrderStatus,
        machineSlot?: string | null
    ) => {
        const activeStoreId = storeId || authStoreId;
        if (!activeStoreId) return;

        const supabase = createClient();

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

        // 2. Update order_baskets record scoped by store_id
        await supabase
            .from('order_baskets')
            .update(updatePayload)
            .eq('id', basketId)
            .eq('store_id', activeStoreId);

        // 3. Sync parent order status based on sibling baskets
        const { data: siblingBaskets } = await supabase
            .from('order_baskets')
            .select('status')
            .eq('order_id', orderId)
            .eq('store_id', activeStoreId);

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

            await supabase
                .from('orders')
                .update({
                    status: computedOrderStatus,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', orderId)
                .eq('store_id', activeStoreId);
        }

        fetchBaskets();
    };

    return {
        baskets,
        storeName,
        storeId,
        isLoading,
        updateBasketStatus,
        refreshOrders: fetchBaskets,
    };
}