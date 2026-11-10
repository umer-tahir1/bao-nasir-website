// Timing starts after the image is decoded and has had a chance to paint.
export const HOLD_MS = 2000;

// Percentage coordinates, top to bottom. One boundary produces matching halves.
export const CRACK_POINTS = [
  [50.5, 0], [48.8, 9], [51.7, 16], [49.4, 23], [52.3, 30],
  [48.2, 38], [50.7, 44], [47.6, 51], [51.4, 58], [49.3, 64],
  [52.1, 71], [48.6, 79], [50.9, 86], [49.1, 93], [50.4, 100],
];

export class BaoOpeningAnimation {
  constructor(overlay, { holdMs = HOLD_MS } = {}) {
    this.overlay = overlay;
    this.holdMs = holdMs;
    this.disposed = false;
    this.events = new AbortController();
    this.content = document.querySelector('.website-content');
    this.finish = this.destroy.bind(this);
    this.onPageHide = () => {
      // A restored back/forward-cache page should never retain a stuck overlay.
      this.destroy();
    };
    window.addEventListener('pagehide', this.onPageHide, { signal: this.events.signal });
    this.start();
  }

  async start() {
    try {
      const stage = this.overlay.querySelector('.bao-opening__stage');
      const original = stage.querySelector('img');
      const boundary = CRACK_POINTS.map(([x, y]) => `${x}% ${y}%`).join(', ');
      this.overlay.style.setProperty('--left-clip', `polygon(0% 0%, ${boundary}, 0% 100%)`);
      this.overlay.style.setProperty('--right-clip', `polygon(100% 0%, ${boundary}, 100% 100%)`);

      const images = [original];
      for (const side of ['left', 'right']) {
        const piece = document.createElement('div');
        piece.className = `bao-opening__piece bao-opening__piece--${side}`;
        const image = original.cloneNode();
        image.className = 'bao-opening__image';
        piece.append(image);
        stage.append(piece);
        images.push(image);
      }

      // SVG uses the same normalized coordinates; it never changes the photograph.
      const ns = 'http://www.w3.org/2000/svg';
      const crack = document.createElementNS(ns, 'svg');
      crack.setAttribute('class', 'bao-opening__crack');
      crack.setAttribute('viewBox', '0 0 100 100');
      crack.setAttribute('preserveAspectRatio', 'none');
      const line = document.createElementNS(ns, 'polyline');
      line.setAttribute('points', CRACK_POINTS.map(point => point.join(',')).join(' '));
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', '#ffe0b3');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      crack.append(line);
      stage.append(crack);

      await Promise.all(images.map(image => image.decode()));
      if (this.disposed) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = requestAnimationFrame(() => {
          this.holdTimer = setTimeout(() => this.split(), this.holdMs);
        });
      });
    } catch (error) {
      console.warn('Bao opening image could not load; showing the page.', error);
      this.destroy();
    }
  }

  split() {
    if (this.disposed) return;
    this.overlay.addEventListener('animationend', event => {
      if (event.animationName === 'bao-exit' || event.animationName === 'bao-fade') {
        this.finish();
      }
    }, { signal: this.events.signal });
    this.overlay.classList.add('is-splitting');

    // Fallback cleanup if an animationend event is interrupted or suppressed.
    const duration = getComputedStyle(this.overlay).getPropertyValue('--split-duration').trim();
    const durationMs = parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000);
    this.cleanupTimer = setTimeout(this.finish, durationMs + 150);
  }

  // Remove all layers/listeners/timers and restore normal document scrolling.
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.holdTimer);
    clearTimeout(this.cleanupTimer);
    cancelAnimationFrame(this.frame);
    this.events.abort();
    this.overlay.remove();
    document.documentElement.classList.remove('bao-opening-active');
    this.content?.removeAttribute('inert');
  }
}
