// ==========================================================
// LOGIN.JS — hanya dipakai di login.html
// Terhubung ke /api/login dan /api/register di server.js
// ==========================================================

// Kalau ternyata sudah login (ada data di localStorage), langsung
// arahkan ke portal masing-masing supaya tidak perlu login ulang.
(function redirectIfAlreadyLoggedIn() {
  const user = loadCurrentUser();
  if (user) {
    goToPortal(user.role);
  }
})();

function goToPortal(role) {
  if (role === "penumpang") window.location.href = "penumpang.html";
  else if (role === "pengemudi") window.location.href = "pengemudi.html";
  else if (role === "admin") window.location.href = "admin.html";
}

function toggleAuthMode(mode) {
  const loginCard = document.getElementById("loginCard");
  const regCard = document.getElementById("registerCard");
  const recoveryCard = document.getElementById("recoveryCard");

  loginCard.classList.toggle("hidden", mode !== "login");
  regCard.classList.toggle("hidden", mode !== "register");
  recoveryCard.classList.toggle("hidden", mode !== "recovery");
}

async function handleRegister(e) {
  e.preventDefault();
  const role = document.getElementById("regRole").value;
  const name = document.getElementById("regName").value;
  const user = document.getElementById("regUser").value;
  const wa = document.getElementById("regWA").value;
  const pass = document.getElementById("regPass").value;

  try {
    const data = await apiCall("/register", {
      method: "POST",
      body: JSON.stringify({ username: user, password: pass, name, role, wa }),
    });
    alert(data.message);
    toggleAuthMode("login");
    if (role === "penumpang") {
      document.getElementById("loginUser").value = user;
      document.getElementById("loginPass").value = pass;
    } else {
      document.getElementById("loginPass").value = "";
    }
    e.target.reset();
  } catch (err) {
    // Pesan error (mis. "NIM/Username sudah terdaftar!") sudah ditampilkan oleh apiCall
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const uInput = document.getElementById("loginUser").value;
  const pInput = document.getElementById("loginPass").value;

  try {
    const data = await apiCall("/login", {
      method: "POST",
      body: JSON.stringify({ username: uInput, password: pInput }),
    });

    saveCurrentUser(data.user);
    goToPortal(data.user.role);
  } catch (err) {
  }
}

async function handleRecovery(e) {
  e.preventDefault();
  const result = document.getElementById("recoveryResult");
  result.classList.add("hidden");

  try {
    const data = await apiCall("/account-recovery", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("recoveryName").value.trim(),
        wa: document.getElementById("recoveryWA").value.trim(),
        newPassword: document.getElementById("recoveryPass").value,
      }),
    });

    result.textContent = data.message;
    result.className = "text-sm rounded-lg p-3 bg-green-50 text-green-800";
    result.classList.remove("hidden");
    document.getElementById("loginUser").value = data.username;
    if (document.getElementById("recoveryPass").value) {
      document.getElementById("loginPass").value = document.getElementById("recoveryPass").value;
    }
    document.getElementById("recoveryPass").value = "";
  } catch (err) {
    result.textContent = err.message;
    result.className = "text-sm rounded-lg p-3 bg-red-50 text-red-700";
    result.classList.remove("hidden");
  }
}
