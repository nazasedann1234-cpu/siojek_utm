function saveCurrentUser(user) {
  localStorage.setItem("siojekUser", JSON.stringify(user));
}

function loadCurrentUser() {
  const raw = localStorage.getItem("siojekUser");
  return raw ? JSON.parse(raw) : null;
}

function clearCurrentUser() {
  localStorage.removeItem("siojekUser");
}
let currentUser = loadCurrentUser();

function requireRole(role) {
  currentUser = loadCurrentUser();
  if (!currentUser || currentUser.role !== role) {
    window.location.href = "login.html";
    return false;
  }
  document.getElementById("navUserMenu").classList.remove("hidden");
  document.getElementById("navUserInfo").innerText = `${currentUser.name} (${currentUser.role.toUpperCase()})`;
  return true;
}

function logout() {
  clearCurrentUser();
  window.location.href = "login.html";
}
