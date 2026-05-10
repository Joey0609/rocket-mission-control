(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  window.MissionTimeline.constants = {
    VIEW_WINDOW_SECONDS: 3600,
    DEFAULT_SVG_HEIGHT: 200,

    NODE_RADIUS: 7,
    INNER_DOT_RADIUS: 3,
    TEXT_OFFSET_FROM_NODE_EDGE: 0,

    ANIMATION_START_TIME: -7.8,
    ANIMATION_DURATION: 4,
    COLOR_TRANSITION_DURATION: 1.0,

    LAUNCH_SCALE_WAYPOINTS: [
      { time: -3600, scale: 1 },
      { time: -120, scale: 3},
      { time: -30, scale: 5 },
      { time: 50, scale: 4 },
      { time: 240, scale: 2 },
      { time: 530, scale: 5 },
      { time: 630, scale: 3 },
    ],

    GEOMETRY_TRANSITION_START_TIME: 0,
    GEOMETRY_TRANSITION_DURATION: 300,
    MAX_RADIUS_FOR_LINE: 50000,
    EXPOSED_ARC_ANGLE_DEG: 64,

    GAUSSIAN_BLUR_STD_DEV: 28,
    FADE_STOPS: [25, 35, 65, 75],

    COLOR_PAST_PRESENT_STR: "rgba(255, 255, 255, 1)",
    COLOR_FUTURE_STR: "rgba(255, 255, 255, 0.3)",
    COLOR_INNER_ARC_STR: "rgba(0, 0, 0, 0.6)",
    COLOR_INNER_DOT_START_STR: "rgba(255, 255, 255, 0)",
  };
})();
