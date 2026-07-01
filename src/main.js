import { createGame, resetGame, togglePause, updateGame } from "./game.js";
import { updateAI } from "./ai.js";
import { setupInput } from "./input.js";
import { createRenderer } from "./render.js";
import { createUI } from "./ui.js";

const canvas = document.getElementById("gameCanvas");
const game = createGame();
const renderer = createRenderer(canvas);
const ui = createUI();
const input = setupInput(canvas, game, ui);

ui.bindControls({
  onRestart: () => {
    resetGame(game);
    ui.flashMessage("Battle restarted.");
    ui.setPausedLabel(game.paused);
  },
  onPause: () => {
    const paused = togglePause(game);
    ui.setPausedLabel(paused);
    ui.flashMessage(paused ? "Game paused." : "Game resumed.");
  },
});

let lastFrame = performance.now();

function frame(now) {
  const deltaTime = Math.min(0.033, (now - lastFrame) / 1000);
  lastFrame = now;

  updateAI(game, deltaTime);
  updateGame(game, deltaTime);
  ui.update(game, deltaTime);
  renderer.render(game, {
    selectedUnitId: game.selectedUnitId,
    dragState: input.getDragState(),
  });

  requestAnimationFrame(frame);
}

ui.setPausedLabel(game.paused);
requestAnimationFrame(frame);
