document.addEventListener("DOMContentLoaded", () => {
  if (!requireRole("pengemudi")) return; 
  document.getElementById("driverName").innerText = currentUser.name;
  renderDriver();
});

async function renderDriver() {
  const container = document.getElementById("driverOrderList");
  const data = await apiCall(`/orders/driver/${currentUser.id}`);
  const activeOrders = data.orders;

  if (activeOrders.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm text-center col-span-full py-4">Tidak ada pesanan masuk saat ini.</p>`;
  } else {
    container.innerHTML = activeOrders
      .map((item) => {
        const tarif = "Rp " + Number(item.price).toLocaleString("id-ID");
        return `
                    <div class="border rounded-xl p-4 bg-white shadow-sm space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-sm text-blue-900">${item.id} • ${item.jenis}</span>
                            <span class="text-xs px-2.5 py-1 rounded-full font-semibold ${getStatusBadge(item.status)}">${item.status}</span>
                        </div>
                        <div class="text-xs space-y-1 text-gray-600">
                            <p><i class="fa-solid fa-user mr-1"></i> <strong>${item.passenger_name}</strong> (${item.passenger_wa})</p>
                            <p><i class="fa-solid fa-location-dot mr-1 text-red-500"></i> Jemput: ${item.jemput}</p>
                            <p><i class="fa-solid fa-location-arrow mr-1 text-green-500"></i> Tujuan: ${item.tujuan}</p>
                            <p><i class="fa-solid fa-wallet mr-1 text-amber-500"></i> Metode: <strong>${tarif} (${item.metode})</strong></p>
                        </div>
                        <div class="pt-2 border-t flex gap-2">
                            ${
                              item.status === "Mencari Driver"
                                ? `
                                <button onclick="acceptOrder('${item.id}')" class="w-1/2 bg-green-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-green-700">Terima</button>
                                <button onclick="rejectOrder('${item.id}')" class="w-1/2 bg-red-500 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-red-600">Tolak</button>
                            `
                                : ""
                            }
                            ${
                              item.status === "Driver Menuju Lokasi" && item.driver_id === currentUser.id
                                ? `
                                <button onclick="updateStatusDriver('${item.id}', 'Dalam Perjalanan')" class="w-full bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700">Jemput Penumpang</button>
                            `
                                : ""
                            }
                            ${
                              item.status === "Dalam Perjalanan" && item.driver_id === currentUser.id
                                ? `
                                <button onclick="updateStatusDriver('${item.id}', 'Selesai')" class="w-full bg-green-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-green-700">Selesaikan Perjalanan</button>
                            `
                                : ""
                            }
                        </div>
                    </div>
                `;
      })
      .join("");
  }

  await renderDriverHistory();
  await renderDriverReviews();
}

async function renderDriverHistory() {
  const historyContainer = document.getElementById("driverHistoryList");
  const data = await apiCall(`/orders/driver/${currentUser.id}/history`);
  const completedOrders = data.orders;

  let totalIncome = 0;
  completedOrders.forEach((o) => (totalIncome += Number(o.price)));
  document.getElementById("driverTotalIncome").innerText = `Rp ${totalIncome.toLocaleString("id-ID")}`;

  if (completedOrders.length === 0) {
    historyContainer.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">Belum ada riwayat perjalanan selesai.</p>`;
    return;
  }

  historyContainer.innerHTML = completedOrders
    .map((item) => {
      const tarif = "Rp " + Number(item.price).toLocaleString("id-ID");
      return `
                <div class="border rounded-xl p-3 bg-gray-50 flex justify-between items-center text-xs">
                    <div>
                        <span class="font-bold text-blue-900">${item.id}</span> • ${item.jenis}
                        <p class="text-gray-600 mt-0.5">${item.jemput} ➔ ${item.tujuan}</p>
                        <p class="text-gray-500 text-[10px]">Penumpang: ${item.passenger_name} (${item.metode})</p>
                    </div>
                    <div class="text-right">
                        <span class="font-bold text-green-700 text-sm block">${tarif}</span>
                        <span class="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">Selesai</span>
                    </div>
                </div>
            `;
    })
    .join("");
}

async function renderDriverReviews() {
  const reviewContainer = document.getElementById("driverReviewList");
  const data = await apiCall(`/orders/driver/${currentUser.id}/history`);
  const driverOrdersWithReview = data.orders.filter((o) => o.stars);

  if (driverOrdersWithReview.length === 0) {
    reviewContainer.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">Belum ada ulasan diterima.</p>`;
    document.getElementById("driverAvgRating").innerText = ` 0.0`;
    return;
  }

  const totalStars = driverOrdersWithReview.reduce((acc, curr) => acc + curr.stars, 0);
  const avgRating = (totalStars / driverOrdersWithReview.length).toFixed(1);
  document.getElementById("driverAvgRating").innerText = ` ${avgRating}`;

  reviewContainer.innerHTML = driverOrdersWithReview
    .map(
      (item) => `
                <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-gray-800">${item.passenger_name}</span>
                        <span class="text-amber-600 font-bold">${"".repeat(item.stars)}</span>
                    </div>
                    <p class="text-gray-600 italic">"${item.comment}"</p>
                </div>
            `,
    )
    .join("");
}

async function acceptOrder(orderId) {
  try {
    await apiCall(`/orders/${orderId}/accept`, {
      method: "PATCH",
      body: JSON.stringify({ driver_id: currentUser.id }),
    });
    renderDriver();
  } catch (err) {}
}

async function rejectOrder(orderId) {
  try {
    await apiCall(`/orders/${orderId}/reject`, {
      method: "POST",
      body: JSON.stringify({ driver_id: currentUser.id }),
    });
    renderDriver();
  } catch (err) {}
}

async function updateStatusDriver(orderId, newStatus) {
  try {
    await apiCall(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    renderDriver();
  } catch (err) {}
}
