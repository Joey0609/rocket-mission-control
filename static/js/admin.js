const dom = {
  channelMode: document.getElementById("channelMode"),
  currentModel: document.getElementById("currentModel"),
  currentStatus: document.getElementById("currentStatus"),
  missionClock: document.getElementById("missionClock"),
  activeCount: document.getElementById("activeCount"),
  modelSelect: document.getElementById("modelSelect"),
  refreshModelsBtn: document.getElementById("refreshModelsBtn"),
  openConfigEditorBtn: document.getElementById("openConfigEditorBtn"),
  launchAt: document.getElementById("launchAt"),
  holdBtn: document.getElementById("holdBtn"),
  observationButtons: document.getElementById("observationButtons"),
  focusNodes: document.getElementById("focusNodes"),
  themeSelect: document.getElementById("themeSelect"),
  saveDefaultThemeBtn: document.getElementById("saveDefaultThemeBtn"),
  copyVisitorUrlBtn: document.getElementById("copyVisitorUrlBtn"),
  showVisitorQrBtn: document.getElementById("showVisitorQrBtn"),
  reloadPreviewBtn: document.getElementById("reloadPreviewBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  clearLogBtn: document.getElementById("clearLogBtn"),
  runtimeLog: document.getElementById("runtimeLog"),
  previewFrame: document.querySelector(".preview-frame"),
  qrModal: document.getElementById("qrModal"),
  qrBackdrop: document.getElementById("qrBackdrop"),
  visitorQrImage: document.getElementById("visitorQrImage"),
  visitorQrText: document.getElementById("visitorQrText"),
  closeQrBtn: document.getElementById("closeQrBtn"),
  configModal: document.getElementById("configModal"),
  configBackdrop: document.getElementById("configBackdrop"),
  configModalTitle: document.getElementById("configModalTitle"),
  configTabRawBtn: document.getElementById("configTabRawBtn"),
  configTabVisualBtn: document.getElementById("configTabVisualBtn"),
  configRawPane: document.getElementById("configRawPane"),
  configVisualPane: document.getElementById("configVisualPane"),
  configRawEditor: document.getElementById("configRawEditor"),
  configValidationMsg: document.getElementById("configValidationMsg"),
  saveConfigModalBtn: document.getElementById("saveConfigModalBtn"),
  closeConfigModalBtn: document.getElementById("closeConfigModalBtn"),
  visualList: document.getElementById("visualList"),
  addVisualItemBtn: document.getElementById("addVisualItemBtn"),
};

const CLOCK_TICK_MS = 20;

let modelsCache = {};
let lastState = null;
let uiLogs = [];
let launchApplyTimer = null;
let pendingModelName = "";
let selectingModel = false;
let launchInputDirtyUntil = 0;

let currentThemeId = window.MissionThemes?.defaultId || "aurora";
let defaultThemeId = currentThemeId;

let configDraft = null;
let configDraftValid = false;
let configTab = "visual";

let visualRows = [];
let visualUndoStack = [];
let visualSortTimer = null;

let missionAnchor = {
  ms: 0,
  anchorPerf: performance.now(),
  running: false,
};

function notify(message) {
  window.alert(message);
}

function redirectToLogin() {
  window.location.href = "/admin/login";
}

async function adminFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    redirectToLogin();
    throw new Error("未登录或会话已过期");
  }
  return response;
}

function appendLog(message) {
  const line = `${new Date().toLocaleTimeString("zh-CN", { hour12: false })} · ${message}`;
  uiLogs.unshift(line);
  uiLogs = uiLogs.slice(0, 150);
  dom.runtimeLog.innerHTML = uiLogs.map((item) => `<li>${item}</li>`).join("");
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

function dateToInputValue(dateObj) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
}

function launchAtToDate() {
  if (!dom.launchAt.value) {
    return null;
  }
  const d = new Date(dom.launchAt.value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function newRowKey() {
  return `row_${Math.random().toString(16).slice(2, 10)}_${Date.now()}`;
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

function tickMissionClock() {
  const nowPerf = performance.now();
  const missionMs = missionAnchor.running ? missionAnchor.ms + (nowPerf - missionAnchor.anchorPerf) : missionAnchor.ms;
  setTextIfChanged(dom.missionClock, formatSignedClock(missionMs));
}

function setChannelMode(mode) {
  dom.channelMode.textContent = mode === "sse" ? "实时通道: SSE 推送" : "实时通道: 关键轮询兜底";
  dom.channelMode.classList.toggle("poll", mode !== "sse");
}

function populateThemeSelector() {
  const items = window.MissionThemes.list();
  dom.themeSelect.innerHTML = items.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
}

function applyTheme(themeId, syncSelector = true) {
  currentThemeId = window.MissionThemes.apply(themeId);
  if (syncSelector) {
    dom.themeSelect.value = currentThemeId;
  }
  if (dom.previewFrame) {
    dom.previewFrame.src = `/visitor?embed=1&theme=${encodeURIComponent(currentThemeId)}&t=${Date.now()}`;
  }
}

async function loadAdminSettings() {
  const res = await adminFetch("/api/admin/settings", { cache: "no-store" });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "读取管理员配置失败");
  }
  defaultThemeId = data.settings?.default_theme || window.MissionThemes.defaultId;
  applyTheme(defaultThemeId);
}

async function saveDefaultTheme() {
  const themeId = String(dom.themeSelect.value || currentThemeId || window.MissionThemes.defaultId);
  const res = await adminFetch("/api/admin/settings/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme_id: themeId }),
  });
  const data = await res.json();
  if (!data.success) {
    notify(data.message || "保存默认主题失败");
    return;
  }
  defaultThemeId = data.settings?.default_theme || themeId;
  appendLog(`默认主题已更新: ${defaultThemeId}`);
}

async function getVisitorUrl() {
  try {
    const response = await adminFetch("/api/visitor_url", { cache: "no-store" });
    const data = await response.json();
    if (data.url) {
      return data.url;
    }
  } catch {
    // ignore
  }
  return `${window.location.origin}/`;
}

async function openQrModal() {
  const url = await getVisitorUrl();
  dom.visitorQrText.textContent = url;
  dom.visitorQrImage.src = `/api/visitor_qr?url=${encodeURIComponent(url)}&t=${Date.now()}`;
  dom.qrModal.classList.remove("hidden");
}

function closeQrModal() {
  dom.qrModal.classList.add("hidden");
}

function normalizeDraft(payload, selectedModelName) {
  const normalizedStages = Array.isArray(payload?.stages)
    ? payload.stages.map((item) => ({
      id: String(item.id || "").trim() || `stg_${Date.now()}`,
      name: String(item.name || ""),
      start_time: toInt(item.start_time, 0),
      end_time: toInt(item.end_time, toInt(item.start_time, 0)),
      description: String(item.description || ""),
    }))
    : [];

  const normalizedEvents = Array.isArray(payload?.events)
    ? payload.events.map((item) => ({
      id: String(item.id || "").trim() || `evt_${Date.now()}`,
      name: String(item.name || ""),
      time: toInt(item.time, 0),
      description: String(item.description || ""),
    }))
    : [];

  const normalizedObs = Array.isArray(payload?.observation_points)
    ? payload.observation_points.map((item) => {
      const fallback = Math.max(0, toInt(item.new_countdown, 0));
      const hasTime = Object.prototype.hasOwnProperty.call(item, "time");
      const time = hasTime ? toInt(item.time, -fallback) : -fallback;
      return {
        id: String(item.id || "").trim() || `obs_${Date.now()}`,
        name: String(item.name || ""),
        time,
        new_countdown: Math.max(0, toInt(item.new_countdown, Math.max(0, -time))),
        description: String(item.description || ""),
      };
    })
    : [];

  return {
    version: 2,
    name: String(payload?.name || selectedModelName || "未命名型号").trim() || "未命名型号",
    stages: normalizedStages,
    events: normalizedEvents,
    observation_points: normalizedObs,
  };
}

function renderModelOptions() {
  const names = Object.keys(modelsCache).sort();
  dom.modelSelect.innerHTML = "";

  if (names.length === 0) {
    const fallback = document.createElement("option");
    fallback.value = "";
    fallback.textContent = "暂无型号";
    dom.modelSelect.appendChild(fallback);
    return;
  }

  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    dom.modelSelect.appendChild(option);
  });
}

async function fetchModels() {
  const res = await adminFetch("/api/models", { cache: "no-store" });
  modelsCache = await res.json();
  const oldValue = dom.modelSelect.value;
  renderModelOptions();

  if (pendingModelName && modelsCache[pendingModelName]) {
    dom.modelSelect.value = pendingModelName;
  } else if (oldValue && modelsCache[oldValue]) {
    dom.modelSelect.value = oldValue;
  } else if (lastState?.current_model && modelsCache[lastState.current_model]) {
    dom.modelSelect.value = lastState.current_model;
  } else {
    const first = Object.keys(modelsCache).sort()[0];
    dom.modelSelect.value = first || "";
  }
}

async function applySelectedModel(name) {
  const modelName = String(name || "").trim();
  if (!modelName) {
    return;
  }

  if (selectingModel && pendingModelName === modelName) {
    return;
  }

  pendingModelName = modelName;
  selectingModel = true;

  const response = await adminFetch("/api/select_model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelName }),
  });
  const data = await response.json();

  if (!data.success) {
    selectingModel = false;
    notify(data.message || "型号切换失败");
    appendLog(`型号切换失败: ${data.message || "unknown"}`);
    if (lastState?.current_model && modelsCache[lastState.current_model]) {
      dom.modelSelect.value = lastState.current_model;
    }
    return;
  }

  appendLog(`已切换型号: ${modelName}`);
  selectingModel = false;
}

function renderObservationButtons(state) {
  const points = state.observation_points || [];
  if (points.length === 0) {
    dom.observationButtons.innerHTML = '<button class="btn" disabled>当前型号无观察点</button>';
    return;
  }

  dom.observationButtons.innerHTML = "";
  points.forEach((point) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = point.name;
    const timeText = `T${Number(point.time) >= 0 ? "+" : ""}${Number(point.time)}`;
    btn.title = `${point.description || ""} / 对齐到 ${timeText}`;
    btn.addEventListener("click", async () => {
      const res = await adminFetch("/api/observation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ point_id: point.id }),
      });
      const data = await res.json();
      if (!data.success) {
        notify(data.message || "触发失败");
        return;
      }
      appendLog(data.message || `触发观察点: ${point.name}`);
    });
    dom.observationButtons.appendChild(btn);
  });
}

function renderFocusNodes(state) {
  const nodes = state.focus_nodes || [];
  if (nodes.length === 0) {
    dom.focusNodes.innerHTML = "<li>当前窗口无即将到来的节点</li>";
    return;
  }

  dom.focusNodes.innerHTML = nodes
    .map((n) => `<li>${n.name} (${n.seconds_to}s 后, T${n.time >= 0 ? "+" : ""}${n.time})</li>`)
    .join("");
}

function syncLaunchInputFromState(state) {
  if (!state.running || !Number.isFinite(state.server_now_ms) || !Number.isFinite(state.mission_time_ms)) {
    return;
  }
  if (state.status === "flight") {
    return;
  }
  if (Date.now() < launchInputDirtyUntil) {
    return;
  }

  const launchEpoch = state.server_now_ms - state.mission_time_ms;
  const launchDate = new Date(launchEpoch);
  dom.launchAt.value = dateToInputValue(launchDate);
}

function renderHoldState(state) {
  const isHold = Boolean(state.is_hold);
  dom.holdBtn.classList.toggle("active", isHold);
  dom.holdBtn.textContent = isHold ? "RESUME" : "HOLD";
}

function renderState(state) {
  lastState = state;

  if (state.default_theme && !defaultThemeId) {
    defaultThemeId = state.default_theme;
  }

  dom.currentModel.textContent = state.current_model || "-";
  dom.currentStatus.textContent = state.status === "flight" ? "positive" : state.status;

  missionAnchor = {
    ms: Number(state.unified_countdown_ms ?? 0),
    anchorPerf: performance.now(),
    running: Boolean(state.running) && !Boolean(state.is_hold),
  };
  setTextIfChanged(dom.missionClock, formatSignedClock(missionAnchor.ms));
  dom.activeCount.textContent = String((state.active_countdowns || []).length);

  if (state.current_model && modelsCache[state.current_model]) {
    if (!selectingModel || state.current_model === pendingModelName) {
      dom.modelSelect.value = state.current_model;
      pendingModelName = state.current_model;
    }
  }

  renderHoldState(state);
  renderObservationButtons(state);
  renderFocusNodes(state);
  syncLaunchInputFromState(state);

  if (Array.isArray(state.observation_log)) {
    const recent = state.observation_log.slice(-5).map((item) => {
      if (item.type === "ignition") {
        return `${item.timestamp} 手动点火确认`;
      }
      if (item.type === "auto_ignition") {
        return `${item.timestamp} 自动切换正计时`;
      }
      if (item.type === "hold") {
        return `${item.timestamp} HOLD`;
      }
      if (item.type === "resume") {
        return `${item.timestamp} HOLD 解除`;
      }
      if (item.type === "observation") {
        const t = Number(item.target_time);
        return `${item.timestamp} 触发观察点 ${item.point || "-"}，对齐 T${t >= 0 ? "+" : ""}${t}`;
      }
      return `${item.timestamp} ${item.type || "状态更新"}`;
    });
    if (recent.length > 0) {
      dom.runtimeLog.innerHTML = recent.reverse().map((line) => `<li>${line}</li>`).join("");
    }
  }
}

async function launchByInput() {
  const launchAt = dom.launchAt.value;
  if (!launchAt) {
    return;
  }
  const res = await adminFetch("/api/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ launch_at: launchAt }),
  });
  const data = await res.json();
  if (!data.success) {
    notify(data.message || "设置失败");
    appendLog(`设置发射时间失败: ${data.message || "unknown"}`);
    return;
  }
  appendLog(`发射时间已自动应用: ${launchAt}`);
}

function scheduleApplyLaunch() {
  launchInputDirtyUntil = Date.now() + 6000;
  if (launchApplyTimer) {
    clearTimeout(launchApplyTimer);
  }
  launchApplyTimer = setTimeout(() => {
    launchByInput().catch((error) => notify(error.message));
  }, 120);
}

function adjustLaunchTime(deltaSeconds) {
  let base = launchAtToDate();
  if (!base) {
    base = new Date(Date.now() + 600000);
  }
  const next = new Date(base.getTime() + deltaSeconds * 1000);
  dom.launchAt.value = dateToInputValue(next);
  scheduleApplyLaunch();
}

function quickLaunch(seconds) {
  const next = new Date(Date.now() + Number(seconds) * 1000);
  dom.launchAt.value = dateToInputValue(next);
  scheduleApplyLaunch();
  appendLog(`快捷发射倒计时: ${seconds}s`);
}

function showConfigValidation(message, isError) {
  dom.configValidationMsg.textContent = message;
  dom.configValidationMsg.classList.toggle("error", Boolean(isError));
}

function validateRawDraft() {
  let parsed = null;
  try {
    parsed = JSON.parse(dom.configRawEditor.value || "{}");
  } catch {
    configDraftValid = false;
    dom.saveConfigModalBtn.disabled = true;
    showConfigValidation("JSON 语法错误，无法保存。", true);
    return false;
  }

  const selectedName = dom.modelSelect.value;
  const normalized = normalizeDraft(parsed, selectedName);
  if (!Array.isArray(normalized.stages) || !Array.isArray(normalized.events) || !Array.isArray(normalized.observation_points)) {
    configDraftValid = false;
    dom.saveConfigModalBtn.disabled = true;
    showConfigValidation("配置必须包含 stages/events/observation_points 数组。", true);
    return false;
  }

  configDraft = normalized;
  configDraftValid = true;
  dom.saveConfigModalBtn.disabled = false;
  showConfigValidation("配置有效，可保存。", false);
  return true;
}

function getRowSortTime(row) {
  if (row.kind === "stage") {
    return toInt(row.start_time, 0);
  }
  return toInt(row.time, 0);
}

function sortVisualRows() {
  visualRows.sort((a, b) => {
    const dt = getRowSortTime(a) - getRowSortTime(b);
    if (dt !== 0) {
      return dt;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
  });
}

function draftToVisualRows(draft) {
  const rows = [];

  for (const stg of draft.stages || []) {
    rows.push({
      rowKey: newRowKey(),
      kind: "stage",
      id: stg.id,
      name: stg.name,
      start_time: toInt(stg.start_time, 0),
      end_time: toInt(stg.end_time, toInt(stg.start_time, 0)),
      time: 0,
      description: stg.description || "",
    });
  }

  for (const evt of draft.events || []) {
    rows.push({
      rowKey: newRowKey(),
      kind: "event",
      id: evt.id,
      name: evt.name,
      start_time: 0,
      end_time: 0,
      time: toInt(evt.time, 0),
      description: evt.description || "",
    });
  }

  for (const obs of draft.observation_points || []) {
    rows.push({
      rowKey: newRowKey(),
      kind: "observation",
      id: obs.id,
      name: obs.name,
      start_time: 0,
      end_time: 0,
      time: toInt(obs.time, -Math.max(0, toInt(obs.new_countdown, 0))),
      description: obs.description || "",
    });
  }

  visualRows = rows;
  sortVisualRows();
}

function visualRowsToDraft() {
  const selectedName = dom.modelSelect.value;
  const draft = {
    version: 2,
    name: selectedName,
    stages: [],
    events: [],
    observation_points: [],
  };

  for (const row of visualRows) {
    if (row.kind === "stage") {
      const start = toInt(row.start_time, 0);
      const end = Math.max(start, toInt(row.end_time, start));
      draft.stages.push({
        id: String(row.id || "").trim() || newRowKey(),
        name: String(row.name || "未命名阶段"),
        start_time: start,
        end_time: end,
        description: String(row.description || ""),
      });
      continue;
    }

    if (row.kind === "event") {
      draft.events.push({
        id: String(row.id || "").trim() || newRowKey(),
        name: String(row.name || "未命名事件"),
        time: toInt(row.time, 0),
        description: String(row.description || ""),
      });
      continue;
    }

    const time = toInt(row.time, 0);
    draft.observation_points.push({
      id: String(row.id || "").trim() || newRowKey(),
      name: String(row.name || "未命名观察点"),
      time,
      new_countdown: Math.max(0, -time),
      description: String(row.description || ""),
    });
  }

  draft.stages.sort((a, b) => a.start_time - b.start_time);
  draft.events.sort((a, b) => a.time - b.time);
  draft.observation_points.sort((a, b) => a.time - b.time);

  return normalizeDraft(draft, selectedName);
}

function syncRawFromVisual() {
  configDraft = visualRowsToDraft();
  configDraftValid = true;
  dom.saveConfigModalBtn.disabled = false;
  dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
  showConfigValidation("可视化编辑已同步，可直接保存。", false);
}

function pushVisualUndo() {
  visualUndoStack.push(JSON.stringify(visualRows));
  if (visualUndoStack.length > 120) {
    visualUndoStack.shift();
  }
}

function undoVisualChange() {
  if (visualUndoStack.length === 0) {
    return;
  }
  const raw = visualUndoStack.pop();
  try {
    visualRows = JSON.parse(raw);
    syncRawFromVisual();
    renderVisualEditor();
    appendLog("已撤回一次可视化编辑修改");
  } catch {
    // ignore broken undo state
  }
}

function scheduleVisualSortRerender() {
  if (visualSortTimer) {
    clearTimeout(visualSortTimer);
  }
  visualSortTimer = setTimeout(() => {
    renderVisualEditor();
  }, 180);
}

function makeTypeButton(currentRow, kind, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "type-btn";
  btn.textContent = label;
  btn.title = kind === "stage" ? "阶段" : kind === "event" ? "事件" : "观察点";
  btn.classList.toggle("active", currentRow.kind === kind);
  btn.addEventListener("click", () => {
    if (currentRow.kind === kind) {
      return;
    }
    pushVisualUndo();
    const pivot = getRowSortTime(currentRow);
    currentRow.kind = kind;
    if (kind === "stage") {
      currentRow.start_time = pivot;
      currentRow.end_time = Math.max(pivot, pivot + 10);
      currentRow.time = 0;
    } else {
      currentRow.time = pivot;
      currentRow.start_time = 0;
      currentRow.end_time = 0;
    }
    syncRawFromVisual();
    renderVisualEditor();
  });
  return btn;
}

function renderVisualRow(row, index) {
  const line = document.createElement("div");
  line.className = "visual-row";

  const typeCell = document.createElement("div");
  typeCell.className = "type-switch";
  typeCell.appendChild(makeTypeButton(row, "stage", "▦"));
  typeCell.appendChild(makeTypeButton(row, "event", "◆"));
  typeCell.appendChild(makeTypeButton(row, "observation", "◎"));
  line.appendChild(typeCell);

  const idInput = document.createElement("input");
  idInput.className = "row-input";
  idInput.value = row.id || "";
  idInput.placeholder = "id";
  idInput.addEventListener("focus", () => pushVisualUndo());
  idInput.addEventListener("input", () => {
    row.id = idInput.value;
    syncRawFromVisual();
  });
  line.appendChild(idInput);

  const nameInput = document.createElement("input");
  nameInput.className = "row-input";
  nameInput.value = row.name || "";
  nameInput.placeholder = "名称";
  nameInput.addEventListener("focus", () => pushVisualUndo());
  nameInput.addEventListener("input", () => {
    row.name = nameInput.value;
    syncRawFromVisual();
  });
  line.appendChild(nameInput);

  const timeWrap = document.createElement("div");
  timeWrap.className = `cell-time ${row.kind === "stage" ? "dual" : "single"}`;

  if (row.kind === "stage") {
    const startInput = document.createElement("input");
    startInput.type = "number";
    startInput.className = "row-time";
    startInput.value = String(toInt(row.start_time, 0));
    startInput.placeholder = "开始";
    startInput.addEventListener("focus", () => pushVisualUndo());
    startInput.addEventListener("input", () => {
      row.start_time = toInt(startInput.value, 0);
      if (toInt(row.end_time, row.start_time) < row.start_time) {
        row.end_time = row.start_time;
      }
      syncRawFromVisual();
      scheduleVisualSortRerender();
    });

    const endInput = document.createElement("input");
    endInput.type = "number";
    endInput.className = "row-time";
    endInput.value = String(toInt(row.end_time, toInt(row.start_time, 0)));
    endInput.placeholder = "结束";
    endInput.addEventListener("focus", () => pushVisualUndo());
    endInput.addEventListener("input", () => {
      row.end_time = toInt(endInput.value, toInt(row.start_time, 0));
      syncRawFromVisual();
    });

    timeWrap.appendChild(startInput);
    timeWrap.appendChild(endInput);
  } else {
    const timeInput = document.createElement("input");
    timeInput.type = "number";
    timeInput.className = "row-time";
    timeInput.value = String(toInt(row.time, 0));
    timeInput.placeholder = row.kind === "event" ? "时间" : "观察时间";
    timeInput.addEventListener("focus", () => pushVisualUndo());
    timeInput.addEventListener("input", () => {
      row.time = toInt(timeInput.value, 0);
      syncRawFromVisual();
      scheduleVisualSortRerender();
    });
    timeWrap.appendChild(timeInput);
  }

  line.appendChild(timeWrap);

  const descInput = document.createElement("input");
  descInput.className = "row-desc";
  descInput.value = row.description || "";
  descInput.placeholder = "介绍";
  descInput.addEventListener("focus", () => pushVisualUndo());
  descInput.addEventListener("input", () => {
    row.description = descInput.value;
    syncRawFromVisual();
  });
  line.appendChild(descInput);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn danger row-delete";
  deleteBtn.textContent = "×";
  deleteBtn.title = "删除";
  deleteBtn.addEventListener("click", () => {
    pushVisualUndo();
    visualRows.splice(index, 1);
    syncRawFromVisual();
    renderVisualEditor();
  });
  line.appendChild(deleteBtn);

  return line;
}

function renderVisualEditor() {
  if (!configDraft) {
    return;
  }

  sortVisualRows();
  dom.visualList.innerHTML = "";
  visualRows.forEach((row, index) => {
    dom.visualList.appendChild(renderVisualRow(row, index));
  });
}

function setConfigTab(tab) {
  if (tab === "visual" && !validateRawDraft()) {
    notify("请先修复 JSON，再切换到可视化编辑。");
    return;
  }

  configTab = tab === "visual" ? "visual" : "raw";
  dom.configRawPane.classList.toggle("hidden", configTab !== "raw");
  dom.configVisualPane.classList.toggle("hidden", configTab !== "visual");
  dom.configTabRawBtn.classList.toggle("active", configTab === "raw");
  dom.configTabVisualBtn.classList.toggle("active", configTab === "visual");

  if (configTab === "visual") {
    draftToVisualRows(configDraft);
    syncRawFromVisual();
    renderVisualEditor();
  }
}

function openConfigModal() {
  const modelName = dom.modelSelect.value;
  if (!modelName || !modelsCache[modelName]) {
    notify("请先选择型号");
    return;
  }

  const source = modelsCache[modelName];
  configDraft = normalizeDraft(source, modelName);
  visualUndoStack = [];
  dom.configModalTitle.textContent = `型号配置编辑 · ${modelName}`;
  dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
  validateRawDraft();
  setConfigTab("visual");
  dom.configModal.classList.remove("hidden");
}

function closeConfigModal() {
  dom.configModal.classList.add("hidden");
}

async function saveConfigModal() {
  if (configTab === "raw" && !validateRawDraft()) {
    notify("JSON 无效，无法保存。");
    return;
  }

  if (configTab === "visual") {
    syncRawFromVisual();
  }

  const selectedModel = dom.modelSelect.value;
  const payload = normalizeDraft(configDraft, selectedModel);
  payload.name = selectedModel;

  const res = await adminFetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    notify(data.message || "保存失败");
    return;
  }

  appendLog(`配置已保存: ${payload.name}`);
  await fetchModels();
  closeConfigModal();
}

function addVisualItem() {
  if (!configDraft) {
    return;
  }
  pushVisualUndo();
  visualRows.push({
    rowKey: newRowKey(),
    kind: "stage",
    id: `item_${Date.now()}`,
    name: "新条目",
    start_time: 0,
    end_time: 10,
    time: 0,
    description: "",
  });
  syncRawFromVisual();
  renderVisualEditor();
}

function bindEvents() {
  dom.refreshModelsBtn.addEventListener("click", () => {
    fetchModels().catch((error) => notify(error.message));
  });

  dom.modelSelect.addEventListener("change", () => {
    applySelectedModel(dom.modelSelect.value).catch((error) => notify(error.message));
  });

  dom.themeSelect.addEventListener("change", () => {
    applyTheme(dom.themeSelect.value);
  });

  dom.saveDefaultThemeBtn.addEventListener("click", () => {
    saveDefaultTheme().catch((error) => notify(error.message));
  });

  dom.copyVisitorUrlBtn.addEventListener("click", async () => {
    const url = await getVisitorUrl();
    try {
      await navigator.clipboard.writeText(url);
      appendLog(`已复制游客地址: ${url}`);
    } catch {
      notify("复制失败，请手动复制地址。");
    }
  });

  dom.showVisitorQrBtn.addEventListener("click", () => {
    openQrModal().catch((error) => notify(error.message));
  });
  dom.closeQrBtn.addEventListener("click", closeQrModal);
  dom.qrBackdrop.addEventListener("click", closeQrModal);

  dom.reloadPreviewBtn.addEventListener("click", () => {
    applyTheme(currentThemeId);
  });

  dom.logoutBtn.addEventListener("click", async () => {
    try {
      await adminFetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore
    }
    redirectToLogin();
  });

  dom.launchAt.addEventListener("change", scheduleApplyLaunch);
  dom.launchAt.addEventListener("input", () => {
    launchInputDirtyUntil = Date.now() + 6000;
  });

  dom.holdBtn.addEventListener("click", async () => {
    const nextHold = !Boolean(lastState?.is_hold);
    const res = await adminFetch("/api/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hold: nextHold }),
    });
    const data = await res.json();
    if (!data.success) {
      notify(data.message || "HOLD 操作失败");
      return;
    }
    appendLog(data.message || (nextHold ? "已进入 HOLD" : "已恢复倒计时"));
  });

  document.querySelectorAll("button[data-adjust-seconds]").forEach((btn) => {
    btn.addEventListener("click", () => {
      adjustLaunchTime(Number(btn.dataset.adjustSeconds));
    });
  });

  document.querySelectorAll("button[data-quick-launch]").forEach((btn) => {
    btn.addEventListener("click", () => {
      quickLaunch(Number(btn.dataset.quickLaunch));
    });
  });

  dom.openConfigEditorBtn.addEventListener("click", openConfigModal);
  dom.closeConfigModalBtn.addEventListener("click", closeConfigModal);
  dom.configBackdrop.addEventListener("click", closeConfigModal);
  dom.configTabRawBtn.addEventListener("click", () => setConfigTab("raw"));
  dom.configTabVisualBtn.addEventListener("click", () => setConfigTab("visual"));

  dom.configRawEditor.addEventListener("input", () => {
    const isValid = validateRawDraft();
    if (isValid && configTab === "visual") {
      draftToVisualRows(configDraft);
      renderVisualEditor();
    }
  });

  dom.addVisualItemBtn.addEventListener("click", addVisualItem);

  dom.saveConfigModalBtn.addEventListener("click", () => {
    saveConfigModal().catch((error) => notify(error.message));
  });

  dom.clearLogBtn.addEventListener("click", () => {
    uiLogs = [];
    dom.runtimeLog.innerHTML = "";
  });

  document.addEventListener("keydown", (event) => {
    if (dom.configModal.classList.contains("hidden")) {
      return;
    }
    if (configTab !== "visual") {
      return;
    }
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey) {
      return;
    }
    if (event.key.toLowerCase() !== "z") {
      return;
    }
    event.preventDefault();
    undoVisualChange();
  });
}

async function init() {
  populateThemeSelector();
  await loadAdminSettings();
  await fetchModels();

  dom.launchAt.value = dateToInputValue(new Date(Date.now() + 600000));
  bindEvents();

  const channel = new LiveChannel({
    streamUrl: "/api/stream",
    stateUrl: "/api/state",
    onState: renderState,
    onModeChange: setChannelMode,
  });
  channel.start();

  window.setInterval(tickMissionClock, CLOCK_TICK_MS);
}

init().catch((error) => notify(error.message));
