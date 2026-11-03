'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatPHP } from '@/lib/calculations';
import { Order } from '@/types/database';
import { Printer, X, CheckCircle } from 'lucide-react';

interface ReceiptModalProps {
    order: Order | null;
    storeName: string;
    onClose: () => void;
}

export function ReceiptModal({ order, storeName, onClose }: ReceiptModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    if (!order) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
                {/* Modal Action Bar (Hidden when printing) */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center print:hidden">
                    <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span className="font-bold text-white text-sm">Receipt & Basket Tag</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 58mm Thermal Printable Canvas */}
                <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950">
                    <div
                        ref={printRef}
                        className="w-[58mm] bg-white text-black p-3 font-mono text-[11px] leading-tight rounded-sm shadow-md print:w-[58mm] print:shadow-none print:m-0"
                    >
                        {/* Header */}
                        <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-black">
                            <h2 className="text-sm font-black tracking-wider uppercase">{storeName}</h2>
                            <p className="text-[10px]">Pangasinan Branch</p>
                            <p className="text-[10px]">{new Date(order.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
                        </div>

                        {/* Huge Basket Tag (For Attendants) */}
                        <div className="my-2 p-1.5 border-2 border-black text-center">
                            <span className="text-[9px] block uppercase font-bold">BASKET TAG</span>
                            <span className="text-xl font-black">{order.basket_tag}</span>
                        </div>

                        {/* Customer Details */}
                        <div className="py-1 text-[10px] space-y-0.5 border-b border-dashed border-black">
                            <div>Order: <strong>#{order.order_number}</strong></div>
                            <div>Customer: {order.customer?.full_name || 'Walk-in'}</div>
                            <div>Mobile: {order.customer?.mobile_number || 'N/A'}</div>
                        </div>

                        {/* Line Items */}
                        <div className="py-2 border-b border-dashed border-black space-y-1">
                            {order.items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start">
                                    <div className="flex-1 pr-1">
                                        <div>{item.item_name}</div>
                                        <span className="text-[9px] text-gray-600">
                      {item.quantity} {item.pricing_type === 'per_kilo' ? 'kg' : 'pc'} @ {formatPHP(item.unit_price)}
                    </span>
                                    </div>
                                    <span className="font-bold">{formatPHP(item.item_total)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Financial Summary */}
                        <div className="py-2 space-y-0.5 text-right border-b border-dashed border-black">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatPHP(order.subtotal)}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div className="flex justify-between">
                                    <span>Discount:</span>
                                    <span>-{formatPHP(order.discount_amount)}</span>
                                </div>
                            )}
                            {order.rush_fee > 0 && (
                                <div className="flex justify-between">
                                    <span>Rush Fee:</span>
                                    <span>+{formatPHP(order.rush_fee)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
                                <span>TOTAL:</span>
                                <span>{formatPHP(order.net_payable)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-700">
                                <span>Payment:</span>
                                <span className="uppercase font-semibold">{order.payment_status}</span>
                            </div>
                        </div>

                        {/* QR Code for Rapid Scanning at Pickup */}
                        <div className="pt-3 flex flex-col items-center justify-center space-y-1">
                            <QRCodeSVG value={order.order_number} size={85} level="M" />
                            <span className="text-[8px] text-gray-600">Scan to track or claim</span>
                        </div>

                        {/* Footer Notice */}
                        <div className="text-[8px] text-center text-gray-600 pt-2 border-t border-dashed border-black mt-2">
                            Salamat po sa inyong tiwala!
                            <br />Unclaimed clothes after 30 days are subject to disposal.
                        </div>
                    </div>
                </div>

                {/* Bottom Print Buttons */}
                <div className="p-4 border-t border-slate-800 bg-slate-900 print:hidden flex space-x-2">
                    <button
                        onClick={handlePrint}
                        className="flex-1 h-12 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg transition"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print Receipt & Tag</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}