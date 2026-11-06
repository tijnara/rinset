'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';

export type UserRole = 'cashier' | 'owner' | 'staff';

export interface AuthUser {
    id: string;
    name: string;
    role: UserRole;
}

export interface StoreSessionData {
    userId: string;
    email?: string;
    storeId: string;
    storeName: string;
    branchCode?: string;
    role?: UserRole;
    ownerPin?: string;
}

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
    ownerPin: string;
    storeId: string | null;
    storeName: string;
    branchCode: string;

    // Actions
    setHydrated: () => void;
    setStore: (storeId: string, storeName: string, branchCode?: string) => void;
    initializeSession: (session: StoreSessionData) => void;
    loginWithPin: (pin: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
    verifyOwnerPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
    changeOwnerPin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
    lockToCashier: () => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: { id: 'cashier-default', name: 'Shift Cashier', role: 'cashier' },
            isAuthenticated: true,
            isHydrated: false,
            ownerPin: '0430',
            storeId: null,
            storeName: 'Rinset Laundry',
            branchCode: 'MAIN',

            setHydrated: () => set({ isHydrated: true }),

            setStore: (storeId: string, storeName: string, branchCode = 'MAIN') => {
                set({ storeId, storeName, branchCode });
            },

            initializeSession: (session: StoreSessionData) => {
                // Always open session into Cashier mode upon login
                set({
                    user: {
                        id: session.userId,
                        name: 'Shift Cashier',
                        role: 'cashier',
                    },
                    storeId: session.storeId,
                    storeName: session.storeName,
                    branchCode: session.branchCode ?? 'MAIN',
                    ownerPin: session.ownerPin || get().ownerPin || '0430',
                    isAuthenticated: true,
                });
            },

            loginWithPin: async (pin: string) => {
                const activeOwnerPin = get().ownerPin || '0430';
                const activeStoreId = get().storeId;

                try {
                    const supabase = createClient();

                    // 1. Check store_members table
                    let query = supabase
                        .from('store_members')
                        .select(`
              id,
              role,
              pin_code,
              store_id,
              user:profiles(id, full_name),
              store:stores(id, name, branch_code)
            `)
                        .eq('pin_code', pin)
                        .eq('is_active', true);

                    if (activeStoreId) {
                        query = query.eq('store_id', activeStoreId);
                    }

                    const { data: member } = await query.limit(1).maybeSingle();

                    if (member) {
                        const role: UserRole = (member.role as UserRole) || 'cashier';
                        const isOwner = role === 'owner';
                        const profileData: any = Array.isArray(member.user) ? member.user[0] : member.user;
                        const storeData: any = Array.isArray(member.store) ? member.store[0] : member.store;

                        const user: AuthUser = {
                            id: member.id,
                            name: profileData?.full_name || (isOwner ? 'Store Owner' : 'Shift Cashier'),
                            role,
                        };

                        set({
                            user,
                            isAuthenticated: true,
                            ...(isOwner ? { ownerPin: pin } : {}),
                            ...(storeData
                                ? {
                                    storeId: storeData.id,
                                    storeName: storeData.name,
                                    branchCode: storeData.branch_code || 'MAIN',
                                }
                                : {}),
                        });

                        return { success: true, role };
                    }

                    // 2. Check profiles table
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, full_name, role, pin_code')
                        .eq('pin_code', pin)
                        .limit(1)
                        .maybeSingle();

                    if (profile) {
                        const role: UserRole = (profile.role as UserRole) || 'cashier';
                        const isOwner = role === 'owner';
                        const user: AuthUser = {
                            id: profile.id,
                            name: profile.full_name || (isOwner ? 'Store Owner' : 'Shift Cashier'),
                            role,
                        };
                        set({ user, isAuthenticated: true, ...(isOwner ? { ownerPin: pin } : {}) });
                        return { success: true, role };
                    }
                } catch {
                    // Fall through to offline credentials
                }

                // 3. Fallback PINs
                if (pin === activeOwnerPin) {
                    const user: AuthUser = { id: 'owner-master', name: 'Store Owner', role: 'owner' };
                    set({ user, isAuthenticated: true });
                    return { success: true, role: 'owner' };
                }

                if (pin === '1234') {
                    const user: AuthUser = { id: 'cashier-shift', name: 'Shift Cashier', role: 'cashier' };
                    set({ user, isAuthenticated: true });
                    return { success: true, role: 'cashier' };
                }

                return { success: false, error: 'Invalid 4-digit PIN' };
            },

            verifyOwnerPin: async (pin: string) => {
                const { loginWithPin } = get();
                const res = await loginWithPin(pin);

                if (!res.success) {
                    return { success: false, error: 'Invalid PIN code.' };
                }

                if (res.role !== 'owner') {
                    return {
                        success: false,
                        error: 'Access Denied: Owner authorization required.',
                    };
                }

                return { success: true };
            },

            changeOwnerPin: async (currentPin: string, newPin: string) => {
                const activeOwnerPin = get().ownerPin || '0430';

                if (currentPin !== activeOwnerPin) {
                    return { success: false, error: 'Current PIN is incorrect.' };
                }

                if (!/^\d{4}$/.test(newPin)) {
                    return { success: false, error: 'New PIN must be exactly 4 digits (0-9).' };
                }

                if (newPin === currentPin) {
                    return { success: false, error: 'New PIN must be different from current PIN.' };
                }

                try {
                    const supabase = createClient();
                    const { storeId, user } = get();

                    if (storeId) {
                        await supabase
                            .from('store_members')
                            .update({ pin_code: newPin })
                            .eq('store_id', storeId)
                            .eq('role', 'owner');
                    } else if (user?.id && !user.id.includes('master')) {
                        await supabase.from('profiles').update({ pin_code: newPin }).eq('id', user.id);
                    }
                } catch {
                    // Handled via local persistent state
                }

                set({ ownerPin: newPin });
                return { success: true };
            },

            lockToCashier: () => {
                set({
                    user: { id: 'cashier-shift', name: 'Shift Cashier', role: 'cashier' },
                    isAuthenticated: true,
                });
            },

            logout: async () => {
                try {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                } catch {
                    // Fall through
                }

                set({
                    user: null,
                    isAuthenticated: false,
                    storeId: null,
                    storeName: 'Rinset Laundry',
                    branchCode: 'MAIN',
                });
            },
        }),
        {
            name: 'rinset-auth-session',
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
        }
    )
);