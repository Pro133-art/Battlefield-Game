import { MAP_COLS, MAP_ROWS, TILE_HEIGHT, TILE_WIDTH, tileToScreen } from "./map.js";
import { TEAM_PLAYER, UNIT_TYPES } from "./units.js";

export function createRenderer(canvas) {
  const context = canvas.getContext("2d");

  function render(game, uiState) {
    drawBackground(context, canvas.width, canvas.height);
    drawTerrain(context, game);
    drawGrid(context);
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
  const splitRow = game.deploymentSplitRow;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let tileY = 0; tileY < MAP_ROWS; tileY += 1) {
    for (let tileX = 0; tileX < MAP_COLS; tileX += 1) {
      const center = tileToScreen(tileX, tileY);
      minX = Math.min(minX, center.x - TILE_WIDTH / 2);
      maxX = Math.max(maxX, center.x + TILE_WIDTH / 2);
      minY = Math.min(minY, center.y - TILE_HEIGHT / 2);
      maxY = Math.max(maxY, center.y + TILE_HEIGHT / 2);

      let fill = tileY >= splitRow ? "#275f82" : "#7a3434";
      if ((tileX + tileY) % 2 === 0) {
        fill = tileY >= splitRow ? "#2f6d95" : "#8a3f3f";
      }

      if (tileY === splitRow || tileY === splitRow - 1) {
        fill = "#c39d3d";
      }

      drawDiamond(context, center.x, center.y, fill, "rgba(8, 10, 14, 0.8)");
    }
  }

  context.save();
  context.strokeStyle = "#ffe38a";
  context.lineWidth = 4;
  const lineStart = tileToScreen(0, splitRow);
  const lineEnd = tileToScreen(MAP_COLS - 1, splitRow);
  context.beginPath();
  context.moveTo(lineStart.x, lineStart.y);
  context.lineTo(lineEnd.x, lineEnd.y);
  context.stroke();

  context.fillStyle = "#fff5cf";
  context.font = "700 14px Inter, sans-serif";
  context.fillText("DEPLOYMENT LINE", lineStart.x + 14, lineStart.y - 10);

  context.strokeStyle = "rgba(255,255,255,0.85)";
  context.lineWidth = 2;
  context.strokeRect(minX - 10, minY - 10, maxX - minX + 20, maxY - minY + 20);

  context.fillStyle = "rgba(12, 20, 34, 0.78)";
  context.fillRect(minX + 8, maxY - 64, 170, 24);
  context.fillRect(maxX - 178, minY + 14, 170, 24);
  context.fillStyle = "#dff0ff";
  context.font = "600 13px Inter, sans-serif";
  context.fillText("PLAYER DEPLOYMENT", minX + 14, maxY - 48);
  context.fillText("AI DEPLOYMENT", maxX - 166, minY + 31);
  context.restore();
}

function drawGrid(context) {
  context.save();
  context.strokeStyle = "rgba(255,255,255,0.14)";
  context.lineWidth = 1;

  for (let tileY = 0; tileY < MAP_ROWS; tileY += 1) {
    for (let tileX = 0; tileX < MAP_COLS; tileX += 1) {
      const center = tileToScreen(tileX, tileY);
      context.beginPath();
      context.moveTo(center.x, center.y - TILE_HEIGHT / 2);
      context.lineTo(center.x + TILE_WIDTH / 2, center.y);
      context.lineTo(center.x, center.y + TILE_HEIGHT / 2);
      context.lineTo(center.x - TILE_WIDTH / 2, center.y);
      context.closePath();
      context.stroke();
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
  const center = tileToScreen(base.tileX, base.tileY);
  context.save();
  context.fillStyle = "rgba(255,255,255,0.08)";
  context.beginPath();
  context.arc(center.x, center.y - 10, 28, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.fillStyle = color;
  context.globalAlpha = 0.28;
  context.moveTo(center.x, center.y - 38);
  context.lineTo(center.x + 30, center.y - 6);
  context.lineTo(center.x, center.y + 24);
  context.lineTo(center.x - 30, center.y - 6);
  context.closePath();
  context.fill();

  context.globalAlpha = 1;
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = "#eef3ff";
  context.font = "700 16px Inter, sans-serif";
  context.fillText(label, center.x - 42, center.y - 46);
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

    drawHealthBar(context, unit.x - 14, unit.y - unit.radius - 18, 28, unit.health / unit.maxHealth, unit.team === TEAM_PLAYER ? "#69e7b7" : "#ff7272");
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

function drawDiamond(context, centerX, centerY, fillStyle, strokeStyle) {
  context.save();
  context.beginPath();
  context.moveTo(centerX, centerY - TILE_HEIGHT / 2);
  context.lineTo(centerX + TILE_WIDTH / 2, centerY);
  context.lineTo(centerX, centerY + TILE_HEIGHT / 2);
  context.lineTo(centerX - TILE_WIDTH / 2, centerY);
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
  context.strokeStyle = strokeStyle;
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

function drawHealthBar(context, x, y, width, ratio, color) {
  context.save();
  context.fillStyle = "rgba(0,0,0,0.45)";
  context.fillRect(x, y, width, 6);
  context.fillStyle = color;
  context.fillRect(x, y, Math.max(0, width * Math.max(0, ratio)), 6);
  context.restore();
}
