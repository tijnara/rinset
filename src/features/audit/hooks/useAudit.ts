'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { StoreExpense, ExpenseCategory } from '@/types/database';

export interface DailyAuditMetrics {
    totalOrdersCount: number;
    grossSales: number;
    cashSales: number;
    gcashSales: number;
    totalExpenses: number;
    expectedCashInDrawer: number;
    expenses: StoreExpense[];
}

export function useAudit() {
    const [storeId, setStoreId] = useState<string>('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    const [storeName, setStoreName] = useState<string>('Rinset Laundry');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [actualCashCounted, setActualCashCounted] = useState<number>(0);

    const [metrics, setMetrics] = useState<DailyAuditMetrics>({
        totalOrdersCount: 0,
        grossSales: 0,
        cashSales: 0,
        gcashSales: 0,
        totalExpenses: 0,
        expectedCashInDrawer: 0,
        expenses: [],
    });

    const supabase = createClient();

    const fetchDailyAudit = useCallback(async () => {
        setIsLoading(true);

        const { data: store } = await supabase.from('stores').select('id, name').limit(1).single();
        if (store) {
            setStoreId(store.id);
            setStoreName(store.name);
        }

        // Set Manila Day Boundaries (+08:00)
        const now = new Date();
        const manilaDateString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
        const startOfDay = new Date(`${manilaDateString}T00:00:00+08:00`).toISOString();
        const endOfDay = new Date(`${manilaDateString}T23:59:59.999+08:00`).toISOString();

        // 1. Fetch Today's Payments
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        // 2. Fetch Today's Store Expenses
        const { data: expenses } = await supabase
            .from('store_expenses')
            .select('*')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: false });

        // 3. Fetch Today's Orders count
        const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        const cashSales = (payments || [])
            .filter((p) => p.payment_method === 'cash')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const gcashSales = (payments || [])
            .filter((p) => p.payment_method === 'gcash')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const totalExpenses = (expenses || []).reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0
        );

        const expectedCashInDrawer = Math.max(0, cashSales - totalExpenses);

        setMetrics({
            totalOrdersCount: ordersCount || 0,
            grossSales: cashSales + gcashSales,
            cashSales,
            gcashSales,
            totalExpenses,
            expectedCashInDrawer,
            expenses: (expenses as StoreExpense[]) || [],
        });

        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchDailyAudit();
    }, [fetchDailyAudit]);

    const logExpense = async (expense: {
        amount: number;
        category: ExpenseCategory;
        description: string;
    }): Promise<boolean> => {
        const { error } = await supabase.from('store_expenses').insert({
            store_id: storeId,
            amount: expense.amount,
            category: expense.category,
            description: expense.description,
            recorded_by: 'Shift Cashier',
        });

        if (error) {
            console.error('Error logging expense:', error);
            return false;
        }

        await fetchDailyAudit();
        return true;
    };

    const cashDiscrepancy = actualCashCounted - metrics.expectedCashInDrawer;

    return {
        metrics,
        storeId,
        storeName,
        isLoading,
        actualCashCounted,
        setActualCashCounted,
        cashDiscrepancy,
        logExpense,
        refreshAudit: fetchDailyAudit,
    };
}