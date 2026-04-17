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
    openObsExportBtn: document.getElementById("openObsExportBtn"),
    openVideoExportBtn: document.getElementById("openVideoExportBtn"),

    previewConfigModal: document.getElementById("previewConfigModal"),
    previewConfigBackdrop: document.getElementById("previewConfigBackdrop"),
    previewConfigTitle: document.getElementById("previewConfigTitle"),
    obsConfigPane: document.getElementById("obsConfigPane"),
    videoConfigPane: document.getElementById("videoConfigPane"),
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

    previewExportModal: document.getElementById("previewExportModal"),
    previewExportBackdrop: document.getElementById("previewExportBackdrop"),
    previewExportTitle: document.getElementById("previewExportTitle"),
    exportStartInput: document.getElementById("exportStartInput"),
    exportEndInput: document.getElementById("exportEndInput"),
    exportFpsSelect: document.getElementById("exportFpsSelect"),
    exportFormatSelect: document.getElementById("exportFormatSelect"),
    previewExportProgressFill: document.getElementById("previewExportProgressFill"),
    previewExportProgressText: document.getElementById("previewExportProgressText"),
    previewExportHint: document.getElementById("previewExportHint"),
    closePreviewExportBtn: document.getElementById("closePreviewExportBtn"),
    cancelPreviewExportBtn: document.getElementById("cancelPreviewExportBtn"),
    startPreviewExportBtn: document.getElementById("startPreviewExportBtn"),
  };

  if (!dom.previewFrame || !dom.previewModeSwitch || !dom.previewModeThumb || !dom.previewStage) {
    return;
  }

  const state = {
    mode: "visitor",
    themeId: "",
    configMode: "obs",
    exportMode: "obs",
    exportBusy: false,
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

  function openPreviewConfig(mode) {
    state.configMode = mode === "video" ? "video" : "obs";

    dom.previewConfigTitle.textContent = state.configMode === "video" ? "视频页面设置" : "OBS 页面设置";
    dom.obsConfigPane.classList.toggle("hidden", state.configMode !== "obs");
    dom.videoConfigPane.classList.toggle("hidden", state.configMode !== "video");

    applyResolutionPreset(dom.obsResolutionPresetSelect, state.obsResolutionPresetId);
    applyResolutionPreset(dom.videoResolutionPresetSelect, state.videoResolutionPresetId);

    renderVideoConfigFields();
    dom.previewConfigModal.classList.remove("hidden");
  }

  function closePreviewConfig() {
    dom.previewConfigModal.classList.add("hidden");
  }

  function openPreviewExport(mode) {
    state.exportMode = mode === "video" ? "video" : "obs";
    dom.previewExportTitle.textContent = state.exportMode === "video" ? "导出视频页面" : "导出 OBS 页面";
    dom.previewExportHint.textContent = state.exportMode === "video"
      ? "视频模式会同步本地视频背景与时间轴校正参数。"
      : "OBS 模式会导出透明背景画面（取决于浏览器编码器支持）。";
    setExportProgress(0, "准备导出");
    dom.previewExportModal.classList.remove("hidden");
    setExportBusy(false);
  }

  function closePreviewExport() {
    if (state.exportBusy) {
      return;
    }
    dom.previewExportModal.classList.add("hidden");
  }

  function setExportBusy(busy) {
    state.exportBusy = Boolean(busy);
    dom.exportStartInput.disabled = state.exportBusy;
    dom.exportEndInput.disabled = state.exportBusy;
    dom.exportFpsSelect.disabled = state.exportBusy;
    dom.exportFormatSelect.disabled = state.exportBusy;
    dom.closePreviewExportBtn.disabled = state.exportBusy;
    dom.startPreviewExportBtn.disabled = state.exportBusy;
    dom.cancelPreviewExportBtn.disabled = false;
    dom.cancelPreviewExportBtn.textContent = state.exportBusy ? "取消导出" : "关闭";
  }

  function setExportProgress(progress, text) {
    const value = Math.max(0, Math.min(100, toNumber(progress, 0)));
    dom.previewExportProgressFill.style.width = `${value.toFixed(1)}%`;
    dom.previewExportProgressText.textContent = text || `导出进度 ${value.toFixed(1)}%`;
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

  function startExport() {
    const startSeconds = toNumber(dom.exportStartInput.value, Number.NaN);
    const endSeconds = toNumber(dom.exportEndInput.value, Number.NaN);
    const fps = clampInt(dom.exportFpsSelect.value, 1, 120, 30);
    const format = String(dom.exportFormatSelect.value || "webm").toLowerCase();

    if (state.mode !== state.exportMode) {
      notify("请保持当前预览模式后再导出", "error");
      return;
    }

    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
      notify("导出时间范围无效", "error");
      return;
    }

    if (state.exportMode === "video" && !state.video.file) {
      notify("请先在视频设置里选择本地视频", "error");
      return;
    }

    const ok = postToPreviewFrame("mission-preview:export", {
      mode: state.exportMode,
      startSeconds,
      endSeconds,
      fps,
      format,
    });

    if (!ok) {
      notify("预览页面尚未加载完成", "error");
      return;
    }

    setExportBusy(true);
    setExportProgress(0, "导出已开始");
  }

  function cancelExport() {
    if (!state.exportBusy) {
      closePreviewExport();
      return;
    }

    postToPreviewFrame("mission-preview:export-cancel", {
      mode: state.exportMode,
    });
    setExportProgress(0, "正在取消导出...");
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

    if (data.type === "mission-preview:export-progress") {
      const payload = data.payload || {};
      setExportProgress(payload.progress, payload.text || "正在导出");
      return;
    }

    if (data.type === "mission-preview:export-finished") {
      const payload = data.payload || {};
      setExportBusy(false);
      setExportProgress(100, payload.text || "导出完成");
      notify(payload.text || "导出完成", "success");
      return;
    }

    if (data.type === "mission-preview:export-cancelled") {
      setExportBusy(false);
      setExportProgress(0, "导出已取消");
      notify("导出已取消", "info");
      return;
    }

    if (data.type === "mission-preview:export-error") {
      const payload = data.payload || {};
      setExportBusy(false);
      setExportProgress(0, payload.message || "导出失败");
      notify(payload.message || "导出失败", "error");
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
      dom.openObsSettingsBtn.addEventListener("click", () => openPreviewConfig("obs"));
    }
    if (dom.openVideoSettingsBtn) {
      dom.openVideoSettingsBtn.addEventListener("click", () => openPreviewConfig("video"));
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

    if (dom.openObsExportBtn) {
      dom.openObsExportBtn.addEventListener("click", () => openPreviewExport("obs"));
    }
    if (dom.openVideoExportBtn) {
      dom.openVideoExportBtn.addEventListener("click", () => openPreviewExport("video"));
    }
    if (dom.previewExportBackdrop) {
      dom.previewExportBackdrop.addEventListener("click", closePreviewExport);
    }
    if (dom.closePreviewExportBtn) {
      dom.closePreviewExportBtn.addEventListener("click", closePreviewExport);
    }
    if (dom.cancelPreviewExportBtn) {
      dom.cancelPreviewExportBtn.addEventListener("click", cancelExport);
    }
    if (dom.startPreviewExportBtn) {
      dom.startPreviewExportBtn.addEventListener("click", startExport);
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
    setExportProgress(0, "准备导出");
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
