'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';

export type UserRole = 'cashier' | 'owner';

export interface AuthUser {
    id: string;
    name: string;
    role: UserRole;
}

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
    ownerPin: string;
    setHydrated: () => void;
    loginWithPin: (pin: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
    verifyOwnerPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
    changeOwnerPin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
    lockToCashier: () => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: { id: 'cashier-default', name: 'Shift Cashier', role: 'cashier' },
            isAuthenticated: true,
            isHydrated: false,
            ownerPin: '9999',

            setHydrated: () => set({ isHydrated: true }),

            loginWithPin: async (pin: string) => {
                const activeOwnerPin = get().ownerPin || '9999';

                try {
                    const supabase = createClient();

                    // 1. Check Supabase profiles table if available
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, full_name, role, pin_code')
                        .eq('pin_code', pin)
                        .limit(1)
                        .maybeSingle();

                    if (profile) {
                        const role: UserRole = profile.role === 'owner' ? 'owner' : 'cashier';
                        const user: AuthUser = {
                            id: profile.id,
                            name: profile.full_name || (role === 'owner' ? 'Store Owner' : 'Shift Cashier'),
                            role,
                        };
                        set({ user, isAuthenticated: true });
                        return { success: true, role };
                    }
                } catch {
                    // Fall through to offline credentials
                }

                // 2. Match against active Owner PIN (custom or default)
                if (pin === activeOwnerPin) {
                    const user: AuthUser = { id: 'owner-master', name: 'Store Owner', role: 'owner' };
                    set({ user, isAuthenticated: true });
                    return { success: true, role: 'owner' };
                }

                // 3. Match against default Cashier PIN
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
                const activeOwnerPin = get().ownerPin || '9999';

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
                    const { user } = get();
                    if (user?.id && user.id !== 'owner-master') {
                        await supabase
                            .from('profiles')
                            .update({ pin_code: newPin })
                            .eq('id', user.id);
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

            logout: () => {
                set({ user: null, isAuthenticated: false });
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