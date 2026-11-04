'use client';

import { useState, useEffect } from 'react';
import { Store, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

interface EditStoreNameModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStoreName: string;
    onSave: (newName: string) => Promise<{ success: boolean; error?: string }>;
}

export function EditStoreNameModal({
                                       isOpen,
                                       onClose,
                                       currentStoreName,
                                       onSave,
                                   }: EditStoreNameModalProps) {
    const [storeName, setStoreName] = useState(currentStoreName);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStoreName(currentStoreName);
            setErrorMsg(null);
            setIsSuccess(false);
            setIsSubmitting(false);
        }
    }, [isOpen, currentStoreName]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeName.trim()) {
            setErrorMsg('Business name cannot be empty.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        const res = await onSave(storeName.trim());
        setIsSubmitting(false);

        if (!res.success) {
            setErrorMsg(res.error || 'Failed to update business name.');
            return;
        }

        setIsSuccess(true);
        setTimeout(() => {
            onClose();
        }, 1200);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2.5 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                        <Store className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base leading-none">Change Business Name</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Appears on tickets, receipts, and header</p>
                    </div>
                </div>

                {isSuccess ? (
                    <div className="py-6 text-center space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                        <h4 className="font-bold text-white text-sm">Business Name Updated!</h4>
                        <p className="text-xs text-slate-400">Your store branding has been saved.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Business / Branch Name
                            </label>
                            <input
                                type="text"
                                value={storeName}
                                onChange={(e) => {
                                    setStoreName(e.target.value);
                                    setErrorMsg(null);
                                }}
                                placeholder="e.g. Rinset Laundry - Dagupan"
                                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none transition"
                                autoFocus
                            />
                            <p className="text-[10px] text-slate-500">
                                System footer remains fixed as <span className="font-mono text-slate-400">Rinset 2026 by tijnara</span>.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || !storeName.trim() || storeName.trim() === currentStoreName}
                            className="w-full h-11 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 active:bg-sky-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition shadow"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <span>Save Business Name</span>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}