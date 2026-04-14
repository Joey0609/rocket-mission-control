(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  const easing = window.MissionTimeline.easing;
  const constants = window.MissionTimeline.constants;

  function computeGeometry(options) {
    const width = Math.max(1, Number(options.width) || 1920);
    const height = Math.max(1, Number(options.height) || constants.DEFAULT_SVG_HEIGHT);
    const currentTime = Number(options.currentTimeOffset) || 0;

    const transitionStartTime = constants.GEOMETRY_TRANSITION_START_TIME;
    const transitionDuration = constants.GEOMETRY_TRANSITION_DURATION;
    const rawProgress = Math.max(0, (currentTime - transitionStartTime) / transitionDuration);
    const progress = easing.easeOutQuart(Math.min(1, rawProgress));

    const finalRadius = width / 2;
    const exposedArcAngleRad = constants.EXPOSED_ARC_ANGLE_DEG * (Math.PI / 180);
    const finalDistCenterToChord = finalRadius * Math.cos(exposedArcAngleRad / 2);
    const finalCenterY = height + finalDistCenterToChord;
    const topArcAnchorY = finalCenterY - finalRadius;

    const circleRadius = easing.lerp(constants.MAX_RADIUS_FOR_LINE, finalRadius, progress);
    const circleCenterY = topArcAnchorY + circleRadius;
    const circleCenterX = width / 2;

    return {
      width,
      height,
      circleRadius,
      circleCenterX,
      circleCenterY,
    };
  }

  window.MissionTimeline.computeGeometry = computeGeometry;
})();
