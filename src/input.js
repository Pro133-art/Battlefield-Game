import { commandAttack, commandAttackBase, commandMove, getSelectedUnit, setSelectedUnit, spawnUnit } from "./game.js";
import { screenToTile } from "./map.js";
import { TEAM_PLAYER } from "./units.js";
import { screenToWorldPoint, zoomCamera } from "./camera.js";

export function setupInput(canvas, game, ui, camera) {
  const pointerState = {
    isDown: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    worldStartX: 0,
    worldStartY: 0,
    worldCurrentX: 0,
    worldCurrentY: 0,
    mouseX: 0,
    mouseY: 0,
    mouseInsideCanvas: false,
    hasDragged: false,
  };

  const cameraState = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseInsideCanvas: false,
  };

  function updatePointerState(event) {
    const screenPoint = toCanvasPoint(canvas, event);
    const worldPoint = screenToWorldPoint(camera, screenPoint.x, screenPoint.y);

    pointerState.mouseX = screenPoint.x;
    pointerState.mouseY = screenPoint.y;
    pointerState.mouseInsideCanvas = isPointInsideCanvas(canvas, event.clientX, event.clientY);
    cameraState.mouseX = screenPoint.x;
    cameraState.mouseY = screenPoint.y;
    cameraState.mouseInsideCanvas = pointerState.mouseInsideCanvas;

    return { screenPoint, worldPoint };
  }

  canvas.addEventListener("pointerdown", (event) => {
    const { screenPoint, worldPoint } = updatePointerState(event);
    pointerState.isDown = true;
    pointerState.startX = screenPoint.x;
    pointerState.startY = screenPoint.y;
    pointerState.currentX = screenPoint.x;
    pointerState.currentY = screenPoint.y;
    pointerState.worldStartX = worldPoint.x;
    pointerState.worldStartY = worldPoint.y;
    pointerState.worldCurrentX = worldPoint.x;
    pointerState.worldCurrentY = worldPoint.y;
    pointerState.hasDragged = false;

    const hitUnit = hitTestUnit(game, worldPoint.x, worldPoint.y);
    if (hitUnit && hitUnit.team === TEAM_PLAYER) {
      setSelectedUnit(game, hitUnit.id);
      ui.flashMessage(`Selected ${hitUnit.type}.`);
      return;
    }

    const selected = getSelectedUnit(game);
    if (!selected) {
      setSelectedUnit(game, null);
      return;
    }

    if (hitUnit && hitUnit.team !== TEAM_PLAYER) {
      commandAttack(game, selected.id, hitUnit.id);
      ui.flashMessage(`Attack order: ${hitUnit.type}.`);
      return;
    }

    if (isPointInsideBase(worldPoint.x, worldPoint.y, game.enemyBase)) {
      commandAttackBase(game, selected.id, TEAM_PLAYER);
      ui.flashMessage("Targeting the enemy base.");
      return;
    }

    const tile = screenToTile(worldPoint.x, worldPoint.y);
    commandMove(game, selected.id, tile.x, tile.y);
    ui.flashMessage("Move order issued.");
  });

  canvas.addEventListener("pointermove", (event) => {
    const { screenPoint, worldPoint } = updatePointerState(event);

    if (!pointerState.isDown) {
      return;
    }

    pointerState.currentX = screenPoint.x;
    pointerState.currentY = screenPoint.y;
    pointerState.worldCurrentX = worldPoint.x;
    pointerState.worldCurrentY = worldPoint.y;
    pointerState.hasDragged = Math.hypot(screenPoint.x - pointerState.startX, screenPoint.y - pointerState.startY) > 12;
  });

  canvas.addEventListener("pointerup", () => {
    pointerState.isDown = false;
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomCamera(camera, event.deltaY);
  }, { passive: false });

  window.addEventListener("mousemove", (event) => {
    const { screenPoint } = updatePointerState(event);
    cameraState.mouseX = screenPoint.x;
    cameraState.mouseY = screenPoint.y;
    cameraState.mouseInsideCanvas = pointerState.mouseInsideCanvas;
  });

  window.addEventListener("keydown", (event) => {
    if (isCameraKey(event.code)) {
      event.preventDefault();
      cameraState.keys.add(event.code);
    }

    if (event.code === "Digit1") {
      const success = spawnUnit(game, TEAM_PLAYER, "infantry");
      ui.flashMessage(success ? "Spawned infantry." : "Not enough gold for infantry.");
    }

    if (event.code === "Digit2") {
      const success = spawnUnit(game, TEAM_PLAYER, "ranger");
      ui.flashMessage(success ? "Spawned ranger." : "Not enough gold for ranger.");
    }

    if (event.code === "Space") {
      event.preventDefault();
      const selected = getSelectedUnit(game);
      if (selected) {
        commandAttackBase(game, selected.id, TEAM_PLAYER);
        ui.flashMessage("Selected unit is marching on the enemy base.");
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    cameraState.keys.delete(event.code);
  });

  return {
    getDragState() {
      return pointerState;
    },

    getCameraState() {
      return cameraState;
    },
  };
}

function hitTestUnit(game, x, y) {
  for (let index = game.units.length - 1; index >= 0; index -= 1) {
    const unit = game.units[index];
    const distance = Math.hypot(unit.x - x, unit.y - y);
    if (distance <= unit.radius + 6) {
      return unit;
    }
  }

  return null;
}

function isPointInsideBase(x, y, base) {
  const centerX = base.x + base.width / 2;
  const centerY = base.y + base.height / 2;
  return Math.hypot(centerX - x, centerY - y) <= 34;
}

function toCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function isPointInsideCanvas(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function isCameraKey(code) {
  return code === "KeyW" || code === "KeyA" || code === "KeyS" || code === "KeyD" || code === "ArrowUp" || code === "ArrowLeft" || code === "ArrowDown" || code === "ArrowRight";
}
