'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CatalogItem } from '@/types/database';

export function useCatalogManager() {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [storeId, setStoreId] = useState<string>('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    const [storeName, setStoreName] = useState<string>('Rinset Laundry');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const supabase = createClient();

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        const { data: store } = await supabase.from('stores').select('*').limit(1).single();
        if (store) {
            setStoreId(store.id);
            setStoreName(store.name);
        }

        const { data } = await supabase
            .from('catalog_items')
            .select('*')
            .order('category', { ascending: false });

        if (data) setItems(data as CatalogItem[]);
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const updateStoreName = async (newName: string) => {
        const cleanName = newName.trim();
        if (!cleanName) {
            return { success: false, error: 'Business name cannot be empty.' };
        }

        try {
            const { error } = await supabase
                .from('stores')
                .update({ name: cleanName })
                .eq('id', storeId);

            if (error) {
                return { success: false, error: error.message };
            }

            setStoreName(cleanName);
            return { success: true };
        } catch (err: unknown) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Failed to update business name.',
            };
        }
    };

    const saveItem = async (item: Partial<CatalogItem>) => {
        if (item.id) {
            await supabase.from('catalog_items').update(item).eq('id', item.id);
        } else {
            await supabase.from('catalog_items').insert({
                ...item,
                store_id: storeId,
            });
        }
        fetchItems();
    };

    const deleteItem = async (id: string) => {
        await supabase.from('catalog_items').delete().eq('id', id);
        fetchItems();
    };

    const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
        await supabase.from('catalog_items').update({ is_active: !currentStatus }).eq('id', id);
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, is_active: !currentStatus } : i))
        );
    };

    return {
        items,
        storeName,
        storeId,
        isLoading,
        updateStoreName,
        saveItem,
        deleteItem,
        toggleActiveStatus,
        refreshItems: fetchItems,
    };
}