'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Payment, Order } from '@/types/database';

export interface AuditMetrics {
    dateString: string;
    totalOrders: number;
    totalWeightKg: number;
    grossSales: number;
    cashCollected: number;
    gcashCollected: number;
    uncollectedReceivables: number;
    orders: Order[];
    payments: Payment[];
}

export function useDailyAudit() {
    // Start with empty strings to avoid evaluating new Date() during SSR prerendering
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [storeName, setStoreName] = useState<string>('Rinset Laundry');
    const [metrics, setMetrics] = useState<AuditMetrics>({
        dateString: '',
        totalOrders: 0,
        totalWeightKg: 0,
        grossSales: 0,
        cashCollected: 0,
        gcashCollected: 0,
        uncollectedReceivables: 0,
        orders: [],
        payments: [],
    });
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchAuditData = useCallback(async (dateStr: string) => {
        if (!dateStr) return;
        setIsLoading(true);
        const supabase = createClient();

        // Align date filters strictly to Asia/Manila UTC+8
        const startOfDay = new Date(`${dateStr}T00:00:00+08:00`).toISOString();
        const endOfDay = new Date(`${dateStr}T23:59:59.999+08:00`).toISOString();

        const { data: store } = await supabase.from('stores').select('name').limit(1).single();
        if (store) setStoreName(store.name);

        // 1. Fetch payments made during this Manila calendar day
        const { data: paymentsData } = await supabase
            .from('payments')
            .select('*')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        const payments = (paymentsData as Payment[]) || [];

        const cashCollected = payments
            .filter((p) => p.payment_method === 'cash')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const gcashCollected = payments
            .filter((p) => p.payment_method === 'gcash')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // 2. Fetch orders registered during this Manila calendar day
        const { data: ordersData } = await supabase
            .from('orders')
            .select('*, customer:customers(*)')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        const orders = (ordersData as Order[]) || [];

        const totalOrders = orders.length;
        const totalWeightKg = orders.reduce((sum, o) => sum + Number(o.total_weight_kg || 0), 0);
        const grossSales = orders.reduce((sum, o) => sum + Number(o.net_payable || 0), 0);

        // 3. Uncollected Utang (Orders from today that remain unpaid)
        const uncollectedReceivables = orders
            .filter((o) => o.payment_status !== 'paid')
            .reduce((sum, o) => sum + Number(o.net_payable - (o.total_paid || 0)), 0);

        setMetrics({
            dateString: dateStr,
            totalOrders,
            totalWeightKg: Math.round(totalWeightKg * 100) / 100,
            grossSales: Math.round(grossSales * 100) / 100,
            cashCollected: Math.round(cashCollected * 100) / 100,
            gcashCollected: Math.round(gcashCollected * 100) / 100,
            uncollectedReceivables: Math.round(uncollectedReceivables * 100) / 100,
            orders,
            payments,
        });

        setIsLoading(false);
    }, []);

    // Defer evaluating Manila today's date until client-side mount
    useEffect(() => {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
        setSelectedDate(today);
    }, []);

    // Fetch data whenever selectedDate is populated or changed
    useEffect(() => {
        if (selectedDate) {
            fetchAuditData(selectedDate);
        }
    }, [selectedDate, fetchAuditData]);

    return {
        selectedDate,
        setSelectedDate,
        metrics,
        storeName,
        isLoading,
        refreshAudit: () => fetchAuditData(selectedDate),
    };
}