(() => {
  const root = document.createElement("div");
  root.className = "notify-root";
  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(root);
  });

  function show(message, type = "info", duration = 2600) {
    const text = String(message || "").trim();
    if (!text) {
      return;
    }

    const item = document.createElement("div");
    item.className = `notify-item ${type}`;
    item.textContent = text;
    root.appendChild(item);

    window.requestAnimationFrame(() => item.classList.add("show"));

    const close = () => {
      item.classList.remove("show");
      window.setTimeout(() => {
        item.remove();
      }, 180);
    };

    window.setTimeout(close, Math.max(800, duration));
  }

  window.notify = show;
})();
