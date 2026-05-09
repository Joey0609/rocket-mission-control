(function () {
  function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeTelemetryAuto(rawValue) {
    return String(rawValue || "").trim().toLowerCase();
  }

  function resolveTelemetryAutoState(state, missionSeconds) {
    const manualEnabled = Boolean(state?.telemetry_enabled);
    const dashboardEditor = state?.dashboard_editor && typeof state.dashboard_editor === "object"
      ? state.dashboard_editor
      : null;
    const rawNodes = Array.isArray(dashboardEditor?.nodes) ? dashboardEditor.nodes : [];
    const autoNodes = rawNodes
      .map((node, index) => ({
        id: String(node?.id || `dashboard_node_${index + 1}`),
        time: toInt(node?.time, 0),
        telemetryAuto: normalizeTelemetryAuto(node?.telemetry_auto),
      }))
      .filter((node) => node.telemetryAuto === "on" || node.telemetryAuto === "off")
      .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id, "zh-CN"));

    if (autoNodes.length === 0) {
      return {
        enabled: manualEnabled,
        autoControlled: false,
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

    return {
      enabled: activeNode ? activeNode.telemetryAuto === "on" : false,
      autoControlled: true,
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