# Mumbai Island Taxi Sim 3D - Architecture & AI Editing Guide

This game is modularized into focused, single-responsibility files without build tools or bundlers. It runs directly in any browser by opening `index.html`.

---

## 📁 File Structure & AI Edit Routing

| File | Primary Responsibility | When an AI Should Edit This File |
| :--- | :--- | :--- |
| **[`index.html`](file:///home/alok/html_games/index.html)** | DOM markup, HUD overlay, script imports | Adding new HUD elements, modals, buttons, or meta tags. |
| **[`style.css`](file:///home/alok/html_games/style.css)** | Visual design & glassmorphism CSS | Modifying HUD fonts, colors, borders, or glass blur effects. |
| **[`js/config.js`](file:///home/alok/html_games/js/config.js)** | Constants & shared global state | Adjusting world grid size, map boundaries, starting cash/fuel. |
| **[`js/audio.js`](file:///home/alok/html_games/js/audio.js)** | Procedural Web Audio synth & SFX | Editing engine revving sound, crash audio, horn, nitro whoosh, or radio music. |
| **[`js/textures.js`](file:///home/alok/html_games/js/textures.js)** | Procedural 2D canvas texture generators | Customizing taxi livery, decals, building window patterns, or cubemap reflections. |
| **[`js/vehicles.js`](file:///home/alok/html_games/js/vehicles.js)** | 3D models for cars and humans | Changing car body shape, fastback silhouette, wheels, spoilers, or character limbs. |
| **[`js/world.js`](file:///home/alok/html_games/js/world.js)** | 3D city scene, roads, buildings, collisions | Adding new island landmarks, changing roads, bridges, highway, or building heights. |
| **[`js/minimap.js`](file:///home/alok/html_games/js/minimap.js)** | Circular radar HUD & Full Island GPS Map | Modifying radar zoom/scale, full map rendering, blip colors, compass icons, or edge-clamping logic. |
| **[`js/controls.js`](file:///home/alok/html_games/js/controls.js)** | Keyboard, mouse, touch & car entry/exit | Adding gamepad support, changing key bindings, or adjusting mouse sensitivity. |
| **[`js/game.js`](file:///home/alok/html_games/js/game.js)** | Main simulation loop, physics & missions | Tweaking acceleration/nitro speed, passenger dropoff payouts, or day/night speed. |

---

## 🚀 Running the Game
Simply open `index.html` in Chrome, Firefox, Safari, or Edge. No node_modules, build scripts, or servers required.

