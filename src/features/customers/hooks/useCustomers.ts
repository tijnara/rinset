'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Customer, Order } from '@/types/database';

export interface CustomerWithMetrics extends Customer {
    totalVisits: number;
    totalWeightKg: number;
    totalSpent: number;
    unpaidBalance: number;
    recentOrders: Order[];
}

export function useCustomers() {
    const [customers, setCustomers] = useState<CustomerWithMetrics[]>([]);
    const [storeId, setStoreId] = useState<string>('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    const [storeName, setStoreName] = useState<string>('Rinset Laundry');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const supabase = createClient();

    const fetchCustomers = useCallback(async () => {
        setIsLoading(true);

        const { data: store } = await supabase.from('stores').select('id, name').limit(1).single();
        if (store) {
            setStoreName(store.name);
            setStoreId(store.id);
        }

        const { data: customersData, error } = await supabase
            .from('customers')
            .select('*, orders(*)')
            .order('created_at', { ascending: false });

        if (error || !customersData) {
            setIsLoading(false);
            return;
        }

        const formatted: CustomerWithMetrics[] = customersData.map((cust) => {
            const orders = (cust.orders as Order[]) || [];
            const totalVisits = orders.length;
            const totalWeightKg = orders.reduce((sum, o) => sum + Number(o.total_weight_kg || 0), 0);
            const totalSpent = orders
                .filter((o) => o.payment_status === 'paid')
                .reduce((sum, o) => sum + Number(o.net_payable || 0), 0);
            const unpaidBalance = orders
                .filter((o) => o.payment_status !== 'paid' && o.status !== 'cancelled')
                .reduce((sum, o) => sum + (Number(o.net_payable) - Number(o.total_paid || 0)), 0);

            const sortedOrders = [...orders].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            return {
                ...cust,
                totalVisits,
                totalWeightKg: Math.round(totalWeightKg * 100) / 100,
                totalSpent: Math.round(totalSpent * 100) / 100,
                unpaidBalance: Math.round(unpaidBalance * 100) / 100,
                recentOrders: sortedOrders,
            };
        });

        setCustomers(formatted);
        setIsLoading(false);
    }, [supabase]);

    const createCustomer = async (fullName: string, mobileNumber?: string): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase.from('customers').insert({
            store_id: storeId,
            full_name: fullName.trim(),
            mobile_number: mobileNumber?.trim() || null,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        await fetchCustomers();
        return { success: true };
    };

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    return {
        customers,
        storeName,
        isLoading,
        createCustomer,
        refreshCustomers: fetchCustomers,
    };
}