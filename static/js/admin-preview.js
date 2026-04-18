(() => {
  const MODES = ["visitor", "obs", "video"];
  const MODE_PATH = {
    visitor: "/visitor",
    obs: "/obs",
    video: "/video",
  };

  const RESOLUTION_PRESETS = [
    { id: "480p", label: "480P", width: 854, height: 480 },
    { id: "720p", label: "720P", width: 1280, height: 720 },
    { id: "1080p", label: "1080P", width: 1920, height: 1080 },
    { id: "2k", label: "2K", width: 2560, height: 1440 },
    { id: "4k", label: "4K", width: 3840, height: 2160 },
  ];
  const DEFAULT_PRESET_ID = "1080p";
  const VIDEO_META_STORAGE_KEY = "mission-viewer.video-meta";
  const VIDEO_FILE_DB_NAME = "mission-viewer-video-files";
  const VIDEO_FILE_STORE_NAME = "assets";
  const VIDEO_FILE_STORE_KEY = "selected-video";
  const DASHBOARD_OPTION_DEFS = [
    { key: "altitude", label: "高度" },
    { key: "speed", label: "速度" },
    { key: "accel", label: "加速度" },
    { key: "engine", label: "发动机" },
    { key: "d3", label: "3D" },
  ];
  const DASHBOARD_STAGE_TEXT = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

  const dom = {
    previewFrame: document.querySelector(".preview-frame"),
    previewStage: document.getElementById("previewStage"),
    previewModeSwitch: document.getElementById("previewModeSwitch"),
    previewModeThumb: document.getElementById("previewModeThumb"),
    modeButtons: Array.from(document.querySelectorAll("[data-preview-mode]")),
    actionGroups: Array.from(document.querySelectorAll("[data-preview-actions]")),

    openVisitorPreviewBtn: document.getElementById("openVisitorPreviewBtn"),
    copyObsUrlBtn: document.getElementById("copyObsUrlBtn"),
    openObsPageBtn: document.getElementById("openObsPageBtn"),
    copyVideoUrlBtn: document.getElementById("copyVideoUrlBtn"),
    openVideoPageBtn: document.getElementById("openVideoPageBtn"),

    openObsSettingsBtn: document.getElementById("openObsSettingsBtn"),
    openVideoSettingsBtn: document.getElementById("openVideoSettingsBtn"),
    openDashboardEditorBtn: document.getElementById("openDashboardEditorBtn"),

    previewConfigModal: document.getElementById("previewConfigModal"),
    previewConfigBackdrop: document.getElementById("previewConfigBackdrop"),
    previewConfigTitle: document.getElementById("previewConfigTitle"),
    obsConfigPane: document.getElementById("obsConfigPane"),
    videoConfigPane: document.getElementById("videoConfigPane"),
    dashboardConfigPane: document.getElementById("dashboardConfigPane"),
    dashboardConfigTable: document.getElementById("dashboardConfigTable"),
    obsResolutionPresetSelect: document.getElementById("obsResolutionPresetSelect"),
    videoResolutionPresetSelect: document.getElementById("videoResolutionPresetSelect"),
    videoSourceInput: document.getElementById("videoSourceInput"),
    videoSourceName: document.getElementById("videoSourceName"),
    videoT0Input: document.getElementById("videoT0Input"),
    videoMissionStartInput: document.getElementById("videoMissionStartInput"),
    videoMissionEndInput: document.getElementById("videoMissionEndInput"),
    videoMetaHint: document.getElementById("videoMetaHint"),
    closePreviewConfigBtn: document.getElementById("closePreviewConfigBtn"),
    savePreviewConfigBtn: document.getElementById("savePreviewConfigBtn"),
  };

  if (!dom.previewFrame || !dom.previewModeSwitch || !dom.previewModeThumb || !dom.previewStage) {
    return;
  }

  const state = {
    mode: "visitor",
    themeId: "",
    configMode: "obs",
    obsResolutionPresetId: DEFAULT_PRESET_ID,
    obsResolution: {
      width: 1920,
      height: 1080,
    },
    videoResolutionPresetId: DEFAULT_PRESET_ID,
    videoResolution: {
      width: 1920,
      height: 1080,
    },
    video: {
      file: null,
      fileName: "",
      duration: Number.NaN,
      sourceWidth: 1920,
      sourceHeight: 1080,
      calibration: {
        t0VideoSeconds: 0,
        missionStartSeconds: 0,
        missionEndSeconds: 0,
      },
    },
    dashboard: {
      modelName: "",
      draftModel: null,
      snapshotSignature: "",
    },
  };

  let suppressVideoCalibrationUpdate = false;

  function notify(message, type = "info") {
    if (typeof window.notify === "function") {
      window.notify(message, type);
    }
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clampInt(value, min, max, fallback) {
    const parsed = toInt(value, fallback);
    return Math.max(min, Math.min(max, parsed));
  }

  async function adminFetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
      window.location.href = "/admin/login";
      throw new Error("未登录或会话已过期");
    }
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }
    return response.json();
  }

  function stableSerialize(value) {
    try {
      return JSON.stringify(value ?? null);
    } catch {
      return "";
    }
  }

  function formatDashboardStage(stageIndex) {
    const index = Math.max(1, toInt(stageIndex, 1));
    return `${DASHBOARD_STAGE_TEXT[index] || String(index)}级`;
  }

  function buildDashboardOptionKey(stageIndex, typeKey) {
    return `stage${Math.max(1, toInt(stageIndex, 1))}:${String(typeKey || "").trim().toLowerCase()}`;
  }

  function normalizeDashboardEditorDraft(rawEditor, stageCount) {
    const source = rawEditor && typeof rawEditor === "object" ? rawEditor : {};
    const sourceNodeConfigs = source.node_configs && typeof source.node_configs === "object"
      ? source.node_configs
      : {};
    const maxStage = Math.max(1, toInt(stageCount, 1));
    const validType = new Set(DASHBOARD_OPTION_DEFS.map((item) => item.key));
    const nodeConfigs = {};

    for (const [nodeKey, config] of Object.entries(sourceNodeConfigs)) {
      if (!nodeKey || !config || typeof config !== "object") {
        continue;
      }

      const selected = [];
      const sourceSelected = Array.isArray(config.selected) ? config.selected : [];
      for (const item of sourceSelected) {
        const text = String(item || "").trim().toLowerCase();
        const matched = text.match(/^stage(\d+):(altitude|speed|accel|engine|d3)$/);
        if (!matched) {
          continue;
        }
        const stageIndex = Math.max(1, toInt(matched[1], 1));
        const typeKey = matched[2];
        if (stageIndex > maxStage || !validType.has(typeKey)) {
          continue;
        }
        const normalizedKey = buildDashboardOptionKey(stageIndex, typeKey);
        if (!selected.includes(normalizedKey)) {
          selected.push(normalizedKey);
        }
        if (selected.length >= 4) {
          break;
        }
      }

      if (selected.length > 0) {
        nodeConfigs[nodeKey] = { selected };
      }
    }

    return {
      version: 1,
      node_configs: nodeConfigs,
    };
  }

  function finalizeDashboardEditorForSave(rawEditor, stageCount) {
    const maxStage = Math.max(1, toInt(stageCount, 1));
    const normalized = normalizeDashboardEditorDraft(rawEditor, maxStage);
    const nodeConfigs = {};
    const allOptionKeys = [];

    for (let stageIndex = 1; stageIndex <= maxStage; stageIndex += 1) {
      DASHBOARD_OPTION_DEFS.forEach((option) => {
        allOptionKeys.push(buildDashboardOptionKey(stageIndex, option.key));
      });
    }

    for (const [nodeKey, config] of Object.entries(normalized.node_configs || {})) {
      let selected = Array.isArray(config?.selected) ? config.selected : [];
      selected = Array.from(new Set(selected.filter((item) => allOptionKeys.includes(item)))).slice(0, 4);

      if (selected.length === 1 || selected.length === 3) {
        const rest = allOptionKeys.filter((item) => !selected.includes(item));
        if (rest.length > 0) {
          const randomIndex = Math.floor(Math.random() * rest.length);
          const picked = rest[Math.max(0, Math.min(rest.length - 1, randomIndex))];
          if (picked) {
            selected.push(picked);
          }
        }
      }

      if (selected.length > 0) {
        nodeConfigs[nodeKey] = { selected: selected.slice(0, 4) };
      }
    }

    return {
      version: 1,
      node_configs: nodeConfigs,
    };
  }

  async function loadDashboardDraftModel() {
    const snapshot = await adminFetchJson("/api/state", { cache: "no-store" });
    const modelName = String(snapshot?.current_model || "").trim();
    if (!modelName) {
      throw new Error("请先选择型号");
    }

    const models = await adminFetchJson("/api/models", { cache: "no-store" });
    const model = models && typeof models === "object" ? models[modelName] : null;
    if (!model || typeof model !== "object") {
      throw new Error("当前型号配置不存在");
    }

    state.dashboard.modelName = modelName;
    state.dashboard.draftModel = JSON.parse(JSON.stringify(model));
    const stageCount = Math.max(1, toInt(model?.rocket_meta?.stage_count, 1));
    state.dashboard.draftModel.dashboard_editor = normalizeDashboardEditorDraft(model.dashboard_editor, stageCount);
    state.dashboard.snapshotSignature = stableSerialize(state.dashboard.draftModel.dashboard_editor);
  }

  function renderDashboardConfigTable() {
    if (!dom.dashboardConfigTable) {
      return;
    }

    const model = state.dashboard.draftModel;
    if (!model) {
      dom.dashboardConfigTable.innerHTML = "";
      return;
    }

    const stageCount = Math.max(1, toInt(model?.rocket_meta?.stage_count, 1));
    const editor = normalizeDashboardEditorDraft(model.dashboard_editor, stageCount);
    model.dashboard_editor = editor;

    const events = (Array.isArray(model.events) ? model.events : [])
      .map((event, index) => ({
        id: String(event?.id || `evt_${index + 1}`),
        name: String(event?.name || "未命名事件"),
        time: toInt(event?.time, 0),
      }))
      .sort((a, b) => a.time - b.time);

    if (events.length <= 0) {
      dom.dashboardConfigTable.innerHTML = "<tbody><tr><td>当前型号无事件，无法配置仪表盘。</td></tr></tbody>";
      return;
    }

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const headNode = document.createElement("th");
    headNode.textContent = "节点";
    headNode.className = "dashboard-node-col";
    headRow.appendChild(headNode);

    const headTime = document.createElement("th");
    headTime.textContent = "时间";
    headTime.className = "dashboard-time-col";
    headRow.appendChild(headTime);

    for (let stageIndex = 1; stageIndex <= stageCount; stageIndex += 1) {
      const th = document.createElement("th");
      th.textContent = `${formatDashboardStage(stageIndex)}数据`;
      headRow.appendChild(th);
    }

    thead.appendChild(headRow);

    const tbody = document.createElement("tbody");

    const allOptionKeys = [];
    for (let stageIndex = 1; stageIndex <= stageCount; stageIndex += 1) {
      DASHBOARD_OPTION_DEFS.forEach((option) => {
        allOptionKeys.push(buildDashboardOptionKey(stageIndex, option.key));
      });
    }

    const normalizeSelectionOrder = (rawSelected) => {
      const selectedSet = new Set(Array.isArray(rawSelected) ? rawSelected : []);
      const ordered = allOptionKeys.filter((key) => selectedSet.has(key));
      return ordered.slice(0, 4);
    };

    const updateSelection = (nodeKey, optionKey) => {
      const existing = editor.node_configs[nodeKey] && Array.isArray(editor.node_configs[nodeKey].selected)
        ? editor.node_configs[nodeKey].selected.slice()
        : [];
      const selected = normalizeSelectionOrder(existing);
      const index = selected.indexOf(optionKey);

      if (index >= 0) {
        selected.splice(index, 1);
      } else {
        if (selected.length >= 4) {
          notify("每个事件最多点亮 4 个仪表盘数据", "warning");
          return;
        }
        selected.push(optionKey);
      }

      const normalized = normalizeSelectionOrder(selected);

      if (normalized.length > 0) {
        editor.node_configs[nodeKey] = { selected: normalized };
      } else {
        delete editor.node_configs[nodeKey];
      }

      state.dashboard.draftModel.dashboard_editor = editor;
      renderDashboardConfigTable();
    };

    events.forEach((event) => {
      const tr = document.createElement("tr");
      const nodeKey = `event:${event.id}`;
      const selected = editor.node_configs[nodeKey]?.selected || [];

      const tdNode = document.createElement("td");
      tdNode.className = "dashboard-node-col";
      tdNode.textContent = event.name;
      tr.appendChild(tdNode);

      const tdTime = document.createElement("td");
      tdTime.className = "dashboard-time-col";
      tdTime.textContent = `T${event.time >= 0 ? "+" : ""}${event.time}`;
      tr.appendChild(tdTime);

      for (let stageIndex = 1; stageIndex <= stageCount; stageIndex += 1) {
        const tdStage = document.createElement("td");
        tdStage.className = "dashboard-stage-cell";

        const optionsWrap = document.createElement("div");
        optionsWrap.className = "dashboard-stage-options";

        DASHBOARD_OPTION_DEFS.forEach((option) => {
          const optionKey = buildDashboardOptionKey(stageIndex, option.key);
          const orderIndex = selected.indexOf(optionKey);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "dashboard-option-btn";
          btn.classList.toggle("active", orderIndex >= 0);
          btn.textContent = orderIndex >= 0
            ? `${formatDashboardStage(stageIndex)}${option.label} #${orderIndex + 1}`
            : `${formatDashboardStage(stageIndex)}${option.label}`;
          btn.addEventListener("click", () => updateSelection(nodeKey, optionKey));
          optionsWrap.appendChild(btn);
        });

        tdStage.appendChild(optionsWrap);
        tr.appendChild(tdStage);
      }

      tbody.appendChild(tr);
    });

    dom.dashboardConfigTable.innerHTML = "";
    dom.dashboardConfigTable.appendChild(thead);
    dom.dashboardConfigTable.appendChild(tbody);
  }

  function readStoredVideoMeta() {
    try {
      const raw = window.localStorage.getItem(VIDEO_META_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function writeStoredVideoMeta(meta) {
    try {
      window.localStorage.setItem(VIDEO_META_STORAGE_KEY, JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        ...meta,
      }));
    } catch {
      // ignore storage errors
    }
  }

  function clearStoredVideoMeta() {
    try {
      window.localStorage.removeItem(VIDEO_META_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }

  function openVideoFileDatabase() {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(VIDEO_FILE_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(VIDEO_FILE_STORE_NAME)) {
          database.createObjectStore(VIDEO_FILE_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("无法打开视频文件存储"));
    });
  }

  async function saveVideoFileToStore(file) {
    if (!(file instanceof File)) {
      return;
    }

    const database = await openVideoFileDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(VIDEO_FILE_STORE_NAME, "readwrite");
      const store = transaction.objectStore(VIDEO_FILE_STORE_NAME);
      store.put(file, VIDEO_FILE_STORE_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("保存视频文件失败"));
      };
    });
  }

  async function clearVideoFileStore() {
    try {
      const database = await openVideoFileDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(VIDEO_FILE_STORE_NAME, "readwrite");
        transaction.objectStore(VIDEO_FILE_STORE_NAME).delete(VIDEO_FILE_STORE_KEY);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error("清除视频文件失败"));
        };
      });
    } catch {
      // ignore storage errors
    }
  }

  function buildStoredVideoMeta() {
    return {
      fileName: state.video.fileName || "",
      calibration: {
        ...state.video.calibration,
      },
      resolutionPresetId: state.videoResolutionPresetId,
      resolution: {
        ...state.videoResolution,
      },
    };
  }

  function persistVideoMeta() {
    writeStoredVideoMeta(buildStoredVideoMeta());
  }

  async function persistSelectedVideoAsset() {
    if (state.video.file instanceof File) {
      await saveVideoFileToStore(state.video.file);
      persistVideoMeta();
      return;
    }

    clearStoredVideoMeta();
    await clearVideoFileStore();
  }

  function getResolutionPresetById(id) {
    const target = String(id || "").trim().toLowerCase();
    return RESOLUTION_PRESETS.find((item) => item.id === target) || RESOLUTION_PRESETS.find((item) => item.id === DEFAULT_PRESET_ID) || RESOLUTION_PRESETS[0];
  }

  function applyResolutionPreset(selectEl, presetId) {
    if (!selectEl) {
      return;
    }
    selectEl.value = getResolutionPresetById(presetId).id;
  }

  function getActiveButton() {
    return dom.modeButtons.find((button) => button.dataset.previewMode === state.mode) || dom.modeButtons[0] || null;
  }

  function positionModeThumb() {
    const button = getActiveButton();
    if (!button) {
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const switchRect = dom.previewModeSwitch.getBoundingClientRect();
    const offsetLeft = buttonRect.left - switchRect.left;

    dom.previewModeThumb.style.width = `${Math.max(0, buttonRect.width)}px`;
    dom.previewModeThumb.style.transform = `translateX(${Math.max(0, offsetLeft)}px)`;
  }

  function toggleActionGroups() {
    for (const group of dom.actionGroups) {
      const mode = String(group.dataset.previewActions || "").trim();
      group.classList.toggle("hidden", mode !== state.mode);
    }
  }

  function setModeButtonState() {
    for (const button of dom.modeButtons) {
      const active = button.dataset.previewMode === state.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    }
  }

  function buildPageUrl(mode, options = {}) {
    const targetMode = MODES.includes(mode) ? mode : "visitor";
    const embed = options.embed === true;
    const absolute = options.absolute === true;
    const withCacheBust = options.withCacheBust !== false;

    const search = new URLSearchParams();
    if (embed) {
      search.set("embed", "1");
    }
    if (state.themeId) {
      search.set("theme", state.themeId);
    }
    if (targetMode === "obs") {
      search.set("res", state.obsResolutionPresetId);
    } else if (targetMode === "video") {
      search.set("res", state.videoResolutionPresetId);
    }
    if (withCacheBust) {
      search.set("t", String(Date.now()));
    }

    const basePath = MODE_PATH[targetMode] || MODE_PATH.visitor;
    const query = search.toString();
    const relativeUrl = query ? `${basePath}?${query}` : basePath;
    if (!absolute) {
      return relativeUrl;
    }

    return `${window.location.origin}${relativeUrl}`;
  }

  async function getShareUrl(mode) {
    const targetMode = MODES.includes(mode) ? mode : "visitor";
    try {
      const response = await fetch(`/api/visitor_url?mode=${encodeURIComponent(targetMode)}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.url) {
          const url = new URL(String(data.url), window.location.origin);
          if (state.themeId) {
            url.searchParams.set("theme", state.themeId);
          }
          if (targetMode === "obs") {
            url.searchParams.set("res", state.obsResolutionPresetId);
          } else if (targetMode === "video") {
            url.searchParams.set("res", state.videoResolutionPresetId);
          }
          return url.toString();
        }
      }
    } catch {
      // fallback below
    }

    return buildPageUrl(targetMode, {
      absolute: true,
      embed: false,
      withCacheBust: false,
    });
  }

  function postToPreviewFrame(type, payload) {
    const frameWindow = dom.previewFrame.contentWindow;
    if (!frameWindow) {
      return false;
    }
    frameWindow.postMessage({ type, payload }, window.location.origin);
    return true;
  }

  function applyPreviewResolution() {
    if (!dom.previewFrame || !dom.previewStage) {
      return;
    }

    if (state.mode === "visitor") {
      dom.previewFrame.style.width = "100%";
      dom.previewFrame.style.height = "100%";
      dom.previewFrame.style.transform = "translate(-50%, -50%)";
      return;
    }

    const source = state.mode === "obs" ? state.obsResolution : state.videoResolution;
    const width = Math.max(320, toInt(source.width, 1920));
    const height = Math.max(180, toInt(source.height, 1080));

    const stageRect = dom.previewStage.getBoundingClientRect();
    if (!Number.isFinite(stageRect.width) || !Number.isFinite(stageRect.height) || stageRect.width <= 0 || stageRect.height <= 0) {
      return;
    }

    const scale = Math.min(stageRect.width / width, stageRect.height / height);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

    dom.previewFrame.style.width = `${width}px`;
    dom.previewFrame.style.height = `${height}px`;
    dom.previewFrame.style.transform = `translate(-50%, -50%) scale(${safeScale})`;
  }

  function refreshPreviewFrame(withCacheBust = true) {
    dom.previewFrame.src = buildPageUrl(state.mode, {
      embed: true,
      withCacheBust,
    });
  }

  function setPreviewMode(mode, options = {}) {
    const nextMode = MODES.includes(mode) ? mode : "visitor";
    const shouldRefresh = options.refresh !== false;

    state.mode = nextMode;
    setModeButtonState();
    toggleActionGroups();
    positionModeThumb();
    applyPreviewResolution();

    if (shouldRefresh) {
      refreshPreviewFrame(true);
    }
  }

  async function openPreviewConfig(mode) {
    state.configMode = mode === "video"
      ? "video"
      : mode === "dashboard"
        ? "dashboard"
        : "obs";

    dom.previewConfigTitle.textContent = state.configMode === "video"
      ? "视频页面设置"
      : state.configMode === "dashboard"
        ? "仪表盘设置"
        : "OBS 页面设置";

    dom.obsConfigPane.classList.toggle("hidden", state.configMode !== "obs");
    dom.videoConfigPane.classList.toggle("hidden", state.configMode !== "video");
    if (dom.dashboardConfigPane) {
      dom.dashboardConfigPane.classList.toggle("hidden", state.configMode !== "dashboard");
    }

    applyResolutionPreset(dom.obsResolutionPresetSelect, state.obsResolutionPresetId);
    applyResolutionPreset(dom.videoResolutionPresetSelect, state.videoResolutionPresetId);

    if (state.configMode === "dashboard") {
      await loadDashboardDraftModel();
      renderDashboardConfigTable();
    } else {
      renderVideoConfigFields();
    }

    dom.previewConfigModal.classList.toggle("mode-dashboard", state.configMode === "dashboard");
    dom.previewConfigModal.classList.remove("hidden");
  }

  function closePreviewConfig() {
    dom.previewConfigModal.classList.remove("mode-dashboard");
    dom.previewConfigModal.classList.add("hidden");
  }

  function getVideoDurationForSync() {
    if (Number.isFinite(state.video.duration) && state.video.duration > 0) {
      return state.video.duration;
    }

    const range = state.video.calibration.missionEndSeconds - state.video.calibration.missionStartSeconds;
    if (Number.isFinite(range) && range > 0) {
      return range;
    }

    return 0;
  }

  function round3(value) {
    return Math.round(value * 1000) / 1000;
  }

  function renderVideoConfigFields() {
    suppressVideoCalibrationUpdate = true;

    applyResolutionPreset(dom.videoResolutionPresetSelect, state.videoResolutionPresetId);

    dom.videoSourceName.textContent = state.video.fileName
      ? `已选择：${state.video.fileName}`
      : "未选择视频";

    const duration = getVideoDurationForSync();
    const outputPreset = getResolutionPresetById(state.videoResolutionPresetId);
    if (Number.isFinite(state.video.duration) && state.video.duration > 0) {
      dom.videoMetaHint.textContent = `视频信息：${Math.max(1, toInt(state.video.sourceWidth, 1920))} x ${Math.max(1, toInt(state.video.sourceHeight, 1080))}，时长 ${state.video.duration.toFixed(3)} 秒；输出 ${outputPreset.label} (${outputPreset.width} x ${outputPreset.height})`;
    } else {
      dom.videoMetaHint.textContent = `视频信息：未加载；输出 ${outputPreset.label} (${outputPreset.width} x ${outputPreset.height})`;
    }

    dom.videoT0Input.value = String(round3(state.video.calibration.t0VideoSeconds));
    dom.videoMissionStartInput.value = String(round3(state.video.calibration.missionStartSeconds));
    dom.videoMissionEndInput.value = String(round3(
      Number.isFinite(state.video.calibration.missionEndSeconds)
        ? state.video.calibration.missionEndSeconds
        : state.video.calibration.missionStartSeconds + duration,
    ));

    suppressVideoCalibrationUpdate = false;
  }

  function syncVideoCalibration(source) {
    if (suppressVideoCalibrationUpdate) {
      return;
    }

    const duration = getVideoDurationForSync();

    let t0 = state.video.calibration.t0VideoSeconds;
    let missionStart = state.video.calibration.missionStartSeconds;
    let missionEnd = state.video.calibration.missionEndSeconds;

    if (source === "t0") {
      t0 = toNumber(dom.videoT0Input.value, t0);
      missionStart = -t0;
      missionEnd = missionStart + duration;
    } else if (source === "start") {
      missionStart = toNumber(dom.videoMissionStartInput.value, missionStart);
      t0 = -missionStart;
      missionEnd = missionStart + duration;
    } else if (source === "end") {
      missionEnd = toNumber(dom.videoMissionEndInput.value, missionEnd);
      missionStart = missionEnd - duration;
      t0 = -missionStart;
    }

    state.video.calibration = {
      t0VideoSeconds: round3(t0),
      missionStartSeconds: round3(missionStart),
      missionEndSeconds: round3(missionEnd),
    };

    persistVideoMeta();
    renderVideoConfigFields();
  }

  function buildActiveModeSettings(mode) {
    if (mode === "obs") {
      return {
        resolution: {
          width: state.obsResolution.width,
          height: state.obsResolution.height,
        },
      };
    }

    if (mode === "video") {
      return {
        resolution: {
          width: state.videoResolution.width,
          height: state.videoResolution.height,
        },
        calibration: {
          ...state.video.calibration,
        },
        videoFile: state.video.file || null,
        videoFileName: state.video.fileName || "",
      };
    }

    return {};
  }

  function sendCurrentModeConfig() {
    if (state.mode !== "obs" && state.mode !== "video") {
      return;
    }

    postToPreviewFrame("mission-preview:configure", {
      mode: state.mode,
      settings: buildActiveModeSettings(state.mode),
    });
  }

  async function readVideoMetadata(file) {
    return new Promise((resolve, reject) => {
      const probe = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);

      const cleanup = () => {
        probe.src = "";
        URL.revokeObjectURL(objectUrl);
      };

      probe.preload = "metadata";
      probe.muted = true;
      probe.onloadedmetadata = () => {
        const payload = {
          duration: Number(probe.duration || 0),
          width: Number(probe.videoWidth || 0),
          height: Number(probe.videoHeight || 0),
        };
        cleanup();
        resolve(payload);
      };
      probe.onerror = () => {
        cleanup();
        reject(new Error("无法读取视频元数据"));
      };
      probe.src = objectUrl;
    });
  }

  async function savePreviewConfig() {
    if (state.configMode === "dashboard") {
      const modelName = String(state.dashboard.modelName || "").trim();
      if (!modelName || !state.dashboard.draftModel) {
        throw new Error("仪表盘草稿不存在，请重新打开设置");
      }

      const stageCount = Math.max(1, toInt(state.dashboard.draftModel?.rocket_meta?.stage_count, 1));
      state.dashboard.draftModel.dashboard_editor = finalizeDashboardEditorForSave(
        state.dashboard.draftModel.dashboard_editor,
        stageCount,
      );

      let payload = JSON.parse(JSON.stringify(state.dashboard.draftModel));
      if (typeof normalizeDraft === "function") {
        payload = normalizeDraft(payload, modelName);
      }
      payload.name = modelName;
      payload.dashboard_editor = finalizeDashboardEditorForSave(payload.dashboard_editor, stageCount);

      const response = await adminFetchJson("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response?.success) {
        throw new Error(response?.message || "保存仪表盘设置失败");
      }

      state.dashboard.snapshotSignature = stableSerialize(payload.dashboard_editor);
      if (typeof fetchModels === "function") {
        await fetchModels();
      }

      closePreviewConfig();
      notify("仪表盘设置已保存", "success");
      return;
    }

    if (state.configMode === "obs") {
      const preset = getResolutionPresetById(dom.obsResolutionPresetSelect?.value || state.obsResolutionPresetId);
      state.obsResolutionPresetId = preset.id;
      state.obsResolution = {
        width: preset.width,
        height: preset.height,
      };

      if (state.mode === "obs") {
        applyPreviewResolution();
        sendCurrentModeConfig();
      }
      closePreviewConfig();
      notify(`OBS 预览设置已更新 (${preset.label})`, "success");
      return;
    }

    const videoPreset = getResolutionPresetById(dom.videoResolutionPresetSelect?.value || state.videoResolutionPresetId);
    state.videoResolutionPresetId = videoPreset.id;
    state.videoResolution = {
      width: videoPreset.width,
      height: videoPreset.height,
    };

    const file = dom.videoSourceInput.files && dom.videoSourceInput.files[0]
      ? dom.videoSourceInput.files[0]
      : null;

    if (file && file !== state.video.file) {
      state.video.file = file;
      state.video.fileName = file.name;

      try {
        const meta = await readVideoMetadata(file);
        if (Number.isFinite(meta.duration) && meta.duration > 0) {
          state.video.duration = meta.duration;
        }
        if (Number.isFinite(meta.width) && meta.width > 0) {
          state.video.sourceWidth = Math.max(1, toInt(meta.width, 1920));
        }
        if (Number.isFinite(meta.height) && meta.height > 0) {
          state.video.sourceHeight = Math.max(1, toInt(meta.height, 1080));
        }

        syncVideoCalibration("start");
        await persistSelectedVideoAsset();
      } catch (error) {
        notify(error?.message || "读取视频失败", "error");
        return;
      }
    }

    state.video.calibration = {
      t0VideoSeconds: round3(toNumber(dom.videoT0Input.value, state.video.calibration.t0VideoSeconds)),
      missionStartSeconds: round3(toNumber(dom.videoMissionStartInput.value, state.video.calibration.missionStartSeconds)),
      missionEndSeconds: round3(toNumber(dom.videoMissionEndInput.value, state.video.calibration.missionEndSeconds)),
    };

    if (state.mode === "video") {
      applyPreviewResolution();
      sendCurrentModeConfig();
    }

    persistVideoMeta();

    renderVideoConfigFields();
    closePreviewConfig();
    notify(`视频页面设置已更新 (${videoPreset.label})`, "success");
  }

  async function copyModeUrl(mode) {
    try {
      const url = await getShareUrl(mode);
      await navigator.clipboard.writeText(url);
      notify("页面地址已复制", "success");
    } catch {
      notify("复制失败，请手动复制", "error");
    }
  }

  function openModePage(mode) {
    const url = buildPageUrl(mode, {
      embed: false,
      withCacheBust: false,
      absolute: false,
    });
    window.open(url, "_blank", "noopener");
  }

  function handleFrameMessage(event) {
    if (event.origin !== window.location.origin) {
      return;
    }

    const data = event.data;
    if (!data || typeof data !== "object") {
      return;
    }

    if (data.type === "mission-preview:ready") {
      sendCurrentModeConfig();
      return;
    }

    if (data.type === "mission-preview:video-meta") {
      const payload = data.payload || {};
      if (Number.isFinite(payload.duration) && payload.duration > 0) {
        state.video.duration = Number(payload.duration);
      }
      if (Number.isFinite(payload.width) && payload.width > 0) {
        state.video.sourceWidth = Math.max(1, toInt(payload.width, 1920));
      }
      if (Number.isFinite(payload.height) && payload.height > 0) {
        state.video.sourceHeight = Math.max(1, toInt(payload.height, 1080));
      }

      syncVideoCalibration("start");
      renderVideoConfigFields();
      applyPreviewResolution();
      return;
    }

  }

  function bindEvents() {
    for (const button of dom.modeButtons) {
      button.addEventListener("click", () => {
        setPreviewMode(String(button.dataset.previewMode || "visitor"), { refresh: true });
      });
    }

    if (dom.openVisitorPreviewBtn) {
      dom.openVisitorPreviewBtn.addEventListener("click", () => openModePage("visitor"));
    }

    if (dom.copyObsUrlBtn) {
      dom.copyObsUrlBtn.addEventListener("click", () => {
        copyModeUrl("obs").catch(() => {});
      });
    }
    if (dom.openObsPageBtn) {
      dom.openObsPageBtn.addEventListener("click", () => openModePage("obs"));
    }
    if (dom.copyVideoUrlBtn) {
      dom.copyVideoUrlBtn.addEventListener("click", () => {
        copyModeUrl("video").catch(() => {});
      });
    }
    if (dom.openVideoPageBtn) {
      dom.openVideoPageBtn.addEventListener("click", () => openModePage("video"));
    }

    if (dom.openObsSettingsBtn) {
      dom.openObsSettingsBtn.addEventListener("click", () => {
        openPreviewConfig("obs").catch((error) => notify(error?.message || "打开设置失败", "error"));
      });
    }
    if (dom.openVideoSettingsBtn) {
      dom.openVideoSettingsBtn.addEventListener("click", () => {
        openPreviewConfig("video").catch((error) => notify(error?.message || "打开设置失败", "error"));
      });
    }
    if (dom.openDashboardEditorBtn) {
      dom.openDashboardEditorBtn.addEventListener("click", () => {
        openPreviewConfig("dashboard").catch((error) => notify(error?.message || "打开仪表盘设置失败", "error"));
      });
    }

    if (dom.previewConfigBackdrop) {
      dom.previewConfigBackdrop.addEventListener("click", closePreviewConfig);
    }
    if (dom.closePreviewConfigBtn) {
      dom.closePreviewConfigBtn.addEventListener("click", closePreviewConfig);
    }
    if (dom.savePreviewConfigBtn) {
      dom.savePreviewConfigBtn.addEventListener("click", () => {
        savePreviewConfig().catch((error) => {
          notify(error?.message || "保存设置失败", "error");
        });
      });
    }

    if (dom.videoSourceInput) {
      dom.videoSourceInput.addEventListener("change", () => {
        const file = dom.videoSourceInput.files && dom.videoSourceInput.files[0]
          ? dom.videoSourceInput.files[0]
          : null;

        if (!file) {
          state.video.file = null;
          state.video.fileName = "";
          state.video.duration = Number.NaN;
          state.video.sourceWidth = 1920;
          state.video.sourceHeight = 1080;
          persistSelectedVideoAsset().catch(() => {});
          renderVideoConfigFields();
          return;
        }

        state.video.file = file;
        state.video.fileName = file.name;

        readVideoMetadata(file)
          .then((meta) => {
            if (Number.isFinite(meta.duration) && meta.duration > 0) {
              state.video.duration = meta.duration;
            }
            if (Number.isFinite(meta.width) && meta.width > 0) {
              state.video.sourceWidth = Math.max(1, toInt(meta.width, 1920));
            }
            if (Number.isFinite(meta.height) && meta.height > 0) {
              state.video.sourceHeight = Math.max(1, toInt(meta.height, 1080));
            }

            // 选中文件时立即刷新时间校正参数，避免用户还需额外点保存才看到时长回填。
            syncVideoCalibration("start");
            persistSelectedVideoAsset().catch(() => {});
            renderVideoConfigFields();

            if (state.mode === "video") {
              applyPreviewResolution();
              sendCurrentModeConfig();
            }
          })
          .catch((error) => {
            notify(error?.message || "读取视频失败", "error");
          });
      });
    }

    if (dom.videoT0Input) {
      dom.videoT0Input.addEventListener("input", () => syncVideoCalibration("t0"));
    }
    if (dom.videoMissionStartInput) {
      dom.videoMissionStartInput.addEventListener("input", () => syncVideoCalibration("start"));
    }
    if (dom.videoMissionEndInput) {
      dom.videoMissionEndInput.addEventListener("input", () => syncVideoCalibration("end"));
    }

    dom.previewFrame.addEventListener("load", () => {
      applyPreviewResolution();
      sendCurrentModeConfig();
      setTimeout(positionModeThumb, 0);
    });

    window.addEventListener("resize", () => {
      applyPreviewResolution();
      positionModeThumb();
    });

    window.addEventListener("mission-admin-theme-change", (event) => {
      const themeId = String(event?.detail?.themeId || "").trim();
      if (!themeId) {
        return;
      }
      state.themeId = themeId;
    });

    window.addEventListener("message", handleFrameMessage);
  }

  function init() {
    try {
      const currentFrameUrl = new URL(dom.previewFrame.getAttribute("src") || "", window.location.origin);
      const theme = currentFrameUrl.searchParams.get("theme");
      if (theme) {
        state.themeId = theme;
      }
    } catch {
      // ignore
    }

    bindEvents();
    setModeButtonState();
    toggleActionGroups();
    renderVideoConfigFields();
    setTimeout(() => {
      positionModeThumb();
      applyPreviewResolution();
    }, 0);

    window.AdminPreviewController = {
      refresh(options = {}) {
        const themeId = String(options.themeId || "").trim();
        if (themeId) {
          state.themeId = themeId;
        }
        refreshPreviewFrame(options.withCacheBust !== false);
      },
      setMode(mode) {
        setPreviewMode(mode, { refresh: true });
      },
      getMode() {
        return state.mode;
      },
    };
  }

  init();
})();
