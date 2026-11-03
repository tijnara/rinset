'use client';

import { OrderBasket } from '@/types/database';
import { Sparkles, Wind } from 'lucide-react';

interface MachineStatusOverviewProps {
    baskets: OrderBasket[];
}

export const WASHERS = ['W-01', 'W-02', 'W-03', 'W-04'];
export const DRYERS = ['D-01', 'D-02', 'D-03', 'D-04'];

export function MachineStatusOverview({ baskets }: MachineStatusOverviewProps) {
    const getOccupant = (machineId: string) => {
        return baskets.find(
            (b) =>
                b.assigned_machine === machineId &&
                (b.status === 'washing' || b.status === 'drying')
        );
    };

    return (
        <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Washers Strip */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 pr-2 border-r border-slate-800 text-sky-400">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Washers</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 flex-1">
                    {WASHERS.map((id) => {
                        const occupant = getOccupant(id);
                        const isBusy = Boolean(occupant);

                        return (
                            <div
                                key={id}
                                className={`px-2 py-1.5 rounded-lg border flex flex-col items-center justify-center transition ${
                                    isBusy
                                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                                        : 'bg-slate-900 border-slate-800 text-slate-500'
                                }`}
                            >
                                <div className="flex items-center space-x-1">
                  <span
                      className={`w-1.5 h-1.5 rounded-full ${
                          isBusy ? 'bg-sky-400 animate-pulse' : 'bg-emerald-500'
                      }`}
                  />
                                    <span className="font-mono font-bold text-xs">{id}</span>
                                </div>
                                <span className="text-[9px] font-mono mt-0.5 truncate max-w-full">
                  {isBusy ? occupant?.basket_tag : 'Idle'}
                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Dryers Strip */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 pr-2 border-r border-slate-800 text-indigo-400">
                    <Wind className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Dryers</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 flex-1">
                    {DRYERS.map((id) => {
                        const occupant = getOccupant(id);
                        const isBusy = Boolean(occupant);

                        return (
                            <div
                                key={id}
                                className={`px-2 py-1.5 rounded-lg border flex flex-col items-center justify-center transition ${
                                    isBusy
                                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                                        : 'bg-slate-900 border-slate-800 text-slate-500'
                                }`}
                            >
                                <div className="flex items-center space-x-1">
                  <span
                      className={`w-1.5 h-1.5 rounded-full ${
                          isBusy ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-500'
                      }`}
                  />
                                    <span className="font-mono font-bold text-xs">{id}</span>
                                </div>
                                <span className="text-[9px] font-mono mt-0.5 truncate max-w-full">
                  {isBusy ? occupant?.basket_tag : 'Idle'}
                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}