(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const GAUGE_RADIUS = 70;
  const STROKE_WIDTH = 4;
  const GAUGE_VISUAL_START_ANGLE = 240;
  const TOTAL_GAUGE_SWEEP_ANGLE = 240;
  const CRITICAL_SWEEP_ANGLE = TOTAL_GAUGE_SWEEP_ANGLE;
  const BACKGROUND_CIRCLE_PADDING = 8;
  const TICK_MARK_LENGTH = 6;
  const TICK_STROKE_WIDTH = 2.5;
  const DEFAULT_GAUGE_SCALE = 0.78;
  const GAUGE_SHOW_TOTAL_MS = 1300;
  const GAUGE_HIDE_TOTAL_MS = 260;
  const GAUGE_TEXT_SWITCH_MS = 500;

  let gaugeSequence = 0;

  function toNumber(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians)),
    };
  }

  function describeArc(x, y, radius, startAngleDeg, endAngleDeg) {
    let endAngle = endAngleDeg;
    if (Math.abs(endAngle - startAngleDeg) >= 360) {
      endAngle = startAngleDeg + 359.99;
    }
    if (Math.abs(endAngle - startAngleDeg) < 0.01) {
      return "";
    }

    const startPoint = polarToCartesian(x, y, radius, startAngleDeg);
    const endPoint = polarToCartesian(x, y, radius, endAngle);
    const arcSweepDegrees = endAngle - startAngleDeg;
    const largeArcFlag = Math.abs(arcSweepDegrees) <= 180 ? "0" : "1";
    const sweepFlag = arcSweepDegrees > 0 ? "1" : "0";

    return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endPoint.x} ${endPoint.y}`;
  }

  function describeTick(x, y, radius, angleDeg, length) {
    const inner = polarToCartesian(x, y, radius - length / 2, angleDeg);
    const outer = polarToCartesian(x, y, radius + length / 2, angleDeg);
    return `M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`;
  }

  function createSvgNode(tagName, className) {
    const node = document.createElementNS(SVG_NS, tagName);
    if (className) {
      node.setAttribute("class", className);
    }
    return node;
  }

  class Gauge {
    constructor(options = {}) {
      const {
        mountEl,
        label = "",
        unit = "",
        maxValue = 100,
        fractionDigits = 0,
        size = 176,
        scale = DEFAULT_GAUGE_SCALE,
      } = options;

      if (!mountEl) {
        throw new Error("Gauge 缺少 mountEl");
      }

      this.mountEl = mountEl;
      this.label = String(label || "");
      this.unit = String(unit || "");
      this.maxValue = Math.max(0, toNumber(maxValue, 100));
      this.fractionDigits = Math.max(0, Math.trunc(toNumber(fractionDigits, 0)));
      this.scale = clamp(toNumber(scale, DEFAULT_GAUGE_SCALE), 0.1, 2);
      this.currentValue = 0;

      this.svgSize = Math.max(48, Math.trunc(toNumber(size, 176) * this.scale));
      this.viewBoxSize = (GAUGE_RADIUS + STROKE_WIDTH + TICK_MARK_LENGTH + BACKGROUND_CIRCLE_PADDING) * 2;
      this.cx = this.viewBoxSize / 2;
      this.cy = this.viewBoxSize / 2;
      this.backgroundCircleRadius = GAUGE_RADIUS + BACKGROUND_CIRCLE_PADDING;

      this.gradientId = `telemetry-gauge-gradient-${gaugeSequence++}`;

      this.rootEl = null;
      this.svgEl = null;
      this.backgroundCircle = null;
      this.backgroundArcMain = null;
      this.backgroundArcDanger = null;
      this.progressArcWhite = null;
      this.progressArcRed = null;
      this.startTick = null;
      this.endTick = null;
      this.textRoot = null;
      this.labelNode = null;
      this.valueNode = null;
      this.unitNode = null;
      this.animatablePaths = [];
      this.visibilityState = "hidden";
      this.visibilityTimer = null;
      this.valueAnimationFrame = null;
      this.textSwitchTimer = null;

      this.mount();
      this.setConfig({ label: this.label, unit: this.unit, maxValue: this.maxValue, fractionDigits: this.fractionDigits });
      this.setValue(0);
    }

    mount() {
      const root = document.createElement("div");
      root.className = "telemetry-gauge-widget telemetry-gauge-hidden";

      const svg = createSvgNode("svg", "telemetry-gauge-svg");
      svg.setAttribute("width", String(this.svgSize));
      svg.setAttribute("height", String(this.svgSize));
      svg.setAttribute("viewBox", `0 0 ${this.viewBoxSize} ${this.viewBoxSize}`);

      const defs = createSvgNode("defs");
      const gradient = createSvgNode("linearGradient");
      gradient.setAttribute("id", this.gradientId);
      gradient.setAttribute("x1", "0%");
      gradient.setAttribute("y1", "0%");
      gradient.setAttribute("x2", "0%");
      gradient.setAttribute("y2", "100%");

      const stopTop = createSvgNode("stop");
      stopTop.setAttribute("offset", "0%");
      stopTop.setAttribute("stop-color", "rgba(20,20,20,0.66)");
      stopTop.setAttribute("stop-opacity", "1");

      const stopBottom = createSvgNode("stop");
      stopBottom.setAttribute("offset", "100%");
      stopBottom.setAttribute("stop-color", "rgba(0,0,0,0)");
      stopBottom.setAttribute("stop-opacity", "1");

      gradient.appendChild(stopTop);
      gradient.appendChild(stopBottom);
      defs.appendChild(gradient);
      svg.appendChild(defs);

      const backgroundCircle = createSvgNode("circle", "telemetry-gauge-circle");
      backgroundCircle.setAttribute("cx", String(this.cx));
      backgroundCircle.setAttribute("cy", String(this.cy));
      backgroundCircle.setAttribute("r", String(this.backgroundCircleRadius));
      backgroundCircle.setAttribute("fill", `url(#${this.gradientId})`);
      backgroundCircle.setAttribute("stroke", "none");
      svg.appendChild(backgroundCircle);
      this.backgroundCircle = backgroundCircle;

      this.backgroundArcMain = createSvgNode("path", "telemetry-gauge-bg-arc-main telemetry-gauge-anim-path");
      this.backgroundArcMain.setAttribute("fill", "none");
      this.backgroundArcMain.setAttribute("stroke-width", String(STROKE_WIDTH));
      this.backgroundArcMain.setAttribute("stroke-linecap", "butt");
      this.backgroundArcMain.setAttribute("pathLength", "1");
      svg.appendChild(this.backgroundArcMain);

      this.backgroundArcDanger = createSvgNode("path", "telemetry-gauge-bg-arc-danger telemetry-gauge-anim-path");
      this.backgroundArcDanger.setAttribute("fill", "none");
      this.backgroundArcDanger.setAttribute("stroke-width", String(STROKE_WIDTH));
      this.backgroundArcDanger.setAttribute("stroke-linecap", "butt");
      this.backgroundArcDanger.setAttribute("pathLength", "1");
      svg.appendChild(this.backgroundArcDanger);

      this.progressArcWhite = createSvgNode("path", "telemetry-gauge-progress-main telemetry-gauge-anim-path");
      this.progressArcWhite.setAttribute("fill", "none");
      this.progressArcWhite.setAttribute("stroke-width", String(STROKE_WIDTH));
      this.progressArcWhite.setAttribute("stroke-linecap", "butt");
      this.progressArcWhite.setAttribute("pathLength", "1");
      svg.appendChild(this.progressArcWhite);

      this.progressArcRed = createSvgNode("path", "telemetry-gauge-progress-danger telemetry-gauge-anim-path");
      this.progressArcRed.setAttribute("fill", "none");
      this.progressArcRed.setAttribute("stroke-width", String(STROKE_WIDTH));
      this.progressArcRed.setAttribute("stroke-linecap", "butt");
      this.progressArcRed.setAttribute("pathLength", "1");
      svg.appendChild(this.progressArcRed);

      this.startTick = createSvgNode("path", "telemetry-gauge-tick-start telemetry-gauge-anim-path");
      this.startTick.setAttribute("fill", "none");
      this.startTick.setAttribute("stroke-width", String(TICK_STROKE_WIDTH));
      this.startTick.setAttribute("stroke-linecap", "round");
      this.startTick.setAttribute("pathLength", "1");
      svg.appendChild(this.startTick);

      this.endTick = createSvgNode("path", "telemetry-gauge-tick-end telemetry-gauge-anim-path");
      this.endTick.setAttribute("fill", "none");
      this.endTick.setAttribute("stroke-width", String(TICK_STROKE_WIDTH));
      this.endTick.setAttribute("stroke-linecap", "round");
      this.endTick.setAttribute("pathLength", "1");
      svg.appendChild(this.endTick);

      const textRoot = createSvgNode("text", "telemetry-gauge-text-root");
      textRoot.setAttribute("x", String(this.cx));
      textRoot.setAttribute("y", String(this.cy));
      textRoot.setAttribute("text-anchor", "middle");
      textRoot.setAttribute("dominant-baseline", "central");

      this.labelNode = createSvgNode("tspan", "telemetry-gauge-label");
      this.labelNode.setAttribute("x", String(this.cx));
      this.labelNode.setAttribute("y", String(this.cy - 34));
      textRoot.appendChild(this.labelNode);

      this.valueNode = createSvgNode("tspan", "telemetry-gauge-value");
      this.valueNode.setAttribute("x", String(this.cx));
      this.valueNode.setAttribute("y", String(this.cy + 0));
      textRoot.appendChild(this.valueNode);

      this.unitNode = createSvgNode("tspan", "telemetry-gauge-unit");
      this.unitNode.setAttribute("x", String(this.cx));
      this.unitNode.setAttribute("y", String(this.cy + 34));
      textRoot.appendChild(this.unitNode);

      svg.appendChild(textRoot);
      this.textRoot = textRoot;

      root.appendChild(svg);
      this.mountEl.innerHTML = "";
      this.mountEl.appendChild(root);

      this.rootEl = root;
      this.svgEl = svg;

      const backgroundMainPath = describeArc(
        this.cx,
        this.cy,
        GAUGE_RADIUS,
        GAUGE_VISUAL_START_ANGLE,
        GAUGE_VISUAL_START_ANGLE + CRITICAL_SWEEP_ANGLE,
      );
      const backgroundDangerPath = describeArc(
        this.cx,
        this.cy,
        GAUGE_RADIUS,
        GAUGE_VISUAL_START_ANGLE + CRITICAL_SWEEP_ANGLE,
        GAUGE_VISUAL_START_ANGLE + TOTAL_GAUGE_SWEEP_ANGLE,
      );

      this.backgroundArcMain.setAttribute("d", backgroundMainPath);
      this.backgroundArcDanger.setAttribute("d", backgroundDangerPath);

      this.startTick.setAttribute(
        "d",
        describeTick(this.cx, this.cy, GAUGE_RADIUS, GAUGE_VISUAL_START_ANGLE, TICK_MARK_LENGTH),
      );
      this.endTick.setAttribute(
        "d",
        describeTick(
          this.cx,
          this.cy,
          GAUGE_RADIUS,
          GAUGE_VISUAL_START_ANGLE + TOTAL_GAUGE_SWEEP_ANGLE,
          TICK_MARK_LENGTH,
        ),
      );

      this.animatablePaths = [
        this.backgroundArcMain,
        this.backgroundArcDanger,
        this.progressArcWhite,
        this.progressArcRed,
        this.startTick,
        this.endTick,
      ];

      this.setVisible(false, { immediate: true });
    }

    setConfig(config = {}, options = {}) {
      const fadeText = Boolean(options.fadeText);
      if (Object.prototype.hasOwnProperty.call(config, "label")) {
        this.label = String(config.label || "");
      }
      if (Object.prototype.hasOwnProperty.call(config, "unit")) {
        this.unit = String(config.unit || "");
      }
      if (Object.prototype.hasOwnProperty.call(config, "maxValue")) {
        this.maxValue = Math.max(0, toNumber(config.maxValue, this.maxValue));
      }
      if (Object.prototype.hasOwnProperty.call(config, "fractionDigits")) {
        this.fractionDigits = Math.max(0, Math.trunc(toNumber(config.fractionDigits, this.fractionDigits)));
      }

      const applyText = () => {
        if (this.labelNode) {
          this.labelNode.textContent = this.label;
        }
        if (this.unitNode) {
          this.unitNode.textContent = this.unit;
        }
      };

      if (!fadeText || !this.textRoot) {
        applyText();
      } else {
        if (this.textSwitchTimer) {
          clearTimeout(this.textSwitchTimer);
          this.textSwitchTimer = null;
        }
        this.textRoot.classList.add("telemetry-gauge-text-switch");
        this.textSwitchTimer = setTimeout(() => {
          applyText();
          this.textRoot.classList.remove("telemetry-gauge-text-switch");
          this.textSwitchTimer = null;
        }, GAUGE_TEXT_SWITCH_MS);
      }

      this.setValue(this.currentValue);
    }

    applyValue(nextValue, skipText = false) {
      const numericValue = Math.max(0, toNumber(nextValue, 0));
      const safeMax = this.maxValue > 0 ? this.maxValue : 1;
      const progressRatio = clamp(numericValue / safeMax, 0, 1);
      const currentProgressAngle = progressRatio * TOTAL_GAUGE_SWEEP_ANGLE;
      const whitePartSweep = Math.min(currentProgressAngle, CRITICAL_SWEEP_ANGLE);
      const redPartSweep = currentProgressAngle <= CRITICAL_SWEEP_ANGLE
        ? 0
        : currentProgressAngle - CRITICAL_SWEEP_ANGLE;

      this.currentValue = numericValue;

      const progressWhitePath = whitePartSweep > 0.01
        ? describeArc(
          this.cx,
          this.cy,
          GAUGE_RADIUS,
          GAUGE_VISUAL_START_ANGLE,
          GAUGE_VISUAL_START_ANGLE + whitePartSweep,
        )
        : "";

      const progressRedPath = redPartSweep > 0.01
        ? describeArc(
          this.cx,
          this.cy,
          GAUGE_RADIUS,
          GAUGE_VISUAL_START_ANGLE + CRITICAL_SWEEP_ANGLE,
          GAUGE_VISUAL_START_ANGLE + CRITICAL_SWEEP_ANGLE + redPartSweep,
        )
        : "";

      this.progressArcWhite.setAttribute("d", progressWhitePath);
      this.progressArcWhite.style.display = whitePartSweep > 0.01 ? "" : "none";

      this.progressArcRed.setAttribute("d", progressRedPath);
      this.progressArcRed.style.display = redPartSweep > 0.01 ? "" : "none";

      this.startTick.style.display = progressRatio > 0.001 ? "" : "none";
      this.endTick.style.stroke = "rgba(163, 163, 163, 0.82)";

      if (!skipText && this.valueNode) {
        this.valueNode.textContent = numericValue.toFixed(this.fractionDigits);
      }
    }

    setValue(nextValue, options = {}) {
      const numericValue = Math.max(0, toNumber(nextValue, 0));
      const animateMs = Math.max(0, Math.trunc(toNumber(options.animateMs, 0)));

      if (this.valueAnimationFrame) {
        cancelAnimationFrame(this.valueAnimationFrame);
        this.valueAnimationFrame = null;
      }

      if (animateMs <= 0) {
        this.applyValue(numericValue);
        return;
      }

      // 数字立刻跳变到最终值，弧线逐帧动画
      if (this.valueNode) {
        this.valueNode.textContent = numericValue.toFixed(this.fractionDigits);
      }

      const startValue = this.currentValue;
      const startAt = performance.now();
      const tick = (now) => {
        const ratio = clamp((now - startAt) / animateMs, 0, 1);
        const eased = ratio < 0.5
          ? 2 * ratio * ratio
          : 1 - ((-2 * ratio + 2) ** 2) / 2;
        const value = startValue + (numericValue - startValue) * eased;
        this.applyValue(value, true);

        if (ratio >= 1) {
          this.valueAnimationFrame = null;
          return;
        }
        this.valueAnimationFrame = requestAnimationFrame(tick);
      };

      this.valueAnimationFrame = requestAnimationFrame(tick);
    }

    setVisible(nextVisible, options = {}) {
      if (!this.rootEl) {
        return;
      }

      const visible = Boolean(nextVisible);
      const immediate = Boolean(options.immediate);

      if (this.visibilityTimer) {
        clearTimeout(this.visibilityTimer);
        this.visibilityTimer = null;
      }

      const clearStateClasses = () => {
        this.rootEl.classList.remove(
          "telemetry-gauge-hidden",
          "telemetry-gauge-visible",
          "telemetry-gauge-enter",
          "telemetry-gauge-exit",
        );
      };

      if (immediate) {
        clearStateClasses();
        this.rootEl.classList.add(visible ? "telemetry-gauge-visible" : "telemetry-gauge-hidden");
        this.visibilityState = visible ? "visible" : "hidden";
        return;
      }

      if (visible) {
        if (this.visibilityState === "visible" || this.visibilityState === "entering") {
          return;
        }

        clearStateClasses();
        void this.rootEl.offsetWidth;
        this.rootEl.classList.add("telemetry-gauge-enter");
        this.visibilityState = "entering";
        this.visibilityTimer = setTimeout(() => {
          if (!this.rootEl) {
            return;
          }
          clearStateClasses();
          this.rootEl.classList.add("telemetry-gauge-visible");
          this.visibilityState = "visible";
          this.visibilityTimer = null;
        }, GAUGE_SHOW_TOTAL_MS);
        return;
      }

      if (this.visibilityState === "hidden" || this.visibilityState === "exiting") {
        return;
      }

      clearStateClasses();
      void this.rootEl.offsetWidth;
      this.rootEl.classList.add("telemetry-gauge-exit");
      this.visibilityState = "exiting";
      this.visibilityTimer = setTimeout(() => {
        if (!this.rootEl) {
          return;
        }
        clearStateClasses();
        this.rootEl.classList.add("telemetry-gauge-hidden");
        this.visibilityState = "hidden";
        this.visibilityTimer = null;
      }, GAUGE_HIDE_TOTAL_MS);
    }

    destroy() {
      if (this.visibilityTimer) {
        clearTimeout(this.visibilityTimer);
        this.visibilityTimer = null;
      }
      if (this.textSwitchTimer) {
        clearTimeout(this.textSwitchTimer);
        this.textSwitchTimer = null;
      }
      if (this.valueAnimationFrame) {
        cancelAnimationFrame(this.valueAnimationFrame);
        this.valueAnimationFrame = null;
      }
      if (this.rootEl && this.rootEl.parentNode) {
        this.rootEl.parentNode.removeChild(this.rootEl);
      }
      this.rootEl = null;
      this.svgEl = null;
    }
  }

  window.MissionTelemetry = window.MissionTelemetry || {};
  window.MissionTelemetry.Gauge = Gauge;
})();
