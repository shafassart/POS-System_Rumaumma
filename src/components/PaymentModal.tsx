import React, { useState } from "react";
import type { Order, PaymentMethod } from "../types/index";
import { supabase } from "../utils/supabaseClient";
import {
  X,
  Wallet,
  QrCode,
  CreditCard,
  Copy,
  Check,
  Loader2,
} from "lucide-react";

interface PaymentModalProps {
  order: Order;
  onClose: () => void;
  onCompletePayment: (
    orderId: string,
    paymentMethod: PaymentMethod,
    cashAmount: number,
    changeAmount: number,
  ) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  onClose,
  onCompletePayment,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
  const [cashGiven, setCashGiven] = useState<number>(order.totalPrice);
  const [notes, setNotes] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState("");

  const changeAmount =
    cashGiven >= order.totalPrice ? cashGiven - order.totalPrice : 0;

  const handleCopyRekening = () => {
    navigator.clipboard.writeText("1234567890");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  //   const handlePay = () => {
  //     onCompletePayment(
  //       order.id,
  //       selectedMethod,
  //       selectedMethod === "CASH" ? cashGiven : order.totalPrice,
  //       selectedMethod === "CASH" ? changeAmount : 0,
  //     );
  //   };

  const handlePay = async () => {
    setIsProcessing(true);
    setErrorMessage("");

    try {
      const amountReceived =
        selectedMethod === "CASH" ? cashGiven : order.totalPrice;
      const change = selectedMethod === "CASH" ? changeAmount : 0;

      const { error } = await supabase.rpc("complete_pos_order_payment", {
        p_order_id: order.id,
        p_method: selectedMethod,
        p_amount_received: amountReceived,
        p_change_amount: change,
        p_note: notes || null,
      });
      if (error) {
        throw new Error(`Pembayaran gagal: ${error.message}`);
      }

      onCompletePayment(order.id, selectedMethod, amountReceived, change);
    } catch (error) {
      console.error("Pembayaran gagal:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Pembayaran gagal diproses.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-base font-extrabold text-brand-dark leading-tight">
              Tagihan #{order.id.slice(-7).toUpperCase()}
            </h3>
            <p className="text-xs text-gray-400">
              Pilih metode pembayaran transaksi
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
              {errorMessage}
            </p>
          )}
          {/* 1. Pilih Metode Pembayaran */}
          <div>
            <label className="text-xs font-extrabold text-gray-800 tracking-wider uppercase block mb-2.5">
              PILIH METODE PEMBAYARAN:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "CASH", label: "Tunai (Cash)", icon: Wallet },
                { id: "QRIS", label: "QRIS", icon: QrCode },
                { id: "TRANSFER", label: "Transfer Bank", icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(m.id as PaymentMethod);
                      if (m.id !== "CASH") setCashGiven(order.totalPrice);
                    }}
                    className={`py-3 px-2 rounded-2xl border text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                      isSelected
                        ? "bg-amber-50/50 border-brand-secondary text-brand-secondary shadow-2xs ring-1 ring-brand-secondary"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tampilan Sesuai Metode Pembayaran */}
          <div className="bg-gray-50/60 border border-gray-200/80 rounded-2xl p-4">
            {/* TUNAI */}
            {selectedMethod === "CASH" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Uang Diterima (Rp):
                  </label>
                  <input
                    type="number"
                    value={cashGiven || ""}
                    onChange={(e) => setCashGiven(Number(e.target.value))}
                    className="w-full px-3 py-2 text-base font-extrabold text-brand-dark bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCashGiven(order.totalPrice)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-100"
                  >
                    Uang Pas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven(50000)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-100"
                  >
                    50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven(100000)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-100"
                  >
                    100.000
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs font-bold">
                  <span>Kembalian:</span>
                  <span
                    className={
                      changeAmount >= 0
                        ? "text-emerald-700 text-sm font-black"
                        : "text-red-500"
                    }
                  >
                    Rp {changeAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            )}

            {/* QRIS */}
            {selectedMethod === "QRIS" && (
              <div className="text-center py-2 space-y-3">
                <div className="w-36 h-36 bg-white border border-gray-200 rounded-2xl mx-auto flex flex-col items-center justify-center shadow-xs p-2">
                  <div className="text-4xl">📱</div>
                  <span className="font-extrabold text-lg text-brand-dark tracking-wider">
                    QRIS
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">
                  Tunjukkan kode QRIS Ruma Umma ke pelanggan untuk scan
                  pembayaran.
                </p>
              </div>
            )}

            {/* TRANSFER BANK */}
            {selectedMethod === "TRANSFER" && (
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-gray-800">
                  Rekening Resmi Ruma Umma:
                </h4>
                <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block">
                      BANK BCA
                    </span>
                    <span className="font-mono font-extrabold text-sm text-brand-dark">
                      1234-5678-90
                    </span>
                    <span className="text-xs text-gray-500 block">
                      a.n. Ruma Umma
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRekening}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    {copied ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                    <span>{copied ? "Tersalin" : "Salin"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Catatan Pembayaran Opsional */}
          <div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan pembayaran jika ada (cth: split bill, transfer referensi)..."
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:bg-white focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Footer Action Button */}
        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 px-3"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handlePay}
            disabled={isProcessing || (selectedMethod === "CASH" && cashGiven < order.totalPrice)}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-xs transition flex items-center gap-2"
          >
            {isProcessing && <Loader2 size={14} className="animate-spin" />}
            {isProcessing ? "Memproses..." : "✓ Selesaikan Pembayaran & Kosongkan Meja"}
          </button>
        </div>
      </div>
    </div>
  );
};
