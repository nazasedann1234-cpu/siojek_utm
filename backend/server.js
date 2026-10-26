const path = require("path");

if (!process.env.VERCEL) {
  require("dotenv").config({ path: path.join(__dirname, ".env.local"), override: true });
}

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_KEY = "aku_admin";

function requireAdminKey(req, res, next) {
  if (req.get("x-admin-key") !== ADMIN_KEY) {
    return res.status(401).json({ status: "error", message: "Admin key salah." });
  }
  next();
}

const db = mysql.createPool({
  host: process.env.DB_HOST || (process.env.VERCEL ? undefined : "127.0.0.1"),
  port: Number(process.env.DB_PORT || (process.env.VERCEL ? 0 : 3306)),
  user: process.env.DB_USER || (process.env.VERCEL ? undefined : "root"),
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "siojek_utm",
  waitForConnections: true,
  connectionLimit: 5,
  connectTimeout: 10000,
  ...(process.env.VERCEL ? { ssl: { rejectUnauthorized: false } } : {}),
});

let databaseReady;
function ensureDatabaseReady() {
  if (!databaseReady) {
    databaseReady = Promise.resolve().then(async () => {
      if (
        process.env.VERCEL &&
        (!process.env.DB_HOST ||
          !process.env.DB_PORT ||
          !process.env.DB_USER ||
          !process.env.DB_PASSWORD ||
          !process.env.DB_NAME)
      ) {
        const err = new Error("Konfigurasi database Vercel belum lengkap.");
        err.code = "DB_CONFIG_MISSING";
        throw err;
      }
      await db.promise().query("SELECT 1");
    }).catch((err) => {
      databaseReady = null;
      throw err;
    });
  }
  return databaseReady;
}

app.get("/api/health/db", async (req, res) => {
  try {
    await ensureDatabaseReady();
    res.json({ status: "success", database: "connected" });
  } catch (err) {
    const code = err.code || "DB_CONNECTION_FAILED";
    console.error("Pemeriksaan koneksi database gagal:", code, err.message);
    res.status(503).json({ status: "error", database: "unavailable", code });
  }
});

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseReady();
    next();
  } catch (err) {
    console.error("Gagal menyiapkan koneksi/database MySQL:", err.code || "UNKNOWN", err.message);
    res.status(503).json({ status: "error", message: "Database sedang tidak tersedia." });
  }
});


const distanceMatrix = {
  "Gedung Rektorat": { "Fakultas Teknik": 1, "Fakultas Ekonomi & Bisnis": 1, "Asrama / Rusunawa": 2, "Telang Indah (Kos)": 3 },
  "Fakultas Teknik": { "Gedung Rektorat": 1, "Fakultas Ekonomi & Bisnis": 1, "Asrama / Rusunawa": 2, "Telang Indah (Kos)": 3 },
  "Fakultas Ekonomi & Bisnis": { "Gedung Rektorat": 1, "Fakultas Teknik": 1, "Asrama / Rusunawa": 2, "Telang Indah (Kos)": 3 },
  "Asrama / Rusunawa": { "Gedung Rektorat": 2, "Fakultas Teknik": 2, "Fakultas Ekonomi & Bisnis": 2, "Telang Indah (Kos)": 2 },
  "Telang Indah (Kos)": { "Gedung Rektorat": 3, "Fakultas Teknik": 3, "Fakultas Ekonomi & Bisnis": 3, "Asrama / Rusunawa": 2 },
};

const campusLocations = new Set([
  "Gedung Rektorat",
  "Fakultas Teknik",
  "Fakultas Ekonomi & Bisnis",
  "Asrama / Rusunawa",
]);

function getDistance(jemput, tujuan) {
  if (!jemput || !tujuan) return null;
  if (jemput === tujuan) return 0;
  return (distanceMatrix[jemput] && distanceMatrix[jemput][tujuan]) || 1;
}

function getTarif(jemput, tujuan, jenis) {
  const distance = getDistance(jemput, tujuan);
  if (distance === 0) return 0;
  const tarifPerKm = jenis === "Motor" ? 3000 : 8000;
  if (campusLocations.has(jemput) && campusLocations.has(tujuan)) {
    return tarifPerKm;
  }
  return distance * tarifPerKm;
}

function generateOrderId() {
  return "ORD-" + Math.floor(1000 + Math.random() * 9000);
}


app.post("/api/register", (req, res) => {
  const { username, password, name, role, wa } = req.body;
  if (!username || !password || !name || !role || !wa) {
    return res.status(400).json({ status: "error", message: "Semua field wajib diisi." });
  }
  if (!["penumpang", "pengemudi"].includes(role)) {
    return res.status(400).json({ status: "error", message: "Role pendaftaran tidak valid." });
  }

  const approved = role === "pengemudi" ? 0 : 1;
  const query = "INSERT INTO users (username, password, name, role, wa, approved) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(query, [username, password, name, role, wa, approved], (err) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ status: "error", message: "NIM/Username sudah terdaftar!" });
      }
      return res.status(500).json({ status: "error", message: err.message });
    }
    const message =
      role === "pengemudi"
        ? "Pendaftaran berhasil. Tunggu konfirmasi admin sebelum login."
        : "Registrasi berhasil! Silakan login.";
    res.json({ status: "success", message });
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT id, username, name, role, wa, approved FROM users WHERE username = ? AND password = ?";
  db.query(query, [username, password], (err, rows) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    if (rows.length === 0) {
      return res.status(401).json({ status: "error", message: "NIM/Username atau Password salah!" });
    }
    if (rows[0].role === "pengemudi" && !rows[0].approved) {
      return res.status(403).json({ status: "error", message: "Pendaftaran driver Anda masih menunggu konfirmasi admin." });
    }
    res.json({ status: "success", user: rows[0] });
  });
});

app.post("/api/account-recovery", (req, res) => {
  const name = String(req.body.name || "").trim();
  const wa = String(req.body.wa || "").replace(/\D/g, "");
  const newPassword = String(req.body.newPassword || "");
  if (!name || !wa) {
    return res.status(400).json({ status: "error", message: "Nama dan nomor WhatsApp wajib diisi." });
  }
  if (newPassword && (newPassword.length < 8 || newPassword.length > 72)) {
    return res.status(400).json({ status: "error", message: "Password baru harus terdiri dari 8 sampai 72 karakter." });
  }

  db.query("SELECT id, username, wa FROM users WHERE LOWER(name) = LOWER(?) AND role != 'admin'", [name], (err, rows) => {
    if (err) return res.status(500).json({ status: "error", message: "Pemulihan akun gagal diproses." });
    const matchedUsers = rows.filter((user) => String(user.wa).replace(/\D/g, "") === wa);
    if (matchedUsers.length !== 1) {
      return res.status(404).json({ status: "error", message: "Data tidak cocok. Pastikan nama dan WhatsApp sama seperti saat mendaftar." });
    }

    const user = matchedUsers[0];
    if (!newPassword) {
      return res.json({ status: "success", username: user.username, message: `Username Anda: ${user.username}` });
    }

    db.query("UPDATE users SET password = ? WHERE id = ?", [newPassword, user.id], (updateErr) => {
      if (updateErr) return res.status(500).json({ status: "error", message: "Password baru gagal disimpan." });
      res.json({ status: "success", username: user.username, message: `Username ditemukan dan password berhasil diperbarui.` });
    });
  });
});



app.post("/api/orders", (req, res) => {
  const { passenger_id, jemput, tujuan, jenis, metode } = req.body;
  if (!passenger_id || !jemput || !tujuan || !jenis || !metode) {
    return res.status(400).json({ status: "error", message: "Data pesanan tidak lengkap." });
  }
  if (jemput === tujuan) {
    return res.status(400).json({ status: "error", message: "Lokasi jemput dan tujuan tidak boleh sama." });
  }

  const id = generateOrderId();
  const price = getTarif(jemput, tujuan, jenis);
  const query = `INSERT INTO orders (id, passenger_id, jemput, tujuan, jenis, metode, price, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Mencari Driver')`;

  db.query(query, [id, passenger_id, jemput, tujuan, jenis, metode, price], (err) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", order: { id, price } });
  });
});

app.get("/api/orders/penumpang/:passengerId", (req, res) => {
  const query = `
    SELECT o.*, d.name AS driver_name, r.stars, r.comment
    FROM orders o
    LEFT JOIN users d ON o.driver_id = d.id
    LEFT JOIN reviews r ON r.order_id = o.id
    WHERE o.passenger_id = ?
    ORDER BY o.created_at DESC
  `;
  db.query(query, [req.params.passengerId], (err, rows) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", orders: rows });
  });
});



app.get("/api/orders/driver/:driverId", (req, res) => {
  const query = `
    SELECT o.*, u.name AS passenger_name, u.wa AS passenger_wa
    FROM orders o
    JOIN users u ON o.passenger_id = u.id
    WHERE o.status != 'Selesai'
      AND o.id NOT IN (SELECT order_id FROM order_rejections WHERE driver_id = ?)
    ORDER BY o.created_at ASC
  `;
  db.query(query, [req.params.driverId], (err, rows) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", orders: rows });
  });
});

app.get("/api/orders/driver/:driverId/history", (req, res) => {
  const query = `
    SELECT o.*, u.name AS passenger_name, r.stars, r.comment
    FROM orders o
    JOIN users u ON o.passenger_id = u.id
    LEFT JOIN reviews r ON r.order_id = o.id
    WHERE o.driver_id = ? AND o.status = 'Selesai'
    ORDER BY o.created_at DESC
  `;
  db.query(query, [req.params.driverId], (err, rows) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", orders: rows });
  });
});

app.patch("/api/orders/:id/accept", (req, res) => {
  const { driver_id } = req.body;
  const query = "UPDATE orders SET driver_id = ?, status = 'Driver Menuju Lokasi' WHERE id = ?";
  db.query(query, [driver_id, req.params.id], (err) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success" });
  });
});

app.post("/api/orders/:id/reject", (req, res) => {
  const { driver_id } = req.body;
  const query = "INSERT INTO order_rejections (order_id, driver_id) VALUES (?, ?)";
  db.query(query, [req.params.id, driver_id], (err) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success" });
  });
});

app.patch("/api/orders/:id/status", (req, res) => {
  const { status } = req.body;
  const allowed = ["Driver Menuju Lokasi", "Dalam Perjalanan", "Selesai"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ status: "error", message: "Status tidak valid." });
  }
  const query = "UPDATE orders SET status = ? WHERE id = ?";
  db.query(query, [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success" });
  });
});



app.post("/api/orders/:id/review", (req, res) => {
  const { stars, comment } = req.body;
  const query = "INSERT INTO reviews (order_id, stars, comment) VALUES (?, ?, ?)";
  db.query(query, [req.params.id, stars, comment], (err) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success" });
  });
});



app.get("/api/orders", (req, res) => {
  const query = `
    SELECT o.*, p.name AS passenger_name, d.name AS driver_name, r.stars, r.comment
    FROM orders o
    JOIN users p ON o.passenger_id = p.id
    LEFT JOIN users d ON o.driver_id = d.id
    LEFT JOIN reviews r ON r.order_id = o.id
    ORDER BY o.created_at DESC
  `;
  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", orders: rows });
  });
});

app.get("/api/admin/drivers", requireAdminKey, (req, res) => {
  const query = `
    SELECT id, username, name, wa, approved, created_at
    FROM users
    WHERE role = 'pengemudi'
    ORDER BY approved ASC, created_at DESC
  `;
  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", drivers: rows });
  });
});

app.patch("/api/admin/drivers/:id/approve", requireAdminKey, (req, res) => {
  const driverId = Number(req.params.id);
  if (!Number.isInteger(driverId) || driverId < 1) {
    return res.status(400).json({ status: "error", message: "ID driver tidak valid." });
  }

  const query = "UPDATE users SET approved = 1 WHERE id = ? AND role = 'pengemudi' AND approved = 0";
  db.query(query, [driverId], (err, result) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    if (result.affectedRows > 0) {
      return res.json({ status: "success", message: "Pendaftaran driver berhasil dikonfirmasi." });
    }

    db.query("SELECT approved FROM users WHERE id = ? AND role = 'pengemudi'", [driverId], (lookupErr, rows) => {
      if (lookupErr) return res.status(500).json({ status: "error", message: lookupErr.message });
      if (rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Driver tidak ditemukan." });
      }
      res.status(409).json({ status: "error", message: "Driver sudah dikonfirmasi sebelumnya." });
    });
  });
});

app.delete("/api/admin/drivers/:id", requireAdminKey, (req, res) => {
  const driverId = Number(req.params.id);
  if (!Number.isInteger(driverId) || driverId < 1) {
    return res.status(400).json({ status: "error", message: "ID driver tidak valid." });
  }

  db.query("DELETE FROM users WHERE id = ? AND role = 'pengemudi'", [driverId], (err, result) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "Driver tidak ditemukan." });
    }
    res.json({ status: "success", message: "Driver berhasil dihapus." });
  });
});

app.get("/api/admin/stats", (req, res) => {
  const query = `
    SELECT
      COALESCE(SUM(CASE WHEN status = 'Selesai' THEN price ELSE 0 END), 0) AS totalIncome,
      SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) AS completedCount,
      SUM(CASE WHEN status IN ('Driver Menuju Lokasi', 'Dalam Perjalanan') THEN 1 ELSE 0 END) AS activeCount,
      COUNT(*) AS totalCount
    FROM orders
  `;
  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", stats: rows[0] });
  });
});

app.delete("/api/orders", (req, res) => {
  if (req.body.admin_key !== ADMIN_KEY) {
    return res.status(401).json({ status: "error", message: "Admin key salah." });
  }

  db.query("DELETE FROM orders", (err) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", message: "Semua transaksi telah dihapus." });
  });
});

if (process.env.VERCEL) {
  module.exports = app;
} else {
  ensureDatabaseReady().then(
    () => {
      console.log("Terhubung ke MySQL Database!");
      const port = Number(process.env.PORT || 3000);
      app.listen(port, () => console.log(`Server Backend berjalan di http://localhost:${port}`));
    },
    (err) => {
      console.error("Backend tidak dijalankan:", err.message);
      db.end();
      process.exitCode = 1;
    },
  );
}
