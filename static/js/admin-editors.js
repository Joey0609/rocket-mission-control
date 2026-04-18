const TELEMETRY_METRIC_DEFS = [
  { key: "altitude_km", label: "高度 (km)", shortLabel: "高度", defaultValue: 0 },
  { key: "speed_mps", label: "速度 (m/s)", shortLabel: "速度", defaultValue: 0 },
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
  if (!Array.isArray(normalized.stages) || !Array.isArray(normalized.events) || !Array.isArray(normalized.observation_points)) {
    configDraftValid = false;
    dom.saveConfigModalBtn.disabled = true;
    showConfigValidation("配置必须包含 stages/events/observation_points 数组。", true);
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
  return row?.kind === "event" || row?.kind === "observation";
}

function normalizeVisualEventFlags(row) {
  if (!row || typeof row !== "object") {
    return;
  }
  row.isObservation = isVisualEventRow(row) ? Boolean(row.isObservation || row.kind === "observation") : false;
  row.isHidden = isVisualEventRow(row) ? Boolean(row.isHidden) : false;
  if (row.isObservation && row.isHidden) {
    row.isHidden = false;
  }
}

function parseObservationTime(observation) {
  const fallbackCountdown = Math.max(0, toInt(observation?.new_countdown, 0));
  const hasTime = Object.prototype.hasOwnProperty.call(observation || {}, "time");
  return hasTime ? toInt(observation?.time, -fallbackCountdown) : -fallbackCountdown;
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
    isObservation: Boolean(seed?.isObservation),
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

    const syntheticRow = buildVisualEventRow({
      id: obsId || `evt_obs_${Date.now()}_${index + 1}`,
      name: obsName || "未命名观察点",
      time: obsTime,
      description: String(obs?.description || ""),
      isObservation: true,
      hidden: false,
    }, index);
    rows.push(syntheticRow);
    eventRows.push(syntheticRow);
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

  mergeObservationRowsIntoEvents(rows, Array.isArray(draft.observation_points) ? draft.observation_points : []);

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
      description: eventDescription,
    });

    if (Boolean(row.isObservation) && !isHidden) {
      draft.observation_points.push({
        id: eventId,
        name: eventName,
        time,
        new_countdown: Math.max(0, -time),
        description: eventDescription,
      });
    }
  }

  draft.stages.sort((a, b) => a.start_time - b.start_time);
  draft.events.sort((a, b) => a.time - b.time);
  draft.observation_points.sort((a, b) => a.time - b.time);

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
  icon.style.setProperty("--icon-url", "url('/assets/observe.svg')");
  btn.appendChild(icon);

  const canToggle = isVisualEventRow(row);
  if (!canToggle) {
    btn.disabled = true;
    return btn;
  }

  const active = flagKey === "observation"
    ? Boolean(row.isObservation) && !Boolean(row.isHidden)
    : Boolean(row.isHidden);
  btn.classList.toggle("active", active);

  btn.addEventListener("click", () => {
    pushVisualUndo();
    if (flagKey === "observation") {
      row.isObservation = !Boolean(row.isObservation);
      if (row.isObservation) {
        row.isHidden = false;
      }
    } else {
      row.isHidden = !Boolean(row.isHidden);
      if (row.isHidden) {
        row.isObservation = false;
      }
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

  const idInput = document.createElement("input");
  idInput.className = "row-input";
  idInput.value = row.id || "";
  idInput.placeholder = "id";
  idInput.addEventListener("focus", () => {
    pushVisualUndo();
    registerVisualInputFocus();
  });
  idInput.addEventListener("blur", registerVisualInputBlur);
  idInput.addEventListener("input", () => {
    row.id = idInput.value;
    syncRawFromVisual();
  });

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

  line.appendChild(idInput);
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

  const observations = Array.isArray(draft?.observation_points) ? draft.observation_points : [];
  observations.forEach((observation, index) => {
    const obsId = String(observation?.id || `obs_${index + 1}`);
    const fallbackCountdown = Math.max(0, toInt(observation?.new_countdown, 0));
    const hasTime = Object.prototype.hasOwnProperty.call(observation || {}, "time");
    const obsTime = hasTime ? toInt(observation?.time, -fallbackCountdown) : -fallbackCountdown;
    nodes.push({
      key: `observation:${obsId}`,
      time: obsTime,
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
  const nodeTimes = Array.from(new Set(fuelNodes.map((node) => toInt(node.time, 0)))).sort((a, b) => a - b);
  if (nodeTimes.length === 0) {
    return [{ time: 0, value: 100 }, { time: 60, value: 100 }];
  }

  const explicitByTime = new Map();
  for (const node of fuelNodes) {
    const raw = clampPercent(draft.fuel_editor.node_values[node.key]?.[channelId], -1);
    if (raw >= 0) {
      explicitByTime.set(node.time, raw);
    }
  }

  const explicitPoints = Array.from(explicitByTime.entries())
    .map(([time, value]) => ({ time: Number(time), value: Number(value) }))
    .sort((a, b) => a.time - b.time);

  const seedPoints = explicitPoints.length > 0
    ? explicitPoints
    : [{ time: nodeTimes[0], value: nodeTimes[0] <= 0 ? 100 : 0 }];

  const points = nodeTimes.map((time) => {
    if (explicitByTime.has(time)) {
      return { time, value: explicitByTime.get(time) };
    }
    const interpolated = interpolate(seedPoints, time);
    return { time, value: Math.max(0, Math.min(100, Math.round(interpolated))) };
  });

  if (points.length === 1) {
    points.push({ time: points[0].time + 60, value: points[0].value });
  }

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
  const ratio = window.devicePixelRatio || 1;
  const targetWidth = rect.width > 10 ? rect.width : Math.max(480, canvas.clientWidth || 0, canvas.width / ratio);
  const targetHeight = rect.height > 10 ? rect.height : 360;
  const pixelWidth = Math.round(targetWidth * ratio);
  const pixelHeight = Math.round(targetHeight * ratio);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = canvas.width / ratio;
  const height = canvas.height / ratio;

  return {
    ctx,
    width,
    height,
    padLeft: 58,
    padRight: 28,
    padTop: 44,
    padBottom: 50,
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

function normalizeTimeZoomRange(baseDomain, range) {
  const baseMin = Number(baseDomain?.minTime || 0);
  const baseMax = Number(baseDomain?.maxTime || 0);
  const baseSpan = baseMax - baseMin;
  if (!Number.isFinite(baseSpan) || baseSpan <= 0) {
    return null;
  }

  if (!range || !Number.isFinite(range.minTime) || !Number.isFinite(range.maxTime)) {
    return null;
  }

  const minSpan = Math.max(2, baseSpan / 140);
  const desiredSpan = Math.max(minSpan, Math.min(baseSpan, range.maxTime - range.minTime));
  let minTime = Math.max(baseMin, range.minTime);
  let maxTime = minTime + desiredSpan;

  if (maxTime > baseMax) {
    maxTime = baseMax;
    minTime = maxTime - desiredSpan;
  }

  if (minTime <= baseMin + 1e-6 && maxTime >= baseMax - 1e-6) {
    return null;
  }

  return { minTime, maxTime };
}

function getFuelCurveViewDomain() {
  const base = timeDomain();
  const normalized = normalizeTimeZoomRange(base, fuelCurveZoomRange);
  return normalized || base;
}

function applyHorizontalCurveZoom(baseDomain, currentDomain, pointerRatio, deltaY) {
  const baseSpan = baseDomain.maxTime - baseDomain.minTime;
  const currentSpan = currentDomain.maxTime - currentDomain.minTime;
  const minSpan = Math.max(2, baseSpan / 140);
  const zoomFactor = deltaY < 0 ? 0.88 : 1.14;
  let targetSpan = Math.max(minSpan, Math.min(baseSpan, currentSpan * zoomFactor));

  if (!Number.isFinite(targetSpan) || targetSpan <= 0) {
    targetSpan = currentSpan;
  }

  if (targetSpan >= baseSpan - 1e-6) {
    return null;
  }

  const clampedRatio = Math.max(0, Math.min(1, pointerRatio));
  const focusTime = currentDomain.minTime + clampedRatio * currentSpan;

  let minTime = focusTime - clampedRatio * targetSpan;
  let maxTime = minTime + targetSpan;

  if (minTime < baseDomain.minTime) {
    minTime = baseDomain.minTime;
    maxTime = minTime + targetSpan;
  }
  if (maxTime > baseDomain.maxTime) {
    maxTime = baseDomain.maxTime;
    minTime = maxTime - targetSpan;
  }

  return normalizeTimeZoomRange(baseDomain, { minTime, maxTime });
}

function handleFuelCurveWheelZoom(event) {
  if (!dom.fuelModal || dom.fuelModal.classList.contains("hidden") || fuelTab !== "curve") {
    return;
  }

  const rect = dom.fuelCurveCanvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const m = curveCanvasMetrics();
  const plotW = m.width - m.padLeft - m.padRight;
  if (plotW <= 10) {
    return;
  }

  event.preventDefault();
  const localX = (event.clientX - rect.left) * (m.width / rect.width);
  const clampedX = Math.max(m.padLeft, Math.min(m.width - m.padRight, localX));
  const pointerRatio = (clampedX - m.padLeft) / plotW;

  const baseDomain = timeDomain();
  const currentDomain = getFuelCurveViewDomain();
  fuelCurveZoomRange = applyHorizontalCurveZoom(baseDomain, currentDomain, pointerRatio, event.deltaY);
  renderFuelCurve();
}

function getCurrentCurveChannelId() {
  return String(dom.fuelCurveChannelSelect.value || (fuelChannels[0] ? fuelChannels[0].id : ""));
}

function drawSmoothCurvePath(ctx, points) {
  const series = normalizeCurvePoints(points);
  if (series.length === 0) {
    return;
  }
  if (series.length === 1) {
    ctx.moveTo(series[0].x, series[0].y);
    return;
  }
  if (series.length === 2) {
    ctx.moveTo(series[0].x, series[0].y);
    ctx.lineTo(series[1].x, series[1].y);
    return;
  }

  ctx.moveTo(series[0].x, series[0].y);
  for (let i = 0; i < series.length - 1; i += 1) {
    const left = series[i];
    const right = series[i + 1];
    const segmentWidth = right.x - left.x || 1;
    const steps = Math.max(12, Math.ceil(segmentWidth / 10));

    for (let step = 1; step <= steps; step += 1) {
      const x = left.x + (segmentWidth * step) / steps;
      const y = evaluateSmoothValueAtX(series, x);
      ctx.lineTo(x, y);
    }
  }
}

function drawCanvasTooltip(ctx, lines, x, y, bounds) {
  const messageLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
  if (messageLines.length === 0) {
    return;
  }

  ctx.save();
  ctx.font = '12px "Manrope"';

  let width = 0;
  for (const line of messageLines) {
    width = Math.max(width, ctx.measureText(line).width);
  }

  const lineHeight = 16;
  const paddingX = 8;
  const paddingY = 6;
  const boxW = Math.ceil(width + paddingX * 2);
  const boxH = Math.ceil(messageLines.length * lineHeight + paddingY * 2 - 4);

  let left = x + 14;
  let top = y - boxH - 12;

  if (left + boxW > bounds.maxX) {
    left = x - boxW - 14;
  }
  if (left < bounds.minX) {
    left = bounds.minX;
  }
  if (top < bounds.minY) {
    top = y + 12;
  }
  if (top + boxH > bounds.maxY) {
    top = bounds.maxY - boxH;
  }

  ctx.fillStyle = "rgba(3, 10, 20, 0.92)";
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(left, top, boxW, boxH, 6);
  } else {
    ctx.rect(left, top, boxW, boxH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  messageLines.forEach((line, idx) => {
    ctx.fillText(line, left + paddingX, top + paddingY + idx * lineHeight);
  });
  ctx.restore();
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
  const { minTime, maxTime } = getFuelCurveViewDomain();
  const axisNodes = fuelNodes
    .slice()
    .sort((a, b) => a.time - b.time)
    .filter((node) => node.time >= minTime && node.time <= maxTime);
  const axisGridColor = "rgba(34, 42, 60, 0.22)";
  const axisLabelColor = "rgba(28, 36, 54, 0.88)";

  if (dom.fuelCurveYLabel) {
    dom.fuelCurveYLabel.textContent = "燃料余量 (%)";
  }

  const toX = (time) => padLeft + ((time - minTime) / (maxTime - minTime)) * plotW;
  const toY = (value) => padTop + ((100 - value) / 100) * plotH;

  ctx.strokeStyle = axisGridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) {
    const y = padTop + (i / 10) * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padLeft - 5, y);
    ctx.lineTo(padLeft, y);
    ctx.stroke();

    const tickValue = String(100 - i * 10);
    ctx.fillStyle = axisLabelColor;
    ctx.font = '11px "Manrope"';
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(tickValue, padLeft - 8, y);
  }

  axisNodes.forEach((node, index) => {
    const x = toX(node.time);
    ctx.beginPath();
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, height - padBottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, height - padBottom);
    ctx.lineTo(x, height - padBottom + 5);
    ctx.stroke();

    ctx.fillStyle = axisLabelColor;
    ctx.font = '11px "Manrope"';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(formatSignedTime(node.time), x, height - padBottom + 8);

    ctx.textBaseline = "bottom";
    ctx.fillStyle = axisLabelColor;
    const nameY = padTop - 6 - (index % 2) * 14;
    ctx.fillText(shortenLabel(node.name, 10), x, nameY);
  });

  ctx.strokeStyle = "rgba(34, 42, 60, 0.58)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop);
  ctx.lineTo(padLeft, height - padBottom);
  ctx.lineTo(width - padRight, height - padBottom);
  ctx.stroke();

  if (points.length > 0) {
    const curvePoints = points.map((p) => ({ x: toX(p.time), y: toY(p.value) }));
    ctx.strokeStyle = "#4fd2ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawSmoothCurvePath(ctx, curvePoints);
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

  if (fuelCurveHoverState && points.length > 0) {
    const hoverX = Math.max(padLeft, Math.min(width - padRight, fuelCurveHoverState.x));
    const hoverTime = minTime + ((hoverX - padLeft) / plotW) * (maxTime - minTime);
    const curvePoints = points.map((p) => ({ x: toX(p.time), y: toY(p.value) }));
    const hoverY = evaluateSmoothValueAtX(curvePoints, hoverX);
    const hoverValue = Math.max(0, Math.min(100, Math.round((100 - ((hoverY - padTop) / plotH) * 100) * 1000) / 1000));

    let nearestNode = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    axisNodes.forEach((node) => {
      const dt = Math.abs(node.time - hoverTime);
      if (dt < nearestDistance) {
        nearestDistance = dt;
        nearestNode = node;
      }
    });

    ctx.strokeStyle = "rgba(255,225,132,0.68)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hoverX, padTop);
    ctx.lineTo(hoverX, height - padBottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "#ffe184";
    ctx.arc(hoverX, hoverY, 4, 0, Math.PI * 2);
    ctx.fill();

    drawCanvasTooltip(
      ctx,
      [
        `${formatSignedTime(hoverTime)}`,
        `余量: ${formatFloat(hoverValue)}%`,
        nearestNode ? `最近事件: ${nearestNode.name}` : "",
      ],
      hoverX,
      hoverY,
      { minX: 6, minY: 6, maxX: width - 6, maxY: height - 6 },
    );
  }

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = '12px "Manrope"';
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("任务时间 (s)", padLeft + plotW / 2, height - 2);
}

function findCurvePointAtPosition(x, y) {
  const channelId = getCurrentCurveChannelId();
  const points = fuelEditDraft.fuel_editor.curves[channelId] || [];
  const m = curveCanvasMetrics();
  const { width, height, padLeft, padRight, padTop, padBottom } = m;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const { minTime, maxTime } = getFuelCurveViewDomain();

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
  const currentPoint = points[curveDragState.index];
  if (!currentPoint) {
    return;
  }

  const rect = dom.fuelCurveCanvas.getBoundingClientRect();
  const m = curveCanvasMetrics();
  const { width, height, padLeft, padRight, padTop, padBottom } = m;
  const plotW = width - padLeft - padRight;
  const localY = (clientY - rect.top) * (height / rect.height);
  const localX = (clientX - rect.left) * (width / rect.width);

  const plotH = Math.max(1, height - padTop - padBottom);
  const clampedX = Math.max(padLeft, Math.min(width - padRight, localX));
  const y = Math.max(padTop, Math.min(height - padBottom, localY));
  const value = Math.max(0, Math.min(100, Math.round(100 - ((y - padTop) / plotH) * 100)));

  if (plotW > 1) {
    const baseDomain = timeDomain();
    const baseSpan = baseDomain.maxTime - baseDomain.minTime;
    if (baseSpan > 0) {
      const prevPoint = points[curveDragState.index - 1] || null;
      const nextPoint = points[curveDragState.index + 1] || null;
      const minBound = prevPoint ? prevPoint.time + 1 : baseDomain.minTime;
      const maxBound = nextPoint ? nextPoint.time - 1 : baseDomain.maxTime;
      const ratio = (clampedX - padLeft) / plotW;
      const rawTime = baseDomain.minTime + ratio * baseSpan;
      if (maxBound >= minBound) {
        currentPoint.time = Math.round(Math.max(minBound, Math.min(maxBound, rawTime)));
      }
    }
  }

  currentPoint.value = value;
  points.sort((a, b) => a.time - b.time);
  curveDragState.index = Math.max(0, points.indexOf(currentPoint));
  fuelDirty = true;

  for (const node of fuelNodes) {
    const v = Math.round(interpolate(points, node.time));
    fuelEditDraft.fuel_editor.node_values[node.key][channelId] = Math.max(0, Math.min(100, v));
  }

  renderFuelTable();
  renderFuelCurve();
}

function updateFuelCurveHoverByPointer(clientX, clientY) {
  if (!dom.fuelModal || dom.fuelModal.classList.contains("hidden") || fuelTab !== "curve") {
    return;
  }

  const rect = dom.fuelCurveCanvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const m = curveCanvasMetrics();
  const localX = (clientX - rect.left) * (m.width / rect.width);
  const localY = (clientY - rect.top) * (m.height / rect.height);

  fuelCurveHoverState = { x: localX, y: localY };
  renderFuelCurve();
}

function clearFuelCurveHover() {
  if (!fuelCurveHoverState) {
    return;
  }
  fuelCurveHoverState = null;
  if (dom.fuelModal && !dom.fuelModal.classList.contains("hidden") && fuelTab === "curve") {
    renderFuelCurve();
  }
}

function setFuelTab(tab) {
  fuelTab = tab === "curve" ? "curve" : "list";
  dom.fuelListPane.classList.toggle("hidden", fuelTab !== "list");
  dom.fuelCurvePane.classList.toggle("hidden", fuelTab !== "curve");
  dom.fuelTabListBtn.classList.toggle("active", fuelTab === "list");
  dom.fuelTabCurveBtn.classList.toggle("active", fuelTab === "curve");
  if (fuelTab === "curve") {
    renderFuelCurve();
    requestAnimationFrame(() => {
      renderFuelCurve();
      setTimeout(() => {
        if (!dom.fuelModal.classList.contains("hidden") && fuelTab === "curve") {
          renderFuelCurve();
        }
      }, 80);
    });
  } else {
    fuelCurveHoverState = null;
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
  fuelCurveZoomRange = null;
  fuelSnapshot = makeFuelSignature(fuelEditDraft);
  fuelDirty = false;
}

function closeFuelModal(force = false) {
  if (!force && makeFuelSignature(fuelEditDraft) !== fuelSnapshot) {
    openUnsavedConfirmDialog({
      title: "燃料配置尚未保存",
      message: "当前燃料编辑有未保存修改，是否保存后关闭？",
      onSave: () => saveFuelModal(),
      onDiscard: () => {
        fuelDirty = false;
        return closeFuelModal(true);
      },
    });
    return false;
  }
  dom.fuelModal.classList.add("hidden");
  curveDragState = null;
  fuelCurveHoverState = null;
  fuelCurveZoomRange = null;
  return true;
}

async function saveFuelModal() {
  if (!fuelEditDraft) {
    return false;
  }

  if (fuelEditSource === "config" && configDraft) {
    configDraft.fuel_editor = deepClone(fuelEditDraft.fuel_editor);
    dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
    refreshConfigDirtyState();
    dom.saveConfigModalBtn.disabled = false;
    showConfigValidation("燃料配置已更新，请保存型号配置以落盘。", false);
    toast("燃料配置已写入当前型号草稿", "success");
    fuelSnapshot = makeFuelSignature(fuelEditDraft);
    fuelDirty = false;
    closeFuelModal(true);
    return true;
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
    return false;
  }

  modelsCache[payload.name] = payload;
  toast("燃料配置已保存", "success");
  fuelSnapshot = makeFuelSignature(fuelEditDraft);
  fuelDirty = false;
  closeFuelModal(true);
  return true;
}

function normalizeTelemetryCurveArray(rawPoints, fallback = 0) {
  if (!Array.isArray(rawPoints)) {
    return [];
  }
  return rawPoints
    .map((point) => ({
      time: toInt(point?.time, 0),
      value: toFloat(point?.value, fallback),
    }))
    .sort((a, b) => a.time - b.time);
}

function normalizeTelemetryBranch(rawValue, fallback = 0) {
  if (rawValue && typeof rawValue === "object") {
    const stage1 = Math.max(0, toFloat(rawValue.stage1, fallback));
    const upper = Math.max(0, toFloat(rawValue.upper, stage1));
    return { stage1, upper };
  }
  const value = Math.max(0, toFloat(rawValue, fallback));
  return { stage1: value, upper: value };
}

function buildTelemetryNodes(draft) {
  const nodes = (draft?.events || [])
    .map((event) => ({
      key: `event:${event.id}`,
      id: String(event.id || ""),
      time: toInt(event.time, 0),
      name: String(event.name || "未命名事件"),
    }))
    .filter((event) => event.time >= 0)
    .sort((a, b) => (a.time - b.time) || a.name.localeCompare(b.name, "zh-CN"));

  const hasSyntheticT0 = nodes.some((node) => node.key === "event:__telemetry_t0__");
  if (!hasSyntheticT0) {
    nodes.push({ key: "event:__telemetry_t0__", id: "__telemetry_t0__", time: 0, name: "T0" });
  }
  nodes.sort((a, b) => (a.time - b.time) || a.name.localeCompare(b.name, "zh-CN"));

  return nodes;
}

function resolveTelemetrySplitMode(draft) {
  const recoveryEnabled = draft?.rocket_meta?.recovery_capable !== false
    && draft?.rocket_meta?.recovery_enabled !== false;

  if (!recoveryEnabled) {
    return {
      enabled: false,
      separationTime: Number.POSITIVE_INFINITY,
      separationName: "",
      reason: "当前未勾选回收，遥测按单值模式编辑。",
    };
  }

  const sortedEvents = (draft?.events || [])
    .map((event) => ({
      name: String(event.name || ""),
      time: toInt(event.time, 0),
    }))
    .sort((a, b) => a.time - b.time);

  const separationEvent = sortedEvents.find((event) => event.name.includes("分离"));
  if (!separationEvent) {
    return {
      enabled: false,
      separationTime: Number.POSITIVE_INFINITY,
      separationName: "",
      reason: "已勾选回收，但未找到包含“分离”的事件，遥测按单值模式编辑。",
    };
  }

  return {
    enabled: true,
    separationTime: separationEvent.time,
    separationName: separationEvent.name,
    reason: `已识别分离事件：${separationEvent.name} (T+${separationEvent.time})。`,
  };
}

function shouldSplitTelemetryAtTime(time) {
  return telemetrySplitMode.enabled && toInt(time, 0) > telemetrySplitMode.separationTime;
}

function normalizeEulerAngles(rawValue, fallback = 0) {
  if (rawValue && typeof rawValue === "object") {
    return {
      roll: toFloat(rawValue.roll, fallback),
      pitch: toFloat(rawValue.pitch, 0),
      yaw: toFloat(rawValue.yaw, 0),
    };
  }
  return {
    roll: toFloat(rawValue, fallback),
    pitch: 0,
    yaw: 0,
  };
}

function eulerAnglesToScalar(angles) {
  const roll = toFloat(angles?.roll, 0);
  const pitch = toFloat(angles?.pitch, 0);
  const yaw = toFloat(angles?.yaw, 0);
  return Math.max(0, Math.sqrt((roll * roll) + (pitch * pitch) + (yaw * yaw)));
}

function getTelemetryEulerAxisCurveKey(axisKey) {
  return TELEMETRY_EULER_AXIS_CURVE_KEY[axisKey] || "";
}

function getTelemetryEulerAxisByCurveKey(metricKey) {
  return TELEMETRY_EULER_AXES.find((axisKey) => getTelemetryEulerAxisCurveKey(axisKey) === metricKey) || "";
}

function isTelemetryEulerCurveKey(metricKey) {
  return Boolean(getTelemetryEulerAxisByCurveKey(metricKey));
}

function ensureTelemetryStructure(draft) {
  if (!draft.telemetry_editor || typeof draft.telemetry_editor !== "object") {
    draft.telemetry_editor = { version: 1, node_values: {}, curves: {} };
  }
  if (!draft.telemetry_editor.node_values || typeof draft.telemetry_editor.node_values !== "object") {
    draft.telemetry_editor.node_values = {};
  }
  if (!draft.telemetry_editor.curves || typeof draft.telemetry_editor.curves !== "object") {
    draft.telemetry_editor.curves = {};
  }

  telemetryNodes = buildTelemetryNodes(draft);
  telemetrySplitMode = resolveTelemetrySplitMode(draft);

  for (const metric of TELEMETRY_METRIC_DEFS) {
    const metricCurveSource = draft.telemetry_editor.curves[metric.key];
    if (Array.isArray(metricCurveSource)) {
      const parsed = normalizeTelemetryCurveArray(metricCurveSource, metric.defaultValue);
      draft.telemetry_editor.curves[metric.key] = {
        stage1: parsed,
        upper: parsed.map((point) => ({ ...point })),
      };
      continue;
    }
    if (!metricCurveSource || typeof metricCurveSource !== "object") {
      draft.telemetry_editor.curves[metric.key] = { stage1: [], upper: [] };
      continue;
    }
    draft.telemetry_editor.curves[metric.key] = {
      stage1: normalizeTelemetryCurveArray(metricCurveSource.stage1, metric.defaultValue),
      upper: normalizeTelemetryCurveArray(
        Array.isArray(metricCurveSource.upper) ? metricCurveSource.upper : metricCurveSource.stage1,
        metric.defaultValue,
      ),
    };
  }

  for (const axisKey of TELEMETRY_EULER_AXES) {
    const curveKey = getTelemetryEulerAxisCurveKey(axisKey);
    const metricCurveSource = draft.telemetry_editor.curves[curveKey];
    if (Array.isArray(metricCurveSource)) {
      const parsed = normalizeTelemetryCurveArray(metricCurveSource, 0);
      draft.telemetry_editor.curves[curveKey] = {
        stage1: parsed,
        upper: parsed.map((point) => ({ ...point })),
      };
      continue;
    }
    if (!metricCurveSource || typeof metricCurveSource !== "object") {
      draft.telemetry_editor.curves[curveKey] = { stage1: [], upper: [] };
      continue;
    }
    draft.telemetry_editor.curves[curveKey] = {
      stage1: normalizeTelemetryCurveArray(metricCurveSource.stage1, 0),
      upper: normalizeTelemetryCurveArray(
        Array.isArray(metricCurveSource.upper) ? metricCurveSource.upper : metricCurveSource.stage1,
        0,
      ),
    };
  }

  const readEulerAxisFromCurve = (axisKey, time, fallback = 0) => {
    const curveKey = getTelemetryEulerAxisCurveKey(axisKey);
    const curves = draft.telemetry_editor.curves?.[curveKey];
    const points = Array.isArray(curves?.stage1) ? curves.stage1 : [];
    if (points.length <= 0) {
      return fallback;
    }
    return toFloat(interpolate(points, time), fallback);
  };

  for (const node of telemetryNodes) {
    if (!draft.telemetry_editor.node_values[node.key] || typeof draft.telemetry_editor.node_values[node.key] !== "object") {
      draft.telemetry_editor.node_values[node.key] = {};
    }
    const nodeStore = draft.telemetry_editor.node_values[node.key];

    for (const metric of TELEMETRY_METRIC_DEFS) {
      const branch = normalizeTelemetryBranch(nodeStore[metric.key], metric.defaultValue);
      if (!shouldSplitTelemetryAtTime(node.time)) {
        branch.upper = branch.stage1;
      }
      nodeStore[metric.key] = branch;
    }

    const eulerFallback = toFloat(nodeStore?.[TELEMETRY_EULER_METRIC_KEY]?.stage1, 0);
    const currentEuler = normalizeEulerAngles(nodeStore.euler_angles, eulerFallback);
    nodeStore.euler_angles = {
      roll: readEulerAxisFromCurve("roll", node.time, currentEuler.roll),
      pitch: readEulerAxisFromCurve("pitch", node.time, currentEuler.pitch),
      yaw: readEulerAxisFromCurve("yaw", node.time, currentEuler.yaw),
    };
    if (nodeStore[TELEMETRY_EULER_METRIC_KEY]) {
      const scalar = eulerAnglesToScalar(nodeStore.euler_angles);
      nodeStore[TELEMETRY_EULER_METRIC_KEY].stage1 = scalar;
      nodeStore[TELEMETRY_EULER_METRIC_KEY].upper = scalar;
    }
  }

  syncTelemetryCurvesFromNodeValues(draft);
}

function resolveTelemetryBranchPoints(draft, metricKey, branchKey, fallback = 0, options = {}) {
  const clampMin = options.clampMin !== false;
  const entries = [];
  for (const node of telemetryNodes) {
    const rawValue = draft.telemetry_editor.node_values[node.key]?.[metricKey]?.[branchKey];
    const parsed = toFloat(rawValue, fallback);
    entries.push({ time: node.time, value: clampMin ? Math.max(0, parsed) : parsed });
  }

  const unique = new Map();
  for (const point of entries) {
    unique.set(point.time, point.value);
  }

  const points = Array.from(unique.entries())
    .map(([time, value]) => ({ time: Number(time), value: Number(value) }))
    .sort((a, b) => a.time - b.time);

  if (points.length === 0) {
    points.push({ time: 0, value: fallback });
  }
  if (points.length === 1) {
    points.push({ time: points[0].time + 60, value: points[0].value });
  }

  return points;
}

function resolveTelemetryEulerAxisPoints(draft, axisKey, fallback = 0) {
  const entries = [];
  for (const node of telemetryNodes) {
    const rawValue = draft.telemetry_editor.node_values[node.key]?.euler_angles?.[axisKey];
    entries.push({ time: node.time, value: toFloat(rawValue, fallback) });
  }

  const unique = new Map();
  for (const point of entries) {
    unique.set(point.time, point.value);
  }

  const points = Array.from(unique.entries())
    .map(([time, value]) => ({ time: Number(time), value: Number(value) }))
    .sort((a, b) => a.time - b.time);

  if (points.length === 0) {
    points.push({ time: 0, value: fallback });
  }
  if (points.length === 1) {
    points.push({ time: points[0].time + 60, value: points[0].value });
  }

  return points;
}

function syncTelemetryCurvesFromNodeValues(draft) {
  for (const metric of TELEMETRY_METRIC_DEFS) {
    const stage1 = resolveTelemetryBranchPoints(draft, metric.key, "stage1", metric.defaultValue);
    const upper = telemetrySplitMode.enabled
      ? resolveTelemetryBranchPoints(draft, metric.key, "upper", metric.defaultValue)
      : stage1.map((point) => ({ ...point }));

    draft.telemetry_editor.curves[metric.key] = {
      stage1,
      upper,
    };
  }

  for (const axisKey of TELEMETRY_EULER_AXES) {
    const curveKey = getTelemetryEulerAxisCurveKey(axisKey);
    const stage1 = resolveTelemetryEulerAxisPoints(draft, axisKey, 0);
    draft.telemetry_editor.curves[curveKey] = {
      stage1,
      upper: stage1.map((point) => ({ ...point })),
    };
  }
}

function syncTelemetryEulerNodeValuesFromCurves(draft) {
  if (!draft?.telemetry_editor?.node_values) {
    return;
  }

  const readAxisValueAtTime = (axisKey, time) => {
    const curveKey = getTelemetryEulerAxisCurveKey(axisKey);
    const curve = draft.telemetry_editor.curves?.[curveKey];
    const points = Array.isArray(curve?.stage1) ? curve.stage1 : [];
    return toFloat(interpolate(points, time), 0);
  };

  for (const node of telemetryNodes) {
    const nodeStore = draft.telemetry_editor.node_values[node.key];
    if (!nodeStore || typeof nodeStore !== "object") {
      continue;
    }

    const nextEuler = {
      roll: readAxisValueAtTime("roll", node.time),
      pitch: readAxisValueAtTime("pitch", node.time),
      yaw: readAxisValueAtTime("yaw", node.time),
    };
    nodeStore.euler_angles = nextEuler;

    const scalar = eulerAnglesToScalar(nextEuler);
    const branch = normalizeTelemetryBranch(nodeStore[TELEMETRY_EULER_METRIC_KEY], scalar);
    branch.stage1 = scalar;
    branch.upper = scalar;
    nodeStore[TELEMETRY_EULER_METRIC_KEY] = branch;
  }
}

function getTelemetryMetricByTab(tabKey = telemetryTab) {
  if (tabKey === "altitude") {
    return TELEMETRY_METRIC_DEFS[0];
  }
  if (tabKey === "speed") {
    return TELEMETRY_METRIC_DEFS[1];
  }
  if (tabKey === "accel") {
    return TELEMETRY_METRIC_DEFS[2];
  }
  if (tabKey === "angular") {
    return TELEMETRY_METRIC_DEFS[3];
  }
  return null;
}

function renderTelemetryHintText() {
  if (!dom.telemetrySplitHint) {
    return;
  }
  dom.telemetrySplitHint.textContent = telemetrySplitMode.reason || "仅展示 T0 及之后事件节点。";
}

function renderTelemetryTable() {
  if (!telemetryEditDraft) {
    return;
  }

  ensureTelemetryStructure(telemetryEditDraft);
  renderTelemetryHintText();

  const table = dom.telemetryTable;
  if (!table) {
    return;
  }
  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const scalarMetrics = TELEMETRY_METRIC_DEFS.slice(0, 3);
  const eulerMetric = TELEMETRY_METRIC_DEFS.find((metric) => metric.key === TELEMETRY_EULER_METRIC_KEY) || TELEMETRY_METRIC_DEFS[3];
  const headerTexts = [
    "节点",
    "时间(s)",
    ...scalarMetrics.map((metric) => metric.label),
    `${eulerMetric?.label || "欧拉角"} (roll / pitch / yaw)`,
  ];
  headerTexts.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  telemetryNodes.forEach((node) => {
    const tr = document.createElement("tr");
    if (shouldSplitTelemetryAtTime(node.time)) {
      tr.classList.add("telemetry-row-split");
    }

    const tdName = document.createElement("td");
    tdName.textContent = node.name;
    tr.appendChild(tdName);

    const tdTime = document.createElement("td");
    tdTime.textContent = `T+${node.time}`;
    tr.appendChild(tdTime);

    const splitNow = shouldSplitTelemetryAtTime(node.time);
    const nodeStore = telemetryEditDraft.telemetry_editor.node_values[node.key];

    scalarMetrics.forEach((metric) => {
      const td = document.createElement("td");
      const branch = normalizeTelemetryBranch(nodeStore[metric.key], metric.defaultValue);
      nodeStore[metric.key] = branch;

      if (!splitNow) {
        const wrap = document.createElement("div");
        wrap.className = "telemetry-single-input";

        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.step = "0.01";
        input.value = formatFloat(branch.stage1);
        input.title = `${metric.shortLabel}`;
        input.addEventListener("input", () => {
          const value = Math.max(0, toFloat(input.value, branch.stage1));
          nodeStore[metric.key].stage1 = value;
          nodeStore[metric.key].upper = value;
          telemetryDirty = true;
          syncTelemetryCurvesFromNodeValues(telemetryEditDraft);
          if (telemetryTab !== "list") {
            renderTelemetryCurve();
          }
        });

        wrap.appendChild(input);
        td.appendChild(wrap);
      } else {
        const dual = document.createElement("div");
        dual.className = "telemetry-dual-input";

        const stage1Input = document.createElement("input");
        stage1Input.type = "number";
        stage1Input.min = "0";
        stage1Input.step = "0.01";
        stage1Input.value = formatFloat(branch.stage1);
        stage1Input.title = `${metric.shortLabel} - 一级`;

        const upperInput = document.createElement("input");
        upperInput.type = "number";
        upperInput.min = "0";
        upperInput.step = "0.01";
        upperInput.value = formatFloat(branch.upper);
        upperInput.title = `${metric.shortLabel} - 二级及以后`;

        stage1Input.addEventListener("input", () => {
          nodeStore[metric.key].stage1 = Math.max(0, toFloat(stage1Input.value, branch.stage1));
          telemetryDirty = true;
          syncTelemetryCurvesFromNodeValues(telemetryEditDraft);
          if (telemetryTab !== "list") {
            renderTelemetryCurve();
          }
        });

        upperInput.addEventListener("input", () => {
          nodeStore[metric.key].upper = Math.max(0, toFloat(upperInput.value, branch.upper));
          telemetryDirty = true;
          syncTelemetryCurvesFromNodeValues(telemetryEditDraft);
          if (telemetryTab !== "list") {
            renderTelemetryCurve();
          }
        });

        dual.appendChild(stage1Input);
        dual.appendChild(upperInput);
        td.appendChild(dual);
      }

      tr.appendChild(td);
    });

    {
      const metric = eulerMetric;
      const td = document.createElement("td");
      const branch = normalizeTelemetryBranch(nodeStore[metric.key], metric.defaultValue);
      nodeStore[metric.key] = branch;

      const eulerWrap = document.createElement("div");
      eulerWrap.className = "telemetry-euler-inputs";

      const currentEuler = normalizeEulerAngles(nodeStore.euler_angles, branch.stage1);
      nodeStore.euler_angles = currentEuler;

      TELEMETRY_EULER_AXES.forEach((axisKey) => {
        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        input.value = formatFloat(currentEuler[axisKey]);
        input.placeholder = TELEMETRY_EULER_AXIS_LABEL[axisKey];
        input.title = `欧拉角 ${TELEMETRY_EULER_AXIS_LABEL[axisKey]}`;
        input.addEventListener("input", () => {
          const nextEuler = normalizeEulerAngles(nodeStore.euler_angles, branch.stage1);
          nextEuler[axisKey] = toFloat(input.value, nextEuler[axisKey]);
          nodeStore.euler_angles = nextEuler;

          const scalar = eulerAnglesToScalar(nextEuler);
          nodeStore[metric.key].stage1 = scalar;
          nodeStore[metric.key].upper = scalar;

          telemetryDirty = true;
          syncTelemetryCurvesFromNodeValues(telemetryEditDraft);
          if (telemetryTab !== "list") {
            renderTelemetryCurve();
          }
        });
        eulerWrap.appendChild(input);
      });

      td.appendChild(eulerWrap);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

function telemetryCurveCanvasMetrics() {
  const canvas = dom.telemetryCurveCanvas;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const targetWidth = rect.width > 10 ? rect.width : Math.max(480, canvas.clientWidth || 0, canvas.width / ratio);
  const targetHeight = rect.height > 10 ? rect.height : 360;
  const pixelWidth = Math.round(targetWidth * ratio);
  const pixelHeight = Math.round(targetHeight * ratio);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  return {
    ctx,
    width: canvas.width / ratio,
    height: canvas.height / ratio,
    padLeft: 66,
    padRight: 28,
    padTop: 44,
    padBottom: 50,
  };
}

function telemetryTimeDomain() {
  const times = telemetryNodes.map((node) => node.time);
  let minTime = times.length > 0 ? Math.min(...times) : 0;
  let maxTime = times.length > 0 ? Math.max(...times) : 0;
  if (minTime === maxTime) {
    maxTime = minTime + 60;
  }
  return { minTime, maxTime };
}

function getTelemetryCurveViewDomain() {
  const base = telemetryTimeDomain();
  const normalized = normalizeTimeZoomRange(base, telemetryCurveZoomRange);
  return normalized || base;
}

function handleTelemetryCurveWheelZoom(event) {
  if (!dom.telemetryModal || dom.telemetryModal.classList.contains("hidden") || telemetryTab === "list") {
    return;
  }

  const rect = dom.telemetryCurveCanvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const m = telemetryCurveCanvasMetrics();
  const plotW = m.width - m.padLeft - m.padRight;
  if (plotW <= 10) {
    return;
  }

  event.preventDefault();
  const localX = (event.clientX - rect.left) * (m.width / rect.width);
  const clampedX = Math.max(m.padLeft, Math.min(m.width - m.padRight, localX));
  const pointerRatio = (clampedX - m.padLeft) / plotW;

  const baseDomain = telemetryTimeDomain();
  const currentDomain = getTelemetryCurveViewDomain();
  telemetryCurveZoomRange = applyHorizontalCurveZoom(baseDomain, currentDomain, pointerRatio, event.deltaY);
  renderTelemetryCurve();
}

function telemetryValueDomain(metricKey) {
  const curves = telemetryEditDraft?.telemetry_editor?.curves?.[metricKey] || { stage1: [], upper: [] };
  const values = [];
  curves.stage1.forEach((point) => values.push(point.value));
  if (telemetrySplitMode.enabled) {
    curves.upper.forEach((point, index) => {
      if (!telemetryNodes[index] || telemetryNodes[index].time >= telemetrySplitMode.separationTime) {
        values.push(point.value);
      }
    });
  }

  if (values.length === 0) {
    return { minValue: 0, maxValue: 1 };
  }

  const minValue = 0;
  let maxValue = Math.max(...values);
  if (minValue === maxValue) {
    maxValue = minValue + 1;
  }

  const span = Math.max(1, maxValue - minValue);
  const pad = span * 0.12;
  return {
    minValue,
    maxValue: maxValue + pad,
  };
}

function telemetryEulerValueDomain() {
  const values = [];
  for (const axisKey of TELEMETRY_EULER_AXES) {
    const curveKey = getTelemetryEulerAxisCurveKey(axisKey);
    const curves = telemetryEditDraft?.telemetry_editor?.curves?.[curveKey] || { stage1: [] };
    (Array.isArray(curves.stage1) ? curves.stage1 : []).forEach((point) => {
      values.push(toFloat(point.value, 0));
    });
  }

  if (values.length === 0) {
    return { minValue: -1, maxValue: 1 };
  }

  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  if (Math.abs(maxValue - minValue) < 1e-6) {
    minValue -= 1;
    maxValue += 1;
  }

  const span = Math.max(1, maxValue - minValue);
  const pad = Math.max(1, span * 0.12);
  return {
    minValue: minValue - pad,
    maxValue: maxValue + pad,
  };
}

function buildTelemetryEulerSeries() {
  return TELEMETRY_EULER_AXES.map((axisKey) => {
    const curveKey = getTelemetryEulerAxisCurveKey(axisKey);
    const curves = telemetryEditDraft?.telemetry_editor?.curves?.[curveKey] || { stage1: [] };
    return {
      axisKey,
      metricKey: curveKey,
      color: TELEMETRY_EULER_AXIS_COLORS[axisKey] || "#4fd2ff",
      activeColor: TELEMETRY_EULER_AXIS_ACTIVE_COLORS[axisKey] || "#ffe07e",
      points: Array.isArray(curves.stage1) ? curves.stage1 : [],
    };
  });
}

function renderTelemetryEulerCurve() {
  if (!telemetryEditDraft) {
    return;
  }

  ensureTelemetryStructure(telemetryEditDraft);

  if (dom.telemetryCurveYLabel) {
    dom.telemetryCurveYLabel.textContent = "欧拉角 (deg)";
  }
  if (dom.telemetryCurveLegend) {
    dom.telemetryCurveLegend.textContent = "蓝色: roll | 橙色: pitch | 绿色: yaw";
  }

  const m = telemetryCurveCanvasMetrics();
  const { ctx, width, height, padLeft, padRight, padTop, padBottom } = m;

  ctx.clearRect(0, 0, width, height);

  const { minTime, maxTime } = getTelemetryCurveViewDomain();
  const { minValue, maxValue } = telemetryEulerValueDomain();
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const axisNodes = telemetryNodes
    .slice()
    .sort((a, b) => a.time - b.time)
    .filter((node) => node.time >= minTime && node.time <= maxTime);
  const axisGridColor = "rgba(34, 42, 60, 0.22)";
  const axisLabelColor = "rgba(28, 36, 54, 0.88)";

  const toX = (time) => padLeft + ((time - minTime) / (maxTime - minTime)) * plotW;
  const toY = (value) => padTop + ((maxValue - value) / (maxValue - minValue)) * plotH;

  ctx.strokeStyle = axisGridColor;
  ctx.lineWidth = 1;

  for (let i = 0; i <= 6; i += 1) {
    const y = padTop + (i / 6) * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padLeft - 5, y);
    ctx.lineTo(padLeft, y);
    ctx.stroke();

    const value = maxValue - ((maxValue - minValue) * i) / 6;
    ctx.fillStyle = axisLabelColor;
    ctx.font = '11px "Manrope"';
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatFloat(value), padLeft - 10, y);
  }

  axisNodes.forEach((node, index) => {
    const x = toX(node.time);
    ctx.beginPath();
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, height - padBottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, height - padBottom);
    ctx.lineTo(x, height - padBottom + 5);
    ctx.stroke();

    ctx.fillStyle = axisLabelColor;
    ctx.font = '11px "Manrope"';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(formatSignedTime(node.time), x, height - padBottom + 8);

    ctx.textBaseline = "bottom";
    ctx.fillStyle = axisLabelColor;
    const nameY = padTop - 6 - (index % 2) * 14;
    ctx.fillText(shortenLabel(node.name, 10), x, nameY);
  });

  ctx.strokeStyle = "rgba(34, 42, 60, 0.58)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop);
  ctx.lineTo(padLeft, height - padBottom);
  ctx.lineTo(width - padRight, height - padBottom);
  ctx.stroke();

  const series = buildTelemetryEulerSeries().map((item) => ({
    ...item,
    canvasPoints: item.points.map((point) => ({ x: toX(point.time), y: toY(point.value) })),
  }));

  series.forEach((item) => {
    if (item.canvasPoints.length <= 0) {
      return;
    }

    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawSmoothCurvePath(ctx, item.canvasPoints);
    ctx.stroke();

    item.canvasPoints.forEach((point, index) => {
      const active = telemetryDragState
        && telemetryDragState.metricKey === item.metricKey
        && telemetryDragState.branch === "stage1"
        && telemetryDragState.index === index;

      ctx.beginPath();
      ctx.fillStyle = active ? item.activeColor : item.color;
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  if (telemetryCurveHoverState) {
    const hoverX = Math.max(padLeft, Math.min(width - padRight, telemetryCurveHoverState.x));
    const hoverTime = minTime + ((hoverX - padLeft) / plotW) * (maxTime - minTime);

    ctx.strokeStyle = "rgba(255,225,132,0.68)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hoverX, padTop);
    ctx.lineTo(hoverX, height - padBottom);
    ctx.stroke();

    const tooltipLines = [formatSignedTime(hoverTime)];

    series.forEach((item) => {
      const value = toFloat(interpolate(item.points, hoverTime), 0);
      tooltipLines.push(`${TELEMETRY_EULER_AXIS_LABEL[item.axisKey]}: ${formatFloat(value)}`);

      const y = toY(value);
      ctx.beginPath();
      ctx.fillStyle = item.color;
      ctx.arc(hoverX, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    let nearestNode = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    axisNodes.forEach((node) => {
      const dt = Math.abs(node.time - hoverTime);
      if (dt < nearestDistance) {
        nearestDistance = dt;
        nearestNode = node;
      }
    });
    if (nearestNode) {
      tooltipLines.push(`最近事件: ${nearestNode.name}`);
    }

    drawCanvasTooltip(
      ctx,
      tooltipLines,
      hoverX,
      padTop + 12,
      { minX: 6, minY: 6, maxX: width - 6, maxY: height - 6 },
    );
  }
}

function renderTelemetryCurve() {
  if (!telemetryEditDraft) {
    return;
  }

  if (telemetryTab === "angular") {
    renderTelemetryEulerCurve();
    return;
  }

  const metric = getTelemetryMetricByTab();
  if (!metric) {
    return;
  }

  ensureTelemetryStructure(telemetryEditDraft);

  const curves = telemetryEditDraft.telemetry_editor.curves[metric.key] || { stage1: [], upper: [] };
  const stage1Points = Array.isArray(curves.stage1) ? curves.stage1 : [];
  const upperPoints = Array.isArray(curves.upper) ? curves.upper : [];

  if (dom.telemetryCurveYLabel) {
    dom.telemetryCurveYLabel.textContent = metric.label;
  }
  if (dom.telemetryCurveLegend) {
    dom.telemetryCurveLegend.textContent = telemetrySplitMode.enabled
      ? "蓝色: 一级 | 橙色: 二级及以后"
      : "蓝色: 单曲线";
  }

  const m = telemetryCurveCanvasMetrics();
  const { ctx, width, height, padLeft, padRight, padTop, padBottom } = m;

  ctx.clearRect(0, 0, width, height);

  const { minTime, maxTime } = getTelemetryCurveViewDomain();
  const { minValue, maxValue } = telemetryValueDomain(metric.key);
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const axisNodes = telemetryNodes
    .slice()
    .sort((a, b) => a.time - b.time)
    .filter((node) => node.time >= minTime && node.time <= maxTime);
  const axisGridColor = "rgba(34, 42, 60, 0.22)";
  const axisLabelColor = "rgba(28, 36, 54, 0.88)";

  const toX = (time) => padLeft + ((time - minTime) / (maxTime - minTime)) * plotW;
  const toY = (value) => padTop + ((maxValue - value) / (maxValue - minValue)) * plotH;

  ctx.strokeStyle = axisGridColor;
  ctx.lineWidth = 1;

  for (let i = 0; i <= 6; i += 1) {
    const y = padTop + (i / 6) * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padLeft - 5, y);
    ctx.lineTo(padLeft, y);
    ctx.stroke();

    const value = maxValue - ((maxValue - minValue) * i) / 6;
    ctx.fillStyle = axisLabelColor;
    ctx.font = '11px "Manrope"';
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatFloat(value), padLeft - 10, y);
  }

  axisNodes.forEach((node, index) => {
    const x = toX(node.time);
    ctx.beginPath();
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, height - padBottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, height - padBottom);
    ctx.lineTo(x, height - padBottom + 5);
    ctx.stroke();

    ctx.fillStyle = axisLabelColor;
    ctx.font = '11px "Manrope"';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(formatSignedTime(node.time), x, height - padBottom + 8);

    ctx.textBaseline = "bottom";
    ctx.fillStyle = axisLabelColor;
    const nameY = padTop - 6 - (index % 2) * 14;
    ctx.fillText(shortenLabel(node.name, 10), x, nameY);
  });

  ctx.strokeStyle = "rgba(34, 42, 60, 0.58)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop);
  ctx.lineTo(padLeft, height - padBottom);
  ctx.lineTo(width - padRight, height - padBottom);
  ctx.stroke();

  const stage1CanvasPoints = stage1Points.map((point) => ({ x: toX(point.time), y: toY(point.value) }));
  if (stage1CanvasPoints.length > 0) {
    ctx.strokeStyle = "#4fd2ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawSmoothCurvePath(ctx, stage1CanvasPoints);
    ctx.stroke();

    stage1CanvasPoints.forEach((point, index) => {
      ctx.beginPath();
      const active = telemetryDragState
        && telemetryDragState.metricKey === metric.key
        && telemetryDragState.branch === "stage1"
        && telemetryDragState.index === index;
      ctx.fillStyle = active ? "#ffe07e" : "#4fd2ff";
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (telemetrySplitMode.enabled) {
    const upperCanvasPoints = upperPoints
      .map((point, index) => ({ point, index }))
      .filter(({ index }) => !telemetryNodes[index] || telemetryNodes[index].time >= telemetrySplitMode.separationTime)
      .map(({ point }) => ({ x: toX(point.time), y: toY(point.value) }));
    if (upperCanvasPoints.length > 0) {
      ctx.strokeStyle = "#ffba6e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      drawSmoothCurvePath(ctx, upperCanvasPoints);
      ctx.stroke();

      upperCanvasPoints.forEach((point, index) => {
        ctx.beginPath();
        const active = telemetryDragState
          && telemetryDragState.metricKey === metric.key
          && telemetryDragState.branch === "upper"
          && telemetryDragState.index === index;
        ctx.fillStyle = active ? "#fff4a8" : "#ffba6e";
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  if (telemetryCurveHoverState) {
    const hoverX = Math.max(padLeft, Math.min(width - padRight, telemetryCurveHoverState.x));
    const hoverTime = minTime + ((hoverX - padLeft) / plotW) * (maxTime - minTime);
    const hoverY = evaluateSmoothValueAtX(stage1CanvasPoints, hoverX);
    const stage1Value = Math.max(0, Math.min(maxValue, Math.round((maxValue - ((hoverY - padTop) / plotH) * (maxValue - minValue)) * 1000) / 1000));
    const splitHover = telemetrySplitMode.enabled && hoverTime >= telemetrySplitMode.separationTime;
    const upperCanvasPoints = splitHover
      ? upperPoints
        .map((point, index) => ({ point, index }))
        .filter(({ index }) => !telemetryNodes[index] || telemetryNodes[index].time >= telemetrySplitMode.separationTime)
        .map(({ point }) => ({ x: toX(point.time), y: toY(point.value) }))
      : [];
    const upperValue = splitHover && upperCanvasPoints.length > 0
      ? Math.max(0, Math.min(maxValue, Math.round((maxValue - ((evaluateSmoothValueAtX(upperCanvasPoints, hoverX) - padTop) / plotH) * (maxValue - minValue)) * 1000) / 1000))
      : stage1Value;

    let nearestNode = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    axisNodes.forEach((node) => {
      const dt = Math.abs(node.time - hoverTime);
      if (dt < nearestDistance) {
        nearestDistance = dt;
        nearestNode = node;
      }
    });

    ctx.strokeStyle = "rgba(255,225,132,0.68)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hoverX, padTop);
    ctx.lineTo(hoverX, height - padBottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "#ffe184";
    ctx.arc(hoverX, hoverY, 4, 0, Math.PI * 2);
    ctx.fill();

    const tooltipLines = [
      `${formatSignedTime(hoverTime)}`,
      `${metric.shortLabel} 一级: ${formatFloat(stage1Value)}`,
    ];
    if (splitHover) {
      tooltipLines.push(`${metric.shortLabel} 二级+: ${formatFloat(upperValue)}`);
    }
    if (nearestNode) {
      tooltipLines.push(`最近事件: ${nearestNode.name}`);
    }

    drawCanvasTooltip(
      ctx,
      tooltipLines,
      hoverX,
      hoverY,
      { minX: 6, minY: 6, maxX: width - 6, maxY: height - 6 },
    );
  }
}

function findTelemetryCurvePointAtPosition(x, y) {
  if (!telemetryEditDraft) {
    return null;
  }

  if (telemetryTab === "angular") {
    ensureTelemetryStructure(telemetryEditDraft);
    const m = telemetryCurveCanvasMetrics();
    const { width, height, padLeft, padRight, padTop, padBottom } = m;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const { minTime, maxTime } = getTelemetryCurveViewDomain();
    const { minValue, maxValue } = telemetryEulerValueDomain();

    const toX = (time) => padLeft + ((time - minTime) / (maxTime - minTime)) * plotW;
    const toY = (value) => padTop + ((maxValue - value) / (maxValue - minValue)) * plotH;

    const candidates = [];
    TELEMETRY_EULER_AXES.forEach((axisKey) => {
      const curveKey = getTelemetryEulerAxisCurveKey(axisKey);
      const curves = telemetryEditDraft.telemetry_editor.curves[curveKey] || { stage1: [] };
      (curves.stage1 || []).forEach((point, index) => {
        const dx = toX(point.time) - x;
        const dy = toY(point.value) - y;
        const distance2 = dx * dx + dy * dy;
        if (distance2 <= 81) {
          candidates.push({ metricKey: curveKey, branch: "stage1", index, distance2 });
        }
      });
    });

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => a.distance2 - b.distance2);
    const best = candidates[0];
    return {
      metricKey: best.metricKey,
      branch: best.branch,
      index: best.index,
    };
  }

  const metric = getTelemetryMetricByTab();
  if (!metric) {
    return null;
  }

  ensureTelemetryStructure(telemetryEditDraft);
  const curves = telemetryEditDraft.telemetry_editor.curves[metric.key] || { stage1: [], upper: [] };
  const m = telemetryCurveCanvasMetrics();
  const { width, height, padLeft, padRight, padTop, padBottom } = m;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const { minTime, maxTime } = getTelemetryCurveViewDomain();
  const { minValue, maxValue } = telemetryValueDomain(metric.key);

  const toX = (time) => padLeft + ((time - minTime) / (maxTime - minTime)) * plotW;
  const toY = (value) => padTop + ((maxValue - value) / (maxValue - minValue)) * plotH;

  const candidates = [];
  (curves.stage1 || []).forEach((point, index) => {
    const dx = toX(point.time) - x;
    const dy = toY(point.value) - y;
    const distance2 = dx * dx + dy * dy;
    if (distance2 <= 81) {
      candidates.push({ branch: "stage1", index, distance2 });
    }
  });

  if (telemetrySplitMode.enabled) {
    (curves.upper || []).forEach((point, index) => {
      if (telemetryNodes[index] && telemetryNodes[index].time < telemetrySplitMode.separationTime) {
        return;
      }
      const dx = toX(point.time) - x;
      const dy = toY(point.value) - y;
      const distance2 = dx * dx + dy * dy;
      if (distance2 <= 81) {
        candidates.push({ branch: "upper", index, distance2 });
      }
    });
  }

  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => a.distance2 - b.distance2);
  const best = candidates[0];
  return {
    metricKey: metric.key,
    branch: best.branch,
    index: best.index,
  };
}

function updateTelemetryCurvePointByPointer(clientX, clientY) {
  if (!telemetryDragState || !telemetryEditDraft) {
    return;
  }

  if (isTelemetryEulerCurveKey(telemetryDragState.metricKey)) {
    ensureTelemetryStructure(telemetryEditDraft);
    const curves = telemetryEditDraft.telemetry_editor.curves[telemetryDragState.metricKey];
    const points = curves?.[telemetryDragState.branch];
    if (!Array.isArray(points)) {
      return;
    }

    const currentPoint = points[telemetryDragState.index];
    if (!currentPoint) {
      return;
    }

    const rect = dom.telemetryCurveCanvas.getBoundingClientRect();
    const m = telemetryCurveCanvasMetrics();
    const { width, height, padLeft, padRight, padTop, padBottom } = m;
    const plotW = width - padLeft - padRight;
    const localY = (clientY - rect.top) * (height / rect.height);
    const localX = (clientX - rect.left) * (width / rect.width);
    const clampedX = Math.max(padLeft, Math.min(width - padRight, localX));
    const clampedY = Math.max(padTop, Math.min(height - padBottom, localY));

    const { minValue, maxValue } = telemetryEulerValueDomain();
    const plotH = Math.max(1, height - padTop - padBottom);
    const value = maxValue - ((clampedY - padTop) / plotH) * (maxValue - minValue);
    currentPoint.value = toFloat(value, currentPoint.value);

    if (plotW > 1) {
      const baseDomain = telemetryTimeDomain();
      const baseSpan = baseDomain.maxTime - baseDomain.minTime;
      if (baseSpan > 0) {
        const prevPoint = points[telemetryDragState.index - 1] || null;
        const nextPoint = points[telemetryDragState.index + 1] || null;
        const minBound = prevPoint ? prevPoint.time + 1 : baseDomain.minTime;
        const maxBound = nextPoint ? nextPoint.time - 1 : baseDomain.maxTime;

        const ratio = (clampedX - padLeft) / plotW;
        const rawTime = baseDomain.minTime + ratio * baseSpan;
        if (maxBound >= minBound) {
          currentPoint.time = Math.round(Math.max(minBound, Math.min(maxBound, rawTime)));
        }
      }
    }

    points.sort((a, b) => a.time - b.time);
    telemetryDragState.index = Math.max(0, points.indexOf(currentPoint));

    syncTelemetryEulerNodeValuesFromCurves(telemetryEditDraft);
    telemetryDirty = true;
    syncTelemetryCurvesFromNodeValues(telemetryEditDraft);
    renderTelemetryTable();
    renderTelemetryCurve();
    return;
  }

  const metric = TELEMETRY_METRIC_DEFS.find((item) => item.key === telemetryDragState.metricKey);
  if (!metric) {
    return;
  }

  ensureTelemetryStructure(telemetryEditDraft);
  const curves = telemetryEditDraft.telemetry_editor.curves[metric.key];
  const points = curves?.[telemetryDragState.branch];
  if (!Array.isArray(points)) {
    return;
  }
  const currentPoint = points[telemetryDragState.index];
  if (!currentPoint) {
    return;
  }

  const rect = dom.telemetryCurveCanvas.getBoundingClientRect();
  const m = telemetryCurveCanvasMetrics();
  const { width, height, padLeft, padRight, padTop, padBottom } = m;
  const plotW = width - padLeft - padRight;
  const localY = (clientY - rect.top) * (height / rect.height);
  const localX = (clientX - rect.left) * (width / rect.width);
  const clampedX = Math.max(padLeft, Math.min(width - padRight, localX));
  const clampedY = Math.max(padTop, Math.min(height - padBottom, localY));

  const { minValue, maxValue } = telemetryValueDomain(metric.key);
  const plotH = Math.max(1, height - padTop - padBottom);
  const value = maxValue - ((clampedY - padTop) / plotH) * (maxValue - minValue);
  currentPoint.value = Math.max(0, toFloat(value, currentPoint.value));

  if (plotW > 1) {
    const baseDomain = telemetryTimeDomain();
    const baseSpan = baseDomain.maxTime - baseDomain.minTime;
    if (baseSpan > 0) {
      const prevPoint = points[telemetryDragState.index - 1] || null;
      const nextPoint = points[telemetryDragState.index + 1] || null;
      let minBound = prevPoint ? prevPoint.time + 1 : baseDomain.minTime;
      const maxBound = nextPoint ? nextPoint.time - 1 : baseDomain.maxTime;

      if (telemetrySplitMode.enabled && telemetryDragState.branch === "upper") {
        minBound = Math.max(minBound, telemetrySplitMode.separationTime);
      }

      const ratio = (clampedX - padLeft) / plotW;
      const rawTime = baseDomain.minTime + ratio * baseSpan;
      if (maxBound >= minBound) {
        currentPoint.time = Math.round(Math.max(minBound, Math.min(maxBound, rawTime)));
      }
    }
  }

  points.sort((a, b) => a.time - b.time);
  telemetryDragState.index = Math.max(0, points.indexOf(currentPoint));

  const stage1Points = curves.stage1 || [];
  const upperPoints = telemetrySplitMode.enabled ? (curves.upper || []) : stage1Points;

  for (const node of telemetryNodes) {
    const nodeStore = telemetryEditDraft.telemetry_editor.node_values[node.key];
    const stage1Value = Math.max(0, toFloat(interpolate(stage1Points, node.time), metric.defaultValue));
    const upperValue = Math.max(0, toFloat(interpolate(upperPoints, node.time), stage1Value));
    nodeStore[metric.key].stage1 = stage1Value;
    nodeStore[metric.key].upper = shouldSplitTelemetryAtTime(node.time) ? upperValue : stage1Value;
  }

  telemetryDirty = true;
  syncTelemetryCurvesFromNodeValues(telemetryEditDraft);
  renderTelemetryTable();
  renderTelemetryCurve();
}

function updateTelemetryCurveHoverByPointer(clientX, clientY) {
  if (!dom.telemetryModal || dom.telemetryModal.classList.contains("hidden") || telemetryTab === "list") {
    return;
  }

  const rect = dom.telemetryCurveCanvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const m = telemetryCurveCanvasMetrics();
  const localX = (clientX - rect.left) * (m.width / rect.width);
  const localY = (clientY - rect.top) * (m.height / rect.height);

  telemetryCurveHoverState = { x: localX, y: localY };
  renderTelemetryCurve();
}

function clearTelemetryCurveHover() {
  if (!telemetryCurveHoverState) {
    return;
  }
  telemetryCurveHoverState = null;
  if (dom.telemetryModal && !dom.telemetryModal.classList.contains("hidden") && telemetryTab !== "list") {
    renderTelemetryCurve();
  }
}

function setTelemetryTab(tab) {
  const nextTab = ["list", "altitude", "speed", "accel", "angular"].includes(tab) ? tab : "list";
  telemetryTab = nextTab;

  dom.telemetryListPane.classList.toggle("hidden", telemetryTab !== "list");
  dom.telemetryCurvePane.classList.toggle("hidden", telemetryTab === "list");

  dom.telemetryTabListBtn.classList.toggle("active", telemetryTab === "list");
  dom.telemetryTabAltitudeBtn.classList.toggle("active", telemetryTab === "altitude");
  dom.telemetryTabSpeedBtn.classList.toggle("active", telemetryTab === "speed");
  dom.telemetryTabAccelBtn.classList.toggle("active", telemetryTab === "accel");
  if (dom.telemetryTabAngularBtn) {
    dom.telemetryTabAngularBtn.classList.toggle("active", telemetryTab === "angular");
  }

  if (telemetryTab !== "list") {
    renderTelemetryCurve();
    requestAnimationFrame(() => {
      renderTelemetryCurve();
      setTimeout(() => {
        if (!dom.telemetryModal.classList.contains("hidden") && telemetryTab !== "list") {
          renderTelemetryCurve();
        }
      }, 80);
    });
  } else {
    telemetryCurveHoverState = null;
  }
}

function openTelemetryModal(source) {
  const modelName = dom.modelSelect.value;
  if (!modelName) {
    toast("请先选择型号", "error");
    return;
  }

  if (source === "config" && configDraft) {
    telemetryEditDraft = deepClone(configDraft);
    telemetryEditSource = "config";
  } else {
    const fromModel = getDraftFromModel(modelName);
    if (!fromModel) {
      toast("当前型号配置不存在", "error");
      return;
    }
    telemetryEditDraft = fromModel;
    telemetryEditSource = "model";
  }
  telemetryEditModelName = modelName;

  ensureTelemetryStructure(telemetryEditDraft);
  renderTelemetryTable();
  setTelemetryTab("list");

  dom.telemetryModal.classList.remove("hidden");
  telemetryCurveZoomRange = null;
  telemetrySnapshot = makeTelemetrySignature(telemetryEditDraft);
  telemetryDirty = false;
}

function closeTelemetryModal(force = false) {
  if (!force && makeTelemetrySignature(telemetryEditDraft) !== telemetrySnapshot) {
    openUnsavedConfirmDialog({
      title: "遥测配置尚未保存",
      message: "当前遥测编辑有未保存修改，是否保存后关闭？",
      onSave: () => saveTelemetryModal(),
      onDiscard: () => {
        telemetryDirty = false;
        return closeTelemetryModal(true);
      },
    });
    return false;
  }

  dom.telemetryModal.classList.add("hidden");
  telemetryDragState = null;
  telemetryCurveHoverState = null;
  telemetryCurveZoomRange = null;
  return true;
}

async function saveTelemetryModal() {
  if (!telemetryEditDraft) {
    return false;
  }

  if (telemetryEditSource === "config" && configDraft) {
    configDraft.telemetry_editor = deepClone(telemetryEditDraft.telemetry_editor);
    dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
    refreshConfigDirtyState();
    dom.saveConfigModalBtn.disabled = false;
    showConfigValidation("遥测配置已更新，请保存型号配置以落盘。", false);
    toast("遥测配置已写入当前型号草稿", "success");
    telemetrySnapshot = makeTelemetrySignature(telemetryEditDraft);
    telemetryDirty = false;
    closeTelemetryModal(true);
    return true;
  }

  const payload = normalizeDraft(telemetryEditDraft, telemetryEditModelName);
  payload.name = telemetryEditModelName;

  const res = await adminFetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || "保存遥测配置失败", "error");
    return false;
  }

  modelsCache[payload.name] = payload;
  toast("遥测配置已保存", "success");
  telemetrySnapshot = makeTelemetrySignature(telemetryEditDraft);
  telemetryDirty = false;
  closeTelemetryModal(true);
  return true;
}

let engineEditDraft = null;
let engineEditSource = "";
let engineEditModelName = "";
let engineDirty = false;
let engineListNodes = [];
let engineSelectedNodeKey = "";
let engineSelectedStageIndex = 1;
let engineSelectedPresetId = "";
let engineNodeConfigDraft = null;
let engineNodeEditorDirty = false;
let engineEventsBound = false;
let enginePresetLibrary = null;

function buildEngineListNodes(draft) {
  const events = (Array.isArray(draft?.events) ? draft.events : [])
    .map((event, index) => ({
      key: `event:${String(event?.id || `evt_${index + 1}`)}`,
      id: String(event?.id || `evt_${index + 1}`),
      time: toInt(event?.time, 0),
      name: String(event?.name || "未命名事件"),
    }))
    .sort((a, b) => (a.time - b.time) || a.name.localeCompare(b.name, "zh-CN"));

  const ignitionEvent = events.find((event) => event.name.includes("点火"));
  const startTime = ignitionEvent ? ignitionEvent.time : 0;
  const nodes = events.filter((event) => event.time >= startTime);

  if (nodes.length === 0 || (!ignitionEvent && !nodes.some((node) => node.time === 0))) {
    nodes.unshift({
      key: "event:__engine_t0__",
      id: "__engine_t0__",
      time: 0,
      name: "T0",
    });
  }

  return nodes.sort((a, b) => (a.time - b.time) || a.name.localeCompare(b.name, "zh-CN"));
}

function sanitizePresetId(rawId, fallback = "") {
  return String(rawId || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "");
}

function normalizeEnginePresetNodeRaw(rawNode, fallbackId = 0) {
  return {
    id: Math.max(0, toInt(rawNode?.id, fallbackId)),
    x: Number(rawNode?.x || 0),
    y: Number(rawNode?.y || 0),
    r: Math.max(2, Number(rawNode?.r || 10)),
  };
}

function normalizeBackgroundCircleRaw(rawCircle, fallbackId = 0) {
  return {
    id: String(rawCircle?.id || `bg_${fallbackId}`).trim() || `bg_${fallbackId}`,
    x: Number(rawCircle?.x || 0),
    y: Number(rawCircle?.y || 0),
    r: Math.max(2, Number(rawCircle?.r || 10)),
    fill: String(rawCircle?.fill ?? "none"),
    stroke: String(rawCircle?.stroke ?? "rgba(128,128,128,0.3)"),
    stroke_width: Math.max(0, Number(rawCircle?.stroke_width ?? 1.5)),
  };
}

function normalizePresetLibrary(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sourcePresets = Array.isArray(source.presets) ? source.presets : [];
  const presets = sourcePresets.map((preset, index) => {
    const id = sanitizePresetId(preset?.id, `preset_${index + 1}`) || `preset_${index + 1}`;
    const nodes = (Array.isArray(preset?.engines) ? preset.engines : [])
      .map((item, nodeIndex) => normalizeEnginePresetNodeRaw(item, nodeIndex));
    const deduped = new Map();
    nodes.forEach((node) => {
      deduped.set(node.id, node);
    });
    const engines = Array.from(deduped.values()).sort((a, b) => a.id - b.id);
    const fallbackEngines = engines.length > 0 ? engines : [{ id: 0, x: 0, y: 0, r: 10 }];

    const rawBackgroundCircles = Array.isArray(preset?.background_circles) ? preset.background_circles : [];
    const dedupedBackgroundCircles = new Map();
    rawBackgroundCircles
      .map((item, bgIndex) => normalizeBackgroundCircleRaw(item, bgIndex))
      .forEach((item) => {
        dedupedBackgroundCircles.set(item.id, item);
      });

    return {
      id,
      name: String(preset?.name || `预设 ${index + 1}`).trim() || `预设 ${index + 1}`,
      engine_count: Math.max(fallbackEngines.length, toInt(preset?.engine_count, fallbackEngines.length)),
      background_circles: Array.from(dedupedBackgroundCircles.values()),
      engines: fallbackEngines,
    };
  });

  if (presets.length === 0) {
    return {
      version: 1,
      presets: [
        {
          id: "preset_default",
          name: "默认预设",
          engine_count: 1,
          background_circles: [],
          engines: [{ id: 0, x: 0, y: 0, r: 10 }],
        },
      ],
    };
  }

  return { version: 1, presets };
}

function getPresetLibrary() {
  if (enginePresetLibrary && Array.isArray(enginePresetLibrary.presets) && enginePresetLibrary.presets.length > 0) {
    return enginePresetLibrary;
  }
  return normalizePresetLibrary(null);
}

function getPresetById(presetId) {
  const library = getPresetLibrary();
  const normalizedId = sanitizePresetId(presetId);
  return library.presets.find((preset) => preset.id === normalizedId) || library.presets[0] || null;
}

function normalizeEngineStateList(rawStates = []) {
  const list = Array.isArray(rawStates) ? rawStates : [];
  const deduped = new Map();
  list.forEach((item, index) => {
    const id = Math.max(0, toInt(item?.id, index));
    deduped.set(id, { id, enabled: Boolean(item?.enabled) });
  });
  return Array.from(deduped.values()).sort((a, b) => a.id - b.id);
}

function guessEnginePresetIdByModelName(modelName) {
  const text = String(modelName || "").toLowerCase();
  if (text.includes("falcon") && text.includes("9")) {
    return "falcon9_stage1";
  }
  if (text.includes("长八") || text.includes("cz-7") || text.includes("cz7")) {
    return "cz7a_stage1";
  }
  return "falcon9_stage1";
}

function buildDefaultEngineStates(preset) {
  const nodes = Array.isArray(preset?.engines) ? preset.engines : [];
  return nodes.map((node) => ({ id: node.id, enabled: false }));
}

function mergeEngineStatesWithPreset(preset, rawStates = []) {
  const defaultStates = buildDefaultEngineStates(preset);
  const source = normalizeEngineStateList(rawStates);
  const sourceMap = new Map(source.map((item) => [item.id, item]));
  return defaultStates.map((base) => ({
    id: base.id,
    enabled: Boolean(sourceMap.get(base.id)?.enabled),
  }));
}

function ensureEnginePresetLibraryLoaded() {
  if (enginePresetLibrary && Array.isArray(enginePresetLibrary.presets) && enginePresetLibrary.presets.length > 0) {
    return Promise.resolve(enginePresetLibrary);
  }

  return adminFetch("/api/engine_presets", { cache: "no-store" })
    .then((res) => res.json())
    .then((data) => {
      if (!data?.success) {
        throw new Error(data?.message || "发动机预设加载失败");
      }
      enginePresetLibrary = normalizePresetLibrary(data);
      return enginePresetLibrary;
    });
}

const ENGINE_STAGE_TEXT = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

function getEngineStageCountFromDraft(draft) {
  return Math.max(1, toInt(draft?.rocket_meta?.stage_count, 1));
}

function formatEngineStageLabel(stageIndex) {
  const index = Math.max(1, toInt(stageIndex, 1));
  const text = ENGINE_STAGE_TEXT[index] || String(index);
  return `${text}级`;
}

function normalizeSingleEngineStageConfig(rawConfig, fallbackPreset) {
  const preset = getPresetById(rawConfig?.preset_id) || fallbackPreset;
  const states = mergeEngineStatesWithPreset(preset, rawConfig?.engine_states || rawConfig?.active_ids);
  return {
    preset_id: preset.id,
    engine_states: states,
  };
}

function pickRawStageConfig(existingConfig, stageIndex) {
  const source = existingConfig && typeof existingConfig === "object" ? existingConfig : null;
  if (!source) {
    return null;
  }

  const stageConfigs = source.stage_configs;
  if (Array.isArray(stageConfigs)) {
    return stageConfigs.find((item) => toInt(item?.stage_index, 0) === stageIndex)
      || stageConfigs[stageIndex - 1]
      || null;
  }

  if (stageConfigs && typeof stageConfigs === "object") {
    return stageConfigs[`stage_${stageIndex}`]
      || stageConfigs[`stage${stageIndex}`]
      || stageConfigs[String(stageIndex)]
      || null;
  }

  if (stageIndex === 1 && (source.preset_id || source.engine_states || source.active_ids)) {
    return source;
  }

  return null;
}

function syncNodeLegacyConfig(nodeConfig) {
  const firstStage = Array.isArray(nodeConfig?.stage_configs) && nodeConfig.stage_configs.length > 0
    ? nodeConfig.stage_configs[0]
    : null;
  if (!firstStage) {
    nodeConfig.preset_id = "";
    nodeConfig.engine_states = [];
    return nodeConfig;
  }

  nodeConfig.preset_id = String(firstStage.preset_id || "");
  nodeConfig.engine_states = normalizeEngineStateList(firstStage.engine_states);
  return nodeConfig;
}

function normalizeEngineNodeConfig(existingConfig, stageCount, fallbackPreset) {
  const source = existingConfig && typeof existingConfig === "object" ? existingConfig : {};
  const baseConfig = normalizeSingleEngineStageConfig(source, fallbackPreset);
  const stageConfigs = [];

  for (let stageIndex = 1; stageIndex <= stageCount; stageIndex += 1) {
    const rawStage = pickRawStageConfig(source, stageIndex);
    const normalized = normalizeSingleEngineStageConfig(rawStage || baseConfig, fallbackPreset);
    stageConfigs.push({
      stage_index: stageIndex,
      preset_id: normalized.preset_id,
      engine_states: normalized.engine_states,
    });
  }

  return syncNodeLegacyConfig({
    stage_configs: stageConfigs,
  });
}

function ensureEngineLayoutStructure(draft) {
  if (!draft.engine_layout || typeof draft.engine_layout !== "object") {
    draft.engine_layout = { version: 4, node_configs: {} };
  }
  if (!draft.engine_layout.node_configs || typeof draft.engine_layout.node_configs !== "object") {
    draft.engine_layout.node_configs = {};
  }

  const library = getPresetLibrary();
  const guessedPreset = getPresetById(guessEnginePresetIdByModelName(engineEditModelName));
  const fallbackPreset = guessedPreset || library.presets[0];
  const stageCount = getEngineStageCountFromDraft(draft);

  engineListNodes = buildEngineListNodes(draft);

  for (const node of engineListNodes) {
    const existing = draft.engine_layout.node_configs[node.key] || {};
    draft.engine_layout.node_configs[node.key] = normalizeEngineNodeConfig(existing, stageCount, fallbackPreset);
  }
}

function getEngineNodeByKey(nodeKey) {
  return engineListNodes.find((node) => node.key === nodeKey) || null;
}

function getEnginePresetById(presetId) {
  return getPresetById(presetId);
}

function getEngineNodeConfig(nodeKey) {
  if (!engineEditDraft) {
    return null;
  }
  ensureEngineLayoutStructure(engineEditDraft);
  const fallbackPreset = getPresetLibrary().presets[0];
  const stageCount = getEngineStageCountFromDraft(engineEditDraft);
  const existing = engineEditDraft.engine_layout.node_configs[nodeKey] || {};
  const normalized = normalizeEngineNodeConfig(existing, stageCount, fallbackPreset);
  engineEditDraft.engine_layout.node_configs[nodeKey] = normalized;
  return normalized;
}

function getEngineStageConfig(nodeKey, stageIndex) {
  const nodeConfig = getEngineNodeConfig(nodeKey);
  if (!nodeConfig) {
    return null;
  }

  const normalizedStage = Math.max(1, toInt(stageIndex, 1));
  const stageConfigs = Array.isArray(nodeConfig.stage_configs) ? nodeConfig.stage_configs : [];
  const found = stageConfigs.find((item) => toInt(item?.stage_index, 0) === normalizedStage)
    || stageConfigs[normalizedStage - 1]
    || stageConfigs[0]
    || null;

  if (!found) {
    return null;
  }

  return {
    stage_index: normalizedStage,
    preset_id: String(found.preset_id || ""),
    engine_states: normalizeEngineStateList(found.engine_states),
  };
}
function renderEngineSvgMarkup(preset, engineStates = [], options = {}) {
  const width = Math.max(120, toInt(options.width, 420));
  const height = Math.max(54, toInt(options.height, 170));
  const compact = Boolean(options.compact);
  const interactive = Boolean(options.interactive);
  const forceBlackBackground = options.blackBackground !== false;
  const baseNodes = Array.isArray(preset?.engines) ? preset.engines : [];
  const baseBackgroundCircles = Array.isArray(preset?.background_circles) ? preset.background_circles : [];
  const nodes = baseNodes.length > 0
    ? baseNodes.map((item) => normalizeEnginePresetNodeRaw(item, 0))
    : [{ id: 0, x: 0, y: 0, r: 10 }];

  const backgroundCircles = baseBackgroundCircles
    .map((item, index) => normalizeBackgroundCircleRaw(item, index));

  const allCircles = [
    ...backgroundCircles.map((item) => ({ x: item.x, y: item.y, r: item.r })),
    ...nodes.map((item) => ({ x: item.x, y: item.y, r: item.r })),
  ];

  const minX = Math.min(...allCircles.map((item) => item.x - item.r));
  const maxX = Math.max(...allCircles.map((item) => item.x + item.r));
  const minY = Math.min(...allCircles.map((item) => item.y - item.r));
  const maxY = Math.max(...allCircles.map((item) => item.y + item.r));

  const spanW = Math.max(1, maxX - minX);
  const spanH = Math.max(1, maxY - minY);
  const padding = compact ? 8 : 12;
  const scale = Math.min((width - padding * 2) / spanW, (height - padding * 2) / spanH);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const stateMap = new Map((Array.isArray(engineStates) ? engineStates : []).map((item) => [toInt(item?.id, -1), Boolean(item?.enabled)]));

  const backgroundMarkup = backgroundCircles
    .map((item) => {
      const px = (width / 2) + (item.x - cx) * scale;
      const py = (height / 2) + (item.y - cy) * scale;
      const pr = Math.max(2, item.r * scale);
      const strokeWidth = Math.max(0, item.stroke_width * scale);
      return `<circle cx=\"${px.toFixed(2)}\" cy=\"${py.toFixed(2)}\" r=\"${pr.toFixed(2)}\" fill=\"${item.fill}\" stroke=\"${item.stroke}\" stroke-width=\"${strokeWidth.toFixed(2)}\" />`;
    })
    .join("");

  const nodesMarkup = nodes
    .map((point) => {
      const active = stateMap.get(point.id) === true;
      const px = (width / 2) + (point.x - cx) * scale;
      const py = (height / 2) + (point.y - cy) * scale;
      const pr = Math.max(3, point.r * scale);
      const baseFill = active ? "rgba(247,248,250,0.96)" : "rgba(89,97,116,0.66)";
      const baseStroke = active ? "rgba(255,255,255,0.98)" : "rgba(132,142,162,0.84)";
      const cls = active ? "engine-node active" : "engine-node";
      const dataAttr = interactive ? ` data-engine-id=\"${point.id}\"` : "";
      return `<circle class=\"${cls}\"${dataAttr} cx=\"${px.toFixed(2)}\" cy=\"${py.toFixed(2)}\" r=\"${pr.toFixed(2)}\" fill=\"${baseFill}\" stroke=\"${baseStroke}\" stroke-width=\"1.4\" />`;
    })
    .join("");

  const baseRect = forceBlackBackground
    ? `<rect x=\"0\" y=\"0\" width=\"${width}\" height=\"${height}\" fill=\"#000\" />`
    : "";

  return `<svg viewBox=\"0 0 ${width} ${height}\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"发动机预览\">\n    ${baseRect}\n    ${backgroundMarkup}\n    ${nodesMarkup}\n  </svg>`;
}

function renderEnginePresetItems() {
  if (!dom.enginePresetItems) {
    return;
  }

  dom.enginePresetItems.innerHTML = "";
  const presets = getPresetLibrary().presets;
  presets.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "engine-preset-item";
    btn.classList.toggle("active", preset.id === engineSelectedPresetId);
    btn.textContent = `${preset.name} (${preset.engine_count})`;
    btn.addEventListener("click", () => {
      if (engineSelectedPresetId === preset.id) {
        return;
      }
      engineSelectedPresetId = preset.id;
      if (engineNodeConfigDraft) {
        engineNodeConfigDraft.preset_id = preset.id;
        engineNodeConfigDraft.engine_states = buildDefaultEngineStates(preset);
        engineNodeEditorDirty = true;
      }
      renderEnginePresetItems();
      renderEnginePresetEditor();
    });
    dom.enginePresetItems.appendChild(btn);
  });
}

function renderEnginePresetEditor() {
  if (!engineEditDraft || !dom.enginePresetPreview) {
    return;
  }

  const node = getEngineNodeByKey(engineSelectedNodeKey);
  const preset = getEnginePresetById(engineSelectedPresetId) || getPresetLibrary().presets[0];
  if (!preset) {
    return;
  }

  engineSelectedPresetId = preset.id;

  if (dom.engineCurrentNodeLabel) {
    if (node) {
      const signed = `T${node.time >= 0 ? "+" : ""}${node.time}`;
      dom.engineCurrentNodeLabel.textContent = `当前节点：${node.name} (${signed})`;
    } else {
      dom.engineCurrentNodeLabel.textContent = "当前节点：-";
    }
  }

  if (dom.engineNodeStageLabel) {
    dom.engineNodeStageLabel.textContent = `编辑 ${formatEngineStageLabel(engineSelectedStageIndex)}`;
  }

  const states = Array.isArray(engineNodeConfigDraft?.engine_states) ? engineNodeConfigDraft.engine_states : buildDefaultEngineStates(preset);
  dom.enginePresetPreview.innerHTML = renderEngineSvgMarkup(preset, states, {
    width: 420,
    height: 170,
    interactive: true,
  });

  dom.enginePresetPreview.querySelectorAll("[data-engine-id]").forEach((nodeEl) => {
    nodeEl.addEventListener("click", () => {
      if (!engineNodeConfigDraft) {
        return;
      }
      const engineId = toInt(nodeEl.getAttribute("data-engine-id"), -1);
      if (engineId < 0) {
        return;
      }

      const state = engineNodeConfigDraft.engine_states.find((item) => item.id === engineId);
      if (!state) {
        return;
      }

      state.enabled = !state.enabled;
      engineNodeEditorDirty = true;
      renderEnginePresetEditor();
    });
  });
}

function renderEngineTable() {
  if (!engineEditDraft || !dom.engineTable) {
    return;
  }

  ensureEngineLayoutStructure(engineEditDraft);
  const stageCount = getEngineStageCountFromDraft(engineEditDraft);

  dom.engineTable.innerHTML = "";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const headers = [
    { text: "节点", className: "engine-node-col" },
    { text: "事件", className: "engine-event-col" },
  ];

  for (let stageIndex = 1; stageIndex <= stageCount; stageIndex += 1) {
    headers.push({
      text: formatEngineStageLabel(stageIndex),
      className: "engine-stage-col",
    });
  }

  headers.forEach((item) => {
    const th = document.createElement("th");
    th.textContent = item.text;
    th.className = item.className;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  dom.engineTable.appendChild(thead);

  const tbody = document.createElement("tbody");
  engineListNodes.forEach((node) => {
    const tr = document.createElement("tr");

    const tdNode = document.createElement("td");
    tdNode.className = "engine-node-col";
    tdNode.textContent = `T${node.time >= 0 ? "+" : ""}${node.time}`;
    tr.appendChild(tdNode);

    const tdEvent = document.createElement("td");
    tdEvent.className = "engine-event-col";
    tdEvent.textContent = node.name;
    tr.appendChild(tdEvent);

    for (let stageIndex = 1; stageIndex <= stageCount; stageIndex += 1) {
      const stageConfig = getEngineStageConfig(node.key, stageIndex);
      const preset = getEnginePresetById(stageConfig?.preset_id) || getPresetLibrary().presets[0];
      const states = mergeEngineStatesWithPreset(preset, stageConfig?.engine_states || []);

      const tdStage = document.createElement("td");
      tdStage.className = "engine-stage-col";

      const previewBtn = document.createElement("button");
      previewBtn.type = "button";
      previewBtn.className = "engine-stage-preview-btn";
      previewBtn.setAttribute("aria-label", `${node.name} ${formatEngineStageLabel(stageIndex)} 发动机配置`);
      previewBtn.title = `${node.name} · ${formatEngineStageLabel(stageIndex)}（点击编辑）`;

      const preview = document.createElement("div");
      preview.className = "engine-row-preview";
      preview.innerHTML = renderEngineSvgMarkup(preset, states, {
        width: 170,
        height: 54,
        compact: true,
        blackBackground: false,
      });

      previewBtn.appendChild(preview);
      previewBtn.addEventListener("click", () => {
        openEngineNodeEditor(node.key, stageIndex);
      });

      tdStage.appendChild(previewBtn);
      tr.appendChild(tdStage);
    }

    tbody.appendChild(tr);
  });

  dom.engineTable.appendChild(tbody);
}

function ensureEngineSelection() {
  if (!engineEditDraft) {
    return;
  }

  ensureEngineLayoutStructure(engineEditDraft);
  if (!engineSelectedNodeKey || !getEngineNodeByKey(engineSelectedNodeKey)) {
    engineSelectedNodeKey = engineListNodes[0]?.key || "";
  }

  const stageCount = getEngineStageCountFromDraft(engineEditDraft);
  engineSelectedStageIndex = Math.max(1, Math.min(stageCount, toInt(engineSelectedStageIndex, 1)));
}

function setAllEngineState(enabled) {
  if (!engineNodeConfigDraft) {
    return;
  }
  engineNodeConfigDraft.engine_states = engineNodeConfigDraft.engine_states.map((state) => ({
    id: state.id,
    enabled: Boolean(enabled),
  }));
  engineNodeEditorDirty = true;
  renderEnginePresetEditor();
}

function openEngineNodeEditor(nodeKey, stageIndex) {
  if (!engineEditDraft || !nodeKey) {
    return;
  }

  ensureEngineLayoutStructure(engineEditDraft);
  const node = getEngineNodeByKey(nodeKey);
  if (!node) {
    return;
  }

  const stageCount = getEngineStageCountFromDraft(engineEditDraft);
  const normalizedStage = Math.max(1, Math.min(stageCount, toInt(stageIndex, 1)));
  const stageConfig = getEngineStageConfig(nodeKey, normalizedStage);
  if (!stageConfig) {
    return;
  }

  const preset = getEnginePresetById(stageConfig.preset_id) || getPresetLibrary().presets[0];

  engineSelectedNodeKey = nodeKey;
  engineSelectedStageIndex = normalizedStage;
  engineSelectedPresetId = preset.id;
  engineNodeConfigDraft = {
    stage_index: normalizedStage,
    preset_id: preset.id,
    engine_states: mergeEngineStatesWithPreset(preset, stageConfig.engine_states),
  };
  engineNodeEditorDirty = false;

  renderEnginePresetItems();
  renderEnginePresetEditor();
  if (dom.engineNodeEditorModal) {
    dom.engineNodeEditorModal.classList.remove("hidden");
  }
}

function closeEngineNodeEditor(force = false) {
  if (!force && engineNodeEditorDirty) {
    openUnsavedConfirmDialog({
      title: "节点配置尚未保存",
      message: "当前节点预览改动尚未保存，是否保存后关闭？",
      onSave: () => saveEngineNodeConfig(),
      onDiscard: () => {
        closeEngineNodeEditor(true);
        return true;
      },
    });
    return false;
  }

  if (dom.engineNodeEditorModal) {
    dom.engineNodeEditorModal.classList.add("hidden");
  }
  engineNodeConfigDraft = null;
  engineNodeEditorDirty = false;
  return true;
}

function saveEngineNodeConfig() {
  if (!engineEditDraft || !engineSelectedNodeKey || !engineNodeConfigDraft) {
    return false;
  }

  const nodeConfig = getEngineNodeConfig(engineSelectedNodeKey);
  if (!nodeConfig) {
    return false;
  }

  const stageIndex = Math.max(1, toInt(engineSelectedStageIndex, 1));
  const preset = getEnginePresetById(engineNodeConfigDraft.preset_id) || getPresetLibrary().presets[0];
  const states = mergeEngineStatesWithPreset(preset, engineNodeConfigDraft.engine_states || []);
  const stageConfigs = Array.isArray(nodeConfig.stage_configs) ? nodeConfig.stage_configs : [];
  const stageConfigIndex = Math.max(0, stageIndex - 1);
  const prevStageConfig = stageConfigs[stageConfigIndex] || {};

  const nextStageConfig = {
    stage_index: stageIndex,
    preset_id: preset.id,
    engine_states: states,
  };

  stageConfigs[stageConfigIndex] = nextStageConfig;
  nodeConfig.stage_configs = stageConfigs;
  syncNodeLegacyConfig(nodeConfig);
  engineEditDraft.engine_layout.node_configs[engineSelectedNodeKey] = nodeConfig;

  if (stableSerialize(prevStageConfig) !== stableSerialize(nextStageConfig)) {
    engineDirty = true;
  }

  engineNodeEditorDirty = false;
  renderEngineTable();
  closeEngineNodeEditor(true);
  toast("节点发动机配置已保存", "success");
  return true;
}

function ensureEngineEventsBound() {
  if (engineEventsBound) {
    return;
  }
  engineEventsBound = true;

  if (dom.engineAllOnBtn) {
    dom.engineAllOnBtn.addEventListener("click", () => setAllEngineState(true));
  }
  if (dom.engineAllOffBtn) {
    dom.engineAllOffBtn.addEventListener("click", () => setAllEngineState(false));
  }

  if (dom.engineNodeEditorBackdrop) {
    dom.engineNodeEditorBackdrop.addEventListener("click", closeEngineNodeEditor);
  }
  if (dom.closeEngineNodeEditorBtn) {
    dom.closeEngineNodeEditorBtn.addEventListener("click", closeEngineNodeEditor);
  }

  if (dom.saveEngineNodeConfigBtn) {
    dom.saveEngineNodeConfigBtn.addEventListener("click", saveEngineNodeConfig);
  }

  if (dom.saveEngineLayoutBtn) {
    dom.saveEngineLayoutBtn.addEventListener("click", () => {
      saveEngineLayoutModal().catch((error) => toast(error.message || "保存发动机配置失败", "error"));
    });
  }
}

async function openEngineLayoutEditorModal(source = "model") {
  const modelName = dom.modelSelect?.value;
  if (!modelName) {
    toast("请先选择型号", "error");
    return;
  }

  try {
    await ensureEnginePresetLibraryLoaded();
  } catch (error) {
    toast(error.message || "发动机预设加载失败", "error");
    return;
  }

  ensureEngineEventsBound();

  if (source === "config" && configDraft) {
    engineEditDraft = deepClone(configDraft);
    engineEditSource = "config";
  } else {
    const fromModel = getDraftFromModel(modelName);
    if (!fromModel) {
      toast("当前型号配置不存在", "error");
      return;
    }
    engineEditDraft = fromModel;
    engineEditSource = "model";
  }

  engineEditModelName = modelName;
  ensureEngineLayoutStructure(engineEditDraft);
  ensureEngineSelection();

  renderEngineTable();
  closeEngineNodeEditor(true);

  if (dom.engineLayoutHint) {
    const stageCount = getEngineStageCountFromDraft(engineEditDraft);
    const hasIgnition = (Array.isArray(engineEditDraft.events) ? engineEditDraft.events : []).some((event) => String(event?.name || "").includes("点火"));
    dom.engineLayoutHint.textContent = hasIgnition
      ? `仅显示点火及之后节点；每个节点包含 ${stageCount} 级发动机预览。`
      : `未检测到“点火”事件，已从 T0 开始列出节点；每个节点包含 ${stageCount} 级发动机预览。`;
  }

  dom.engineLayoutModal.classList.remove("hidden");
  engineLayoutSnapshot = makeEngineLayoutSignature(engineEditDraft);
  engineDirty = false;
}

function closeEngineLayoutEditorModal(force = false) {
  if (!force && makeEngineLayoutSignature(engineEditDraft) !== engineLayoutSnapshot) {
    openUnsavedConfirmDialog({
      title: "发动机配置尚未保存",
      message: "当前发动机编辑有未保存修改，是否保存后关闭？",
      onSave: () => saveEngineLayoutModal(),
      onDiscard: () => {
        engineDirty = false;
        return closeEngineLayoutEditorModal(true);
      },
    });
    return false;
  }

  dom.engineLayoutModal.classList.add("hidden");
  closeEngineNodeEditor(true);
  return true;
}

async function saveEngineLayoutModal() {
  if (!engineEditDraft) {
    return false;
  }

  if (engineEditSource === "config" && configDraft) {
    configDraft.engine_layout = deepClone(engineEditDraft.engine_layout);
    dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
    refreshConfigDirtyState();
    dom.saveConfigModalBtn.disabled = false;
    showConfigValidation("发动机配置已更新，请保存型号配置以落盘。", false);
    toast("发动机配置已写入当前型号草稿", "success");
    engineLayoutSnapshot = makeEngineLayoutSignature(engineEditDraft);
    engineDirty = false;
    closeEngineLayoutEditorModal(true);
    return true;
  }

  const payload = normalizeDraft(engineEditDraft, engineEditModelName);
  payload.name = engineEditModelName;

  const res = await adminFetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || "保存发动机配置失败", "error");
    return false;
  }

  modelsCache[payload.name] = payload;
  toast("发动机配置已保存", "success");
  engineLayoutSnapshot = makeEngineLayoutSignature(engineEditDraft);
  engineDirty = false;
  closeEngineLayoutEditorModal(true);
  return true;
}
