(() => {
  const BASE_WIDTH = 1920;
  const BASE_HEIGHT = 1080;

  const body = document.body;
  if (!body) {
    return;
  }

  const modeFromBody = String(body.dataset?.viewMode || "").trim().toLowerCase();
  const modeFromQuery = (() => {
    try {
      return String(new URL(window.location.href).searchParams.get("mode") || "").trim().toLowerCase();
    } catch {
      return "";
    }
  })();
  const mode = modeFromBody || modeFromQuery;

  if (mode !== "obs" && mode !== "video") {
    return;
  }

  const missionOverlay = document.querySelector(".mission-overlay");
  const timelineLayer = document.querySelector(".timeline-fixed-layer");
  if (!missionOverlay || !timelineLayer) {
    return;
  }

  let layoutRoot = document.getElementById("viewerLayoutRoot");
  if (!layoutRoot) {
    layoutRoot = document.createElement("div");
    layoutRoot.id = "viewerLayoutRoot";
    layoutRoot.className = "viewer-layout-root";
    body.appendChild(layoutRoot);
  }

  if (missionOverlay.parentElement !== layoutRoot) {
    layoutRoot.appendChild(missionOverlay);
  }
  if (timelineLayer.parentElement !== layoutRoot) {
    layoutRoot.appendChild(timelineLayer);
  }

  function getTargetViewportSize() {
    const width = window.innerWidth || document.documentElement.clientWidth || BASE_WIDTH;
    const height = window.innerHeight || document.documentElement.clientHeight || BASE_HEIGHT;

    return {
      width,
      height,
    };
  }

  function updateLayoutScale() {
    const viewport = getTargetViewportSize();
    const scale = Math.min(viewport.width / BASE_WIDTH, viewport.height / BASE_HEIGHT);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

    layoutRoot.style.transform = `translate(-50%, -50%) scale(${safeScale})`;
  }

  let rafHandle = 0;
  function scheduleLayoutUpdate() {
    if (rafHandle) {
      return;
    }
    rafHandle = window.requestAnimationFrame(() => {
      rafHandle = 0;
      updateLayoutScale();
    });
  }

  window.addEventListener("resize", scheduleLayoutUpdate);
  window.addEventListener("orientationchange", scheduleLayoutUpdate);

  scheduleLayoutUpdate();
})();
