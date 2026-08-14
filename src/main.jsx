import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

// Dev-only shim pro skryté taby (headless/embedded prohlížeče): Chrome v nich
// pozastavuje requestAnimationFrame i ResizeObserver, takže by se R3F canvas
// nikdy nenamountoval a nerenderoval. V produkci se kód odstraní tree-shakingem.
if (import.meta.env.DEV && document.visibilityState === 'hidden') {
  const origRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    document.visibilityState === 'hidden'
      ? setTimeout(() => cb(performance.now()), 33)
      : origRaf(cb);
  window.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
  const NativeRO = window.ResizeObserver;
  window.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      this.elements = new Set();
      this.native = NativeRO ? new NativeRO(callback) : null;
      this.interval = setInterval(() => {
        if (!this.elements.size) return;
        const entries = [...this.elements].map((el) => ({
          target: el,
          contentRect: el.getBoundingClientRect(),
        }));
        this.callback(entries, this);
      }, 300);
    }
    observe(el) {
      this.elements.add(el);
      this.native?.observe(el);
    }
    unobserve(el) {
      this.elements.delete(el);
      this.native?.unobserve(el);
    }
    disconnect() {
      clearInterval(this.interval);
      this.elements.clear();
      this.native?.disconnect();
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
