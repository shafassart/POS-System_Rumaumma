import React, { useState } from "react";
import type { UserRole } from "../types/index";
import { X, Lock, ShieldCheck, User, Loader2 } from "lucide-react";
import { supabase } from "../utils/supabaseClient";

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (role: UserRole) => void;
  canClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onClose,
  onLoginSuccess,
  canClose = true,
}) => {
  const [targetRole, setTargetRole] = useState<UserRole>("OWNER");
  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6 && !isLoading) {
      setPin((prev) => prev + num);
      setErrorMsg("");
    }
  };

  const handleDelete = () => {
    if (isLoading) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  const handleClear = () => {
    if (isLoading) return;
    setPin("");
    setErrorMsg("");
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(pin)) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const email =
        targetRole === "OWNER" ? "owner@rumaumma.com" : "staff@rumaumma.com";

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password: pin,
        });

      if (authError || !authData.user) {
        console.error(
          "Supabase Auth Error Detail:",
          authError?.message,
          authError?.status,
        );

        setErrorMsg(authError?.message || "PIN / Kredensial salah!");
        setPin("");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (
        profileError ||
        !profile ||
        (profile.role !== "OWNER" && profile.role !== "STAFF") ||
        profile.role !== targetRole
      ) {
        console.error("Gagal memverifikasi role Supabase:", profileError?.message);
        setErrorMsg(
          profileError?.message ||
            "Role akun Supabase tidak sesuai dengan role yang dipilih.",
        );
        await supabase.auth.signOut();
        setPin("");
        return;
      }

      onLoginSuccess(profile.role);
      onClose();
    } catch (error) {
      console.error("Login Supabase gagal:", error);
      setErrorMsg(
        error instanceof Error ? error.message : "Terjadi kesalahan koneksi.",
      );
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-brand-dark">
                Akses Hak Akses
              </h3>
              <p className="text-[11px] text-gray-400">
                Pilih role & masukkan PIN 6 digit
              </p>
            </div>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full bg-gray-100"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setTargetRole("OWNER");
              setPin("");
              setErrorMsg("");
            }}
            className={`py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
              targetRole === "OWNER"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ShieldCheck size={14} />
            <span>OWNER</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setTargetRole("STAFF");
              setPin("");
              setErrorMsg("");
            }}
            className={`py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
              targetRole === "STAFF"
                ? "bg-black text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <User size={14} />
            <span>STAFF</span>
          </button>
        </div>

        {/* Display PIN Dots */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-3 py-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? "bg-brand-primary border-brand-primary scale-110"
                    : "border-gray-300 bg-gray-50"
                }`}
              />
            ))}
          </div>
          {errorMsg && (
            <p className="text-xs font-bold text-red-500 animate-shake">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Keypad NumPad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isLoading}
              onClick={() => handleKeyPress(num)}
              className="py-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-brand-dark font-extrabold text-base rounded-2xl transition shadow-2xs disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleClear}
            className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-xs rounded-2xl disabled:opacity-50"
          >
            C
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleKeyPress("0")}
            className="py-3 bg-gray-50 hover:bg-gray-100 text-brand-dark font-extrabold text-base rounded-2xl disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleDelete}
            className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl disabled:opacity-50"
          >
            ⌫
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleVerify}
          disabled={pin.length < 6 || isLoading}
          className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Memverifikasi...</span>
            </>
          ) : (
            <span>Masuk Sesuai Role</span>
          )}
        </button>
      </div>
    </div>
  );
};
