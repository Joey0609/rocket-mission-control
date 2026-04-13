const dom = {
  channelMode: document.getElementById("channelMode"),
  currentModel: document.getElementById("currentModel"),
  currentStatus: document.getElementById("currentStatus"),
  missionClock: document.getElementById("missionClock"),
  activeCount: document.getElementById("activeCount"),
  modelSelect: document.getElementById("modelSelect"),
  refreshModelsBtn: document.getElementById("refreshModelsBtn"),
  openConfigEditorBtn: document.getElementById("openConfigEditorBtn"),
  openFuelEditorBtn: document.getElementById("openFuelEditorBtn"),
  openEngineLayoutBtn: document.getElementById("openEngineLayoutBtn"),
  launchAt: document.getElementById("launchAt"),
  holdBtn: document.getElementById("holdBtn"),
  observationButtons: document.getElementById("observationButtons"),

  openThemeModalBtn: document.getElementById("openThemeModalBtn"),
  themeModal: document.getElementById("themeModal"),
  themeBackdrop: document.getElementById("themeBackdrop"),
  themeGrid: document.getElementById("themeGrid"),
  applyThemeBtn: document.getElementById("applyThemeBtn"),
  cancelThemeBtn: document.getElementById("cancelThemeBtn"),
  saveDefaultThemeBtn: document.getElementById("saveDefaultThemeBtn"),

  copyVisitorUrlBtn: document.getElementById("copyVisitorUrlBtn"),
  showVisitorQrBtn: document.getElementById("showVisitorQrBtn"),
  reloadPreviewBtn: document.getElementById("reloadPreviewBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  previewFrame: document.querySelector(".preview-frame"),

  qrModal: document.getElementById("qrModal"),
  qrBackdrop: document.getElementById("qrBackdrop"),
  visitorQrImage: document.getElementById("visitorQrImage"),
  visitorQrText: document.getElementById("visitorQrText"),
  closeQrBtn: document.getElementById("closeQrBtn"),

  recoverToggle: document.getElementById("recoverToggle"),
  recoverSwitchWrap: document.getElementById("recoverSwitchWrap"),

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
  recoverableConfigToggle: document.getElementById("recoverableConfigToggle"),
  openPropellantProfileBtn: document.getElementById("openPropellantProfileBtn"),

  propellantModal: document.getElementById("propellantModal"),
  propellantBackdrop: document.getElementById("propellantBackdrop"),
  rocketStageCountInput: document.getElementById("rocketStageCountInput"),
  boosterEnabledInput: document.getElementById("boosterEnabledInput"),
  boosterCountInput: document.getElementById("boosterCountInput"),
  propellantStageList: document.getElementById("propellantStageList"),
  closePropellantModalBtn: document.getElementById("closePropellantModalBtn"),
  savePropellantModalBtn: document.getElementById("savePropellantModalBtn"),

  fuelModal: document.getElementById("fuelModal"),
  fuelBackdrop: document.getElementById("fuelBackdrop"),
  fuelTabListBtn: document.getElementById("fuelTabListBtn"),
  fuelTabCurveBtn: document.getElementById("fuelTabCurveBtn"),
  fuelListPane: document.getElementById("fuelListPane"),
  fuelCurvePane: document.getElementById("fuelCurvePane"),
  fuelTable: document.getElementById("fuelTable"),
  fuelCurveChannelSelect: document.getElementById("fuelCurveChannelSelect"),
  fuelCurveCanvas: document.getElementById("fuelCurveCanvas"),
  closeFuelModalBtn: document.getElementById("closeFuelModalBtn"),
  saveFuelModalBtn: document.getElementById("saveFuelModalBtn"),

  engineLayoutModal: document.getElementById("engineLayoutModal"),
  engineLayoutBackdrop: document.getElementById("engineLayoutBackdrop"),
  closeEngineLayoutBtn: document.getElementById("closeEngineLayoutBtn"),
};

const CLOCK_TICK_MS = 20;

let modelsCache = {};
let lastState = null;
let launchApplyTimer = null;
let pendingModelName = "";
let selectingModel = false;
let launchInputDirtyUntil = 0;
let observationButtonsSig = "";

let currentThemeId = window.MissionThemes.defaultId;
let defaultThemeId = currentThemeId;
let themeModalDraftId = currentThemeId;
let themeModalOriginId = currentThemeId;

let configDraft = null;
let configDraftValid = false;
let configDraftDirty = false;
let configTab = "visual";
let visualRows = [];
let visualUndoStack = [];
let visualSortTimer = null;
let updatingRecoverToggle = false;
let propellantDirty = false;

let missionAnchor = {
  ms: 0,
  anchorPerf: performance.now(),
  running: false,
};

let fuelEditDraft = null;
let fuelEditSource = "";
let fuelEditModelName = "";
let fuelTab = "list";
let fuelNodes = [];
let fuelChannels = [];
let curveDragState = null;
let fuelDirty = false;

function toast(message, type = "info") {
  if (typeof window.notify === "function") {
    window.notify(message, type);
  }
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value, fallback = -1) {
  const parsed = toInt(value, fallback);
  if (parsed < 0) {
    return -1;
  }
  if (parsed > 100) {
    return 100;
  }
  return parsed;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
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
  dom.channelMode.textContent = mode === "sse" ? "实时通道: SSE 推送" : "实时通道: 重连中";
  dom.channelMode.classList.toggle("poll", mode !== "sse");
}

function getThemePreviewColors(theme) {
  const values = Object.values(theme?.vars || {});
  const first = values[0] || theme?.vars?.["--bg-1"] || "#243141";
  const second = values[1] || theme?.vars?.["--bg-2"] || first;
  return [first, second];
}

function isModalVisible(element) {
  return Boolean(element) && !element.classList.contains("hidden");
}

function isThemeUnsaved() {
  return themeModalDraftId !== themeModalOriginId;
}

function handleEscapeClose() {
  if (isModalVisible(dom.engineLayoutModal)) {
    closeEngineLayoutModal();
    return true;
  }
  if (isModalVisible(dom.fuelModal)) {
    if (fuelDirty) {
      toast("还没保存", "error");
    }
    return closeFuelModal(true);
  }
  if (isModalVisible(dom.propellantModal)) {
    if (propellantDirty) {
      toast("还没保存", "error");
    }
    return closePropellantModal(true);
  }
  if (isModalVisible(dom.configModal)) {
    if (configDraftDirty) {
      toast("还没保存", "error");
    }
    return closeConfigModal(true);
  }
  if (isModalVisible(dom.themeModal)) {
    if (isThemeUnsaved()) {
      toast("还没保存", "error");
    }
    return closeThemeModal(true, true);
  }
  if (isModalVisible(dom.qrModal)) {
    closeQrModal();
    return true;
  }
  return false;
}

function applyTheme(themeId, refreshPreview = true) {
  currentThemeId = window.MissionThemes.apply(themeId);
  const themeMeta = window.MissionThemes.get(currentThemeId);
  setTextIfChanged(dom.openThemeModalBtn, `主题: ${themeMeta.name}`);
  if (refreshPreview && dom.previewFrame) {
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

function renderThemeCards() {
  const items = window.MissionThemes.list();
  dom.themeGrid.innerHTML = "";

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
      applyTheme(item.id, true);
      renderThemeCards();
    });

    dom.themeGrid.appendChild(card);
  }
}

function openThemeModal() {
  themeModalOriginId = currentThemeId;
  themeModalDraftId = currentThemeId;
  renderThemeCards();
  dom.themeModal.classList.remove("hidden");
}

function closeThemeModal(restoreOrigin, force = false) {
  if (!force && isThemeUnsaved()) {
    toast("还没保存", "error");
    return false;
  }
  dom.themeModal.classList.add("hidden");
  if (restoreOrigin) {
    applyTheme(themeModalOriginId, true);
  }
  return true;
}

async function saveDefaultTheme() {
  const res = await adminFetch("/api/admin/settings/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme_id: currentThemeId }),
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || "保存默认主题失败", "error");
    return;
  }
  defaultThemeId = data.settings?.default_theme || currentThemeId;
  toast("默认主题已保存", "success");
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

function normalizeFuelSpec(item) {
  return {
    phase: String(item?.phase || "液体"),
    oxidizer: String(item?.oxidizer || ""),
    fuel: String(item?.fuel || ""),
  };
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

  const rocketMeta = payload?.rocket_meta && typeof payload.rocket_meta === "object"
    ? {
      recovery_capable: payload.rocket_meta.recovery_capable !== false,
      recovery_enabled: payload.rocket_meta.recovery_capable === false ? false : payload.rocket_meta.recovery_enabled !== false,
      stage_count: Math.max(1, toInt(payload.rocket_meta.stage_count, 1)),
      stages: Array.isArray(payload.rocket_meta.stages)
        ? payload.rocket_meta.stages.map((stage, idx) => ({
          stage_index: Math.max(1, toInt(stage.stage_index, idx + 1)),
          fuels: Array.isArray(stage.fuels) && stage.fuels.length > 0
            ? stage.fuels.map(normalizeFuelSpec)
            : [normalizeFuelSpec({})],
        }))
        : [{ stage_index: 1, fuels: [normalizeFuelSpec({})] }],
      boosters: {
        enabled: Boolean(payload.rocket_meta.boosters?.enabled),
        count: Math.max(0, toInt(payload.rocket_meta.boosters?.count, 0)),
        fuels: Array.isArray(payload.rocket_meta.boosters?.fuels)
          ? payload.rocket_meta.boosters.fuels.map(normalizeFuelSpec)
          : [],
      },
    }
    : {
      recovery_capable: true,
      recovery_enabled: true,
      stage_count: 1,
      stages: [{ stage_index: 1, fuels: [normalizeFuelSpec({})] }],
      boosters: { enabled: false, count: 0, fuels: [] },
    };

  if (!rocketMeta.recovery_capable) {
    rocketMeta.recovery_enabled = false;
  }

  const fuelEditor = {
    version: 1,
    node_values: payload?.fuel_editor?.node_values && typeof payload.fuel_editor.node_values === "object"
      ? deepClone(payload.fuel_editor.node_values)
      : {},
    curves: payload?.fuel_editor?.curves && typeof payload.fuel_editor.curves === "object"
      ? deepClone(payload.fuel_editor.curves)
      : {},
  };

  return {
    version: 2,
    name: String(payload?.name || selectedModelName || "未命名型号").trim() || "未命名型号",
    stages: normalizedStages,
    events: normalizedEvents,
    observation_points: normalizedObs,
    rocket_meta: rocketMeta,
    fuel_editor: fuelEditor,
    engine_layout: payload?.engine_layout && typeof payload.engine_layout === "object"
      ? deepClone(payload.engine_layout)
      : { version: 1, reserved: true },
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
    toast(data.message || "型号切换失败", "error");
    if (lastState?.current_model && modelsCache[lastState.current_model]) {
      dom.modelSelect.value = lastState.current_model;
    }
    return;
  }

  toast(`已切换型号: ${modelName}`, "success");
  selectingModel = false;
}

function observationSignature(points) {
  return (points || []).map((p) => `${p.id}|${p.name}|${p.time}`).join(";");
}

function renderObservationButtons(state) {
  const points = state.observation_points || [];
  const sig = observationSignature(points);
  if (sig === observationButtonsSig) {
    return;
  }
  observationButtonsSig = sig;

  if (points.length === 0) {
    dom.observationButtons.innerHTML = '<button class="btn" disabled>当前型号无观察点</button>';
    return;
  }

  dom.observationButtons.innerHTML = "";
  points.forEach((point) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = point.name;
    const t = toInt(point.time, 0);
    btn.title = `${point.description || ""} / 对齐 T${t >= 0 ? "+" : ""}${t}`;
    btn.addEventListener("click", async () => {
      const res = await adminFetch("/api/observation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ point_id: point.id }),
      });
      const data = await res.json();
      if (!data.success) {
        toast(data.message || "触发失败", "error");
        return;
      }
      toast(data.message || `已触发 ${point.name}`, "success");
    });
    dom.observationButtons.appendChild(btn);
  });
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

function renderRocketConfigCard(state) {
  const meta = state.rocket_meta || null;
  if (!meta) {
    updatingRecoverToggle = true;
    dom.recoverToggle.checked = false;
    dom.recoverToggle.disabled = true;
    updatingRecoverToggle = false;
    dom.recoverSwitchWrap.classList.add("dim");
    return;
  }

  const capable = meta.recovery_capable !== false;
  const enabled = capable ? meta.recovery_enabled !== false : false;
  updatingRecoverToggle = true;
  dom.recoverToggle.checked = enabled;
  dom.recoverToggle.disabled = !capable;
  updatingRecoverToggle = false;
  dom.recoverSwitchWrap.classList.toggle("dim", !capable);
}

function renderState(state) {
  lastState = state;

  dom.currentModel.textContent = state.current_model || "-";
  dom.currentStatus.textContent = state.status;

  missionAnchor = {
    ms: Number(state.unified_countdown_ms ?? 0),
    anchorPerf: performance.now(),
    running: Boolean(state.running) && !Boolean(state.is_hold),
  };
  setTextIfChanged(dom.missionClock, formatSignedClock(missionAnchor.ms));

  const obsCount = Array.isArray(state.observation_log)
    ? state.observation_log.filter((item) => item.type === "observation").length
    : 0;
  dom.activeCount.textContent = String(obsCount);

  if (state.current_model && modelsCache[state.current_model]) {
    if (!selectingModel || state.current_model === pendingModelName) {
      dom.modelSelect.value = state.current_model;
      pendingModelName = state.current_model;
    }
  }

  dom.holdBtn.classList.toggle("active", Boolean(state.is_hold));
  dom.holdBtn.textContent = state.is_hold ? "RESUME" : "HOLD";

  renderObservationButtons(state);
  renderRocketConfigCard(state);
  syncLaunchInputFromState(state);
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
    toast(data.message || "设置失败", "error");
    return;
  }
  toast("发射时间已更新", "success");
}

function scheduleApplyLaunch() {
  launchInputDirtyUntil = Date.now() + 6000;
  if (launchApplyTimer) {
    clearTimeout(launchApplyTimer);
  }
  launchApplyTimer = setTimeout(() => {
    launchByInput().catch((error) => toast(error.message, "error"));
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
      rowKey: `${stg.id}_${Date.now()}`,
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
      rowKey: `${evt.id}_${Date.now()}`,
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
      rowKey: `${obs.id}_${Date.now()}`,
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
    rocket_meta: deepClone(configDraft.rocket_meta || {}),
    fuel_editor: deepClone(configDraft.fuel_editor || { version: 1, node_values: {}, curves: {} }),
    engine_layout: deepClone(configDraft.engine_layout || { version: 1, reserved: true }),
  };

  for (const row of visualRows) {
    if (row.kind === "stage") {
      const start = toInt(row.start_time, 0);
      const end = Math.max(start, toInt(row.end_time, start));
      draft.stages.push({
        id: String(row.id || "").trim() || `stg_${Date.now()}`,
        name: String(row.name || "未命名阶段"),
        start_time: start,
        end_time: end,
        description: String(row.description || ""),
      });
      continue;
    }

    if (row.kind === "event") {
      draft.events.push({
        id: String(row.id || "").trim() || `evt_${Date.now()}`,
        name: String(row.name || "未命名事件"),
        time: toInt(row.time, 0),
        description: String(row.description || ""),
      });
      continue;
    }

    const time = toInt(row.time, 0);
    draft.observation_points.push({
      id: String(row.id || "").trim() || `obs_${Date.now()}`,
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
  if (isModalVisible(dom.configModal)) {
    configDraftDirty = true;
  }
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
    toast("已撤回一次修改", "info");
  } catch {
    // ignore
  }
}

function scheduleVisualSortRerender() {
  if (visualSortTimer) {
    clearTimeout(visualSortTimer);
  }
  visualSortTimer = setTimeout(() => {
    renderVisualEditor();
  }, 160);
}

function makeTypeButton(currentRow, kind, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "type-btn";
  btn.textContent = label;
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
    toast("请先修复 JSON，再切换到可视化编辑。", "error");
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
    toast("请先选择型号", "error");
    return;
  }

  configDraft = normalizeDraft(modelsCache[modelName], modelName);
  visualUndoStack = [];
  dom.configModalTitle.textContent = `型号配置编辑 · ${modelName}`;
  dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
  dom.recoverableConfigToggle.checked = configDraft.rocket_meta.recovery_capable !== false;
  validateRawDraft();
  setConfigTab("visual");
  dom.configModal.classList.remove("hidden");
  configDraftDirty = false;
}

function closeConfigModal(force = false) {
  if (!force && configDraftDirty) {
    toast("还没保存", "error");
    return false;
  }
  dom.configModal.classList.add("hidden");
  return true;
}

async function saveConfigModal() {
  if (configTab === "raw" && !validateRawDraft()) {
    toast("JSON 无效，无法保存。", "error");
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
    toast(data.message || "保存失败", "error");
    return;
  }

  modelsCache[payload.name] = payload;
  toast(`配置已保存: ${payload.name}`, "success");
  await fetchModels();
  configDraftDirty = false;
  closeConfigModal(true);
}

function addVisualItem() {
  if (!configDraft) {
    return;
  }
  pushVisualUndo();
  visualRows.push({
    rowKey: `row_${Date.now()}`,
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

function openPropellantModal() {
  if (!configDraft) {
    return;
  }
  renderPropellantFields();
  dom.propellantModal.classList.remove("hidden");
  propellantDirty = false;
}

function closePropellantModal(force = false) {
  if (!force && propellantDirty) {
    toast("还没保存", "error");
    return false;
  }
  dom.propellantModal.classList.add("hidden");
  return true;
}

function ensureRocketMeta() {
  if (!configDraft.rocket_meta) {
    configDraft.rocket_meta = normalizeDraft({}, configDraft.name).rocket_meta;
  }
}

function renderPropellantFields() {
  ensureRocketMeta();

  const meta = configDraft.rocket_meta;
  const stageCount = Math.max(1, toInt(meta.stage_count, 1));
  dom.rocketStageCountInput.value = String(stageCount);
  dom.boosterEnabledInput.checked = Boolean(meta.boosters?.enabled);
  dom.boosterCountInput.value = String(Math.max(0, toInt(meta.boosters?.count, 0)));

  while ((meta.stages || []).length < stageCount) {
    meta.stages.push({
      stage_index: meta.stages.length + 1,
      fuels: [normalizeFuelSpec({})],
    });
  }
  meta.stages = meta.stages.slice(0, stageCount);

  dom.propellantStageList.innerHTML = "";

  meta.stages.forEach((stage, index) => {
    const card = document.createElement("div");
    card.className = "propellant-stage-item";

    const title = document.createElement("strong");
    title.textContent = `第 ${index + 1} 级`;
    card.appendChild(title);

    const fuel = Array.isArray(stage.fuels) && stage.fuels.length > 0 ? stage.fuels[0] : normalizeFuelSpec({});

    const grid = document.createElement("div");
    grid.className = "propellant-stage-grid";

    const phaseSelect = document.createElement("select");
    ["液体", "固体"].forEach((phase) => {
      const opt = document.createElement("option");
      opt.value = phase;
      opt.textContent = phase;
      if (fuel.phase === phase) {
        opt.selected = true;
      }
      phaseSelect.appendChild(opt);
    });

    const oxidizerInput = document.createElement("input");
    oxidizerInput.value = fuel.oxidizer || "";
    oxidizerInput.placeholder = "氧化剂";

    const fuelInput = document.createElement("input");
    fuelInput.value = fuel.fuel || "";
    fuelInput.placeholder = "燃料";

    const hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = "每一级配置一个主燃料组合";

    grid.appendChild(phaseSelect);
    grid.appendChild(oxidizerInput);
    grid.appendChild(fuelInput);
    grid.appendChild(hint);
    card.appendChild(grid);

    phaseSelect.addEventListener("change", () => {
      propellantDirty = true;
      fuel.phase = phaseSelect.value;
      stage.fuels = [fuel];
    });
    oxidizerInput.addEventListener("input", () => {
      propellantDirty = true;
      fuel.oxidizer = oxidizerInput.value;
      stage.fuels = [fuel];
    });
    fuelInput.addEventListener("input", () => {
      propellantDirty = true;
      fuel.fuel = fuelInput.value;
      stage.fuels = [fuel];
    });

    dom.propellantStageList.appendChild(card);
  });

  if (meta.boosters?.enabled) {
    const boosterCard = document.createElement("div");
    boosterCard.className = "propellant-stage-item";
    boosterCard.innerHTML = "<strong>助推器</strong>";

    const boosterFuel = Array.isArray(meta.boosters.fuels) && meta.boosters.fuels.length > 0
      ? meta.boosters.fuels[0]
      : normalizeFuelSpec({});

    const grid = document.createElement("div");
    grid.className = "propellant-stage-grid";

    const phaseSelect = document.createElement("select");
    ["液体", "固体"].forEach((phase) => {
      const opt = document.createElement("option");
      opt.value = phase;
      opt.textContent = phase;
      if (boosterFuel.phase === phase) {
        opt.selected = true;
      }
      phaseSelect.appendChild(opt);
    });

    const oxidizerInput = document.createElement("input");
    oxidizerInput.value = boosterFuel.oxidizer || "";
    oxidizerInput.placeholder = "氧化剂";

    const fuelInput = document.createElement("input");
    fuelInput.value = boosterFuel.fuel || "";
    fuelInput.placeholder = "燃料";

    const hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = `当前数量: ${toInt(meta.boosters.count, 0)} 个`;

    grid.appendChild(phaseSelect);
    grid.appendChild(oxidizerInput);
    grid.appendChild(fuelInput);
    grid.appendChild(hint);
    boosterCard.appendChild(grid);

    phaseSelect.addEventListener("change", () => {
      propellantDirty = true;
      boosterFuel.phase = phaseSelect.value;
      meta.boosters.fuels = [boosterFuel];
    });
    oxidizerInput.addEventListener("input", () => {
      propellantDirty = true;
      boosterFuel.oxidizer = oxidizerInput.value;
      meta.boosters.fuels = [boosterFuel];
    });
    fuelInput.addEventListener("input", () => {
      propellantDirty = true;
      boosterFuel.fuel = fuelInput.value;
      meta.boosters.fuels = [boosterFuel];
    });

    dom.propellantStageList.appendChild(boosterCard);
  }
}

function savePropellantModal() {
  ensureRocketMeta();
  const meta = configDraft.rocket_meta;

  const stageCount = Math.max(1, toInt(dom.rocketStageCountInput.value, 1));
  meta.stage_count = stageCount;
  meta.stages = (meta.stages || []).slice(0, stageCount);

  while (meta.stages.length < stageCount) {
    meta.stages.push({
      stage_index: meta.stages.length + 1,
      fuels: [normalizeFuelSpec({})],
    });
  }

  meta.stages = meta.stages.map((stage, index) => ({
    stage_index: index + 1,
    fuels: Array.isArray(stage.fuels) && stage.fuels.length > 0
      ? [normalizeFuelSpec(stage.fuels[0])]
      : [normalizeFuelSpec({})],
  }));

  meta.boosters = {
    enabled: Boolean(dom.boosterEnabledInput.checked),
    count: Math.max(0, toInt(dom.boosterCountInput.value, 0)),
    fuels: meta.boosters?.enabled && Array.isArray(meta.boosters.fuels) && meta.boosters.fuels.length > 0
      ? [normalizeFuelSpec(meta.boosters.fuels[0])]
      : (Boolean(dom.boosterEnabledInput.checked) ? [normalizeFuelSpec({})] : []),
  };

  syncRawFromVisual();
  propellantDirty = false;
  closePropellantModal(true);
  toast("加注参数已更新", "success");
}

function deriveFuelChannels(rocketMeta) {
  const channels = [];
  const stageList = Array.isArray(rocketMeta?.stages) ? rocketMeta.stages : [];

  stageList.forEach((stage) => {
    const fuels = Array.isArray(stage.fuels) ? stage.fuels : [];
    fuels.forEach((fuel, index) => {
      const id = `stage${stage.stage_index}_${index}`;
      const label = `第${stage.stage_index}级 ${fuel.phase} ${fuel.oxidizer}/${fuel.fuel}`;
      channels.push({ id, label });
    });
  });

  if (rocketMeta?.boosters?.enabled) {
    const fuels = Array.isArray(rocketMeta.boosters.fuels) ? rocketMeta.boosters.fuels : [];
    fuels.forEach((fuel, index) => {
      const id = `booster_${index}`;
      const label = `助推器 ${fuel.phase} ${fuel.oxidizer}/${fuel.fuel}`;
      channels.push({ id, label });
    });
  }

  if (channels.length === 0) {
    channels.push({ id: "default", label: "主推进剂" });
  }

  return channels;
}

function buildFuelNodes(draft) {
  const nodes = [];

  for (const stage of draft.stages || []) {
    nodes.push({ key: `stage:${stage.id}:start`, time: toInt(stage.start_time, 0), name: `${stage.name} 开始` });
    nodes.push({ key: `stage:${stage.id}:end`, time: toInt(stage.end_time, 0), name: `${stage.name} 结束` });
  }

  for (const event of draft.events || []) {
    nodes.push({ key: `event:${event.id}`, time: toInt(event.time, 0), name: event.name });
  }

  for (const obs of draft.observation_points || []) {
    nodes.push({ key: `observation:${obs.id}`, time: toInt(obs.time, 0), name: `${obs.name} (观察点)` });
  }

  nodes.sort((a, b) => (a.time - b.time) || a.name.localeCompare(b.name, "zh-CN"));
  return nodes;
}

function ensureFuelStructure(draft) {
  if (!draft.fuel_editor || typeof draft.fuel_editor !== "object") {
    draft.fuel_editor = { version: 1, node_values: {}, curves: {} };
  }
  if (!draft.fuel_editor.node_values || typeof draft.fuel_editor.node_values !== "object") {
    draft.fuel_editor.node_values = {};
  }
  if (!draft.fuel_editor.curves || typeof draft.fuel_editor.curves !== "object") {
    draft.fuel_editor.curves = {};
  }

  fuelNodes = buildFuelNodes(draft);
  fuelChannels = deriveFuelChannels(draft.rocket_meta || {});

  for (const node of fuelNodes) {
    if (!draft.fuel_editor.node_values[node.key] || typeof draft.fuel_editor.node_values[node.key] !== "object") {
      draft.fuel_editor.node_values[node.key] = {};
    }
    for (const channel of fuelChannels) {
      if (!Object.prototype.hasOwnProperty.call(draft.fuel_editor.node_values[node.key], channel.id)) {
        draft.fuel_editor.node_values[node.key][channel.id] = -1;
      }
      draft.fuel_editor.node_values[node.key][channel.id] = clampPercent(draft.fuel_editor.node_values[node.key][channel.id], -1);
    }
  }

  for (const channel of fuelChannels) {
    if (!Array.isArray(draft.fuel_editor.curves[channel.id])) {
      draft.fuel_editor.curves[channel.id] = [];
    }
  }
}

function interpolate(points, time) {
  if (!Array.isArray(points) || points.length === 0) {
    return 0;
  }
  if (time <= points[0].time) {
    return points[0].value;
  }
  if (time >= points[points.length - 1].time) {
    return points[points.length - 1].value;
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a.time <= time && time <= b.time) {
      const total = b.time - a.time || 1;
      const ratio = (time - a.time) / total;
      return a.value + (b.value - a.value) * ratio;
    }
  }
  return points[points.length - 1].value;
}

function resolveChannelPoints(draft, channelId) {
  const entries = [];
  for (const node of fuelNodes) {
    const raw = clampPercent(draft.fuel_editor.node_values[node.key]?.[channelId], -1);
    if (raw >= 0) {
      entries.push({ time: node.time, value: raw });
    }
  }

  const unique = new Map();
  for (const p of entries) {
    unique.set(p.time, p.value);
  }

  const points = Array.from(unique.entries()).map(([time, value]) => ({ time: Number(time), value: Number(value) }));

  if (points.length === 0) {
    points.push({ time: -10800, value: 0 });
    points.push({ time: -600, value: 100 });
    points.push({ time: 0, value: 100 });
  }

  const hasT0 = points.some((p) => p.time === 0);
  if (!hasT0) {
    points.push({ time: 0, value: 100 });
  }

  const minNodeTime = fuelNodes.length > 0 ? fuelNodes[0].time : -10800;
  if (!points.some((p) => p.time <= minNodeTime)) {
    points.push({ time: minNodeTime, value: 0 });
  }

  points.sort((a, b) => a.time - b.time);
  return points;
}

function resolveChannelAtNodes(draft, channelId) {
  const explicitPoints = resolveChannelPoints(draft, channelId);
  const resolved = {};

  for (const node of fuelNodes) {
    const raw = clampPercent(draft.fuel_editor.node_values[node.key]?.[channelId], -1);
    if (raw >= 0) {
      resolved[node.key] = raw;
    } else {
      resolved[node.key] = Math.max(0, Math.min(100, Math.round(interpolate(explicitPoints, node.time))));
    }
  }

  return resolved;
}

function syncCurvesFromNodeValues(draft) {
  for (const channel of fuelChannels) {
    const points = resolveChannelPoints(draft, channel.id);
    draft.fuel_editor.curves[channel.id] = points;
  }
}

function renderFuelTable() {
  ensureFuelStructure(fuelEditDraft);

  const table = dom.fuelTable;
  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const headNode = document.createElement("th");
  headNode.textContent = "节点";
  headRow.appendChild(headNode);

  const headTime = document.createElement("th");
  headTime.textContent = "时间(s)";
  headRow.appendChild(headTime);

  for (const channel of fuelChannels) {
    const th = document.createElement("th");
    th.textContent = channel.label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (const node of fuelNodes) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = node.name;
    tr.appendChild(tdName);

    const tdTime = document.createElement("td");
    tdTime.textContent = `T${node.time >= 0 ? "+" : ""}${node.time}`;
    tr.appendChild(tdTime);

    for (const channel of fuelChannels) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "-1";
      input.max = "100";
      const raw = clampPercent(fuelEditDraft.fuel_editor.node_values[node.key]?.[channel.id], -1);
      input.value = String(raw);
      input.title = "-1 表示自动插值";
      input.addEventListener("input", () => {
        fuelDirty = true;
        fuelEditDraft.fuel_editor.node_values[node.key][channel.id] = clampPercent(input.value, -1);
        syncCurvesFromNodeValues(fuelEditDraft);
        renderFuelCurve();
      });
      td.appendChild(input);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
}

function curveCanvasMetrics() {
  const canvas = dom.fuelCurveCanvas;
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 10) {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(360 * ratio);
  }

  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = canvas.width / ratio;
  const height = canvas.height / ratio;

  return {
    ctx,
    width,
    height,
    padLeft: 58,
    padRight: 28,
    padTop: 24,
    padBottom: 34,
  };
}

function timeDomain() {
  const times = fuelNodes.map((n) => n.time);
  let minTime = times.length > 0 ? Math.min(...times) : -10800;
  let maxTime = times.length > 0 ? Math.max(...times) : 0;
  if (minTime === maxTime) {
    maxTime = minTime + 60;
  }
  return { minTime, maxTime };
}

function getCurrentCurveChannelId() {
  return String(dom.fuelCurveChannelSelect.value || (fuelChannels[0] ? fuelChannels[0].id : ""));
}

function renderFuelCurve() {
  ensureFuelStructure(fuelEditDraft);

  const channelId = getCurrentCurveChannelId();
  const points = Array.isArray(fuelEditDraft.fuel_editor.curves[channelId])
    ? fuelEditDraft.fuel_editor.curves[channelId]
    : [];

  const m = curveCanvasMetrics();
  const { ctx, width, height, padLeft, padRight, padTop, padBottom } = m;

  ctx.clearRect(0, 0, width, height);

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const { minTime, maxTime } = timeDomain();

  const toX = (time) => padLeft + ((time - minTime) / (maxTime - minTime)) * plotW;
  const toY = (value) => padTop + ((100 - value) / 100) * plotH;

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) {
    const y = padTop + (i / 10) * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }

  for (let i = 0; i <= 8; i += 1) {
    const x = padLeft + (i / 8) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, height - padBottom);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop);
  ctx.lineTo(padLeft, height - padBottom);
  ctx.lineTo(width - padRight, height - padBottom);
  ctx.stroke();

  if (points.length > 0) {
    ctx.strokeStyle = "#4fd2ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, index) => {
      const x = toX(p.time);
      const y = toY(p.value);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    points.forEach((p, index) => {
      const x = toX(p.time);
      const y = toY(p.value);
      ctx.beginPath();
      ctx.fillStyle = curveDragState && curveDragState.index === index && curveDragState.channelId === channelId ? "#ffd16e" : "#4fd2ff";
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = '12px "Manrope"';
  ctx.fillText("0", padLeft - 18, height - padBottom + 4);
  ctx.fillText("100", padLeft - 26, padTop + 4);
  ctx.fillText(`T${minTime >= 0 ? "+" : ""}${minTime}`, padLeft, height - 8);
  ctx.fillText(`T${maxTime >= 0 ? "+" : ""}${maxTime}`, width - padRight - 80, height - 8);
}

function findCurvePointAtPosition(x, y) {
  const channelId = getCurrentCurveChannelId();
  const points = fuelEditDraft.fuel_editor.curves[channelId] || [];
  const m = curveCanvasMetrics();
  const { width, height, padLeft, padRight, padTop, padBottom } = m;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const { minTime, maxTime } = timeDomain();

  const toX = (time) => padLeft + ((time - minTime) / (maxTime - minTime)) * plotW;
  const toY = (value) => padTop + ((100 - value) / 100) * plotH;

  for (let i = 0; i < points.length; i += 1) {
    const px = toX(points[i].time);
    const py = toY(points[i].value);
    const dx = px - x;
    const dy = py - y;
    if ((dx * dx + dy * dy) <= 64) {
      return { index: i, channelId };
    }
  }
  return null;
}

function updateCurvePointByPointer(clientX, clientY) {
  if (!curveDragState) {
    return;
  }
  const channelId = curveDragState.channelId;
  const points = fuelEditDraft.fuel_editor.curves[channelId] || [];
  const point = points[curveDragState.index];
  if (!point) {
    return;
  }

  const rect = dom.fuelCurveCanvas.getBoundingClientRect();
  const m = curveCanvasMetrics();
  const { width, height, padTop, padBottom } = m;
  const localY = (clientY - rect.top) * (height / rect.height);

  const plotH = height - padTop - padBottom;
  const y = Math.max(padTop, Math.min(height - padBottom, localY));
  const value = Math.max(0, Math.min(100, Math.round(100 - ((y - padTop) / plotH) * 100)));

  point.value = value;
  fuelDirty = true;

  for (const node of fuelNodes) {
    const v = Math.round(interpolate(points, node.time));
    fuelEditDraft.fuel_editor.node_values[node.key][channelId] = Math.max(0, Math.min(100, v));
  }

  renderFuelTable();
  renderFuelCurve();
}

function setFuelTab(tab) {
  fuelTab = tab === "curve" ? "curve" : "list";
  dom.fuelListPane.classList.toggle("hidden", fuelTab !== "list");
  dom.fuelCurvePane.classList.toggle("hidden", fuelTab !== "curve");
  dom.fuelTabListBtn.classList.toggle("active", fuelTab === "list");
  dom.fuelTabCurveBtn.classList.toggle("active", fuelTab === "curve");
  if (fuelTab === "curve") {
    renderFuelCurve();
  }
}

function getDraftFromModel(modelName) {
  if (!modelName || !modelsCache[modelName]) {
    return null;
  }
  return normalizeDraft(modelsCache[modelName], modelName);
}

function openFuelModal(source) {
  const modelName = dom.modelSelect.value;
  if (!modelName) {
    toast("请先选择型号", "error");
    return;
  }

  if (source === "config" && configDraft) {
    fuelEditDraft = deepClone(configDraft);
    fuelEditSource = "config";
  } else {
    const fromModel = getDraftFromModel(modelName);
    if (!fromModel) {
      toast("当前型号配置不存在", "error");
      return;
    }
    fuelEditDraft = fromModel;
    fuelEditSource = "model";
  }
  fuelEditModelName = modelName;

  ensureFuelStructure(fuelEditDraft);
  syncCurvesFromNodeValues(fuelEditDraft);

  dom.fuelCurveChannelSelect.innerHTML = fuelChannels
    .map((item) => `<option value="${item.id}">${item.label}</option>`)
    .join("");

  renderFuelTable();
  setFuelTab("list");
  dom.fuelModal.classList.remove("hidden");
  fuelDirty = false;
}

function closeFuelModal(force = false) {
  if (!force && fuelDirty) {
    toast("还没保存", "error");
    return false;
  }
  dom.fuelModal.classList.add("hidden");
  curveDragState = null;
  return true;
}

async function saveFuelModal() {
  if (!fuelEditDraft) {
    return;
  }

  if (fuelEditSource === "config" && configDraft) {
    configDraft.fuel_editor = deepClone(fuelEditDraft.fuel_editor);
    dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
    toast("燃料配置已写入当前型号草稿", "success");
    fuelDirty = false;
    closeFuelModal(true);
    return;
  }

  const payload = normalizeDraft(fuelEditDraft, fuelEditModelName);
  payload.name = fuelEditModelName;

  const res = await adminFetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || "保存燃料配置失败", "error");
    return;
  }

  modelsCache[payload.name] = payload;
  toast("燃料配置已保存", "success");
  fuelDirty = false;
  closeFuelModal(true);
}

function openEngineLayoutModal() {
  dom.engineLayoutModal.classList.remove("hidden");
}

function closeEngineLayoutModal() {
  dom.engineLayoutModal.classList.add("hidden");
}

async function updateRecoveryToggle(enabled) {
  const modelName = dom.modelSelect.value;
  if (!modelName || !modelsCache[modelName]) {
    return;
  }

  const draft = normalizeDraft(modelsCache[modelName], modelName);
  draft.rocket_meta.recovery_enabled = enabled;
  if (draft.rocket_meta.recovery_capable === false) {
    draft.rocket_meta.recovery_enabled = false;
  }

  const res = await adminFetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || "更新回收配置失败", "error");
    return;
  }

  modelsCache[modelName] = draft;
  toast(draft.rocket_meta.recovery_enabled ? "已开启回收" : "已关闭回收", "success");
}

function bindEvents() {
  dom.refreshModelsBtn.addEventListener("click", () => {
    fetchModels().catch((error) => toast(error.message, "error"));
  });

  dom.modelSelect.addEventListener("change", () => {
    applySelectedModel(dom.modelSelect.value).catch((error) => toast(error.message, "error"));
  });

  dom.openThemeModalBtn.addEventListener("click", openThemeModal);
  dom.themeBackdrop.addEventListener("click", () => closeThemeModal(true, false));
  dom.cancelThemeBtn.addEventListener("click", () => closeThemeModal(true, true));
  dom.applyThemeBtn.addEventListener("click", () => {
    closeThemeModal(false, true);
    toast("主题已应用", "success");
  });
  dom.saveDefaultThemeBtn.addEventListener("click", () => {
    saveDefaultTheme().catch((error) => toast(error.message, "error"));
  });

  dom.copyVisitorUrlBtn.addEventListener("click", async () => {
    const url = await getVisitorUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast("游客地址已复制", "success");
    } catch {
      toast("复制失败，请手动复制", "error");
    }
  });

  dom.showVisitorQrBtn.addEventListener("click", () => {
    openQrModal().catch((error) => toast(error.message, "error"));
  });
  dom.closeQrBtn.addEventListener("click", closeQrModal);
  dom.qrBackdrop.addEventListener("click", closeQrModal);

  dom.reloadPreviewBtn.addEventListener("click", () => {
    applyTheme(currentThemeId, true);
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
      toast(data.message || "HOLD 操作失败", "error");
      return;
    }
    toast(data.message || (nextHold ? "已进入 HOLD" : "已恢复倒计时"), "success");
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
  dom.closeConfigModalBtn.addEventListener("click", () => closeConfigModal(false));
  dom.configBackdrop.addEventListener("click", () => closeConfigModal(false));
  dom.configTabRawBtn.addEventListener("click", () => setConfigTab("raw"));
  dom.configTabVisualBtn.addEventListener("click", () => setConfigTab("visual"));

  dom.configRawEditor.addEventListener("input", () => {
    configDraftDirty = true;
    const isValid = validateRawDraft();
    if (isValid && configTab === "visual") {
      draftToVisualRows(configDraft);
      renderVisualEditor();
    }
  });

  dom.addVisualItemBtn.addEventListener("click", addVisualItem);

  dom.recoverableConfigToggle.addEventListener("change", () => {
    if (!configDraft) {
      return;
    }
    configDraft.rocket_meta.recovery_capable = Boolean(dom.recoverableConfigToggle.checked);
    if (!configDraft.rocket_meta.recovery_capable) {
      configDraft.rocket_meta.recovery_enabled = false;
    }
    syncRawFromVisual();
  });

  dom.openPropellantProfileBtn.addEventListener("click", openPropellantModal);
  dom.propellantBackdrop.addEventListener("click", () => closePropellantModal(false));
  dom.closePropellantModalBtn.addEventListener("click", () => closePropellantModal(false));
  dom.savePropellantModalBtn.addEventListener("click", savePropellantModal);

  dom.rocketStageCountInput.addEventListener("input", () => {
    propellantDirty = true;
    renderPropellantFields();
  });
  dom.boosterEnabledInput.addEventListener("change", () => {
    propellantDirty = true;
    renderPropellantFields();
  });
  dom.boosterCountInput.addEventListener("input", () => {
    propellantDirty = true;
    renderPropellantFields();
  });

  dom.saveConfigModalBtn.addEventListener("click", () => {
    saveConfigModal().catch((error) => toast(error.message, "error"));
  });

  dom.openFuelEditorBtn.addEventListener("click", () => openFuelModal("model"));
  dom.fuelBackdrop.addEventListener("click", () => closeFuelModal(false));
  dom.closeFuelModalBtn.addEventListener("click", () => closeFuelModal(false));
  dom.saveFuelModalBtn.addEventListener("click", () => {
    saveFuelModal().catch((error) => toast(error.message, "error"));
  });

  dom.fuelTabListBtn.addEventListener("click", () => setFuelTab("list"));
  dom.fuelTabCurveBtn.addEventListener("click", () => setFuelTab("curve"));
  dom.fuelCurveChannelSelect.addEventListener("change", renderFuelCurve);

  dom.fuelCurveCanvas.addEventListener("mousedown", (event) => {
    const rect = dom.fuelCurveCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = findCurvePointAtPosition(x, y);
    if (!hit) {
      return;
    }
    curveDragState = hit;
  });

  window.addEventListener("mousemove", (event) => {
    if (!curveDragState) {
      return;
    }
    updateCurvePointByPointer(event.clientX, event.clientY);
  });

  window.addEventListener("mouseup", () => {
    curveDragState = null;
  });

  dom.openEngineLayoutBtn.addEventListener("click", openEngineLayoutModal);
  dom.engineLayoutBackdrop.addEventListener("click", closeEngineLayoutModal);
  dom.closeEngineLayoutBtn.addEventListener("click", closeEngineLayoutModal);

  dom.recoverToggle.addEventListener("change", () => {
    if (updatingRecoverToggle) {
      return;
    }
    updateRecoveryToggle(Boolean(dom.recoverToggle.checked)).catch((error) => toast(error.message, "error"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (handleEscapeClose()) {
        event.preventDefault();
      }
      return;
    }

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

  window.addEventListener("resize", () => {
    if (!dom.fuelModal.classList.contains("hidden") && fuelTab === "curve") {
      renderFuelCurve();
    }
  });
}

async function init() {
  await loadAdminSettings();
  await fetchModels();

  dom.launchAt.value = dateToInputValue(new Date(Date.now() + 600000));

  bindEvents();

  const channel = new LiveChannel({
    streamUrl: "/api/stream",
    onState: renderState,
    onModeChange: setChannelMode,
  });
  channel.start();

  window.setInterval(tickMissionClock, CLOCK_TICK_MS);
}

init().catch((error) => toast(error.message, "error"));
