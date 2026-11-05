'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export interface ExpenseRecord {
    id: string;
    store_id: string;
    category: string;
    description: string;
    amount: number;
    recorded_by: string;
    created_at: string;
}

export interface AuditMetrics {
    totalOrdersCount: number;
    orderCount: number;
    activeOrdersCount: number;
    claimedOrdersCount: number;
    totalSales: number;
    totalGrossSales: number;
    cashSales: number;
    gcashSales: number;
    pettyCashOut: number;
    totalExpenses: number;
    expectedCashInDrawer: number;
    netCashInDrawer: number;
    unpaidBalance: number;
    unpaidReceivables: number;
    expenses: ExpenseRecord[];
    orders: any[];
}

const DEFAULT_METRICS: AuditMetrics = {
    totalOrdersCount: 0,
    orderCount: 0,
    activeOrdersCount: 0,
    claimedOrdersCount: 0,
    totalSales: 0,
    totalGrossSales: 0,
    cashSales: 0,
    gcashSales: 0,
    pettyCashOut: 0,
    totalExpenses: 0,
    expectedCashInDrawer: 0,
    netCashInDrawer: 0,
    unpaidBalance: 0,
    unpaidReceivables: 0,
    expenses: [],
    orders: [],
};

export function useAudit(customDate?: string) {
    const storeId = useAuthStore((state) => state.storeId);
    const storeName = useAuthStore((state) => state.storeName);

    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<AuditMetrics>(DEFAULT_METRICS);
    const [manilaDateStr, setManilaDateStr] = useState<string>(customDate || '');
    const [loading, setLoading] = useState(true);

    const computeManilaBounds = useCallback((targetDateStr?: string) => {
        const manilaDate =
            targetDateStr ||
            new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

        const startISO = new Date(`${manilaDate}T00:00:00+08:00`).toISOString();
        const endISO = new Date(`${manilaDate}T23:59:59.999+08:00`).toISOString();

        return { manilaDate, startISO, endISO };
    }, []);

    const loadAuditData = useCallback(async () => {
        // Only fetch if a valid storeId is actively loaded
        if (!storeId || storeId.length < 20) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const supabase = createClient();
        const { manilaDate, startISO, endISO } = computeManilaBounds(customDate);
        setManilaDateStr(manilaDate);

        // 1. Fetch expenses for target shift
        const { data: expenseData, error: expenseError } = await supabase
            .from('expenses')
            .select('*')
            .eq('store_id', storeId)
            .gte('created_at', startISO)
            .lte('created_at', endISO)
            .order('created_at', { ascending: false });

        if (expenseError) {
            console.warn('[useAudit] Expenses query error:', expenseError.message);
        }

        const currentExpenses = (expenseData as ExpenseRecord[]) || [];
        setExpenses(currentExpenses);

        // 2. Fetch orders using select('*') to prevent 400 on missing cherry-picked columns
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('store_id', storeId)
            .gte('created_at', startISO)
            .lte('created_at', endISO);

        if (orderError) {
            console.error('[useAudit] Orders query error:', orderError.message, orderError.details);
        }

        const currentOrders = orderData || [];
        setOrders(currentOrders);

        let cashSales = 0;
        let gcashSales = 0;
        let unpaidReceivables = 0;
        let claimedCount = 0;
        let activeCount = 0;

        currentOrders.forEach((ord: any) => {
            // Support common column names dynamically
            const amt = Number(ord.net_payable ?? ord.total_amount ?? ord.total_price ?? ord.total ?? 0);
            const paymentStatus = ord.payment_status ?? (ord.is_paid ? 'paid' : 'unpaid');
            const paymentMethod = (ord.payment_method ?? ord.payment_mode ?? 'cash').toLowerCase();

            if (paymentStatus === 'paid') {
                if (paymentMethod === 'cash') cashSales += amt;
                else gcashSales += amt;
            } else {
                unpaidReceivables += amt;
            }

            if (ord.status === 'claimed') claimedCount++;
            else activeCount++;
        });

        const totalGrossSales = cashSales + gcashSales;
        const totalExpenses = currentExpenses.reduce(
            (acc, curr) => acc + Number(curr.amount || 0),
            0
        );
        const netCashInDrawer = cashSales - totalExpenses;

        const computedMetrics: AuditMetrics = {
            totalOrdersCount: currentOrders.length,
            orderCount: currentOrders.length,
            activeOrdersCount: activeCount,
            claimedOrdersCount: claimedCount,
            totalSales: totalGrossSales,
            totalGrossSales,
            cashSales,
            gcashSales,
            pettyCashOut: totalExpenses,
            totalExpenses,
            expectedCashInDrawer: netCashInDrawer,
            netCashInDrawer,
            unpaidBalance: unpaidReceivables,
            unpaidReceivables,
            expenses: currentExpenses,
            orders: currentOrders,
        };

        setMetrics(computedMetrics);
        setLoading(false);
    }, [storeId, customDate, computeManilaBounds]);

    const logExpense = async (expense: {
        category: string;
        description: string;
        amount: number;
        recordedBy?: string;
    }) => {
        const activeStoreId = storeId || useAuthStore.getState().storeId;
        if (!activeStoreId) throw new Error('Active store ID required to log expense.');

        const supabase = createClient();
        const { error } = await supabase.from('expenses').insert({
            store_id: activeStoreId,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            recorded_by: expense.recordedBy || 'Shift Cashier',
        });

        if (error) throw error;
        await loadAuditData();
        return true;
    };

    useEffect(() => {
        if (!customDate) {
            const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
            setManilaDateStr(today);
        }
        loadAuditData();
    }, [loadAuditData, customDate]);

    return {
        metrics,
        summary: metrics,
        expenses,
        orders,
        manilaDateStr,
        storeName,
        storeId,
        loading,
        isLoading: loading,
        logExpense,
        saveExpense: logExpense,
        refreshAudit: loadAuditData,
    };
}