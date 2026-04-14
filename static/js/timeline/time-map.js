(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  const easing = window.MissionTimeline.easing;
  const constants = window.MissionTimeline.constants;
  let lastLoggedScaleTarget = null;

  function maybeLogScaleTargetSwitch(targetScale, currentTime) {
    if (lastLoggedScaleTarget === null) {
      lastLoggedScaleTarget = targetScale;
      return;
    }
    if (lastLoggedScaleTarget === targetScale) {
      return;
    }
    lastLoggedScaleTarget = targetScale;
    const sign = currentTime >= 0 ? "+" : "";
    console.info(`[MissionTimeline] target scale -> ${targetScale} at T${sign}${currentTime.toFixed(2)}s`);
  }

  function computeLaunchZoomScale(currentTime, options) {
    const startTime = Number(options?.startTime ?? constants.LAUNCH_SCALE_START_TIME);
    const peakTime = Number(options?.peakTime ?? constants.LAUNCH_SCALE_PEAK_TIME);
    const endTime = Number(options?.endTime ?? constants.LAUNCH_SCALE_END_TIME);
    const recoverDuration = Math.max(0.1, Number(options?.recoverDuration ?? constants.LAUNCH_SCALE_RECOVER_DURATION));
    const maxScale = Math.max(1, Number(options?.maxScale ?? constants.LAUNCH_SCALE_MAX));
    const targetScale = (currentTime > startTime && currentTime <= endTime) ? maxScale : 1;
    maybeLogScaleTargetSwitch(targetScale, currentTime);

    if (currentTime <= startTime) {
      return 1;
    }

    if (currentTime <= peakTime) {
      const segment = Math.max(1e-9, peakTime - startTime);
      const progress = easing.easeOutQuart((currentTime - startTime) / segment);
      return easing.lerp(1, maxScale, progress);
    }

    if (currentTime <= endTime) {
      return maxScale;
    }

    if (currentTime >= endTime + recoverDuration) {
      return 1;
    }

    const progress = easing.easeInOutSine((currentTime - endTime) / recoverDuration);
    return easing.lerp(maxScale, 1, progress);
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
