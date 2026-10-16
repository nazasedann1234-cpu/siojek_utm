document.addEventListener("DOMContentLoaded", () => {
  if (!requireRole("admin")) return; 
  renderAdmin();
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
