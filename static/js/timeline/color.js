(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  function parseRgba(rgbaString) {
    const source = String(rgbaString || "");
    const match = source.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
    if (!match) {
      return null;
    }
    return {
      r: Number.parseInt(match[1], 10),
      g: Number.parseInt(match[2], 10),
      b: Number.parseInt(match[3], 10),
      a: match[4] === undefined ? 1 : Number.parseFloat(match[4]),
    };
  }

  function interpolateColor(startColor, endColor, factor) {
    const t = Math.max(0, Math.min(1, Number(factor) || 0));
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * t);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * t);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * t);
    const a = startColor.a + (endColor.a - startColor.a) * t;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }

  window.MissionTimeline.color = {
    parseRgba,
    interpolateColor,
  };
})();
