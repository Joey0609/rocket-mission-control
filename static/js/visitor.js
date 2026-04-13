const nodes = {
  modelName: document.getElementById("modelName"),
  statusLine: document.getElementById("statusLine"),
  channelMode: document.getElementById("channelMode"),
  missionClock: document.getElementById("missionClock"),
  currentStage: document.getElementById("currentStage"),
  currentEvent: document.getElementById("currentEvent"),
  nextDescription: document.getElementById("nextDescription"),
  focusNodes: document.getElementById("focusNodes"),
  missionCard: document.getElementById("missionCard"),

  openThemeModalBtn: document.getElementById("openThemeModalBtn"),
  themeModal: document.getElementById("themeModal"),
  themeBackdrop: document.getElementById("themeBackdrop"),
  themeGrid: document.getElementById("themeGrid"),
  applyThemeBtn: document.getElementById("applyThemeBtn"),
  cancelThemeBtn: document.getElementById("cancelThemeBtn"),
};

const CLOCK_TICK_MS = 20;
const AXIS_BEFORE_SEC = 120;
const AXIS_AFTER_SEC = 240;
const AXIS_STEP_SEC = 30;
const TIME_JUMP_SMOOTH_MS = 1000;

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

let timelineNodes = [];
let timelineSignature = "";
let axisNodeViews = [];
let axisRefs = null;
let axisGridBucket = null;

let adminDefaultThemeId = window.MissionThemes.defaultId;
let currentThemeId = adminDefaultThemeId;
let themeModalDraftId = currentThemeId;
let themeModalOriginId = currentThemeId;

function toast(message, type = "info") {
  if (typeof window.notify === "function") {
    window.notify(message, type);
  }
}

function queryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
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

function renderThemeCards() {
  const items = window.MissionThemes.list();
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

function closeThemeModal(restoreOrigin, force = false) {
  if (!force && themeModalDraftId !== themeModalOriginId) {
    toast("还没保存", "error");
    return false;
  }
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

function formatTimelineSec(secValue) {
  const sec = Math.trunc(secValue);
  return sec >= 0 ? `T+${sec}` : `T${sec}`;
}

function currentServerMissionMs(nowPerf) {
  if (serverAnchor.running) {
    return serverAnchor.ms + (nowPerf - serverAnchor.anchorPerf);
  }
  return serverAnchor.ms;
}

function getDisplayMissionMs(nowPerf) {
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

function ensureAxisSkeleton() {
  if (axisRefs) {
    return axisRefs;
  }

  nodes.focusNodes.innerHTML = `
    <div class="axis-shell">
      <div class="axis-band" id="axisBand"></div>
      <div class="axis-now-line"></div>
      <div class="axis-now-tag" id="axisNowTag">T+0</div>
      <div class="axis-grid" id="axisGrid"></div>
      <div class="axis-nodes" id="axisNodes"></div>
    </div>
  `;

  axisRefs = {
    band: document.getElementById("axisBand"),
    grid: document.getElementById("axisGrid"),
    nodes: document.getElementById("axisNodes"),
    nowTag: document.getElementById("axisNowTag"),
  };
  return axisRefs;
}

function rebuildAxisNodes() {
  const refs = ensureAxisSkeleton();
  refs.nodes.innerHTML = "";
  axisNodeViews = [];

  timelineNodes.forEach((item) => {
    const marker = document.createElement("article");
    marker.className = `axis-node ${item.kind || "event"}`;
    marker.style.transition = "left 60ms linear, opacity 220ms ease";

    const dot = document.createElement("span");
    dot.className = "dot";
    marker.appendChild(dot);

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = item.name;
    marker.appendChild(label);

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = formatTimelineSec(item.time);
    marker.appendChild(meta);

    refs.nodes.appendChild(marker);
    axisNodeViews.push({ el: marker, time: Number(item.time || 0) });
  });
}

function renderAxisGrid(missionSec) {
  const refs = ensureAxisSkeleton();
  const start = missionSec - AXIS_BEFORE_SEC;
  const end = missionSec + AXIS_AFTER_SEC;
  const width = end - start;

  refs.grid.innerHTML = "";
  const firstTick = Math.floor(start / AXIS_STEP_SEC) * AXIS_STEP_SEC;
  for (let t = firstTick; t <= end; t += AXIS_STEP_SEC) {
    const percent = ((t - start) / width) * 100;
    if (percent < -2 || percent > 102) {
      continue;
    }
    const tick = document.createElement("div");
    tick.className = "axis-tick";
    tick.style.left = `${percent}%`;
    tick.innerHTML = `<span>${formatTimelineSec(t)}</span>`;
    refs.grid.appendChild(tick);
  }
}

function maybeRenderAxisGrid(missionSec) {
  const bucket = Math.floor((missionSec - AXIS_BEFORE_SEC) / AXIS_STEP_SEC);
  if (bucket === axisGridBucket) {
    return;
  }
  axisGridBucket = bucket;
  renderAxisGrid(missionSec);
}

function updateAxisPositions(missionSec) {
  if (!axisRefs || axisNodeViews.length === 0) {
    return;
  }

  maybeRenderAxisGrid(missionSec);

  const start = missionSec - AXIS_BEFORE_SEC;
  const end = missionSec + AXIS_AFTER_SEC;
  const width = end - start;
  axisRefs.nowTag.textContent = `${formatTimelineSec(missionSec)} NOW`;

  axisNodeViews.forEach((item) => {
    const percent = ((item.time - start) / width) * 100;
    const visible = percent >= -8 && percent <= 108;
    item.el.style.display = visible ? "grid" : "none";
    if (!visible) {
      return;
    }
    item.el.style.left = `${percent}%`;
    item.el.classList.toggle("past", item.time <= missionSec);
  });
}

function renderTimelineNodes(nodesData) {
  const sig = timelineSig(nodesData);
  if (sig === timelineSignature) {
    return;
  }

  timelineSignature = sig;
  timelineNodes = Array.isArray(nodesData)
    ? nodesData
      .slice()
      .sort((a, b) => Number(a.time || 0) - Number(b.time || 0))
      .map((item) => ({
        id: item.id,
        kind: item.kind || "event",
        name: item.name || "未命名节点",
        time: Number(item.time || 0),
      }))
    : [];

  if (timelineNodes.length === 0) {
    nodes.focusNodes.innerHTML = "<div class='focus-node'><div class='name'>当前型号无关键节点</div><div class='meta'>请在管理页配置阶段与事件</div></div>";
    axisRefs = null;
    axisNodeViews = [];
    axisGridBucket = null;
    return;
  }

  ensureAxisSkeleton();
  axisGridBucket = null;
  rebuildAxisNodes();
}

function renderState(state) {
  const model = state.current_model || "等待选择型号";
  nodes.modelName.textContent = model;

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
  nodes.currentStage.textContent = state.current_stage || "待命";
  nodes.currentEvent.textContent = state.current_event || "等待节点";
  nodes.nextDescription.textContent = state.next_description || "暂无说明";

  const statusText = state.status === "countdown"
    ? "倒计时运行中"
    : state.status === "flight"
      ? "正计时运行中"
      : state.status === "hold"
        ? "倒计时 HOLD"
        : "等待任务启动";

  nodes.statusLine.textContent = `${statusText} · ${state.now}`;
  nodes.missionCard.classList.toggle("pulse-card", state.status === "countdown");

  renderTimelineNodes(state.timeline_nodes || []);
  updateAxisPositions(missionMs / 1000);
}

function tickClocks() {
  const nowPerf = performance.now();
  const missionMs = getDisplayMissionMs(nowPerf);
  setTextIfChanged(nodes.missionClock, formatSignedClock(missionMs));
  updateAxisPositions(missionMs / 1000);
}

function bindThemeModal() {
  nodes.openThemeModalBtn.addEventListener("click", openThemeModal);
  nodes.themeBackdrop.addEventListener("click", () => closeThemeModal(true, false));
  nodes.cancelThemeBtn.addEventListener("click", () => closeThemeModal(true, true));
  nodes.applyThemeBtn.addEventListener("click", () => {
    closeThemeModal(false, true);
    toast("主题已应用（本次访问有效）", "success");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (nodes.themeModal.classList.contains("hidden")) {
      return;
    }
    if (themeModalDraftId !== themeModalOriginId) {
      toast("还没保存", "error");
    }
    if (closeThemeModal(true, true)) {
      event.preventDefault();
    }
  });
}

async function init() {
  await loadDefaultTheme();
  bindThemeModal();

  const channel = new LiveChannel({
    streamUrl: "/api/stream",
    onState: renderState,
    onModeChange: updateChannel,
  });

  channel.start();
  window.setInterval(tickClocks, CLOCK_TICK_MS);
}

init().catch((error) => toast(error.message, "error"));
