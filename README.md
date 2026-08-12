# 🏪 POS UMKM - Kasir Digital Modern & Laporan Penjualan

Aplikasi **POS (Point of Sale) / Kasir berbasis web** yang dirancang khusus untuk memenuhi kebutuhan pemilik warung, kedai, pedagang makanan, minuman, snack, dan pelaku UMKM lainnya. Aplikasi ini didesain dengan antarmuka yang bersih, premium, responsif, dan ringan untuk dijalankan melalui HP, tablet, maupun komputer.

---

## ✨ Fitur Unggulan

1. **Kasir Digital Cepat (POS Interface)**:
   * Grid produk interaktif dilengkapi pencarian dan filter kategori.
   * Kalkulasi keranjang belanja otomatis.
   * Mendukung metode pembayaran **Tunai (Cash)** dan **QRIS**.
   * Perhitungan uang kembalian dinamis untuk pembayaran tunai.
   
2. **Cetak Struk Kasir Thermal (58mm)**:
   * Layout struk yang dikonfigurasi khusus untuk printer thermal kertas **58mm** menggunakan font monospaced.
   * Otomatis menyembunyikan elemen website non-struk (`no-print`) saat mencetak.

3. **Manajemen Produk & Kategori (CRUD)**:
   * Tambah, ubah, dan hapus kategori serta produk secara dinamis.
   * Unggah gambar/foto produk langsung ke **Supabase Storage**.
   * Fitur **Pelacakan Stok Opsional** (pedagang dapat memilih untuk menggunakan fitur stok atau mematikannya).

4. **Laporan & Rekap Penjualan Bulanan/Harian**:
   * Halaman transaksi yang menggunakan **Pagination (Limit 50 data)** dengan tombol *Muat Lebih Banyak* agar loading web selalu instan.
   * Agregasi data penjualan harian & bulanan yang dikalkulasi langsung di server database (PostgreSQL RPC) demi efisiensi tinggi.
   * Fitur **Ekspor Laporan (Excel/CSV)** yang kompatibel langsung dengan Microsoft Excel (menggunakan UTF-8 BOM).

5. **Autentikasi & Zona Bahaya (Danger Zone)**:
   * Login & Register terintegrasi **Supabase Auth**.
   * Halaman sukses registrasi interaktif dengan status verifikasi email dan tombol pintas ke Gmail.
   * Reset data transaksi per bulan atau secara keseluruhan dengan proteksi konfirmasi nama toko untuk mencegah salah klik.

---

## 🛠️ Teknologi yang Digunakan

* **Frontend**: [Next.js](https://nextjs.org/) (React, TypeScript, App Router, Server Actions)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) dengan Google Font *Plus Jakarta Sans*
* **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Storage, Supabase Auth)
* **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Memulai di Lokal

### 1. Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (versi 18 ke atas) di komputer Anda.

### 2. Kloning Repositori & Instal Dependensi
```bash
# Masuk ke direktori projek
cd projek-pos-umkm

# Instal dependensi
npm install
```

### 3. Konfigurasi Environment Variables (`.env.local`)
Buat file bernama `.env.local` di direktori utama proyek Anda, lalu masukkan kunci API Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```
*(Anda dapat melihat nilai `.env.example` sebagai referensi)*

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🗄️ Inisialisasi Database Supabase

Sebelum menjalankan aplikasi, Anda harus mengonfigurasi skema database di Supabase Anda:

1. Buka [Supabase Console](https://supabase.com/dashboard) dan pilih proyek Anda.
2. Masuk ke menu **SQL Editor** pada sidebar kiri.
3. Klik **New Query**.
4. Salin seluruh konten dari file [`supabase_schema.sql`](file:///d:/Project/Projek/Projek9/supabase_schema.sql) di dalam proyek ini dan tempelkan di SQL Editor tersebut.
5. Klik **Run**.

SQL ini akan secara otomatis membuat:
* Tabel `stores`, `categories`, `products`, `transactions`, dan `transaction_items`.
* Aturan keamanan Row Level Security (RLS) untuk setiap tabel.
* Trigger untuk sinkronisasi otomatis profil pengguna baru.
* Bucket penyimpanan `product-images` untuk foto produk.
* PostgreSQL RPC function `checkout_transaction` untuk menangani pengurangan stok yang aman (anti race-conditions).
* PostgreSQL RPC function `get_daily_rekap` dan `get_monthly_rekap` untuk kalkulasi cepat laporan harian & bulanan.

---

## ☁️ Panduan Deploy Ke Vercel

1. Hubungkan repositori GitHub proyek Anda ke **Vercel**.
2. Pada pengaturan proyek di Vercel, tambahkan variabel lingkungan berikut di bagian **Environment Variables**:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
3. Setelah deploy berhasil, buka dashboard **Supabase** -> **Authentication** -> **URL Configuration**:
   * Ganti **Site URL** menjadi domain Vercel Anda (misal: `https://toko-pos-anda.vercel.app`).
   * Tambahkan domain tersebut ke daftar **Redirect URLs** agar verifikasi registrasi kasir diarahkan kembali secara otomatis ke domain produksi Anda.

---

## 📝 Lisensi
Proyek ini dibuat untuk keperluan pengembangan POS UMKM Warung Digital. Bebas dikembangkan lebih lanjut secara internal.
