(() => {
  const DEFAULT_GAUGES = [
    {
      id: "speed",
      side: "left",
      metricKey: "speed_mps",
      label: "SPEED",
      unit: "KM/H",
      maxValue: 30600,
      fractionDigits: 0,
    },
    {
      id: "altitude",
      side: "left",
      metricKey: "altitude_km",
      label: "ALTITUDE",
      unit: "KM",
      maxValue: 700,
      fractionDigits: 1,
    },
    {
      id: "acceleration",
      side: "right",
      metricKey: "accel_g",
      label: "ACCEL",
      unit: "G",
      maxValue: 8,
      fractionDigits: 2,
    },
    {
      id: "engineLayout",
      side: "right",
      type: "engine_layout",
      label: "ENGINES",
      unit: "LAYOUT",
      size: 138,
    },
  ];

  const DEFAULT_ENGINE_PRESET_LIBRARY = {
    version: 1,
    presets: [
      {
        id: "falcon9_stage1",
        name: "Falcon 9 B5 Stage 1 (9机)",
        engine_count: 9,
        background_circles: [
          { id: "main_fill", x: 0, y: 0, r: 110, fill: "rgba(35,44,65,0.35)", stroke: "none", stroke_width: 0 },
          { id: "main_outline", x: 0, y: 0, r: 115, fill: "none", stroke: "rgba(128,128,128,0.3)", stroke_width: 4 },
        ],
        engines: [
          { id: 0, x: 0, y: 0, r: 21 },
          { id: 1, x: 26.79, y: -64.67, r: 21 },
          { id: 2, x: 64.67, y: -26.79, r: 21 },
          { id: 3, x: 64.67, y: 26.79, r: 21 },
          { id: 4, x: 26.79, y: 64.67, r: 21 },
          { id: 5, x: -26.79, y: 64.67, r: 21 },
          { id: 6, x: -64.67, y: 26.79, r: 21 },
          { id: 7, x: -64.67, y: -26.79, r: 21 },
          { id: 8, x: -26.79, y: -64.67, r: 21 },
        ],
      },
      {
        id: "falcon9_stage2",
        name: "Falcon 9 B5 Stage 2 (1机)",
        engine_count: 1,
        background_circles: [
          { id: "main_fill", x: 0, y: 0, r: 110, fill: "rgba(35,44,65,0.35)", stroke: "none", stroke_width: 0 },
          { id: "main_outline", x: 0, y: 0, r: 115, fill: "none", stroke: "rgba(128,128,128,0.3)", stroke_width: 4 },
        ],
        engines: [{ id: 0, x: 0, y: 0, r: 21 }],
      },
      {
        id: "cz7a_stage1",
        name: "CZ-7A Stage 1 (芯级+助推)",
        engine_count: 6,
        background_circles: [
          { id: "main_fill", x: 0, y: 0, r: 230, fill: "rgba(35,44,65,0.35)", stroke: "none", stroke_width: 0 },
          { id: "core_outline", x: 0, y: 0, r: 100, fill: "none", stroke: "rgba(128,128,128,0.3)", stroke_width: 3 },
          { id: "booster_outline_0", x: 115.97, y: -115.97, r: 60, fill: "none", stroke: "rgba(128,128,128,0.3)", stroke_width: 3 },
          { id: "booster_outline_1", x: 115.97, y: 115.97, r: 60, fill: "none", stroke: "rgba(128,128,128,0.3)", stroke_width: 3 },
          { id: "booster_outline_2", x: -115.97, y: 115.97, r: 60, fill: "none", stroke: "rgba(128,128,128,0.3)", stroke_width: 3 },
          { id: "booster_outline_3", x: -115.97, y: -115.97, r: 60, fill: "none", stroke: "rgba(128,128,128,0.3)", stroke_width: 3 },
        ],
        engines: [
          { id: 0, x: -50, y: 0, r: 40 },
          { id: 1, x: 50, y: 0, r: 40 },
          { id: 2, x: 115.97, y: -115.97, r: 40 },
          { id: 3, x: 115.97, y: 115.97, r: 40 },
          { id: 4, x: -115.97, y: 115.97, r: 40 },
          { id: 5, x: -115.97, y: -115.97, r: 40 },
        ],
      },
      {
        id: "cz7a_stage2",
        name: "CZ-7A Stage 2 (2机)",
        engine_count: 2,
        background_circles: [
          { id: "main_fill", x: 0, y: 0, r: 230, fill: "rgba(35,44,65,0.35)", stroke: "none", stroke_width: 0 },
          { id: "main_outline", x: 0, y: 0, r: 200, fill: "none", stroke: "rgba(128,128,128,0.3)", stroke_width: 5 },
        ],
        engines: [
          { id: 0, x: -100, y: 0, r: 21 },
          { id: 1, x: 100, y: 0, r: 21 },
        ],
      },
    ],
  };

  const GAUGE_SPEC_SWITCH_HIDE_MS = 500;
  const GAUGE_SLOT_TYPE_SWITCH_MS = 500;
  const GAUGE_CONTENT_SWITCH_ANIMATE_MS = 500;

  function toNumber(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function sanitizePresetId(rawId, fallback = "") {
    return String(rawId || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
      return normalizePresetLibrary(DEFAULT_ENGINE_PRESET_LIBRARY);
    }

    return { version: 1, presets };
  }

  function getPresetById(library, presetId) {
    const normalizedId = sanitizePresetId(presetId);
    return library.presets.find((preset) => preset.id === normalizedId) || library.presets[0] || null;
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

  function normalizeEngineStateList(rawStates = []) {
    const list = Array.isArray(rawStates) ? rawStates : [];
    const deduped = new Map();
    list.forEach((item, index) => {
      const id = Math.max(0, toInt(item?.id, index));
      deduped.set(id, { id, enabled: Boolean(item?.enabled) });
    });
    return Array.from(deduped.values()).sort((a, b) => a.id - b.id);
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

  function buildTimelineNodeMaps(timelineNodes) {
    const keyToTime = new Map();
    const keyToName = new Map();
    const list = Array.isArray(timelineNodes) ? timelineNodes : [];

    for (const node of list) {
      const id = String(node?.id || "").trim();
      const kind = String(node?.kind || "").trim();
      if (!id || !kind) {
        continue;
      }
      const time = toNumber(node?.time, 0);
      const name = String(node?.name || id);

      if (kind === "event") {
        keyToTime.set(`event:${id}`, time);
        keyToName.set(`event:${id}`, name);
      }
      if (kind === "stage") {
        keyToTime.set(`stage:${id}:start`, time);
        keyToName.set(`stage:${id}:start`, name);
      }
      if (kind === "observation") {
        keyToTime.set(`observation:${id}`, time);
        keyToName.set(`observation:${id}`, name);
      }
    }

    keyToTime.set("event:__engine_t0__", 0);
    keyToName.set("event:__engine_t0__", "T0");
    return { keyToTime, keyToName };
  }

  function resolveNodeTime(nodeKey, keyToTime) {
    if (keyToTime.has(nodeKey)) {
      return keyToTime.get(nodeKey);
    }
    if (nodeKey === "event:__telemetry_t0__") {
      return 0;
    }
    return 0;
  }

  function normalizeEngineLayout(raw, modelName, presetLibrary) {
    const source = raw && typeof raw === "object" ? raw : {};
    const defaultPreset = getPresetById(presetLibrary, guessEnginePresetIdByModelName(modelName));
    const fallbackPreset = defaultPreset || presetLibrary.presets[0] || null;
    const sourceNodeConfigs = source.node_configs && typeof source.node_configs === "object"
      ? source.node_configs
      : {};
    const nodeConfigs = {};

    for (const [nodeKey, config] of Object.entries(sourceNodeConfigs)) {
      if (!nodeKey) {
        continue;
      }
      const rawStageConfigs = Array.isArray(config?.stage_configs)
        ? config.stage_configs
        : [];
      const normalizedStageConfigs = rawStageConfigs
        .map((item, index) => {
          const preset = getPresetById(presetLibrary, item?.preset_id || config?.preset_id) || fallbackPreset;
          if (!preset) {
            return null;
          }
          return {
            stage_index: Math.max(1, toInt(item?.stage_index, index + 1)),
            preset_id: preset.id,
            engine_states: mergeEngineStatesWithPreset(preset, item?.engine_states || config?.engine_states),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.stage_index - b.stage_index);

      const primaryStage = normalizedStageConfigs[0] || null;
      const preset = getPresetById(presetLibrary, primaryStage?.preset_id || config?.preset_id) || fallbackPreset;
      if (!preset) {
        continue;
      }

      nodeConfigs[nodeKey] = {
        preset_id: preset.id,
        engine_states: primaryStage ? primaryStage.engine_states : mergeEngineStatesWithPreset(preset, []),
        stage_configs: normalizedStageConfigs,
      };
    }

    if (Object.keys(nodeConfigs).length === 0 && fallbackPreset) {
      nodeConfigs["event:__engine_t0__"] = {
        preset_id: fallbackPreset.id,
        engine_states: buildDefaultEngineStates(fallbackPreset),
      };
    }

    return {
      version: 3,
      node_configs: nodeConfigs,
    };
  }

  function formatMissionSeconds(seconds) {
    const sign = seconds < 0 ? "-" : "+";
    const abs = Math.abs(Math.round(seconds));
    const mm = Math.floor(abs / 60);
    const ss = abs % 60;
    return `T${sign}${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  function buildEngineTimelineEntries(layout, timelineNodes, presetLibrary, stageIndex = 1) {
    const maps = buildTimelineNodeMaps(timelineNodes);
    const nodeConfigs = layout?.node_configs && typeof layout.node_configs === "object"
      ? layout.node_configs
      : {};
    const normalizedStageIndex = Math.max(1, toInt(stageIndex, 1));

    const entries = Object.entries(nodeConfigs)
      .map(([nodeKey, config]) => {
        const stageConfigs = Array.isArray(config?.stage_configs) ? config.stage_configs : [];
        const pickedStage = stageConfigs.find((item) => toInt(item?.stage_index, 0) === normalizedStageIndex)
          || stageConfigs[normalizedStageIndex - 1]
          || stageConfigs[0]
          || null;

        const preset = getPresetById(presetLibrary, pickedStage?.preset_id || config?.preset_id);
        if (!preset) {
          return null;
        }

        const states = mergeEngineStatesWithPreset(preset, pickedStage?.engine_states || config?.engine_states);
        const stateMap = new Map(states.map((item) => [item.id, Boolean(item.enabled)]));

        return {
          key: nodeKey,
          name: maps.keyToName.get(nodeKey) || nodeKey,
          time: resolveNodeTime(nodeKey, maps.keyToTime),
          preset,
          stateMap,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.time - b.time) || a.key.localeCompare(b.key, "zh-CN"));

    if (entries.length === 0) {
      const fallbackPreset = presetLibrary.presets[0] || null;
      if (!fallbackPreset) {
        return [];
      }
      const states = buildDefaultEngineStates(fallbackPreset);
      return [{
        key: "event:__engine_t0__",
        name: "T0",
        time: 0,
        preset: fallbackPreset,
        stateMap: new Map(states.map((item) => [item.id, false])),
      }];
    }

    return entries;
  }

  function buildPresetLibrarySignature(library) {
    const items = Array.isArray(library?.presets) ? library.presets : [];
    return items
      .map((preset) => {
        const enginesSig = preset.engines
          .map((engine) => `${engine.id}:${engine.x}:${engine.y}:${engine.r}`)
          .join(",");
        const bgSig = (preset.background_circles || [])
          .map((circle) => `${circle.id}:${circle.x}:${circle.y}:${circle.r}:${circle.fill}:${circle.stroke}:${circle.stroke_width}`)
          .join(",");
        return `${preset.id}|${enginesSig}|${bgSig}`;
      })
      .join(";");
  }

  function buildLayoutSignature(layout) {
    const nodeConfigs = layout?.node_configs && typeof layout.node_configs === "object"
      ? layout.node_configs
      : {};
    return Object.keys(nodeConfigs)
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .map((key) => {
        const config = nodeConfigs[key] || {};
        const statesSig = (Array.isArray(config.engine_states) ? config.engine_states : [])
          .map((state) => `${state.id}:${state.enabled ? 1 : 0}`)
          .join(",");
        return `${key}|${config.preset_id || ""}|${statesSig}`;
      })
      .join(";");
  }

  function buildTimelineSignature(timelineNodes) {
    const list = Array.isArray(timelineNodes) ? timelineNodes : [];
    return list
      .map((node) => `${node?.kind || ""}:${node?.id || ""}:${toNumber(node?.time, 0)}`)
      .join(";");
  }

  function resolveEngineForceOffThreshold(timelineNodes) {
    const list = Array.isArray(timelineNodes) ? timelineNodes : [];

    let ignitionTimeBeforeT0 = Number.POSITIVE_INFINITY;
    for (const node of list) {
      if (String(node?.kind || "") !== "event") {
        continue;
      }

      const name = String(node?.name || "").trim().toLowerCase();
      const id = String(node?.id || "").trim().toLowerCase();
      const isShutdown = name.includes("关机") || name.includes("关闭") || name.includes("熄火");
      const isSeparation = name.includes("分离");

      const matched = !isShutdown && !isSeparation && (
        name.includes("点火")
        || name.includes("ignition")
        || name.includes("liftoff")
        || id.includes("ignition")
        || id.includes("lift_off")
        || id.includes("liftoff")
      );

      if (!matched) {
        continue;
      }

      const eventTime = toNumber(node?.time, 0);
      if (eventTime < 0) {
        ignitionTimeBeforeT0 = Math.min(ignitionTimeBeforeT0, eventTime);
      }
    }

    // 若 T0 前存在点火，强制关机阈值是“点火前”；否则回退到 T0 前。
    if (Number.isFinite(ignitionTimeBeforeT0)) {
      return ignitionTimeBeforeT0;
    }

    // 未识别到 T0 前点火事件时回退到 T0 前强制关机。
    return 0;
  }

  function normalizeGaugeSpecEntry(rawSpec, index) {
    const source = rawSpec && typeof rawSpec === "object" ? rawSpec : {};
    const type = String(source.type || "metric").trim().toLowerCase() === "engine_layout"
      ? "engine_layout"
      : "metric";
    const side = String(source.side || "left").trim().toLowerCase() === "right" ? "right" : "left";
    const id = String(source.id || `dashboard_${index + 1}`).trim() || `dashboard_${index + 1}`;
    const stageIndex = Math.max(1, toInt(source.stageIndex ?? source.stage_index, 1));

    if (type === "engine_layout") {
      return {
        id,
        side,
        type: "engine_layout",
        label: String(source.label || "ENGINES"),
        size: Math.max(112, toInt(source.size, 128)),
        stageIndex,
      };
    }

    return {
      id,
      side,
      type: "metric",
      metricKey: String(source.metricKey || source.metric_key || "speed_mps"),
      label: String(source.label || "METRIC"),
      unit: String(source.unit || ""),
      maxValue: Math.max(1, toNumber(source.maxValue ?? source.max_value, 100)),
      fractionDigits: Math.max(0, Math.trunc(toNumber(source.fractionDigits ?? source.fraction_digits, 0))),
      stageIndex,
    };
  }

  function normalizeGaugeSpecList(rawSpecs) {
    if (!Array.isArray(rawSpecs) || rawSpecs.length <= 0) {
      return DEFAULT_GAUGES.map((item) => ({ ...item }));
    }
    const normalized = rawSpecs.map((item, index) => normalizeGaugeSpecEntry(item, index));
    return normalized.length > 0
      ? normalized
      : DEFAULT_GAUGES.map((item) => ({ ...item }));
  }

  function buildGaugeSpecsSignature(specs) {
    const list = Array.isArray(specs) ? specs : [];
    return list
      .map((spec) => [
        spec.id,
        spec.type,
        spec.side,
        spec.metricKey || "",
        spec.label || "",
        spec.unit || "",
        String(spec.maxValue || ""),
        String(spec.fractionDigits || ""),
        String(spec.size || ""),
        String(spec.stageIndex || ""),
      ].join("|"))
      .join(";");
  }

  class EngineLayoutWidget {
    constructor(options = {}) {
      this.mountEl = options.mountEl || null;
      this.label = String(options.label || "ENGINES");
      this.size = Math.max(120, toInt(options.size, 138));
      this.gaugeCtor = typeof options.gaugeCtor === "function" ? options.gaugeCtor : null;
      this.gauge = null;
      this.rootEl = null;
      this.overlayEl = null;
      this.canvasEl = null;
      this.metaEl = null;
      this.nodeElements = new Map();
      this.lastStateMap = new Map();
      this.activePresetId = "";
      this.engineTimelineEntries = [];
      this.profileSignature = "";

      this.mount();
    }

    mount() {
      if (!this.mountEl || !this.gaugeCtor) {
        return;
      }

      this.mountEl.innerHTML = "";
      this.gauge = new this.gaugeCtor({
        mountEl: this.mountEl,
        label: this.label,
        unit: "LAYOUT",
        maxValue: 100,
        fractionDigits: 0,
      });
      this.gauge.setValue(0);

      const root = this.mountEl.querySelector(".telemetry-gauge-widget");
      if (!root) {
        return;
      }

      root.classList.add("engine-layout-gauge");

      const overlay = document.createElement("div");
      overlay.className = "telemetry-engine-overlay";
      overlay.innerHTML = `
        <div class="telemetry-engine-canvas"></div>
      `;
      root.appendChild(overlay);

      this.rootEl = root;
      this.overlayEl = overlay;
      this.canvasEl = overlay.querySelector(".telemetry-engine-canvas");
      this.metaEl = null;
    }

    renderPreset(preset) {
      if (!this.canvasEl || !preset) {
        return;
      }

      const width = this.size;
      const height = this.size;
      const nodes = Array.isArray(preset.engines) ? preset.engines : [];
      const bgCircles = Array.isArray(preset.background_circles) ? preset.background_circles : [];
      const allCircles = [
        ...bgCircles.map((item) => ({ x: item.x, y: item.y, r: item.r })),
        ...nodes.map((item) => ({ x: item.x, y: item.y, r: item.r })),
      ];

      if (allCircles.length === 0) {
        allCircles.push({ x: 0, y: 0, r: 10 });
      }

      const minX = Math.min(...allCircles.map((item) => item.x - item.r));
      const maxX = Math.max(...allCircles.map((item) => item.x + item.r));
      const minY = Math.min(...allCircles.map((item) => item.y - item.r));
      const maxY = Math.max(...allCircles.map((item) => item.y + item.r));
      const spanW = Math.max(1, maxX - minX);
      const spanH = Math.max(1, maxY - minY);
      const padding = 8;
      const scale = Math.min((width - padding * 2) / spanW, (height - padding * 2) / spanH);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      // 仪表盘中只显示 outline（fill=none）的 background circle，fill 填充层不渲染
      const backgroundMarkup = bgCircles
        .filter((item) => String(item.fill || "").trim().toLowerCase() === "none")
        .map((item) => {
          const px = (width / 2) + (item.x - cx) * scale;
          const py = (height / 2) + (item.y - cy) * scale;
          const pr = Math.max(1, item.r * scale);
          const strokeWidth = Math.max(0, (item.stroke_width || 0) * scale);
          return `<circle class="telemetry-engine-bg" cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${pr.toFixed(2)}" fill="${item.fill || "none"}" stroke="${item.stroke || "rgba(128,128,128,0.3)"}" stroke-width="${strokeWidth.toFixed(2)}" />`;
        })
        .join("");

      const nodesMarkup = nodes
        .map((point) => {
          const px = (width / 2) + (point.x - cx) * scale;
          const py = (height / 2) + (point.y - cy) * scale;
          const pr = Math.max(3, point.r * scale);
          return `<circle class=\"telemetry-engine-node is-inactive\" data-engine-id=\"${point.id}\" cx=\"${px.toFixed(2)}\" cy=\"${py.toFixed(2)}\" r=\"${pr.toFixed(2)}\" />`;
        })
        .join("");

      this.canvasEl.innerHTML = `
        <svg class=\"telemetry-engine-svg\" viewBox=\"0 0 ${width} ${height}\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"发动机布局\">
          ${backgroundMarkup}
          ${nodesMarkup}
        </svg>
      `;

      this.nodeElements.clear();
      for (const node of this.canvasEl.querySelectorAll("[data-engine-id]")) {
        const id = toInt(node.getAttribute("data-engine-id"), -1);
        if (id >= 0) {
          this.nodeElements.set(id, node);
        }
      }
    }

    applyStateMap(stateMap) {
      this.nodeElements.forEach((nodeEl, engineId) => {
        const enabled = Boolean(stateMap.get(engineId));

        nodeEl.classList.toggle("is-active", enabled);
        nodeEl.classList.toggle("is-inactive", !enabled);
      });

      this.lastStateMap = new Map(stateMap.entries());
    }

    resolveActiveEntry(missionSeconds) {
      if (this.engineTimelineEntries.length === 0) {
        return null;
      }

      let active = this.engineTimelineEntries[0];
      for (const entry of this.engineTimelineEntries) {
        if (entry.time <= missionSeconds) {
          active = entry;
        } else {
          break;
        }
      }
      return active;
    }

    resolveIgnitionEntry() {
      for (const entry of this.engineTimelineEntries) {
        const name = String(entry.name || "").trim().toLowerCase();
        const id = String(entry.key || "").trim().toLowerCase();
        if (
          name.includes("点火")
          || name.includes("ignition")
          || name.includes("liftoff")
          || id.includes("ignition")
          || id.includes("lift_off")
          || id.includes("liftoff")
        ) {
          return entry;
        }
      }

      // 退而求其次找 time >= 0 的第一个节点
      for (const entry of this.engineTimelineEntries) {
        if (entry.time >= 0) {
          return entry;
        }
      }

      return this.engineTimelineEntries[0] || null;
    }

    setVisible(nextVisible, options = {}) {
      if (this.gauge && typeof this.gauge.setVisible === "function") {
        this.gauge.setVisible(nextVisible, options);
      }
    }

    update(payload = {}) {
      const telemetryEnabled = Boolean(payload.telemetryEnabled);
      if (!telemetryEnabled) {
        return;
      }

      const telemetryPaused = telemetryEnabled && Boolean(payload.telemetryPaused);
      const missionSeconds = toNumber(payload.missionSeconds, 0);
      const dashboardStageIndex = Math.max(1, toInt(payload.dashboardStageIndex, 1));
      const hasPauseMissionSeconds = Number.isFinite(payload.telemetryPauseMissionSeconds);
      const pauseMissionSeconds = hasPauseMissionSeconds
        ? toNumber(payload.telemetryPauseMissionSeconds, missionSeconds)
        : missionSeconds;
      const contentSwitchAnimateMs = Math.max(0, toInt(payload.contentSwitchAnimateMs, 0));
      const activeMissionSeconds = telemetryPaused ? pauseMissionSeconds : missionSeconds;
      const stageFuelPercent = resolveStageFuelPercent(payload.fuelCurves, dashboardStageIndex, activeMissionSeconds);

      const presetLibrary = normalizePresetLibrary(payload.enginePresetLibrary || null);
      const modelName = String(payload.modelName || "");
      const engineLayout = normalizeEngineLayout(payload.engineLayout || {}, modelName, presetLibrary);
      const timelineNodes = Array.isArray(payload.timelineNodes) ? payload.timelineNodes : [];

      const signature = [
        buildPresetLibrarySignature(presetLibrary),
        buildLayoutSignature(engineLayout),
        buildTimelineSignature(timelineNodes),
        `stage:${dashboardStageIndex}`,
      ].join("||");

      if (signature !== this.profileSignature) {
        this.profileSignature = signature;
        this.engineTimelineEntries = buildEngineTimelineEntries(engineLayout, timelineNodes, presetLibrary, dashboardStageIndex);
      }

      const forceOffThreshold = resolveEngineForceOffThreshold(timelineNodes);
      const shouldForceAllOff = activeMissionSeconds < forceOffThreshold;

      // T<0 时用点火节点的 preset 渲染布局，但强制全部关机
      const effectiveEntry = shouldForceAllOff
        ? (this.resolveIgnitionEntry() || this.resolveActiveEntry(activeMissionSeconds))
        : this.resolveActiveEntry(activeMissionSeconds);

      if (!effectiveEntry) {
        return;
      }

      if (effectiveEntry.preset.id !== this.activePresetId) {
        // console.log(`[DEBUG-engine-switch] preset: "${this.activePresetId}" → "${effectiveEntry.preset.id}", entry="${effectiveEntry.key}", time=${effectiveEntry.time}, shouldForceAllOff=${shouldForceAllOff}`);
        this.activePresetId = effectiveEntry.preset.id;
        this.renderPreset(effectiveEntry.preset);
        this.lastStateMap = new Map();
      }

      if (shouldForceAllOff) {
        const forcedOffStateMap = new Map();
        effectiveEntry.stateMap.forEach((_enabled, id) => {
          forcedOffStateMap.set(id, false);
        });
        this.applyStateMap(forcedOffStateMap);
        if (this.gauge && typeof this.gauge.setValue === "function") {
          this.gauge.setValue(0, { animateMs: contentSwitchAnimateMs });
        }
        return;
      }

      this.applyStateMap(effectiveEntry.stateMap);
      if (this.gauge && typeof this.gauge.setValue === "function") {
        this.gauge.setValue(Number.isFinite(stageFuelPercent) ? stageFuelPercent : 0, {
          animateMs: contentSwitchAnimateMs,
        });
      }
    }

    destroy() {
      if (this.gauge && typeof this.gauge.destroy === "function") {
        this.gauge.destroy();
      }
      this.gauge = null;
      this.rootEl = null;
      this.overlayEl = null;
      this.canvasEl = null;
      this.metaEl = null;
      this.nodeElements.clear();
      this.engineTimelineEntries = [];
      this.lastStateMap = new Map();
    }
  }

  function normalizeCurve(rawPoints, fallback = 0) {
    if (!Array.isArray(rawPoints)) {
      return [
        { time: 0, value: fallback },
        { time: 60, value: fallback },
      ];
    }

    const uniqueByTime = new Map();
    for (const point of rawPoints) {
      const time = toNumber(point?.time, 0);
      const value = Math.max(0, toNumber(point?.value, fallback));
      uniqueByTime.set(time, value);
    }

    const normalized = Array.from(uniqueByTime.entries())
      .map(([time, value]) => ({ time: Number(time), value: Number(value) }))
      .sort((a, b) => a.time - b.time);

    if (normalized.length === 0) {
      return [
        { time: 0, value: fallback },
        { time: 60, value: fallback },
      ];
    }

    if (normalized.length === 1) {
      return [
        normalized[0],
        { time: normalized[0].time + 60, value: normalized[0].value },
      ];
    }

    return normalized;
  }

  function interpolateLinear(points, time) {
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
      const left = points[i];
      const right = points[i + 1];
      if (left.time <= time && time <= right.time) {
        const width = right.time - left.time || 1;
        const ratio = (time - left.time) / width;
        return left.value + (right.value - left.value) * ratio;
      }
    }

    return points[points.length - 1].value;
  }

  function resolveStageFuelCurveId(fuelCurves, stageIndex) {
    const source = fuelCurves && typeof fuelCurves === "object" ? fuelCurves : {};
    const normalizedStage = Math.max(1, toInt(stageIndex, 1));
    const preferredIds = [
      `stage${normalizedStage}_0`,
      `stage${normalizedStage}`,
      `stage${normalizedStage}_main`,
    ];

    for (const id of preferredIds) {
      if (Array.isArray(source[id])) {
        return id;
      }
    }
    return "";
  }

  function resolveStageFuelPercent(fuelCurves, stageIndex, missionSeconds) {
    const channelId = resolveStageFuelCurveId(fuelCurves, stageIndex);
    if (!channelId) {
      return null;
    }

    const curve = normalizeCurve(fuelCurves[channelId], 100);
    const value = Math.max(0, Math.min(100, interpolateLinear(curve, missionSeconds)));
    return Number.isFinite(value) ? value : null;
  }

  class TelemetryGaugePanel {
    constructor(options = {}) {
      this.leftMountEl = options.leftMountEl || null;
      this.rightMountEl = options.rightMountEl || null;
      this.gaugeSpecs = normalizeGaugeSpecList(options.gaugeSpecs);
      this.gaugeSpecsSignature = buildGaugeSpecsSignature(this.gaugeSpecs);

      this.entries = [];
      this.profile = null;
      this.profileCache = {};
      this.lastValues = {};
      this.splitEnabled = false;
      this.separationTime = Number.POSITIVE_INFINITY;
      this.visible = false;
      this.gaugeCtor = null;
      this.gaugeSpecSwitchTimer = null;
      this.gaugeSpecSwitchToken = 0;
      this.pendingUpdatePayload = null;
      this.latestUpdatePayload = null;
      this.metricSwitchAnimations = new Map();

      this.mount();
      this.setVisible(false, { immediate: true });
    }

    createEntry(spec, slot) {
      if (!this.gaugeCtor) {
        return null;
      }

      if (spec.type === "engine_layout") {
        const widget = new EngineLayoutWidget({
          mountEl: slot,
          label: spec.label,
          size: spec.size,
          gaugeCtor: this.gaugeCtor,
        });
        return {
          spec,
          type: "engine_layout",
          widget,
          slot,
          isSwitching: false,
          switchTimer: null,
          switchToken: 0,
        };
      }

      const widget = new this.gaugeCtor({
        mountEl: slot,
        label: spec.label,
        unit: spec.unit,
        maxValue: spec.maxValue,
        fractionDigits: spec.fractionDigits,
      });
      return {
        spec,
        type: "metric",
        widget,
        slot,
        isSwitching: false,
        switchTimer: null,
        switchToken: 0,
      };
    }

    clearEntryTimer(entry) {
      if (entry?.switchTimer) {
        clearTimeout(entry.switchTimer);
        entry.switchTimer = null;
      }
    }

    destroyEntry(entry) {
      this.clearEntryTimer(entry);
      if (entry?.widget && typeof entry.widget.destroy === "function") {
        entry.widget.destroy();
      }
    }

    setContentFaded(faded) {
      const isFaded = Boolean(faded);
      for (const mount of [this.leftMountEl, this.rightMountEl]) {
        if (!mount) {
          continue;
        }
        mount.classList.toggle("telemetry-gauges-faded", isFaded);
      }
    }

    applyMetricConfig(entry, metrics, options = {}) {
      if (!entry || entry.type !== "metric" || !entry.widget) {
        return;
      }

      const metricConfig = metrics?.[entry.spec.metricKey] || null;
      entry.widget.setConfig({
        label: entry.spec.label,
        unit: metricConfig?.unit || entry.spec.unit,
        maxValue: Number.isFinite(metricConfig?.max_value) ? metricConfig.max_value : entry.spec.maxValue,
        fractionDigits: Number.isFinite(metricConfig?.fraction_digits)
          ? Math.max(0, Math.trunc(metricConfig.fraction_digits))
          : entry.spec.fractionDigits,
      }, {
        fadeText: Boolean(options.fadeText),
      });
    }

    switchEntryWidget(index, nextSpec, options = {}) {
      const entry = this.entries[index];
      if (!entry || !entry.slot) {
        return;
      }

      const animate = Boolean(options.animate) && this.visible;
      const previousType = entry.type;
      entry.spec = nextSpec;
      entry.switchToken += 1;
      const token = entry.switchToken;
      this.clearEntryTimer(entry);

      const finalizeSwitch = () => {
        if (!this.entries[index] || this.entries[index].switchToken !== token) {
          return;
        }

        this.destroyEntry(entry);
        const nextEntry = this.createEntry(nextSpec, entry.slot);
        if (!nextEntry) {
          return;
        }
        this.entries[index] = nextEntry;

        const metrics = this.profile?.metrics && typeof this.profile.metrics === "object"
          ? this.profile.metrics
          : {};
        this.applyMetricConfig(nextEntry, metrics, { fadeText: true });

        if (this.visible && typeof nextEntry.widget?.setVisible === "function") {
          nextEntry.widget.setVisible(true, { immediate: !animate });
        } else if (typeof nextEntry.widget?.setVisible === "function") {
          nextEntry.widget.setVisible(false, { immediate: true });
        }

        if (this.latestUpdatePayload) {
          this.update(this.latestUpdatePayload);
        }
      };

      if (!animate) {
        finalizeSwitch();
        return;
      }

      entry.isSwitching = true;
      if (entry.type === "metric" && nextSpec.type === "engine_layout") {
        this.applyMetricConfig(entry, this.profile?.metrics && typeof this.profile.metrics === "object"
          ? this.profile.metrics
          : {}, {
          fadeText: true,
        });
      }

      if (entry.widget && typeof entry.widget.setVisible === "function") {
        entry.widget.setVisible(false, { immediate: false });
      }

      entry.switchTimer = setTimeout(() => {
        entry.isSwitching = false;
        entry.switchTimer = null;
        finalizeSwitch();
      }, GAUGE_SLOT_TYPE_SWITCH_MS);
    }

    mount() {
      this.gaugeCtor = window.MissionTelemetry?.Gauge;
      if (typeof this.gaugeCtor !== "function") {
        return;
      }

      if (this.leftMountEl) {
        this.leftMountEl.innerHTML = "";
      }
      if (this.rightMountEl) {
        this.rightMountEl.innerHTML = "";
      }

      this.entries = [];
      for (const spec of this.gaugeSpecs) {
        const sideMount = spec.side === "right" ? this.rightMountEl : this.leftMountEl;
        if (!sideMount) {
          continue;
        }

        const slot = document.createElement("div");
        slot.className = "telemetry-gauge-slot";
        sideMount.appendChild(slot);
        const entry = this.createEntry(spec, slot);
        if (entry) {
          this.entries.push(entry);
        }
      }
    }

    setGaugeSpecs(nextGaugeSpecs) {
      const normalized = normalizeGaugeSpecList(nextGaugeSpecs);
      const nextSignature = buildGaugeSpecsSignature(normalized);
      if (nextSignature === this.gaugeSpecsSignature) {
        return;
      }

      console.log(`[DEBUG-gauge-switch] BEFORE: signature="${this.gaugeSpecsSignature}", specs=[${(this.gaugeSpecs || []).map((s) => `${s.id}: stage=${s.stageIndex ?? s.stage_index} ${s.type}`).join(" | ")}]`);
      console.log(`[DEBUG-gauge-switch] AFTER:  signature="${nextSignature}", specs=[${normalized.map((s) => `${s.id}: stage=${s.stageIndex ?? s.stage_index} ${s.type}`).join(" | ")}]`);
      this.gaugeSpecs = normalized;
      this.gaugeSpecsSignature = nextSignature;

      if (this.gaugeSpecSwitchTimer) {
        clearTimeout(this.gaugeSpecSwitchTimer);
        this.gaugeSpecSwitchTimer = null;
      }

      const currentToken = this.gaugeSpecSwitchToken + 1;
      this.gaugeSpecSwitchToken = currentToken;
      this.setContentFaded(true);

      const remountWithLatestSpecs = () => {
        if (this.gaugeSpecSwitchToken !== currentToken) {
          return;
        }

        for (const entry of this.entries) {
          this.destroyEntry(entry);
        }
        this.entries = [];

        this.mount();
        this.setProfile(this.profile, { force: true });
        this.setVisible(this.visible, { immediate: true });
        this.setContentFaded(false);
        this.gaugeSpecSwitchTimer = setTimeout(() => {
          if (this.gaugeSpecSwitchToken !== currentToken) {
            return;
          }
          this.gaugeSpecSwitchTimer = null;
          if (this.pendingUpdatePayload) {
            const pendingPayload = this.pendingUpdatePayload;
            this.pendingUpdatePayload = null;
            this.update({
              ...pendingPayload,
              contentSwitchAnimateMs: GAUGE_CONTENT_SWITCH_ANIMATE_MS,
            });
          }
        }, GAUGE_SPEC_SWITCH_HIDE_MS);
      };

      this.pendingUpdatePayload = null;
      this.gaugeSpecSwitchTimer = setTimeout(remountWithLatestSpecs, GAUGE_SPEC_SWITCH_HIDE_MS);
    }

    setProfile(profile, options = {}) {
      const force = Boolean(options.force);
      if (!force && this.profile === profile) {
        return;
      }
      this.profile = profile && typeof profile === "object" ? profile : null;
      this.profileCache = {};
      this.splitEnabled = Boolean(this.profile?.split_enabled);
      this.separationTime = toNumber(this.profile?.separation_time, Number.POSITIVE_INFINITY);

      const metrics = this.profile?.metrics && typeof this.profile.metrics === "object"
        ? this.profile.metrics
        : {};

      for (const [metricKey, metricConfig] of Object.entries(metrics)) {
        const stage1 = normalizeCurve(metricConfig?.curves?.stage1, 0);
        const upper = normalizeCurve(metricConfig?.curves?.upper, stage1[0]?.value || 0);
        this.profileCache[metricKey] = { stage1, upper };
      }

      for (const entry of this.entries) {
        this.applyMetricConfig(entry, metrics);
      }
    }

    resolveMetricValue(metricKey, missionSeconds, stageIndex = 0) {
      const curves = this.profileCache[metricKey];
      if (!curves) {
        return 0;
      }

      const normalizedStage = Math.max(0, toInt(stageIndex, 0));
      if (normalizedStage >= 1) {
        const branchByStage = normalizedStage === 1 ? curves.stage1 : curves.upper;
        return Math.max(0, interpolateLinear(branchByStage, missionSeconds));
      }

      const useUpper = this.splitEnabled && missionSeconds > this.separationTime;
      const branch = useUpper ? curves.upper : curves.stage1;
      return Math.max(0, interpolateLinear(branch, missionSeconds));
    }

    update(payload = {}) {
      if (this.entries.length === 0) {
        return;
      }
      this.latestUpdatePayload = payload;

      const telemetryEnabled = Boolean(payload.telemetryEnabled);
      const telemetryPaused = telemetryEnabled && Boolean(payload.telemetryPaused);
      const missionSeconds = toNumber(payload.missionSeconds, 0);
      const hasPauseMissionSeconds = Number.isFinite(payload.telemetryPauseMissionSeconds);
      const pauseMissionSeconds = hasPauseMissionSeconds
        ? toNumber(payload.telemetryPauseMissionSeconds, missionSeconds)
        : missionSeconds;
      const contentSwitchAnimateMs = Math.max(0, toInt(payload.contentSwitchAnimateMs, 0));

      if (Array.isArray(payload.dashboardGaugeSpecs)) {
        this.setGaugeSpecs(payload.dashboardGaugeSpecs);
      }

      if (this.gaugeSpecSwitchTimer) {
        this.pendingUpdatePayload = payload;
        return;
      }

      if (!telemetryEnabled) {
        return;
      }

      if (telemetryPaused) {
        const resolvedValues = {};
        for (const entry of this.entries) {
          if (entry.isSwitching) {
            continue;
          }
          if (entry.type === "metric") {
            const value = this.resolveMetricValue(entry.spec.metricKey, pauseMissionSeconds, entry.spec.stageIndex || 0);
            resolvedValues[entry.spec.id] = value;
            const animateMs = contentSwitchAnimateMs > 0
              ? contentSwitchAnimateMs
              : (this.metricSwitchAnimations.get(entry.spec.id) ? 1000 : 60);
            entry.widget.setValue(value, {
              animateMs,
            });
            this.metricSwitchAnimations.delete(entry.spec.id);
          } else {
            entry.widget.update({
              missionSeconds,
              telemetryEnabled,
              telemetryPaused,
              telemetryPauseMissionSeconds: pauseMissionSeconds,
              engineLayout: payload.engineLayout,
              enginePresetLibrary: payload.enginePresetLibrary,
              fuelCurves: payload.fuelCurves,
              timelineNodes: payload.timelineNodes,
              modelName: payload.modelName,
              dashboardStageIndex: entry.spec.stageIndex || 1,
              contentSwitchAnimateMs,
            });
          }
        }
        this.lastValues = resolvedValues;
        return;
      }

      const resolvedValues = {};
      for (const entry of this.entries) {
        if (entry.isSwitching) {
          continue;
        }
        if (entry.type === "metric") {
          const value = this.resolveMetricValue(entry.spec.metricKey, missionSeconds, entry.spec.stageIndex || 0);
          resolvedValues[entry.spec.id] = value;
          const animateMs = contentSwitchAnimateMs > 0
            ? contentSwitchAnimateMs
            : (this.metricSwitchAnimations.get(entry.spec.id) ? 1000 : 60);
          entry.widget.setValue(value, {
            animateMs,
          });
          this.metricSwitchAnimations.delete(entry.spec.id);
        } else {
          entry.widget.update({
            missionSeconds,
            telemetryEnabled,
            telemetryPaused,
            telemetryPauseMissionSeconds: pauseMissionSeconds,
            engineLayout: payload.engineLayout,
            enginePresetLibrary: payload.enginePresetLibrary,
            fuelCurves: payload.fuelCurves,
            timelineNodes: payload.timelineNodes,
            modelName: payload.modelName,
            dashboardStageIndex: entry.spec.stageIndex || 1,
            contentSwitchAnimateMs,
          });
        }
      }

      this.lastValues = resolvedValues;
    }

    setVisible(nextVisible, options = {}) {
      const visible = Boolean(nextVisible);
      const immediate = Boolean(options.immediate);

      if (!immediate && visible === this.visible) {
        return;
      }

      this.visible = visible;
      for (const entry of this.entries) {
        if (entry?.widget && typeof entry.widget.setVisible === "function") {
          entry.widget.setVisible(visible, { immediate });
        }
      }
    }

    destroy() {
      if (this.gaugeSpecSwitchTimer) {
        clearTimeout(this.gaugeSpecSwitchTimer);
        this.gaugeSpecSwitchTimer = null;
      }
      this.setContentFaded(false);
      for (const entry of this.entries) {
        this.destroyEntry(entry);
      }
      this.entries = [];
      this.lastValues = {};
      this.pendingUpdatePayload = null;
      this.latestUpdatePayload = null;
    }
  }

  function createTelemetryGaugePanel(options = {}) {
    return new TelemetryGaugePanel(options);
  }

  window.MissionTelemetry = window.MissionTelemetry || {};
  window.MissionTelemetry.createTelemetryGaugePanel = createTelemetryGaugePanel;
})();
