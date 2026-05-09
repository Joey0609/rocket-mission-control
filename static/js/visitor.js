const nodes = {
  modelName: document.getElementById("modelName"),
  payloadName: document.getElementById("payloadName"),
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
  prevEventName: document.getElementById("prevEventName"),
  prevEventTime: document.getElementById("prevEventTime"),
  prevEventDesc: document.getElementById("prevEventDesc"),
  nextEventName: document.getElementById("nextEventName"),
  nextEventTime: document.getElementById("nextEventTime"),
  nextEventDesc: document.getElementById("nextEventDesc"),
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

function resolveTelemetryDisplayState(state, missionSeconds) {
  if (window.MissionTelemetryRules && typeof window.MissionTelemetryRules.resolveTelemetryAutoState === "function") {
    return window.MissionTelemetryRules.resolveTelemetryAutoState(state, missionSeconds);
  }

  return {
    enabled: Boolean(state?.telemetry_enabled),
    autoControlled: false,
    activeNode: null,
  };
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

function isHiddenTimelineNode(node) {
  if (!node || typeof node !== "object") {
    return false;
  }
  return Boolean(node.hidden || node.is_hidden || node.isHidden);
}

function getVisibleTimelineNodes(state) {
  const nodesData = Array.isArray(state?.timeline_nodes) ? state.timeline_nodes : [];
  return nodesData.filter((item) => item && item.kind !== "stage" && !isHiddenTimelineNode(item));
}

function formatMissionTimeTag(seconds) {
  const sign = seconds < 0 ? "-" : "+";
  const absSeconds = Math.abs(Math.round(seconds));
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;

  if (hours > 0) {
    return `T${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `T${sign}${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function resolvePrevNextEvents(state, missionSeconds) {
  const visibleNodes = getVisibleTimelineNodes(state)
    .slice()
    .sort((a, b) => Number(a?.time || 0) - Number(b?.time || 0));

  if (visibleNodes.length <= 0) {
    return { prev: null, next: null };
  }

  const missionTime = Number(missionSeconds || 0);
  let prevNode = null;
  let nextNode = null;

  for (const node of visibleNodes) {
    const nodeTime = Number(node?.time || 0);
    if (nodeTime <= missionTime) {
      prevNode = node;
    } else {
      nextNode = node;
      break;
    }
  }

  return {
    prev: prevNode ? { name: prevNode.name, time: prevNode.time, description: prevNode.description || "" } : null,
    next: nextNode ? { name: nextNode.name, time: nextNode.time, description: nextNode.description || "" } : null,
  };
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

function parseDashboardOptionKey(optionKey) {
  const matched = String(optionKey || "").trim().toLowerCase().match(/^stage(\d+):(altitude|speed|accel|engine)$/);
  if (!matched) {
    return null;
  }
  return {
    stageIndex: Math.max(1, Number.parseInt(matched[1], 10) || 1),
    type: matched[2],
  };
}

function resolveDashboardGaugeSpecsByEditor(state, missionSeconds) {
  const editor = state?.dashboard_editor && typeof state.dashboard_editor === "object"
    ? state.dashboard_editor
    : null;
  if (!editor || !Array.isArray(editor.nodes) || editor.nodes.length <= 0) {
    return Array.isArray(state?.dashboard_gauge_specs) ? state.dashboard_gauge_specs : [];
  }

  const sortedNodes = editor.nodes
    .map((item, index) => ({
      id: String(item?.id || `dashboard_node_${index + 1}`),
      time: Number(item?.time || 0),
      selected: Array.isArray(item?.selected) ? item.selected : [],
    }))
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id, "zh-CN"));

  let activeNode = sortedNodes[0];
  for (const node of sortedNodes) {
    if (node.time <= missionSeconds) {
      activeNode = node;
      continue;
    }
    break;
  }

  // console.log(`[DEBUG-visitor-dashboard] missionSeconds=${missionSeconds}, activeNode=(id="${activeNode?.id || "?"}", time=${activeNode?.time ?? "?"}), selected=[${(activeNode?.selected || []).join(", ")}]`);

  const sideOrder = ["left", "left", "right", "right"];
  return activeNode.selected
    .slice(0, 4)
    .map((optionKey, index) => {
      const parsed = parseDashboardOptionKey(optionKey);
      if (!parsed) {
        return null;
      }

      const stageText = `${parsed.stageIndex}级`;
      const base = {
        id: `dashboard_${index + 1}`,
        side: sideOrder[index] || "right",
        stage_index: parsed.stageIndex,
        option_key: optionKey,
      };

      if (parsed.type === "altitude") {
        return {
          ...base,
          type: "metric",
          metric_key: "altitude_km",
          label: `${stageText}高度`,
          unit: "KM",
          max_value: 700,
          fraction_digits: 1,
        };
      }

      if (parsed.type === "speed") {
        return {
          ...base,
          type: "metric",
          metric_key: "speed_mps",
          label: `${stageText}速度`,
          unit: "KM/H",
          max_value: 30600,
          fraction_digits: 0,
        };
      }

      if (parsed.type === "accel") {
        return {
          ...base,
          type: "metric",
          metric_key: "accel_g",
          label: `${stageText}加速度`,
          unit: "G",
          max_value: 8,
          fraction_digits: 2,
        };
      }

      if (parsed.type === "engine") {
        return {
          ...base,
          type: "engine_layout",
          label: `${stageText}发动机`,
          size: 128,
        };
      }

      return null;
    })
    .filter(Boolean);
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

  const timelineNodes = getVisibleTimelineNodes(state);
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

  const telemetryState = resolveTelemetryDisplayState(state, missionSeconds);
  const telemetryEnabled = forceDashboardMode ? true : Boolean(telemetryState.enabled);
  setTelemetryDashboardVisibility(telemetryEnabled);
  telemetryGaugePanel.setProfile(state?.telemetry_profile || null);
  if (!telemetryEnabled) {
    return;
  }

  const localDashboardSpecs = resolveDashboardGaugeSpecsByEditor(state, missionSeconds);

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
    fuelCurves: state?.fuel_curves && typeof state.fuel_curves === "object" ? state.fuel_curves : {},
    dashboardGaugeSpecs: localDashboardSpecs,
  });

  telemetryGaugePanel.setVisible(telemetryEnabled, { immediate: false });
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

  // 上一事件 / 下一事件
  const missionSeconds = missionMs / 1000;
  const { prev, next } = resolvePrevNextEvents(state, missionSeconds);
  if (prev) {
    setTextIfChanged(nodes.prevEventName, prev.name || "无");
    setTextIfChanged(nodes.prevEventTime, formatMissionTimeTag(Number(prev.time) || 0));
    setTextIfChanged(nodes.prevEventDesc, prev.description || "");
  } else {
    setTextIfChanged(nodes.prevEventName, "无");
    setTextIfChanged(nodes.prevEventTime, "");
    setTextIfChanged(nodes.prevEventDesc, "");
  }
  if (next) {
    setTextIfChanged(nodes.nextEventName, next.name || "无");
    setTextIfChanged(nodes.nextEventTime, formatMissionTimeTag(Number(next.time) || 0));
    setTextIfChanged(nodes.nextEventDesc, next.description || "");
  } else {
    setTextIfChanged(nodes.nextEventName, "无");
    setTextIfChanged(nodes.nextEventTime, "");
    setTextIfChanged(nodes.nextEventDesc, "");
  }

  if (nodes.overlayHoldIndicator) {
    nodes.overlayHoldIndicator.classList.toggle("active", Boolean(state.is_hold));
  }

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
    const missionSeconds = missionMs / 1000;
    renderTimeline(lastState, missionSeconds);

    // 每次 tick 重新解析上一/下一事件（时间推进时实时更新）
    const { prev, next } = resolvePrevNextEvents(lastState, missionSeconds);
    if (prev) {
      setTextIfChanged(nodes.prevEventName, prev.name || "无");
      setTextIfChanged(nodes.prevEventTime, formatMissionTimeTag(Number(prev.time) || 0));
      setTextIfChanged(nodes.prevEventDesc, prev.description || "");
    } else {
      setTextIfChanged(nodes.prevEventName, "无");
      setTextIfChanged(nodes.prevEventTime, "");
      setTextIfChanged(nodes.prevEventDesc, "");
    }
    if (next) {
      setTextIfChanged(nodes.nextEventName, next.name || "无");
      setTextIfChanged(nodes.nextEventTime, formatMissionTimeTag(Number(next.time) || 0));
      setTextIfChanged(nodes.nextEventDesc, next.description || "");
    } else {
      setTextIfChanged(nodes.nextEventName, "无");
      setTextIfChanged(nodes.nextEventTime, "");
      setTextIfChanged(nodes.nextEventDesc, "");
    }

    renderTelemetryGauges(lastState, missionSeconds);
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
