const TELEMETRY_METRIC_DEFS = [
  { key: "altitude_km", label: "高度 (km)", shortLabel: "高度", defaultValue: 0 },
  { key: "speed_mps", label: "速度 (km/h)", shortLabel: "速度", defaultValue: 0 },
  { key: "accel_g", label: "加速度 (g)", shortLabel: "加速度", defaultValue: 0 },
  { key: "angular_velocity_dps", label: "欧拉角 (deg)", shortLabel: "欧拉角", defaultValue: 0 },
];

const TELEMETRY_EULER_METRIC_KEY = "angular_velocity_dps";
const TELEMETRY_EULER_AXES = ["roll", "pitch", "yaw"];
const TELEMETRY_EULER_AXIS_LABEL = {
  roll: "roll",
  pitch: "pitch",
  yaw: "yaw",
};
const TELEMETRY_EULER_AXIS_CURVE_KEY = {
  roll: "euler_roll_deg",
  pitch: "euler_pitch_deg",
  yaw: "euler_yaw_deg",
};
const TELEMETRY_EULER_AXIS_COLORS = {
  roll: "#4fd2ff",
  pitch: "#ffba6e",
  yaw: "#8ef07a",
};
const TELEMETRY_EULER_AXIS_ACTIVE_COLORS = {
  roll: "#ffe07e",
  pitch: "#fff4a8",
  yaw: "#d5ff8f",
};

let telemetryEditDraft = null;
let telemetryEditSource = "";
let telemetryEditModelName = "";
let telemetryNodes = [];
let telemetryTab = "list";
let telemetryDirty = false;
let telemetryDragState = null;
let fuelCurveHoverState = null;
let telemetryCurveHoverState = null;
let telemetrySplitMode = {
  enabled: false,
  separationTime: Number.POSITIVE_INFINITY,
  separationName: "",
};

const VISUAL_SORT_IDLE_MS = 3000;

let configDraftSnapshot = "";
let configRawSnapshotText = "";
let visualSortPending = false;
let visualFocusedInputCount = 0;
let visualIdleSortTimer = null;

let fuelSnapshot = "";
let telemetrySnapshot = "";
let engineLayoutSnapshot = "";

let fuelCurveZoomRange = null;
let telemetryCurveZoomRange = null;
let fuelCurvePanState = null;
let telemetryCurvePanState = null;

function toFloat(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatFloat(value) {
  const normalized = Math.round(toFloat(value, 0) * 1000) / 1000;
  if (Number.isInteger(normalized)) {
    return String(normalized);
  }
  return String(normalized);
}

function formatSignedTime(value) {
  const time = toFloat(value, 0);
  if (!Number.isFinite(time)) {
    return "T+0";
  }
  const rounded = Math.round(time * 100) / 100;
  return `T${rounded >= 0 ? "+" : ""}${formatFloat(rounded)}`;
}

function shortenLabel(label, maxLength = 12) {
  const text = String(label || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function normalizeCurvePoints(points) {
  return (Array.isArray(points) ? points : [])
    .filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x)
    .reduce((acc, point) => {
      if (acc.length > 0 && Math.abs(acc[acc.length - 1].x - point.x) < 1e-6) {
        acc[acc.length - 1] = { x: point.x, y: point.y };
      } else {
        acc.push({ x: point.x, y: point.y });
      }
      return acc;
    }, []);
}

function evaluateSmoothValueAtX(points, x) {
  const series = normalizeCurvePoints(points);
  if (series.length === 0) {
    return 0;
  }
  if (series.length === 1) {
    return series[0].y;
  }
  if (x <= series[0].x) {
    return series[0].y;
  }
  if (x >= series[series.length - 1].x) {
    return series[series.length - 1].y;
  }

  const count = series.length;
  const h = new Array(count - 1);
  const delta = new Array(count - 1);
  const tangents = new Array(count).fill(0);

  for (let i = 0; i < count - 1; i += 1) {
    h[i] = series[i + 1].x - series[i].x;
    if (h[i] <= 0) {
      return series[i].y;
    }
    delta[i] = (series[i + 1].y - series[i].y) / h[i];
  }

  tangents[0] = delta[0];
  tangents[count - 1] = delta[count - 2];

  for (let i = 1; i < count - 1; i += 1) {
    if (delta[i - 1] === 0 || delta[i] === 0 || delta[i - 1] * delta[i] < 0) {
      tangents[i] = 0;
      continue;
    }

    const w1 = 2 * h[i] + h[i - 1];
    const w2 = h[i] + 2 * h[i - 1];
    tangents[i] = (w1 + w2) / ((w1 / delta[i - 1]) + (w2 / delta[i]));
  }

  let segmentIndex = 0;
  while (segmentIndex < count - 2 && x > series[segmentIndex + 1].x) {
    segmentIndex += 1;
  }

  const left = series[segmentIndex];
  const right = series[segmentIndex + 1];
  const segmentWidth = right.x - left.x || 1;
  const t = (x - left.x) / segmentWidth;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  const value = h00 * left.y + h10 * segmentWidth * tangents[segmentIndex] + h01 * right.y + h11 * segmentWidth * tangents[segmentIndex + 1];
  const minSegmentValue = Math.min(left.y, right.y);
  const maxSegmentValue = Math.max(left.y, right.y);
  return Math.max(minSegmentValue, Math.min(maxSegmentValue, value));
}

function stableSerialize(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "";
  }
}

function makeConfigDraftSignature(draft = configDraft) {
  if (!draft) {
    return "";
  }
  const selectedName = dom.modelSelect?.value || draft?.name || "";
  return stableSerialize(normalizeDraft(draft, selectedName));
}

function refreshConfigDirtyState() {
  configDraftDirty = makeConfigDraftSignature(configDraft) !== configDraftSnapshot;
}

function hasConfigUnsavedChanges() {
  const rawText = String(dom.configRawEditor?.value || "");
  if (rawText !== configRawSnapshotText) {
    try {
      const selectedName = dom.modelSelect?.value || configDraft?.name || "";
      const normalized = normalizeDraft(JSON.parse(rawText || "{}"), selectedName);
      return stableSerialize(normalized) !== configDraftSnapshot;
    } catch {
      return true;
    }
  }

  return makeConfigDraftSignature(configDraft) !== configDraftSnapshot;
}

function makeRocketMetaSignature(rawMeta = configDraft?.rocket_meta) {
  const meta = rawMeta && typeof rawMeta === "object" ? rawMeta : {};
  return stableSerialize(meta);
}

function hasPropellantUnsavedChanges() {
  return makeRocketMetaSignature(configDraft?.rocket_meta) !== makeRocketMetaSignature(propellantSnapshot);
}

function makeFuelSignature(draft = fuelEditDraft) {
  return stableSerialize(draft?.fuel_editor && typeof draft.fuel_editor === "object" ? draft.fuel_editor : {});
}

function makeTelemetrySignature(draft = telemetryEditDraft) {
  return stableSerialize(draft?.telemetry_editor && typeof draft.telemetry_editor === "object" ? draft.telemetry_editor : {});
}

function makeEngineLayoutSignature(draft = engineEditDraft) {
  return stableSerialize(draft?.engine_layout && typeof draft.engine_layout === "object" ? draft.engine_layout : {});
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
  if (!Array.isArray(normalized.stages) || !Array.isArray(normalized.events)) {
    configDraftValid = false;
    dom.saveConfigModalBtn.disabled = true;
    showConfigValidation("配置必须包含 stages/events 数组。", true);
    return false;
  }

  configDraft = normalized;
  configDraftValid = true;
  refreshConfigDirtyState();
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

function applyVisualSortNow(withAnimation = true) {
  if (!Array.isArray(visualRows) || visualRows.length <= 1) {
    visualSortPending = false;
    return;
  }

  const oldOrder = new Map();
  visualRows.forEach((row, index) => {
    const rowKey = String(row?.rowKey || `${row?.kind || "row"}_${row?.id || ""}_${index}`);
    oldOrder.set(rowKey, index);
  });

  sortVisualRows();
  visualSortPending = false;

  if (!withAnimation) {
    renderVisualEditor();
    return;
  }

  const moveMap = new Map();
  visualRows.forEach((row, newIndex) => {
    const rowKey = String(row?.rowKey || `${row?.kind || "row"}_${row?.id || ""}_${newIndex}`);
    const oldIndex = oldOrder.get(rowKey);
    if (typeof oldIndex !== "number" || oldIndex === newIndex) {
      return;
    }
    moveMap.set(rowKey, oldIndex < newIndex ? "down" : "up");
  });

  renderVisualEditor(moveMap);
}

function queueVisualSortAfterIdle() {
  visualSortPending = true;
  if (visualIdleSortTimer) {
    clearTimeout(visualIdleSortTimer);
  }

  visualIdleSortTimer = setTimeout(() => {
    visualIdleSortTimer = null;
    if (visualFocusedInputCount > 0) {
      queueVisualSortAfterIdle();
      return;
    }
    applyVisualSortNow(true);
  }, VISUAL_SORT_IDLE_MS);
}

function registerVisualInputFocus() {
  visualFocusedInputCount += 1;
  if (visualIdleSortTimer) {
    clearTimeout(visualIdleSortTimer);
    visualIdleSortTimer = null;
  }
}

function registerVisualInputBlur() {
  visualFocusedInputCount = Math.max(0, visualFocusedInputCount - 1);
  if (visualFocusedInputCount === 0 && visualSortPending) {
    queueVisualSortAfterIdle();
  }
}

function isVisualEventRow(row) {
  return row?.kind === "event";
}

function normalizeVisualEventFlags(row) {
  if (!row || typeof row !== "object") {
    return;
  }
  row.isObservation = isVisualEventRow(row) ? Boolean(row.isObservation) : false;
  row.isHidden = isVisualEventRow(row) ? Boolean(row.hidden || row.isHidden) : false;
}

function buildVisualEventRow(seed = {}, fallbackIndex = 0) {
  const row = {
    rowKey: `${String(seed?.id || `evt_${fallbackIndex + 1}`)}_${Date.now()}_${fallbackIndex}`,
    kind: "event",
    id: String(seed?.id || `evt_${Date.now()}`).trim(),
    name: String(seed?.name || ""),
    start_time: 0,
    end_time: 0,
    time: toInt(seed?.time, 0),
    description: String(seed?.description || ""),
    isObservation: Boolean(seed?.observation),
    hidden: Boolean(seed?.hidden),
    isHidden: Boolean(seed?.hidden),
  };
  normalizeVisualEventFlags(row);
  return row;
}

function mergeObservationRowsIntoEvents(rows, observations = []) {
  const eventRows = rows.filter((row) => row?.kind === "event");
  observations.forEach((obs, index) => {
    const obsId = String(obs?.id || "").trim();
    const obsName = String(obs?.name || "").trim();
    const obsTime = parseObservationTime(obs);

    let matched = null;
    if (obsId) {
      matched = eventRows.find((row) => String(row?.id || "").trim() === obsId) || null;
    }

    if (!matched && obsName) {
      matched = eventRows.find((row) => String(row?.name || "").trim() === obsName && toInt(row?.time, 0) === obsTime) || null;
    }

    if (matched) {
      matched.isObservation = true;
      matched.isHidden = false;
      normalizeVisualEventFlags(matched);
      return;
    }
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
      isObservation: false,
      isHidden: false,
    });
  }

  (draft.events || []).forEach((evt, index) => {
    rows.push(buildVisualEventRow(evt, index));
  });

  visualRows = rows;
  sortVisualRows();
}

function visualRowsToDraft() {
  const selectedName = dom.modelSelect.value;
  const draft = {
    version: 3,
    name: selectedName,
    stages: [],
    events: [],
    rocket_meta: deepClone(configDraft.rocket_meta || {}),
    rocket_meta: deepClone(configDraft.rocket_meta || {}),
    fuel_editor: deepClone(configDraft.fuel_editor || { version: 1, node_values: {}, curves: {} }),
    telemetry_editor: deepClone(configDraft.telemetry_editor || { version: 1, node_values: {}, curves: {} }),
    engine_layout: deepClone(configDraft.engine_layout || { version: 3, node_configs: {} }),
    dashboard_editor: deepClone(configDraft.dashboard_editor || { version: 1, node_configs: {} }),
  };

  for (const row of visualRows) {
    normalizeVisualEventFlags(row);

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

    if (!isVisualEventRow(row)) {
      continue;
    }

    const time = toInt(row.time, 0);
    const isHidden = Boolean(row.isHidden);
    const eventId = String(row.id || "").trim() || `evt_${Date.now()}`;
    const eventName = String(row.name || "未命名事件");
    const eventDescription = String(row.description || "");

    draft.events.push({
      id: eventId,
      name: eventName,
      time,
      hidden: isHidden,
      observation: Boolean(row.isObservation),
      description: eventDescription,
    });
  }

  draft.stages.sort((a, b) => a.start_time - b.start_time);
  draft.events.sort((a, b) => a.time - b.time);

  return normalizeDraft(draft, selectedName);
}

function syncRawFromVisual() {
  configDraft = visualRowsToDraft();
  configDraftValid = true;
  refreshConfigDirtyState();
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
  queueVisualSortAfterIdle();
}

const TYPE_ICON_BY_KIND = {
  stage: "stage.svg",
  event: "event.svg",
  observation: "observe.svg",
};

function makeTypeButton(currentRow, kind, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "type-btn";
  btn.title = label;
  btn.setAttribute("aria-label", label);

  const icon = document.createElement("span");
  icon.className = "icon-mask";
  icon.setAttribute("aria-hidden", "true");
  const iconName = TYPE_ICON_BY_KIND[kind] || "stage.svg";
  icon.style.setProperty("--icon-url", `url('/assets/${iconName}')`);
  btn.appendChild(icon);

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
      currentRow.isObservation = false;
      currentRow.isHidden = false;
    } else {
      currentRow.time = pivot;
      currentRow.start_time = 0;
      currentRow.end_time = 0;
      currentRow.isObservation = Boolean(currentRow.isObservation);
      currentRow.isHidden = Boolean(currentRow.isHidden);
      if (currentRow.isObservation && currentRow.isHidden) {
        currentRow.isHidden = false;
      }
    }
    normalizeVisualEventFlags(currentRow);
    syncRawFromVisual();
    renderVisualEditor();
    scheduleVisualSortRerender();
  });
  return btn;
}

function makeVisualFlagButton(row, flagKey, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "visual-flag-btn";
  btn.title = label;
  btn.setAttribute("aria-label", label);

  const icon = document.createElement("span");
  icon.className = "icon-mask";
  icon.setAttribute("aria-hidden", "true");
  const iconSrc = flagKey === "observation" ? "/assets/observe.svg" : "/assets/hidden.svg";
  icon.style.setProperty("--icon-url", `url('${iconSrc}')`);
  btn.appendChild(icon);

  const canToggle = isVisualEventRow(row);
  if (!canToggle) {
    btn.disabled = true;
    return btn;
  }

  const active = flagKey === "observation"
      ? Boolean(row.isObservation)
      : Boolean(row.isHidden);
  btn.classList.toggle("active", active);

  btn.addEventListener("click", () => {
    pushVisualUndo();
    if (flagKey === "observation") {
      row.isObservation = !Boolean(row.isObservation);
    } else {
      row.isHidden = !Boolean(row.isHidden);
    }
    normalizeVisualEventFlags(row);
    syncRawFromVisual();
    renderVisualEditor();
  });

  return btn;
}

function renderVisualRow(row, index, moveMap = null) {
  normalizeVisualEventFlags(row);

  const line = document.createElement("div");
  line.className = "visual-row";
  const rowKey = String(row?.rowKey || `${row?.kind || "row"}_${row?.id || ""}_${index}`);
  if (!row.rowKey) {
    row.rowKey = rowKey;
  }

  const moveDirection = moveMap instanceof Map ? moveMap.get(rowKey) : "";
  if (moveDirection === "up") {
    line.classList.add("visual-row-move-up");
  } else if (moveDirection === "down") {
    line.classList.add("visual-row-move-down");
  }

  const typeCell = document.createElement("div");
  typeCell.className = "type-switch";
  typeCell.appendChild(makeTypeButton(row, "stage", "阶段"));
  typeCell.appendChild(makeTypeButton(row, "event", "事件"));
  line.appendChild(typeCell);

  const observationCell = document.createElement("div");
  observationCell.className = "visual-flag-cell";
  observationCell.appendChild(makeVisualFlagButton(row, "observation", "标记为观察点（仅事件）"));
  line.appendChild(observationCell);

  const hiddenCell = document.createElement("div");
  hiddenCell.className = "visual-flag-cell";
  hiddenCell.appendChild(makeVisualFlagButton(row, "hidden", "标记为隐藏事件（仅事件）"));
  line.appendChild(hiddenCell);

  const nameInput = document.createElement("input");
  nameInput.className = "row-input";
  nameInput.value = row.name || "";
  nameInput.placeholder = "名称";
  nameInput.addEventListener("focus", () => {
    pushVisualUndo();
    registerVisualInputFocus();
  });
  nameInput.addEventListener("blur", registerVisualInputBlur);
  nameInput.addEventListener("input", () => {
    row.name = nameInput.value;
    syncRawFromVisual();
  });
  const timeWrap = document.createElement("div");
  timeWrap.className = `cell-time ${row.kind === "stage" ? "dual" : "single"}`;

  if (row.kind === "stage") {
    const startInput = document.createElement("input");
    startInput.type = "number";
    startInput.className = "row-time";
    startInput.value = String(toInt(row.start_time, 0));
    startInput.placeholder = "开始";
    startInput.addEventListener("focus", () => {
      pushVisualUndo();
      registerVisualInputFocus();
    });
    startInput.addEventListener("blur", registerVisualInputBlur);
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
    endInput.addEventListener("focus", () => {
      pushVisualUndo();
      registerVisualInputFocus();
    });
    endInput.addEventListener("blur", registerVisualInputBlur);
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
    timeInput.placeholder = "时间";
    timeInput.addEventListener("focus", () => {
      pushVisualUndo();
      registerVisualInputFocus();
    });
    timeInput.addEventListener("blur", registerVisualInputBlur);
    timeInput.addEventListener("input", () => {
      row.time = toInt(timeInput.value, 0);
      syncRawFromVisual();
      scheduleVisualSortRerender();
    });
    timeWrap.appendChild(timeInput);
  }

  line.appendChild(nameInput);
  line.appendChild(timeWrap);

  const descInput = document.createElement("input");
  descInput.className = "row-desc";
  descInput.value = row.description || "";
  descInput.placeholder = "介绍";
  descInput.addEventListener("focus", () => {
    pushVisualUndo();
    registerVisualInputFocus();
  });
  descInput.addEventListener("blur", registerVisualInputBlur);
  descInput.addEventListener("input", () => {
    row.description = descInput.value;
    syncRawFromVisual();
  });
  line.appendChild(descInput);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn row-delete";
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

function renderVisualEditor(moveMap = null) {
  if (!configDraft) {
    return;
  }

  dom.visualList.innerHTML = "";
  visualRows.forEach((row, index) => {
    dom.visualList.appendChild(renderVisualRow(row, index, moveMap));
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
    return;
  }

  visualSortPending = false;
  visualFocusedInputCount = 0;
  if (visualIdleSortTimer) {
    clearTimeout(visualIdleSortTimer);
    visualIdleSortTimer = null;
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
  visualSortPending = false;
  visualFocusedInputCount = 0;
  if (visualIdleSortTimer) {
    clearTimeout(visualIdleSortTimer);
    visualIdleSortTimer = null;
  }
  dom.configModalTitle.textContent = `型号配置编辑 · ${modelName}`;
  dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
  dom.recoverableConfigToggle.checked = configDraft.rocket_meta.recovery_capable !== false;
  setRecoverableConfigText(dom.recoverableConfigToggle.checked);
  validateRawDraft();
  setConfigTab("visual");
  configDraftSnapshot = makeConfigDraftSignature(configDraft);
  configRawSnapshotText = String(dom.configRawEditor.value || "");
  refreshConfigDirtyState();
  dom.configModal.classList.remove("hidden");
}

function closeConfigModal(force = false) {
  if (!force && hasConfigUnsavedChanges()) {
    openUnsavedConfirmDialog({
      title: "配置尚未保存",
      message: "当前型号配置有未保存修改，是否保存后关闭？",
      onSave: () => saveConfigModal(),
      onDiscard: () => {
        refreshConfigDirtyState();
        dom.configModal.classList.add("hidden");
        return true;
      },
    });
    return false;
  }

  visualSortPending = false;
  visualFocusedInputCount = 0;
  if (visualIdleSortTimer) {
    clearTimeout(visualIdleSortTimer);
    visualIdleSortTimer = null;
  }
  dom.configModal.classList.add("hidden");
  return true;
}

async function saveConfigModal() {
  if (configTab === "raw" && !validateRawDraft()) {
    toast("JSON 无效，无法保存。", "error");
    return false;
  }

  if (configTab === "visual") {
    applyVisualSortNow(false);
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
    return false;
  }

  modelsCache[payload.name] = payload;
  toast(`配置已保存: ${payload.name}`, "success");
  await fetchModels();
  configDraftSnapshot = makeConfigDraftSignature(configDraft);
  configRawSnapshotText = String(dom.configRawEditor.value || "");
  refreshConfigDirtyState();
  closeConfigModal(true);
  return true;
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
    isObservation: false,
    isHidden: false,
  });
  syncRawFromVisual();
  renderVisualEditor();
}

function openPropellantModal() {
  if (!configDraft) {
    return;
  }
  propellantSnapshot = deepClone(configDraft.rocket_meta || {});
  renderPropellantFields();
  dom.propellantModal.classList.remove("hidden");
  propellantDirty = false;
}

function closePropellantModal(force = false) {
  if (!force && hasPropellantUnsavedChanges()) {
    openUnsavedConfirmDialog({
      title: "加注参数尚未保存",
      message: "当前加注参数有未保存修改，是否保存后关闭？",
      onSave: () => savePropellantModal(),
      onDiscard: () => {
        if (configDraft && propellantSnapshot) {
          configDraft.rocket_meta = deepClone(propellantSnapshot);
          dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
          showConfigValidation("已放弃加注参数修改。", false);
          refreshConfigDirtyState();
        }
        propellantDirty = false;
        propellantSnapshot = null;
        dom.propellantModal.classList.add("hidden");
        return true;
      },
    });
    return false;
  }
  propellantDirty = false;
  propellantSnapshot = null;
  dom.propellantModal.classList.add("hidden");
  return true;
}

const LIQUID_PROPELLANT_OPTIONS = [
  { value: "n2o4_udmh", label: "四氧化二氮 + 偏二甲肼", oxidizer: "四氧化二氮", fuel: "偏二甲肼" },
  { value: "lox_rp1", label: "液氧 + 煤油", oxidizer: "液氧", fuel: "煤油" },
  { value: "lox_lh2", label: "液氧 + 液氢", oxidizer: "液氧", fuel: "液氢" },
  { value: "lox_ch4", label: "液氧 + 甲烷", oxidizer: "液氧", fuel: "甲烷" },
  { value: "lox_ethanol", label: "液氧 + 乙醇", oxidizer: "液氧", fuel: "乙醇" },
];

function getDefaultLiquidPropellant() {
  return LIQUID_PROPELLANT_OPTIONS[1] || LIQUID_PROPELLANT_OPTIONS[0];
}

function findLiquidPropellantOption(oxidizer, fuel) {
  const oxidizerName = String(oxidizer || "").trim();
  const fuelName = String(fuel || "").trim();
  return LIQUID_PROPELLANT_OPTIONS.find((item) => item.oxidizer === oxidizerName && item.fuel === fuelName)
    || getDefaultLiquidPropellant();
}

function applyLiquidPropellantOption(targetFuel, optionValue) {
  const option = LIQUID_PROPELLANT_OPTIONS.find((item) => item.value === optionValue) || getDefaultLiquidPropellant();
  targetFuel.phase = "液体";
  targetFuel.oxidizer = option.oxidizer;
  targetFuel.fuel = option.fuel;
  return option;
}

function ensureFuelSeed(rawFuel) {
  const seed = normalizeFuelSpec(rawFuel || {});
  if (seed.phase !== "液体" && seed.phase !== "固体") {
    seed.phase = "液体";
  }
  if (seed.phase === "液体") {
    const option = findLiquidPropellantOption(seed.oxidizer, seed.fuel);
    seed.oxidizer = option.oxidizer;
    seed.fuel = option.fuel;
  }
  return seed;
}

function getSolidPropellantText(seed) {
  const oxidizerName = String(seed?.oxidizer || "").trim();
  const fuelName = String(seed?.fuel || "").trim();
  if (oxidizerName && fuelName && oxidizerName !== fuelName) {
    return `${oxidizerName} + ${fuelName}`;
  }
  return oxidizerName || fuelName || "";
}

function setBoosterUiState(enabled) {
  if (dom.boosterEnabledText) {
    dom.boosterEnabledText.textContent = enabled ? "有助推器" : "无助推器";
  }
  if (dom.boosterCountWrap) {
    dom.boosterCountWrap.classList.toggle("hidden", !enabled);
  }
  if (dom.boosterCountInput) {
    dom.boosterCountInput.min = enabled ? "1" : "0";
  }
  if (!enabled && dom.boosterCountInput) {
    dom.boosterCountInput.value = "0";
  }
  if (enabled && dom.boosterCountInput) {
    dom.boosterCountInput.value = String(Math.max(1, toInt(dom.boosterCountInput.value, 1)));
  }
}

function createPropellantRow(rowLabel, fuelSeed, onCommit) {
  const row = document.createElement("div");
  row.className = "propellant-grid-row";

  const label = document.createElement("span");
  label.className = "row-label";
  label.textContent = rowLabel;
  row.appendChild(label);

  const phaseSelect = document.createElement("select");
  ["液体", "固体"].forEach((phase) => {
    const option = document.createElement("option");
    option.value = phase;
    option.textContent = phase;
    phaseSelect.appendChild(option);
  });
  row.appendChild(phaseSelect);

  const propellantCell = document.createElement("div");
  propellantCell.className = "propellant-cell";
  row.appendChild(propellantCell);

  const comboSelect = document.createElement("select");
  LIQUID_PROPELLANT_OPTIONS.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    comboSelect.appendChild(option);
  });
  propellantCell.appendChild(comboSelect);

  const solidInput = document.createElement("input");
  solidInput.type = "text";
  solidInput.placeholder = "请输入固体推进剂";
  propellantCell.appendChild(solidInput);

  const currentFuel = ensureFuelSeed(fuelSeed);
  solidInput.value = getSolidPropellantText(currentFuel);

  function commit(markDirty = false) {
    if (markDirty) {
      propellantDirty = true;
    }
    onCommit(currentFuel);
  }

  function refreshMode(markDirty = false) {
    const isLiquid = phaseSelect.value === "液体";
    if (isLiquid) {
      const selected = applyLiquidPropellantOption(currentFuel, comboSelect.value);
      comboSelect.value = selected.value;
      comboSelect.classList.remove("hidden");
      solidInput.classList.add("hidden");
    } else {
      currentFuel.phase = "固体";
      comboSelect.classList.add("hidden");
      solidInput.classList.remove("hidden");
      currentFuel.oxidizer = String(solidInput.value || "").trim();
      currentFuel.fuel = "";
    }
    commit(markDirty);
  }

  phaseSelect.value = currentFuel.phase;
  comboSelect.value = currentFuel.phase === "液体"
    ? findLiquidPropellantOption(currentFuel.oxidizer, currentFuel.fuel).value
    : getDefaultLiquidPropellant().value;
  refreshMode(false);

  phaseSelect.addEventListener("change", () => {
    if (phaseSelect.value === "固体" && currentFuel.phase !== "固体") {
      solidInput.value = "";
    }
    refreshMode(true);
  });

  comboSelect.addEventListener("change", () => {
    if (phaseSelect.value !== "液体") {
      return;
    }
    refreshMode(true);
  });

  solidInput.addEventListener("input", () => {
    if (phaseSelect.value !== "固体") {
      return;
    }
    currentFuel.phase = "固体";
    currentFuel.oxidizer = String(solidInput.value || "").trim();
    currentFuel.fuel = "";
    commit(true);
  });

  return row;
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
  const boosterEnabled = Boolean(meta.boosters?.enabled);
  const boosterCount = boosterEnabled
    ? Math.max(1, toInt(meta.boosters?.count, 1))
    : 0;
  dom.boosterEnabledInput.checked = boosterEnabled;
  dom.boosterCountInput.value = String(boosterCount);
  setBoosterUiState(boosterEnabled);

  if (!meta.boosters || typeof meta.boosters !== "object") {
    meta.boosters = { enabled: false, count: 0, fuels: [] };
  }
  if (boosterEnabled) {
    meta.boosters.count = boosterCount;
  }

  while ((meta.stages || []).length < stageCount) {
    const defaultFuel = getDefaultLiquidPropellant();
    meta.stages.push({
      stage_index: meta.stages.length + 1,
      fuels: [normalizeFuelSpec({ phase: "液体", oxidizer: defaultFuel.oxidizer, fuel: defaultFuel.fuel })],
    });
  }
  meta.stages = meta.stages.slice(0, stageCount);

  dom.propellantStageList.innerHTML = "";

  const header = document.createElement("div");
  header.className = "propellant-grid-head";
  header.innerHTML = "<span>级数</span><span>类型</span><span>推进剂</span>";
  dom.propellantStageList.appendChild(header);

  meta.stages.forEach((stage, index) => {
    const existingFuel = Array.isArray(stage.fuels) && stage.fuels.length > 0
      ? stage.fuels[0]
      : normalizeFuelSpec(getDefaultLiquidPropellant());
    const row = createPropellantRow(`第 ${index + 1} 级`, existingFuel, (nextFuel) => {
      stage.fuels = [normalizeFuelSpec(nextFuel)];
    });
    dom.propellantStageList.appendChild(row);
  });

  if (boosterEnabled) {
    const boosterFuel = Array.isArray(meta.boosters.fuels) && meta.boosters.fuels.length > 0
      ? meta.boosters.fuels[0]
      : normalizeFuelSpec(getDefaultLiquidPropellant());
    const boosterRow = createPropellantRow("助推器", boosterFuel, (nextFuel) => {
      meta.boosters.fuels = [normalizeFuelSpec(nextFuel)];
    });
    dom.propellantStageList.appendChild(boosterRow);
  }
}

function savePropellantModal() {
  ensureRocketMeta();
  const meta = configDraft.rocket_meta;

  const stageCount = Math.max(1, toInt(dom.rocketStageCountInput.value, 1));
  meta.stage_count = stageCount;
  meta.stages = (meta.stages || []).slice(0, stageCount);

  while (meta.stages.length < stageCount) {
    const defaultFuel = getDefaultLiquidPropellant();
    meta.stages.push({
      stage_index: meta.stages.length + 1,
      fuels: [normalizeFuelSpec({ phase: "液体", oxidizer: defaultFuel.oxidizer, fuel: defaultFuel.fuel })],
    });
  }

  meta.stages = meta.stages.map((stage, index) => ({
    stage_index: index + 1,
    fuels: Array.isArray(stage.fuels) && stage.fuels.length > 0
      ? [ensureFuelSeed(stage.fuels[0])]
      : [normalizeFuelSpec(getDefaultLiquidPropellant())],
  }));

  const boosterEnabled = Boolean(dom.boosterEnabledInput.checked);
  const boosterCount = boosterEnabled ? Math.max(1, toInt(dom.boosterCountInput.value, 1)) : 0;
  const boosterFuelSeed = Array.isArray(meta.boosters?.fuels) && meta.boosters.fuels.length > 0
    ? ensureFuelSeed(meta.boosters.fuels[0])
    : normalizeFuelSpec(getDefaultLiquidPropellant());

  meta.boosters = {
    enabled: boosterEnabled,
    count: boosterCount,
    fuels: boosterEnabled ? [boosterFuelSeed] : [],
  };

  setBoosterUiState(boosterEnabled);

  syncRawFromVisual();
  propellantDirty = false;
  propellantSnapshot = null;
  closePropellantModal(true);
  toast("加注参数已更新", "success");
  return true;
}

function formatFuelChannelLabel(fuel) {
  const phase = String(fuel?.phase || "液体");
  if (phase === "固体") {
    const name = String(fuel?.oxidizer || fuel?.fuel || "").trim() || "自定义推进剂";
    return `${phase} ${name}`;
  }
  const oxidizerName = String(fuel?.oxidizer || "").trim() || "-";
  const fuelName = String(fuel?.fuel || "").trim() || "-";
  return `${phase} ${oxidizerName}+${fuelName}`;
}

function deriveFuelChannels(rocketMeta) {
  const channels = [];
  const stageList = Array.isArray(rocketMeta?.stages) ? rocketMeta.stages : [];

  stageList.forEach((stage) => {
    const fuels = Array.isArray(stage.fuels) ? stage.fuels : [];
    fuels.forEach((fuel, index) => {
      const id = `stage${stage.stage_index}_${index}`;
      const label = `第${stage.stage_index}级 ${formatFuelChannelLabel(fuel)}`;
      channels.push({ id, label });
    });
  });

  if (rocketMeta?.boosters?.enabled) {
    const fuels = Array.isArray(rocketMeta.boosters.fuels) ? rocketMeta.boosters.fuels : [];
    fuels.forEach((fuel, index) => {
      const id = `booster_${index}`;
      const label = `助推器 ${formatFuelChannelLabel(fuel)}`;
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

  const stageList = Array.isArray(draft?.stages) ? draft.stages : [];
  stageList.forEach((stage, index) => {
    const stageId = String(stage?.id || `stg_${index + 1}`);
    const stageName = String(stage?.name || `第${index + 1}级`);
    nodes.push({
      key: `stage:${stageId}:start`,
      time: toInt(stage?.start_time, toInt(stage?.time, 0)),
      name: `${stageName} 开始`,
    });
  });

  const events = Array.isArray(draft?.events) ? draft.events : [];
  events.forEach((event, index) => {
    const eventId = String(event?.id || `evt_${index + 1}`);
    nodes.push({
      key: `event:${eventId}`,
      time: toInt(event?.time, 0),
      name: String(event?.name || "未命名事件"),
    });
  });

  const observations = Array.isArray(draft?.events) ? draft.events.filter((e) => Boolean(e.observation)) : [];
  observations.forEach((observation) => {
    const obsId = String(observation?.id || "");
    nodes.push({
      key: `observation:${obsId}`,
      time: toInt(observation?.time, 0),
      name: String(observation?.name || "未命名观察点"),
    });
  });

  nodes.sort((a, b) => (a.time - b.time) || a.name.localeCompare(b.name, "zh-CN"));

  if (nodes.length === 0) {
    nodes.push({ key: "event:__fuel_t0__", time: 0, name: "T0" });
  } else if (!nodes.some((node) => node.time === 0)) {
    nodes.push({ key: "event:__fuel_t0__", time: 0, name: "T0" });
    nodes.sort((a, b) => (a.time - b.time) || a.name.localeCompare(b.name, "zh-CN"));
  }

  return nodes;
}

