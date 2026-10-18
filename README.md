# SIOJEK UTM

SIOJEK UTM adalah aplikasi pemesanan ojek mahasiswa dengan frontend HTML, CSS,
dan JavaScript, serta backend REST API menggunakan Node.js, Express, dan MySQL.
Tampilan dipisah menjadi halaman login, penumpang, pengemudi, dan administrator.

## Struktur project

```text
fronted/                    # Folder frontend (nama folder sesuai project saat ini)
  login.html                # Login dan pendaftaran akun
  penumpang.html            # Pemesanan, pembayaran demo, riwayat, rating
  pengemudi.html            # Antrean, proses perjalanan, pendapatan, ulasan
  admin.html                # Manajemen driver, statistik, dan laporan transaksi
  css/
    style.css               # Styling cetak laporan
  js/
    config.js               # Alamat REST API
    utils.js                # Helper API, status, jarak, dan tarif
    session.js              # Sesi browser dan pembatasan tampilan berdasarkan role
    login.js                # Login dan registrasi
    penumpang.js            # Fitur portal penumpang
    driver.js               # Fitur portal pengemudi
    admin.js                # Manajemen driver dan dashboard administrator
backend/
  server.js                 # REST API Express dan koneksi MySQL
  database.sql              # Pembuatan database, tabel, dan akun demo
  package.json              # Dependency dan perintah backend
  package-lock.json
```

> Ejaan folder frontend di project ini adalah `fronted` (bukan `frontend`).
> Gunakan nama tersebut saat menjalankan atau membuka file.

## Fitur

- **Login dan pendaftaran:** pengguna dapat mendaftar sebagai penumpang atau
  pengemudi. Pendaftaran driver menunggu konfirmasi admin sebelum akun dapat
  digunakan. Akun administrator disediakan sebagai akun demo.
- **Penumpang:** memilih lokasi jemput dan tujuan, jenis kendaraan (motor atau
  mobil), serta metode pembayaran cash atau QRIS; melihat estimasi jarak/tarif,
  status dan riwayat pesanan; memberi rating 1–5 dan ulasan setelah perjalanan
  selesai.
- **Pengemudi:** melihat antrean pesanan yang belum ditolak, menerima atau
  menolak pesanan, memperbarui status perjalanan, melihat riwayat dan total
  pendapatan, serta melihat rating dan ulasan penumpang.
- **Administrator:** mengonfirmasi pendaftaran dan menghapus akun driver,
  melihat total pendapatan dari pesanan selesai, jumlah pesanan
  selesai/aktif/seluruhnya, memfilter tabel transaksi berdasarkan status,
  mencetak laporan, dan menghapus seluruh transaksi setelah memasukkan admin
  key `aku_admin`.
- **Akses halaman:** halaman portal memeriksa role yang tersimpan di browser dan
  mengarahkan pengguna yang belum login atau role-nya tidak sesuai kembali ke
  halaman login.

Kolom persetujuan driver ditambahkan otomatis saat backend pertama kali
dijalankan pada database lama. Akun driver yang sudah ada tetap aktif; driver
yang mendaftar setelah perubahan harus disetujui admin.

### Status perjalanan

Alur normal pesanan adalah `Mencari Driver` → `Driver Menuju Lokasi` →
`Dalam Perjalanan` → `Selesai`. Driver dapat menolak pesanan; pesanan tersebut
tidak lagi ditampilkan kepada driver yang menolaknya.

### Lokasi dan tarif

Lokasi yang tersedia adalah Gedung Rektorat, Fakultas Teknik, Fakultas
Ekonomi & Bisnis, Asrama / Rusunawa, dan Telang Indah (Kos).

- Antar lokasi kampus (Rektorat, Fakultas Teknik, Fakultas Ekonomi & Bisnis,
  dan Asrama / Rusunawa): Rp3.000 untuk motor atau Rp8.000 untuk mobil per
  perjalanan.
- Rute yang melibatkan Telang Indah (Kos): tarif per km dikalikan jarak pada
  matriks jarak di `fronted/js/utils.js` dan `backend/server.js` (motor
  Rp3.000/km, mobil Rp8.000/km).
- Titik jemput dan tujuan tidak boleh sama. Estimasi di frontend dan tarif yang
  dihitung backend menggunakan aturan dan matriks jarak yang sama.

## Menjalankan aplikasi di Windows dengan XAMPP

### 1. Siapkan database

Jalankan Apache/MySQL dari XAMPP, lalu impor `backend/database.sql` melalui
phpMyAdmin atau terminal MySQL. Contoh jika perintah `mysql` tersedia di PATH
dan akun `root` tidak menggunakan password:

```cmd
mysql -u root < backend/database.sql
```

Jika akun MySQL menggunakan password, tambahkan opsi `-p`. Database lokal
`siojek_utm` harus sudah ada di MySQL XAMPP. Konfigurasi default backend lokal
menggunakan `127.0.0.1:3306`, user `root`, tanpa password, dan database
`siojek_utm`.

### 2. Jalankan backend secara lokal

Secara default backend menggunakan database MySQL lokal XAMPP. Jika pengaturan
MySQL Anda berbeda, salin template ini menjadi `.env.local` di folder `backend`
dan sesuaikan nilainya. File lokal tersebut diabaikan Git:

```powershell
cd backend
Copy-Item .env.example .env.local
notepad .env.local
npm install
npm start
```

Atur `DB_PASSWORD` di `.env.local` hanya jika MySQL lokal Anda memakai password.
File `backend/.env.local` dimuat otomatis saat berjalan lokal. Backend hanya
mulai mendengarkan di `http://localhost:3000` setelah koneksi dan persiapan
database berhasil.

### 3. Jalankan frontend secara lokal

Buka folder project di VS Code, lalu jalankan `fronted/login.html` menggunakan
Live Server (atau server file statis lain). Mulai dari halaman login, bukan
langsung membuka portal. Frontend menggunakan API di
`http://localhost:3000/api`; ubah `API_BASE` pada `fronted/js/config.js` bila
alamat backend berbeda.

### Deploy ke Vercel

`vercel.json` membangun `backend/server.js` sebagai Node.js Function dan
menyajikan file statis dari `fronted/`. Halaman utama diarahkan ke
`fronted/login.html`; permintaan `/api/*` diteruskan ke Express. Frontend
menggunakan `/api` pada domain Vercel dan tetap menggunakan
`http://localhost:3000/api` saat dijalankan di localhost.

Tambahkan environment variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
dan `DB_NAME` untuk Aiven pada pengaturan project Vercel. Pastikan database
MySQL dapat menerima koneksi dari deployment Vercel. Jangan menyimpan password
database di `vercel.json` atau source control.

Setelah deploy, periksa `https://<domain-vercel-anda>/api/health/db`. Respons
`{"status":"success","database":"connected"}` berarti koneksi berhasil. Jika
gagal, `code` pada respons dan Runtime Logs Vercel membantu membedakan
konfigurasi yang belum lengkap, kredensial salah, atau koneksi jaringan yang
ditolak. Pastikan kelima environment variables di atas diatur untuk environment
deployment yang sedang diuji (Production atau Preview), lalu redeploy. Jika
Runtime Logs menunjukkan timeout/koneksi ditolak, periksa akses jaringan atau
IP allowlist pada layanan Aiven.

### Akun demo

| Role | Username | Password |
|---|---|---|
| Penumpang | `210411100001` | `user123` |
| Pengemudi | `210411100002` | `driver123` |
| Admin | `admin` | `admin123` |

Setelah login, aplikasi mengarahkan pengguna ke portal sesuai role. Sesi browser
disimpan di `localStorage` oleh `fronted/js/session.js` agar tetap tersedia saat
berpindah halaman; data password tidak disimpan di sesi tersebut.

## Endpoint REST API

Semua endpoint menggunakan prefix `/api`. Request dengan body mengirim JSON.

| Method | Endpoint | Kegunaan |
|---|---|---|
| `POST` | `/register` | Membuat akun penumpang/pengemudi |
| `POST` | `/login` | Memeriksa username dan password |
| `POST` | `/orders` | Membuat pesanan dan menghitung tarif |
| `GET` | `/orders/penumpang/:passengerId` | Melihat pesanan penumpang beserta driver dan ulasan |
| `GET` | `/orders/driver/:driverId` | Melihat pesanan yang belum selesai dan belum ditolak driver |
| `GET` | `/orders/driver/:driverId/history` | Melihat perjalanan selesai dan ulasannya |
| `PATCH` | `/orders/:id/accept` | Menerima pesanan sebagai driver |
| `POST` | `/orders/:id/reject` | Menolak pesanan sebagai driver |
| `PATCH` | `/orders/:id/status` | Memperbarui status perjalanan |
| `POST` | `/orders/:id/review` | Menambahkan rating dan ulasan |
| `GET` | `/orders` | Mengambil seluruh transaksi untuk laporan admin |
| `GET` | `/admin/stats` | Mengambil ringkasan statistik admin |
| `GET` | `/admin/drivers` | Mengambil daftar driver; perlu header `x-admin-key: aku_admin` |
| `PATCH` | `/admin/drivers/:id/approve` | Mengonfirmasi pendaftaran driver; perlu header `x-admin-key: aku_admin` |
| `DELETE` | `/admin/drivers/:id` | Menghapus akun driver; perlu header `x-admin-key: aku_admin` |
| `DELETE` | `/orders` | Menghapus seluruh transaksi; perlu body JSON `{"admin_key":"aku_admin"}` |

## Catatan batasan demo

- Konfirmasi QRIS pada aplikasi adalah simulasi: tombol **Saya Sudah Bayar**
  meneruskan pesanan tanpa memverifikasi transaksi ke penyedia pembayaran.
- Password saat ini disimpan dan dibandingkan sebagai teks biasa di database.
  Implementasi ini hanya untuk demo/tugas; aplikasi produksi perlu hashing
  password dan pengamanan autentikasi yang sesuai.
- Pemeriksaan role di portal dilakukan di frontend melalui `localStorage`.
  Endpoint backend saat ini belum menerapkan autentikasi/otorisasi, sehingga
  mekanisme tersebut bukan perlindungan keamanan untuk penggunaan produksi.
- Tombol **Reset Data** meminta admin key `aku_admin` dan menghapus seluruh
  pesanan. Backend juga memvalidasi key tersebut sebelum menghapus data.
- Admin key ini ditanam langsung di kode untuk kebutuhan demo, jadi bukan
  rahasia yang aman untuk aplikasi produksi. Untuk deployment, gunakan
  konfigurasi rahasia di server dan autentikasi/otorisasi admin yang memadai.
