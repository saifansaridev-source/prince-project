const params = new URLSearchParams(location.search);
const email = params.get("email") || "";
const otpParam = params.get("otp") || "";

const emailText = document.getElementById("emailText");
if (emailText) emailText.textContent = email;

const otpInput = document.getElementById("verifyOtp");
if (otpInput && otpParam) otpInput.value = otpParam;

async function api(url, options = {}) {
  const r = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "Something went wrong");
  return d;
}

document.getElementById("verifyForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const m = document.getElementById("verifyMessage");
  try {
    await api("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({
        email,
        otp: document.getElementById("verifyOtp").value.trim()
      })
    });
    location.href = "/app";
  } catch (err) {
    if (m) {
      m.textContent = err.message;
      m.style.color = "crimson";
    }
  }
});

document.getElementById("resendBtn")?.addEventListener("click", async () => {
  const m = document.getElementById("verifyMessage");
  try {
    const d = await api("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    if (m) {
      m.textContent = d.message;
      m.style.color = "#0f5132";
    }
  } catch (err) {
    if (m) {
      m.textContent = err.message;
      m.style.color = "crimson";
    }
  }
});
