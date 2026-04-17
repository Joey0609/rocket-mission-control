const nodes = {
  modelName: document.getElementById("modelName"),
  payloadName: document.getElementById("payloadName"),
  statusLine: document.getElementById("statusLine"),
  channelMode: document.getElementById("channelMode"),
  missionClock: document.getElementById("missionClock"),
  overlayClockSign: document.getElementById("overlayClockSign"),
  overlayClockTime: document.getElementById("overlayClockTime"),
  overlayMissionName: document.getElementById("overlayMissionName"),
  overlayVehicleChunk: document.getElementById("overlayVehicleChunk"),
  overlayVehicleName: document.getElementById("overlayVehicleName"),
  overlayPayloadChunk: document.getElementById("overlayPayloadChunk"),
  currentStage: document.getElementById("currentStage"),
  overlayHoldIndicator: document.getElementById("overlayHoldIndicator"),
  currentEvent: document.getElementById("currentEvent"),
  nextDescription: document.getElementById("nextDescription"),
  missionCard: document.getElementById("missionCard"),
  timelineMount: document.getElementById("timelineMount"),
  telemetryGaugesLeft: document.getElementById("telemetryGaugesLeft"),
  telemetryGaugesRight: document.getElementById("telemetryGaugesRight"),

  openThemeModalBtn: document.getElementById("openThemeModalBtn"),
  themeModal: document.getElementById("themeModal"),
  themeBackdrop: document.getElementById("themeBackdrop"),
  themeGrid: document.getElementById("themeGrid"),
  applyThemeBtn: document.getElementById("applyThemeBtn"),
  cancelThemeBtn: document.getElementById("cancelThemeBtn"),
};

const CLOCK_TICK_MS = 20;
const TIME_JUMP_SMOOTH_MS = 1000;
const DEFAULT_MISSION_WINDOW_SECONDS = 3600;

let serverAnchor = {
  ms: 0,
  anchorPerf: performance.now(),
  running: false,
};

let displaySmooth = {
  active: false,
  offsetMs: 0,
  startPerf: 0,
};

let timelineRenderer = null;
let timelineNodesSignature = "";
let lastState = null;
let telemetryGaugePanel = null;

let adminDefaultThemeId = window.MissionThemes.defaultId;
let currentThemeId = adminDefaultThemeId;
let themeModalDraftId = currentThemeId;
let themeModalOriginId = currentThemeId;

let viewMode = "visitor";
let forceDashboardMode = false;
let manualMissionOverrideMs = null;

function toast(message, type = "info") {
  if (typeof window.notify === "function") {
    window.notify(message, type);
  }
}

function queryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function initViewMode() {
  const fromBody = String(document.body?.dataset?.viewMode || "").trim().toLowerCase();
  const fromQuery = String(queryParam("mode") || "").trim().toLowerCase();
  const resolved = [fromBody, fromQuery].find((item) => item === "obs" || item === "video") || "visitor";

  viewMode = resolved;
  forceDashboardMode = viewMode === "obs" || viewMode === "video";

  if (document.body) {
    document.body.dataset.viewMode = viewMode;
    document.body.classList.remove("viewer-mode-visitor", "viewer-mode-obs", "viewer-mode-video");
    document.body.classList.add(`viewer-mode-${viewMode}`);
  }

  if (document.documentElement) {
    document.documentElement.classList.remove("viewer-mode-visitor", "viewer-mode-obs", "viewer-mode-video");
    document.documentElement.classList.add(`viewer-mode-${viewMode}`);
  }
}

function setTextIfChanged(element, text) {
  if (!element) {
    return;
  }
  if (element.dataset.lastText !== text) {
    element.textContent = text;
    element.dataset.lastText = text;
  }
}

function applyTheme(themeId) {
  currentThemeId = window.MissionThemes.apply(themeId);
  const themeMeta = window.MissionThemes.get(currentThemeId);
  setTextIfChanged(nodes.openThemeModalBtn, `主题: ${themeMeta.name}`);
}

function getThemePreviewColors(theme) {
  const values = Object.values(theme?.vars || {});
  const first = values[0] || theme?.vars?.["--bg-1"] || "#243141";
  const second = values[1] || theme?.vars?.["--bg-2"] || first;
  return [first, second];
}

function parseThemeColor(rawColor) {
  const value = String(rawColor || "").trim();
  const shortHex = /^#([0-9a-f]{3})$/i;
  const longHex = /^#([0-9a-f]{6})$/i;
  const rgbMatch = /^rgb\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;

  if (shortHex.test(value)) {
    const hex = value.slice(1);
    return {
      r: Number.parseInt(hex[0] + hex[0], 16),
      g: Number.parseInt(hex[1] + hex[1], 16),
      b: Number.parseInt(hex[2] + hex[2], 16),
    };
  }

  if (longHex.test(value)) {
    const hex = value.slice(1);
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }

  const matched = value.match(rgbMatch);
  if (matched) {
    return {
      r: Math.max(0, Math.min(255, Number.parseInt(matched[1], 10) || 0)),
      g: Math.max(0, Math.min(255, Number.parseInt(matched[2], 10) || 0)),
      b: Math.max(0, Math.min(255, Number.parseInt(matched[3], 10) || 0)),
    };
  }

  return { r: 40, g: 64, b: 96 };
}

function getThemeLuma(theme) {
  const [firstColor] = getThemePreviewColors(theme);
  const rgb = parseThemeColor(firstColor);
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

function getSortedThemes() {
  return window.MissionThemes
    .list()
    .slice()
    .sort((a, b) => getThemeLuma(b) - getThemeLuma(a));
}

async function loadDefaultTheme() {
  const themeFromQuery = queryParam("theme");
  if (themeFromQuery) {
    adminDefaultThemeId = themeFromQuery;
    applyTheme(themeFromQuery);
    return;
  }

  try {
    const res = await fetch("/api/public_config", { cache: "no-store" });
    const data = await res.json();
    adminDefaultThemeId = data.default_theme || window.MissionThemes.defaultId;
  } catch {
    adminDefaultThemeId = window.MissionThemes.defaultId;
  }
  applyTheme(adminDefaultThemeId);
}

async function loadInitialState() {
  const endpoints = ["/api/visitor_state", "/api/state"];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        continue;
      }
      return await res.json();
    } catch {
      // try next endpoint
    }
  }
  throw new Error("初始化状态获取失败");
}

function renderThemeCards() {
  const items = getSortedThemes();
  nodes.themeGrid.innerHTML = "";

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "theme-card";
    card.classList.toggle("active", item.id === themeModalDraftId);
    card.dataset.themeId = item.id;

    const title = document.createElement("span");
    title.className = "name";
    title.textContent = item.name;
    card.appendChild(title);

    const [c1, c2] = getThemePreviewColors(item);
    const preview = document.createElement("div");
    preview.className = "theme-preview-gradient";
    preview.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
    card.appendChild(preview);

    card.addEventListener("click", () => {
      themeModalDraftId = item.id;
      applyTheme(item.id);
      renderThemeCards();
    });

    nodes.themeGrid.appendChild(card);
  }
}

function openThemeModal() {
  themeModalOriginId = currentThemeId;
  themeModalDraftId = currentThemeId;
  renderThemeCards();
  nodes.themeModal.classList.remove("hidden");
}

function closeThemeModal(restoreOrigin) {
  nodes.themeModal.classList.add("hidden");
  if (restoreOrigin) {
    applyTheme(themeModalOriginId);
  }
  return true;
}

function updateChannel(mode) {
  nodes.channelMode.textContent = mode === "sse" ? "实时通道: SSE 推送" : "实时通道: 重连中";
  nodes.channelMode.classList.toggle("poll", mode !== "sse");
}

function formatSignedClock(msValue) {
  const sign = msValue < 0 ? "-" : "+";
  const absMs = Math.abs(Math.trunc(msValue));
  const totalSeconds = Math.floor(absMs / 1000);
  const millis = absMs % 1000;

  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `T${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  }

  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `T${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function formatMissionOverlayClock(msValue) {
  const totalSeconds = Number(msValue || 0) / 1000;
  const isPositive = !(totalSeconds < 0 || Object.is(totalSeconds, -0));
  const absValue = Math.abs(totalSeconds);
  const secondsForFormatting = totalSeconds < 0 ? Math.ceil(absValue) : Math.floor(absValue);
  const hours = Math.floor(secondsForFormatting / 3600);
  const minutes = Math.floor((secondsForFormatting % 3600) / 60);
  const seconds = secondsForFormatting % 60;
  return {
    sign: isPositive ? "+" : "-",
    timeString: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  };
}

function renderMissionOverlay(state, missionMs) {
  const model = String(state?.current_model || "").trim();
  const payload = String(state?.rocket_meta?.payload || "").trim();
  const missionRaw = String(state?.rocket_meta?.mission_name || "").trim();
  const missionName = missionRaw || model || "待命任务";
  const vehicleName = missionRaw ? model : "";
  const hasVehicle = Boolean(vehicleName);
  const payloadText = payload;

  const overlayClock = formatMissionOverlayClock(missionMs);
  setTextIfChanged(nodes.overlayClockSign, overlayClock.sign);
  setTextIfChanged(nodes.overlayClockTime, overlayClock.timeString);

  setTextIfChanged(nodes.overlayMissionName, missionName);
  if (nodes.overlayVehicleChunk) {
    nodes.overlayVehicleChunk.classList.toggle("hidden", !hasVehicle);
  }
  setTextIfChanged(nodes.overlayVehicleName, vehicleName);

  if (nodes.overlayPayloadChunk) {
    nodes.overlayPayloadChunk.classList.toggle("hidden", !payloadText);
  }
  setTextIfChanged(nodes.overlayPayloadChunk, payloadText ? `${payloadText}` : "");
}

function currentServerMissionMs(nowPerf) {
  if (serverAnchor.running) {
    return serverAnchor.ms + (nowPerf - serverAnchor.anchorPerf);
  }
  return serverAnchor.ms;
}

function getDisplayMissionMs(nowPerf) {
  if (manualMissionOverrideMs !== null) {
    return manualMissionOverrideMs;
  }

  const target = currentServerMissionMs(nowPerf);

  if (!displaySmooth.active) {
    return target;
  }

  const elapsed = nowPerf - displaySmooth.startPerf;
  if (elapsed >= TIME_JUMP_SMOOTH_MS) {
    displaySmooth.active = false;
    return target;
  }

  const remainRatio = 1 - (elapsed / TIME_JUMP_SMOOTH_MS);
  return target - displaySmooth.offsetMs * remainRatio;
}

function maybeStartSmoothShift(previousDisplayMs, nextTargetMs, nowPerf) {
  const delta = nextTargetMs - previousDisplayMs;
  if (Math.abs(delta) < 800) {
    displaySmooth.active = false;
    return;
  }

  displaySmooth = {
    active: true,
    offsetMs: delta,
    startPerf: nowPerf,
  };
}

function timelineSig(nodesData) {
  if (!Array.isArray(nodesData) || nodesData.length === 0) {
    return "";
  }
  return nodesData
    .map((item) => `${item.kind || "node"}|${item.id || ""}|${item.name || ""}|${Number(item.time || 0)}`)
    .join(";");
}

function toTimelineEvents(nodesData) {
  if (!Array.isArray(nodesData)) {
    return [];
  }

  return nodesData.map((item, index) => ({
    id: String(item.id || `node-${index}`),
    name: String(item.name || "未命名节点"),
    time: Number(item.time || 0),
  }));
}

function ensureTimelineRenderer() {
  if (timelineRenderer || !nodes.timelineMount) {
    return;
  }

  const TimelineRenderer = window.MissionTimeline?.TimelineRenderer;
  if (typeof TimelineRenderer !== "function") {
    toast("时间轴模块加载失败", "error");
    return;
  }

  timelineRenderer = new TimelineRenderer({
    mountEl: nodes.timelineMount,
    missionDuration: DEFAULT_MISSION_WINDOW_SECONDS,
    svgHeight: 200,
  });
}

function ensureTelemetryGaugePanel() {
  if (telemetryGaugePanel) {
    return;
  }

  const createPanel = window.MissionTelemetry?.createTelemetryGaugePanel;
  if (typeof createPanel !== "function") {
    return;
  }

  telemetryGaugePanel = createPanel({
    leftMountEl: nodes.telemetryGaugesLeft,
    rightMountEl: nodes.telemetryGaugesRight,
  });
}

function ensureTelemetryCoverLayers() {
  for (const [sideName, mount] of [["left", nodes.telemetryGaugesLeft], ["right", nodes.telemetryGaugesRight]]) {
    const side = mount?.closest?.(".timeline-side");
    if (!side || side.querySelector(".timeline-side-cover")) {
      continue;
    }

    const gradientId = `telemetryCoverGradient-${sideName}`;
    const isRight = sideName === "right";
    const transform = isRight ? "translate(600 0) scale(-1 1)" : "";
    const foldRadius = 30;
    const foldInset = 372;

    side.insertAdjacentHTML("afterbegin", `
      <svg class="timeline-side-cover ${isRight ? "is-right" : "is-left"}" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="black" stop-opacity="0.5"></stop>
            <stop offset="30%" stop-color="black" stop-opacity="0.3"></stop>
            <stop offset="70%" stop-color="black" stop-opacity="0.01"></stop>
            <stop offset="100%" stop-color="black" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <path d="M 0 0 L ${foldInset - foldRadius} 0 Q ${foldInset} 0 ${foldInset + foldRadius * 0.7} ${foldRadius * 0.7} L 550 180 L 0 180 Z" fill="url(#${gradientId})" transform="${transform}"></path>
      </svg>
    `);
  }
}

function setTelemetryDashboardVisibility(visible) {
  for (const mount of [nodes.telemetryGaugesLeft, nodes.telemetryGaugesRight]) {
    const side = mount?.closest?.(".timeline-side");
    if (side) {
      side.classList.toggle("telemetry-panel-hidden", !visible);
    }
  }

  if (telemetryGaugePanel && typeof telemetryGaugePanel.setVisible === "function") {
    telemetryGaugePanel.setVisible(visible);
  }
}

function renderTimeline(state, missionSeconds) {
  ensureTimelineRenderer();
  if (!timelineRenderer) {
    return;
  }

  const timelineNodes = Array.isArray(state.timeline_nodes)
    ? state.timeline_nodes.filter((item) => item && item.kind !== "stage")
    : [];
  const sig = timelineSig(timelineNodes);
  if (sig !== timelineNodesSignature) {
    timelineNodesSignature = sig;
    timelineRenderer.setEvents(toTimelineEvents(timelineNodes));
  }

  timelineRenderer.setMissionDuration(DEFAULT_MISSION_WINDOW_SECONDS);
  timelineRenderer.setCurrentTimeOffset(missionSeconds);
  timelineRenderer.render();
}

function renderTelemetryGauges(state, missionSeconds) {
  ensureTelemetryGaugePanel();
  if (!telemetryGaugePanel) {
    return;
  }

  const telemetryEnabled = forceDashboardMode ? true : Boolean(state?.telemetry_enabled);
  setTelemetryDashboardVisibility(telemetryEnabled);
  telemetryGaugePanel.setProfile(state?.telemetry_profile || null);
  if (!telemetryEnabled) {
    return;
  }

  telemetryGaugePanel.update({
    missionSeconds,
    telemetryEnabled,
    telemetryPaused: Boolean(state?.telemetry_paused),
    telemetryPauseMissionSeconds: Number.isFinite(state?.telemetry_pause_mission_ms)
      ? Number(state.telemetry_pause_mission_ms) / 1000
      : null,
    modelName: state?.current_model || "",
    timelineNodes: Array.isArray(state?.timeline_nodes) ? state.timeline_nodes : [],
    engineLayout: state?.engine_layout || null,
    enginePresetLibrary: state?.engine_preset_library || null,
  });
}

function renderState(state) {
  lastState = state;
  const model = state.current_model || "等待选择型号";
  const payload = String(state?.rocket_meta?.payload || "").trim();
  setTextIfChanged(nodes.modelName, model);
  setTextIfChanged(nodes.payloadName, payload ? `${payload}` : "");
  if (nodes.payloadName) {
    nodes.payloadName.classList.toggle("hidden", !payload);
  }

  const nowPerf = performance.now();
  const previousDisplayMs = getDisplayMissionMs(nowPerf);

  serverAnchor = {
    ms: Number(state.unified_countdown_ms ?? 0),
    anchorPerf: nowPerf,
    running: Boolean(state.running) && !Boolean(state.is_hold),
  };

  const nextTargetMs = currentServerMissionMs(nowPerf);
  maybeStartSmoothShift(previousDisplayMs, nextTargetMs, nowPerf);

  const missionMs = getDisplayMissionMs(nowPerf);
  setTextIfChanged(nodes.missionClock, formatSignedClock(missionMs));
  renderMissionOverlay(state, missionMs);
  setTextIfChanged(nodes.currentStage, state.current_stage || "待命");
  setTextIfChanged(nodes.currentEvent, state.current_event || "等待节点");
  setTextIfChanged(nodes.nextDescription, state.next_description || "暂无说明");
  if (nodes.overlayHoldIndicator) {
    nodes.overlayHoldIndicator.classList.toggle("active", Boolean(state.is_hold));
  }

  const statusText = state.status === "countdown"
    ? "倒计时运行中"
    : state.status === "flight"
      ? "正计时运行中"
      : state.status === "hold"
        ? "倒计时 HOLD"
        : "等待任务启动";

  setTextIfChanged(nodes.statusLine, `${statusText} · ${state.now}`);
  nodes.missionCard.classList.toggle("pulse-card", state.status === "countdown");

  renderTimeline(state, missionMs / 1000);
  renderTelemetryGauges(state, missionMs / 1000);
}

function tickClocks() {
  const nowPerf = performance.now();
  const missionMs = getDisplayMissionMs(nowPerf);
  const formatted = formatSignedClock(missionMs);
  setTextIfChanged(nodes.missionClock, formatted);

  if (lastState) {
    renderMissionOverlay(lastState, missionMs);
  }

  if (lastState) {
    renderTimeline(lastState, missionMs / 1000);
    renderTelemetryGauges(lastState, missionMs / 1000);
  }
}

function setManualMissionSeconds(seconds) {
  if (!Number.isFinite(seconds)) {
    return;
  }
  manualMissionOverrideMs = Number(seconds) * 1000;
  displaySmooth.active = false;
  tickClocks();
}

function clearManualMissionSeconds() {
  manualMissionOverrideMs = null;
  displaySmooth.active = false;
  tickClocks();
}

function getCurrentMissionSeconds() {
  return getDisplayMissionMs(performance.now()) / 1000;
}

window.MissionViewerBridge = {
  getMode: () => viewMode,
  getCurrentMissionSeconds,
  setManualMissionSeconds,
  clearManualMissionSeconds,
  applyTheme,
  getThemeId: () => currentThemeId,
  getStateSnapshot: () => (lastState ? JSON.parse(JSON.stringify(lastState)) : null),
};

function bindThemeModal() {
  nodes.openThemeModalBtn.addEventListener("click", openThemeModal);
  nodes.themeBackdrop.addEventListener("click", () => closeThemeModal(false));
  nodes.cancelThemeBtn.addEventListener("click", () => closeThemeModal(true));
  nodes.applyThemeBtn.addEventListener("click", () => {
    closeThemeModal(false);
    toast("主题已应用（本次访问有效）", "success");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (nodes.themeModal.classList.contains("hidden")) {
      return;
    }
    if (closeThemeModal(true)) {
      event.preventDefault();
    }
  });
}

async function init() {
  initViewMode();
  await loadDefaultTheme();
  bindThemeModal();
  ensureTimelineRenderer();
  ensureTelemetryGaugePanel();
  ensureTelemetryCoverLayers();

  try {
    const initialState = await loadInitialState();
    renderState(initialState);
  } catch (error) {
    toast(error?.message || "初始化状态获取失败", "error");
  }

  const channel = new LiveChannel({
    streamUrl: "/api/stream",
    onState: renderState,
    onModeChange: updateChannel,
  });

  channel.start();
  window.setInterval(tickClocks, CLOCK_TICK_MS);

  window.addEventListener("beforeunload", () => {
    channel.stop();
    if (timelineRenderer) {
      timelineRenderer.destroy();
    }
    if (telemetryGaugePanel) {
      telemetryGaugePanel.destroy();
    }
  });
}

init().catch((error) => toast(error.message, "error"));
