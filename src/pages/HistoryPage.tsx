import React, { useState } from 'react';
import type { Order, UserRole, MenuItem } from '../types/index';
import { ReceiptModal } from '../components/ReceiptModal';
import {
    Printer,
    RotateCcw,
    Clock,
    ChevronDown,
} from 'lucide-react';
import { getOrderDate } from '../utils/orderDate';

interface HistoryPageProps {
    orders: Order[];
    currentRole: UserRole;
    menuList?: MenuItem[];
    onResetHistory?: () => Promise<void>;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
    orders,
    currentRole,
    menuList = [],
    onResetHistory,
}) => {
    const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
    const [selectedMenuFilter, setSelectedMenuFilter] = useState<string>('ALL');
    const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
    const [resetError, setResetError] = useState('');

    const isOwner = currentRole === 'OWNER';

    // Filter transaksi yang sudah SELESAI
    const completedOrders = orders.filter((o) => {
        if (o.status !== 'SELESAI' || timeFilter === 'ALL') return o.status === 'SELESAI';
        const date = getOrderDate(o);
        if (date.getTime() === 0) return false;
        const now = new Date();
        if (timeFilter === 'TODAY') return date.toDateString() === now.toDateString();
        if (timeFilter === 'MONTH') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        if (timeFilter === 'YEAR') return date.getFullYear() === now.getFullYear();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return date >= start;
    });

    // Kalkulasi Stats Ringkasan
    const totalOmset = completedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalTransaksi = completedOrders.length;
    const totalPorsi = completedOrders.reduce(
        (sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.qty, 0),
        0
    );
    const averagePerStruk = totalTransaksi > 0 ? Math.round(totalOmset / totalTransaksi) : 0;

    // Hitung Ranking Menu Terlaris
    const menuStatsMap: Record<
        string,
        { name: string; qty: number; revenue: number; orderCount: number; category: string }
    > = {};

    completedOrders.forEach((order) => {
        order.items.forEach((item) => {
            if (!menuStatsMap[item.name]) {
                const foundMenu = menuList.find((m) => m.name === item.name);
                menuStatsMap[item.name] = {
                    name: item.name,
                    qty: 0,
                    revenue: 0,
                    orderCount: 0,
                    category: foundMenu?.category || 'Makanan',
                };
            }
            menuStatsMap[item.name].qty += item.qty;
            menuStatsMap[item.name].revenue += item.price * item.qty;
            menuStatsMap[item.name].orderCount += 1;
        });
    });

    // Filter & Urutkan Ranking (Ambil TOP 3 Terlaris)
    const rankedMenu = Object.values(menuStatsMap)
        .filter((item) => {
            const matchCategory =
                categoryFilter === 'Semua' ? true : item.category === categoryFilter;
            const matchMenu =
                selectedMenuFilter === 'ALL' ? true : item.name === selectedMenuFilter;
            return matchCategory && matchMenu;
        })
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3); // Dibatasi 3 Menu Terlaris

    const maxPorsi = rankedMenu.length > 0 ? rankedMenu[0].qty : 1;

    return (
        <div className="space-y-6">
            {/* Header Halaman & Tombol Reset (Hanya Owner) */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                    <h2 className="text-xl font-extrabold text-brand-dark flex items-center gap-2">
                        <span>📊</span> Laporan & Riwayat Penjualan
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Pantau total penjualan hari ini, minggu ini, dan tahun ini, ranking menu terlaris, filter menu spesifik, serta kontrol reset data.
                    </p>
                </div>

                {isOwner && onResetHistory && (
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm('Apakah Anda yakin ingin mereset seluruh riwayat penjualan?')) {
                                setResetError('');
                                void onResetHistory().catch((error: unknown) => {
                                    console.error('Gagal mereset riwayat:', error);
                                    setResetError(error instanceof Error ? error.message : 'Gagal mereset riwayat.');
                                });
                            }
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs px-4 py-2.5 rounded-2xl border border-red-200 transition flex items-center gap-1.5 w-fit"
                    >
                        <RotateCcw size={14} />
                        <span>Reset Riwayat</span>
                    </button>
                )}
            </div>
            {resetError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{resetError}</p>}

            {/* Notifikasi Reset */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 flex justify-between items-center text-xs text-amber-900 shadow-2xs">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-700" />
                    <span>
                        <strong>Notifikasi Reset:</strong> Terakhir di-reset pada{' '}
                        <strong>25 September 2026 pukul 02.38 WIB</strong> oleh{' '}
                        <u className="font-bold">Owner / Co-Owner</u>.
                    </span>
                </div>
                <span className="bg-amber-100/80 text-amber-800 font-extrabold px-2.5 py-0.5 rounded-lg border border-amber-200 text-[11px]">
                    Reset ke-3
                </span>
            </div>

            {/* Filter Waktu & Pill Summary Penjualan */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200/90 shadow-2xs flex flex-col md:flex-row justify-between md:items-center gap-3">
                {/* Time Segmented Control */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
                    {[
                        { id: 'ALL', label: '🌐 Semua Waktu' },
                        { id: 'TODAY', label: '📅 Hari Ini' },
                        { id: 'WEEK', label: '📅 Minggu Ini' },
                        { id: 'MONTH', label: '📅 Bulan Ini' },
                        { id: 'YEAR', label: '📅 Tahun Ini' },
                    ].map((tf) => (
                        <button
                            key={tf.id}
                            type="button"
                            onClick={() => setTimeFilter(tf.id as 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${timeFilter === tf.id
                                    ? 'bg-black text-white shadow-2xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                {/* Pill Omset Ringkasan (Tampil khusus untuk Owner / Keterangan Porsi untuk Staff) */}
                <div className="flex items-center gap-2 overflow-x-auto text-xs font-extrabold">
                    <span className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-2xl border border-emerald-200 whitespace-nowrap">
                        HARI INI: {isOwner ? `Rp ${totalOmset.toLocaleString('id-ID')}` : `${totalPorsi} Porsi`}
                    </span>
                    <span className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-2xl border border-blue-200 whitespace-nowrap">
                        MINGGU INI: {isOwner ? `Rp ${totalOmset.toLocaleString('id-ID')}` : `${totalPorsi} Porsi`}
                    </span>
                    <span className="bg-purple-50 text-purple-800 px-3 py-1.5 rounded-2xl border border-purple-200 whitespace-nowrap">
                        TAHUN INI: {isOwner ? `Rp ${totalOmset.toLocaleString('id-ID')}` : `${totalPorsi} Porsi`}
                    </span>
                </div>
            </div>

            {/* 4 Cards Stats Ringkasan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Omset (Hanya Owner) */}
                {isOwner && (
                    <div className="bg-white p-4 rounded-3xl border border-gray-200/90 shadow-2xs flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                            💰
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                                Total Omset
                            </p>
                            <h3 className="text-xl font-black text-emerald-700">
                                Rp {totalOmset.toLocaleString('id-ID')}
                            </h3>
                        </div>
                    </div>
                )}

                {/* Transaksi Selesai */}
                <div className="bg-white p-4 rounded-3xl border border-gray-200/90 shadow-2xs flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                        📑
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                            Transaksi Selesai
                        </p>
                        <h3 className="text-xl font-black text-brand-dark">
                            {totalTransaksi} Transaksi
                        </h3>
                    </div>
                </div>

                {/* Total Porsi Terjual */}
                <div className="bg-white p-4 rounded-3xl border border-gray-200/90 shadow-2xs flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl">
                        🍽️
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                            Total Porsi Terjual
                        </p>
                        <h3 className="text-xl font-black text-brand-dark">{totalPorsi} Porsi</h3>
                    </div>
                </div>

                {/* Rata-rata / Struk (Hanya Owner) */}
                {isOwner && (
                    <div className="bg-white p-4 rounded-3xl border border-gray-200/90 shadow-2xs flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
                            💳
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                                Rata-rata / Struk
                            </p>
                            <h3 className="text-xl font-black text-brand-dark">
                                Rp {averagePerStruk.toLocaleString('id-ID')}
                            </h3>
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Kategori & Dropdown Filter Menu */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200/90 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {[
                        { label: 'Semua', icon: '' },
                        { label: 'Makanan', icon: '🍲' },
                        { label: 'Minuman', icon: '🧃' },
                        { label: 'Camilan', icon: '🍟' },
                    ].map((cat) => (
                        <button
                            key={cat.label}
                            type="button"
                            onClick={() => setCategoryFilter(cat.label)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap ${categoryFilter === cat.label
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {cat.icon && <span>{cat.icon}</span>}
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 font-semibold whitespace-nowrap">
                        Filter Menu:
                    </span>
                    <div className="relative w-full sm:w-64">
                        <select
                            value={selectedMenuFilter}
                            onChange={(e) => setSelectedMenuFilter(e.target.value)}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 px-3 py-2 pr-8 rounded-xl font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-brand-primary cursor-pointer text-xs"
                        >
                            <option value="ALL">-- Semua Menu (Tampilkan Seluruhnya) --</option>
                            {menuList.map((m) => (
                                <option key={m.id} value={m.name}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={14}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                    </div>
                </div>
            </div>

            {/* Section Ranking Menu Terlaris (Top 3 Terlaris) */}
            <div className="space-y-3">
                <div>
                    <h3 className="font-extrabold text-sm text-brand-dark flex items-center gap-2">
                        <span>📊</span> Ranking Menu Terlaris (3 Terlaris)
                    </h3>
                    <p className="text-[11px] text-gray-400">
                        Menampilkan 3 menu paling laku terjual berdasarkan porsi dan pendapatan.
                    </p>
                </div>

                {rankedMenu.length === 0 ? (
                    <div className="bg-white/60 border-2 border-dashed border-gray-200 p-8 rounded-3xl text-center text-xs text-gray-400">
                        Belum ada data penjualan menu untuk kategori ini.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {rankedMenu.map((menu, idx) => {
                            const medalBadge =
                                idx === 0
                                    ? { label: '🥇 #1', bg: 'bg-amber-100 text-amber-800' }
                                    : idx === 1
                                        ? { label: '🥈 #2', bg: 'bg-slate-100 text-slate-800' }
                                        : { label: '🥉 #3', bg: 'bg-amber-50 text-amber-900' };

                            return (
                                <div
                                    key={menu.name}
                                    className="bg-white rounded-3xl border border-gray-200/90 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Header Ranking Card */}
                                        <div className="flex justify-between items-center mb-2">
                                            <span
                                                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg ${medalBadge.bg}`}
                                            >
                                                {medalBadge.label}
                                            </span>
                                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-orange-50 text-brand-secondary rounded-md border border-orange-200/60">
                                                {menu.category}
                                            </span>
                                        </div>

                                        <h4 className="font-black text-sm text-brand-dark leading-tight">
                                            {menu.name}
                                        </h4>

                                        {/* Stats Porsi & Omset Menu */}
                                        <div className="mt-3 space-y-1 text-xs">
                                            <div className="flex justify-between text-gray-500 font-medium">
                                                <span>Total Terjual:</span>
                                                <span className="font-extrabold text-brand-dark">
                                                    {menu.qty} Porsi
                                                </span>
                                            </div>

                                            {isOwner && (
                                                <div className="flex justify-between text-gray-500 font-medium">
                                                    <span>Omset Menu:</span>
                                                    <span className="font-black text-brand-primary">
                                                        Rp {menu.revenue.toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Progress Bar Porsi */}
                                        <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                                            <div
                                                className="bg-brand-secondary h-full rounded-full transition-all duration-300"
                                                style={{ width: `${(menu.qty / maxPorsi) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Footer Card Info */}
                                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-400">
                                        <span>{menu.orderCount} kali dipesan</span>
                                        <span className="font-bold text-brand-secondary cursor-pointer hover:underline">
                                            Lihat Transaksi 👉
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Section Daftar Struk Transaksi Selesai */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div>
                        <h3 className="font-extrabold text-sm text-brand-dark flex items-center gap-2">
                            <span>🧾</span> Daftar Struk Transaksi Selesai
                        </h3>
                        <p className="text-[11px] text-gray-400">
                            Rincian pesanan yang dapat dicetak ulang struk kasirnya.
                        </p>
                    </div>
                    <span className="text-xs font-bold text-gray-500">
                        {completedOrders.length} Transaksi
                    </span>
                </div>

                {completedOrders.length === 0 ? (
                    <p className="text-xs text-gray-400 py-8 text-center">
                        Belum ada riwayat transaksi selesai.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {completedOrders.map((order) => (
                            <div
                                key={order.id}
                                className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/40 flex flex-col md:flex-row justify-between md:items-center gap-3 hover:bg-gray-50 transition"
                            >
                                {/* Info Utama Pesanan */}
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="bg-black text-white font-black px-2 py-0.5 rounded-md text-[10px]">
                                            #{order.id.slice(-7).toUpperCase()}
                                        </span>

                                        {order.tableNumber === 0 ? (
                                            <span className="bg-brand-secondary text-white font-extrabold px-2 py-0.5 rounded-md text-[10px]">
                                                🛍️ BUNGKUS
                                            </span>
                                        ) : (
                                            <span className="bg-gray-200 text-gray-800 font-extrabold px-2 py-0.5 rounded-md text-[10px]">
                                                MEJA {order.tableNumber}
                                            </span>
                                        )}

                                        <span className="font-bold text-gray-700 flex items-center gap-1">
                                            👤 {order.customerName || (order.tableNumber === 0 ? 'Pelanggan' : `Tamu Meja ${order.tableNumber}`)}
                                        </span>

                                        <span className="text-gray-400 text-[10px]">
                                            ⏱️ {order.createdAt}
                                        </span>
                                    </div>

                                    {/* Chips Menu */}
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {order.items.map((item) => (
                                            <span
                                                key={item.id}
                                                className="bg-white border border-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded-lg text-[11px]"
                                            >
                                                {item.qty}x {item.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Sisi Kanan: Metode, Total & Tombol Cetak Struk */}
                                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-gray-200/60 pt-2 md:pt-0">
                                    <div className="text-left md:text-right">
                                        <span className="text-[10px] text-gray-400 block font-bold">
                                            Metode: <u className="uppercase font-extrabold text-gray-700">{order.paymentMethod || 'TUNAI'}</u>
                                        </span>
                                        <span className="font-black text-base text-brand-dark">
                                            Rp {order.totalPrice.toLocaleString('id-ID')}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedReceiptOrder(order)}
                                        className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-gray-800 text-xs font-extrabold transition shadow-2xs flex items-center gap-1.5"
                                    >
                                        <Printer size={14} />
                                        <span>Cetak Struk</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Preview Struk */}
            {selectedReceiptOrder && (
                <ReceiptModal
                    order={selectedReceiptOrder}
                    onClose={() => setSelectedReceiptOrder(null)}
                />
            )}
        </div>
    );
};

export default HistoryPage;