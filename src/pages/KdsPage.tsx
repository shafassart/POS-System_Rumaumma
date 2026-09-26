import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import type { Order, OrderStatus, MenuItem } from "../types/index";
import { isImageSource } from "../utils/imageSource";
import { Volume2, VolumeX, CheckCircle2, TimerIcon } from "lucide-react";

interface KdsPageProps {
  orders: Order[];
  menuList?: MenuItem[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onToggleItemComplete: (orderId: string, itemId: string) => void;
}

// Helper untuk format waktu relatif (misal: "15 mnt lalu")
const getElapsedTime = (createdAtStr?: string) => {
  if (!createdAtStr) return "Baru saja";

  const now = new Date().getTime();
  const created = new Date(createdAtStr).getTime();
  const diffInMinutes = Math.floor((now - created) / (1000 * 60));

  if (diffInMinutes < 1) return "Baru saja";
  if (diffInMinutes < 60) return `${diffInMinutes} mnt lalu`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  return `${diffInHours} jam lalu`;
};

export const KdsPage: React.FC<KdsPageProps> = ({
  orders,
  menuList = [],
  onUpdateOrderStatus,
  onToggleItemComplete,
}) => {
  const [hideCompletedItems, setHideCompletedItems] = useState<boolean>(true);
  const [isSoundActive, setIsSoundActive] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Komponen kecil agar interval timer berjalan independen tiap tiket
  const KdsTimerBadge: React.FC<{ createdAt?: string }> = ({ createdAt }) => {
    const [timeAgo, setTimeAgo] = useState<string>(getElapsedTime(createdAt));

    useEffect(() => {
      if (!createdAt) return;

      setTimeAgo(getElapsedTime(createdAt));
      const interval = setInterval(() => {
        setTimeAgo(getElapsedTime(createdAt));
      }, 30000); // Re-calculate tiap 30 detik

      return () => clearInterval(interval);
    }, [createdAt]);

    return (
      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
        ⏱️ {timeAgo}
      </span>
    );
  };

  // Ambil pesanan yang belum selesai
  const activeOrders = orders.filter((o) => o.status !== "SELESAI");

  // Rekap Otomatis per Jenis Makanan / Minuman
  const kitchenSummary = activeOrders.reduce(
    (acc, order) => {
      order.items.forEach((item) => {
        // Jika disetting hideCompleted, abaikan yang sudah dicentang selesai
        if (hideCompletedItems && item.isCompleted) return;

        if (!acc[item.name]) {
          const menuItem = menuList.find((m) => m.name === item.name);
          acc[item.name] = {
            qty: 0,
            category: menuItem?.category || "Makanan",
            icon: menuItem?.icon || "🍲",
            sources: [],
          };
        }

        acc[item.name].qty += item.qty;
        const sourceLabel =
          order.tableNumber === 0
            ? `Bungkus (${order.customerName || "cca"})`
            : `Meja ${order.tableNumber}`;
        acc[item.name].sources.push(`${sourceLabel} (${item.qty}x)`);
      });
      return acc;
    },
    {} as Record<
      string,
      { qty: number; category: string; icon: string; sources: string[] }
    >,
  );

  // Total Porsi Masakan
  const totalPorsi = Object.values(kitchenSummary).reduce(
    (sum, item) => sum + item.qty,
    0,
  );

  const categoryOrder = ["Makanan", "Minuman", "Camilan"];
  const categorySummary = categoryOrder
    .map((category) => ({
      category,
      items: Object.entries(kitchenSummary).filter(
        ([, details]) => details.category === category,
      ),
    }))
    .filter(({ items }) => items.length > 0);

  // Efek Suara Bell
  const playBellSound = () => {
    if (!isSoundActive) return;
    try {
      const audioCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + 0.8,
      );
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {
      // Audio fallback
    }
  };

  // Handle Selesaikan Semua Item di Tiket
  //   const handleCompleteAllInTicket = (order: Order) => {
  //     order.items.forEach((item) => {
  //       if (!item.isCompleted) {
  //         onToggleItemComplete(order.id, item.id);
  //       }
  //     });
  //     onUpdateOrderStatus(order.id, "SIAP");
  //     playBellSound();
  //   };

  // 1. Centang Selesai per Item
  const handleToggleItemComplete = async (
    orderId: string,
    itemId: string,
    currentStatus: boolean,
  ) => {
    setErrorMessage("");
    const { error } = await supabase.rpc("set_pos_item_completed", {
      p_item_id: itemId,
      p_is_completed: !currentStatus,
    });
    if (error) {
      setErrorMessage(`Gagal memperbarui status item: ${error.message}`);
      return;
    }
    onToggleItemComplete(orderId, itemId);
    playBellSound();
  };

  const handleCompleteAllInTicket = async (order: Order) => {
    setErrorMessage("");
    const { error } = await supabase.rpc("complete_pos_kitchen_order", {
      p_order_id: order.id,
    });
    if (error) {
      setErrorMessage(`Gagal menyelesaikan tiket pesanan: ${error.message}`);
      return;
    }

    order.items
      .filter((item) => !item.isCompleted)
      .forEach((item) => onToggleItemComplete(order.id, item.id));
    onUpdateOrderStatus(order.id, "SIAP");
    playBellSound();
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-xs text-red-700"
        >
          {errorMessage}
        </p>
      )}
      {/* Top Banner Header KDS Hitam */}
      <div className="bg-brand-secondary backdrop-blur-sm text-white p-4 sm:p-5 rounded-3xl shadow-md flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">👨‍🍳</div>
          <div>
            <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
              Layar Dapur Ruma Umma (KDS)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Urutan FIFO (First In First Out)
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              • Masakan pertama masuk berada
              paling awal
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              • Ceklis item yang sudah matang.
            </p>
          </div>
        </div>

        {/* Controls Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center space-x-2 inset-0 bg-black/25 backdrop-blur-sm px-3 py-2 rounded-2xl text-xs font-bold text-gray-200 cursor-pointer border border-blue-700/60">
            <input
              type="checkbox"
              checked={hideCompletedItems}
              onChange={(e) => setHideCompletedItems(e.target.checked)}
              className="rounded text-brand-secondary focus:ring-0"
            />
            <span>Sembunyikan menu yang sudah selesai</span>
          </label>

          <button
            type="button"
            onClick={() => setIsSoundActive(!isSoundActive)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-2xs ${
              isSoundActive
                ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/60"
                : "bg-zinc-800 text-gray-400 border border-zinc-700"
            }`}
          >
            {isSoundActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{isSoundActive ? " Bunyi Aktif" : "Mute"}</span>
          </button>
        </div>
      </div>

      {/* Rekap Kebutuhan Dapur (Tabel Summary Berdasarkan Jenis) */}
      <div className="bg-white p-5 rounded-3xl border border-blue-200/80 shadow-2xs space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="font-extrabold text-sm text-brand-dark">
                Rekap Kebutuhan Dapur (Total Masakan yang Harus Dibuat Sekarang)
              </h3>
              <p className="text-[11px] text-gray-400">
                Ringkasan otomatis seluruh masakan yang belum selesai dari semua
                meja & bungkus. Koki langsung tahu berapa porsi Brekele, Steak,
                dll yang harus dimasak sekaligus!
              </p>
            </div>
          </div>

          <span className="bg-blue-100/80 text-brand-secondary font-extrabold text-xs px-3.5 py-1.5 rounded-full border border-blue-200/60 shadow-2xs">
            {totalPorsi} Porsi Total
          </span>
        </div>

        {/* Grid Cards Rekap Item */}
        {Object.keys(kitchenSummary).length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400 font-medium">
            Semua pesanan masakan di dapur sudah selesai dibuat! 🎉
          </div>
        ) : (
          <div className="space-y-4">
            {categorySummary.map(({ category, items }) => {
              const categoryTotal = items.reduce(
                (sum, [, details]) => sum + details.qty,
                0,
              );
              return (
                <section key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                      {category}
                    </h4>
                    <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                      {categoryTotal} Porsi
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(([itemName, details]) => (
                      <div
                        key={itemName}
                        className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3.5 flex justify-between items-center shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isImageSource(details.icon) ? (
                            <img
                              src={details.icon}
                              alt=""
                              className="h-10 w-10 rounded-xl object-cover"
                            />
                          ) : (
                            <span className="text-2xl">{details.icon}</span>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs text-brand-dark">
                              {itemName}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                              {details.sources.join(", ")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right pl-2">
                          <span className="font-black text-lg text-brand-dark block leading-none">
                            {details.qty}
                          </span>
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mt-0.5">
                            PORSI
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Antrean Tiket Pesanan (FIFO) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-sm text-brand-dark flex items-center gap-2">
            <span>📋</span>
            <span>Antrean Tiket Pesanan (First In First Out)</span>
          </h3>
          <span className="text-xs text-gray-400 font-medium">
            Tiket paling kiri adalah pesanan yang paling awal masuk
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white/60 border-2 border-dashed border-gray-200 p-12 rounded-3xl text-center space-y-2">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <h4 className="font-bold text-xs text-gray-700">
              Tidak Ada Pesanan Aktif
            </h4>
            <p className="text-[11px] text-gray-400">
              Dapur bersih! Menunggu pesanan baru dikirim dari kasir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map((order, idx) => {
              const completedCount = order.items.filter(
                (i) => i.isCompleted,
              ).length;
              const totalCount = order.items.length;
              const isAllDone = completedCount === totalCount;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-gray-200/90 p-4 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    {/* Baris 1: Index Tiket, Order ID, Indikator Waktu */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-brand-secondary text-white font-extrabold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-extrabold text-xs text-gray-700">
                          No. #{order.id.slice(-7).toUpperCase()}
                        </span>
                      </div>

                      <KdsTimerBadge createdAt={order.createdAt || (order as any).created_at} />
                    </div>

                    {/* Baris 2: Badge Lokasi & Nama Tamu */}
                    <div className="flex items-center gap-2">
                      {order.tableNumber === 0 ? (
                        <span className="bg-brand-secondary text-white font-extrabold text-[10px] px-2.5 py-1 rounded-xl shadow-2xs">
                          🛍️ BUNGKUS / TAKEAWAY
                        </span>
                      ) : (
                        <span className="bg-brand-secondary text-white font-extrabold text-[10px] px-2.5 py-1 rounded-xl">
                          MEJA {order.tableNumber}
                        </span>
                      )}

                      <span className="bg-amber-100/70 text-amber-900 border border-amber-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-xl flex items-center gap-1">
                        👤{" "}
                        {order.customerName ||
                          (order.tableNumber === 0
                            ? "Pelanggan"
                            : `Tamu Meja ${order.tableNumber}`)}
                      </span>
                    </div>

                    {/* Baris 3: List Checklist Items Masakan */}
                    <div className="space-y-2 pt-1">
                      {order.items.map((item) => {
                        if (hideCompletedItems && item.isCompleted) return null;

                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-2xl border transition flex justify-between items-center ${
                              item.isCompleted
                                ? "bg-gray-100 border-gray-200/80 text-gray-400"
                                : "bg-white border-gray-200/80 text-brand-dark"
                            }`}
                          >
                            <div className="pr-2">
                              <span className="font-bold text-xs">
                                <span className="bg-orange-100 text-brand-secondary font-extrabold px-1.5 py-0.5 rounded-md text-[10px] mr-1.5 border border-orange-200">
                                  {item.qty}x
                                </span>
                                {item.name}
                              </span>
                              {item.notes && (
                                <div className="text-[10px] text-gray-400 italic mt-0.5">
                                  Catatan: {item.notes}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                void handleToggleItemComplete(
                                  order.id,
                                  item.id,
                                  Boolean(item.isCompleted),
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs ${
                                item.isCompleted
                                  ? "bg-gray-200 text-gray-600"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              ✓ Selesai
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Action Tiket: Counter & Selesai Semua */}
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400">
                      {completedCount} / {totalCount} Selesai
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCompleteAllInTicket(order)}
                      className={`px-4 py-2 rounded-2xl text-xs font-extrabold text-white transition shadow-2xs ${
                        isAllDone
                          ? "bg-emerald-600 hover:bg-emerald-700 animate-pulse"
                          : "bg-black hover:bg-gray-800"
                      }`}
                    >
                      ✓ Selesai Semua
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KdsPage;
