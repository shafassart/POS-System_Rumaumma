import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./utils/supabaseClient";
import { Navbar } from "./components/Navbar";
import type {
  UserRole,
  Order,
  MenuItem,
  OrderStatus,
  PaymentMethod,
  BusinessProfile,
} from "./types/index";
const KasirPage = lazy(() => import("./pages/KasirPage"));
const KdsPage = lazy(() =>
  import("./pages/KdsPage").then((module) => ({ default: module.KdsPage })),
);
const MenuAdminPage = lazy(() =>
  import("./pages/MenuAdminPage").then((module) => ({
    default: module.MenuAdminPage,
  })),
);
const HistoryPage = lazy(() =>
  import("./pages/HistoryPage").then((module) => ({
    default: module.HistoryPage,
  })),
);
const OwnerDashboardPage = lazy(() =>
  import("./pages/OwnerDashboardPage").then((module) => ({
    default: module.OwnerDashboardPage,
  })),
);
const LoginModal = lazy(() =>
  import("./components/LoginModal").then((module) => ({
    default: module.LoginModal,
  })),
);

type RealtimeStatus = "connecting" | "connected" | "disconnected";

const defaultProfile: BusinessProfile = {
  name: "Ruma Umma",
  slogan: "Restoran Rumahan...",
  logo: "🍛",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("kasir");
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>(defaultProfile);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connecting");
  const [ordersError, setOrdersError] = useState("");
  const [menuError, setMenuError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [authError, setAuthError] = useState("");
  const [realtimeError, setRealtimeError] = useState("");
  const dataError = [authError, ordersError, menuError, profileError, realtimeError]
    .filter(Boolean)
    .join(" • ");

  const fetchOrdersFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
          id,
          tableNumber:table_number,
          customerName:customer_name,
          orderType:order_type,
          status,
          totalPrice:total_price,
          createdAt:created_at,
          items:order_items (
            id,
            menuId:menu_item_id,
            name:menu_name,
            price:unit_price,
            qty,
            notes,
            isCompleted:is_completed
          )
        `,
      )
      .order("created_at", { ascending: true });

    if (error) {
      setOrdersError(`Gagal memuat pesanan: ${error.message}`);
      return;
    }

    const orderIds = data.map((order) => order.id);
    const { data: payments, error: paymentsError } = orderIds.length
      ? await supabase
          .from("payments")
          .select("order_id, method, amount_received, change_amount")
          .in("order_id", orderIds)
      : { data: [], error: null };

    if (paymentsError) {
      setOrdersError(`Gagal memuat data pembayaran: ${paymentsError.message}`);
      return;
    }

    const paymentByOrder = new Map(
      (payments ?? []).map((payment) => [payment.order_id, payment]),
    );

    setOrders(
      data.map((order) => {
        const payment = paymentByOrder.get(order.id);
        return {
          ...order,
          tableNumber: order.tableNumber ?? 0,
          orderType: order.orderType,
          status: order.status,
          items: order.items ?? [],
          paymentMethod: payment?.method,
          cashAmount: payment?.amount_received,
          changeAmount: payment?.change_amount,
        } as Order;
      }),
    );
    setOrdersError("");
  }, []);

  const fetchMenuFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setMenuError(`Gagal memuat menu: ${error.message}`);
      return;
    }

    setMenuList(
      data.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        icon: item.image_url || item.icon || "🍲",
        isAvailable: item.is_available,
      })),
    );
    setMenuError("");
  }, []);

  const fetchBusinessProfile = useCallback(async () => {
    const { data, error } = await supabase
      .from("business_settings")
      .select("name, slogan, logo")
      .eq("id", true)
      .single();

    if (error) {
      setProfileError(`Gagal memuat profil restoran: ${error.message}`);
      return;
    }

    setProfile({
      name: data.name,
      slogan: data.slogan,
      logo: data.logo,
    });
    setProfileError("");
  }, []);

  const loadApplicationData = useCallback(
    async (session: Session | null) => {
      if (!session) {
        setOrders([]);
        setMenuList([]);
        setProfile(defaultProfile);
        setOrdersError("");
        setMenuError("");
        setProfileError("");
        return;
      }

      await Promise.all([
        fetchOrdersFromSupabase(),
        fetchMenuFromSupabase(),
        fetchBusinessProfile(),
      ]);
    },
    [fetchBusinessProfile, fetchMenuFromSupabase, fetchOrdersFromSupabase],
  );

  useEffect(() => {
    let isMounted = true;

    const applySession = async (session: Session | null) => {
      if (!isMounted) return;
      if (!session) {
        setCurrentRole(null);
        setRealtimeStatus("disconnected");
        await loadApplicationData(null);
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!isMounted) return;
      if (error || !profileData) {
        setCurrentRole(null);
        setAuthError(
          `Gagal memverifikasi role pengguna: ${error?.message ?? "profil tidak ditemukan"}`,
        );
        await supabase.auth.signOut();
        return;
      }

      if (profileData.role !== "OWNER" && profileData.role !== "STAFF") {
        setCurrentRole(null);
        setAuthError("Role pada profil Supabase tidak dikenali.");
        await supabase.auth.signOut();
        return;
      }

      setCurrentRole(profileData.role);
      setAuthError("");
      setRealtimeStatus("connecting");
      await loadApplicationData(session);
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthError(`Gagal memeriksa sesi Supabase: ${error.message}`);
        return;
      }
      void applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        void applySession(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        window.setTimeout(() => void applySession(session), 0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadApplicationData]);

  useEffect(() => {
    if (!currentRole) return;

    const refreshOrders = () => void fetchOrdersFromSupabase();
    const refreshMenu = () => void fetchMenuFromSupabase();
    const refreshProfile = () => void fetchBusinessProfile();
    const channel = supabase
      .channel("application-data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        refreshOrders,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        refreshOrders,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        refreshOrders,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        refreshMenu,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_settings" },
        refreshProfile,
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("disconnected");
          setRealtimeError(
            `Realtime Supabase tidak tersambung: ${error?.message ?? status}`,
          );
        } else if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          setRealtimeError("");
        } else if (status === "CLOSED") {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    currentRole,
    fetchBusinessProfile,
    fetchMenuFromSupabase,
    fetchOrdersFromSupabase,
  ]);

  const handleSaveOrder = (order: Order) => {
    setOrders((previous) => {
      const exists = previous.some((existing) => existing.id === order.id);
      return exists
        ? previous.map((existing) =>
            existing.id === order.id ? order : existing,
          )
        : [...previous, order];
    });
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
    );
  };

  const handleToggleItemComplete = (orderId: string, itemId: string) => {
    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? {
              ...order,
              items: order.items.map((item) =>
                item.id === itemId
                  ? { ...item, isCompleted: !item.isCompleted }
                  : item,
              ),
            }
          : order,
      ),
    );
  };

  const handleCompletePayment = (
    orderId: string,
    paymentMethod: PaymentMethod,
    cashAmount: number,
    changeAmount: number,
  ) => {
    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: "SELESAI",
              paymentMethod,
              cashAmount,
              changeAmount,
            }
          : order,
      ),
    );
  };

  const handleAddMenu = async (menu: Omit<MenuItem, "id">) => {
    const { error } = await supabase.from("menu_items").insert({
      name: menu.name,
      price: menu.price,
      category: menu.category,
      image_url: menu.icon,
      is_available: menu.isAvailable,
    });
    if (error) throw new Error(`Gagal menambahkan menu: ${error.message}`);
    await fetchMenuFromSupabase();
  };

  const handleSaveProfile = async (
    updatedProfile: BusinessProfile,
    logoFile?: File,
  ) => {
    if (!updatedProfile.name.trim()) {
      throw new Error("Nama restoran wajib diisi.");
    }
    let logo = updatedProfile.logo;
    if (logoFile) {
      if (!logoFile.type.startsWith("image/") || logoFile.size > 5 * 1024 * 1024) {
        throw new Error("File logo harus berupa gambar maksimal 5 MB.");
      }
      const candidateExtension = logoFile.name.split(".").pop() || "";
      const extension = /^[a-zA-Z0-9]{1,8}$/.test(candidateExtension)
        ? candidateExtension
        : "img";
      const path = `profile/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(path, logoFile);
      if (uploadError) {
        throw new Error(`Gagal mengunggah logo restoran: ${uploadError.message}`);
      }
      logo = supabase.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from("business_settings").upsert({
      id: true,
      name: updatedProfile.name.trim(),
      slogan: updatedProfile.slogan.trim(),
      logo,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Gagal menyimpan profil restoran: ${error.message}`);
    setProfile({ ...updatedProfile, logo });
  };

  const handleUpdateMenu = async (menu: MenuItem) => {
    const { data, error } = await supabase
      .from("menu_items")
      .update({
        name: menu.name,
        price: menu.price,
        category: menu.category,
        image_url: menu.icon,
        is_available: menu.isAvailable,
      })
      .eq("id", menu.id)
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Gagal memperbarui menu: ${error?.message ?? "menu tidak ditemukan"}`);
    }
    await fetchMenuFromSupabase();
  };

  const handleDeleteMenu = async (id: string) => {
    const { data, error } = await supabase
      .from("menu_items")
      .update({ is_available: false })
      .eq("id", id)
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Gagal mengarsipkan menu: ${error?.message ?? "menu tidak ditemukan"}`);
    }
    await fetchMenuFromSupabase();
  };

  const handleResetHistory = async () => {
    const completedOrderIds = orders
      .filter((order) => order.status === "SELESAI")
      .map((order) => order.id);
    if (completedOrderIds.length === 0) return;

    const { error } = await supabase
      .rpc("delete_completed_pos_orders", {
        p_order_ids: completedOrderIds,
      });
    if (error) throw new Error(`Gagal menghapus riwayat: ${error.message}`);
    await fetchOrdersFromSupabase();
  };

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-brand-light">
        {dataError && (
          <p role="alert" className="p-3 text-center text-sm text-red-700">
            {dataError}
          </p>
        )}
        <Suspense
          fallback={<p className="p-4 text-center text-sm">Memuat login...</p>}
        >
          <LoginModal
            onClose={() => undefined}
            onLoginSuccess={setCurrentRole}
            canClose={false}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-light text-brand-dark">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        profile={profile}
        onOpenProfile={() => setActiveTab("owner-dashboard")}
        realtimeStatus={realtimeStatus}
      />

      {dataError && (
        <p role="alert" className="bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          {dataError}
        </p>
      )}

      <Suspense
        fallback={
          <p role="status" className="p-6 text-center text-sm text-gray-500">
            Memuat modul...
          </p>
        }
      >
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          {activeTab === "kasir" && (
            <KasirPage
              orders={orders}
              menuList={menuList}
              onSaveOrder={handleSaveOrder}
              onCompletePayment={handleCompletePayment}
            />
          )}

          {activeTab === "dapur" && (
            <KdsPage
              orders={orders}
              menuList={menuList}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onToggleItemComplete={handleToggleItemComplete}
            />
          )}

          {activeTab === "history" && (
            <HistoryPage
              orders={orders}
              currentRole={currentRole}
              menuList={menuList}
              onResetHistory={handleResetHistory}
            />
          )}

          {activeTab === "menu-admin" && (
            <MenuAdminPage
              menuList={menuList}
              onAddMenu={handleAddMenu}
              onUpdateMenu={handleUpdateMenu}
              onDeleteMenu={handleDeleteMenu}
            />
          )}

          {activeTab === "owner-dashboard" && currentRole === "OWNER" && (
            <OwnerDashboardPage
              profile={profile}
              orders={orders}
              onSaveProfile={handleSaveProfile}
            />
          )}
        </main>
      </Suspense>
    </div>
  );
}
