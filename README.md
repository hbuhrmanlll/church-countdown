# Kairos Countdown

A free, animated countdown timer for churches. Pick a time, add your own words anywhere on the screen, choose a moving background, and share it as a link. Open the link on the church screen and press **F** for full screen.

**Use it:** https://hbuhrmanlll.github.io/church-countdown/

## What it does

- **Three kinds of countdowns:** every week (like Sunday at 10:30), one date (like Christmas Eve), or a set length (like a 10 minute break).
- **Your words, anywhere.** Add up to 12 pieces of text. Drag them on the preview. Pick from 10 fonts, any color, any size. Set each one to show while counting, at zero, or always.
- **Numbers only** if you want. Remove all words, or hide the numbers and keep the words.
- **18 background animations.**
  - **Epic:** lightspeed, arena lights, glory rays, glory clouds, light tunnel, heartbeat, galaxy, and fireworks. Big, bold motion made for the room and the livestream.
  - **Calm and classic:** soft glow, candlelight, snowfall, still waters, morning light, northern lights, rising embers, night sky, stained glass, and halo rings.
  - Pick colors, speed, and how much is going on.
- **Build up to zero.** In the final minute the background speeds up and brightens, then a soft burst of light fills the screen at zero (one slow fade, never a strobe).
- **The link is the save file.** All settings ride inside the link (after the `#`), so nothing is stored on a server and no account is needed.
- Made for projectors: text scales to any screen size, the screen stays awake, and the mouse hides itself.

## Keyboard (on the big screen)

| Key | Does |
| --- | --- |
| F | Full screen on or off |
| Space | Start or pause (set length timers) |
| R | Restart (set length timers) |
| Esc | Leave full screen |

## How it's built

Plain HTML, CSS, and JavaScript. No build step, no outside services, no tracking. Hosted on GitHub Pages straight from the `main` branch.

- `index.html` – the page
- `js/config.js` – settings, link encoding, and the checks that clean up anything read from a link
- `js/scenes.js` – the background animations (all drawn in code)
- `js/render.js` – draws the countdown screen
- `js/editor.js`, `js/ui.js` – the editor
- `js/templates.js` – starting points

To run it on your own computer, serve the folder with any static web server (for example `python -m http.server`) and open `http://localhost:8000`.

## Credits and licenses

Made by Third Heaven Studios. Code: MIT License (see `LICENSE`).

Fonts (all SIL Open Font License 1.1, files from Fontsource): Outfit, Montserrat, Space Grotesk, Oswald, Bebas Neue, Fraunces, Playfair Display, Cormorant Garamond, DM Serif Display, Great Vibes, Figtree. License texts are in `fonts/licenses/`.

All animations, the chime sound, and the icon are original and made in code for this project.
