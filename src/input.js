import { commandAttack, commandAttackBase, commandMove, getSelectedUnit, setSelectedUnit, spawnUnit } from "./game.js";
import { screenToTile } from "./map.js";
import { TEAM_PLAYER } from "./units.js";

export function setupInput(canvas, game, ui) {
  const pointerState = {
    isDown: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    hasDragged: false,
  };

  canvas.addEventListener("pointerdown", (event) => {
    const point = toWorldPoint(canvas, event);
    pointerState.isDown = true;
    pointerState.startX = point.x;
    pointerState.startY = point.y;
    pointerState.currentX = point.x;
    pointerState.currentY = point.y;
    pointerState.hasDragged = false;

    const hitUnit = hitTestUnit(game, point.x, point.y);
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

    if (isPointInsideBase(point.x, point.y, game.enemyBase)) {
      commandAttackBase(game, selected.id, TEAM_PLAYER);
      ui.flashMessage("Targeting the enemy base.");
      return;
    }

    const tile = screenToTile(point.x, point.y);
    commandMove(game, selected.id, tile.x, tile.y);
    ui.flashMessage("Move order issued.");
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointerState.isDown) {
      return;
    }

    const point = toWorldPoint(canvas, event);
    pointerState.currentX = point.x;
    pointerState.currentY = point.y;
    pointerState.hasDragged = Math.hypot(point.x - pointerState.startX, point.y - pointerState.startY) > 12;
  });

  canvas.addEventListener("pointerup", () => {
    pointerState.isDown = false;
  });

  window.addEventListener("keydown", (event) => {
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

  return {
    getDragState() {
      return pointerState;
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

function toWorldPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}
