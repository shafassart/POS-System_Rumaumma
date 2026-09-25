import React, { useState } from "react";
import type { Order, MenuItem, PaymentMethod } from "../types/index";
import { TableCard } from "../components/TableCard";
import { OrderModal } from "../components/OrderModal";
import { PaymentModal } from "../components/PaymentModal";
import { ReceiptModal } from "../components/ReceiptModal";
import { Plus, ShoppingBag, Utensils } from "lucide-react";

interface KasirPageProps {
  orders: Order[];
  menuList: MenuItem[];
  onSaveOrder: (newOrder: Order) => void;
  onCompletePayment: (
    orderId: string,
    paymentMethod: PaymentMethod,
    cash: number,
    change: number,
  ) => void;
}

export const KasirPage: React.FC<KasirPageProps> = ({
  orders,
  menuList,
  onSaveOrder,
  onCompletePayment,
}) => {
  const [orderModal, setOrderModal] = useState<{
    tableNumber: number;
    activeOrder?: Order;
  } | null>(null);
  const [activeOrderToPay, setActiveOrderToPay] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const tables = [1, 2, 3, 4, 5, 6, 7];

  // Hitung Statistik & Filter Takeaway
  const activeOrders = orders.filter((o) => o.status !== "SELESAI");
  const occupiedTablesCount = activeOrders.filter(
    (o) => o.tableNumber > 0,
  ).length;
  const takeawayOrders = activeOrders.filter((o) => o.tableNumber === 0);

  const handleFinishPayment = (
    orderId: string,
    paymentMethod: PaymentMethod,
    cash: number,
    change: number,
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      const updatedOrder: Order = {
        ...targetOrder,
        status: "SELESAI",
        paymentMethod,
        cashAmount: cash,
        changeAmount: change,
      };
      onCompletePayment(orderId, paymentMethod, cash, change);
      setActiveOrderToPay(null);
      setReceiptOrder(updatedOrder);
    }

  };

  return (
    <div className="space-y-6">
      {/* Header Title & Tombol Buat Pesanan */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-brand-dark">
            Layar Kasir & Pemesanan
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Kelola meja 1-7, catat pesanan baru, tambah menu pelanggan, dan
            proses pembayaran.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOrderModal({ tableNumber: 0 })}
          className="bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 w-fit"
        >
          <Plus size={16} />
          <span>Buat Pesanan Baru</span>
        </button>
      </div>

      {/* 3 Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
            📑
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">
              Total Pesanan Aktif
            </p>
            <h3 className="text-xl font-extrabold text-brand-dark">
              {activeOrders.length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            🍽️
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">
              Meja Terisi (1-7)
            </p>
            <h3 className="text-xl font-extrabold text-brand-dark">
              {occupiedTablesCount} / 7
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            🛍️
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Antrean Bungkus</p>
            <h3 className="text-xl font-extrabold text-brand-dark">
              {takeawayOrders.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Section 1: Antrean Pesanan Bungkus (Takeaway) - PASTI TAMPIL */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-brand-dark flex items-center gap-2">
          <ShoppingBag size={18} className="text-blue-600" />
          <span>Antrean Pesanan Bungkus (Takeaway)</span>
          <span className="text-xs text-gray-400 font-normal">
            (Dilengkapi nama pemesan agar tidak tertukar)
          </span>
        </h3>

        {takeawayOrders.length === 0 ? (
          /* Empty State Kartu Bungkus Kosong */
          <div className="bg-white/60 border-2 border-dashed border-gray-200/80 p-8 rounded-2xl text-center space-y-1">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto text-xl">
              🛍️
            </div>
            <h4 className="font-bold text-xs text-gray-600">
              Tidak ada antrean pesanan bungkus
            </h4>
            <p className="text-[11px] text-gray-400">
              Tekan "+ Pesanan Baru" lalu pilih Bungkus (Takeaway)
            </p>
          </div>
        ) : (
          /* Render Kartu Takeaway Aktif */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {takeawayOrders.map((order) => (
              <TableCard
                key={order.id}
                tableNumber={0}
                activeOrder={order}
                onSelectTable={(tableNumber, activeOrder) =>
                  setOrderModal({ tableNumber, activeOrder })
                }
                onOpenPayment={(ord) => setActiveOrderToPay(ord)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Denah Meja Makan di Tempat (Meja 1 s/d 7) */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-brand-dark flex items-center gap-2">
            <Utensils size={18} className="text-brand-primary" />
            <span>Denah Meja Makan di Tempat (Meja 1 s/d 7)</span>
          </h3>
          <span className="text-xs text-gray-400 font-medium">
            Total 7 Meja
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tables.map((tableNum) => {
            const activeOrder = orders.find(
              (o) => o.tableNumber === tableNum && o.status !== "SELESAI",
            );

            return (
              <TableCard
                key={tableNum}
                tableNumber={tableNum}
                activeOrder={activeOrder}
                onSelectTable={(tableNumber, activeOrder) =>
                  setOrderModal({ tableNumber, activeOrder })
                }
                onOpenPayment={(ord) => setActiveOrderToPay(ord)}
              />
            );
          })}
        </div>
      </div>

      {/* Modal Pemesanan */}
      {orderModal !== null && (
        <OrderModal
          tableNumber={orderModal.tableNumber}
          activeOrder={orderModal.activeOrder}
          occupiedTableNumbers={activeOrders
            .filter((order) => order.tableNumber > 0)
            .map((order) => order.tableNumber)}
          menuList={menuList.filter((item) => item.isAvailable)}
          onClose={() => setOrderModal(null)}
          onSaveOrder={onSaveOrder}
        />
      )}

      {/* Modal Pembayaran */}
      {activeOrderToPay && (
        <PaymentModal
          order={activeOrderToPay}
          onClose={() => setActiveOrderToPay(null)}
          onCompletePayment={handleFinishPayment}
        />
      )}

      {/* Modal Struk Kasir */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};

export default KasirPage;
