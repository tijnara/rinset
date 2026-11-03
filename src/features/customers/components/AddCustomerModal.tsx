'use client';

import { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, mobile?: string) => Promise<{ success: boolean; error?: string }>;
}

export function AddCustomerModal({ isOpen, onClose, onSubmit }: AddCustomerModalProps) {
    const [fullName, setFullName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim()) return;

        setIsSubmitting(true);
        setErrorMsg(null);

        const res = await onSubmit(fullName, mobileNumber);

        setIsSubmitting(false);
        if (res.success) {
            setFullName('');
            setMobileNumber('');
            onClose();
        } else {
            setErrorMsg(res.error || 'Failed to create customer');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        <UserPlus className="w-5 h-5 text-sky-400" />
                        <h3 className="font-bold text-white text-base">New Customer</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">
                            Full Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Maria Clara Santos"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Mobile Number (For SMS):</label>
                        <input
                            type="text"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            placeholder="09181234567"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                        />
                    </div>

                    {errorMsg && (
                        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                            {errorMsg}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting || !fullName.trim()}
                        className="w-full h-12 mt-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow transition"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <span>Register Customer</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}