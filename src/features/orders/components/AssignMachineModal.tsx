'use client';

import { useState } from 'react';
import { OrderBasket, OrderStatus } from '@/types/database';
import { WASHERS, DRYERS } from './MachineStatusOverview';
import { X, Check, Sparkles, Wind } from 'lucide-react';

interface AssignMachineModalProps {
    basket: OrderBasket | null;
    targetStatus: OrderStatus | null;
    activeBaskets: OrderBasket[];
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (basketId: string, orderId: string, nextStatus: OrderStatus, machineId: string) => void;
}

export function AssignMachineModal({
                                       basket,
                                       targetStatus,
                                       activeBaskets,
                                       isOpen,
                                       onClose,
                                       onConfirm,
                                   }: AssignMachineModalProps) {
    const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

    if (!isOpen || !basket || !targetStatus) return null;

    const isWashing = targetStatus === 'washing';
    const machineList = isWashing ? WASHERS : DRYERS;

    const getOccupyingBasket = (machineId: string) => {
        return activeBaskets.find(
            (b) =>
                b.id !== basket.id &&
                b.assigned_machine === machineId &&
                (b.status === 'washing' || b.status === 'drying')
        );
    };

    const handleConfirm = () => {
        if (!selectedMachine) return;
        onConfirm(basket.id, basket.order_id, targetStatus, selectedMachine);
        setSelectedMachine(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        {isWashing ? (
                            <Sparkles className="w-5 h-5 text-sky-400" />
                        ) : (
                            <Wind className="w-5 h-5 text-indigo-400" />
                        )}
                        <h3 className="font-bold text-white text-base">
                            {isWashing ? 'Assign Washer Drum' : 'Assign Dryer Drum'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Target Sub-Basket Banner */}
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                    <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">
              Target Load / Basket
            </span>
                        <span className="text-sm font-mono font-bold text-sky-400">
              {basket.basket_tag}{' '}
                            <span className="text-slate-400 font-normal">
                ({basket.order?.customer?.full_name || 'Walk-in'})
              </span>
            </span>
                    </div>
                    <span className="text-xs font-mono text-slate-300">
            {basket.weight_kg > 0 ? `${basket.weight_kg} kg` : 'Load'}
          </span>
                </div>

                {/* Machine Drum Grid */}
                <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold block">
                        Select Physical Drum Slot:
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                        {machineList.map((machineId) => {
                            const occupant = getOccupyingBasket(machineId);
                            const isOccupied = Boolean(occupant);
                            const isSelected = selectedMachine === machineId;

                            return (
                                <button
                                    key={machineId}
                                    type="button"
                                    disabled={isOccupied}
                                    onClick={() => setSelectedMachine(machineId)}
                                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between h-20 ${
                                        isSelected
                                            ? isWashing
                                                ? 'bg-sky-500/20 border-sky-400 text-sky-300 ring-2 ring-sky-500/50'
                                                : 'bg-indigo-500/20 border-indigo-400 text-indigo-300 ring-2 ring-indigo-500/50'
                                            : isOccupied
                                                ? 'bg-slate-950/60 border-slate-800 opacity-50 cursor-not-allowed text-slate-600'
                                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-mono font-bold text-base">{machineId}</span>
                                        <span
                                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                                isOccupied
                                                    ? 'bg-rose-500/10 text-rose-400'
                                                    : isSelected
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-slate-800 text-emerald-400'
                                            }`}
                                        >
                      {isOccupied ? 'BUSY' : isSelected ? 'CHOSEN' : 'READY'}
                    </span>
                                    </div>

                                    <span className="text-[10px] font-mono text-slate-400 truncate">
                    {isOccupied ? `Basket ${occupant?.basket_tag}` : 'Drum Available'}
                  </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={!selectedMachine}
                    className="w-full h-12 mt-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition"
                >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirm & Start {isWashing ? 'Wash Cycle' : 'Drying Cycle'}</span>
                </button>
            </div>
        </div>
    );
}