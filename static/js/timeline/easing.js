(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  function clamp01(value) {
    if (value < 0) {
      return 0;
    }
    if (value > 1) {
      return 1;
    }
    return value;
  }

  function lerp(start, end, t) {
    return start * (1 - t) + end * t;
  }

  function easeInOutSine(t) {
    const clamped = clamp01(t);
    return 0.5 * (1 - Math.cos(Math.PI * clamped));
  }

  function easeOutQuart(x) {
    const clamped = clamp01(x);
    return 1 - (1 - clamped) ** 4;
  }

  function easeInOutQuart(x) {
    const clamped = clamp01(x);
    if (clamped < 0.5) {
      return 8 * clamped * clamped * clamped * clamped;
    }
    return 1 - ((-2 * clamped + 2) ** 4) / 2;
  }

  window.MissionTimeline.easing = {
    clamp01,
    lerp,
    easeInOutSine,
    easeOutQuart,
    easeInOutQuart,
  };
})();
