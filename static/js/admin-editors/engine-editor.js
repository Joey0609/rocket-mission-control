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

  const savedModel = data?.model && typeof data.model === "object"
    ? normalizeDraft(data.model, payload.name)
    : payload;
  modelsCache[payload.name] = savedModel;
  toast("发动机配置已保存", "success");
  engineLayoutSnapshot = makeEngineLayoutSignature(engineEditDraft);
  engineDirty = false;
  closeEngineLayoutEditorModal(true);
  return true;
}
