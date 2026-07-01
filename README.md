# Battlefield Game

A browser-based 2D strategy game built with HTML, CSS, and JavaScript. It runs as a static site, so it is compatible with GitHub Pages.

## Project Structure

- `index.html` boots the app and hosts the canvas and HUD.
- `styles.css` handles the page layout and presentation.
- `src/main.js` starts the game loop.
- `src/game.js` owns the core game state and simulation.
- `src/units.js` defines entities and shared unit stats.
- `src/ai.js` controls the enemy faction.
- `src/input.js` handles mouse and keyboard input.
- `src/render.js` draws the battlefield on the canvas.
- `src/ui.js` updates the status panels and controls.

## Controls

- Click a blue unit to select it.
- Click the ground to move the selected unit.
- Click an enemy unit to attack it.
- Press `1` to spawn infantry.
- Press `2` to spawn a ranger.
- Press `Space` to send the selected unit toward the enemy base.
- Use `Pause` and `Restart` from the top bar.

## Local Run

Because the game uses ES modules, open it through a local web server instead of loading `index.html` directly from disk.

Example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## GitHub Pages

Publish the repository root as a GitHub Pages site. The app uses relative asset paths, so no build step is required.
