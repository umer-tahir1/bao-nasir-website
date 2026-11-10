`floating-biryani-chicken.png` is the exact supplied `component_image.png`.
The opening animation and source images are unchanged.

The component uses requestAnimationFrame and a continuous cosine mapping of total
page scroll progress: right → center → left → center → right at 0/25/50/75/100%.
It does not inspect page content or decide which side to occupy. A light,
time-based exponential follower smooths input without the old timed crossings.
There is no animation library or React state. It keeps one image in the DOM.

Controls in `components/FloatingFoodPlate.css`:
- `--travel-vw`: maximum travel either side of center as a percentage of viewport
  width (desktop 35, tablet 28, mobile 18). The actual range is capped to keep the
  image inside the viewport, accounting for its width and small rotation.
- `--edge-gap`: minimum clearance, plus a 12px rotation allowance.
- `--plate-size`: responsive image width.
- `--plate-top`, `--plate-bottom`: vertical anchor (centered desktop, lower mobile).
- `--bob-amount`, `--bob-duration`: independent idle float (±16px / 7s desktop).
- `--entrance-duration`, `--entrance-offset`, `--entrance-scale`: entrance only.

Controls in the JavaScript `FOOD_MOTION` object:
- `cycles`: number of right–left–right cycles over the full scroll range (1).
- `responseMs`: smoothing time constant (55ms). Lower follows scroll more closely;
  higher softens input but adds delay. This is a lightweight follower, not a spring.
- `maxRotation`: movement tilt limit (2 degrees).
- `rotationGain`: how readily horizontal motion causes tilt (0.04).

Page height and image/viewport dimensions are cached by ResizeObserver. Scroll
handlers only update a numeric target and request an animation frame. The frame
loop writes one transform and stops at rest. A short-lived MutationObserver waits
for splash removal and then disconnects. Reduced motion keeps the plate centered
and disables horizontal movement and bobbing. `destroy()` releases all resources.

The five temporary sections remain visually unchanged. Their alternating layout
uses CSS only. Remove them and `assets/temporary-scroll-test.css` when building the
real website; no section metadata is required by the floating plate.
