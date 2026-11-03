'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, PinPad } from '@/features/auth';
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
} from 'lucide-react';

interface NavbarProps {
    storeName: string;
}

export function Navbar({ storeName }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loginWithPin, lockToCashier } = useAuthStore();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [pinError, setPinError] = useState<string | null>(null);

    const isOwner = user?.role === 'owner';

    const links = [
        { href: '/', label: 'POS', icon: ShoppingCart, protected: false },
        { href: '/orders', label: 'Live Board', icon: LayoutDashboard, protected: false },
        { href: '/customers', label: 'Customers', icon: Users, protected: false },
        { href: '/audit', label: 'Z-Reading', icon: FileSpreadsheet, protected: true },
        { href: '/catalog', label: 'Rates', icon: Settings, protected: true },
    ];

    return (
        <>
            {/* Top Header Bar */}
            <header className="h-14 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between bg-slate-900/90 backdrop-blur sticky top-0 z-30">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center font-black text-slate-950 text-base shadow-sm flex-shrink-0">
                        R
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm sm:text-base font-bold text-white leading-none">Rinset</h1>
                        <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[110px] sm:max-w-[200px]">
                            {storeName}
                        </p>
                    </div>
                </div>

                {/* Desktop & Landscape Tablet Navigation */}
                <nav className="hidden md:flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        const isLockedForCashier = !isOwner && link.protected;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                                    isActive
                                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                                        : isLockedForCashier
                                            ? 'text-slate-500 hover:text-slate-300'
                                            : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{link.label}</span>
                                {isLockedForCashier && (
                                    <Lock className="w-2.5 h-2.5 text-slate-500 ml-0.5" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Role Badge & Shift Switcher */}
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {isOwner ? (
                        <div className="flex items-center space-x-1 sm:space-x-1.5">
              <span className="px-2 sm:px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl flex items-center space-x-1 shadow-sm">
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Store Owner</span>
              </span>
                            <button
                                onClick={() => {
                                    lockToCashier();
                                    router.push('/');
                                }}
                                className="p-1.5 sm:px-2.5 sm:py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl flex items-center space-x-1 transition active:bg-slate-600"
                                title="Lock terminal back to Cashier Shift"
                            >
                                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                                <span className="hidden md:inline">Lock to Cashier</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setPinError(null);
                                setIsAuthModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl border bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center space-x-1.5 text-xs font-bold transition active:bg-slate-700"
                        >
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Shift Cashier</span>
                            <span className="text-[10px] text-sky-400 ml-0.5 font-normal">(Unlock)</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Mobile Bottom Dock Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur px-2 py-1 flex justify-around items-center">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    const isLockedForCashier = !isOwner && link.protected;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex-1 py-1 flex flex-col items-center justify-center rounded-xl transition ${
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
                            <span className="text-[10px] mt-0.5">{link.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Switch Shift / PIN Modal */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                        <button
                            onClick={() => {
                                setIsAuthModalOpen(false);
                                setPinError(null);
                            }}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <PinPad
                            title="Enter Owner PIN"
                            subtitle="Enter Owner Master PIN (9999) to unlock financial & pricing tools"
                            errorMessage={pinError}
                            onComplete={async (pin) => {
                                const res = await loginWithPin(pin);
                                if (res.success && res.role === 'owner') {
                                    setIsAuthModalOpen(false);
                                    setPinError(null);
                                    return true;
                                }
                                setPinError('Invalid Owner PIN. Enter 9999 to unlock.');
                                return false;
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}