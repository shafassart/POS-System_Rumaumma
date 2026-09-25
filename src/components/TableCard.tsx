import React from 'react';
import type { Order } from '../types/index';
import { Plus, User, Clock } from 'lucide-react';

interface TableCardProps {
    tableNumber: number;
    activeOrder?: Order;
    onSelectTable: (tableNumber: number, activeOrder?: Order) => void;
    onOpenPayment?: (order: Order) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
    tableNumber,
    activeOrder,
    onSelectTable,
    onOpenPayment,
}) => {
    const isTakeaway = tableNumber === 0;

    // Render Jika Meja/Takeaway KOSONG
    if (!activeOrder) {
        return (
            <div
                onClick={() => onSelectTable(tableNumber)}
                className="cursor-pointer bg-white rounded-3xl border border-gray-200/90 p-5 shadow-2xs hover:border-brand-secondary hover:shadow-md transition flex flex-col justify-between min-h-[220px]"
            >
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-xl bg-black text-white font-extrabold text-sm flex items-center justify-center">
                                {isTakeaway ? '🛍️' : tableNumber}
                            </span>
                            <div>
                                <h4 className="font-extrabold text-sm text-brand-dark leading-tight">
                                    {isTakeaway ? 'Bungkus (Takeaway)' : `Meja ${tableNumber}`}
                                </h4>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {isTakeaway ? 'Pesanan Bawa Pulang' : 'Lantai Utama'}
                                </span>
                            </div>
                        </div>

                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ● Kosong
                        </span>
                    </div>

                    <div className="my-6 text-center space-y-1">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-lg">
                            🍽️
                        </div>
                        <p className="font-bold text-xs text-gray-700">Meja Siap Ditempati</p>
                        <p className="text-[10px] text-gray-400">Kapasitas: 4 Orang</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectTable(tableNumber);
                    }}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1"
                >
                    <span>+ Buka Pesanan {isTakeaway ? 'Bungkus' : `Meja ${tableNumber}`}</span>
                </button>
            </div>
        );
    }

    // Render Jika ADA PESANAN AKTIF (Sesuai Gambar Referensi)
    return (
        <div
            className={`rounded-3xl border-2 p-4 shadow-sm transition flex flex-col justify-between relative overflow-hidden bg-amber-50/20 ${isTakeaway ? 'border-brand-secondary/80' : 'border-amber-300'
                }`}
        >
            {/* Garis Accent Atas Kartu */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-secondary"></div>

            <div className="space-y-3 pt-1">
                {/* Header Kartu */}
                {isTakeaway ? (
                    /* Header Kartu Takeaway */
                    <div className="flex justify-between items-center">
                        <span className="bg-brand-secondary text-white font-extrabold text-[11px] px-3 py-1 rounded-2xl shadow-xs flex items-center gap-1.5 tracking-wide">
                            🛍️ BUNGKUS / TAKEAWAY
                        </span>
                        <span className="text-xs font-bold text-gray-700">
                            #{activeOrder.id.slice(-7).toUpperCase()}
                        </span>
                    </div>
                ) : (
                    /* Header Kartu Meja */
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2.5">
                            <span className="w-9 h-9 rounded-2xl bg-black text-white font-extrabold text-sm flex items-center justify-center shadow-2xs">
                                {tableNumber}
                            </span>
                            <div>
                                <h4 className="font-extrabold text-base text-brand-dark leading-tight">
                                    Meja {tableNumber}
                                </h4>
                                <p className="text-[11px] text-gray-400 font-medium">Lantai Utama</p>
                            </div>
                        </div>

                        {/* Status Badge Oval Warm Cream */}
                        <span className="bg-amber-100/70 text-amber-900 border border-amber-200/80 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 text-right">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>
                                Dapur Memasak ({activeOrder.items.reduce((s, i) => s + i.qty, 0)} item)
                            </span>
                        </span>
                    </div>
                )}

                {/* Baris Kode & Indikator Waktu */}
                <div className="flex justify-between items-center text-xs text-gray-500 pt-0.5">
                    {!isTakeaway && (
                        <span className="font-bold text-gray-700">
                            #{activeOrder.id.slice(-7).toUpperCase()}
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-gray-400 ml-auto">
                        <Clock size={12} /> Baru saja
                    </span>
                </div>

                {/* Nama Pemesan / Tamu Badge */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 font-semibold">
                        {isTakeaway ? 'Nama Pemesan:' : ''}
                    </span>
                    <span className="bg-purple-100/80 text-purple-950 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 border border-purple-200/60">
                        <User size={13} className="text-purple-700" />
                        <span>
                            {activeOrder.customerName ||
                                (isTakeaway ? 'Pelanggan' : `Tamu Meja ${tableNumber}`)}
                        </span>
                    </span>
                </div>

                {/* Box Daftar Items Pesanan */}
                <div className="bg-white/90 border border-gray-100 rounded-2xl p-3 space-y-2 shadow-2xs">
                    {activeOrder.items.map((item) => (
                        <div
                            key={item.id}
                            className="flex justify-between items-center text-xs text-brand-dark"
                        >
                            <span className="font-semibold">
                                <span className="text-brand-secondary font-bold mr-1.5">
                                    {item.qty}x
                                </span>
                                {item.name}
                            </span>

                            <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                ⏳ Dimasak
                            </span>
                        </div>
                    ))}
                </div>

                {/* Total Belanja */}
                <div className="flex justify-between items-center pt-1 border-t border-gray-200/60">
                    <span className="text-xs font-bold text-gray-500">
                        {isTakeaway ? 'Total Belanja:' : 'Total Tagihan:'}
                    </span>
                    <span className="text-lg font-black text-brand-dark">
                        Rp {activeOrder.totalPrice.toLocaleString('id-ID')}
                    </span>
                </div>
            </div>

            {/* Tombol Action Bawah (Tambah Menu & Bayar) */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 mt-2">
                <button
                    type="button"
                    onClick={() => onSelectTable(tableNumber, activeOrder)}
                    className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold text-xs py-2.5 px-3 rounded-2xl transition flex items-center justify-center gap-1 shadow-2xs"
                >
                    <Plus size={14} className="text-purple-600" />
                    <span>Tambah Menu</span>
                </button>

                <button
                    type="button"
                    onClick={() =>
                        onOpenPayment ? onOpenPayment(activeOrder) : onSelectTable(tableNumber)
                    }
                    className="bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold text-xs py-2.5 px-3 rounded-2xl transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                    <span>💵 Bayar</span>
                </button>
            </div>
        </div>
    );
};
