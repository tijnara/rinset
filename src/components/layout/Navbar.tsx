'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, FileSpreadsheet, Settings } from 'lucide-react';

interface NavbarProps {
    storeName: string;
}

export function Navbar({ storeName }: NavbarProps) {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'POS', icon: ShoppingCart },
        { href: '/orders', label: 'Live Board', icon: LayoutDashboard },
        { href: '/audit', label: 'Z-Reading', icon: FileSpreadsheet },
        { href: '/catalog', label: 'Rates', icon: Settings },
    ];

    return (
        <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/60 backdrop-blur sticky top-0 z-30">
            <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-black text-slate-950 text-base">
                        R
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white leading-none">Rinset</h1>
                        <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px] sm:max-w-none">
                            {storeName}
                        </p>
                    </div>
                </div>

                {/* Global Navigation Tabs */}
                <nav className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                                    isActive ? 'bg-sky-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{link.label}</span>
                            </Link>
                        );
                    })}
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