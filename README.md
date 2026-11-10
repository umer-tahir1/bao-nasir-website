# Bao Nasir opening animation

This folder had no existing app/framework. This implementation uses plain HTML,
CSS and a reusable JavaScript class with no dependencies. The only content below
the animation is an empty, warm-dark `.website-content` element.

Run `python3 -m http.server 8000` from this folder and open
`http://localhost:8000`. Reload to replay the opening.

## Opening image

`public/bao-opening.jpg` is the web-optimized version of the supplied `image.png`.
To use another supplied image, place it in `public/` and update **both** the
preload `href` and the image `src` in `index.html`. Keep its actual file format.
`object-fit: cover` fills each viewport, so the visible framing varies with the
screen's aspect ratio; the source file itself is never cropped or edited.

The image is preloaded at high priority and included in the initial HTML. Its
short still hold begins after decoding, and a slow image load fails open so the
page never stays blocked behind the opening animation.

## Controls

| Setting | Location | Default |
| --- | --- | --- |
| Still hold | `HOLD_MS` in `assets/bao-opening.js` | `2000` milliseconds |
| Split duration / movement speed | `--split-duration` in `assets/bao-opening.css` | `1000ms` |
| Crack shape for both halves and light | `CRACK_POINTS` in `assets/bao-opening.js` | Shared percentage coordinates |
| Movement acceleration | `--exit-easing` in `assets/bao-opening.css` | `cubic-bezier(0.65, 0, 0.25, 1)` |
| Exit distance | `--exit-distance` in `assets/bao-opening.css` | `calc(65vw + 6vh)` |
| Rotations | `--left-rotation`, `--right-rotation` in `assets/bao-opening.css` | `-2deg`, `2deg` |
| Crack flash / shake | `bao-crack-light` / `bao-impact` animation declarations | `160ms` / `130ms` |

The first 10% of the split is a tiny separation; the remaining time is the exit.
Both full-viewport image layers use the same image, framing and crack boundary.
An intact top image hides clipping seams during the initial hold.

`BaoOpeningAnimation` owns its timers, listeners and DOM removal. Call
`destroy()` if a future router needs to dispose of it early. Completion unlocks
page scrolling and removes `inert` from the placeholder. A missing image also
releases the page. Reduced-motion preferences keep the hold and replace the
split with a short fade.
