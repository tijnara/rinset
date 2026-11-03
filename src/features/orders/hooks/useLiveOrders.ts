'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/types/database';

export function useLiveOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [storeName, setStoreName] = useState<string>('Rinset Laundry - Dagupan');

    const supabase = createClient();

    const fetchOrders = useCallback(async () => {
        const { data: store } = await supabase.from('stores').select('name').limit(1).single();
        if (store) setStoreName(store.name);

        const { data } = await supabase
            .from('orders')
            .select('*, customer:customers(*), items:order_items(*)')
            .order('created_at', { ascending: false });

        if (data) setOrders(data as Order[]);
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchOrders();

        // Listen to real-time order status shifts
        const channel = supabase
            .channel('live-orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => {
                    fetchOrders();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchOrders, supabase]);

    const updateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
        const updates: Partial<Order> = { status: nextStatus };
        if (nextStatus === 'ready_for_pickup') updates.ready_at = new Date().toISOString();
        if (nextStatus === 'claimed') updates.claimed_at = new Date().toISOString();

        await supabase.from('orders').update(updates).eq('id', orderId);

        // Optimistic UI update
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
    };

    return {
        orders,
        isLoading,
        storeName,
        updateOrderStatus,
        refreshOrders: fetchOrders,
    };
}