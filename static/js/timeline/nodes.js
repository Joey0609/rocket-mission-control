(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  const constants = window.MissionTimeline.constants;
  const easing = window.MissionTimeline.easing;
  const color = window.MissionTimeline.color;
  const computeLaunchZoomScale = window.MissionTimeline.computeLaunchZoomScale;
  const createTimeMapFunction = window.MissionTimeline.createTimeMapFunction;

  const COLOR_PAST_PRESENT = color.parseRgba(constants.COLOR_PAST_PRESENT_STR) || { r: 255, g: 255, b: 255, a: 1 };
  const COLOR_FUTURE = color.parseRgba(constants.COLOR_FUTURE_STR) || { r: 255, g: 255, b: 255, a: 0.3 };
  const COLOR_INNER_DOT_START = color.parseRgba(constants.COLOR_INNER_DOT_START_STR) || { r: 255, g: 255, b: 255, a: 0 };

  function normalizeEvents(events) {
    if (!Array.isArray(events)) {
      return [];
    }

    return events
      .map((event, index) => ({
        time: Number(event?.time || 0),
        name: String(event?.name || `事件 ${index + 1}`),
        key: String(event?.id || `${event?.time || 0}-${event?.name || index}`),
      }))
      .sort((a, b) => a.time - b.time);
  }

  function computeNodes(options) {
    const currentTimelineTime = Number(options.currentTimeOffset || 0);
    const missionDuration = Math.max(1, Number(options.missionDuration) || constants.VIEW_WINDOW_SECONDS);
    const geometry = options.geometry || {};
    const circleRadius = Number(geometry.circleRadius || 1);
    const circleCenterX = Number(geometry.circleCenterX || 0);
    const circleCenterY = Number(geometry.circleCenterY || 0);
    const svgHeight = Number(geometry.height || constants.DEFAULT_SVG_HEIGHT);
    const svgWidth = Number(geometry.width || 1920);

    const colorTransitionDuration = constants.COLOR_TRANSITION_DURATION;
    const transitionStartOffset = colorTransitionDuration / 2;
    const transitionEndOffset = -colorTransitionDuration / 2;
    const launchZoomScale = typeof computeLaunchZoomScale === "function"
      ? computeLaunchZoomScale(currentTimelineTime, {
        waypoints: constants.LAUNCH_SCALE_WAYPOINTS,
      })
      : 1;

    const mapTime = createTimeMapFunction(
      currentTimelineTime,
      Number(options.averageDensityFactor || 1.6),
      Number(options.pastNodeDensityFactor || 2.4),
      Number(options.futureNodeDensityFactor || 2.4),
      launchZoomScale,
    );

    const normalizedEvents = normalizeEvents(options.events);

    const halfReferencePathLength = svgWidth / 2;
    const halfMissionSeconds = missionDuration / 2;

    return normalizedEvents.map((event, originalIndex) => {
      const mappedTimestamp = mapTime(event.time);
      const mappedCurrentTime = mapTime(currentTimelineTime);
      const virtualTimeRelativeToNow = mappedTimestamp - mappedCurrentTime;

      const rawArcOffset = (virtualTimeRelativeToNow / halfMissionSeconds) * halfReferencePathLength;
      const targetArcLengthOffset = Math.max(-halfReferencePathLength, Math.min(halfReferencePathLength, rawArcOffset));
      const angularOffset = targetArcLengthOffset / (circleRadius + 1e-9);
      const angleRad = angularOffset - (Math.PI / 2);

      const cx = circleCenterX + circleRadius * Math.cos(angleRad);
      const cy = circleCenterY + circleRadius * Math.sin(angleRad);

      const timeRelativeToNow = event.time - currentTimelineTime;
      const shouldDrawInnerDot = timeRelativeToNow <= transitionStartOffset;

      let nodeColor;
      let innerDotColor;
      if (timeRelativeToNow <= transitionStartOffset && timeRelativeToNow >= transitionEndOffset) {
        const easedProgress = easing.easeInOutSine((transitionStartOffset - timeRelativeToNow) / colorTransitionDuration);
        nodeColor = color.interpolateColor(COLOR_FUTURE, COLOR_PAST_PRESENT, easedProgress);
        innerDotColor = color.interpolateColor(COLOR_INNER_DOT_START, COLOR_PAST_PRESENT, easedProgress);
      } else {
        nodeColor = timeRelativeToNow > 0 ? constants.COLOR_FUTURE_STR : constants.COLOR_PAST_PRESENT_STR;
        innerDotColor = timeRelativeToNow > 0 ? constants.COLOR_INNER_DOT_START_STR : constants.COLOR_PAST_PRESENT_STR;
      }

      const isOutsideText = originalIndex % 2 === 1;
      const textDirection = isOutsideText ? 1 : -1;
      const totalTextOffset = constants.NODE_RADIUS + constants.TEXT_OFFSET_FROM_NODE_EDGE;
      const textX = cx + textDirection * totalTextOffset * Math.cos(angleRad);
      const textY = cy + textDirection * totalTextOffset * Math.sin(angleRad);
      const textRotationDeg = (angleRad * (180 / Math.PI)) + 90;

      return {
        key: event.key,
        name: event.name,
        isVisible: cy >= -constants.NODE_RADIUS && cy <= svgHeight + constants.NODE_RADIUS,
        position: { cx, cy },
        outerCircle: { color: nodeColor, radius: constants.NODE_RADIUS },
        innerDot: { color: innerDotColor, radius: constants.INNER_DOT_RADIUS, shouldDraw: shouldDrawInnerDot },
        text: {
          content: event.name,
          x: textX,
          y: textY,
          transform: `rotate(${textRotationDeg}, ${textX}, ${textY})`,
          anchor: "middle",
          baseline: isOutsideText ? "text-after-edge" : "text-before-edge",
        },
      };
    });
  }

  window.MissionTimeline.computeNodes = computeNodes;
})();
