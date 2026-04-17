(() => {
  const mode = String(document.body?.dataset?.viewMode || "visitor").trim().toLowerCase();
  if (!["obs", "video", "visitor"].includes(mode)) {
    return;
  }

  const RESOLUTION_PRESETS = {
    "480p": { width: 854, height: 480 },
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
    "2k": { width: 2560, height: 1440 },
    "4k": { width: 3840, height: 2160 },
  };

  const bridge = window.MissionViewerBridge || null;
  if (!bridge) {
    return;
  }

  const nodes = {
    videoBackground: document.getElementById("modeVideoBackground"),
    timelineMount: document.getElementById("timelineMount"),
    telemetryLeft: document.getElementById("telemetryGaugesLeft"),
    telemetryRight: document.getElementById("telemetryGaugesRight"),
    overlayRoot: document.querySelector(".mission-overlay"),
    overlaySign: document.getElementById("overlayClockSign"),
    overlayTime: document.getElementById("overlayClockTime"),
    overlayLine: document.querySelector(".mission-overlay-line"),
  };

  const state = {
    mode,
    exportBusy: false,
    exportCancelled: false,
    resolution: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    video: {
      objectUrl: "",
      fileName: "",
      duration: Number.NaN,
      width: 1920,
      height: 1080,
      calibration: {
        t0VideoSeconds: 0,
        missionStartSeconds: 0,
        missionEndSeconds: 0,
      },
    },
  };

  function toNumber(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function waitMs(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, ms));
    });
  }

  function waitAnimationFrame() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  function postToParent(type, payload = {}) {
    if (window.parent === window) {
      return;
    }
    window.parent.postMessage({ type, payload }, window.location.origin);
  }

  function safeFormatSeconds(value) {
    const numeric = toNumber(value, 0);
    return `${Math.round(numeric * 1000) / 1000}`;
  }

  function getResolutionFromQuery() {
    let res = "";
    try {
      const url = new URL(window.location.href);
      res = String(url.searchParams.get("res") || "").trim().toLowerCase();
    } catch {
      res = "";
    }

    if (!res || !Object.prototype.hasOwnProperty.call(RESOLUTION_PRESETS, res)) {
      return null;
    }

    const preset = RESOLUTION_PRESETS[res];
    return {
      width: preset.width,
      height: preset.height,
    };
  }

  function applyForcedResolution(input) {
    const width = Math.max(320, toInt(input?.width, state.resolution.width || 1920));
    const height = Math.max(180, toInt(input?.height, state.resolution.height || 1080));

    state.resolution.width = width;
    state.resolution.height = height;

    document.documentElement.style.width = `${width}px`;
    document.documentElement.style.height = `${height}px`;
    document.body.style.width = `${width}px`;
    document.body.style.height = `${height}px`;

    window.dispatchEvent(new Event("resize"));
  }

  function applyVideoCalibration(calibration) {
    if (!calibration || typeof calibration !== "object") {
      return;
    }

    state.video.calibration.t0VideoSeconds = toNumber(
      calibration.t0VideoSeconds,
      state.video.calibration.t0VideoSeconds,
    );
    state.video.calibration.missionStartSeconds = toNumber(
      calibration.missionStartSeconds,
      state.video.calibration.missionStartSeconds,
    );
    state.video.calibration.missionEndSeconds = toNumber(
      calibration.missionEndSeconds,
      state.video.calibration.missionEndSeconds,
    );
  }

  function missionToVideoSeconds(missionSeconds) {
    return missionSeconds - state.video.calibration.missionStartSeconds;
  }

  async function loadVideoFile(file, explicitName = "") {
    if (!nodes.videoBackground || !file) {
      return;
    }

    if (state.video.objectUrl) {
      URL.revokeObjectURL(state.video.objectUrl);
      state.video.objectUrl = "";
    }

    state.video.objectUrl = URL.createObjectURL(file);
    state.video.fileName = explicitName || file.name || "local-video";

    nodes.videoBackground.controls = false;
    nodes.videoBackground.loop = false;
    nodes.videoBackground.muted = true;
    nodes.videoBackground.playsInline = true;
    nodes.videoBackground.src = state.video.objectUrl;

    await new Promise((resolve, reject) => {
      const onLoaded = () => {
        nodes.videoBackground.removeEventListener("loadedmetadata", onLoaded);
        nodes.videoBackground.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        nodes.videoBackground.removeEventListener("loadedmetadata", onLoaded);
        nodes.videoBackground.removeEventListener("error", onError);
        reject(new Error("视频加载失败"));
      };
      nodes.videoBackground.addEventListener("loadedmetadata", onLoaded);
      nodes.videoBackground.addEventListener("error", onError);
    });

    state.video.duration = Number(nodes.videoBackground.duration || 0);
    state.video.width = Math.max(320, toInt(nodes.videoBackground.videoWidth, 1920));
    state.video.height = Math.max(180, toInt(nodes.videoBackground.videoHeight, 1080));

    if (!Number.isFinite(state.video.calibration.missionEndSeconds)
      || state.video.calibration.missionEndSeconds <= state.video.calibration.missionStartSeconds) {
      state.video.calibration.missionEndSeconds = state.video.calibration.missionStartSeconds + state.video.duration;
    }

    postToParent("mission-preview:video-meta", {
      duration: state.video.duration,
      width: state.video.width,
      height: state.video.height,
      fileName: state.video.fileName,
    });
  }

  async function seekVideoToMissionTime(missionSeconds) {
    if (state.mode !== "video" || !nodes.videoBackground || !Number.isFinite(state.video.duration) || state.video.duration <= 0) {
      return;
    }

    const target = clamp(missionToVideoSeconds(missionSeconds), 0, state.video.duration);

    if (Math.abs(nodes.videoBackground.currentTime - target) < 0.01) {
      return;
    }

    await new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) {
          return;
        }
        settled = true;
        nodes.videoBackground.removeEventListener("seeked", onSeeked);
        resolve();
      };
      const onSeeked = () => {
        done();
      };

      nodes.videoBackground.addEventListener("seeked", onSeeked, { once: true });
      nodes.videoBackground.currentTime = target;
      window.setTimeout(done, 500);
    });
  }

  function syncVideoPlaybackToTimeline() {
    if (state.mode !== "video" || state.exportBusy || !nodes.videoBackground || !Number.isFinite(state.video.duration) || state.video.duration <= 0) {
      return;
    }

    const missionSeconds = toNumber(bridge.getCurrentMissionSeconds?.(), 0);
    const target = clamp(missionToVideoSeconds(missionSeconds), 0, state.video.duration);

    if (Math.abs(nodes.videoBackground.currentTime - target) > 0.08) {
      nodes.videoBackground.currentTime = target;
    }

    if (nodes.videoBackground.paused) {
      nodes.videoBackground.play().catch(() => {});
    }
  }

  function copySvgWithComputedStyle(svgEl) {
    const clone = svgEl.cloneNode(true);
    const sourceNodes = [svgEl, ...svgEl.querySelectorAll("*")];
    const cloneNodes = [clone, ...clone.querySelectorAll("*")];

    const props = [
      "display",
      "opacity",
      "fill",
      "fill-opacity",
      "stroke",
      "stroke-width",
      "stroke-opacity",
      "stroke-dasharray",
      "stroke-dashoffset",
      "font-family",
      "font-size",
      "font-weight",
      "letter-spacing",
      "text-anchor",
      "dominant-baseline",
      "filter",
      "transform",
    ];

    for (let i = 0; i < sourceNodes.length; i += 1) {
      const source = sourceNodes[i];
      const target = cloneNodes[i];
      if (!source || !target) {
        continue;
      }

      const computed = window.getComputedStyle(source);
      for (const prop of props) {
        const value = computed.getPropertyValue(prop);
        if (value) {
          target.style.setProperty(prop, value);
        }
      }
    }

    return clone;
  }

  async function drawSvgElement(ctx, svgEl, targetRect, scaleX, scaleY) {
    if (!svgEl || !targetRect) {
      return;
    }

    const clone = copySvgWithComputedStyle(svgEl);
    const sourceRect = svgEl.getBoundingClientRect();

    const width = Math.max(1, sourceRect.width);
    const height = Math.max(1, sourceRect.height);

    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    if (!clone.getAttribute("viewBox")) {
      clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("SVG 绘制失败"));
        img.src = url;
      });

      ctx.drawImage(
        image,
        targetRect.left * scaleX,
        targetRect.top * scaleY,
        Math.max(1, targetRect.width * scaleX),
        Math.max(1, targetRect.height * scaleY),
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function drawOverlayText(ctx, canvasWidth, canvasHeight) {
    if (!nodes.overlayRoot || !nodes.overlaySign || !nodes.overlayTime || !nodes.overlayLine) {
      return;
    }

    const scaleX = canvasWidth / Math.max(1, window.innerWidth);
    const scaleY = canvasHeight / Math.max(1, window.innerHeight);

    const signRect = nodes.overlaySign.getBoundingClientRect();
    const timeRect = nodes.overlayTime.getBoundingClientRect();
    const lineRect = nodes.overlayLine.getBoundingClientRect();

    const signStyle = window.getComputedStyle(nodes.overlaySign);
    const timeStyle = window.getComputedStyle(nodes.overlayTime);
    const lineStyle = window.getComputedStyle(nodes.overlayLine);

    ctx.save();
    ctx.textBaseline = "middle";

    ctx.fillStyle = signStyle.color || "rgba(245,245,244,0.8)";
    ctx.font = `${signStyle.fontWeight || "500"} ${Math.max(1, signRect.height * scaleY * 0.8)}px ${signStyle.fontFamily || "sans-serif"}`;
    ctx.textAlign = "left";
    ctx.fillText(
      String(nodes.overlaySign.textContent || ""),
      signRect.left * scaleX,
      (signRect.top + signRect.height * 0.5) * scaleY,
    );

    ctx.fillStyle = timeStyle.color || "#fff";
    ctx.font = `${timeStyle.fontWeight || "400"} ${Math.max(1, timeRect.height * scaleY * 0.82)}px ${timeStyle.fontFamily || "sans-serif"}`;
    ctx.textAlign = "left";
    ctx.fillText(
      String(nodes.overlayTime.textContent || ""),
      timeRect.left * scaleX,
      (timeRect.top + timeRect.height * 0.5) * scaleY,
    );

    ctx.fillStyle = lineStyle.color || "rgba(245,245,244,0.8)";
    ctx.font = `${lineStyle.fontWeight || "500"} ${Math.max(1, lineRect.height * scaleY * 0.76)}px ${lineStyle.fontFamily || "sans-serif"}`;
    ctx.textAlign = "center";
    ctx.fillText(
      String(nodes.overlayLine.textContent || "").trim(),
      (lineRect.left + lineRect.width * 0.5) * scaleX,
      (lineRect.top + lineRect.height * 0.5) * scaleY,
    );

    ctx.restore();
  }

  function drawCoverVideoFrame(ctx, canvas) {
    if (state.mode !== "video" || !nodes.videoBackground || !Number.isFinite(nodes.videoBackground.videoWidth) || nodes.videoBackground.videoWidth <= 0) {
      return;
    }

    const videoW = nodes.videoBackground.videoWidth;
    const videoH = nodes.videoBackground.videoHeight;
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    const videoRatio = videoW / videoH;
    const canvasRatio = canvasW / canvasH;

    let drawW;
    let drawH;
    let drawX;
    let drawY;

    if (videoRatio > canvasRatio) {
      drawH = canvasH;
      drawW = drawH * videoRatio;
      drawX = (canvasW - drawW) / 2;
      drawY = 0;
    } else {
      drawW = canvasW;
      drawH = drawW / videoRatio;
      drawX = 0;
      drawY = (canvasH - drawH) / 2;
    }

    ctx.drawImage(nodes.videoBackground, drawX, drawY, drawW, drawH);
  }

  async function drawExportFrame(ctx, canvas) {
    const scaleX = canvas.width / Math.max(1, window.innerWidth);
    const scaleY = canvas.height / Math.max(1, window.innerHeight);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.mode === "video") {
      drawCoverVideoFrame(ctx, canvas);
    }

    const timelineSvg = document.querySelector(".mission-timeline-svg");
    if (timelineSvg) {
      await drawSvgElement(ctx, timelineSvg, timelineSvg.getBoundingClientRect(), scaleX, scaleY);
    }

    const gaugeSvgs = Array.from(document.querySelectorAll(".telemetry-gauge-svg"));
    for (const svg of gaugeSvgs) {
      await drawSvgElement(ctx, svg, svg.getBoundingClientRect(), scaleX, scaleY);
    }

    const engineSvgs = Array.from(document.querySelectorAll(".telemetry-engine-svg"));
    for (const svg of engineSvgs) {
      await drawSvgElement(ctx, svg, svg.getBoundingClientRect(), scaleX, scaleY);
    }

    drawOverlayText(ctx, canvas.width, canvas.height);
  }

  function chooseRecorderMime(format) {
    const normalized = String(format || "webm").toLowerCase();

    if (normalized === "mov") {
      const movCandidates = [
        "video/quicktime;codecs=png",
        "video/quicktime",
      ];
      for (const candidate of movCandidates) {
        if (MediaRecorder.isTypeSupported(candidate)) {
          return candidate;
        }
      }
      return "";
    }

    const webmCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp8",
      "video/webm",
    ];

    for (const candidate of webmCandidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }

    return "";
  }

  async function runExport(payload) {
    if (state.exportBusy) {
      throw new Error("当前已有导出任务在运行");
    }

    const startSeconds = toNumber(payload?.startSeconds, Number.NaN);
    const endSeconds = toNumber(payload?.endSeconds, Number.NaN);
    const fps = clamp(toInt(payload?.fps, 30), 1, 120);
    const format = String(payload?.format || "webm").toLowerCase();

    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
      throw new Error("导出时间范围不合法");
    }

    if (state.mode === "video" && !nodes.videoBackground?.src) {
      throw new Error("视频模式尚未加载本地视频");
    }

    const mimeType = chooseRecorderMime(format);
    if (!mimeType) {
      if (format === "mov") {
        throw new Error("当前浏览器不支持 MOV 导出，请使用 WEBM");
      }
      throw new Error("当前浏览器不支持可用的视频编码器");
    }

    state.exportBusy = true;
    state.exportCancelled = false;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(320, toInt(state.resolution.width, window.innerWidth));
    canvas.height = Math.max(180, toInt(state.resolution.height, window.innerHeight));

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      state.exportBusy = false;
      throw new Error("无法创建导出画布");
    }

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const stopped = new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    recorder.start();

    try {
      const frameCount = Math.max(1, Math.floor((endSeconds - startSeconds) * fps));

      for (let index = 0; index <= frameCount; index += 1) {
        if (state.exportCancelled) {
          break;
        }

        const missionSeconds = startSeconds + (index / fps);
        bridge.setManualMissionSeconds?.(missionSeconds);

        await waitAnimationFrame();
        if (state.mode === "video") {
          await seekVideoToMissionTime(missionSeconds);
        }
        await drawExportFrame(ctx, canvas);

        const progress = ((index + 1) / (frameCount + 1)) * 100;
        postToParent("mission-preview:export-progress", {
          progress,
          text: `导出中 ${progress.toFixed(1)}%`,
        });

        await waitMs(1000 / fps);
      }
    } finally {
      bridge.clearManualMissionSeconds?.();
      recorder.stop();
      await stopped;
      stream.getTracks().forEach((track) => track.stop());
    }

    if (state.exportCancelled) {
      state.exportBusy = false;
      state.exportCancelled = false;
      postToParent("mission-preview:export-cancelled", {
        mode: state.mode,
      });
      return;
    }

    const ext = format === "mov" ? "mov" : "webm";
    const blobType = mimeType || (ext === "mov" ? "video/quicktime" : "video/webm");
    const blob = new Blob(chunks, { type: blobType });
    const outputUrl = URL.createObjectURL(blob);

    const fileName = `${state.mode}-export-${Date.now()}.${ext}`;
    const anchor = document.createElement("a");
    anchor.href = outputUrl;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(outputUrl);
    }, 30_000);

    state.exportBusy = false;
    postToParent("mission-preview:export-finished", {
      mode: state.mode,
      fileName,
      text: `导出完成：${fileName}`,
    });
  }

  async function applyConfigMessage(payload) {
    const settings = payload?.settings && typeof payload.settings === "object" ? payload.settings : {};

    if (settings.resolution) {
      applyForcedResolution(settings.resolution);
    }

    if (state.mode === "video") {
      applyVideoCalibration(settings.calibration);

      if (settings.videoFile instanceof File) {
        await loadVideoFile(settings.videoFile, settings.videoFileName || settings.videoFile.name || "local-video");
      }
    }
  }

  function handleMessage(event) {
    if (event.origin !== window.location.origin) {
      return;
    }

    const data = event.data;
    if (!data || typeof data !== "object") {
      return;
    }

    if (data.type === "mission-preview:configure") {
      const payload = data.payload || {};
      const payloadMode = String(payload.mode || "").trim().toLowerCase();
      if (payloadMode && payloadMode !== state.mode) {
        return;
      }
      applyConfigMessage(payload).catch((error) => {
        postToParent("mission-preview:export-error", {
          message: error?.message || "设置应用失败",
        });
      });
      return;
    }

    if (data.type === "mission-preview:export") {
      const payload = data.payload || {};
      const payloadMode = String(payload.mode || "").trim().toLowerCase();
      if (payloadMode && payloadMode !== state.mode) {
        return;
      }
      runExport(payload).catch((error) => {
        state.exportBusy = false;
        state.exportCancelled = false;
        bridge.clearManualMissionSeconds?.();
        postToParent("mission-preview:export-error", {
          message: error?.message || "导出失败",
        });
      });
      return;
    }

    if (data.type === "mission-preview:export-cancel") {
      state.exportCancelled = true;
    }
  }

  function startVideoSyncTimer() {
    if (state.mode !== "video") {
      return;
    }

    window.setInterval(() => {
      syncVideoPlaybackToTimeline();
    }, 120);
  }

  function init() {
    if (mode === "obs" || mode === "video") {
      const queryResolution = getResolutionFromQuery();
      if (queryResolution) {
        applyForcedResolution(queryResolution);
      }
    }

    window.addEventListener("message", handleMessage);
    startVideoSyncTimer();

    postToParent("mission-preview:ready", {
      mode: state.mode,
      missionSeconds: safeFormatSeconds(bridge.getCurrentMissionSeconds?.()),
    });
  }

  init();
})();
