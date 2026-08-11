# SPPG Jeungjing — Sistem Absensi Relawan

Sistem absensi berbasis web untuk relawan **SPPG Jeungjing**, dibangun dengan HTML/CSS/JavaScript sederhana, **Google Apps Script** sebagai backend/API, dan **Google Spreadsheet** sebagai database. Hosting menggunakan **GitHub Pages** — sepenuhnya gratis, tanpa backend berbayar.

Alur inti: **1 QR Code → Absensi Relawan → Data Otomatis → Google Spreadsheet → Dashboard Admin.**

---

## Daftar Isi

1. [Struktur Folder](#1-struktur-folder)
2. [Cara Kerja Sistem](#2-cara-kerja-sistem)
3. [Langkah 1 — Setup Google Spreadsheet](#3-langkah-1--setup-google-spreadsheet)
4. [Langkah 2 — Setup Google Apps Script](#4-langkah-2--setup-google-apps-script)
5. [Langkah 3 — Hubungkan Website ke Apps Script](#5-langkah-3--hubungkan-website-ke-apps-script)
6. [Langkah 4 — Deploy ke GitHub Pages](#6-langkah-4--deploy-ke-github-pages)
7. [Langkah 5 — Membuat QR Code](#7-langkah-5--membuat-qr-code)
8. [Panduan Penggunaan — Relawan](#8-panduan-penggunaan--relawan)
9. [Panduan Penggunaan — Admin](#9-panduan-penggunaan--admin)
10. [Keamanan](#10-keamanan)
11. [Asumsi & Catatan Desain](#11-asumsi--catatan-desain)
12. [Troubleshooting](#12-troubleshooting)
13. [Pengembangan Lanjutan (opsional)](#13-pengembangan-lanjutan-opsional)

---

## 1. Struktur Folder

```
SPPG-JEUNGJING-ABSENSI/
│
├── index.html              # Halaman absensi relawan (tujuan QR Code)
├── admin.html               # Dashboard admin (dilindungi login)
├── qrcode.html               # Halaman cetak QR Code (untuk admin)
│
├── style.css                  # Desain utama (dipakai semua halaman)
├── admin.css                   # Style tambahan khusus dashboard
│
├── config.js                    # 1 tempat untuk mengisi URL Apps Script
├── common.js                     # Fungsi API bersama (dipakai script.js & admin.js)
├── script.js                      # Logic halaman absensi
├── admin.js                        # Logic dashboard admin
│
├── assets/
│   └── logo.png                    # Logo resmi SPPG Jeungjing (dari file yang Anda unggah)
│
├── seed-data/                        # CSV siap-impor ke Google Sheets
│   ├── 01_DATA_RELAWAN.csv             # 47 relawan awal, sudah diberi ID R001–R047
│   ├── 02_DATA_DIVISI.csv               # 12 divisi aktif
│   ├── 03_DATA_ABSENSI.csv               # Hanya header
│   ├── 04_REKAP_HARIAN.csv                # Hanya header
│   ├── 05_REKAP_BULANAN.csv                # Hanya header
│   └── 06_ADMIN.csv                         # Hanya header
│
├── google-apps-script/                        # Kode backend — disalin ke script.google.com
│   ├── Code.gs                                  # Routing utama (doGet / doPost)
│   ├── Utils.gs                                  # Konfigurasi & fungsi bantuan
│   ├── Relawan.gs                                 # Data relawan & divisi
│   ├── Absensi.gs                                  # Absensi, cegah duplikasi, rekap
│   └── Admin.gs                                     # Login admin & sesi
│
└── README.md                                          # Dokumen ini
```

> Struktur ini sedikit lebih lengkap dari draf awal (ditambah `admin.css`, `common.js`, `admin.js`, `qrcode.html`, `seed-data/`) agar kode tetap modular dan mudah dikembangkan, sesuai permintaan awal.

---

## 2. Cara Kerja Sistem

```
   QR CODE (dicetak, ditempel di lokasi)
        │
        ▼
   index.html  ──▶  Pilih Divisi  ──▶  Pilih Nama  ──▶  Jenis Absensi
        │                                                  │
        │                                          (Masuk / Pulang)
        │                                                  ▼
        │                                          Keterangan (opsional)
        │                                                  ▼
        │                                          Kirim Absensi
        ▼
   Google Apps Script (Web App / API)
        │  • Timestamp diambil dari SERVER (Asia/Jakarta), bukan dari HP relawan
        │  • Validasi & cegah absensi ganda
        ▼
   Google Spreadsheet (database)
        │
        ▼
   admin.html — Dashboard: rekap harian, rekap bulanan, kelola relawan/divisi
```

Frontend (GitHub Pages) hanya berkomunikasi dengan Apps Script melalui HTTP biasa (`fetch`) — tidak ada database yang tersimpan di browser maupun di HP admin.

---

## 3. Langkah 1 — Setup Google Spreadsheet

1. Buat Google Spreadsheet baru (spreadsheet.new), beri nama misalnya **"SPPG Jeungjing — Database Absensi"**.
2. Buat **6 sheet (tab)** dengan nama **PERSIS** seperti berikut (huruf besar/kecil dan garis bawah harus sama persis, karena dibaca oleh kode):
   - `01_DATA_RELAWAN`
   - `02_DATA_DIVISI`
   - `03_DATA_ABSENSI`
   - `04_REKAP_HARIAN`
   - `05_REKAP_BULANAN`
   - `06_ADMIN`
3. Untuk **setiap** sheet, impor file CSV yang namanya sama dari folder `seed-data/`:
   - Buka sheet tujuan (misalnya `01_DATA_RELAWAN`) → menu **File → Impor → Upload** → pilih file `.csv` yang sesuai.
   - Pada "Lokasi impor", pilih **"Ganti sheet saat ini"**, lalu klik **Impor data**.
   - `01_DATA_RELAWAN.csv` sudah berisi **47 relawan awal** sesuai data yang Anda berikan, lengkap dengan ID R001–R047.
   - `02_DATA_DIVISI.csv` sudah berisi **12 divisi**, termasuk `HEAD CHEF` yang sengaja dikosongkan (belum ada nama relawan, sesuai catatan Anda).
   - Sheet lainnya hanya berisi baris judul kolom — akan terisi otomatis oleh sistem.

---

## 4. Langkah 2 — Setup Google Apps Script

1. Pada Spreadsheet yang sama, buka menu **Extensions → Apps Script**.
2. Hapus seluruh isi file `Code.gs` bawaan (kosongkan).
3. Buat **5 file baru** (klik ikon **+** di samping "Files", pilih "Script"), beri nama persis:
   `Utils`, `Admin`, `Relawan`, `Absensi`, `Code` — Apps Script otomatis menambahkan akhiran `.gs`.
4. Salin isi masing-masing file dari folder `google-apps-script/` pada paket ini ke file dengan nama yang sesuai.
5. Buka file **Admin.gs**, cari fungsi `setupAdminPassword()`, lalu ganti nilai `USERNAME_BARU` dan `PASSWORD_BARU` sesuai keinginan Anda.
6. Pada dropdown fungsi di atas editor, pilih **setupAdminPassword**, lalu klik tombol **Run (▶)**. Berikan izin akses (Authorize) saat diminta — ini normal karena skrip perlu mengakses Spreadsheet Anda sendiri.
7. Cek sheet `06_ADMIN` — baris kedua akan otomatis terisi username, hash password, dan salt. Setelah berhasil, sebaiknya kosongkan kembali `PASSWORD_BARU` di kode agar password asli tidak tertinggal sebagai teks biasa.
8. Klik **Deploy → New deployment**.
   - Klik ikon gerigi ⚙ di "Select type" → pilih **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy**, lalu klik **Authorize access** jika diminta.
9. Salin **Web app URL** yang muncul, formatnya seperti:
   `https://script.google.com/macros/s/AKfycb..................../exec`

> **Catatan:** setiap kali Anda mengubah kode Apps Script, Anda perlu membuat **New deployment** baru (atau *Manage deployments* → ikon pensil → *New version* → Deploy) agar perubahan berlaku pada URL yang sama.

---

## 5. Langkah 3 — Hubungkan Website ke Apps Script

Buka file `config.js`, ganti isinya dengan URL yang disalin dari Langkah 2:

```js
const GOOGLE_APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycb..................../exec';
```

Ini satu-satunya tempat yang perlu diubah — `index.html`, `admin.html`, dan `qrcode.html` semuanya membaca URL dari file ini.

---

## 6. Langkah 4 — Deploy ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `sppg-jeungjing-absensi` (bisa publik, karena tidak ada kredensial di dalam kode frontend).
2. Unggah **seluruh isi** folder `SPPG-JEUNGJING-ABSENSI/` ke repository tersebut (termasuk folder `assets/`, `seed-data/`, dan `google-apps-script/` — dua folder terakhir hanya untuk referensi/dokumentasi, tidak memengaruhi jalannya website).
3. Buka **Settings → Pages** pada repository.
4. Pada "Branch", pilih `main` dan folder `/root`, lalu klik **Save**.
5. Tunggu 1–2 menit — website akan aktif di:
   `https://USERNAME.github.io/sppg-jeungjing-absensi/`

---

## 7. Langkah 5 — Membuat QR Code

1. Buka `https://USERNAME.github.io/sppg-jeungjing-absensi/qrcode.html` di browser.
2. QR Code otomatis dibuat mengikuti alamat website Anda — **tidak perlu diisi manual**.
3. Klik tombol **Cetak QR Code**, lalu tempel hasil cetaknya di lokasi absensi dapur SPPG Jeungjing.

---

## 8. Panduan Penggunaan — Relawan

1. Scan QR Code yang tertempel di lokasi.
2. Pilih **Divisi**.
3. Pilih **Nama** (daftar nama muncul otomatis sesuai divisi yang dipilih).
4. Pilih **Jenis Absensi**: Masuk atau Pulang.
5. Isi **Keterangan** hanya jika perlu (Izin/Sakit/Dinas/Lainnya) — untuk kehadiran biasa, langsung lewati.
6. Tekan **Kirim Absensi**. Tanggal dan jam tercatat otomatis dari server, tidak bisa diketik manual.

---

## 9. Panduan Penggunaan — Admin

1. Buka `admin.html` (tautan "Admin" ada di bagian bawah halaman absensi), login dengan akun yang dibuat di Langkah 2.
2. **Rekap Harian** — pilih tanggal, lihat status tiap relawan (Hadir/Terlambat/Izin/Sakit/Belum Absen), filter per divisi/status, export CSV.
3. **Rekap Bulanan** — pilih bulan, lihat rekap jumlah hadir/terlambat/izin/sakit/tidak hadir per relawan, export CSV.
4. **Kelola Relawan** — tambah relawan baru (ID dibuat otomatis), ubah nama, pindah divisi, aktifkan/nonaktifkan relawan.
5. **Kelola Divisi** — tambah divisi baru; otomatis muncul di form absensi tanpa perlu mengubah kode.

---

## 10. Keamanan

- Password admin **tidak pernah** disimpan di kode frontend (HTML/JS) — hanya *hash* SHA-256 (dengan salt acak) yang tersimpan di sheet `06_ADMIN`.
- Timestamp absensi **selalu** diambil dari server (Apps Script) — relawan tidak dapat mengetik atau memanipulasi jam dari perangkatnya.
- Data mentah `03_DATA_ABSENSI` **tidak pernah dihapus atau ditimpa** oleh sistem, termasuk saat sheet rekap diperbarui.
- Sesi login admin disimpan sementara di **server** (Cache Service, maksimal 6 jam) — bukan di `localStorage` browser. Jika halaman admin di-refresh, Anda perlu login kembali; ini pilihan desain yang disengaja agar tidak ada data sesi tersimpan di perangkat.
- Karena Apps Script dijalankan dengan "Execute as: Me", Spreadsheet **tidak perlu dibagikan secara publik** — hanya Web App URL yang bersifat publik, dan URL itu hanya mengekspos fungsi-fungsi yang memang dirancang untuk diakses (bukan akses langsung ke sheet).
- Disarankan tetap membatasi akses "Share" pada Spreadsheet asli hanya untuk akun Google admin, sebagai lapisan keamanan tambahan.

---

## 11. Asumsi & Catatan Desain

Beberapa hal tidak disebutkan secara eksplisit di permintaan awal, sehingga dibuat keputusan berikut (semuanya mudah diubah):

- **Jam terlambat**: karena jam operasional SPPG Jeungjing yang sebenarnya tidak disebutkan, sistem memakai **07:00 WIB** sebagai contoh batas "Terlambat". Ubah di `Utils.gs` → konstanta `JAM_MASUK_STANDAR`.
- **Status Izin/Sakit**: dicatat melalui field Keterangan yang sama dengan form absensi (bukan form terpisah), sehingga relawan yang berhalangan hadir tetap bisa melapor dari luar lokasi tanpa perlu scan QR Code — cukup membuka tautan website.
- **Divisi HEAD CHEF** sengaja dibiarkan tanpa nama relawan, sesuai catatan Anda agar tidak membuat nama fiktif.
- **Absensi Pulang** mensyaratkan sudah ada absensi Masuk pada hari yang sama (mencegah data pulang tanpa masuk); baik Masuk maupun Pulang hanya bisa dikirim satu kali per hari per relawan.

---

## 12. Troubleshooting

| Gejala | Kemungkinan Penyebab & Solusi |
|---|---|
| Dropdown divisi kosong / "Gagal memuat data" | `config.js` belum diisi URL Apps Script yang benar, atau deployment belum di-set "Anyone" pada "Who has access". |
| Error terkait CORS di console browser | Pastikan tidak menambahkan header `Content-Type` khusus saat memanggil API (sudah ditangani di `common.js`) — ini disengaja agar tidak memicu CORS *preflight* yang tidak didukung Apps Script. |
| Perubahan kode Apps Script tidak terlihat di website | Anda perlu membuat **deployment baru** setiap kali kode diubah (lihat catatan di Langkah 2). |
| Login admin gagal terus | Jalankan ulang `setupAdminPassword()` di Apps Script editor dengan username/password baru. |
| Nama relawan tidak muncul di suatu divisi | Pastikan kolom `STATUS` relawan tersebut adalah `AKTIF` (huruf besar) di sheet `01_DATA_RELAWAN`. |

---

## 13. Pengembangan Lanjutan (opsional)

Beberapa ide untuk pengembangan berikutnya — **belum diimplementasikan**, hanya catatan bila suatu saat dibutuhkan:

- Notifikasi WhatsApp/Telegram otomatis ke admin saat relawan absen masuk.
- Pengaturan jam standar keterlambatan langsung dari dashboard (tanpa membuka Apps Script editor).
- Validasi lokasi (GPS) saat absensi untuk memastikan relawan berada di lokasi dapur.

