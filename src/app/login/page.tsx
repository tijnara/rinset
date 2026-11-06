'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/features/auth';
import { RinsetLogo } from '@/components/icons/RinsetLogo';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const { initializeSession } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setLoading(true);

        const cleanInput = email.trim();
        const cleanPassword = password.trim();

        try {
            const supabase = createClient();
            const resolvedEmail = !cleanInput.includes('@')
                ? `${cleanInput.toLowerCase()}@rinset.com`
                : cleanInput.toLowerCase();

            // Standard Supabase authentication
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: resolvedEmail,
                password: cleanPassword,
            });

            if (authError || !authData?.user) {
                setErrorMessage(authError?.message || 'Invalid username/email or password.');
                setLoading(false);
                return;
            }

            // Check store membership
            const { data: member } = await supabase
                .from('store_members')
                .select('store_id, role, pin_code, store:stores(id, name, branch_code)')
                .eq('user_id', authData.user.id)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name, pin_code, store_id')
                .eq('id', authData.user.id)
                .maybeSingle();

            let storeId = member?.store_id || profile?.store_id;
            let storeName = (member?.store as any)?.name ?? 'Rinset Laundry';
            let branchCode = (member?.store as any)?.branch_code ?? 'MAIN';
            const ownerPin = profile?.pin_code || member?.pin_code || '0430';

            // Auto-link fallback if user has no store_members entry yet
            if (!storeId) {
                const { data: firstStore } = await supabase
                    .from('stores')
                    .select('id, name, branch_code')
                    .limit(1)
                    .maybeSingle();

                if (firstStore) {
                    storeId = firstStore.id;
                    storeName = firstStore.name;
                    branchCode = firstStore.branch_code || 'MAIN';

                    await supabase.from('store_members').upsert({
                        store_id: firstStore.id,
                        user_id: authData.user.id,
                        role: 'owner',
                        is_active: true,
                        pin_code: ownerPin,
                    });
                }
            }

            if (!storeId) {
                setErrorMessage('No active laundry shop found for this account.');
                setLoading(false);
                return;
            }

            // Initialize session directly in Cashier Mode
            initializeSession({
                userId: authData.user.id,
                email: authData.user.email ?? '',
                storeId,
                storeName,
                branchCode,
                role: 'cashier',
                ownerPin,
            });

            window.location.href = '/';
        } catch (err: any) {
            setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 select-none">
            <div className="w-full max-w-md my-auto">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-3">
                        <RinsetLogo className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">
                        Sign In to Terminal
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Access your laundry shop counter and management dashboard.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
                    {errorMessage && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Email or Username</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    placeholder="owner@laundry.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Password</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition shadow-lg mt-6"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Connecting to store...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-slate-400 pt-4 border-t border-slate-800/80">
                        Don&apos;t have a laundry shop registered?{' '}
                        <Link href="/signup" className="text-sky-400 hover:text-sky-300 font-bold underline">
                            Create a Store
                        </Link>
                    </div>
                </div>
            </div>

            {/* Persistent System Footer */}
            <footer className="py-4 text-center select-none">
                <p className="text-xs text-slate-500 font-mono tracking-wider">
                    Rinset 2026 by tijnara
                </p>
            </footer>
        </div>
    );
}