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
  observationButtons: document.getElementById("observationButtons"),
  focusNodes: document.getElementById("focusNodes"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
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
  visualStages: document.getElementById("visualStages"),
  visualEvents: document.getElementById("visualEvents"),
  visualObs: document.getElementById("visualObs"),
  addStageBtn: document.getElementById("addStageBtn"),
  addEventBtn: document.getElementById("addEventBtn"),
  addObsBtn: document.getElementById("addObsBtn"),
};

const CLOCK_TICK_MS = 20;
const THEME_KEY = "mission-admin-theme";

let modelsCache = {};
let lastState = null;
let uiLogs = [];
let launchApplyTimer = null;
let pendingModelName = "";
let selectingModel = false;
let launchInputDirtyUntil = 0;

let configDraft = null;
let configDraftValid = false;
let configTab = "raw";

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

function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" ? "light" : "dark";
}

function applyTheme(theme) {
  const mode = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = mode;
  localStorage.setItem(THEME_KEY, mode);
  dom.themeToggleBtn.textContent = mode === "light" ? "切换夜间模式" : "切换浅色模式";
  if (dom.previewFrame) {
    dom.previewFrame.src = `/visitor?embed=1&theme=${mode}&t=${Date.now()}`;
  }
}

function toggleTheme() {
  applyTheme(getTheme() === "dark" ? "light" : "dark");
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
  const normalized = {
    version: 2,
    name: String(payload?.name || selectedModelName || "未命名型号").trim() || "未命名型号",
    stages: Array.isArray(payload?.stages) ? payload.stages : [],
    events: Array.isArray(payload?.events) ? payload.events : [],
    observation_points: Array.isArray(payload?.observation_points) ? payload.observation_points : [],
  };
  return normalized;
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
    btn.title = `${point.description || ""} / ${point.new_countdown}s`;
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
      appendLog(`触发观察点: ${point.name}`);
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

function renderState(state) {
  lastState = state;

  dom.currentModel.textContent = state.current_model || "-";
  dom.currentStatus.textContent = state.status === "flight" ? "positive" : state.status;

  missionAnchor = {
    ms: Number(state.unified_countdown_ms ?? 0),
    anchorPerf: performance.now(),
    running: Boolean(state.running),
  };
  setTextIfChanged(dom.missionClock, formatSignedClock(missionAnchor.ms));
  dom.activeCount.textContent = String((state.active_countdowns || []).length);

  if (state.current_model && modelsCache[state.current_model]) {
    if (!selectingModel || state.current_model === pendingModelName) {
      dom.modelSelect.value = state.current_model;
      pendingModelName = state.current_model;
    }
  }

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
      return `${item.timestamp} 触发观察点 ${item.point || "-"}`;
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
    base = new Date(Date.now() + 180000);
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
  showConfigValidation("JSON 有效，可直接保存。", false);
  return true;
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
    renderVisualEditor();
  }
}

function createVisualInput(value, onInput, placeholder = "", numeric = false) {
  const input = document.createElement("input");
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.addEventListener("input", () => {
    const raw = input.value;
    onInput(numeric ? (Number.parseInt(raw || "0", 10) || 0) : raw);
  });
  return input;
}

function syncRawFromVisual() {
  dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
  validateRawDraft();
}

function renderVisualList(container, items, schema) {
  container.innerHTML = "";
  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "visual-item";

    schema.forEach((field) => {
      const row = document.createElement("div");
      row.className = "row";
      row.appendChild(
        createVisualInput(item[field.key], (val) => {
          item[field.key] = val;
          syncRawFromVisual();
        }, field.placeholder, Boolean(field.numeric))
      );
      card.appendChild(row);
    });

    const removeRow = document.createElement("div");
    removeRow.className = "row";
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn danger";
    removeBtn.textContent = "删除";
    removeBtn.addEventListener("click", () => {
      items.splice(index, 1);
      renderVisualEditor();
      syncRawFromVisual();
    });
    removeRow.appendChild(removeBtn);
    card.appendChild(removeRow);

    container.appendChild(card);
  });
}

function renderVisualEditor() {
  if (!configDraft) {
    return;
  }

  renderVisualList(dom.visualStages, configDraft.stages, [
    { key: "id", placeholder: "id" },
    { key: "name", placeholder: "名称" },
    { key: "start_time", placeholder: "开始秒", numeric: true },
    { key: "end_time", placeholder: "结束秒", numeric: true },
    { key: "description", placeholder: "描述" },
  ]);

  renderVisualList(dom.visualEvents, configDraft.events, [
    { key: "id", placeholder: "id" },
    { key: "name", placeholder: "名称" },
    { key: "time", placeholder: "时间秒", numeric: true },
    { key: "description", placeholder: "描述" },
  ]);

  renderVisualList(dom.visualObs, configDraft.observation_points, [
    { key: "id", placeholder: "id" },
    { key: "name", placeholder: "名称" },
    { key: "new_countdown", placeholder: "倒计时秒", numeric: true },
    { key: "description", placeholder: "描述" },
  ]);
}

function openConfigModal() {
  const modelName = dom.modelSelect.value;
  if (!modelName || !modelsCache[modelName]) {
    notify("请先选择型号");
    return;
  }

  const source = modelsCache[modelName];
  configDraft = normalizeDraft(source, modelName);
  dom.configModalTitle.textContent = `型号配置编辑 · ${modelName}`;
  dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
  validateRawDraft();
  setConfigTab("raw");
  dom.configModal.classList.remove("hidden");
}

function closeConfigModal() {
  dom.configModal.classList.add("hidden");
}

async function saveConfigModal() {
  if (!validateRawDraft()) {
    notify("JSON 无效，无法保存。");
    return;
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

function wireVisualButtons() {
  dom.addStageBtn.addEventListener("click", () => {
    if (!configDraft) {
      return;
    }
    configDraft.stages.push({
      id: `stg_${Date.now()}`,
      name: "新阶段",
      start_time: 0,
      end_time: 10,
      description: "",
    });
    renderVisualEditor();
    syncRawFromVisual();
  });

  dom.addEventBtn.addEventListener("click", () => {
    if (!configDraft) {
      return;
    }
    configDraft.events.push({
      id: `evt_${Date.now()}`,
      name: "新事件",
      time: 0,
      description: "",
    });
    renderVisualEditor();
    syncRawFromVisual();
  });

  dom.addObsBtn.addEventListener("click", () => {
    if (!configDraft) {
      return;
    }
    configDraft.observation_points.push({
      id: `obs_${Date.now()}`,
      name: "新观察点",
      new_countdown: 30,
      description: "",
    });
    renderVisualEditor();
    syncRawFromVisual();
  });
}

function bindEvents() {
  dom.refreshModelsBtn.addEventListener("click", () => {
    fetchModels().catch((error) => notify(error.message));
  });

  dom.modelSelect.addEventListener("change", () => {
    applySelectedModel(dom.modelSelect.value).catch((error) => notify(error.message));
  });

  dom.themeToggleBtn.addEventListener("click", toggleTheme);

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
    const mode = getTheme();
    dom.previewFrame.src = `/visitor?embed=1&theme=${mode}&t=${Date.now()}`;
  });

  dom.logoutBtn.addEventListener("click", async () => {
    try {
      await adminFetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Ignore network/auth errors and force return to login page.
    }
    redirectToLogin();
  });

  dom.launchAt.addEventListener("change", scheduleApplyLaunch);
  dom.launchAt.addEventListener("input", () => {
    launchInputDirtyUntil = Date.now() + 6000;
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
      renderVisualEditor();
    }
  });
  dom.saveConfigModalBtn.addEventListener("click", () => {
    saveConfigModal().catch((error) => notify(error.message));
  });

  dom.clearLogBtn.addEventListener("click", () => {
    uiLogs = [];
    dom.runtimeLog.innerHTML = "";
  });

  wireVisualButtons();
}

async function init() {
  applyTheme(getTheme());
  await fetchModels();
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
