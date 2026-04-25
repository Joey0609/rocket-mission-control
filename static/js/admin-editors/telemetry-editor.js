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

function startTelemetryCurvePan(clientX, clientY) {
  if (!dom.telemetryModal || dom.telemetryModal.classList.contains("hidden") || telemetryTab === "list") {
    return false;
  }

  const baseDomain = telemetryTimeDomain();
  const currentDomain = getTelemetryCurveViewDomain();
  const activeRange = normalizeTimeZoomRange(baseDomain, currentDomain);
  if (!activeRange) {
    return false;
  }

  const rect = dom.telemetryCurveCanvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const m = telemetryCurveCanvasMetrics();
  const plotW = m.width - m.padLeft - m.padRight;
  if (plotW <= 10) {
    return false;
  }

  const localY = (clientY - rect.top) * (m.height / rect.height);
  if (localY < m.padTop || localY > (m.height - m.padBottom)) {
    return false;
  }

  telemetryCurvePanState = {
    startClientX: clientX,
    baseDomain,
    startRange: activeRange,
    plotW,
  };
  dom.telemetryCurveCanvas.style.cursor = "grabbing";
  return true;
}

function updateTelemetryCurvePanByPointer(clientX) {
  if (!telemetryCurvePanState) {
    return;
  }

  const span = telemetryCurvePanState.startRange.maxTime - telemetryCurvePanState.startRange.minTime;
  if (!Number.isFinite(span) || span <= 0) {
    return;
  }

  const deltaPx = clientX - telemetryCurvePanState.startClientX;
  const deltaTime = (deltaPx / telemetryCurvePanState.plotW) * span;

  let minTime = telemetryCurvePanState.startRange.minTime - deltaTime;
  let maxTime = telemetryCurvePanState.startRange.maxTime - deltaTime;

  const baseMin = telemetryCurvePanState.baseDomain.minTime;
  const baseMax = telemetryCurvePanState.baseDomain.maxTime;
  if (minTime < baseMin) {
    maxTime += (baseMin - minTime);
    minTime = baseMin;
  }
  if (maxTime > baseMax) {
    minTime -= (maxTime - baseMax);
    maxTime = baseMax;
  }

  telemetryCurveZoomRange = normalizeTimeZoomRange(telemetryCurvePanState.baseDomain, { minTime, maxTime });
  renderTelemetryCurve();
}

function stopTelemetryCurvePan() {
  if (!telemetryCurvePanState) {
    return;
  }
  telemetryCurvePanState = null;
  if (dom.telemetryCurveCanvas) {
    dom.telemetryCurveCanvas.style.cursor = "";
  }
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
    const { width, height, padTop, padBottom } = m;
    const localY = (clientY - rect.top) * (height / rect.height);
    const clampedY = Math.max(padTop, Math.min(height - padBottom, localY));

    const { minValue, maxValue } = telemetryEulerValueDomain();
    const plotH = Math.max(1, height - padTop - padBottom);
    const value = maxValue - ((clampedY - padTop) / plotH) * (maxValue - minValue);
    currentPoint.value = toFloat(value, currentPoint.value);

    points.sort((a, b) => a.time - b.time);
    telemetryDragState.index = Math.max(0, points.indexOf(currentPoint));

    syncTelemetryEulerNodeValuesFromCurves(telemetryEditDraft);
    telemetryDirty = true;
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
  const { width, height, padTop, padBottom } = m;
  const localY = (clientY - rect.top) * (height / rect.height);
  const clampedY = Math.max(padTop, Math.min(height - padBottom, localY));

  const { minValue, maxValue } = telemetryValueDomain(metric.key);
  const plotH = Math.max(1, height - padTop - padBottom);
  const value = maxValue - ((clampedY - padTop) / plotH) * (maxValue - minValue);
  currentPoint.value = Math.max(0, toFloat(value, currentPoint.value));

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
    stopTelemetryCurvePan();
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
  stopTelemetryCurvePan();
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

  const savedModel = data?.model && typeof data.model === "object"
    ? normalizeDraft(data.model, payload.name)
    : payload;
  modelsCache[payload.name] = savedModel;
  toast("遥测配置已保存", "success");
  telemetrySnapshot = makeTelemetrySignature(telemetryEditDraft);
  telemetryDirty = false;
  closeTelemetryModal(true);
  return true;
}

