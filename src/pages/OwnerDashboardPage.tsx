import React, { useMemo, useState } from 'react';
import { ImagePlus, Printer, Save } from 'lucide-react';
import type { BusinessProfile, Order } from '../types/index';
import { getOrderDate, formatOrderDate } from '../utils/orderDate';
import { isImageSource } from '../utils/imageSource';

interface OwnerDashboardPageProps {
    profile: BusinessProfile;
    orders: Order[];
    onSaveProfile: (profile: BusinessProfile, logoFile?: File) => Promise<void>;
}

type SalesFilter = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';

const filterLabels: Record<SalesFilter, string> = {
    TODAY: 'Hari Ini',
    WEEK: 'Minggu Ini',
    MONTH: 'Bulan Ini',
    YEAR: 'Tahun Ini',
};

function isInPeriod(createdAt: string, filter: SalesFilter) {
    const date = getOrderDate({ createdAt });
    if (date.getTime() === 0) return false;
    const now = new Date();
    if (filter === 'TODAY') {
        return date.toDateString() === now.toDateString();
    }
    if (filter === 'WEEK') {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return date >= start;
    }
    if (filter === 'MONTH') {
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    return date.getFullYear() === now.getFullYear();
}

export const OwnerDashboardPage: React.FC<OwnerDashboardPageProps> = ({
    profile,
    orders,
    onSaveProfile,
}) => {
    const [draft, setDraft] = useState(profile);
    const [filter, setFilter] = useState<SalesFilter>('TODAY');
    const [logoFile, setLogoFile] = useState<File>();
    const [profileMessage, setProfileMessage] = useState('');
    const [profileError, setProfileError] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    const completedOrders = useMemo(() => orders.filter((order) => order.status === 'SELESAI'), [orders]);
    const filteredOrders = completedOrders.filter((order) => isInPeriod(order.createdAt, filter));
    const total = filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    const handleLogo = (file: File | undefined) => {
        if (!file) return;
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
            setProfileError(true);
            setProfileMessage('Pilih file gambar berukuran maksimal 5 MB.');
            return;
        }
        setLogoFile(file);
        setProfileError(false);
        setProfileMessage('');
        const reader = new FileReader();
        reader.onload = () => setDraft((current) => ({ ...current, logo: String(reader.result) }));
        reader.onerror = () => {
            setProfileError(true);
            setProfileMessage('Preview logo gagal dibaca.');
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        setProfileError(false);
        setProfileMessage('');
        try {
            await onSaveProfile(draft, logoFile);
            setLogoFile(undefined);
            setProfileMessage('Profil restoran berhasil disimpan.');
        } catch (error) {
            console.error('Gagal menyimpan profil restoran:', error);
            setProfileError(true);
            setProfileMessage(error instanceof Error ? error.message : 'Gagal menyimpan profil restoran.');
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-blue-100 p-5 shadow-2xs">
                <h2 className="text-xl font-extrabold text-brand-dark">Profil Restoran</h2>
                <p className="mt-1 text-xs text-gray-500">Atur nama, logo, dan slogan yang tampil di seluruh aplikasi.</p>
                <div className="mt-5 grid gap-4 md:grid-cols-[auto_1fr]">
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-blue-50 text-4xl">
                            {isImageSource(draft.logo) ? <img src={draft.logo} alt="Preview logo" className="h-full w-full object-cover" /> : draft.logo}
                        </div>
                        <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700">
                            <ImagePlus size={14} /> Upload logo
                            <input type="file" accept="image/*" className="hidden" onChange={(event) => handleLogo(event.target.files?.[0])} />
                        </label>
                    </div>
                    <div className="space-y-3">
                        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nama restoran" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
                        <input value={draft.slogan} onChange={(event) => setDraft({ ...draft, slogan: event.target.value })} placeholder="Slogan restoran" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
                        <button type="button" disabled={savingProfile} onClick={() => void handleSaveProfile()} className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-extrabold text-white hover:bg-brand-primary/90 disabled:opacity-60">
                            <Save size={14} /> {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                        </button>
                        {profileMessage && <p role={profileError ? 'alert' : 'status'} className={`text-xs ${profileError ? 'text-red-600' : 'text-emerald-700'}`}>{profileMessage}</p>}
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-3xl border border-blue-100 p-5 shadow-2xs">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-xl font-extrabold text-brand-dark">Dashboard Penjualan</h2>
                        <p className="mt-1 text-xs text-gray-500">Cetak seluruh transaksi selesai berdasarkan periode pilihan.</p>
                    </div>
                    <button type="button" onClick={() => window.print()} className="flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-blue-700">
                        <Printer size={14} /> Cetak Transaksi
                    </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                    {(Object.keys(filterLabels) as SalesFilter[]).map((key) => (
                        <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-xl px-3 py-2 text-xs font-extrabold ${filter === key ? 'bg-brand-primary text-white' : 'bg-blue-50 text-blue-700'}`}>
                            {filterLabels[key]}
                        </button>
                    ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-blue-50 p-4"><p className="text-[11px] font-bold text-blue-600">Periode</p><p className="font-black text-blue-950">{filterLabels[filter]}</p></div>
                    <div className="rounded-2xl bg-blue-50 p-4"><p className="text-[11px] font-bold text-blue-600">Transaksi</p><p className="font-black text-blue-950">{filteredOrders.length}</p></div>
                    <div className="col-span-2 rounded-2xl bg-blue-50 p-4 md:col-span-1"><p className="text-[11px] font-bold text-blue-600">Total Omset</p><p className="font-black text-blue-950">Rp {total.toLocaleString('id-ID')}</p></div>
                </div>
                <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-blue-100 text-blue-800"><tr><th className="px-2 py-2">ID</th><th className="px-2 py-2">Waktu</th><th className="px-2 py-2">Meja</th><th className="px-2 py-2">Pembayaran</th><th className="px-2 py-2 text-right">Total</th></tr></thead>
                        <tbody>
                            {filteredOrders.map((order) => <tr key={order.id} className="border-b border-gray-100"><td className="px-2 py-2 font-bold">{order.id}</td><td className="px-2 py-2">{formatOrderDate(order)}</td><td className="px-2 py-2">{order.tableNumber === 0 ? 'Bungkus' : `Meja ${order.tableNumber}`}</td><td className="px-2 py-2">{order.paymentMethod || 'Tunai'}</td><td className="px-2 py-2 text-right font-black">Rp {order.totalPrice.toLocaleString('id-ID')}</td></tr>)}
                        </tbody>
                    </table>
                    {filteredOrders.length === 0 && <p className="py-6 text-center text-xs text-gray-400">Belum ada transaksi pada periode ini.</p>}
                </div>
            </section>
        </div>
    );
};
