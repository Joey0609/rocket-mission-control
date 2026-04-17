(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  const constants = window.MissionTimeline.constants;
  const computeGeometry = window.MissionTimeline.computeGeometry;
  const computeNodes = window.MissionTimeline.computeNodes;
  const drawing = window.MissionTimeline.svgDrawing;

  function makeUniqueId(prefix) {
    return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
  }

  class TimelineRenderer {
    constructor(options) {
      this.mountEl = options?.mountEl || null;
      this.svgHeight = Math.max(1, Number(options?.svgHeight) || constants.DEFAULT_SVG_HEIGHT);
      this.missionDuration = Math.max(1, Number(options?.missionDuration) || constants.VIEW_WINDOW_SECONDS);
      this.currentTimeOffset = Number(options?.currentTimeOffset || 0);

      this.events = [];
      this.eventsSignature = "";

      this.svg = null;
      this.maskGroup = null;
      this.sharpGroup = null;
      this.blurredGroup = null;
      this.fillRect = null;
      this.resizeObserver = null;

      this.ids = {
        fadeGradient: makeUniqueId("fade-gradient"),
        fixedFadeMask: makeUniqueId("fixed-fade-mask"),
        blurFilter: makeUniqueId("timeline-blur"),
        timelineMask: makeUniqueId("timeline-mask"),
      };

      this._boundRender = this.render.bind(this);

      if (this.mountEl) {
        this.buildSvg();
        this.bindResize();
      }
    }

    setEvents(rawEvents) {
      const normalized = Array.isArray(rawEvents)
        ? rawEvents.map((item, index) => ({
          id: String(item?.id || `${item?.time || 0}-${index}`),
          time: Number(item?.time || 0),
          name: String(item?.name || `事件 ${index + 1}`),
        })).sort((a, b) => a.time - b.time)
        : [];

      const nextSig = normalized.map((item) => `${item.id}|${item.time}|${item.name}`).join(";");
      if (nextSig !== this.eventsSignature) {
        this.eventsSignature = nextSig;
        this.events = normalized;
      }
    }

    setCurrentTimeOffset(seconds) {
      const value = Number(seconds);
      this.currentTimeOffset = Number.isFinite(value) ? value : 0;
    }

    setMissionDuration(seconds) {
      const value = Number(seconds);
      this.missionDuration = Number.isFinite(value) && value > 0 ? value : constants.VIEW_WINDOW_SECONDS;
    }

    buildSvg() {
      if (!this.mountEl) {
        return;
      }

      this.mountEl.innerHTML = "";

      const svg = drawing.createSvgElement("svg", {
        class: "mission-timeline-svg",
        width: "100",
        height: String(this.svgHeight),
        "aria-hidden": "true",
      });

      const defs = drawing.createSvgElement("defs", {});

      const fadeGradient = drawing.createSvgElement("linearGradient", {
        id: this.ids.fadeGradient,
      });
      const [s1, s2, s3, s4] = constants.FADE_STOPS;
      fadeGradient.appendChild(drawing.createSvgElement("stop", { offset: `${s1}%`, "stop-color": "black" }));
      fadeGradient.appendChild(drawing.createSvgElement("stop", { offset: `${s2}%`, "stop-color": "white" }));
      fadeGradient.appendChild(drawing.createSvgElement("stop", { offset: `${s3}%`, "stop-color": "white" }));
      fadeGradient.appendChild(drawing.createSvgElement("stop", { offset: `${s4}%`, "stop-color": "black" }));
      defs.appendChild(fadeGradient);

      const fixedFadeMask = drawing.createSvgElement("mask", { id: this.ids.fixedFadeMask });
      fixedFadeMask.appendChild(drawing.createSvgElement("rect", {
        x: 0,
        y: 0,
        width: "100%",
        height: "100%",
        fill: `url(#${this.ids.fadeGradient})`,
      }));
      defs.appendChild(fixedFadeMask);

      const blurFilter = drawing.createSvgElement("filter", {
        id: this.ids.blurFilter,
        x: 0,
        y: 0,
        width: "100%",
        height: "100%",
        filterUnits: "userSpaceOnUse",
      });
      blurFilter.appendChild(drawing.createSvgElement("feGaussianBlur", {
        in: "SourceGraphic",
        stdDeviation: constants.GAUSSIAN_BLUR_STD_DEV,
      }));
      defs.appendChild(blurFilter);

      const timelineMask = drawing.createSvgElement("mask", { id: this.ids.timelineMask });
      this.maskGroup = drawing.createSvgElement("g", {});
      timelineMask.appendChild(this.maskGroup);
      defs.appendChild(timelineMask);

      this.blurredGroup = drawing.createSvgElement("g", {
        filter: `url(#${this.ids.blurFilter})`,
      });

      const maskedGroupAttrs = {
        mask: `url(#${this.ids.fixedFadeMask})`,
      };
      const maskedGroup = drawing.createSvgElement("g", maskedGroupAttrs);

      this.fillRect = drawing.createSvgElement("rect", {
        x: 0,
        y: 0,
        width: "100",
        height: String(this.svgHeight),
        fill: "rgba(255, 255, 255, 1)",
        mask: `url(#${this.ids.timelineMask})`,
      });
      maskedGroup.appendChild(this.fillRect);

      this.sharpGroup = drawing.createSvgElement("g", {});
      maskedGroup.appendChild(this.sharpGroup);

      svg.appendChild(defs);
      svg.appendChild(this.blurredGroup);
      svg.appendChild(maskedGroup);

      this.svg = svg;
      this.mountEl.appendChild(svg);
      this.updateSize();
    }

    bindResize() {
      window.addEventListener("resize", this._boundRender);
      if (typeof ResizeObserver === "function" && this.mountEl) {
        this.resizeObserver = new ResizeObserver(this._boundRender);
        this.resizeObserver.observe(this.mountEl);
      }
    }

    destroy() {
      window.removeEventListener("resize", this._boundRender);
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this.mountEl) {
        this.mountEl.innerHTML = "";
      }
    }

    getSvgWidth() {
      const mountWidth = this.mountEl
        ? Number(this.mountEl.clientWidth || this.mountEl.offsetWidth || 0)
        : 0;
      if (Number.isFinite(mountWidth) && mountWidth > 0) {
        return Math.max(1, Math.round(mountWidth));
      }

      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1920;
      return Math.max(1, Math.round(viewportWidth));
    }

    updateSize() {
      if (!this.svg || !this.fillRect) {
        return;
      }
      const width = this.getSvgWidth();
      this.svg.setAttribute("width", String(width));
      this.svg.setAttribute("height", String(this.svgHeight));
      this.fillRect.setAttribute("width", String(width));
      this.fillRect.setAttribute("height", String(this.svgHeight));
      this.currentGeometry = {
        width,
        height: this.svgHeight,
      };
    }

    clearCanvas() {
      if (this.maskGroup) {
        this.maskGroup.innerHTML = "";
      }
      if (this.sharpGroup) {
        this.sharpGroup.innerHTML = "";
      }
      if (this.blurredGroup) {
        this.blurredGroup.innerHTML = "";
      }
    }

    drawStaticElements(geometry) {
      const sharpGroup = this.sharpGroup;
      const blurredGroup = this.blurredGroup;
      const maskGroup = this.maskGroup;
      if (!sharpGroup || !blurredGroup || !maskGroup) {
        return;
      }

      const innerArcOffset = 32;
      const borderArcRadius = geometry.circleRadius - innerArcOffset;

      if (borderArcRadius > 0) {
        const angleSpan = Math.PI / 2;
        const startAngle = -Math.PI / 2 - angleSpan / 2;
        const endAngle = -Math.PI / 2 + angleSpan / 2;
        const blurOffset = 20;

        const x1Blur = geometry.circleCenterX + (borderArcRadius + blurOffset) * Math.cos(startAngle);
        const y1Blur = geometry.circleCenterY + (borderArcRadius + blurOffset) * Math.sin(startAngle);
        const x2Blur = geometry.circleCenterX + (borderArcRadius + blurOffset) * Math.cos(endAngle);
        const y2Blur = geometry.circleCenterY + (borderArcRadius + blurOffset) * Math.sin(endAngle);
        drawing.drawPath(blurredGroup, {
          d: `M ${x1Blur} ${y1Blur} A ${borderArcRadius + blurOffset} ${borderArcRadius + blurOffset} 0 0 1 ${x2Blur} ${y2Blur} Z`,
          fill: constants.COLOR_INNER_ARC_STR,
        });

        const x1Border = geometry.circleCenterX + borderArcRadius * Math.cos(startAngle);
        const y1Border = geometry.circleCenterY + borderArcRadius * Math.sin(startAngle);
        const x2Border = geometry.circleCenterX + borderArcRadius * Math.cos(endAngle);
        const y2Border = geometry.circleCenterY + borderArcRadius * Math.sin(endAngle);
        drawing.drawPath(sharpGroup, {
          d: `M ${x1Border} ${y1Border} A ${borderArcRadius} ${borderArcRadius} 0 0 1 ${x2Border} ${y2Border}`,
          stroke: "rgba(168, 168, 168, 0.6)",
          "stroke-width": 1.2,
          fill: "none",
        });
      }

      const mainArcY = geometry.circleCenterY - geometry.circleRadius;
      drawing.drawPath(maskGroup, {
        d: `M ${geometry.circleCenterX - geometry.circleRadius} ${geometry.circleCenterY} A ${geometry.circleRadius} ${geometry.circleRadius} 0 0 1 ${geometry.circleCenterX} ${mainArcY}`,
        stroke: constants.COLOR_PAST_PRESENT_STR,
        "stroke-width": 3,
        fill: "none",
      });
      drawing.drawPath(maskGroup, {
        d: `M ${geometry.circleCenterX} ${mainArcY} A ${geometry.circleRadius} ${geometry.circleRadius} 0 0 1 ${geometry.circleCenterX + geometry.circleRadius} ${geometry.circleCenterY}`,
        stroke: constants.COLOR_FUTURE_STR,
        "stroke-width": 3,
        fill: "none",
      });

      drawing.drawLine(maskGroup, {
        x1: geometry.circleCenterX,
        y1: mainArcY - 5,
        x2: geometry.circleCenterX,
        y2: mainArcY + 5,
        stroke: constants.COLOR_PAST_PRESENT_STR,
        "stroke-width": 2,
      });
    }

    drawNode(node) {
      if (!this.sharpGroup || !this.maskGroup) {
        return;
      }

      drawing.drawCircle(this.maskGroup, {
        cx: node.position.cx,
        cy: node.position.cy,
        r: node.outerCircle.radius,
        fill: "rgba(0, 0, 0, 1)",
      });

      drawing.drawCircle(this.sharpGroup, {
        cx: node.position.cx,
        cy: node.position.cy,
        r: node.outerCircle.radius,
        fill: "none",
        stroke: node.outerCircle.color,
        "stroke-width": 1,
      });

      if (node.innerDot.shouldDraw) {
        drawing.drawCircle(this.sharpGroup, {
          cx: node.position.cx,
          cy: node.position.cy,
          r: node.innerDot.radius,
          fill: node.innerDot.color,
        });
      }

      drawing.drawText(this.sharpGroup, node.text.content, {
        x: node.text.x,
        y: node.text.y,
        fill: "rgba(255, 255, 255, 1)",
        "font-size": "15px",
        "font-family": "Saira, Noto Sans SC, sans-serif",
        "font-weight": "500",
        transform: node.text.transform,
        "text-anchor": node.text.anchor,
        "dominant-baseline": node.text.baseline,
      });
    }

    render() {
      if (!this.svg || !this.mountEl) {
        return;
      }

      this.updateSize();
      const geometry = computeGeometry({
        width: this.currentGeometry.width,
        height: this.currentGeometry.height,
        currentTimeOffset: this.currentTimeOffset,
      });

      const processedNodes = computeNodes({
        events: this.events,
        missionDuration: this.missionDuration,
        currentTimeOffset: this.currentTimeOffset,
        geometry,
      });

      this.clearCanvas();
      this.drawStaticElements(geometry);

      processedNodes.forEach((node) => {
        if (node.isVisible) {
          this.drawNode(node);
        }
      });
    }
  }

  window.MissionTimeline.TimelineRenderer = TimelineRenderer;
})();
