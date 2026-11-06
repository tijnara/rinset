'use client';

import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

interface StorageAgingBadgeProps {
    readyAt: string | null;
    onApplyStorageFee?: (fee: number) => void;
}

export function StorageAgingBadge({ readyAt }: StorageAgingBadgeProps) {
    if (!readyAt) return null;

    const readyDate = new Date(readyAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - readyDate.getTime()) / (1000 * 60 * 60 * 24));

    // Day 0 to 3: Grace period (Free)
    if (diffDays <= 3) {
        return (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
        <Clock className="w-3 h-3" /> Ready Day {diffDays} (Free Storage)
      </span>
        );
    }

    // Day 4 to 13: Storage Surcharge Accumulating (₱20/day)
    if (diffDays <= 13) {
        const surcharge = (diffDays - 3) * 20;
        return (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-amber-400" />
        Unclaimed {diffDays} Days (+₱{surcharge} Storage Fee)
      </span>
        );
    }

    // Day 14 to 29: Final Notice Warning
    if (diffDays < 30) {
        const surcharge = (diffDays - 3) * 20;
        return (
            <span className="px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/40 text-orange-300 text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse">
        <AlertTriangle className="w-3 h-3 text-orange-400" />
        Overdue {diffDays} Days (+₱{surcharge}) • Send Warning SMS
      </span>
        );
    }

    // Day 30+: DTI Forfeiture Notice Eligible
    return (
        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-mono font-black flex items-center gap-1 animate-pulse">
      <ShieldAlert className="w-3 h-3 text-rose-400" />
      DTI Forfeiture Eligible ({diffDays} Days Unclaimed)
    </span>
    );
}