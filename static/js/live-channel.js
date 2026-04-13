class LiveChannel {
  constructor(options) {
    this.streamUrl = options.streamUrl;
    this.onState = options.onState;
    this.onModeChange = options.onModeChange || (() => {});

    this.eventSource = null;
    this.closed = false;
    this.retryTimer = null;
    this.retryMs = 1000;
    this.mode = "init";
  }

  start() {
    this.closed = false;
    this.#connectSSE();
  }

  stop() {
    this.closed = true;
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  #setMode(nextMode) {
    if (this.mode !== nextMode) {
      this.mode = nextMode;
      this.onModeChange(nextMode);
    }
  }

  #connectSSE() {
    if (this.closed) {
      return;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.eventSource = new EventSource(this.streamUrl);
    this.#setMode("sse");

    this.eventSource.addEventListener("state", (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.retryMs = 1000;
        this.onState(payload);
      } catch (error) {
        console.error("SSE 解析失败", error);
      }
    });

    this.eventSource.onerror = () => {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.#setMode("reconnect");
      this.#scheduleReconnect();
    };
  }

  #scheduleReconnect() {
    if (this.closed || this.retryTimer) {
      return;
    }

    const wait = this.retryMs;
    this.retryMs = Math.min(12000, this.retryMs + 1000);

    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.#connectSSE();
    }, wait);
  }
}

window.LiveChannel = LiveChannel;
