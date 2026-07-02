import { MAP_COLS, MAP_ROWS, TILE_HEIGHT, TILE_WIDTH, tileToScreen } from "./map.js";
import { TEAM_PLAYER, UNIT_TYPES } from "./units.js";
import { applyCameraTransform } from "./camera.js";

export function createRenderer(canvas) {
  const context = canvas.getContext("2d");

  function render(game, uiState) {
    drawBackground(context, canvas.width, canvas.height);
    context.save();
    applyCameraTransform(context, uiState.camera);
    drawTerrain(context, game);
    drawBases(context, game);
    drawUnits(context, game, uiState.selectedUnitId);
    drawProjectiles(context, game);
    context.restore();
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

      const terrain = getTerrainStyle(tileX, tileY, splitRow);
      drawDiamond(context, center.x, center.y, terrain.base, "rgba(15, 20, 14, 0.9)");

      if (terrain.scar) {
        drawScars(context, center.x, center.y, terrain.scar);
      }

      if (terrain.mud) {
        drawMudPatch(context, center.x, center.y, terrain.mud);
      }

      if (terrain.crater) {
        drawCrater(context, center.x, center.y, terrain.crater);
      }

      if (terrain.debris) {
        drawDebris(context, center.x, center.y, terrain.debris);
      }
    }
  }

  context.save();
  context.strokeStyle = "rgba(255, 220, 128, 0.45)";
  context.lineWidth = 4;
  const lineStart = tileToScreen(0, splitRow);
  const lineEnd = tileToScreen(MAP_COLS - 1, splitRow);
  context.beginPath();
  context.moveTo(lineStart.x, lineStart.y);
  context.lineTo(lineEnd.x, lineEnd.y);
  context.stroke();

  context.fillStyle = "#f6efc6";
  context.font = "700 14px Inter, sans-serif";
  context.fillText("DEPLOYMENT LINE", lineStart.x + 14, lineStart.y - 10);

  context.strokeStyle = "rgba(232, 255, 214, 0.32)";
  context.lineWidth = 2;
  context.strokeRect(minX - 10, minY - 10, maxX - minX + 20, maxY - minY + 20);

  context.fillStyle = "rgba(18, 24, 16, 0.78)";
  context.fillRect(minX + 8, maxY - 64, 170, 24);
  context.fillRect(maxX - 178, minY + 14, 170, 24);
  context.fillStyle = "#e4f1d7";
  context.font = "600 13px Inter, sans-serif";
  context.fillText("PLAYER DEPLOYMENT", minX + 14, maxY - 48);
  context.fillText("AI DEPLOYMENT", maxX - 166, minY + 31);
  context.restore();
}

function getTerrainStyle(tileX, tileY, splitRow) {
  const baseGreen = tileY >= splitRow ? "#35602f" : "#436838";
  const altGreen = tileY >= splitRow ? "#4b7436" : "#5b8045";
  const mudChance = terrainNoise(tileX, tileY, 17);
  const damageChance = terrainNoise(tileX, tileY, 29);
  const debrisChance = terrainNoise(tileX, tileY, 43);
  const scarChance = terrainNoise(tileX, tileY, 59);

  let base = (tileX + tileY) % 2 === 0 ? baseGreen : altGreen;
  if (tileY === splitRow || tileY === splitRow - 1) {
    base = "#4f5a24";
  }

  if (mudChance > 0.68) {
    base = mixColors(base, "#6c5638", 0.52);
  }

  const scar = Math.abs(tileY - splitRow) <= 2 && scarChance > 0.38 ? {
    color: scarChance > 0.7 ? "rgba(26, 22, 16, 0.76)" : "rgba(66, 58, 40, 0.56)",
    width: 1.2 + terrainNoise(tileX, tileY, 67) * 2.4,
    length: 5 + terrainNoise(tileX, tileY, 71) * 9,
    angle: (terrainNoise(tileX, tileY, 83) - 0.5) * 1.4,
  } : null;

  const mud = mudChance > 0.52 ? {
    color: mudChance > 0.8 ? "rgba(72, 49, 29, 0.82)" : "rgba(98, 71, 42, 0.7)",
    scale: 0.72 + (terrainNoise(tileX, tileY, 61) * 0.26),
    offsetX: (terrainNoise(tileX, tileY, 73) - 0.5) * 4,
    offsetY: (terrainNoise(tileX, tileY, 79) - 0.5) * 3,
  } : null;

  const crater = damageChance > 0.77 ? {
    color: damageChance > 0.88 ? "rgba(28, 24, 18, 0.82)" : "rgba(52, 43, 29, 0.66)",
    radius: 3.8 + terrainNoise(tileX, tileY, 97) * 5.8,
  } : null;

  const debris = debrisChance > 0.74 ? {
    color: debrisChance > 0.86 ? "rgba(201, 173, 126, 0.72)" : "rgba(84, 72, 49, 0.62)",
    spread: 3 + terrainNoise(tileX, tileY, 113) * 5,
  } : null;

  return { base, mud, crater, debris, scar };
}

function terrainNoise(tileX, tileY, salt) {
  const value = Math.sin((tileX + salt) * 12.9898 + (tileY - salt) * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function mixColors(colorA, colorB, ratio) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const mix = (start, end) => Math.round(start + (end - start) * ratio);
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}

function hexToRgb(color) {
  const normalized = color.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function drawMudPatch(context, centerX, centerY, mud) {
  context.save();
  context.translate(centerX + mud.offsetX, centerY + mud.offsetY);
  context.scale(mud.scale, mud.scale * 0.8);
  context.fillStyle = mud.color;
  context.beginPath();
  context.ellipse(0, 0, 12, 7, terrainNoise(centerX, centerY, 19) * Math.PI, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawScars(context, centerX, centerY, scar) {
  context.save();
  context.translate(centerX, centerY + 1);
  context.rotate(scar.angle);
  context.strokeStyle = scar.color;
  context.lineWidth = scar.width;
  context.beginPath();
  context.moveTo(-scar.length, -1);
  context.lineTo(scar.length, 1);
  context.stroke();
  context.restore();
}

function drawCrater(context, centerX, centerY, crater) {
  context.save();
  context.fillStyle = crater.color;
  context.beginPath();
  context.arc(centerX, centerY + 1, crater.radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(15, 12, 8, 0.65)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(centerX - crater.radius * 0.7, centerY - crater.radius * 0.2);
  context.lineTo(centerX + crater.radius * 0.8, centerY + crater.radius * 0.3);
  context.moveTo(centerX - crater.radius * 0.2, centerY - crater.radius * 0.65);
  context.lineTo(centerX + crater.radius * 0.15, centerY + crater.radius * 0.72);
  context.stroke();
  context.restore();
}

function drawDebris(context, centerX, centerY, debris) {
  context.save();
  context.strokeStyle = debris.color;
  context.lineWidth = 1.2;
  context.beginPath();
  for (let index = 0; index < 3; index += 1) {
    const angle = terrainNoise(centerX, centerY, 151 + index * 7) * Math.PI * 2;
    const length = debris.spread + index * 1.4;
    const startX = centerX + Math.cos(angle) * 2;
    const startY = centerY + Math.sin(angle) * 1;
    context.moveTo(startX, startY);
    context.lineTo(startX + Math.cos(angle + 0.55) * length, startY + Math.sin(angle + 0.55) * length * 0.55);
  }
  context.stroke();
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
