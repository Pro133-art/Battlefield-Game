import { createGame, resetGame, spawnUnit, togglePause, updateGame } from "./game.js";
import { updateAI } from "./ai.js";
import { setupInput } from "./input.js";
import { createRenderer } from "./render.js";
import { createCamera, setCameraViewport, screenToWorldPoint, updateCamera } from "./camera.js";
import { createUI } from "./ui.js";
import { TEAM_PLAYER } from "./units.js";
import { isTileInBounds, screenToTile } from "./map.js";
import { spawnUnitAt } from "./game.js";

const canvas = document.getElementById("gameCanvas");
const game = createGame();
const renderer = createRenderer(canvas);
const ui = createUI();
const camera = createCamera(canvas);
const input = setupInput(canvas, game, ui, camera);

const deploymentMap = {
  riflemen: {
    label: "Riflemen",
    unitType: "infantry",
    successMessage: "Riflemen deployed.",
    failureMessage: "Not enough gold for riflemen.",
  },
  troopers: {
    label: "Battlefield Troopers",
    unitType: "brute",
    successMessage: "Battlefield Troopers deployed.",
    failureMessage: "Not enough gold for Battlefield Troopers.",
  },
  commandos: {
    label: "Commandos",
    unitType: "ranger",
    successMessage: "Commandos deployed.",
    failureMessage: "Not enough gold for commandos.",
  },
  medics: {
    label: "Medics",
    unitType: "medic",
    successMessage: "Medics deployed.",
    failureMessage: "Not enough gold for medics.",
  },
  tanks: {
    label: "Tanks",
    unitType: "tank",
    successMessage: "Tanks deployed.",
    failureMessage: "Not enough gold for tanks.",
  },
};

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
  onDeploy: (deployKey) => {
    const deployment = deploymentMap[deployKey];
    if (!deployment) {
      return { success: false, message: "That deployment is not available yet." };
    }

    const success = spawnUnit(game, TEAM_PLAYER, deployment.unitType);
    if (success) {
      ui.markDeploymentReady(deployKey);
    }

    return {
      success,
      message: success ? deployment.successMessage : deployment.failureMessage,
    };
  },
  onDropDeploy: (deployKey, clientX, clientY) => {
    const deployment = deploymentMap[deployKey];
    if (!deployment) {
      return { success: false, message: "That deployment is not available yet." };
    }

    const rect = canvas.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;

    if (relativeX < 0 || relativeY < 0 || relativeX > rect.width || relativeY > rect.height) {
      return { success: false, message: "Drop the unit onto the battlefield." };
    }

    const worldPoint = screenToWorldPoint(camera, relativeX * canvas.width / rect.width, relativeY * canvas.height / rect.height);
    const tile = screenToTile(worldPoint.x, worldPoint.y);

    if (!tile || !isTileInBounds(tile.x, tile.y)) {
      return { success: false, message: "Drop the unit onto the battlefield." };
    }

    const gameResult = spawnUnitAt(game, TEAM_PLAYER, deployment.unitType, tile.x, tile.y);
    if (gameResult?.success) {
      ui.markDeploymentReady(deployKey);
    }

    return {
      success: gameResult?.success ?? false,
      message: gameResult?.success
        ? deployment.successMessage
        : gameResult?.reason === "zone"
          ? "Units can only deploy in your side of the battlefield."
          : gameResult?.reason === "occupied"
            ? "That tile is already occupied."
            : deployment.failureMessage,
    };
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
