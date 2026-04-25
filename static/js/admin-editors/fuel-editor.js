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

function startFuelCurvePan(clientX, clientY) {
  if (!dom.fuelModal || dom.fuelModal.classList.contains("hidden") || fuelTab !== "curve") {
    return false;
  }

  const baseDomain = timeDomain();
  const currentDomain = getFuelCurveViewDomain();
  const activeRange = normalizeTimeZoomRange(baseDomain, currentDomain);
  if (!activeRange) {
    return false;
  }

  const rect = dom.fuelCurveCanvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const m = curveCanvasMetrics();
  const plotW = m.width - m.padLeft - m.padRight;
  if (plotW <= 10) {
    return false;
  }

  const localY = (clientY - rect.top) * (m.height / rect.height);
  if (localY < m.padTop || localY > (m.height - m.padBottom)) {
    return false;
  }

  fuelCurvePanState = {
    startClientX: clientX,
    baseDomain,
    startRange: activeRange,
    plotW,
  };
  dom.fuelCurveCanvas.style.cursor = "grabbing";
  return true;
}

function updateFuelCurvePanByPointer(clientX) {
  if (!fuelCurvePanState) {
    return;
  }

  const span = fuelCurvePanState.startRange.maxTime - fuelCurvePanState.startRange.minTime;
  if (!Number.isFinite(span) || span <= 0) {
    return;
  }

  const deltaPx = clientX - fuelCurvePanState.startClientX;
  const deltaTime = (deltaPx / fuelCurvePanState.plotW) * span;

  let minTime = fuelCurvePanState.startRange.minTime - deltaTime;
  let maxTime = fuelCurvePanState.startRange.maxTime - deltaTime;

  const baseMin = fuelCurvePanState.baseDomain.minTime;
  const baseMax = fuelCurvePanState.baseDomain.maxTime;
  if (minTime < baseMin) {
    maxTime += (baseMin - minTime);
    minTime = baseMin;
  }
  if (maxTime > baseMax) {
    minTime -= (maxTime - baseMax);
    maxTime = baseMax;
  }

  fuelCurveZoomRange = normalizeTimeZoomRange(fuelCurvePanState.baseDomain, { minTime, maxTime });
  renderFuelCurve();
}

function stopFuelCurvePan() {
  if (!fuelCurvePanState) {
    return;
  }
  fuelCurvePanState = null;
  if (dom.fuelCurveCanvas) {
    dom.fuelCurveCanvas.style.cursor = "";
  }
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
  const localY = (clientY - rect.top) * (height / rect.height);

  const plotH = Math.max(1, height - padTop - padBottom);
  const y = Math.max(padTop, Math.min(height - padBottom, localY));
  const value = Math.max(0, Math.min(100, Math.round(100 - ((y - padTop) / plotH) * 100)));

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
    stopFuelCurvePan();
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
  stopFuelCurvePan();
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

  const savedModel = data?.model && typeof data.model === "object"
    ? normalizeDraft(data.model, payload.name)
    : payload;
  modelsCache[payload.name] = savedModel;
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

