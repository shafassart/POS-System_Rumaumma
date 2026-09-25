import React, { lazy, Suspense, useState } from "react";
import {
  Utensils,
  ChefHat,
  Settings,
  History,
  Wifi,
  Menu,
  UserRoundCog,
} from "lucide-react";
import type { UserRole } from "../types/index";
import type { BusinessProfile } from "../types/index";
import { isImageSource } from "../utils/imageSource";
const LoginModal = lazy(() =>
  import("./LoginModal").then((module) => ({ default: module.LoginModal })),
);

type RealtimeStatus = "connecting" | "connected" | "disconnected";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  profile: BusinessProfile;
  onOpenProfile: () => void;
  realtimeStatus: RealtimeStatus;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  profile,
  onOpenProfile,
  realtimeStatus,
}) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLoginSuccess = (role: UserRole) => {
    setCurrentRole(role);
    setIsMenuOpen(false);
    if (
      role === "STAFF" &&
      (activeTab === "menu-admin" || activeTab === "owner-dashboard")
    ) {
      setActiveTab("kasir");
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const navigation = (
    <>
      <button
        onClick={() => handleTabChange("kasir")}
        className={`flex items-center space-x-0.5 px-2 py-0.5 rounded-lg text-xs font-bold transition ${
          activeTab === "kasir"
            ? "bg-brand-secondary text-white shadow-xs"
            : "text-gray-600 hover:bg-white/60"
        }`}
      >
        <Utensils size={14} />
        <span>Kasir & Meja (1-7)</span>
      </button>

      <button
        onClick={() => handleTabChange("dapur")}
        className={`flex items-center space-x-0.5 px-2 py--.5 rounded-lg text-xs font-bold transition ${
          activeTab === "dapur"
            ? "bg-brand-secondary text-white shadow-xs"
            : "text-gray-600 hover:bg-white/60"
        }`}
      >
        <ChefHat size={14} />
        <span>Layar Dapur Umma (KDS)</span>
      </button>

      {currentRole === "OWNER" && (
        <button
          onClick={() => handleTabChange("menu-admin")}
          className={`flex items-center space-x-0.5 px-2 py-0.5 rounded-lg text-xs font-bold transition ${
            activeTab === "menu-admin"
              ? "bg-brand-secondary text-white shadow-xs"
              : "text-gray-600 hover:bg-white/60"
          }`}
        >
          <Settings size={14} />
          <span>Kelola Menu & Harga</span>
        </button>
      )}

      {currentRole === "OWNER" && (
        <button
          onClick={() => {
            onOpenProfile();
            setIsMenuOpen(false);
          }}
          className="flex items-center space-x-0.5 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-white/60 transition"
        >
          <UserRoundCog size={14} />
          <span>Profil & Dashboard</span>
        </button>
      )}

      <button
        onClick={() => handleTabChange("history")}
        className={`flex items-center space-x-0.5 px-2 py-0.5 rounded-lg text-xs font-bold transition ${
          activeTab === "history"
            ? "bg-brand-secondary text-white shadow-xs"
            : "text-gray-600 hover:bg-white/60"
        }`}
      >
        <History size={14} />
        <span>Riwayat Penjualan</span>
      </button>
    </>
  );

  return (
    <header className="bg-white border-b border-blue-100 sticky top-0 z-50 text-gray-800 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-between items-center gap-3">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            type="button"
            aria-label={
              isMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"
            }
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="p-2 hover:bg-blue-50 rounded-lg text-brand-primary md:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-brand-secondary/20 flex items-center justify-center text-xl shadow-2xs overflow-hidden shrink-0">
              {isImageSource(profile.logo) ? (
                <img
                  src={profile.logo}
                  alt="Logo profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.logo
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-base leading-none text-brand-dark truncate">
                  {profile.name}
                </h1>
                {/* <span className="bg-blue-100 text-brand-secondary text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-blue-200">
                                    RUMAHAN
                                </span> */}
              </div>
              <p className="text-[11px] text-gray-500 font-medium leading-tight truncate">
                {profile.slogan}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Main Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-0.5 bg-blue-50/90 px-2 rounded-xl border border-blue-80 text-xs">
          {navigation}
        </nav>

        {/* Right: Status Badges & Role Switcher */}
        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-2.5 py-1 rounded-xl font-bold hover:bg-blue-100 transition cursor-pointer"
          >
            <span>{currentRole === "OWNER" ? "👑 Owner" : "👤 Staff"}</span>
            {/* <span className="text-[10px] text-blue-700 font-semibold block leading-tight">
              {currentRole === "OWNER" ? "OWNER / CO-OWNER" : "STAFF"}
            </span> */}
          </button>

          <div className="hidden lg:flex items-center gap-2">
            <span
              className={`border px-2 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 ${
                realtimeStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : realtimeStatus === "connecting"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  realtimeStatus === "connected"
                    ? "bg-emerald-500"
                    : realtimeStatus === "connecting"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-red-500"
                }`}
              ></span>
              {realtimeStatus === "connected"
                ? "Realtime aktif"
                : realtimeStatus === "connecting"
                  ? "Menghubungkan…"
                  : "Realtime terputus"}
            </span>
            {/* <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
              <Wifi size={12} /> Buka di HP/Tablet Wi-Fi
            </span> */}
          </div>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden border-t border-blue-100 bg-white px-4 py-3 shadow-lg">
          <nav className="flex flex-col gap-1 bg-blue-50 p-2 rounded-xl border border-blue-100">
            {navigation}
          </nav>
        </div>
      )}
      {isLoginModalOpen && (
        <Suspense fallback={null}>
          <LoginModal
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </Suspense>
      )}
    </header>
  );
};
