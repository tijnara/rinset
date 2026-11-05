'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CatalogItem } from '@/types/database';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function useCatalog() {
    const authStoreId = useAuthStore((state) => state.storeId);
    const authStoreName = useAuthStore((state) => state.storeName);
    const setStore = useAuthStore((state) => state.setStore);

    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [storeName, setStoreName] = useState<string>(authStoreName || 'Rinset Laundry');
    const [storeId, setStoreId] = useState<string | null>(authStoreId);
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const loadCatalog = useCallback(async () => {
        setIsLoading(true);
        const supabase = createClient();
        let currentStoreId = authStoreId;
        let currentStoreName = authStoreName;

        // 1. If not yet set in Zustand, resolve active store from user's store membership
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

            // 2. Fallback to first active store in database if unassigned
            if (!currentStoreId) {
                const { data: fallbackStore } = await supabase
                    .from('stores')
                    .select('id, name, branch_code')
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

        // 3. Query catalog items strictly isolated by store_id
        if (currentStoreId) {
            setStoreId(currentStoreId);
            setStoreName(currentStoreName || 'Rinset Laundry');

            const { data: items, error } = await supabase
                .from('catalog_items')
                .select('*')
                .eq('store_id', currentStoreId)
                .eq('is_active', true)
                .order('name');

            if (!error && items) {
                setCatalog(items as CatalogItem[]);
            }
        }

        setIsLoading(false);
    }, [authStoreId, authStoreName, setStore]);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    // Derive distinct uppercase categories
    const categories = [
        'ALL',
        ...Array.from(new Set(catalog.map((i) => i.category.toUpperCase()))),
    ];

    // Case-insensitive filtering
    const filteredCatalog =
        selectedCategory.toUpperCase() === 'ALL'
            ? catalog
            : catalog.filter(
                (i) => i.category.toUpperCase() === selectedCategory.toUpperCase()
            );

    return {
        catalog: filteredCatalog,
        rawCatalog: catalog,
        categories,
        selectedCategory,
        setSelectedCategory,
        storeName,
        storeId,
        isLoading,
        refreshCatalog: loadCatalog,
    };
}