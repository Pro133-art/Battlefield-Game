import { TEAM_ENEMY, TEAM_PLAYER, UNIT_TYPES } from "./units.js";

export function createRenderer(canvas) {
  const context = canvas.getContext("2d");

  function render(game, uiState) {
    drawBackground(context, canvas.width, canvas.height);
    drawTerrain(context, game);
    drawBases(context, game);
    drawUnits(context, game, uiState.selectedUnitId);
    drawProjectiles(context, game);
    drawOverlay(context, game, uiState);
  }

  return { render };
}

function drawBackground(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#101c32");
  gradient.addColorStop(1, "#08101c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawTerrain(context, game) {
  context.save();
  context.globalAlpha = 0.35;
  for (let y = 40; y < game.arenaHeight; y += 56) {
    for (let x = 40; x < game.arenaWidth; x += 72) {
      context.fillStyle = (x + y) % 2 === 0 ? "#274560" : "#1a3046";
      context.beginPath();
      context.arc(x, y, 18 + ((x + y) % 7), 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawBases(context, game) {
  drawBase(context, game.playerBase, "#69e7b7", "Player Base");
  drawBase(context, game.enemyBase, "#ff7272", "Enemy Base");

  drawHealthBar(context, game.playerBase.x, game.playerBase.y - 18, game.playerBase.width, game.playerBase.health / game.playerBase.maxHealth, "#69e7b7");
  drawHealthBar(context, game.enemyBase.x, game.enemyBase.y - 18, game.enemyBase.width, game.enemyBase.health / game.enemyBase.maxHealth, "#ff7272");
}

function drawBase(context, base, color, label) {
  context.save();
  context.fillStyle = "rgba(255,255,255,0.06)";
  context.fillRect(base.x - 10, base.y - 10, base.width + 20, base.height + 20);

  context.strokeStyle = color;
  context.lineWidth = 3;
  context.strokeRect(base.x, base.y, base.width, base.height);

  context.fillStyle = color;
  context.globalAlpha = 0.18;
  context.fillRect(base.x, base.y, base.width, base.height);
  context.globalAlpha = 1;
  context.fillStyle = "#eef3ff";
  context.font = "700 16px Inter, sans-serif";
  context.fillText(label, base.x - 2, base.y - 16);
  context.restore();
}

function drawUnits(context, game, selectedUnitId) {
  for (const unit of game.units) {
    const stats = UNIT_TYPES[unit.type];
    const isSelected = unit.id === selectedUnitId;
    const glow = unit.team === TEAM_PLAYER ? "rgba(105,231,183,0.2)" : "rgba(255,114,114,0.18)";

    context.save();
    context.translate(unit.x, unit.y);
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, unit.radius + 10, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = stats.color;
    context.beginPath();
    context.arc(0, 0, unit.radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = isSelected ? "#ffffff" : "rgba(255,255,255,0.16)";
    context.lineWidth = isSelected ? 3 : 1;
    context.stroke();

    context.fillStyle = "#08101c";
    context.beginPath();
    context.arc(0, 0, unit.radius * 0.33, 0, Math.PI * 2);
    context.fill();

    context.restore();

    drawHealthBar(context, unit.x - 14, unit.y - unit.radius - 16, 28, unit.health / unit.maxHealth, unit.team === TEAM_PLAYER ? "#69e7b7" : "#ff7272");
    context.save();
    context.fillStyle = isSelected ? "#ffffff" : "#dbe5ff";
    context.font = "600 12px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText(stats.label, unit.x, unit.y + unit.radius + 18);
    context.restore();
  }
}

function drawProjectiles(context, game) {
  context.save();
  for (const projectile of game.projectiles) {
    context.fillStyle = projectile.team === TEAM_PLAYER ? "#9de1ff" : "#ffb0b0";
    context.beginPath();
    context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawOverlay(context, game, uiState) {
  if (uiState.dragState.isDown && uiState.dragState.hasDragged) {
    context.save();
    context.strokeStyle = "rgba(105,166,255,0.9)";
    context.setLineDash([6, 6]);
    context.strokeRect(
      Math.min(uiState.dragState.startX, uiState.dragState.currentX),
      Math.min(uiState.dragState.startY, uiState.dragState.currentY),
      Math.abs(uiState.dragState.currentX - uiState.dragState.startX),
      Math.abs(uiState.dragState.currentY - uiState.dragState.startY),
    );
    context.restore();
  }

  if (game.paused || game.gameOver) {
    context.save();
    context.fillStyle = "rgba(0,0,0,0.35)";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "800 52px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText(game.paused ? "Paused" : game.winner === "player" ? "Victory" : "Defeat", context.canvas.width / 2, context.canvas.height / 2);
    context.restore();
  }
}

function drawHealthBar(context, x, y, width, ratio, color) {
  context.save();
  context.fillStyle = "rgba(0,0,0,0.45)";
  context.fillRect(x, y, width, 6);
  context.fillStyle = color;
  context.fillRect(x, y, Math.max(0, width * Math.max(0, ratio)), 6);
  context.restore();
}
