(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  const easing = window.MissionTimeline.easing;
  const constants = window.MissionTimeline.constants;

  function createTimeMapFunction(currentTime, avgScale, pastScale, futureScale) {
    const animationStartTime = constants.ANIMATION_START_TIME;
    const animationDuration = constants.ANIMATION_DURATION;
    const animationEndTime = animationStartTime + animationDuration;

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

    return function mapTime(time) {
      if (time <= 0) {
        return time * animatedPastScale;
      }
      return time * animatedFutureScale;
    };
  }

  window.MissionTimeline.createTimeMapFunction = createTimeMapFunction;
})();
