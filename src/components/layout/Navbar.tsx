'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, PinPad } from '@/features/auth';
import { MachineBayModal } from '@/features/machines/MachineBayModal';
import { RinsetLogo } from '@/components/icons/RinsetLogo';
import {
    LayoutDashboard,
    ShoppingCart,
    Users,
    FileSpreadsheet,
    Settings,
    Shield,
    User,
    Lock,
    X,
    LogOut,
    Timer,
} from 'lucide-react';

interface NavbarProps {
    storeName?: string;
}

export function Navbar({ storeName: propStoreName }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, storeName: authStoreName, loginWithPin, lockToCashier, logout } = useAuthStore();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isMachineBayOpen, setIsMachineBayOpen] = useState(false);
    const [pinError, setPinError] = useState<string | null>(null);

    const isOwner = user?.role === 'owner';
    const displayStoreName = propStoreName || authStoreName || 'Rinset Laundry';

    const links = [
        { href: '/', label: 'POS Counter', icon: ShoppingCart, protected: false },
        { href: '/orders', label: 'Live Board', icon: LayoutDashboard, protected: false },
        { href: '/customers', label: 'Customers', icon: Users, protected: false },
        { href: '/audit', label: 'Z-Reading', icon: FileSpreadsheet, protected: true },
        { href: '/catalog', label: 'Rates & Settings', icon: Settings, protected: true },
    ];

    const handleLockShift = () => {
        lockToCashier();
        if (pathname === '/audit' || pathname === '/catalog') {
            router.push('/');
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <>
            {/* 1. Main Header Bar (Sticky Top) */}
            <header className="h-14 border-b border-slate-800 px-3 sm:px-5 flex items-center justify-between bg-slate-900/95 backdrop-blur sticky top-0 z-40 flex-shrink-0 select-none">
                {/* Left: Brand Logo + Dynamic Store Name + Live Indicator */}
                <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
                    <Link href="/" className="flex items-center space-x-2.5 group">
                        <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-sky-500/40 transition">
                            <RinsetLogo className="w-5 h-5 flex-shrink-0" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                <span className="text-sm font-black text-white tracking-tight leading-none">
                  Rinset
                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="System Online" />
                            </div>
                            <p className="text-[10px] text-sky-400 font-medium font-mono leading-tight truncate max-w-[140px] sm:max-w-[200px] mt-0.5">
                                {displayStoreName}
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Center: Desktop Navigation Bar (Visible on lg+ screens) */}
                <nav
                    aria-label="Desktop navigation"
                    className="hidden lg:flex items-center space-x-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-1 mx-4 flex-shrink-0"
                >
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        const isLockedForCashier = !isOwner && link.protected;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center space-x-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                    isActive
                                        ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                                        : isLockedForCashier
                                            ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{link.label}</span>
                                {isLockedForCashier && (
                                    <Lock className="w-2.5 h-2.5 text-slate-500 ml-0.5 flex-shrink-0" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right: Machine Timers + Shift Status & Logout */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                    {/* Machine Bay Quick Trigger */}
                    <button
                        type="button"
                        onClick={() => setIsMachineBayOpen(true)}
                        className="h-8 px-2.5 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-sm"
                        title="Commercial Washer & Dryer Bay Timers"
                    >
                        <Timer className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                        <span className="hidden md:inline">Machine Bay</span>
                    </button>

                    <div className="h-5 w-px bg-slate-800 mx-0.5" />

                    {isOwner ? (
                        <div className="flex items-center space-x-1.5">
              <span
                  aria-label="Store Owner"
                  className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm"
              >
                <Shield className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                <span className="hidden sm:inline">Store Owner</span>
              </span>

                            <button
                                type="button"
                                onClick={handleLockShift}
                                className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl flex items-center space-x-1 transition shadow-sm"
                                title="Lock terminal to Cashier Mode"
                            >
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span className="hidden xl:inline">Lock Shift</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setPinError(null);
                                setIsAuthModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center space-x-1.5 text-xs font-bold transition active:bg-slate-700"
                        >
                            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>Shift Cashier</span>
                            <span className="text-[10px] text-sky-400 font-normal">(Unlock)</span>
                        </button>
                    )}

                    <div className="h-5 w-px bg-slate-800 mx-0.5" />

                    <button
                        type="button"
                        onClick={handleLogout}
                        title="Sign out of store terminal"
                        className="h-8 px-2.5 bg-slate-800/90 hover:bg-rose-500/20 active:bg-rose-500/30 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-bold flex items-center space-x-1 transition shadow-sm"
                    >
                        <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            {/* 2. Mobile Bottom Dock (Hidden on lg+ screens) */}
            <nav
                aria-label="Mobile navigation"
                className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-900/98 backdrop-blur"
            >
                <div className="flex justify-around items-center px-2 py-1">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        const isLockedForCashier = !isOwner && link.protected;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex-1 py-1.5 flex flex-col items-center justify-center rounded-xl transition ${
                                    isActive
                                        ? 'text-sky-400 font-bold'
                                        : isLockedForCashier
                                            ? 'text-slate-500'
                                            : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <div className="relative">
                                    <Icon className="w-4 h-4" />
                                    {isLockedForCashier && (
                                        <Lock className="w-2.5 h-2.5 text-slate-500 absolute -top-1 -right-2" />
                                    )}
                                </div>
                                <span className="text-[10px] mt-0.5">{link.label.split(' ')[0]}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* 3. Machine Bay Modal */}
            <MachineBayModal
                isOpen={isMachineBayOpen}
                onClose={() => setIsMachineBayOpen(false)}
            />

            {/* 4. PIN Unlock Modal */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAuthModalOpen(false);
                                setPinError(null);
                            }}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <PinPad
                            title="Enter Security PIN"
                            subtitle="Enter 4-digit security PIN to unlock controls"
                            errorMessage={pinError}
                            onComplete={async (pin) => {
                                const res = await loginWithPin(pin);
                                if (res.success && res.role === 'owner') {
                                    setIsAuthModalOpen(false);
                                    setPinError(null);
                                    return true;
                                }
                                setPinError('Invalid Security PIN. Please try again.');
                                return false;
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}