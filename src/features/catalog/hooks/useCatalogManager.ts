'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CatalogItem } from '@/types/database';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function useCatalogManager() {
    const authStoreId = useAuthStore((state) => state.storeId);
    const user = useAuthStore((state) => state.user);

    const [items, setItems] = useState<CatalogItem[]>([]);
    const [storeId, setStoreId] = useState<string>(authStoreId || '');
    const [storeName, setStoreName] = useState<string>('Rinset Laundry');
    const [nameChangeCount, setNameChangeCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const isOwner = user?.role === 'owner';
    const canChangeName = isOwner;
    const isSuperAdmin = false;

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        const supabase = createClient();

        // 1. Fetch store info
        let query = supabase.from('stores').select('id, name, name_change_count');
        if (authStoreId) {
            query = query.eq('id', authStoreId);
        }
        const { data: storeData } = await query.limit(1).maybeSingle();

        if (storeData) {
            setStoreId(storeData.id);
            setStoreName(storeData.name);
            setNameChangeCount(storeData.name_change_count ?? 0);
        }

        // 2. Fetch catalog items
        let itemsQuery = supabase
            .from('catalog_items')
            .select('*')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (storeData?.id) {
            itemsQuery = itemsQuery.eq('store_id', storeData.id);
        }

        const { data: itemsData, error } = await itemsQuery;
        if (!error && itemsData) {
            setItems(itemsData as CatalogItem[]);
        }

        setIsLoading(false);
    }, [authStoreId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const updateStoreName = async (
        newName: string
    ): Promise<{ success: boolean; error?: string }> => {
        const cleanName = newName.trim();
        if (!cleanName) {
            return { success: false, error: 'Business name cannot be empty.' };
        }

        const currentStoreId = storeId || authStoreId;
        const currentUser = useAuthStore.getState().user;

        const supabase = createClient();
        const { data, error } = await supabase.rpc('update_store_business_name', {
            p_store_id: currentStoreId || null,
            p_new_name: cleanName,
            p_user_id: currentUser?.id || 'owner-master',
            p_role: currentUser?.role || 'owner',
        });

        if (error) {
            return { success: false, error: error.message };
        }

        const result = data as { success: boolean; error?: string; name_change_count?: number };

        if (!result.success) {
            return { success: false, error: result.error || 'Failed to update business name.' };
        }

        setStoreName(cleanName);
        if (result.name_change_count !== undefined) {
            setNameChangeCount(result.name_change_count);
        }

        return { success: true };
    };

    const saveItem = async (item: Partial<CatalogItem>) => {
        const activeStoreId = storeId || authStoreId;
        if (!activeStoreId) return { success: false, error: 'No active store ID.' };
        const supabase = createClient();

        if (item.id) {
            const { error } = await supabase
                .from('catalog_items')
                .update({
                    name: item.name,
                    category: item.category,
                    pricing_type: item.pricing_type,
                    unit_price: item.unit_price,
                    minimum_quantity: item.minimum_quantity,
                    is_active: item.is_active,
                })
                .eq('id', item.id)
                .eq('store_id', activeStoreId);

            if (error) return { success: false, error: error.message };
        } else {
            const { error } = await supabase.from('catalog_items').insert({
                store_id: activeStoreId,
                name: item.name,
                category: item.category,
                pricing_type: item.pricing_type,
                unit_price: item.unit_price,
                minimum_quantity: item.minimum_quantity,
                is_active: true,
            });

            if (error) return { success: false, error: error.message };
        }

        await fetchItems();
        return { success: true };
    };

    const deleteItem = async (id: string) => {
        const activeStoreId = storeId || authStoreId;
        if (!activeStoreId) return { success: false };
        const supabase = createClient();
        const { error } = await supabase
            .from('catalog_items')
            .delete()
            .eq('id', id)
            .eq('store_id', activeStoreId);

        if (!error) {
            setItems((prev) => prev.filter((i) => i.id !== id));
            return { success: true };
        }
        return { success: false, error: error.message };
    };

    const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
        const activeStoreId = storeId || authStoreId;
        if (!activeStoreId) return;
        const supabase = createClient();
        const nextStatus = !currentStatus;

        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, is_active: nextStatus } : i))
        );

        await supabase
            .from('catalog_items')
            .update({ is_active: nextStatus })
            .eq('id', id)
            .eq('store_id', activeStoreId);
    };

    return {
        items,
        storeName,
        storeId,
        nameChangeCount,
        canChangeName,
        isSuperAdmin,
        isOwner,
        isLoading,
        updateStoreName,
        saveItem,
        deleteItem,
        toggleActiveStatus,
        refreshItems: fetchItems,
        refreshCatalog: fetchItems,
    };
}