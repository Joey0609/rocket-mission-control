(function () {
  window.MissionTimeline = window.MissionTimeline || {};

  const SVG_NS = "http://www.w3.org/2000/svg";

  function createSvgElement(tagName, attributes) {
    const el = document.createElementNS(SVG_NS, tagName);
    const attrs = attributes || {};
    Object.keys(attrs).forEach((key) => {
      el.setAttribute(key, String(attrs[key]));
    });
    return el;
  }

  function drawCircle(parent, attributes) {
    parent.appendChild(createSvgElement("circle", attributes));
  }

  function drawPath(parent, attributes) {
    parent.appendChild(createSvgElement("path", attributes));
  }

  function drawLine(parent, attributes) {
    parent.appendChild(createSvgElement("line", attributes));
  }

  function drawText(parent, content, attributes) {
    const textEl = createSvgElement("text", attributes);
    textEl.textContent = content;
    parent.appendChild(textEl);
  }

  window.MissionTimeline.svgDrawing = {
    createSvgElement,
    drawCircle,
    drawPath,
    drawLine,
    drawText,
  };
})();
