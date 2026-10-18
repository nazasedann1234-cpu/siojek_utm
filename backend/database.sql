CREATE DATABASE IF NOT EXISTS siojek_utm;
USE siojek_utm;

-- Tabel Pengguna (Penumpang, Pengemudi, Admin)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('penumpang', 'pengemudi', 'admin') NOT NULL,
    approved TINYINT(1) NOT NULL DEFAULT 1,
    wa VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Transaksi Pesanan Ojek
CREATE TABLE orders (
    id VARCHAR(20) PRIMARY KEY, 
    passenger_id INT NOT NULL,
    driver_id INT NULL,
    jemput VARCHAR(100) NOT NULL,
    tujuan VARCHAR(100) NOT NULL,
    jenis ENUM('Motor', 'Mobil') NOT NULL,
    metode ENUM('Cash', 'QRIS') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('Mencari Driver', 'Driver Menuju Lokasi', 'Dalam Perjalanan', 'Selesai', 'Batal') DEFAULT 'Mencari Driver',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabel Penolakan Pesanan oleh Driver
CREATE TABLE order_rejections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    driver_id INT NOT NULL,
    rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel Rating & Ulasan
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(20) UNIQUE NOT NULL,
    stars INT CHECK (stars BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Data Default (Seed Data)
INSERT INTO users (username, password, name, role, wa) VALUES
('210411100001', 'user123', 'Budi Mahasiswa', 'penumpang', '081234567890'),
('210411100002', 'driver123', 'Mas Ilham (Driver)', 'pengemudi', '089876543210'),
('admin', 'admin123', 'Administrator', 'admin', '0800000000');