import React, { useState } from "react";
import type { MenuItem, CategoryType } from "../types/index";
import { supabase } from "../utils/supabaseClient";
import { isImageSource } from "../utils/imageSource";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Edit3,
  ImagePlus,
  Loader2,
} from "lucide-react";

interface MenuAdminPageProps {
  menuList: MenuItem[];
  onAddMenu: (menu: Omit<MenuItem, "id">) => Promise<void>;
  onUpdateMenu: (menu: MenuItem) => Promise<void>;
  onDeleteMenu: (id: string) => Promise<void>;
}

export const MenuAdminPage: React.FC<MenuAdminPageProps> = ({
  menuList,
  onAddMenu,
  onUpdateMenu,
  onDeleteMenu,
}) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [category, setCategory] = useState<CategoryType>("Makanan");
  const [icon, setIcon] = useState("🍲");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleIconImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setErrorMessage("Pilih file gambar berukuran maksimal 5 MB.");
      return;
    }

    // Simpan file asli untuk dikirim ke Supabase Storage
    setImageFile(file);

    // Buat preview lokal untuk UI
    const reader = new FileReader();
    reader.onload = () => setIcon(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === "" || Number(price) <= 0) {
      setErrorMessage("Nama menu dan harga lebih dari 0 wajib diisi.");
      return;
    }
    setUploading(true);
    setErrorMessage("");

    let imageUrl = icon;

    try {
      if (imageFile) {
        const candidateExtension = imageFile.name.split(".").pop() || "";
        const fileExt = /^[a-zA-Z0-9]{1,8}$/.test(candidateExtension)
          ? candidateExtension
          : "img";
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `menu/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("menu-images")
          .upload(filePath, imageFile);

        if (uploadError) {
          throw new Error(`Gagal mengunggah gambar: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("menu-images")
          .getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }

      if (editingId) {
        const existing = menuList.find((menu) => menu.id === editingId);
        if (existing) {
          await onUpdateMenu({
            ...existing,
            name,
            price: Number(price),
            category,
            icon: imageUrl,
          });
        }
        setEditingId(null);
      } else {
        await onAddMenu({
          name,
          price: Number(price),
          category,
          icon: imageUrl,
          isAvailable: true,
        });
      }

      setImageFile(null);
      setName("");
      setPrice("");
      setIcon("🍲");
    } catch (error) {
      console.error("Gagal menyimpan menu:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan menu.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleStartEdit = (menu: MenuItem) => {
    setEditingId(menu.id);
    setName(menu.name);
    setPrice(menu.price);
    setCategory(menu.category);
    setIcon(menu.icon);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Form Tambah/Edit Menu */}
      <div className="bg-white p-5 rounded-2xl border border-brand-primary/10 shadow-xs h-fit space-y-4">
        <h3 className="font-bold text-base text-brand-dark flex items-center gap-2 border-b pb-2">
          <Plus size={18} className="text-brand-primary" />
          <span>{editingId ? "Edit Menu" : "Tambah Menu Baru"}</span>
        </h3>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Nama Menu:
            </label>
            <input
              type="text"
              placeholder="Contoh: Brekele / Dimsum"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-brand-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Harga (Rp):
              </label>
              <input
                type="number"
                placeholder="15000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-brand-primary"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Icon / Gambar Menu:
              </label>
              <input
                type="text"
                placeholder="🍲 atau URL gambar"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-brand-primary text-center"
                required
              />
              <label className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 cursor-pointer">
                <ImagePlus size={14} />
                Upload gambar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleIconImage(e.target.files?.[0])}
                />
              </label>
              {isImageSource(icon) && (
                <img
                  src={icon}
                  alt="Preview icon menu"
                  className="mt-2 h-12 w-12 rounded-xl object-cover border border-blue-100"
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Kategori:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryType)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-brand-primary"
            >
              <option value="Makanan">Makanan</option>
              <option value="Camilan">Camilan</option>
              <option value="Minuman">Minuman</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-brand-primary text-white py-2.5 rounded-xl font-bold text-xs hover:bg-brand-primary/90 transition pt-2"
          >
            {uploading ? <Loader2 size={14} className="mx-auto animate-spin" /> : editingId ? "💾 Simpan Perubahan" : "+ Tambahkan ke Menu"}
          </button>
          {errorMessage && <p role="alert" className="text-xs text-red-600">{errorMessage}</p>}
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName("");
                setPrice("");
              }}
              className="w-full bg-gray-100 text-gray-600 py-1.5 rounded-xl font-semibold text-xs hover:bg-gray-200 transition"
            >
              Batal
            </button>
          )}
        </form>
      </div>

      {/* Daftar Tabel Menu */}
      <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-brand-primary/10 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-brand-dark border-b pb-2">
          Daftar Menu Ruma Umma ({menuList.length} Menu)
        </h3>

        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          {menuList.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition ${
                item.isAvailable
                  ? "bg-white border-gray-200"
                  : "bg-gray-50 border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                {isImageSource(item.icon) ? (
                  <img
                    src={item.icon}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-2xl">{item.icon}</span>
                )}
                <div>
                  <h4 className="font-bold text-sm text-brand-dark">
                    {item.name}
                  </h4>
                  <p className="text-xs text-brand-primary font-semibold">
                    Rp {item.price.toLocaleString("id-ID")}{" "}
                    <span className="text-gray-400 font-normal">
                      ({item.category})
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setErrorMessage("");
                    void onUpdateMenu({ ...item, isAvailable: !item.isAvailable }).catch((error: unknown) => {
                      console.error("Gagal memperbarui ketersediaan menu:", error);
                      setErrorMessage(error instanceof Error ? error.message : "Gagal memperbarui menu.");
                    });
                  }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                >
                  {item.isAvailable ? (
                    <>
                      <ToggleRight className="text-green-600" size={18} />
                      <span className="text-green-700 font-semibold">
                        Tersedia
                      </span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="text-gray-400" size={18} />
                      <span className="text-gray-500">Habis</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleStartEdit(item)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit3 size={16} />
                </button>

                <button
                  type="button"
                  aria-label={`Arsipkan ${item.name}`}
                  title="Arsipkan menu (tetap simpan pada riwayat transaksi)"
                  onClick={() => {
                    setErrorMessage("");
                    void onDeleteMenu(item.id).catch((error: unknown) => {
                      console.error("Gagal mengarsipkan menu:", error);
                      setErrorMessage(error instanceof Error ? error.message : "Gagal mengarsipkan menu.");
                    });
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
