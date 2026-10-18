function togglePasswordVisibility(inputId, iconId) {
  const passwordInput = document.getElementById(inputId);
  const toggleIcon = document.getElementById(iconId);

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  }
}

function getStatusBadge(status) {
  if (status === "Mencari Driver") return "bg-yellow-100 text-yellow-800";
  if (status === "Driver Menuju Lokasi") return "bg-blue-100 text-blue-800";
  if (status === "Dalam Perjalanan") return "bg-purple-100 text-purple-800";
  if (status === "Selesai") return "bg-green-100 text-green-800";
  return "bg-gray-100 text-gray-800";
}

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

function getTarifAmount(jemput, tujuan, jenis) {
  const tarifPerKm = jenis === "Motor" ? 3000 : 8000;
  if (!jemput || !tujuan) return tarifPerKm;
  const distance = getDistance(jemput, tujuan);
  if (distance === 0) return 0;
  if (campusLocations.has(jemput) && campusLocations.has(tujuan)) {
    return tarifPerKm;
  }
  return distance * tarifPerKm;
}

async function apiCall(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err) {
    alert("Gagal terhubung ke server: " + err.message + "\nPastikan backend (server.js) sedang berjalan di http://localhost:3000");
    throw err;
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    const error = new Error("Respons server tidak valid.");
    alert(error.message);
    throw error;
  }
  if (!res.ok || data.status === "error") {
    const error = new Error(data.message || "Terjadi kesalahan pada server.");
    alert(error.message);
    throw error;
  }
  return data;
}
