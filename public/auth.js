// Legacy Auth Helper shim forwarding to main.js standards
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginPageForm") || document.getElementById("loginForm");
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    const msg = document.getElementById("loginMessage");
    if (!emailEl || !passwordEl) return;

    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: emailEl.value.trim(), password: passwordEl.value })
      });
      if (res.user.role === "broker") location.href = "/broker-dashboard.html";
      else if (res.user.role === "admin") location.href = "/admin.html";
      else location.href = "/user-dashboard.html";
    } catch (err) {
      if (err.needsVerification) {
        location.href = "/verify-email.html?email=" + encodeURIComponent(err.email);
        return;
      }
      if (msg) msg.textContent = err.message;
      else showToast(err.message, "error");
    }
  });
});
