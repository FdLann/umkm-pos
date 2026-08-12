# Panduan Desain: Modern UMKM POS
Diekstrak dari proyek Stitch: `projects/10497980556881201446` (Modern UMKM POS)

Dokumen ini merinci identitas visual, skema warna, tipografi, dan tata letak yang digunakan untuk menyelaraskan tampilan aplikasi POS UMKM kita agar sesuai dengan rancangan Stitch.

---

## 1. Identitas Visual & Style
* **Karakter Brand**: Reliable (Dapat diandalkan), Welcoming (Ramah/Pendekatan Manusia), dan Efficient (Efisien/Cepat).
* **Desain Estetika**: *Corporate Modern with a Friendly Twist* (Berbasis Light Mode dengan warna biru-pastel lembut dan sudut bulat yang bersahabat).

---

## 2. Palet Warna (Color Palette)

Skema warna didominasi oleh warna hijau zamrud (Emerald Green) yang melambangkan kemakmuran dan kesuksesan transaksi, serta aksen warna oranye (Safety Orange) untuk alert/warning.

| Token Warna | Nilai Heksadesimal | Deskripsi / Penggunaan |
| :--- | :--- | :--- |
| **background** | `#f8f9ff` | Latar belakang dasar halaman (lembut, mencegah mata lelah). |
| **on-background** | `#0b1c30` | Warna teks utama (Navy gelap). |
| **surface** | `#ffffff` | Warna dasar kartu/container utama. |
| **surface-dim** | `#cbdbf5` | Versi gelap dari surface untuk pembatas. |
| **surface-container-low** | `#eff4ff` | Container dengan elevasi rendah. |
| **surface-container** | `#e5eeff` | Container standar (sidebar, panel samping). |
| **surface-container-high** | `#dce9ff` | Container dengan kontras lebih tinggi. |
| **surface-container-highest**| `#d3e4fe` | Container dengan elevasi paling tinggi (hover/active). |
| **primary** | `#006c49` | Tombol utama, aksi transaksi berhasil, "Bayar". |
| **primary-container** | `#10b981` | Aksen hijau emerald cerah. |
| **secondary** | `#9d4300` | Aksen oranye gelap (refund, delete). |
| **secondary-container** | `#fd761a` | Aksen oranye cerah. |
| **error** | `#ba1a1a` | Warna status gagal/stok habis. |

---

## 3. Tipografi (Typography)
Menggunakan Google Font **Plus Jakarta Sans** untuk seluruh teks guna memberikan kesan modern, bersih, dan legibilitas tinggi.

* **Display Price (Total Belanja)**:
  * Font: `Plus Jakarta Sans`
  * Size: `48px` | Weight: `Bold (700)` | Line Height: `56px` | Letter Spacing: `-0.02em`
* **Headline Large (Judul Halaman)**:
  * Font: `Plus Jakarta Sans`
  * Size: `32px` | Weight: `Bold (700)` | Line Height: `40px`
* **Headline Medium (Judul Modul/Modal)**:
  * Font: `Plus Jakarta Sans`
  * Size: `24px` | Weight: `Semi-Bold (600)` | Line-Height: `32px`
* **Body Large (Nama Produk di List)**:
  * Font: `Plus Jakarta Sans`
  * Size: `18px` | Weight: `Medium (500)` | Line Height: `28px`
* **Body Medium (Teks Standar / Deskripsi)**:
  * Font: `Plus Jakarta Sans`
  * Size: `16px` | Weight: `Regular (400)` | Line Height: `24px`
* **Label Bold (Subtotal / Header Tabel)**:
  * Font: `Plus Jakarta Sans`
  * Size: `14px` | Weight: `Bold (700)` | Line Height: `20px`
* **Label Small (Keterangan Detail / Pajak / Stok)**:
  * Font: `Plus Jakarta Sans`
  * Size: `12px` | Weight: `Medium (500)` | Line Height: `16px`

---

## 4. Bentuk & Sudut Bulat (Border Radius)
* **Sudut Kecil (Checkboxes, Tag kecil)**: `rounded-sm` (`4px` / `0.25rem`)
* **Sudut Standar (Tombol, Input, Kartu Produk)**: `rounded-md` (`8px` / `0.5rem`)
* **Sudut Sedang (Tombol Kasir Utama, Form)**: `rounded-lg` (`12px` / `0.75rem`)
* **Sudut Besar (Modal, Container Struk, Sidebar)**: `rounded-2xl` (`24px` / `1.5rem`)
* **Sudut Pil (Pills untuk status)**: `rounded-full` (`9999px`)

---

## 5. Spacing & Rhythm
Menggunakan kelipatan **8px** untuk mengatur jarak antar elemen:
* Jarak aman tepi layar (*margin*): `24px`
* Jarak antar kartu (*grid gap*): `12px` atau `16px`
* Target ketuk minimal (*touch target*): `48px` (sangat penting untuk transaksi cepat via HP/Tablet).
