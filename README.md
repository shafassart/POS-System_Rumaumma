# Ruma Umma POS

Frontend aplikasi kasir restoran menggunakan React, TypeScript, Vite, dan Supabase.

## Menjalankan dan memvalidasi

```bash
npm install
npm run dev
npm run lint
npm run build
```

Duplikasi `.env.example` menjadi `.env`, lalu isi URL proyek dan anon/publishable key. Jangan pernah menggunakan `service_role` key di frontend.

Login menggunakan akun Supabase Auth OWNER (`owner@rumaumma.com`) atau STAFF (`staff@rumaumma.com`); PIN 6 digit dimasukkan sebagai password Auth. Pastikan setiap akun memiliki baris di `profiles` dengan `id` yang sama dengan `auth.users.id` dan `role` bernilai `OWNER` atau `STAFF`.

## Integrasi Supabase

Tabel yang digunakan: `profiles`, `orders`, `order_items`, `payments`, `menu_items`, dan `business_settings`. Menu menggunakan kolom `name`, `price`, `category`, `image_url`, `is_available`; pembayaran menggunakan `order_id`, `method`, `amount_received`, `change_amount`, `note`. Bucket Storage `menu-images` menyimpan gambar menu dan logo.

Pesanan, pembayaran, dan status KDS memakai PostgreSQL RPC agar perubahan transaksi atomik. Trigger database mencegah pesanan dine-in aktif bersamaan pada nomor meja yang sama. Menu yang dihapus dari katalog diarsipkan (`is_available=false`) agar riwayat transaksi tetap utuh. Pengaturan restoran disimpan di `business_settings`.

## Menyiapkan Supabase untuk development/deployment

1. Buat backup proyek/database sebelum mengubah policy.
2. Pastikan skema yang telah ada cocok dengan kode: `profiles.id/role`, UUID `orders.id`, UUID `order_items.id/order_id/menu_item_id`, serta kolom menu dan pembayaran di atas. Migration ini mengandalkan tabel POS yang telah ada.
3. Jalankan `supabase/migrations/20260926000000_pos_hardening.sql` pada proyek development melalui SQL Editor. Migration menambahkan kolom pengaturan yang belum ada. Untuk `business_settings` lama dengan `id` UUID, migration mengubah ID baris tunggal menjadi boolean agar sesuai dengan aplikasi; jika ada lebih dari satu baris, migration berhenti dan data perlu dirapikan terlebih dahulu. Jika migration sudah pernah berhasil dijalankan dan hanya kolom `logo` yang hilang, jalankan `alter table public.business_settings add column if not exists logo text not null default '🍛';` di SQL Editor—jangan jalankan ulang seluruh migration. Jika menggunakan Supabase CLI, inisialisasi/link workspace dengan CLI terlebih dahulu sebelum `supabase db push`.
4. Migration mengganti seluruh policy RLS pada tabel aplikasi `profiles`, `orders`, `order_items`, `payments`, `menu_items`, dan `business_settings` dengan baseline role OWNER/STAFF. Review policy khusus proyek terlebih dahulu dan gabungkan yang memang perlu dipertahankan. Policy Storage untuk bucket lain tidak dihapus; policy `menu-images` dibatasi ke OWNER untuk tulis/hapus dan boleh dibaca publik.
5. Pastikan Realtime diaktifkan untuk `orders`, `order_items`, `payments`, `menu_items`, dan `business_settings`. Migration menambahkannya ke publication `supabase_realtime`.
6. Siapkan akun Auth OWNER dan STAFF, password PIN 6 digit, serta baris `profiles` yang tepat. Uji policy memakai kedua akun.
7. Di Supabase Auth, atur rate limit login yang ketat serta CAPTCHA/bot protection yang sesuai. PIN enam digit berentropi rendah; pertimbangkan password kuat atau MFA khusus OWNER. Jangan aktifkan CAPTCHA yang mensyaratkan token sampai widget/token CAPTCHA diintegrasikan ke login aplikasi.
8. Isi variabel `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada environment hosting (misalnya Vercel), deploy preview/staging lebih dulu, dan uji sebelum production.
9. Jalankan `supabase/verification.sql` di SQL Editor untuk memeriksa RLS, Realtime, RPC, bucket, dan konflik meja yang ada.

## Uji penerimaan staging

- Login OWNER dan STAFF; pastikan role benar dan izin berbeda.
- Tambah/edit/arsip menu, upload gambar, simpan pengaturan profil, muat ulang, lalu cek dari perangkat kedua.
- Buat order dine-in dan takeaway, edit rincian, tandai item selesai di KDS, selesaikan pembayaran, muat ulang, dan cek riwayat.
- Coba dua kasir membuat order aktif untuk meja sama secara bersamaan; database harus menolak salah satu.
- Pastikan reset riwayat hanya berhasil untuk OWNER dan menghapus item, pembayaran, serta order selesai.
- Uji pemutusan Realtime dan kegagalan database; UI harus menunjukkan status/error dan tidak menyatakan transaksi gagal sebagai sukses.
- Uji langsung policy RLS dari sesi OWNER dan STAFF, termasuk akses API yang tidak tersedia melalui tombol UI.

`npm run lint` dan `npm run build` hanya memvalidasi frontend; keduanya tidak menjalankan migration atau membuktikan policy remote. Tidak ada runner test otomatis yang dikonfigurasi. Build saat ini memberi peringatan ukuran bundle >500 kB (bukan kegagalan); code splitting dapat dilakukan setelah kesiapan perilaku/security.
