document.addEventListener("DOMContentLoaded", () => {
  if (!requireRole("admin")) return; 
  renderAdmin();
  renderDrivers();
});

async function renderAdmin() {
  const tbody = document.getElementById("adminOrderTable");
  const filterValue = document.getElementById("adminFilterStatus").value;

  const statsData = await apiCall("/admin/stats");
  const stats = statsData.stats;

  document.getElementById("statTotalIncome").innerText = `Rp ${Number(stats.totalIncome).toLocaleString("id-ID")}`;
  document.getElementById("statCompletedOrders").innerText = stats.completedCount;
  document.getElementById("statActiveOrders").innerText = stats.activeCount;
  document.getElementById("statTotalOrders").innerText = stats.totalCount;

  const ordersData = await apiCall("/orders");
  let filteredOrders = ordersData.orders;
  if (filterValue !== "ALL") {
    filteredOrders = filteredOrders.filter((o) => o.status === filterValue);
  }

  if (filteredOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-500">Tidak ada transaksi ditemukan.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredOrders
    .map((item) => {
      const tarif = "Rp " + Number(item.price).toLocaleString("id-ID");
      const driverName = item.driver_name || "-";
      const ulasan = item.stars ? `${"⭐".repeat(item.stars)} (${item.comment})` : "-";
      return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-semibold text-xs">${item.id}</td>
                    <td class="p-3 font-medium">${item.passenger_name}</td>
                    <td class="p-3 text-xs">${item.jenis}</td>
                    <td class="p-3 text-xs">${item.jemput} ➔ ${item.tujuan}</td>
                    <td class="p-3 text-xs font-semibold">${tarif} (${item.metode})</td>
                    <td class="p-3 text-xs font-semibold">${driverName}</td>
                    <td class="p-3"><span class="text-xs px-2 py-1 rounded-full font-semibold ${getStatusBadge(item.status)}">${item.status}</span></td>
                    <td class="p-3 text-xs">${ulasan}</td>
                </tr>
            `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
}

async function renderDrivers() {
  const tbody = document.getElementById("adminDriverTable");
  const count = document.getElementById("pendingDriverCount");
  const adminKey = document.getElementById("adminKeyInput").value.trim();
  if (!adminKey) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">Masukkan admin key, lalu pilih Muat Driver.</td></tr>`;
    return;
  }

  try {
    const data = await apiCall("/admin/drivers", { headers: { "x-admin-key": adminKey } });
    const drivers = data.drivers;
    const pendingCount = drivers.filter((driver) => !driver.approved).length;
    count.innerText = `${pendingCount} pendaftaran menunggu`;

    if (drivers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">Belum ada driver terdaftar.</td></tr>`;
      return;
    }

    tbody.innerHTML = drivers
      .map((driver) => {
        const isApproved = Boolean(driver.approved);
        const registeredAt = new Date(driver.created_at).toLocaleDateString("id-ID");
        const driverId = Number(driver.id);
        return `
          <tr class="border-b hover:bg-gray-50">
            <td class="p-3 font-medium">${escapeHtml(driver.name)}</td>
            <td class="p-3 text-xs">${escapeHtml(driver.username)}</td>
            <td class="p-3 text-xs">${escapeHtml(driver.wa)}</td>
            <td class="p-3">
              <span class="text-xs px-2 py-1 rounded-full font-semibold ${isApproved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}">
                ${isApproved ? "Aktif" : "Menunggu konfirmasi"}
              </span>
            </td>
            <td class="p-3 text-xs">${escapeHtml(registeredAt)}</td>
            <td class="p-3">
              <div class="flex gap-2">
                ${
                  isApproved
                    ? ""
                    : `<button onclick="approveDriver(${driverId})" class="bg-green-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700">Konfirmasi</button>`
                }
                <button onclick="deleteDriver(${driverId})" class="bg-red-100 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200">Hapus</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-600">Data driver gagal dimuat. Periksa koneksi backend lalu coba muat ulang.</td></tr>`;
  }
}

function getDriverAdminKey() {
  const input = document.getElementById("adminKeyInput");
  const adminKey = input.value.trim();
  if (!adminKey) {
    alert("Masukkan admin key dan muat daftar driver terlebih dahulu.");
    input.focus();
    return null;
  }
  return adminKey;
}

async function approveDriver(driverId) {
  if (!confirm("Konfirmasi pendaftaran driver ini? Driver dapat login setelah disetujui.")) return;
  const adminKey = getDriverAdminKey();
  if (adminKey === null) return;

  try {
    await apiCall(`/admin/drivers/${driverId}/approve`, {
      method: "PATCH",
      headers: { "x-admin-key": adminKey },
    });
    await renderDrivers();
  } catch (err) {}
}

async function deleteDriver(driverId) {
  if (!confirm("Hapus akun driver ini? Data pesanan sebelumnya tetap tersimpan.")) return;
  const adminKey = getDriverAdminKey();
  if (adminKey === null) return;

  try {
    await apiCall(`/admin/drivers/${driverId}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    await renderDrivers();
  } catch (err) {}
}

async function clearData() {
  const adminKey = prompt("Masukkan admin key untuk menghapus semua transaksi:");
  if (adminKey === null) return;
  if (!confirm("Hapus semua transaksi? Tindakan ini tidak dapat dibatalkan.")) return;

  try {
    await apiCall("/orders", {
      method: "DELETE",
      body: JSON.stringify({ admin_key: adminKey }),
    });
    alert("Semua transaksi berhasil dihapus.");
    renderAdmin();
  } catch (err) {}
}
