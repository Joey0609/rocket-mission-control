(function () {
  function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeMissionTime(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : fallback;
  }

  function normalizeTelemetryAuto(rawValue) {
    return String(rawValue || "").trim().toLowerCase();
  }

  function normalizeTelemetryControlMode(rawValue) {
    return String(rawValue || "").trim().toLowerCase() === "manual" ? "manual" : "auto";
  }

  function resolveTelemetryAutoState(state, missionSeconds) {
    const manualEnabled = Boolean(state?.telemetry_enabled);
    const controlMode = normalizeTelemetryControlMode(state?.telemetry_control_mode);
    const dashboardEditor = state?.dashboard_editor && typeof state.dashboard_editor === "object"
      ? state.dashboard_editor
      : null;
    const rawNodes = Array.isArray(dashboardEditor?.nodes) ? dashboardEditor.nodes : [];
    const autoNodes = rawNodes
      .map((node, index) => ({
        id: String(node?.id || `dashboard_node_${index + 1}`),
        time: normalizeMissionTime(node?.time, 0),
        telemetryAuto: normalizeTelemetryAuto(node?.telemetry_auto),
      }))
      .filter((node) => node.telemetryAuto === "on" || node.telemetryAuto === "off")
      .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id, "zh-CN"));

    if (autoNodes.length === 0) {
      return {
        enabled: manualEnabled,
        autoControlled: false,
        controlMode,
        toggleDisabled: controlMode !== "manual",
        activeNode: null,
      };
    }

    const missionTime = Number(missionSeconds);
    const effectiveMissionSeconds = Number.isFinite(missionTime) ? missionTime : 0;

    let activeNode = null;
    for (const node of autoNodes) {
      if (node.time <= effectiveMissionSeconds) {
        activeNode = node;
        continue;
      }
      break;
    }

    const autoEnabled = activeNode ? activeNode.telemetryAuto === "on" : false;
    if (controlMode === "manual") {
      return {
        enabled: manualEnabled,
        autoControlled: false,
        controlMode,
        toggleDisabled: false,
        activeNode: null,
      };
    }

    return {
      enabled: autoEnabled,
      autoControlled: true,
      controlMode,
      toggleDisabled: true,
      activeNode,
    };
  }

  const api = {
    resolveTelemetryAutoState,
  };

  if (typeof globalThis !== "undefined") {
    globalThis.MissionTelemetryRules = api;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
