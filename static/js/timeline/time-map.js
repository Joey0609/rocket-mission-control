(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  const easing = window.MissionTimeline.easing;
  const constants = window.MissionTimeline.constants;

  function computeLaunchZoomScale(currentTime, options) {
    const waypoints = Array.isArray(options?.waypoints) ? options.waypoints : constants.LAUNCH_SCALE_WAYPOINTS;
    if (waypoints.length === 0) {
      return 1;
    }

    const transitionWindow = 6; // 每个 waypoint 切换耗时 6 秒

    // 找到当前时间之前最后一个已到达的 waypoint，和下一个 waypoint
    let prev = waypoints[0];
    let next = null;
    for (const wp of waypoints) {
      if (wp.time <= currentTime) {
        prev = wp;
      }
      if (wp.time > currentTime && next === null) {
        next = wp;
      }
    }

    // T < 第一个 waypoint：直接使用第一个
    if (currentTime <= waypoints[0].time) {
      return waypoints[0].scale;
    }

    // 没有下一个 waypoint，或未进入切换窗口：保持上一个的值
    if (!next || currentTime < next.time - transitionWindow) {
      return prev.scale;
    }

    // 在 6s 切换窗口内：从 prev.scale 过渡到 next.scale
    const elapsed = currentTime - (next.time - transitionWindow);
    const progress = Math.min(1, Math.max(0, elapsed / transitionWindow));
    const eased = easing.easeInOutSine(progress);
    return easing.lerp(prev.scale, next.scale, eased);
  }

  function createTimeMapFunction(currentTime, avgScale, pastScale, futureScale, launchZoomScale) {
    const animationStartTime = constants.ANIMATION_START_TIME;
    const animationDuration = constants.ANIMATION_DURATION;
    const animationEndTime = animationStartTime + animationDuration;
    const zoomScale = Math.max(1, Number(launchZoomScale) || 1);

    let animatedPastScale;
    let animatedFutureScale;

    if (currentTime < animationStartTime) {
      animatedPastScale = avgScale;
      animatedFutureScale = avgScale;
    } else if (currentTime >= animationEndTime) {
      animatedPastScale = pastScale;
      animatedFutureScale = futureScale;
    } else {
      const easedProgress = easing.easeInOutQuart((currentTime - animationStartTime) / animationDuration);
      animatedPastScale = easing.lerp(avgScale, pastScale, easedProgress);
      animatedFutureScale = easing.lerp(avgScale, futureScale, easedProgress);
    }

    const effectivePastScale = animatedPastScale * zoomScale;
    const effectiveFutureScale = animatedFutureScale * zoomScale;

    return function mapTime(time) {
      if (time <= 0) {
        return time * effectivePastScale;
      }
      return time * effectiveFutureScale;
    };
  }

  window.MissionTimeline.computeLaunchZoomScale = computeLaunchZoomScale;
  window.MissionTimeline.createTimeMapFunction = createTimeMapFunction;
})();
