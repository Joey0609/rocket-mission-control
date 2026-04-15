(() => {
  const DEFAULT_GAUGES = [
    {
      id: "speed",
      side: "left",
      metricKey: "speed_mps",
      label: "SPEED",
      unit: "M/S",
      maxValue: 8500,
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
      id: "angularRate",
      side: "right",
      metricKey: "angular_velocity_dps",
      label: "ANG RATE",
      unit: "DEG/S",
      maxValue: 180,
      fractionDigits: 1,
    },
  ];

  function toNumber(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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

  class TelemetryGaugePanel {
    constructor(options = {}) {
      this.leftMountEl = options.leftMountEl || null;
      this.rightMountEl = options.rightMountEl || null;
      this.gaugeSpecs = Array.isArray(options.gaugeSpecs) && options.gaugeSpecs.length > 0
        ? options.gaugeSpecs
        : DEFAULT_GAUGES;

      this.entries = [];
      this.profile = null;
      this.profileCache = {};
      this.lastValues = {};
      this.splitEnabled = false;
      this.separationTime = Number.POSITIVE_INFINITY;

      this.mount();
    }

    mount() {
      const GaugeCtor = window.MissionTelemetry?.Gauge;
      if (typeof GaugeCtor !== "function") {
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

        const gauge = new GaugeCtor({
          mountEl: slot,
          label: spec.label,
          unit: spec.unit,
          maxValue: spec.maxValue,
          fractionDigits: spec.fractionDigits,
        });

        this.entries.push({ spec, gauge });
      }
    }

    setProfile(profile) {
      if (this.profile === profile) {
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
        const metricConfig = metrics?.[entry.spec.metricKey] || null;
        entry.gauge.setConfig({
          label: entry.spec.label,
          unit: metricConfig?.unit || entry.spec.unit,
          maxValue: Number.isFinite(metricConfig?.max_value) ? metricConfig.max_value : entry.spec.maxValue,
          fractionDigits: Number.isFinite(metricConfig?.fraction_digits)
            ? Math.max(0, Math.trunc(metricConfig.fraction_digits))
            : entry.spec.fractionDigits,
        });
      }
    }

    resolveMetricValue(metricKey, missionSeconds) {
      const curves = this.profileCache[metricKey];
      if (!curves) {
        return 0;
      }

      const useUpper = this.splitEnabled && missionSeconds > this.separationTime;
      const branch = useUpper ? curves.upper : curves.stage1;
      return Math.max(0, interpolateLinear(branch, missionSeconds));
    }

    update(payload = {}) {
      if (this.entries.length === 0) {
        return;
      }

      const telemetryEnabled = Boolean(payload.telemetryEnabled);
      const telemetryPaused = telemetryEnabled && Boolean(payload.telemetryPaused);
      const missionSeconds = toNumber(payload.missionSeconds, 0);
      const hasPauseMissionSeconds = Number.isFinite(payload.telemetryPauseMissionSeconds);
      const pauseMissionSeconds = hasPauseMissionSeconds
        ? toNumber(payload.telemetryPauseMissionSeconds, missionSeconds)
        : missionSeconds;

      if (!telemetryEnabled) {
        return;
      }

      if (telemetryPaused) {
        const resolvedValues = {};
        for (const entry of this.entries) {
          const value = this.resolveMetricValue(entry.spec.metricKey, pauseMissionSeconds);
          resolvedValues[entry.spec.id] = value;
          entry.gauge.setValue(value);
        }
        this.lastValues = resolvedValues;
        return;
      }

      const resolvedValues = {};
      for (const entry of this.entries) {
        const value = this.resolveMetricValue(entry.spec.metricKey, missionSeconds);
        resolvedValues[entry.spec.id] = value;
        entry.gauge.setValue(value);
      }

      this.lastValues = resolvedValues;
    }

    destroy() {
      for (const entry of this.entries) {
        entry.gauge.destroy();
      }
      this.entries = [];
      this.lastValues = {};
    }
  }

  function createTelemetryGaugePanel(options = {}) {
    return new TelemetryGaugePanel(options);
  }

  window.MissionTelemetry = window.MissionTelemetry || {};
  window.MissionTelemetry.createTelemetryGaugePanel = createTelemetryGaugePanel;
})();
