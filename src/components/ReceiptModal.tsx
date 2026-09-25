import React from 'react';
import type { Order } from '../types/index';
import { X, Printer } from 'lucide-react';

interface ReceiptModalProps {
    order: Order;
    onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header Modal */}
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                        PRATINJAU STRUK KASIR
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-gray-400 hover:text-gray-700 flex items-center gap-1 transition"
                    >
                        <X size={14} /> Tutup
                    </button>
                </div>

                {/* Receipt Thermal Card Container */}
                <div className="p-5 bg-gray-50 flex justify-center">
                    <div
                        id="receipt-print-area"
                        className="w-full bg-white p-5 rounded-2xl border border-dashed border-gray-300 shadow-2xs font-mono text-xs text-gray-800 space-y-3"
                    >
                        {/* Header Toko */}
                        <div className="text-center space-y-0.5 border-b border-dashed border-gray-200 pb-3">
                            <h2 className="font-extrabold text-base tracking-wider text-black">
                                RUMA UMMA
                            </h2>
                            <p className="text-[10px] text-gray-500">Restoran Rumahan Hangat & Lezat</p>
                            <p className="text-[10px] text-gray-400 pt-1">Struk Pembayaran / Tagihan</p>
                        </div>

                        {/* Info Transaksi */}
                        <div className="space-y-1 text-[11px] border-b border-dashed border-gray-200 pb-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500">No. Order:</span>
                                <span className="font-bold">#{order.id.slice(-7).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tipe Pesanan:</span>
                                <span className="font-bold">
                                    {order.tableNumber === 0 ? '🛍️ BUNGKUS (TAKEAWAY)' : `MEJA ${order.tableNumber}`}
                                </span>
                            </div>
                            {order.customerName && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Pelanggan:</span>
                                    <span className="font-bold">{order.customerName}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Waktu:</span>
                                <span>{order.createdAt}</span>
                            </div>
                        </div>

                        {/* List Menu */}
                        <div className="space-y-2 border-b border-dashed border-gray-200 pb-3">
                            {order.items.map((it) => (
                                <div key={it.id} className="space-y-0.5">
                                    <div className="flex justify-between font-bold">
                                        <span>
                                            {it.qty}x {it.name}
                                        </span>
                                        <span>Rp {(it.price * it.qty).toLocaleString('id-ID')}</span>
                                    </div>
                                    {it.notes && (
                                        <div className="text-[10px] text-gray-400 italic">
                                            Catatan: {it.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Summary Tagihan & Pembayaran */}
                        <div className="space-y-1 text-[11px] pt-1">
                            <div className="flex justify-between font-extrabold text-sm text-black">
                                <span>TOTAL:</span>
                                <span>Rp {order.totalPrice.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Metode Bayar:</span>
                                <span className="font-bold uppercase">{order.paymentMethod || 'TUNAI'}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Bayar:</span>
                                <span>Rp {(order.cashAmount || order.totalPrice).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Kembalian:</span>
                                <span>Rp {(order.changeAmount || 0).toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {/* Footer Struk */}
                        <div className="text-center pt-3 border-t border-dashed border-gray-200 space-y-1">
                            <p className="font-bold text-[11px]">Terima kasih atas kunjungannya!</p>
                            <p className="text-[9px] text-gray-400 leading-tight">
                                Semoga harimu menyenangkan & selamat menikmati makanan dari Ruma Umma ❤️
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="flex-1 bg-black hover:bg-gray-800 text-white font-bold text-xs py-3 rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
                    >
                        <Printer size={15} />
                        <span>🖨️ Cetak Struk (Print)</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition"
                    >
                        Selesai
                    </button>
                </div>
            </div>
        </div>
    );
};