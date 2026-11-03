'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CatalogItem } from '@/types/database';

export function useCatalog() {
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [storeName, setStoreName] = useState<string>('Rinset Laundry - Dagupan');
    const [storeId, setStoreId] = useState<string>('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        async function loadCatalog() {
            setIsLoading(true);
            const supabase = createClient();

            const { data: store } = await supabase.from('stores').select('*').limit(1).single();
            if (store) {
                setStoreName(store.name);
                setStoreId(store.id);
            }

            const { data: items } = await supabase
                .from('catalog_items')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (items) setCatalog(items as CatalogItem[]);
            setIsLoading(false);
        }
        loadCatalog();
    }, []);

    const categories = ['All', ...Array.from(new Set(catalog.map((i) => i.category)))];

    const filteredCatalog =
        selectedCategory === 'All'
            ? catalog
            : catalog.filter((i) => i.category === selectedCategory);

    return {
        catalog: filteredCatalog,
        categories,
        selectedCategory,
        setSelectedCategory,
        storeName,
        storeId,
        isLoading,
    };
}