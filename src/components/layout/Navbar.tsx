'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store as StoreIcon, LayoutDashboard, ShoppingCart } from 'lucide-react';

interface NavbarProps {
    storeName: string;
}

export function Navbar({ storeName }: NavbarProps) {
    const pathname = usePathname();

    return (
        <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/60 backdrop-blur sticky top-0 z-30">
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-black text-slate-950 text-base">
                        R
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white leading-none">Rinset</h1>
                        <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[150px] sm:max-w-none">
                            {storeName}
                        </p>
                    </div>
                </div>

                {/* View Switcher Tabs */}
                <nav className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <Link
                        href="/"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                            pathname === '/'
                                ? 'bg-sky-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>POS</span>
                    </Link>

                    <Link
                        href="/orders"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                            pathname === '/orders'
                                ? 'bg-sky-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Live Board</span>
                    </Link>
                </nav>
            </div>

            <div className="flex items-center space-x-2">
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
          Live Realtime
        </span>
            </div>
        </header>
    );
}