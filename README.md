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
  admin.html                # Statistik, laporan transaksi, reset transaksi
  css/
    style.css               # Styling cetak laporan
  js/
    config.js               # Alamat REST API
    utils.js                # Helper API, status, jarak, dan tarif
    session.js              # Sesi browser dan pembatasan tampilan berdasarkan role
    login.js                # Login dan registrasi
    penumpang.js            # Fitur portal penumpang
    driver.js               # Fitur portal pengemudi
    admin.js                # Fitur dashboard administrator
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
  pengemudi. Akun administrator disediakan sebagai akun demo.
- **Penumpang:** memilih lokasi jemput dan tujuan, jenis kendaraan (motor atau
  mobil), serta metode pembayaran cash atau QRIS; melihat estimasi jarak/tarif,
  status dan riwayat pesanan; memberi rating 1–5 dan ulasan setelah perjalanan
  selesai.
- **Pengemudi:** melihat antrean pesanan yang belum ditolak, menerima atau
  menolak pesanan, memperbarui status perjalanan, melihat riwayat dan total
  pendapatan, serta melihat rating dan ulasan penumpang.
- **Administrator:** melihat total pendapatan dari pesanan selesai, jumlah
  pesanan selesai/aktif/seluruhnya, memfilter tabel transaksi berdasarkan
  status, mencetak laporan, dan menghapus seluruh transaksi setelah memasukkan
  admin key `aku_admin`.
- **Akses halaman:** halaman portal memeriksa role yang tersimpan di browser dan
  mengarahkan pengguna yang belum login atau role-nya tidak sesuai kembali ke
  halaman login.

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

Jika akun MySQL menggunakan password, tambahkan opsi `-p`. Sesuaikan juga
konfigurasi koneksi di `backend/server.js` agar cocok dengan pengaturan MySQL
lokal (`host`, `user`, `password`, dan `database`). Konfigurasi bawaan memakai
host `localhost`, user `root`, password kosong, dan database `siojek_utm`.

### 2. Jalankan backend

Dari direktori project:

```powershell
cd backend
npm install
npm start
```

Backend berjalan di `http://localhost:3000`. Biarkan terminal tetap berjalan.
Jika koneksi database gagal, periksa bahwa MySQL aktif, database `siojek_utm`
telah dibuat, dan kredensial pada `server.js` benar.

### 3. Jalankan frontend

Buka folder project di VS Code, lalu jalankan `fronted/login.html` menggunakan
Live Server (atau server file statis lain). Mulai dari halaman login, bukan
langsung membuka portal. Frontend menggunakan API di
`http://localhost:3000/api`; ubah `API_BASE` pada `fronted/js/config.js` bila
alamat backend berbeda.

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
