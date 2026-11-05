'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { registerStoreAction } from '@/features/auth/actions/registerStore';
import { RinsetLogo } from '@/components/icons/RinsetLogo';
import {
    Store,
    User,
    Mail,
    Lock,
    Phone,
    MapPin,
    KeyRound,
    ArrowRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

export default function SignUpPage() {
    const router = useRouter();
    const { initializeSession } = useAuthStore();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        storeName: '',
        branchCode: 'MAIN',
        contactNumber: '',
        address: '',
        pinCode: '',
    });

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'pinCode') {
            const numeric = value.replace(/\D/g, '').slice(0, 4);
            setFormData((prev) => ({ ...prev, [name]: numeric }));
            return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!formData.fullName.trim()) return setErrorMessage('Full name is required.');
        if (!formData.email.trim() || !formData.email.includes('@'))
            return setErrorMessage('Valid email address is required.');
        if (formData.password.length < 6)
            return setErrorMessage('Password must be at least 6 characters.');
        if (!formData.storeName.trim()) return setErrorMessage('Shop name is required.');
        if (formData.pinCode.length !== 4)
            return setErrorMessage('Terminal PIN must be exactly 4 digits.');

        setLoading(true);

        try {
            // 1. Create and auto-confirm user + store on the server
            const result = await registerStoreAction(formData);

            if (!result.success || !result.storeId || !result.userId) {
                throw new Error(result.error || 'Registration failed.');
            }

            // 2. Establish client authentication session in browser cookies
            const supabase = createClient();
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
            });

            if (signInError) {
                throw new Error(signInError.message);
            }

            // 3. Hydrate active store session into Zustand
            initializeSession({
                userId: result.userId,
                email: formData.email.trim().toLowerCase(),
                storeId: result.storeId,
                storeName: formData.storeName.trim(),
                branchCode: formData.branchCode.trim() || 'MAIN',
                role: 'owner',
                ownerPin: formData.pinCode.trim(),
            });

            setIsSuccess(true);

            setTimeout(() => {
                router.push('/');
            }, 1200);
        } catch (err: any) {
            setErrorMessage(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 select-none">
            <div className="w-full max-w-xl">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-3">
                        <RinsetLogo className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Register Your Laundry Shop
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Set up your store terminal and launch your Rinset POS in minutes.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
                    {errorMessage && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {isSuccess ? (
                        <div className="text-center py-8 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                            <h2 className="text-xl font-bold text-white">Store Registered Successfully!</h2>
                            <p className="text-xs sm:text-sm text-slate-400">
                                Opening your laundry shop counter now...
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* OWNER ACCOUNT CREDENTIALS */}
                            <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Owner Account Credentials</span>
                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-medium">Full Name</label>
                                        <div className="relative">
                                            <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                            <input
                                                type="text"
                                                name="fullName"
                                                required
                                                placeholder="Juan Dela Cruz"
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-medium">Email Address</label>
                                        <div className="relative">
                                            <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                placeholder="owner@laundry.com"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Account Password</label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                        <input
                                            type="password"
                                            name="password"
                                            required
                                            placeholder="At least 6 characters"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* LAUNDRY SHOP INFORMATION */}
                            <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center space-x-1.5">
                  <Store className="w-3.5 h-3.5" />
                  <span>Laundry Shop Information</span>
                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2 space-y-1">
                                        <label className="text-xs text-slate-400 font-medium">Shop Name</label>
                                        <div className="relative">
                                            <Store className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                            <input
                                                type="text"
                                                name="storeName"
                                                required
                                                placeholder="Rinset Laundry Hub"
                                                value={formData.storeName}
                                                onChange={handleChange}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-medium">Branch Code</label>
                                        <input
                                            type="text"
                                            name="branchCode"
                                            placeholder="MAIN"
                                            value={formData.branchCode}
                                            onChange={handleChange}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-medium">Contact Number</label>
                                        <div className="relative">
                                            <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                            <input
                                                type="text"
                                                name="contactNumber"
                                                placeholder="0917 123 4567"
                                                value={formData.contactNumber}
                                                onChange={handleChange}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-medium">Shop Location / Address</label>
                                        <div className="relative">
                                            <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                            <input
                                                type="text"
                                                name="address"
                                                placeholder="Lingayen, Pangasinan"
                                                value={formData.address}
                                                onChange={handleChange}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TERMINAL SECURITY PIN */}
                            <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Terminal Security PIN</span>
                </span>
                                <p className="text-[11px] text-slate-400">
                                    A 4-digit PIN used directly on the POS counter to unlock owner controls and switch shifts.
                                </p>

                                <div className="w-40 relative">
                                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        name="pinCode"
                                        maxLength={4}
                                        required
                                        placeholder="••••"
                                        value={formData.pinCode}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-base text-center font-mono tracking-widest text-white focus:outline-none focus:border-sky-500 transition"
                                    />
                                </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition shadow-lg mt-6"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Registering & Launching POS...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Register & Launch Terminal</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                        Already have a store account?{' '}
                        <Link href="/login" className="text-sky-400 hover:text-sky-300 font-bold underline">
                            Sign In to Terminal
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}