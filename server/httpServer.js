const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const QRCode = require("qrcode");

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function newId(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
}

function parseCookies(cookieHeader) {
  const pairs = String(cookieHeader || "").split(";");
  const result = {};
  for (const raw of pairs) {
    const idx = raw.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    if (!key) {
      continue;
    }
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

function safeEqual(a, b) {
  const av = Buffer.from(String(a));
  const bv = Buffer.from(String(b));
  if (av.length !== bv.length) {
    return false;
  }
  return crypto.timingSafeEqual(av, bv);
}

function normalizeStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    return [];
  }

  const hasRange = stages.some((s) => Object.prototype.hasOwnProperty.call(s, "start_time") || Object.prototype.hasOwnProperty.call(s, "end_time"));

  if (hasRange) {
    return stages
      .map((s) => {
        const start = toInt(s.start_time, 0);
        const endRaw = toInt(s.end_time, start);
        const end = endRaw < start ? start : endRaw;
        return {
          id: String(s.id || newId("stg")),
          name: String(s.name || "未命名阶段"),
          start_time: start,
          end_time: end,
          description: String(s.description || ""),
        };
      })
      .sort((a, b) => (a.start_time - b.start_time) || (a.end_time - b.end_time));
  }

  const nodes = stages
    .map((s) => ({
      id: String(s.id || newId("stg")),
      name: String(s.name || "未命名阶段"),
      time: toInt(s.time, 0),
      description: String(s.description || ""),
    }))
    .sort((a, b) => a.time - b.time);

  return nodes.map((n, i) => {
    const next = nodes[i + 1];
    const end = next ? Math.max(n.time, next.time - 1) : n.time + 86400;
    return {
      id: n.id,
      name: n.name,
      start_time: n.time,
      end_time: end,
      description: n.description,
    };
  });
}

function normalizeEvents(events) {
  if (!Array.isArray(events)) {
    return [];
  }
  return events
    .map((e) => ({
      id: String(e.id || newId("evt")),
      name: String(e.name || "未命名事件"),
      time: toInt(e.time, 0),
      description: String(e.description || ""),
    }))
    .sort((a, b) => a.time - b.time);
}

function normalizeObservations(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((p) => {
    const id = String(p.id || newId("obs"));
    const name = String(p.name || "未命名观察点");
    const fallbackCountdown = Math.max(0, toInt(p.new_countdown, 0));
    const hasTime = Object.prototype.hasOwnProperty.call(p, "time");
    const time = hasTime ? toInt(p.time, -fallbackCountdown) : -fallbackCountdown;
    const newCountdown = Math.max(0, toInt(p.new_countdown, Math.max(0, -time)));
    return {
      id,
      name,
      time,
      new_countdown: newCountdown,
      description: String(p.description || ""),
    };
  });
}

function clampPercent(value, fallback = -1) {
  const v = toInt(value, fallback);
  if (v < 0) {
    return -1;
  }
  if (v > 100) {
    return 100;
  }
  return v;
}

function normalizeFuelSpec(item) {
  return {
    phase: String(item?.phase || "液体"),
    oxidizer: String(item?.oxidizer || ""),
    fuel: String(item?.fuel || ""),
  };
}

function normalizeRocketMeta(raw) {
  const recoveryCapable = raw?.recovery_capable !== false;
  const stageCount = Math.max(1, toInt(raw?.stage_count, 1));

  const stageDefaults = Array.from({ length: stageCount }, (_, i) => ({
    stage_index: i + 1,
    fuels: [normalizeFuelSpec({ phase: "液体", oxidizer: "液氧", fuel: "煤油" })],
  }));

  const stages = Array.isArray(raw?.stages)
    ? raw.stages.map((item, index) => ({
      stage_index: Math.max(1, toInt(item?.stage_index, index + 1)),
      fuels: Array.isArray(item?.fuels) && item.fuels.length > 0
        ? item.fuels.map(normalizeFuelSpec)
        : [normalizeFuelSpec({ phase: "液体", oxidizer: "液氧", fuel: "煤油" })],
    }))
    : stageDefaults;

  return {
    recovery_capable: recoveryCapable,
    recovery_enabled: recoveryCapable ? raw?.recovery_enabled !== false : false,
    stage_count: Math.max(stageCount, stages.length),
    stages,
    boosters: {
      enabled: Boolean(raw?.boosters?.enabled),
      count: Math.max(0, toInt(raw?.boosters?.count, 0)),
      fuels: Array.isArray(raw?.boosters?.fuels)
        ? raw.boosters.fuels.map(normalizeFuelSpec)
        : [],
    },
  };
}

function normalizeFuelEditor(raw) {
  const nodeValues = {};
  const sourceNodeValues = raw?.node_values && typeof raw.node_values === "object" ? raw.node_values : {};
  for (const [nodeKey, channelMap] of Object.entries(sourceNodeValues)) {
    if (!channelMap || typeof channelMap !== "object") {
      continue;
    }
    nodeValues[nodeKey] = {};
    for (const [channelId, value] of Object.entries(channelMap)) {
      nodeValues[nodeKey][channelId] = clampPercent(value, -1);
    }
  }

  const curves = {};
  const sourceCurves = raw?.curves && typeof raw.curves === "object" ? raw.curves : {};
  for (const [channelId, points] of Object.entries(sourceCurves)) {
    if (!Array.isArray(points)) {
      continue;
    }
    curves[channelId] = points.map((p) => ({
      time: toInt(p?.time, 0),
      value: Math.max(0, Math.min(100, toInt(p?.value, 0))),
    })).sort((a, b) => a.time - b.time);
  }

  return {
    version: 1,
    node_values: nodeValues,
    curves,
  };
}

function normalizeEngineLayout(raw) {
  if (!raw || typeof raw !== "object") {
    return { version: 1, reserved: true };
  }
  return {
    version: 1,
    reserved: true,
    ...raw,
  };
}

function normalizeModel(raw) {
  const modelName = String(raw?.name || "未命名型号").trim() || "未命名型号";
  const stages = normalizeStages(raw?.stages || []);
  const events = normalizeEvents(raw?.events || []);
  const observation_points = normalizeObservations(raw?.observation_points || []);
  return {
    version: 2,
    name: modelName,
    stages,
    events,
    observation_points,
    rocket_meta: normalizeRocketMeta(raw?.rocket_meta || {}),
    fuel_editor: normalizeFuelEditor(raw?.fuel_editor || {}),
    engine_layout: normalizeEngineLayout(raw?.engine_layout || {}),
  };
}

function normalizeAppSettings(raw) {
  const theme = String(raw?.default_theme || "aurora").trim() || "aurora";
  return {
    version: 1,
    default_theme: theme,
  };
}

class ModelStore {
  constructor(configRoot) {
    this.configRoot = configRoot;
    this.models = new Map();
    this.reload();
  }

  reload() {
    this.models.clear();
    if (!fs.existsSync(this.configRoot)) {
      fs.mkdirSync(this.configRoot, { recursive: true });
      return;
    }

    for (const entry of fs.readdirSync(this.configRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const filePath = path.join(this.configRoot, entry.name, "config.json");
      if (!fs.existsSync(filePath)) {
        continue;
      }
      try {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const model = normalizeModel(raw);
        this.models.set(model.name, model);
      } catch (error) {
        console.warn(`[WARN] 无法解析配置 ${filePath}: ${error.message}`);
      }
    }
  }

  all() {
    return Object.fromEntries(this.models.entries());
  }

  get(name) {
    return this.models.get(name) || null;
  }

  save(raw) {
    const model = normalizeModel(raw);
    const modelDir = path.join(this.configRoot, model.name);
    fs.mkdirSync(modelDir, { recursive: true });
    const filePath = path.join(modelDir, "config.json");
    fs.writeFileSync(filePath, JSON.stringify(model, null, 2), "utf-8");
    this.models.set(model.name, model);
    return model;
  }

  delete(name) {
    if (!this.models.has(name)) {
      return false;
    }
    this.models.delete(name);

    const modelDir = path.join(this.configRoot, name);
    if (fs.existsSync(modelDir)) {
      fs.rmSync(modelDir, { recursive: true, force: true });
    }
    return true;
  }
}

class AppSettingsStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.settings = normalizeAppSettings({});
    this.reload();
  }

  reload() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      this.settings = normalizeAppSettings({});
      this.save();
      return;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      this.settings = normalizeAppSettings(raw);
    } catch {
      this.settings = normalizeAppSettings({});
      this.save();
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), "utf-8");
  }

  get() {
    return { ...this.settings };
  }

  setDefaultTheme(themeId) {
    this.settings.default_theme = String(themeId || "aurora").trim() || "aurora";
    this.save();
    return this.get();
  }
}

class MissionEngine {
  constructor(store) {
    this.store = store;
    this.currentModelName = null;
    this.launchEpoch = null;
    this.ignitionEpoch = null;
    this.running = false;
    this.runtimeCountdowns = [];
    this.observationLog = [];
    this.lastMutation = Date.now();
    this.holdActive = false;
    this.holdStartedAt = null;
    this.holdAccumulatedMs = 0;
  }

  markDirty() {
    this.lastMutation = Date.now();
  }

  get model() {
    if (!this.currentModelName) {
      return null;
    }
    return this.store.get(this.currentModelName);
  }

  clearHold() {
    this.holdActive = false;
    this.holdStartedAt = null;
    this.holdAccumulatedMs = 0;
  }

  holdElapsedMs(now) {
    if (!this.running || !this.launchEpoch) {
      return 0;
    }
    const ongoing = this.holdActive && this.holdStartedAt ? Math.max(0, now - this.holdStartedAt) : 0;
    return Math.max(0, this.holdAccumulatedMs + ongoing);
  }

  setHold(nextHold) {
    if (!this.running || !this.launchEpoch || this.ignitionEpoch) {
      return [false, "当前状态不可 HOLD"];
    }

    const target = Boolean(nextHold);
    if (target === this.holdActive) {
      return [true, target ? "已处于 HOLD" : "已恢复计时"];
    }

    const now = Date.now();
    if (target) {
      this.holdActive = true;
      this.holdStartedAt = now;
      this.observationLog.push({
        type: "hold",
        timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      });
      this.markDirty();
      return [true, "已进入 HOLD"];
    }

    if (this.holdStartedAt) {
      this.holdAccumulatedMs += Math.max(0, now - this.holdStartedAt);
    }
    this.holdActive = false;
    this.holdStartedAt = null;
    this.observationLog.push({
      type: "resume",
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    });
    this.markDirty();
    return [true, "已恢复倒计时"];
  }

  toggleHold() {
    return this.setHold(!this.holdActive);
  }

  selectModel(name) {
    if (!this.store.get(name)) {
      return false;
    }
    this.currentModelName = name;
    this.reset();
    this.currentModelName = name;
    this.markDirty();
    return true;
  }

  launchIn(seconds) {
    const now = Date.now();
    this.launchEpoch = now + Math.max(0, toInt(seconds, 0)) * 1000;
    this.ignitionEpoch = null;
    this.running = true;
    this.runtimeCountdowns = [];
    this.observationLog = [];
    this.clearHold();
    this.markDirty();
  }

  launchAt(dateLike) {
    const ts = new Date(dateLike).getTime();
    if (!Number.isFinite(ts)) {
      return false;
    }
    // 允许传入过去时间，便于任务计时直接进入 T+ 阶段。
    this.launchEpoch = ts;
    this.ignitionEpoch = null;
    this.running = true;
    this.runtimeCountdowns = [];
    this.observationLog = [];
    this.clearHold();
    this.markDirty();
    return true;
  }

  reset() {
    this.running = false;
    this.launchEpoch = null;
    this.ignitionEpoch = null;
    this.runtimeCountdowns = [];
    this.observationLog = [];
    this.clearHold();
    this.markDirty();
  }

  ignition() {
    if (!this.running || !this.launchEpoch) {
      return false;
    }
    this.ignitionEpoch = Date.now() - this.holdElapsedMs(Date.now());
    this.clearHold();
    this.observationLog.push({
      type: "ignition",
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    });
    this.markDirty();
    return true;
  }

  triggerObservation(pointId, pointIndex) {
    const model = this.model;
    if (!model) {
      return [false, "请先选择型号"];
    }

    let point = null;
    if (pointId) {
      point = model.observation_points.find((p) => p.id === pointId) || null;
    }
    if (!point && Number.isInteger(pointIndex) && pointIndex >= 0) {
      point = model.observation_points[pointIndex] || null;
    }

    if (!point) {
      return [false, "观察点不存在"];
    }

    const now = Date.now();
    const targetMissionTime = toInt(point.time, -Math.max(0, toInt(point.new_countdown, 0)));
    this.running = true;
    this.clearHold();

    if (targetMissionTime >= 0) {
      this.ignitionEpoch = now - targetMissionTime * 1000;
      this.launchEpoch = this.ignitionEpoch;
    } else {
      this.ignitionEpoch = null;
      this.launchEpoch = now - targetMissionTime * 1000;
    }

    this.observationLog.push({
      type: "observation",
      point: point.name,
      target_time: targetMissionTime,
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    });
    this.markDirty();

    return [true, `已触发 ${point.name}，任务计时重置为 T${targetMissionTime >= 0 ? "+" : ""}${targetMissionTime}`];
  }

  fmtMinus(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `T-${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `T-${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  fmtPlus(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `T+${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `T+${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  missionTimeSec(now) {
    const ms = this.missionTimeMs(now);
    if (ms >= 0) {
      return Math.floor(ms / 1000);
    }
    return Math.ceil(ms / 1000);
  }

  missionTimeMs(now) {
    if (this.ignitionEpoch) {
      return now - this.ignitionEpoch;
    }
    if (!this.running || !this.launchEpoch) {
      return 0;
    }
    return now - this.launchEpoch - this.holdElapsedMs(now);
  }

  timelineSummary(missionTime) {
    const model = this.model;
    if (!model) {
      return {
        stage: "等待选择火箭型号",
        event: "等待节点",
        description: "",
        focusNodes: [],
        nextPollHintMs: 8000,
      };
    }

    let activeStage = null;
    for (const stg of model.stages) {
      if (stg.start_time <= missionTime && missionTime <= stg.end_time) {
        activeStage = stg;
      }
    }

    let currentEvent = null;
    for (const evt of model.events) {
      if (evt.time <= missionTime) {
        currentEvent = evt;
      } else {
        break;
      }
    }

    const nodes = [];
    for (const stg of model.stages) {
      nodes.push({ id: stg.id, kind: "stage", name: stg.name, time: stg.start_time, description: stg.description });
    }
    for (const evt of model.events) {
      nodes.push({ id: evt.id, kind: "event", name: evt.name, time: evt.time, description: evt.description });
    }
    for (const obs of model.observation_points || []) {
      nodes.push({ id: obs.id, kind: "observation", name: obs.name, time: toInt(obs.time, 0), description: obs.description || "" });
    }
    nodes.sort((a, b) => a.time - b.time);

    const upcoming = nodes
      .map((n) => ({ ...n, seconds_to: n.time - missionTime }))
      .filter((n) => n.seconds_to > 0);

    const firstTwo = upcoming.slice(0, 2);
    const withinThirty = upcoming.filter((n) => n.seconds_to <= 30);
    const focusNodes = [];
    const seen = new Set();
    for (const n of [...firstTwo, ...withinThirty]) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        focusNodes.push(n);
      }
    }

    let nextPollHintMs = 12000;
    if (upcoming.length > 0) {
      const near = upcoming[0].seconds_to;
      if (near <= 30) {
        nextPollHintMs = 1000;
      } else if (near <= 120) {
        nextPollHintMs = 3000;
      }
    }

    return {
      stage: activeStage ? activeStage.name : "待命",
      event: currentEvent ? currentEvent.name : "等待节点",
      description: currentEvent?.description || activeStage?.description || "",
      focusNodes,
      timelineNodes: nodes,
      nextPollHintMs,
    };
  }

  snapshot(extra = {}) {
    const now = Date.now();
    const model = this.model;

    if (this.running && this.launchEpoch && !this.ignitionEpoch && !this.holdActive && now >= this.launchEpoch) {
      this.ignitionEpoch = this.launchEpoch;
      this.clearHold();
      this.observationLog.push({
        type: "auto_ignition",
        timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      });
      this.markDirty();
    }

    let status = "idle";
    let mainSec = 0;
    let flightSec = 0;

    if (this.running && this.launchEpoch) {
      if (this.ignitionEpoch) {
        status = "flight";
        flightSec = Math.max(0, Math.floor((now - this.ignitionEpoch) / 1000));
      } else if (this.holdActive) {
        status = "hold";
        mainSec = Math.max(0, Math.round(-this.missionTimeMs(now) / 1000));
      } else {
        status = "countdown";
        mainSec = Math.max(0, Math.round(-this.missionTimeMs(now) / 1000));
      }
    }

    const missionTime = this.missionTimeSec(now);
    const missionTimeMs = this.missionTimeMs(now);
    const timeline = this.timelineSummary(missionTime);
    const unifiedFormatted = this.running
      ? (missionTime >= 0 ? this.fmtPlus(missionTime) : this.fmtMinus(Math.abs(missionTime)))
      : "T-00:00";

    const activeCountdowns = [];

    return {
      version: 2,
      now: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      status,
      running: this.running,
      is_flying: Boolean(this.ignitionEpoch),
      is_hold: this.holdActive,
      hold_elapsed_ms: this.holdElapsedMs(now),
      current_model: model?.name || null,
      main_countdown_seconds: mainSec,
      main_countdown_formatted: this.fmtMinus(mainSec),
      flight_seconds: flightSec,
      flight_time_formatted: this.fmtPlus(flightSec),
      mission_time: missionTime,
      mission_time_formatted: missionTime >= 0 ? this.fmtPlus(missionTime) : this.fmtMinus(Math.abs(missionTime)),
      server_now_ms: now,
      mission_time_ms: missionTimeMs,
      unified_countdown_seconds: missionTime,
      unified_countdown_ms: missionTimeMs,
      unified_countdown_formatted: unifiedFormatted,
      current_stage: timeline.stage,
      current_event: timeline.event,
      next_description: timeline.description,
      active_countdowns: activeCountdowns,
      observation_points: model?.observation_points || [],
      rocket_meta: model?.rocket_meta || null,
      observation_log: this.observationLog.slice(-100),
      focus_nodes: timeline.focusNodes,
      timeline_nodes: timeline.timelineNodes || [],
      next_poll_hint_ms: timeline.nextPollHintMs,
      change_token: this.lastMutation,
      ...extra,
    };
  }
}

function startServer(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, "..");
  const host = options.host || "0.0.0.0";
  const port = options.port || 5000;
  const sessionCookieName = "mc_admin_session";
  const sessionSecret = String(options.sessionSecret || process.env.SESSION_SECRET || "mission-control-secret");
  const adminUsername = String(options.adminUsername || process.env.ADMIN_USERNAME || "admin");
  const adminPassword = String(options.adminPassword || process.env.ADMIN_PASSWORD || "admin123");
  const sessionTtlSeconds = Math.max(60, toInt(options.sessionTtlSeconds || process.env.SESSION_TTL_SECONDS, 8 * 60 * 60));
  const sessionTtlMs = sessionTtlSeconds * 1000;
  const sessions = new Map();

  const app = express();
  const store = new ModelStore(path.join(rootDir, "config"));
  const appSettings = new AppSettingsStore(path.join(rootDir, "config", "app-settings.json"));
  const engine = new MissionEngine(store);

  const modelNames = Object.keys(store.all());
  if (modelNames.length > 0) {
    engine.selectModel(modelNames[0]);
  }
  engine.launchIn(600);

  function getLanIPv4() {
    const all = os.networkInterfaces();
    for (const group of Object.values(all)) {
      if (!group) {
        continue;
      }
      for (const addr of group) {
        if (addr && addr.family === "IPv4" && !addr.internal) {
          return addr.address;
        }
      }
    }
    return null;
  }

  function buildVisitorUrl(req) {
    const proto = req.protocol || "http";
    const hostHeader = req.get("host") || `127.0.0.1:${port}`;
    const hostOnly = req.hostname || hostHeader.split(":")[0];
    const hostPort = hostHeader.includes(":") ? hostHeader.split(":").slice(1).join(":") : String(port);

    if (hostOnly === "127.0.0.1" || hostOnly === "localhost" || hostOnly === "::1") {
      const lan = getLanIPv4();
      if (lan) {
        return `${proto}://${lan}:${hostPort}/`;
      }
    }

    return `${proto}://${hostHeader}/`;
  }

  function newSessionToken() {
    const sessionId = crypto.randomBytes(18).toString("hex");
    const sign = crypto.createHmac("sha256", sessionSecret).update(sessionId).digest("hex");
    return `${sessionId}.${sign}`;
  }

  function verifySessionToken(token) {
    const raw = String(token || "");
    const parts = raw.split(".");
    if (parts.length !== 2) {
      return null;
    }
    const [sessionId, sign] = parts;
    const expected = crypto.createHmac("sha256", sessionSecret).update(sessionId).digest("hex");
    if (!safeEqual(sign, expected)) {
      return null;
    }
    return sessionId;
  }

  function setSessionCookie(res, token, maxAgeMs) {
    res.cookie(sessionCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: maxAgeMs,
    });
  }

  function clearSessionCookie(res) {
    res.clearCookie(sessionCookieName, { path: "/" });
  }

  function getSessionId(req) {
    const cookies = parseCookies(req.headers.cookie || "");
    return verifySessionToken(cookies[sessionCookieName]);
  }

  function isAuthed(req) {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      return false;
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return false;
    }
    if (session.expiresAt <= Date.now()) {
      sessions.delete(sessionId);
      return false;
    }
    return true;
  }

  function requireAdminApi(req, res, next) {
    if (!isAuthed(req)) {
      res.status(401).json({ success: false, message: "未登录或会话已过期" });
      return;
    }
    next();
  }

  function requireAdminPage(req, res, next) {
    if (!isAuthed(req)) {
      res.redirect("/admin/login");
      return;
    }
    next();
  }

  const gcTimer = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (!session || session.expiresAt <= now) {
        sessions.delete(sessionId);
      }
    }
  }, 60 * 1000);
  if (typeof gcTimer.unref === "function") {
    gcTimer.unref();
  }

  app.use(express.json({ limit: "2mb" }));
  app.use("/static", express.static(path.join(rootDir, "static")));
  app.use("/assets", express.static(path.join(rootDir, "assets")));

  app.get(["/", "/visitor"], (req, res) => {
    res.sendFile(path.join(rootDir, "templates", "visitor.html"));
  });

  app.get("/admin/login", (req, res) => {
    if (isAuthed(req)) {
      res.redirect("/admin");
      return;
    }
    res.sendFile(path.join(rootDir, "templates", "admin-login.html"));
  });

  app.get("/admin", requireAdminPage, (req, res) => {
    res.sendFile(path.join(rootDir, "templates", "admin.html"));
  });

  app.get("/api/admin/session", (req, res) => {
    res.json({ success: true, authenticated: isAuthed(req), username: adminUsername });
  });

  app.get("/api/public_config", (req, res) => {
    res.json(appSettings.get());
  });

  app.get("/api/admin/settings", requireAdminApi, (req, res) => {
    res.json({ success: true, settings: appSettings.get() });
  });

  app.post("/api/admin/settings/theme", requireAdminApi, (req, res) => {
    const themeId = String(req.body?.theme_id || "").trim();
    if (!themeId) {
      res.status(400).json({ success: false, message: "theme_id 不能为空" });
      return;
    }
    const settings = appSettings.setDefaultTheme(themeId);
    res.json({ success: true, settings });
  });

  app.post("/api/admin/login", (req, res) => {
    const username = String(req.body?.username || "");
    const password = String(req.body?.password || "");
    if (!safeEqual(username, adminUsername) || !safeEqual(password, adminPassword)) {
      res.status(401).json({ success: false, message: "账号或密码错误" });
      return;
    }

    const token = newSessionToken();
    const sessionId = token.split(".")[0];
    sessions.set(sessionId, {
      username,
      expiresAt: Date.now() + sessionTtlMs,
    });
    setSessionCookie(res, token, sessionTtlMs);
    res.json({ success: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    const sessionId = getSessionId(req);
    if (sessionId) {
      sessions.delete(sessionId);
    }
    clearSessionCookie(res);
    res.json({ success: true });
  });

  app.get("/api/state", (req, res) => {
    res.json(engine.snapshot({ default_theme: appSettings.get().default_theme }));
  });

  app.get("/api/visitor_url", requireAdminApi, (req, res) => {
    res.json({ url: buildVisitorUrl(req) });
  });

  app.get("/api/visitor_qr", requireAdminApi, async (req, res) => {
    try {
      const fallbackUrl = buildVisitorUrl(req);
      const raw = String(req.query.url || fallbackUrl);
      const qrBuffer = await QRCode.toBuffer(raw, {
        type: "png",
        errorCorrectionLevel: "M",
        margin: 2,
        width: 340,
      });
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-store");
      res.send(qrBuffer);
    } catch (error) {
      res.status(500).json({ success: false, message: `二维码生成失败: ${error.message}` });
    }
  });

  app.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (res.flushHeaders) {
      res.flushHeaders();
    }

    let lastPayload = "";
    const send = () => {
      const payload = JSON.stringify(engine.snapshot({ default_theme: appSettings.get().default_theme }));
      if (payload !== lastPayload) {
        lastPayload = payload;
        res.write(`event: state\ndata: ${payload}\n\n`);
      }
    };

    send();
    const timer = setInterval(send, 1000);

    req.on("close", () => {
      clearInterval(timer);
    });
  });

  app.get("/api/models", requireAdminApi, (req, res) => {
    res.json(store.all());
  });

  app.post("/api/select_model", requireAdminApi, (req, res) => {
    const model = String(req.body?.model || "").trim();
    if (!model) {
      res.status(400).json({ success: false, message: "型号不能为空" });
      return;
    }
    const ok = engine.selectModel(model);
    if (!ok) {
      res.status(404).json({ success: false, message: "型号不存在" });
      return;
    }
    res.json({ success: true, message: `已选择 ${model}` });
  });

  app.post("/api/launch", requireAdminApi, (req, res) => {
    const launchIn = req.body?.launch_in_seconds;
    const launchAt = req.body?.launch_at;

    if (launchIn !== undefined) {
      engine.launchIn(toInt(launchIn, 0));
      res.json({ success: true });
      return;
    }

    if (launchAt !== undefined) {
      const ok = engine.launchAt(String(launchAt));
      if (!ok) {
        res.status(400).json({ success: false, message: "launch_at 格式非法" });
        return;
      }
      res.json({ success: true });
      return;
    }

    res.status(400).json({ success: false, message: "请提供 launch_in_seconds 或 launch_at" });
  });

  app.post("/api/hold", requireAdminApi, (req, res) => {
    const payloadHold = req.body?.hold;
    const [ok, message] = typeof payloadHold === "boolean"
      ? engine.setHold(payloadHold)
      : engine.toggleHold();
    if (!ok) {
      res.status(400).json({ success: false, message });
      return;
    }
    res.json({ success: true, message, hold: engine.holdActive });
  });

  app.post("/api/observation", requireAdminApi, (req, res) => {
    const pointId = req.body?.point_id ? String(req.body.point_id) : null;
    const pointIndex = req.body?.point_index === undefined ? null : toInt(req.body.point_index, -1);
    const [ok, message] = engine.triggerObservation(pointId, pointIndex);
    if (!ok) {
      res.status(400).json({ success: false, message });
      return;
    }
    res.json({ success: true, message });
  });

  app.post("/api/ignition", requireAdminApi, (req, res) => {
    const ok = engine.ignition();
    if (!ok) {
      res.status(400).json({ success: false, message: "当前状态不可点火" });
      return;
    }
    res.json({ success: true, message: "点火确认" });
  });

  app.post("/api/reset", requireAdminApi, (req, res) => {
    engine.reset();
    res.json({ success: true });
  });

  app.post("/api/models", requireAdminApi, (req, res) => {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      res.status(400).json({ success: false, message: "name 不能为空" });
      return;
    }
    const model = store.save(req.body);
    res.json({ success: true, model: model.name });
  });

  app.delete("/api/models/:name", requireAdminApi, (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const ok = store.delete(name);
    if (!ok) {
      res.status(404).json({ success: false, message: "型号不存在" });
      return;
    }

    if (engine.currentModelName === name) {
      engine.reset();
      engine.currentModelName = null;
    }

    res.json({ success: true });
  });

  const server = app.listen(port, host);

  return {
    url: `http://${host}:${port}`,
    stop: () => new Promise((resolve) => {
      clearInterval(gcTimer);
      server.close(() => resolve());
    }),
  };
}

module.exports = { startServer };
