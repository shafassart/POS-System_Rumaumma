import React, { useState } from "react";
import type { Order, MenuItem, OrderItem } from "../types/index";
import { supabase } from "../utils/supabaseClient";
import { isImageSource } from "../utils/imageSource";
import {
  X,
  Search,
  ShoppingBag,
  Utensils,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";
interface OrderModalProps {
  tableNumber: number;
  activeOrder?: Order;
  occupiedTableNumbers: number[];
  menuList: MenuItem[];
  onClose: () => void;
  onSaveOrder: (newOrder: Order) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  tableNumber,
  activeOrder,
  occupiedTableNumbers,
  menuList,
  onClose,
  onSaveOrder,
}) => {
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">(
    activeOrder
      ? activeOrder.orderType
      : tableNumber === 0
        ? "TAKEAWAY"
        : "DINE_IN",
  );
  const [selectedTable, setSelectedTable] = useState<number | null>(
    tableNumber === 0 ? null : tableNumber,
  );
  const [customerName, setCustomerName] = useState<string>(
    activeOrder?.customerName || "",
  );
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [cart, setCart] = useState<OrderItem[]>(
    activeOrder ? [...activeOrder.items] : [],
  );
  const [tableError, setTableError] = useState("");
  const [customerNameError, setCustomerNameError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const tables = [1, 2, 3, 4, 5, 6, 7];
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter Menu
  const filteredMenu = menuList.filter((item) => {
    const matchCategory =
      selectedCategory === "Semua" ? true : item.category === selectedCategory;
    const matchSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Total Belanja
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Helper untuk mendapatkan qty item di keranjang
  const getItemQtyInCart = (menuId: string): number => {
    const found = cart.find((i) => i.menuId === menuId);
    return found ? found.qty : 0;
  };

  // Handlers Tambah / Update Qty
  const handleAddToCart = (menu: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuId === menu.id);
      if (existing) {
        return prev.map((i) =>
          i.menuId === menu.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          menuId: menu.id,
          name: menu.name,
          qty: 1,
          price: menu.price,
          notes: "",
          isCompleted: false,
        },
      ];
    });
  };

  const handleUpdateQty = (menuId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.menuId === menuId) {
              const newQty = item.qty + delta;
              return newQty > 0 ? { ...item, qty: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as OrderItem[],
    );
  };

  // Update Catatan Khusus Per-Item
  const handleItemNoteChange = (menuId: string, noteText: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.menuId === menuId ? { ...item, notes: noteText } : item,
      ),
    );
  };

  // Remove Item
  const handleRemoveItem = (menuId: string) => {
    setCart((prev) => prev.filter((i) => i.menuId !== menuId));
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    setErrorMessage("");
    setTableError("");
    setCustomerNameError("");

    let orderTableNumber: number;
    if (orderType === "DINE_IN") {
      if (selectedTable === null) {
        setTableError("Pilih nomor meja untuk pesanan makan di tempat.");
        return;
      }
      orderTableNumber = selectedTable;
    } else {
      orderTableNumber = 0;
    }

    const trimmedCustomerName = customerName.trim();
    if (orderType === "TAKEAWAY" && !trimmedCustomerName) {
      setCustomerNameError("Nama wajib diisi untuk pesanan takeaway.");
      return;
    }

    if (
      orderType === "DINE_IN" &&
      occupiedTableNumbers.includes(orderTableNumber) &&
      orderTableNumber !== activeOrder?.tableNumber
    ) {
      setTableError(
        `Meja ${orderTableNumber} sedang terisi. Pilih meja yang kosong.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: orderId, error: saveError } = await supabase.rpc(
        "save_pos_order",
        {
          p_order_id: activeOrder?.id ?? null,
          p_table_number: orderType === "TAKEAWAY" ? null : orderTableNumber,
          p_customer_name: trimmedCustomerName || null,
          p_order_type: orderType,
          p_total_price: totalPrice,
          p_items: cart.map((item) => ({
            id: item.id,
            menu_item_id: item.menuId,
            menu_name: item.name,
            unit_price: item.price,
            qty: item.qty,
            notes: item.notes || "",
          })),
        },
      );
      if (saveError || !orderId) {
        throw new Error(
          `Gagal menyimpan pesanan: ${saveError?.message ?? "ID pesanan kosong"}`,
        );
      }

      // Callback ke parent
      onSaveOrder({
        id: orderId,
        tableNumber: orderTableNumber,
        customerName: trimmedCustomerName || undefined,
        orderType,
        status: "DAPUR",
        items: cart,
        totalPrice,
        createdAt: activeOrder?.createdAt ?? new Date().toISOString(),
      });

      onClose();
    } catch (error) {
      console.error("Gagal menyimpan pesanan:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan pesanan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-7xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Modal */}
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📝</div>
            <div>
              <h2 className="text-lg font-extrabold text-brand-dark leading-tight">
                Buat Pesanan Baru
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                Pilih tipe pesanan (Makan di Tempat / Bungkus), pilih menu, dan
                kirim ke dapur.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {/* Detail Pesanan */}
          <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
              <div>
                <label className="text-[10px] font-bold text-gray-500 tracking-wider uppercase block mb-1.5">
                  TIPE PESANAN
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-gray-100/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType("DINE_IN");
                      setTableError("");
                      setCustomerNameError("");
                    }}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                      orderType === "DINE_IN"
                        ? "bg-brand-secondary text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Utensils size={15} />
                    <span>Dine-in</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType("TAKEAWAY");
                      setTableError("");
                      setCustomerNameError("");
                    }}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                      orderType === "TAKEAWAY"
                        ? "bg-brand-secondary text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <ShoppingBag size={15} />
                    <span>Takeaway</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(200px,0.55fr)] xl:items-start">
                {/* Nomor Meja */}
                {orderType === "DINE_IN" && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 tracking-wider uppercase block mb-1.5">
                      NOMOR MEJA <span className="text-red-600">*</span>
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {tables.map((num) =>
                        (() => {
                          const isOccupied =
                            occupiedTableNumbers.includes(num) &&
                            num !== activeOrder?.tableNumber;
                          return (
                            <button
                              key={num}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => {
                                setSelectedTable(num);
                                setTableError("");
                              }}
                              className={`py-1.5 px-1 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                                isOccupied
                                  ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-60"
                                  : selectedTable === num
                                    ? "border-brand-dark bg-white ring-2 ring-brand-dark shadow-xs"
                                    : "border-gray-200 bg-white hover:bg-gray-50"
                              }`}
                            >
                              <span className="font-extrabold text-[11px] text-brand-dark">
                                M-{num}
                              </span>
                              <span
                                className={`text-[9px] block ${isOccupied ? "font-bold text-red-600" : "text-gray-400"}`}
                              >
                                {isOccupied ? "Terisi" : "Kosong"}
                              </span>
                            </button>
                          );
                        })(),
                      )}
                    </div>
                    {tableError && (
                      <p
                        role="alert"
                        className="mt-1.5 text-[11px] font-bold text-red-600"
                      >
                        {tableError}
                      </p>
                    )}
                  </div>
                )}

                {/* Nama Tamu */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 tracking-wider uppercase block mb-1.5">
                    NAMA PEMESAN (
                    {orderType === "TAKEAWAY" ? "WAJIB" : "OPSIONAL"})
                    {orderType === "TAKEAWAY" && (
                      <span className="text-red-600"> *</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setCustomerNameError("");
                    }}
                    required={orderType === "TAKEAWAY"}
                    aria-invalid={Boolean(customerNameError)}
                    placeholder="Contoh: Bpk. Hendra / Ibu Maya"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-brand-primary"
                  />
                  {customerNameError && (
                    <p
                      role="alert"
                      className="mt-1.5 text-[11px] font-bold text-red-600"
                    >
                      {customerNameError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu dan Ringkasan Pesanan */}
          <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-[minmax(0,0.9fr)_minmax(0,1.1fr)] overflow-hidden lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)] lg:grid-rows-1">
            <div className="min-h-0 overflow-y-auto border-r border-gray-100 p-4 sm:p-5">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <label className="text-xs font-bold text-gray-800 tracking-wider uppercase">
                    PILIH MENU
                  </label>
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari menu..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-brand-primary"
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {[
                    { label: "Semua", icon: "" },
                    { label: "Makanan", icon: "🍲" },
                    { label: "Minuman", icon: "🧃" },
                    { label: "Camilan", icon: "🍟" },
                  ].map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setSelectedCategory(cat.label)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                        selectedCategory === cat.label
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {cat.icon && <span>{cat.icon}</span>}
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Grid Cards Menu */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {filteredMenu.map((menu) => {
                    const itemQty = getItemQtyInCart(menu.id);

                    return (
                      <div
                        key={menu.id}
                        className="border border-gray-200/90 rounded-2xl p-2.5 bg-white flex flex-col justify-between hover:border-brand-secondary/60 transition shadow-2xs"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            {isImageSource(menu.icon) ? (
                              <img
                                src={menu.icon}
                                alt=""
                                className="h-10 w-10 rounded-xl object-cover"
                              />
                            ) : (
                              <span className="text-2xl">{menu.icon}</span>
                            )}
                            <span className="bg-orange-100/70 text-brand-secondary font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-orange-200/60">
                              Rp {menu.price.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-xs text-brand-dark mt-2 leading-snug">
                            {menu.name}
                          </h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                            Menu spesial andalan Ruma Umma...
                          </p>
                        </div>

                        {/* Dynamic Button / Counter */}
                        <div className="mt-3 pt-2 border-t border-gray-100/80">
                          {itemQty === 0 ? (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(menu)}
                              className="w-full bg-[#1C1C1E] hover:bg-black text-white font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <span>+ Tambah</span>
                            </button>
                          ) : (
                            /* Stepper Counter saat Item di-select */
                            <div className="flex items-center justify-between bg-gray-100/80 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(menu.id, -1)}
                                className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-gray-700 font-bold hover:bg-gray-200 shadow-2xs transition"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="font-extrabold text-xs text-brand-dark px-2">
                                {itemQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(menu)}
                                className="w-7 h-7 flex items-center justify-center bg-brand-secondary hover:bg-brand-secondary/90 text-white rounded-lg font-bold shadow-2xs transition"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Ringkasan Pesanan */}
            <div className="min-h-0 flex flex-col bg-gray-50/50 p-4 sm:p-5 border-t border-gray-100 lg:border-t-0 lg:border-l">
              <div className="flex shrink-0 justify-between items-center border-b border-gray-200/80 pb-3">
                <h3 className="font-extrabold text-xs text-gray-800 tracking-wider uppercase">
                  RINGKASAN PESANAN
                </h3>
                <span className="text-[11px] font-medium text-gray-400">
                  {cart.length} item
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto py-3">
                {/* Cart Items List */}
                {cart.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="text-3xl text-gray-300">🛒</div>
                    <p className="text-xs text-gray-400 font-medium">
                      Belum ada menu yang dipilih.
                    </p>
                    <p className="text-[10px] text-gray-300">
                      Klik menu di samping untuk menambahkan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.menuId}
                        className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs space-y-1.5"
                      >
                        {/* Baris Atas: Nama, Harga, Counter & Remove Button */}
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-extrabold text-xs text-brand-dark leading-tight">
                              {item.name}
                            </h5>
                            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                              Rp {item.price.toLocaleString("id-ID")} x{" "}
                              {item.qty}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <div className="flex items-center space-x-1 bg-gray-100/80 p-0.5 rounded-lg">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.menuId, -1)}
                                className="w-5 h-5 flex items-center justify-center bg-white rounded text-gray-600 hover:bg-gray-200 shadow-2xs"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="text-xs font-extrabold px-1 text-brand-dark min-w-[14px] text-center">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.menuId, 1)}
                                className="w-5 h-5 flex items-center justify-center bg-white rounded text-gray-600 hover:bg-gray-200 shadow-2xs"
                              >
                                <Plus size={10} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.menuId)}
                              className="text-gray-400 hover:text-red-500 p-1 transition"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Baris Bawah: Input Catatan Khusus Per Item */}
                        <div>
                          <input
                            type="text"
                            value={item.notes || ""}
                            onChange={(e) =>
                              handleItemNoteChange(item.menuId, e.target.value)
                            }
                            placeholder="Catatan khusus (cth: pedas, tanpa es)..."
                            className="w-full px-2.5 py-1.5 text-[11px] bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-brand-primary text-gray-700"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Catatan Tambahan Umum untuk Dapur */}
                <div className="pt-3">
                  <label className="text-[11px] font-bold text-gray-700 block mb-1.5">
                    Catatan Tambahan untuk Dapur (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Contoh: jangan terlalu pedas, kuah dipisah, dsb..."
                    className="w-full p-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary resize-none"
                  />
                </div>
              </div>

              {/* Footer Summary & Submit Button */}
              <div className="shrink-0 pt-3 border-t border-gray-200/80 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700">
                    Estimasi Total Belanja:
                  </span>
                  <span className="text-lg font-extrabold text-brand-dark">
                    Rp {totalPrice.toLocaleString("id-ID")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSendToKitchen}
                  disabled={cart.length === 0 || isSubmitting}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5 ${
                    cart.length > 0
                      ? "bg-brand-secondary hover:bg-brand-secondary/90 text-white shadow-xs cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  <span>
                    {isSubmitting
                      ? "Menyimpan..."
                      : "🚀 Kirim Pesanan ke Dapur"}
                  </span>
                </button>
                {errorMessage && (
                  <p role="alert" className="text-xs text-red-600">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
