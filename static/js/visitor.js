const nodes = {
  modelName: document.getElementById("modelName"),
  statusLine: document.getElementById("statusLine"),
  channelMode: document.getElementById("channelMode"),
  missionClock: document.getElementById("missionClock"),
  currentStage: document.getElementById("currentStage"),
  currentEvent: document.getElementById("currentEvent"),
  nextDescription: document.getElementById("nextDescription"),
  runtimeCountdowns: document.getElementById("runtimeCountdowns"),
  focusNodes: document.getElementById("focusNodes"),
  missionCard: document.getElementById("missionCard"),
  themeToggle: document.getElementById("visitorThemeToggle"),
};

const VISITOR_THEME_KEY = "mission-visitor-theme";
const CLOCK_TICK_MS = 20;
const AXIS_BEFORE_SEC = 120;
const AXIS_AFTER_SEC = 240;
const AXIS_STEP_SEC = 30;

let missionAnchor = {
  ms: 0,
  anchorPerf: performance.now(),
  running: false,
};

let timelineNodes = [];
let axisNodeViews = [];
let axisRefs = null;
const runtimeAnchors = new Map();

function queryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function getTheme() {
  const byQuery = queryParam("theme");
  if (byQuery === "light" || byQuery === "dark") {
    return byQuery;
  }
  const local = localStorage.getItem(VISITOR_THEME_KEY);
  return local === "light" ? "light" : "dark";
}

function setTheme(mode) {
  const theme = mode === "light" ? "light" : "dark";
  document.body.dataset.theme = theme;
  localStorage.setItem(VISITOR_THEME_KEY, theme);
  if (nodes.themeToggle) {
    nodes.themeToggle.textContent = theme === "light" ? "夜间模式" : "浅色模式";
  }
}

function toggleTheme() {
  const next = document.body.dataset.theme === "light" ? "dark" : "light";
  setTheme(next);
}

function updateChannel(mode) {
  nodes.channelMode.textContent = mode === "sse" ? "实时通道: SSE 推送" : "实时通道: 关键轮询兜底";
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

function formatCountdownClock(msValue) {
  const absMs = Math.max(0, Math.trunc(msValue));
  const totalSeconds = Math.floor(absMs / 1000);
  const millis = absMs % 1000;

  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `T-${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  }

  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `T-${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
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

function formatNode(node) {
  const t = node.time >= 0 ? `T+${node.time}s` : `T${node.time}s`;
  return `${node.name} (${t}, ${node.seconds_to}s 后)`;
}

function formatTimelineSec(secValue) {
  const sec = Math.trunc(secValue);
  return sec >= 0 ? `T+${sec}` : `T${sec}`;
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
    marker.className = `axis-node ${item.kind === "stage" ? "stage" : "event"}`;

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
    axisNodeViews.push({ el: marker, time: Number(item.time || 0), label, meta });
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

function updateAxisPositions(missionSec) {
  const refs = ensureAxisSkeleton();
  const start = missionSec - AXIS_BEFORE_SEC;
  const end = missionSec + AXIS_AFTER_SEC;
  const width = end - start;
  refs.nowTag.textContent = `${formatTimelineSec(missionSec)} NOW`;

  axisNodeViews.forEach((item) => {
    const percent = ((item.time - start) / width) * 100;
    const visible = percent >= -6 && percent <= 106;
    item.el.style.display = visible ? "grid" : "none";
    if (!visible) {
      return;
    }

    item.el.style.left = `${percent}%`;
    item.el.classList.toggle("past", item.time <= missionSec);
  });
}

function renderRuntimeCountdowns(items) {
  const container = nodes.runtimeCountdowns;

  if (!items || items.length === 0) {
    runtimeAnchors.forEach((entry) => {
      entry.card.remove();
    });
    runtimeAnchors.clear();
    container.innerHTML = "<div class='runtime-card runtime-empty'><span class='name'>暂无触发</span><strong>等待观察点</strong></div>";
    return;
  }

  const empty = container.querySelector(".runtime-empty");
  if (empty) {
    empty.remove();
  }

  const nowPerf = performance.now();
  const incoming = new Set();

  items.forEach((item) => {
    incoming.add(item.id);
    let entry = runtimeAnchors.get(item.id);

    if (!entry) {
      const card = document.createElement("article");
      card.className = "runtime-card";

      const name = document.createElement("span");
      name.className = "name";

      const clock = document.createElement("strong");
      clock.className = "clock";

      card.appendChild(name);
      card.appendChild(clock);
      container.appendChild(card);

      entry = { card, name, clock, ms: 0, anchorPerf: nowPerf };
      runtimeAnchors.set(item.id, entry);
    }

    entry.name.textContent = item.name;
    entry.ms = Number(item.remaining_ms ?? item.seconds * 1000 ?? 0);
    entry.anchorPerf = nowPerf;
    setTextIfChanged(entry.clock, formatCountdownClock(entry.ms));
  });

  runtimeAnchors.forEach((entry, id) => {
    if (!incoming.has(id)) {
      entry.card.remove();
      runtimeAnchors.delete(id);
    }
  });
}

function renderFocusNodes(nodesData) {
  timelineNodes = Array.isArray(nodesData) ? nodesData.slice().sort((a, b) => Number(a.time || 0) - Number(b.time || 0)) : [];
  if (timelineNodes.length === 0) {
    nodes.focusNodes.innerHTML = "<div class='focus-node'><div class='name'>当前型号无关键节点</div><div class='meta'>请在管理页配置阶段与事件</div></div>";
    axisRefs = null;
    axisNodeViews = [];
    return;
  }

  ensureAxisSkeleton();
  rebuildAxisNodes();
  const missionSec = Math.trunc(missionAnchor.ms / 1000);
  renderAxisGrid(missionSec);
  updateAxisPositions(missionSec);
}

function renderState(state) {
  const model = state.current_model || "等待选择型号";
  nodes.modelName.textContent = model;
  missionAnchor = {
    ms: Number(state.unified_countdown_ms ?? 0),
    anchorPerf: performance.now(),
    running: Boolean(state.running),
  };
  setTextIfChanged(nodes.missionClock, formatSignedClock(missionAnchor.ms));
  nodes.currentStage.textContent = state.current_stage || "待命";
  nodes.currentEvent.textContent = state.current_event || "等待节点";
  nodes.nextDescription.textContent = state.next_description || "暂无说明";

  const statusText = state.status === "countdown" ? "倒计时运行中" : state.status === "flight" ? "正计时运行中" : "等待任务启动";
  nodes.statusLine.textContent = `${statusText} · ${state.now}`;
  nodes.missionCard.classList.toggle("pulse-card", state.status === "countdown");

  renderRuntimeCountdowns(state.active_countdowns || []);
  renderFocusNodes(state.timeline_nodes || []);
}

function tickClocks() {
  const nowPerf = performance.now();
  const missionMs = missionAnchor.running
    ? missionAnchor.ms + (nowPerf - missionAnchor.anchorPerf)
    : missionAnchor.ms;
  setTextIfChanged(nodes.missionClock, formatSignedClock(missionMs));

  const missionSec = missionMs / 1000;
  if (axisNodeViews.length > 0 && axisRefs) {
    updateAxisPositions(missionSec);
  }

  runtimeAnchors.forEach((entry) => {
    const remainMs = Math.max(0, entry.ms - (nowPerf - entry.anchorPerf));
    setTextIfChanged(entry.clock, formatCountdownClock(remainMs));
  });
}

const channel = new LiveChannel({
  streamUrl: "/api/stream",
  stateUrl: "/api/state",
  onState: renderState,
  onModeChange: updateChannel,
});

setTheme(getTheme());
if (nodes.themeToggle) {
  nodes.themeToggle.addEventListener("click", toggleTheme);
}

channel.start();
window.setInterval(tickClocks, CLOCK_TICK_MS);
