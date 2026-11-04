'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, UserRole } from '../store/useAuthStore';
import { PinPad } from './PinPad';
import { ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRole?: UserRole;
    fallbackTitle?: string;
    fallbackSubtitle?: string;
}

export function RoleGuard({
                              children,
                              allowedRole = 'owner',
                              fallbackTitle = 'Owner PIN Required',
                              fallbackSubtitle = 'Financial reports & price rates are restricted to Store Owners.',
                          }: RoleGuardProps) {
    const router = useRouter();
    const { user, isHydrated, verifyOwnerPin } = useAuthStore();
    const [mounted, setMounted] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Wait until client has hydrated localStorage to avoid false lock screens
    if (!mounted || !isHydrated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">
                Checking access...
            </div>
        );
    }

    // If already logged in as Owner, grant direct access without showing the PIN pad
    if (user?.role === allowedRole) {
        return <>{children}</>;
    }

    const handleVerify = async (pin: string): Promise<boolean> => {
        setErrorMessage(null);
        const res = await verifyOwnerPin(pin);

        if (res.success) {
            return true;
        }

        setErrorMessage(res.error || 'Access Denied: Incorrect Owner PIN.');
        return false;
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-center space-x-2 text-amber-400 mb-2">
                    <ShieldAlert className="w-5 h-5" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Restricted Area</span>
                </div>

                <PinPad
                    title={fallbackTitle}
                    subtitle={fallbackSubtitle}
                    errorMessage={errorMessage}
                    onComplete={handleVerify}
                    onCancel={() => router.push('/')}
                />
            </div>
        </div>
    );
}