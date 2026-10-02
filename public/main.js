// Ghar Bazaar - Core Client Utilities & Navigation Controller

// Safe API Fetch Wrapper
async function api(url, options = {}) {
  const headers = {
    ...(options.headers || {})
  };
  
  // If sending JSON body, set Content-Type header
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    Object.assign(error, data);
    throw error;
  }

  return data;
}

// Global Toast System
function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Currency Formatter
function money(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

// HTML Escaper for XSS Prevention
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

// Property Type Label Helper
function typeLabel(type) {
  switch (type) {
    case "pg": return "PG Accommodation";
    case "studio": return "Studio Apartment";
    case "apartment": return "Full Apartment";
    default: return "Private Room";
  }
}

// Favourites Storage Manager (localStorage)
const FAV_KEY = "GharBazaar_Favs_V3";
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch {
    return [];
  }
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

function toggleFavorite(id) {
  let favs = getFavorites();
  const exists = favs.includes(id);
  if (exists) {
    favs = favs.filter(x => x !== id);
    showToast("Removed from saved favourites.", "warning");
  } else {
    favs.push(id);
    showToast("Added to saved favourites! ♥", "success");
  }
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  
  // Update heart icons on page
  document.querySelectorAll(`.card-fav-btn[data-id="${id}"]`).forEach(btn => {
    btn.classList.toggle("active", !exists);
    btn.innerHTML = !exists ? "♥" : "♡";
  });

  // Trigger custom event so dashboards can update if needed
  window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: favs }));
  return !exists;
}

// Global Auth State & Navbar Update
let currentUser = null;

async function checkAuthStatus() {
  try {
    const data = await api("/api/auth/me");
    currentUser = data.authenticated ? data.user : null;
    updateNavbarUI(currentUser);
    return currentUser;
  } catch (err) {
    currentUser = null;
    updateNavbarUI(null);
    return null;
  }
}

function updateNavbarUI(user) {
  const authNav = document.getElementById("navAuth");
  if (!authNav) return;

  if (user) {
    let dashboardLink = "/user-dashboard.html";
    let dashboardText = "My Dashboard";
    let roleBadge = "Renter";

    if (user.role === "broker") {
      dashboardLink = "/broker-dashboard.html";
      dashboardText = "Broker Portal";
      roleBadge = "Broker";
    } else if (user.role === "admin") {
      dashboardLink = "/admin.html";
      dashboardText = "Admin Panel";
      roleBadge = "Admin";
    }

    authNav.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <a href="${dashboardLink}" class="btn btn-outline btn-sm">
          <span>📊 ${dashboardText}</span>
        </a>
        <div style="display:flex;flex-direction:column;text-align:right">
          <strong style="font-size:13px;line-height:1.2">${escapeHtml(user.name.split(" ")[0])}</strong>
          <span style="font-size:11px;color:var(--muted)">${roleBadge}</span>
        </div>
        <button onclick="handleLogout()" class="btn btn-outline btn-sm" style="color:var(--danger)">
          Logout
        </button>
      </div>
    `;
  } else {
    authNav.innerHTML = `
      <a href="/login.html" class="btn btn-outline btn-sm">Login</a>
      <a href="/signup.html" class="btn btn-primary btn-sm">Sign Up</a>
      <a href="/broker-signup.html" class="btn btn-secondary btn-sm" style="margin-left:4px">+ List Property</a>
    `;
  }
}

// Logout Handler
async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
    showToast("Logged out successfully.", "success");
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Mobile Menu Setup
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".mobile-toggle");
  const menu = document.querySelector(".nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      menu.classList.toggle("show");
    });
  }
  checkAuthStatus();
});
