import { create } from 'zustand';
import { CatalogItem } from '@/types/database';
import {
    CartItem,
    calculateOrderTotal,
    OrderBreakdown,
    OrderModifier,
} from '@/lib/calculations';

interface CartState {
    customerName: string;
    customerMobile: string;
    basketTag: string;
    items: CartItem[];
    modifier: OrderModifier;
    notes: string;

    // Actions
    setCustomer: (name: string, mobile: string) => void;
    setBasketTag: (tag: string) => void;
    setNotes: (notes: string) => void;
    addItem: (catalogItem: CatalogItem, quantity?: number) => void;
    updateQuantity: (id: string, delta: number) => void;
    setItemQuantity: (id: string, quantity: number) => void;
    removeItem: (id: string) => void;
    setModifier: (modifier: Partial<OrderModifier>) => void;
    clearCart: () => void;

    // Computed
    getBreakdown: () => OrderBreakdown;
}

export const useCartStore = create<CartState>((set, get) => ({
    customerName: '',
    customerMobile: '',
    basketTag: `B-${Math.floor(100 + Math.random() * 900)}`, // Default random basket tag e.g. B-482
    items: [],
    modifier: {},
    notes: '',

    setCustomer: (customerName, customerMobile) => set({ customerName, customerMobile }),
    setBasketTag: (basketTag) => set({ basketTag }),
    setNotes: (notes) => set({ notes }),

    addItem: (catalogItem: CatalogItem, quantity = 1) => {
        set((state) => {
            const existingIndex = state.items.findIndex((i) => i.id === catalogItem.id);

            if (existingIndex > -1) {
                // If already in cart, increment quantity
                const updated = [...state.items];
                updated[existingIndex].quantity += quantity;
                return { items: updated };
            }

            const newItem: CartItem = {
                id: catalogItem.id,
                name: catalogItem.name,
                pricingType: catalogItem.pricing_type,
                unitPrice: catalogItem.unit_price,
                quantity: quantity,
                minimumQuantity: catalogItem.minimum_quantity,
            };

            return { items: [...state.items, newItem] };
        });
    },

    updateQuantity: (id, delta) => {
        set((state) => {
            const updated = state.items
                .map((item) => {
                    if (item.id === id) {
                        const nextQty = Math.max(0, item.quantity + delta);
                        return { ...item, quantity: nextQty };
                    }
                    return item;
                })
                .filter((item) => item.quantity > 0);
            return { items: updated };
        });
    },

    setItemQuantity: (id, quantity) => {
        set((state) => ({
            items: state.items
                .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item))
                .filter((item) => item.quantity > 0),
        }));
    },

    removeItem: (id) => {
        set((state) => ({
            items: state.items.filter((item) => item.id !== id),
        }));
    },

    setModifier: (mod) => {
        set((state) => ({
            modifier: { ...state.modifier, ...mod },
        }));
    },

    clearCart: () =>
        set({
            customerName: '',
            customerMobile: '',
            basketTag: `B-${Math.floor(100 + Math.random() * 900)}`,
            items: [],
            modifier: {},
            notes: '',
        }),

    getBreakdown: () => {
        const { items, modifier } = get();
        return calculateOrderTotal(items, modifier);
    },
}));