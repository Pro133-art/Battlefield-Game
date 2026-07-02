import { createGame, resetGame, togglePause, updateGame } from "./game.js";
import { updateAI } from "./ai.js";
import { setupInput } from "./input.js";
import { createRenderer } from "./render.js";
import { createCamera, setCameraViewport, updateCamera } from "./camera.js";
import { createUI } from "./ui.js";

const canvas = document.getElementById("gameCanvas");
const game = createGame();
const renderer = createRenderer(canvas);
const ui = createUI();
const camera = createCamera(canvas);
const input = setupInput(canvas, game, ui, camera);

function syncCanvasSize() {
  const width = Math.max(1, Math.round(canvas.clientWidth));
  const height = Math.max(1, Math.round(canvas.clientHeight));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  setCameraViewport(camera, canvas.width, canvas.height);
}

syncCanvasSize();

if (typeof ResizeObserver !== "undefined") {
  const resizeObserver = new ResizeObserver(() => {
    syncCanvasSize();
  });

  resizeObserver.observe(canvas);
} else {
  window.addEventListener("resize", syncCanvasSize);
}

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

  updateCamera(camera, input.getCameraState(), deltaTime);
  updateAI(game, deltaTime);
  updateGame(game, deltaTime);
  ui.update(game, deltaTime);
  renderer.render(game, {
    selectedUnitId: game.selectedUnitId,
    dragState: input.getDragState(),
    camera,
  });

  requestAnimationFrame(frame);
}

ui.setPausedLabel(game.paused);
requestAnimationFrame(frame);
