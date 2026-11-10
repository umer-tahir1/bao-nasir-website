export const FOOD_MOTION = {
  cycles: 1,          // One right → left → right cycle over the page's scroll range.
  responseMs: 55,     // Light exponential smoothing; lower is more responsive.
  maxRotation: 2,     // Degrees; tilt follows horizontal movement and settles to zero.
  rotationGain: 0.04,
};

/** One image, one scroll-progress mapping, and a transform-only animation loop. */
export class FloatingFoodPlate {
  constructor({ src = new URL('../public/images/floating-biryani-chicken.png', import.meta.url).href } = {}) {
    this.events = new AbortController();
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.x = 0;
    this.rotation = 0;
    this.tick = this.tick.bind(this);

    this.element = document.createElement('div');
    this.element.className = 'floating-food';
    this.element.setAttribute('aria-hidden', 'true');
    // Anchor, horizontal motion, entrance, and idle bobbing have separate transforms.
    this.element.innerHTML = '<div class="floating-food__anchor"><div class="floating-food__horizontal"><div class="floating-food__entrance"></div></div></div>';
    this.anchor = this.element.querySelector('.floating-food__anchor');
    this.horizontal = this.element.querySelector('.floating-food__horizontal');
    this.image = new Image();
    this.image.className = 'floating-food__image';
    this.image.alt = '';
    this.image.draggable = false;
    this.image.decoding = 'async';
    this.image.fetchPriority = 'low';
    this.image.src = src;
    this.element.querySelector('.floating-food__entrance').append(this.image);
    document.body.append(this.element);

    // Only watch splash removal; disconnect permanently when the plate enters.
    this.openingObserver = new MutationObserver(() => this.reveal());
    this.openingObserver.observe(document.body, { childList: true });
    // Cache page length and viewport/plate sizes on resize, never in the scroll loop.
    this.resizeObserver = new ResizeObserver(() => this.measure());
    [document.documentElement, document.body, this.anchor].forEach(node => this.resizeObserver.observe(node));
    this.image.decode().then(() => {
      if (this.disposed) return;
      this.loaded = true;
      this.measure();
      this.reveal();
    }).catch(() => this.destroy());

    const options = { signal: this.events.signal };
    window.addEventListener('scroll', () => {
      this.updateTarget();
      this.schedule();
    }, { ...options, passive: true });
    window.addEventListener('resize', () => this.measure(), options);
    this.reducedMotion.addEventListener('change', () => {
      this.stop();
      this.measure();
    }, options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else { this.updateTarget(); this.schedule(); }
    }, options);
    window.addEventListener('pagehide', event => {
      if (event.persisted) this.stop();
      else this.destroy();
    }, options);
    window.addEventListener('pageshow', () => this.measure(), options);
  }

  measure() {
    if (this.disposed || !this.loaded) return;
    const viewportWidth = document.documentElement.clientWidth;
    const styles = getComputedStyle(this.element);
    const desiredRange = viewportWidth * parseFloat(styles.getPropertyValue('--travel-vw')) / 100;
    const edgeGap = parseFloat(styles.getPropertyValue('--edge-gap'));
    // Include a small rotation allowance so the entire image stays inside the screen.
    this.range = Math.max(0, Math.min(desiredRange, (viewportWidth - this.anchor.offsetWidth) / 2 - edgeGap - 12));
    this.maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    this.updateTarget();
    if (!this.visible || this.reducedMotion.matches) {
      this.x = this.targetX;
      this.rotation = 0;
      this.render();
    } else {
      this.schedule();
    }
  }

  updateTarget() {
    const progress = this.maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / this.maxScroll)) : 0;
    // 0% right, 25% center, 50% left, 75% center, 100% right; no discrete destinations.
    this.targetX = this.reducedMotion.matches ? 0 : (this.range || 0) * Math.cos(progress * Math.PI * 2 * FOOD_MOTION.cycles);
  }

  reveal() {
    if (this.disposed || this.visible || !this.loaded || document.querySelector('.bao-opening')) return;
    this.updateTarget();
    this.x = this.targetX;
    this.render();
    this.visible = true;
    this.element.classList.add('is-visible');
    this.openingObserver.disconnect();
  }

  schedule() {
    if (this.disposed || !this.visible || this.frame || document.hidden || this.reducedMotion.matches) return;
    this.previousTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  tick(now) {
    this.frame = 0;
    const dt = Math.min(now - this.previousTime, 64);
    this.previousTime = now;
    const blend = 1 - Math.exp(-dt / FOOD_MOTION.responseMs);
    const error = this.targetX - this.x;
    const targetRotation = Math.max(-FOOD_MOTION.maxRotation, Math.min(FOOD_MOTION.maxRotation, error * FOOD_MOTION.rotationGain));
    this.x += error * blend;
    this.rotation += (targetRotation - this.rotation) * blend;
    const moving = Math.abs(this.targetX - this.x) > 0.1 || Math.abs(this.rotation) > 0.01;
    if (!moving) { this.x = this.targetX; this.rotation = 0; }
    this.render();
    // Stop JS work at rest; CSS handles the independent slow float.
    if (moving) this.frame = requestAnimationFrame(this.tick);
  }

  render() {
    this.horizontal.style.transform = `translate3d(${this.x}px, 0, 0) rotate(${this.rotation}deg)`;
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.events.abort();
    this.openingObserver.disconnect();
    this.resizeObserver.disconnect();
    this.element.remove();
  }
}
