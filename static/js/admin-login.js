const nodes = {
  form: document.getElementById("loginForm"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  submitBtn: document.getElementById("submitBtn"),
  errorMessage: document.getElementById("errorMessage"),
};

async function applyDefaultTheme() {
  try {
    const res = await fetch("/api/public_config", { cache: "no-store" });
    const data = await res.json();
    window.MissionThemes.apply(data.default_theme || window.MissionThemes.defaultId);
  } catch {
    window.MissionThemes.apply(window.MissionThemes.defaultId);
  }
}

function setError(message) {
  nodes.errorMessage.textContent = message || "";
}

async function submitLogin(event) {
  event.preventDefault();
  setError("");

  const username = String(nodes.username.value || "").trim();
  const password = String(nodes.password.value || "");

  if (!username || !password) {
    setError("请输入账号和密码。");
    return;
  }

  nodes.submitBtn.disabled = true;
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.message || "登录失败");
      return;
    }
    window.location.href = "/admin";
  } catch (error) {
    setError(error.message || "网络异常，请稍后重试。");
  } finally {
    nodes.submitBtn.disabled = false;
  }
}

nodes.form.addEventListener("submit", submitLogin);
applyDefaultTheme();