'use client';

import { Order } from '@/types/database';
import { formatPHP, formatManilaTime } from '@/lib/formatters';
import { Printer, X } from 'lucide-react';

interface ReceiptModalProps {
    order: Order | null;
    storeName: string;
    onClose: () => void;
}

export function ReceiptModal({ order, storeName, onClose }: ReceiptModalProps) {
    if (!order) return null;

    const handlePrint = () => {
        window.print();
    };

    const isPaid = order.payment_status === 'paid';
    const customerName = order.customer?.full_name || 'Walk-in Customer';
    const customerMobile = order.customer?.mobile_number;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
                {/* Modal Controls */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center print:hidden bg-slate-900">
                    <span className="font-bold text-white text-sm">Thermal Receipt Preview</span>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 58mm Receipt Viewport */}
                <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950">
                    <div className="w-[58mm] bg-white text-black p-3 font-mono text-[11px] leading-tight rounded-sm shadow-md print:w-[58mm] print:shadow-none print:m-0">
                        {/* Store Header */}
                        <div className="text-center pb-2 border-b border-dashed border-black">
                            <h2 className="text-sm font-black uppercase">{storeName}</h2>
                            <p className="text-[10px]">LAUNDRY SERVICE CLAIM TICKET</p>
                            <p className="text-[10px] font-bold mt-1">Ticket #{order.order_number}</p>
                            <p className="text-[9px] text-gray-700">{formatManilaTime(order.created_at)}</p>
                        </div>

                        {/* Basket Tag Indicator */}
                        <div className="text-center py-2 border-b border-dashed border-black bg-gray-100 my-1 rounded">
                            <span className="text-[9px] uppercase font-bold block text-gray-700">Basket Identifier</span>
                            <span className="text-base font-black tracking-widest">{order.basket_tag}</span>
                        </div>

                        {/* Customer Details Section */}
                        <div className="py-2 border-b border-dashed border-black space-y-1">
                            <span className="text-[9px] uppercase font-bold text-gray-700 block">Customer Info:</span>
                            <div className="flex justify-between">
                                <span className="font-bold">Name:</span>
                                <span className="font-black uppercase truncate max-w-[120px]">{customerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Contact:</span>
                                <span className="font-mono">{customerMobile || 'None provided'}</span>
                            </div>
                        </div>

                        {/* Items Breakdown */}
                        <div className="py-2 border-b border-dashed border-black space-y-1">
                            <div className="flex justify-between text-[10px] font-bold border-b border-gray-300 pb-0.5 mb-1">
                                <span>Item</span>
                                <span>Total</span>
                            </div>

                            {order.items && order.items.length > 0 ? (
                                order.items.map((item, idx) => (
                                    <div key={idx} className="space-y-0.5">
                                        <div className="flex justify-between font-bold">
                                            <span className="truncate max-w-[110px]">{item.item_name}</span>
                                            <span>{formatPHP(item.item_total)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-600">
                      <span>
                        {item.quantity} {item.pricing_type === 'per_kilo' ? 'kg' : 'pc'} @ {formatPHP(item.unit_price)}
                      </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex justify-between font-bold">
                                    <span>General Laundry</span>
                                    <span>{formatPHP(order.net_payable)}</span>
                                </div>
                            )}
                        </div>

                        {/* Totals & Financials */}
                        <div className="py-2 border-b border-dashed border-black space-y-1">
                            {order.total_weight_kg > 0 && (
                                <div className="flex justify-between text-[10px]">
                                    <span>Total Weight:</span>
                                    <span>{order.total_weight_kg} kg</span>
                                </div>
                            )}

                            <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
                                <span>NET PAYABLE:</span>
                                <span>{formatPHP(order.net_payable)}</span>
                            </div>

                            <div className="flex justify-between text-[10px] pt-1">
                                <span>Payment Status:</span>
                                <span className="font-black uppercase">{order.payment_status}</span>
                            </div>

                            {isPaid ? (
                                <div className="flex justify-between text-[10px] text-gray-700">
                                    <span>Amount Paid:</span>
                                    <span>{formatPHP(order.total_paid || order.net_payable)}</span>
                                </div>
                            ) : (
                                <div className="flex justify-between text-[10px] font-bold text-gray-900 bg-gray-200 p-1 rounded mt-1">
                                    <span>DUE ON PICKUP:</span>
                                    <span>{formatPHP(order.net_payable)}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer / Claim Notice */}
                        <div className="pt-2 text-center text-[9px] text-gray-600 space-y-1">
                            <p className="font-bold uppercase text-black">Please present this ticket upon pickup.</p>
                            <p>Unclaimed items after 30 days are subject to storage fees.</p>
                            <p className="pt-1 font-mono text-[8px] text-gray-500">Powered by Rinset</p>
                        </div>
                    </div>
                </div>

                {/* Modal Print Button */}
                <div className="p-4 border-t border-slate-800 bg-slate-900 print:hidden flex space-x-2">
                    <button
                        onClick={handlePrint}
                        className="flex-1 h-12 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg transition"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print 58mm Receipt</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}