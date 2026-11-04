'use client';

import { useState } from 'react';
import { useAuthStore } from '@/features/auth';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

interface ChangePinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangePinModal({ isOpen, onClose }: ChangePinModalProps) {
    const { changeOwnerPin } = useAuthStore();

    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showPins, setShowPins] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleReset = () => {
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setErrorMsg(null);
        setIsSuccess(false);
        setIsSubmitting(false);
        onClose();
    };

    const handleNumericInput = (val: string, setter: (v: string) => void) => {
        const clean = val.replace(/\D/g, '').slice(0, 4);
        setter(clean);
        setErrorMsg(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (currentPin.length !== 4) {
            setErrorMsg('Current PIN must be 4 digits.');
            return;
        }
        if (newPin.length !== 4) {
            setErrorMsg('New PIN must be exactly 4 digits.');
            return;
        }
        if (newPin !== confirmPin) {
            setErrorMsg('New PIN and Confirm PIN do not match.');
            return;
        }

        setIsSubmitting(true);
        const res = await changeOwnerPin(currentPin, newPin);
        setIsSubmitting(false);

        if (!res.success) {
            setErrorMsg(res.error || 'Failed to update PIN.');
            return;
        }

        setIsSuccess(true);
        setTimeout(() => {
            handleReset();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                <button
                    type="button"
                    onClick={handleReset}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2.5 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                        <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base leading-none">Change Owner PIN</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Secure your store administration</p>
                    </div>
                </div>

                {isSuccess ? (
                    <div className="py-8 text-center space-y-2">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                        <h4 className="font-bold text-white text-sm">PIN Changed Successfully!</h4>
                        <p className="text-xs text-slate-400 font-mono">Use your new PIN to unlock Owner Mode.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
                        {/* Show/Hide PIN Toggle */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowPins(!showPins)}
                                className="text-[11px] text-slate-400 hover:text-sky-400 flex items-center space-x-1 transition"
                            >
                                {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                <span>{showPins ? 'Hide PINs' : 'Show PINs'}</span>
                            </button>
                        </div>

                        {/* Current PIN */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Current Owner PIN
                            </label>
                            <input
                                type={showPins ? 'text' : 'password'}
                                inputMode="numeric"
                                maxLength={4}
                                value={currentPin}
                                onChange={(e) => handleNumericInput(e.target.value, setCurrentPin)}
                                placeholder="••••"
                                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-center font-mono text-base tracking-[0.4em] text-white placeholder-slate-600 focus:border-amber-400 focus:outline-none transition"
                                autoFocus
                            />
                        </div>

                        {/* New PIN */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                New 4-Digit PIN
                            </label>
                            <input
                                type={showPins ? 'text' : 'password'}
                                inputMode="numeric"
                                maxLength={4}
                                value={newPin}
                                onChange={(e) => handleNumericInput(e.target.value, setNewPin)}
                                placeholder="••••"
                                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-center font-mono text-base tracking-[0.4em] text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none transition"
                            />
                        </div>

                        {/* Confirm New PIN */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Confirm New PIN
                            </label>
                            <input
                                type={showPins ? 'text' : 'password'}
                                inputMode="numeric"
                                maxLength={4}
                                value={confirmPin}
                                onChange={(e) => handleNumericInput(e.target.value, setConfirmPin)}
                                placeholder="••••"
                                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-center font-mono text-base tracking-[0.4em] text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none transition"
                            />
                        </div>

                        {errorMsg && (
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
                            className="w-full h-11 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 active:bg-sky-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition shadow"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <span>Update Owner PIN</span>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}