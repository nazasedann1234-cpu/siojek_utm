let pendingOrder = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!requireRole("penumpang")) return; 
  document.getElementById("pWA").value = currentUser.wa || "";
  document.getElementById("penumpangName").innerText = currentUser.name;
  renderPenumpang();
});

function updateTarif() {
  const jemput = document.getElementById("pJemput").value;
  const tujuan = document.getElementById("pTujuan").value;
  const jenis = document.getElementById("pJenis").value;
  const tarifElement = document.getElementById("pTarif");
  const jarakElement = document.getElementById("pJarak");

  if (jemput && tujuan && jemput === tujuan) {
    tarifElement.innerText = "Lokasi Sama";
    jarakElement.innerText = "Pilih titik yang berbeda";
    document.getElementById("pHargaCard").innerText = "Lokasi Sama";
    document.getElementById("pJarakCard").innerText = "Pilih titik yang berbeda";
    return;
  }

  const distance = getDistance(jemput, tujuan);
  const rawPrice = getTarifAmount(jemput, tujuan, jenis);
  const priceText = jemput && tujuan ? "Rp " + rawPrice.toLocaleString("id-ID") : "Pilih rute";
  const distanceText = distance ? `Jarak perkiraan ${distance} km` : "Jarak mengikuti titik jemput dan tujuan";
  tarifElement.innerText = priceText;
  jarakElement.innerText = distance ? `Jarak perkiraan ${distance} km` : "Pilih titik jemput dan tujuan";
  document.getElementById("pHargaCard").innerText = priceText;
  document.getElementById("pJarakCard").innerText = distanceText;
}

async function createOrder(e) {
  e.preventDefault();
  const jemput = document.getElementById("pJemput").value;
  const tujuan = document.getElementById("pTujuan").value;
  const jenis = document.getElementById("pJenis").value;
  const metode = document.getElementById("pMetode").value;

  if (jemput === tujuan) {
    alert("Lokasi penjemputan dan tujuan tidak boleh sama!");
    return;
  }

  const rawPrice = getTarifAmount(jemput, tujuan, jenis);
  const tarif = "Rp " + rawPrice.toLocaleString("id-ID");

  const draftOrder = { jemput, tujuan, jenis, metode };

  if (metode === "QRIS") {
    pendingOrder = draftOrder;
    document.getElementById("qrisModalTotal").innerText = tarif;
    document.getElementById("qrisModal").classList.remove("hidden");
  } else {
    await submitOrderToServer(draftOrder);
  }
}

async function submitOrderToServer(draftOrder) {
  try {
    await apiCall("/orders", {
      method: "POST",
      body: JSON.stringify({
        passenger_id: currentUser.id,
        jemput: draftOrder.jemput,
        tujuan: draftOrder.tujuan,
        jenis: draftOrder.jenis,
        metode: draftOrder.metode,
      }),
    });
    alert("Pesanan ojek berhasil dibuat!");
    document.getElementById("orderForm").reset();
    document.getElementById("pWA").value = currentUser.wa || "";
    renderPenumpang();
  } catch (err) {
  }
}

async function confirmQrisPayment() {
  if (pendingOrder) {
    document.getElementById("qrisModal").classList.add("hidden");
    await submitOrderToServer(pendingOrder);
    pendingOrder = null;
    alert("Pembayaran QRIS Diterima! Pesanan diproses.");
  }
}

function closeQrisModal() {
  document.getElementById("qrisModal").classList.add("hidden");
  pendingOrder = null;
}

function openReviewModal(orderId) {
  document.getElementById("reviewOrderId").value = orderId;
  document.getElementById("reviewModal").classList.remove("hidden");
}

function closeReviewModal() {
  document.getElementById("reviewModal").classList.add("hidden");
}

async function submitReview(e) {
  e.preventDefault();
  const orderId = document.getElementById("reviewOrderId").value;
  const stars = parseInt(document.getElementById("reviewStars").value);
  const comment = document.getElementById("reviewComment").value;

  try {
    await apiCall(`/orders/${orderId}/review`, {
      method: "POST",
      body: JSON.stringify({ stars, comment }),
    });
    alert("Terima kasih atas ulasan Anda!");
    closeReviewModal();
    renderPenumpang();
  } catch (err) {
  }
}

async function renderPenumpang() {
  const container = document.getElementById("penumpangOrderList");
  const data = await apiCall(`/orders/penumpang/${currentUser.id}`);
  const myOrders = data.orders;

  if (myOrders.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">Belum ada pesanan aktif.</p>`;
    return;
  }

  container.innerHTML = myOrders
    .map((item) => {
      const tarif = "Rp " + Number(item.price).toLocaleString("id-ID");
      const driverName = item.driver_name || "-";
      return `
                <div class="border rounded-xl p-3 bg-gray-50 space-y-2">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-xs text-blue-900">${item.id} (${item.jenis})</span>
                        <span class="text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusBadge(item.status)}">${item.status}</span>
                    </div>
                    <p class="text-xs font-medium">${item.jemput} ➔ ${item.tujuan}</p>
                    <p class="text-xs text-gray-500">Bayar: <span class="font-bold text-gray-700">${tarif} (${item.metode})</span></p>
                    <p class="text-xs text-gray-500">Driver: <span class="font-bold text-gray-700">${driverName}</span></p>

                    ${
                      item.status === "Selesai" && !item.stars
                        ? `
                        <button onclick="openReviewModal('${item.id}')" class="w-full bg-yellow-500 text-white py-1 rounded-lg text-xs font-bold hover:bg-yellow-600 transition">
                             Beri Rating & Ulasan
                        </button>
                    `
                        : ""
                    }

                    ${
                      item.stars
                        ? `
                        <div class="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                            <p class="font-bold text-yellow-800">Ulasan Anda: ${"⭐".repeat(item.stars)}</p>
                            <p class="text-gray-600 italic">"${item.comment}"</p>
                        </div>
                    `
                        : ""
                    }
                </div>
            `;
    })
    .join("");
}
