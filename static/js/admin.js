const dom = {
  channelMode: document.getElementById("channelMode"),
  currentModel: document.getElementById("currentModel"),
  currentStatus: document.getElementById("currentStatus"),
  missionClock: document.getElementById("missionClock"),
  activeCount: document.getElementById("activeCount"),
  modelSelect: document.getElementById("modelSelect"),
  openConfigEditorBtn: document.getElementById("openConfigEditorBtn"),
  openFuelEditorBtn: document.getElementById("openFuelEditorBtn"),
  openTelemetryEditorBtn: document.getElementById("openTelemetryEditorBtn"),
  openEngineLayoutBtn: document.getElementById("openEngineLayoutBtn"),
  openDashboardEditorBtn: document.getElementById("openDashboardEditorBtn"),
  launchAt: document.getElementById("launchAt"),
  telemetryToggleBtn: document.getElementById("telemetryToggleBtn"),
  telemetryPauseBtn: document.getElementById("telemetryPauseBtn"),
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
  recoverToggleText: document.getElementById("recoverToggleText"),
  recoverSwitchWrap: document.getElementById("recoverSwitchWrap"),
  payloadInput: document.getElementById("payloadInput"),
  ignitionAutoHoldToggle: document.getElementById("ignitionAutoHoldToggle"),
  ignitionAutoHoldText: document.getElementById("ignitionAutoHoldText"),
  ignitionAutoHoldSwitchWrap: document.getElementById("ignitionAutoHoldSwitchWrap"),

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
  recoverableConfigText: document.getElementById("recoverableConfigText"),
  openPropellantProfileBtn: document.getElementById("openPropellantProfileBtn"),

  propellantModal: document.getElementById("propellantModal"),
  propellantBackdrop: document.getElementById("propellantBackdrop"),
  rocketStageCountInput: document.getElementById("rocketStageCountInput"),
  boosterEnabledInput: document.getElementById("boosterEnabledInput"),
  boosterEnabledText: document.getElementById("boosterEnabledText"),
  boosterCountInput: document.getElementById("boosterCountInput"),
  boosterCountWrap: document.getElementById("boosterCountWrap"),
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

  telemetryModal: document.getElementById("telemetryModal"),
  telemetryBackdrop: document.getElementById("telemetryBackdrop"),
  telemetryTabListBtn: document.getElementById("telemetryTabListBtn"),
  telemetryTabAltitudeBtn: document.getElementById("telemetryTabAltitudeBtn"),
  telemetryTabSpeedBtn: document.getElementById("telemetryTabSpeedBtn"),
  telemetryTabAccelBtn: document.getElementById("telemetryTabAccelBtn"),
  telemetryTabAngularBtn: document.getElementById("telemetryTabAngularBtn"),
  telemetryListPane: document.getElementById("telemetryListPane"),
  telemetryCurvePane: document.getElementById("telemetryCurvePane"),
  telemetryTable: document.getElementById("telemetryTable"),
  telemetryCurveCanvas: document.getElementById("telemetryCurveCanvas"),
  telemetryCurveYLabel: document.getElementById("telemetryCurveYLabel"),
  telemetryCurveLegend: document.getElementById("telemetryCurveLegend"),
  telemetrySplitHint: document.getElementById("telemetrySplitHint"),
  closeTelemetryModalBtn: document.getElementById("closeTelemetryModalBtn"),
  saveTelemetryModalBtn: document.getElementById("saveTelemetryModalBtn"),

  engineLayoutModal: document.getElementById("engineLayoutModal"),
  engineLayoutBackdrop: document.getElementById("engineLayoutBackdrop"),
  engineTabListBtn: document.getElementById("engineTabListBtn"),
  engineTabPresetBtn: document.getElementById("engineTabPresetBtn"),
  engineListPane: document.getElementById("engineListPane"),
  enginePresetPane: document.getElementById("enginePresetPane"),
  engineTable: document.getElementById("engineTable"),
  enginePresetItems: document.getElementById("enginePresetItems"),
  engineAllOnBtn: document.getElementById("engineAllOnBtn"),
  engineAllOffBtn: document.getElementById("engineAllOffBtn"),
  engineCurrentNodeLabel: document.getElementById("engineCurrentNodeLabel"),
  engineNodeStageLabel: document.getElementById("engineNodeStageLabel"),
  enginePresetPreview: document.getElementById("enginePresetPreview"),
  engineNodeEditorModal: document.getElementById("engineNodeEditorModal"),
  engineNodeEditorBackdrop: document.getElementById("engineNodeEditorBackdrop"),
  closeEngineNodeEditorBtn: document.getElementById("closeEngineNodeEditorBtn"),
  engineExportSvgBtn: document.getElementById("engineExportSvgBtn"),
  engineBackToListBtn: document.getElementById("engineBackToListBtn"),
  saveEngineNodeConfigBtn: document.getElementById("saveEngineNodeConfigBtn"),
  saveEngineLayoutBtn: document.getElementById("saveEngineLayoutBtn"),
  engineLayoutHint: document.getElementById("engineLayoutHint"),
  closeEngineLayoutBtn: document.getElementById("closeEngineLayoutBtn"),

  unsavedConfirmModal: document.getElementById("unsavedConfirmModal"),
  unsavedConfirmBackdrop: document.getElementById("unsavedConfirmBackdrop"),
  unsavedConfirmTitle: document.getElementById("unsavedConfirmTitle"),
  unsavedConfirmMessage: document.getElementById("unsavedConfirmMessage"),
  unsavedConfirmCancelBtn: document.getElementById("unsavedConfirmCancelBtn"),
  unsavedConfirmDiscardBtn: document.getElementById("unsavedConfirmDiscardBtn"),
  unsavedConfirmSaveBtn: document.getElementById("unsavedConfirmSaveBtn"),
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
let updatingIgnitionAutoHoldToggle = false;
let ignitionAutoHoldToggleSaving = false;
let propellantDirty = false;
let propellantSnapshot = null;
let payloadApplyTimer = null;

let pendingUnsavedCloseAction = null;
let pendingUnsavedCloseBusy = false;

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
      r: Math.max(0, Math.min(255, toInt(matched[1], 0))),
      g: Math.max(0, Math.min(255, toInt(matched[2], 0))),
      b: Math.max(0, Math.min(255, toInt(matched[3], 0))),
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

function setRecoverToggleText(enabled) {
  if (dom.recoverToggleText) {
    dom.recoverToggleText.textContent = enabled ? "回收" : "不回收";
  }
}

function setIgnitionAutoHoldText(enabled) {
  if (dom.ignitionAutoHoldText) {
    dom.ignitionAutoHoldText.textContent = enabled ? "点火自动HOLD" : "点火自动继续";
  }
}

function setRecoverableConfigText(enabled) {
  if (dom.recoverableConfigText) {
    dom.recoverableConfigText.textContent = enabled ? "可回收" : "不可回收";
  }
}

function isModalVisible(element) {
  return Boolean(element) && !element.classList.contains("hidden");
}

function isThemeUnsaved() {
  return themeModalDraftId !== themeModalOriginId;
}

function setUnsavedConfirmBusy(busy) {
  pendingUnsavedCloseBusy = Boolean(busy);
  dom.unsavedConfirmCancelBtn.disabled = pendingUnsavedCloseBusy;
  dom.unsavedConfirmDiscardBtn.disabled = pendingUnsavedCloseBusy;
  dom.unsavedConfirmSaveBtn.disabled = pendingUnsavedCloseBusy;
}

function closeUnsavedConfirmDialog() {
  dom.unsavedConfirmModal.classList.add("hidden");
  pendingUnsavedCloseAction = null;
  setUnsavedConfirmBusy(false);
}

function openUnsavedConfirmDialog(options = {}) {
  const title = String(options.title || "检测到未保存修改").trim() || "检测到未保存修改";
  const message = String(options.message || "当前修改尚未保存，是否先保存再关闭？").trim() || "当前修改尚未保存，是否先保存再关闭？";
  const saveText = String(options.saveText || "保存").trim() || "保存";
  const discardText = String(options.discardText || "不保存").trim() || "不保存";

  pendingUnsavedCloseAction = {
    onSave: typeof options.onSave === "function" ? options.onSave : null,
    onDiscard: typeof options.onDiscard === "function" ? options.onDiscard : null,
  };

  dom.unsavedConfirmTitle.textContent = title;
  dom.unsavedConfirmMessage.textContent = message;
  dom.unsavedConfirmSaveBtn.textContent = saveText;
  dom.unsavedConfirmDiscardBtn.textContent = discardText;
  setUnsavedConfirmBusy(false);
  dom.unsavedConfirmModal.classList.remove("hidden");
}

async function runPendingUnsavedCloseAction(action) {
  if (!pendingUnsavedCloseAction || pendingUnsavedCloseBusy) {
    return;
  }

  if (action === "cancel") {
    closeUnsavedConfirmDialog();
    return;
  }

  const handler = action === "save"
    ? pendingUnsavedCloseAction.onSave
    : pendingUnsavedCloseAction.onDiscard;

  if (typeof handler !== "function") {
    closeUnsavedConfirmDialog();
    return;
  }

  setUnsavedConfirmBusy(true);
  try {
    const result = await handler();
    if (result === true) {
      closeUnsavedConfirmDialog();
      return;
    }
    setUnsavedConfirmBusy(false);
  } catch (error) {
    setUnsavedConfirmBusy(false);
    toast(error?.message || "操作失败", "error");
  }
}

function handleEscapeClose() {
  if (isModalVisible(dom.unsavedConfirmModal)) {
    closeUnsavedConfirmDialog();
    return true;
  }

  if (isModalVisible(dom.engineNodeEditorModal)) {
    if (typeof closeEngineNodeEditor === "function") {
      closeEngineNodeEditor(false);
    } else {
      dom.engineNodeEditorModal.classList.add("hidden");
    }
    return true;
  }

  if (isModalVisible(dom.engineLayoutModal)) {
    closeEngineLayoutModal();
    return true;
  }
  if (isModalVisible(dom.telemetryModal)) {
    closeTelemetryModal(false);
    return true;
  }
  if (isModalVisible(dom.fuelModal)) {
    closeFuelModal(false);
    return true;
  }
  if (isModalVisible(dom.propellantModal)) {
    closePropellantModal(false);
    return true;
  }
  if (isModalVisible(dom.configModal)) {
    closeConfigModal(false);
    return true;
  }
  if (isModalVisible(dom.themeModal)) {
    closeThemeModal(true, false);
    return true;
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

  window.dispatchEvent(new CustomEvent("mission-admin-theme-change", {
    detail: { themeId: currentThemeId },
  }));

  if (refreshPreview && dom.previewFrame) {
    if (window.AdminPreviewController && typeof window.AdminPreviewController.refresh === "function") {
      window.AdminPreviewController.refresh({ themeId: currentThemeId, withCacheBust: true });
    } else {
      dom.previewFrame.src = `/visitor?embed=1&theme=${encodeURIComponent(currentThemeId)}&t=${Date.now()}`;
    }
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
  const items = getSortedThemes();
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
    openUnsavedConfirmDialog({
      title: "主题尚未确认",
      message: "当前主题变更还没确认，是否保存后关闭？",
      onSave: () => {
        closeThemeModal(false, true);
        toast("主题已应用", "success");
        return true;
      },
      onDiscard: () => closeThemeModal(true, true),
    });
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

function normalizeEngineStatesDraft(rawStates, rawActiveIds) {
  const states = [];
  if (Array.isArray(rawStates)) {
    rawStates.forEach((item, index) => {
      states.push({
        id: Math.max(0, toInt(item?.id, index)),
        enabled: Boolean(item?.enabled),
      });
    });
  } else if (Array.isArray(rawActiveIds)) {
    rawActiveIds.forEach((item) => {
      const id = Math.max(0, toInt(item, -1));
      if (id >= 0) {
        states.push({ id, enabled: true });
      }
    });
  }

  const deduped = new Map();
  states.forEach((state) => {
    deduped.set(state.id, { id: state.id, enabled: Boolean(state.enabled) });
  });

  return Array.from(deduped.values()).sort((a, b) => a.id - b.id);
}

function normalizeEngineLayoutDraft(rawEngineLayout, stageCount = 1) {
  const source = rawEngineLayout && typeof rawEngineLayout === "object" ? rawEngineLayout : {};
  const normalizedStageCount = Math.max(1, toInt(stageCount, 1));
  const nodeConfigs = {};
  const sourceNodeConfigs = source.node_configs && typeof source.node_configs === "object"
    ? source.node_configs
    : {};

  const normalizePresetId = (rawId) => String(rawId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "");

  const normalizeStageConfig = (config, fallbackStageIndex = 1) => ({
    stage_index: Math.max(1, toInt(config?.stage_index, fallbackStageIndex)),
    preset_id: normalizePresetId(config?.preset_id),
    engine_states: normalizeEngineStatesDraft(config?.engine_states, config?.active_ids),
  });

  for (const [nodeKey, config] of Object.entries(sourceNodeConfigs)) {
    if (!nodeKey) {
      continue;
    }

    const rawStageConfigs = Array.isArray(config?.stage_configs)
      ? config.stage_configs
      : config?.stage_configs && typeof config.stage_configs === "object"
        ? Object.values(config.stage_configs)
        : [];

    const stageConfigs = rawStageConfigs
      .map((item, index) => normalizeStageConfig(item, index + 1))
      .filter((item) => item.stage_index >= 1)
      .sort((a, b) => a.stage_index - b.stage_index);

    if (stageConfigs.length === 0) {
      stageConfigs.push(normalizeStageConfig(config, 1));
    }

    const stageConfigMap = new Map();
    stageConfigs.forEach((item) => {
      stageConfigMap.set(item.stage_index, {
        stage_index: item.stage_index,
        preset_id: normalizePresetId(item.preset_id),
        engine_states: normalizeEngineStatesDraft(item.engine_states, item.active_ids),
      });
    });

    const fallbackStage = stageConfigMap.get(1) || stageConfigs[0] || normalizeStageConfig(config, 1);
    const finalizedStageConfigs = [];
    for (let stageIndex = 1; stageIndex <= normalizedStageCount; stageIndex += 1) {
      const picked = stageConfigMap.get(stageIndex) || fallbackStage;
      finalizedStageConfigs.push({
        stage_index: stageIndex,
        preset_id: normalizePresetId(picked?.preset_id || fallbackStage?.preset_id),
        engine_states: normalizeEngineStatesDraft(picked?.engine_states, picked?.active_ids),
      });
    }

    const primary = finalizedStageConfigs[0];

    nodeConfigs[nodeKey] = {
      preset_id: primary.preset_id,
      engine_states: primary.engine_states,
      stage_configs: finalizedStageConfigs,
    };
  }

  return {
    version: 4,
    node_configs: nodeConfigs,
  };
}

function normalizeDashboardEditorDraft(rawDashboardEditor) {
  const source = rawDashboardEditor && typeof rawDashboardEditor === "object" ? rawDashboardEditor : {};
  const sourceNodeConfigs = source.node_configs && typeof source.node_configs === "object"
    ? source.node_configs
    : {};

  const nodeConfigs = {};
  for (const [nodeKey, config] of Object.entries(sourceNodeConfigs)) {
    if (!nodeKey || !config || typeof config !== "object") {
      continue;
    }
    const selected = Array.isArray(config.selected)
      ? config.selected
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
      : [];
    if (selected.length <= 0) {
      continue;
    }
    nodeConfigs[nodeKey] = {
      selected: Array.from(new Set(selected)).slice(0, 4),
    };
  }

  return {
    version: 1,
    node_configs: nodeConfigs,
  };
}

function normalizeDraft(payload, selectedModelName) {
  const normalizedName = String(payload?.name || selectedModelName || "未命名型号").trim() || "未命名型号";
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
      hidden: Boolean(item.hidden),
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
      mission_name: String(payload.rocket_meta.mission_name || "").trim(),
      payload: String(payload.rocket_meta.payload || "").trim(),
      recovery_capable: payload.rocket_meta.recovery_capable !== false,
      recovery_enabled: payload.rocket_meta.recovery_capable === false ? false : payload.rocket_meta.recovery_enabled !== false,
      auto_hold_at_ignition: Boolean(payload.rocket_meta.auto_hold_at_ignition),
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
      mission_name: "",
      payload: "",
      recovery_capable: true,
      recovery_enabled: true,
      auto_hold_at_ignition: false,
      stage_count: 1,
      stages: [{ stage_index: 1, fuels: [normalizeFuelSpec({})] }],
      boosters: { enabled: false, count: 0, fuels: [] },
    };

  if (!rocketMeta.recovery_capable) {
    rocketMeta.recovery_enabled = false;
  }

  if (rocketMeta.boosters?.enabled) {
    rocketMeta.boosters.count = Math.max(1, toInt(rocketMeta.boosters.count, 1));
  } else {
    rocketMeta.boosters.count = 0;
    rocketMeta.boosters.fuels = [];
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

  const telemetryEditor = {
    version: 1,
    node_values: payload?.telemetry_editor?.node_values && typeof payload.telemetry_editor.node_values === "object"
      ? deepClone(payload.telemetry_editor.node_values)
      : {},
    curves: payload?.telemetry_editor?.curves && typeof payload.telemetry_editor.curves === "object"
      ? deepClone(payload.telemetry_editor.curves)
      : {},
  };

  return {
    version: 2,
    model_id: String(payload?.model_id || "").trim(),
    name: normalizedName,
    stages: normalizedStages,
    events: normalizedEvents,
    observation_points: normalizedObs,
    rocket_meta: rocketMeta,
    fuel_editor: fuelEditor,
    telemetry_editor: telemetryEditor,
    engine_layout: normalizeEngineLayoutDraft(payload?.engine_layout, rocketMeta.stage_count),
    dashboard_editor: normalizeDashboardEditorDraft(payload?.dashboard_editor),
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

function getSelectedRocketMeta() {
  const selectedModel = String(dom.modelSelect?.value || "").trim();
  if (!selectedModel || !modelsCache[selectedModel] || !modelsCache[selectedModel].rocket_meta) {
    return null;
  }
  return modelsCache[selectedModel].rocket_meta;
}

function renderRocketConfigCard(state) {
  const stateMeta = state?.rocket_meta && typeof state.rocket_meta === "object"
    ? state.rocket_meta
    : null;
  const cacheMeta = getSelectedRocketMeta();
  const meta = cacheMeta || stateMeta;
  if (!meta) {
    updatingRecoverToggle = true;
    dom.recoverToggle.checked = false;
    dom.recoverToggle.disabled = true;
    updatingRecoverToggle = false;
    dom.recoverSwitchWrap.classList.add("dim");
    setRecoverToggleText(false);
    if (dom.payloadInput) {
      dom.payloadInput.disabled = true;
      dom.payloadInput.value = "";
    }
    updatingIgnitionAutoHoldToggle = true;
    if (dom.ignitionAutoHoldToggle) {
      dom.ignitionAutoHoldToggle.checked = false;
      dom.ignitionAutoHoldToggle.disabled = true;
    }
    updatingIgnitionAutoHoldToggle = false;
    if (dom.ignitionAutoHoldSwitchWrap) {
      dom.ignitionAutoHoldSwitchWrap.classList.add("dim");
    }
    setIgnitionAutoHoldText(false);
    return;
  }

  const capable = meta.recovery_capable !== false;
  const enabled = capable ? meta.recovery_enabled !== false : false;
  const autoHoldAtIgnitionEnabled = Boolean(meta.auto_hold_at_ignition);
  updatingRecoverToggle = true;
  dom.recoverToggle.checked = enabled;
  dom.recoverToggle.disabled = !capable;
  updatingRecoverToggle = false;
  dom.recoverSwitchWrap.classList.toggle("dim", !capable);
  setRecoverToggleText(enabled);

  updatingIgnitionAutoHoldToggle = true;
  if (dom.ignitionAutoHoldToggle) {
    dom.ignitionAutoHoldToggle.checked = autoHoldAtIgnitionEnabled;
    dom.ignitionAutoHoldToggle.disabled = ignitionAutoHoldToggleSaving;
  }
  updatingIgnitionAutoHoldToggle = false;
  if (dom.ignitionAutoHoldSwitchWrap) {
    dom.ignitionAutoHoldSwitchWrap.classList.toggle("dim", ignitionAutoHoldToggleSaving);
  }
  setIgnitionAutoHoldText(autoHoldAtIgnitionEnabled);

  if (dom.payloadInput) {
    const payloadText = String(meta.payload || "").trim();
    dom.payloadInput.disabled = false;
    if (document.activeElement !== dom.payloadInput) {
      dom.payloadInput.value = payloadText;
    }
  }
}

function renderTelemetryButtons(state) {
  const telemetryEnabled = Boolean(state.telemetry_enabled);
  const telemetryPaused = Boolean(state.telemetry_paused);

  if (dom.telemetryToggleBtn) {
    dom.telemetryToggleBtn.textContent = telemetryEnabled ? "关闭遥测" : "开启遥测";
    dom.telemetryToggleBtn.classList.toggle("active", telemetryEnabled);
  }

  if (dom.telemetryPauseBtn) {
    dom.telemetryPauseBtn.textContent = telemetryPaused ? "恢复遥测" : "中断遥测";
    dom.telemetryPauseBtn.classList.toggle("active", telemetryPaused);
    dom.telemetryPauseBtn.disabled = !telemetryEnabled;
  }
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

  dom.holdBtn.classList.remove("active");
  dom.holdBtn.classList.toggle("warning", Boolean(state.is_hold));
  dom.holdBtn.textContent = "HOLD";

  renderObservationButtons(state);
  renderRocketConfigCard(state);
  renderTelemetryButtons(state);
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

// 编辑器逻辑已拆分到 static/js/admin-editors.js

function openEngineLayoutModal() {
  if (typeof openEngineLayoutEditorModal === "function") {
    Promise.resolve(openEngineLayoutEditorModal("model"))
      .catch((error) => toast(error?.message || "打开发动机编辑器失败", "error"));
    return;
  }
  dom.engineLayoutModal.classList.remove("hidden");
}

function closeEngineLayoutModal(force = false) {
  if (typeof closeEngineLayoutEditorModal === "function") {
    return closeEngineLayoutEditorModal(force);
  }
  dom.engineLayoutModal.classList.add("hidden");
  return true;
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
  setRecoverToggleText(Boolean(draft.rocket_meta.recovery_enabled));
  toast(draft.rocket_meta.recovery_enabled ? "已开启回收" : "已关闭回收", "success");
}

async function updateIgnitionAutoHoldToggle(enabled) {
  if (ignitionAutoHoldToggleSaving) {
    return;
  }

  const modelName = dom.modelSelect.value;
  if (!modelName || !modelsCache[modelName]) {
    return;
  }

  const nextEnabled = Boolean(enabled);
  const currentEnabled = Boolean(modelsCache[modelName]?.rocket_meta?.auto_hold_at_ignition);
  if (nextEnabled === currentEnabled) {
    setIgnitionAutoHoldText(nextEnabled);
    return;
  }

  ignitionAutoHoldToggleSaving = true;
  renderRocketConfigCard(lastState || {});

  const draft = normalizeDraft(modelsCache[modelName], modelName);
  draft.rocket_meta.auto_hold_at_ignition = nextEnabled;

  try {
    const res = await adminFetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "更新点火自动 HOLD 配置失败");
    }

    modelsCache[modelName] = draft;
    if (lastState && lastState.current_model === modelName) {
      lastState = {
        ...lastState,
        rocket_meta: {
          ...(lastState.rocket_meta || {}),
          auto_hold_at_ignition: nextEnabled,
        },
      };
    }

    updatingIgnitionAutoHoldToggle = true;
    if (dom.ignitionAutoHoldToggle) {
      dom.ignitionAutoHoldToggle.checked = nextEnabled;
    }
    updatingIgnitionAutoHoldToggle = false;
    setIgnitionAutoHoldText(nextEnabled);
    toast(nextEnabled ? "已开启点火自动 HOLD" : "已关闭点火自动 HOLD", "success");
  } finally {
    ignitionAutoHoldToggleSaving = false;
    renderRocketConfigCard(lastState || {});
  }
}

async function updatePayloadValue(modelName, rawValue, silent = false) {
  if (!modelName || !modelsCache[modelName]) {
    return;
  }

  const nextPayload = String(rawValue || "").trim();
  const currentPayload = String(modelsCache[modelName]?.rocket_meta?.payload || "").trim();
  if (nextPayload === currentPayload) {
    return;
  }

  const draft = normalizeDraft(modelsCache[modelName], modelName);
  draft.rocket_meta.payload = nextPayload;

  const res = await adminFetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "更新载荷失败");
  }

  modelsCache[modelName] = draft;
  if (!silent) {
    toast("载荷已更新", "success");
  }
}

function schedulePayloadSave() {
  if (!dom.payloadInput) {
    return;
  }
  const modelName = dom.modelSelect.value;
  const nextValue = dom.payloadInput.value;
  if (payloadApplyTimer) {
    clearTimeout(payloadApplyTimer);
  }
  payloadApplyTimer = setTimeout(() => {
    payloadApplyTimer = null;
    updatePayloadValue(modelName, nextValue, true).catch((error) => toast(error.message, "error"));
  }, 420);
}

function flushPayloadSave(silent = false) {
  if (!dom.payloadInput) {
    return;
  }
  const modelName = dom.modelSelect.value;
  const nextValue = dom.payloadInput.value;
  if (payloadApplyTimer) {
    clearTimeout(payloadApplyTimer);
    payloadApplyTimer = null;
  }
  updatePayloadValue(modelName, nextValue, silent).catch((error) => toast(error.message, "error"));
}

function bindEvents() {
  dom.modelSelect.addEventListener("change", () => {
    applySelectedModel(dom.modelSelect.value).catch((error) => toast(error.message, "error"));
  });

  dom.openThemeModalBtn.addEventListener("click", openThemeModal);
  dom.themeBackdrop.addEventListener("click", () => closeThemeModal(true, false));
  dom.cancelThemeBtn.addEventListener("click", () => closeThemeModal(true, false));
  dom.applyThemeBtn.addEventListener("click", () => {
    closeThemeModal(false, true);
    toast("主题已应用", "success");
  });
  dom.saveDefaultThemeBtn.addEventListener("click", () => {
    saveDefaultTheme().catch((error) => toast(error.message, "error"));
  });

  if (dom.copyVisitorUrlBtn) {
    dom.copyVisitorUrlBtn.addEventListener("click", async () => {
      const url = await getVisitorUrl();
      try {
        await navigator.clipboard.writeText(url);
        toast("游客地址已复制", "success");
      } catch {
        toast("复制失败，请手动复制", "error");
      }
    });
  }

  if (dom.showVisitorQrBtn) {
    dom.showVisitorQrBtn.addEventListener("click", () => {
      openQrModal().catch((error) => toast(error.message, "error"));
    });
  }

  dom.unsavedConfirmBackdrop.addEventListener("click", closeUnsavedConfirmDialog);
  dom.unsavedConfirmCancelBtn.addEventListener("click", () => runPendingUnsavedCloseAction("cancel"));
  dom.unsavedConfirmDiscardBtn.addEventListener("click", () => {
    runPendingUnsavedCloseAction("discard").catch((error) => toast(error.message, "error"));
  });
  dom.unsavedConfirmSaveBtn.addEventListener("click", () => {
    runPendingUnsavedCloseAction("save").catch((error) => toast(error.message, "error"));
  });

  if (dom.closeQrBtn) {
    dom.closeQrBtn.addEventListener("click", closeQrModal);
  }
  if (dom.qrBackdrop) {
    dom.qrBackdrop.addEventListener("click", closeQrModal);
  }

  if (dom.reloadPreviewBtn) {
    dom.reloadPreviewBtn.addEventListener("click", () => {
      applyTheme(currentThemeId, true);
    });
  }

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

  if (dom.telemetryToggleBtn) {
    dom.telemetryToggleBtn.addEventListener("click", async () => {
      const nextEnabled = !Boolean(lastState?.telemetry_enabled);
      dom.telemetryToggleBtn.disabled = true;
      if (dom.telemetryPauseBtn) {
        dom.telemetryPauseBtn.disabled = true;
      }
      try {
        const res = await adminFetch("/api/telemetry/enable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: nextEnabled }),
        });
        const data = await res.json();
        if (!data.success) {
          renderTelemetryButtons(lastState || {});
          toast(data.message || "遥测开关失败", "error");
          return;
        }
        lastState = {
          ...(lastState || {}),
          telemetry_enabled: Boolean(data.telemetry_enabled),
          telemetry_paused: Boolean(data.telemetry_paused),
          telemetry_pause_mission_ms: Number(data.telemetry_pause_mission_ms || 0),
        };
        renderTelemetryButtons(lastState);
        toast(data.message || (nextEnabled ? "仪表盘已显示" : "仪表盘已隐藏"), "success");
      } finally {
        if (dom.telemetryToggleBtn) {
          dom.telemetryToggleBtn.disabled = false;
        }
      }
    });
  }

  if (dom.telemetryPauseBtn) {
    dom.telemetryPauseBtn.addEventListener("click", async () => {
      const nextPaused = !Boolean(lastState?.telemetry_paused);
      dom.telemetryPauseBtn.disabled = true;
      if (dom.telemetryToggleBtn) {
        dom.telemetryToggleBtn.disabled = true;
      }
      try {
        const res = await adminFetch("/api/telemetry/pause", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paused: nextPaused }),
        });
        const data = await res.json();
        if (!data.success) {
          renderTelemetryButtons(lastState || {});
          toast(data.message || "遥测中断失败", "error");
          return;
        }
        lastState = {
          ...(lastState || {}),
          telemetry_enabled: Boolean(data.telemetry_enabled),
          telemetry_paused: Boolean(data.telemetry_paused),
          telemetry_pause_mission_ms: Number(data.telemetry_pause_mission_ms || 0),
        };
        renderTelemetryButtons(lastState);
        toast(data.message || (nextPaused ? "已中断遥测" : "已恢复遥测"), "success");
      } finally {
        if (dom.telemetryToggleBtn) {
          dom.telemetryToggleBtn.disabled = false;
        }
        if (dom.telemetryPauseBtn) {
          dom.telemetryPauseBtn.disabled = !Boolean(lastState?.telemetry_enabled);
        }
      }
    });
  }

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
    setRecoverableConfigText(Boolean(dom.recoverableConfigToggle.checked));
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
    if (!configDraft) {
      return;
    }
    ensureRocketMeta();
    configDraft.rocket_meta.stage_count = Math.max(1, toInt(dom.rocketStageCountInput.value, 1));
    propellantDirty = true;
    renderPropellantFields();
  });
  dom.boosterEnabledInput.addEventListener("change", () => {
    if (!configDraft) {
      return;
    }
    ensureRocketMeta();
    if (!configDraft.rocket_meta.boosters || typeof configDraft.rocket_meta.boosters !== "object") {
      configDraft.rocket_meta.boosters = { enabled: false, count: 0, fuels: [] };
    }
    configDraft.rocket_meta.boosters.enabled = Boolean(dom.boosterEnabledInput.checked);
    if (!configDraft.rocket_meta.boosters.enabled) {
      configDraft.rocket_meta.boosters.count = 0;
      configDraft.rocket_meta.boosters.fuels = [];
      dom.boosterCountInput.min = "0";
    } else {
      configDraft.rocket_meta.boosters.count = Math.max(1, toInt(configDraft.rocket_meta.boosters.count, 1));
      dom.boosterCountInput.min = "1";
    }
    propellantDirty = true;
    renderPropellantFields();
  });
  dom.boosterCountInput.addEventListener("input", () => {
    if (!configDraft) {
      return;
    }
    ensureRocketMeta();
    if (!configDraft.rocket_meta.boosters || typeof configDraft.rocket_meta.boosters !== "object") {
      configDraft.rocket_meta.boosters = { enabled: false, count: 0, fuels: [] };
    }
    const minBoosterCount = configDraft.rocket_meta.boosters.enabled ? 1 : 0;
    configDraft.rocket_meta.boosters.count = Math.max(minBoosterCount, toInt(dom.boosterCountInput.value, minBoosterCount));
    dom.boosterCountInput.value = String(configDraft.rocket_meta.boosters.count);
    propellantDirty = true;
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
  dom.fuelCurveCanvas.addEventListener("mousemove", (event) => {
    updateFuelCurveHoverByPointer(event.clientX, event.clientY);
  });
  dom.fuelCurveCanvas.addEventListener("mouseleave", () => {
    clearFuelCurveHover();
  });
  dom.fuelCurveCanvas.addEventListener("wheel", (event) => {
    if (typeof handleFuelCurveWheelZoom === "function") {
      handleFuelCurveWheelZoom(event);
    }
  }, { passive: false });

  if (dom.openTelemetryEditorBtn) {
    dom.openTelemetryEditorBtn.addEventListener("click", () => openTelemetryModal("model"));
  }
  if (dom.telemetryBackdrop) {
    dom.telemetryBackdrop.addEventListener("click", () => closeTelemetryModal(false));
  }
  if (dom.closeTelemetryModalBtn) {
    dom.closeTelemetryModalBtn.addEventListener("click", () => closeTelemetryModal(false));
  }
  if (dom.saveTelemetryModalBtn) {
    dom.saveTelemetryModalBtn.addEventListener("click", () => {
      saveTelemetryModal().catch((error) => toast(error.message, "error"));
    });
  }
  if (dom.telemetryTabListBtn) {
    dom.telemetryTabListBtn.addEventListener("click", () => setTelemetryTab("list"));
  }
  if (dom.telemetryTabAltitudeBtn) {
    dom.telemetryTabAltitudeBtn.addEventListener("click", () => setTelemetryTab("altitude"));
  }
  if (dom.telemetryTabSpeedBtn) {
    dom.telemetryTabSpeedBtn.addEventListener("click", () => setTelemetryTab("speed"));
  }
  if (dom.telemetryTabAccelBtn) {
    dom.telemetryTabAccelBtn.addEventListener("click", () => setTelemetryTab("accel"));
  }
  if (dom.telemetryTabAngularBtn) {
    dom.telemetryTabAngularBtn.addEventListener("click", () => setTelemetryTab("angular"));
  }
  if (dom.telemetryCurveCanvas) {
    dom.telemetryCurveCanvas.addEventListener("mousedown", (event) => {
      const rect = dom.telemetryCurveCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = findTelemetryCurvePointAtPosition(x, y);
      if (!hit) {
        return;
      }
      telemetryDragState = hit;
    });
    dom.telemetryCurveCanvas.addEventListener("mousemove", (event) => {
      updateTelemetryCurveHoverByPointer(event.clientX, event.clientY);
    });
    dom.telemetryCurveCanvas.addEventListener("mouseleave", () => {
      clearTelemetryCurveHover();
    });
    dom.telemetryCurveCanvas.addEventListener("wheel", (event) => {
      if (typeof handleTelemetryCurveWheelZoom === "function") {
        handleTelemetryCurveWheelZoom(event);
      }
    }, { passive: false });
  }

  window.addEventListener("mousemove", (event) => {
    if (!curveDragState) {
      updateTelemetryCurvePointByPointer(event.clientX, event.clientY);
      return;
    }
    updateCurvePointByPointer(event.clientX, event.clientY);
    updateTelemetryCurvePointByPointer(event.clientX, event.clientY);
  });

  window.addEventListener("mouseup", () => {
    curveDragState = null;
    telemetryDragState = null;
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

  if (dom.ignitionAutoHoldToggle) {
    dom.ignitionAutoHoldToggle.addEventListener("change", () => {
      if (updatingIgnitionAutoHoldToggle) {
        return;
      }
      updateIgnitionAutoHoldToggle(Boolean(dom.ignitionAutoHoldToggle.checked))
        .catch((error) => {
          toast(error.message, "error");
          renderRocketConfigCard(lastState || {});
        });
    });
  }

  if (dom.payloadInput) {
    dom.payloadInput.addEventListener("input", schedulePayloadSave);
    dom.payloadInput.addEventListener("change", () => flushPayloadSave(false));
    dom.payloadInput.addEventListener("blur", () => flushPayloadSave(true));
  }

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
    if (!dom.telemetryModal.classList.contains("hidden") && telemetryTab !== "list") {
      renderTelemetryCurve();
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
