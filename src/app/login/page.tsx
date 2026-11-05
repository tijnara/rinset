'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/features/auth';
import { RinsetLogo } from '@/components/icons/RinsetLogo';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { initializeSession } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setLoading(true);

        const supabase = createClient();

        // 1. Authenticate with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        });

        if (authError || !authData.user) {
            setErrorMessage(authError?.message || 'Invalid email or password.');
            setLoading(false);
            return;
        }

        // 2. Fetch the user's store membership
        const { data: member, error: memberError } = await supabase
            .from('store_members')
            .select('store_id, role, pin_code, store:stores(id, name, branch_code)')
            .eq('user_id', authData.user.id)
            .eq('is_active', true)
            .single();

        if (memberError || !member) {
            setErrorMessage('No active laundry shop found for this account.');
            setLoading(false);
            return;
        }

        // 3. Hydrate client auth store session
        initializeSession({
            userId: authData.user.id,
            email: authData.user.email ?? '',
            storeId: member.store_id,
            storeName: (member.store as any)?.name ?? 'Rinset Laundry',
            branchCode: (member.store as any)?.branch_code ?? 'MAIN',
            role: member.role,
            ownerPin: member.pin_code,
        });

        router.push('/');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 select-none">
            <div className="w-full max-w-md">
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
                            <label className="text-xs text-slate-400 font-medium">Email Address</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="email"
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
        </div>
    );
}