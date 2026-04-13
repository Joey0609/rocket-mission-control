class LiveChannel {
  constructor(options) {
    this.streamUrl = options.streamUrl;
    this.stateUrl = options.stateUrl;
    this.onState = options.onState;
    this.onModeChange = options.onModeChange || (() => {});

    this.eventSource = null;
    this.pollTimer = null;
    this.lastHint = 5000;
    this.mode = "init";
    this.closed = false;
  }

  start() {
    this.closed = false;
    this.#connectSSE();
  }

  stop() {
    this.closed = true;
    this.#stopPolling();
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

    this.#setMode("sse");
    this.#stopPolling();

    this.eventSource = new EventSource(this.streamUrl);
    this.eventSource.addEventListener("state", (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.lastHint = this.#sanitizeHint(payload.next_poll_hint_ms);
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
      this.#fallbackToPolling();
    };
  }

  #fallbackToPolling() {
    if (this.closed) {
      return;
    }

    this.#setMode("poll");
    this.#pollOnce();
  }

  #pollOnce() {
    if (this.closed) {
      return;
    }

    fetch(this.stateUrl, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        this.lastHint = this.#sanitizeHint(payload.next_poll_hint_ms);
        this.onState(payload);
        this.#schedulePoll(this.lastHint);
      })
      .catch((error) => {
        console.error("轮询失败", error);
        this.#schedulePoll(3000);
      });
  }

  #schedulePoll(ms) {
    this.#stopPolling();
    this.pollTimer = window.setTimeout(() => {
      this.#pollOnce();
    }, ms);
  }

  #stopPolling() {
    if (this.pollTimer) {
      window.clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  #sanitizeHint(hint) {
    const fallback = 5000;
    if (typeof hint !== "number" || Number.isNaN(hint)) {
      return fallback;
    }
    return Math.min(15000, Math.max(1000, Math.floor(hint)));
  }
}

window.LiveChannel = LiveChannel;
