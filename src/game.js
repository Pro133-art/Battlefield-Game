import { MAP_COLS, MAP_ROWS, getDeploymentSplitRow, isTileInBounds, screenToTile, tileDistance, tileToScreen } from "./map.js";
import { TEAM_ENEMY, TEAM_PLAYER, UNIT_TYPES, createUnit } from "./units.js";

const ARENA_WIDTH = 1280;
const ARENA_HEIGHT = 720;

function createInitialState() {
  const game = {
    arenaWidth: ARENA_WIDTH,
    arenaHeight: ARENA_HEIGHT,
    mapCols: MAP_COLS,
    mapRows: MAP_ROWS,
    deploymentSplitRow: getDeploymentSplitRow(),
    time: 0,
    paused: false,
    gameOver: false,
    winner: null,
    playerGold: 100,
    enemyGold: 100,
    playerIncomeTimer: 0,
    enemyIncomeTimer: 0,
    playerSpawnTimer: 0,
    enemySpawnTimer: 0,
    playerBase: createBaseState(TEAM_PLAYER, 24, 22),
    enemyBase: createBaseState(TEAM_ENEMY, 5, 7),
    units: [],
    projectiles: [],
    selectedUnitId: null,
    messages: ["Select a blue unit and issue a command."],
  };

  spawnInitialUnits(game);
  syncScreenPositions(game);
  return game;
}

export function createGame() {
  return createInitialState();
}

export function resetGame(game) {
  Object.assign(game, createInitialState());
  return game;
}

export function togglePause(game) {
  game.paused = !game.paused;
  return game.paused;
}

export function spawnUnit(game, team, type) {
  const stats = UNIT_TYPES[type];
  const goldKey = team === TEAM_PLAYER ? "playerGold" : "enemyGold";
  if (game[goldKey] < stats.cost) {
    return false;
  }

  const tile = findSpawnTile(game, team);
  if (!tile) {
    return false;
  }

  const unit = createUnit(type, team, tile.x, tile.y);
  setUnitScreenPosition(unit);
  game.units.push(unit);
  game[goldKey] -= stats.cost;
  return true;
}

export function commandMove(game, unitId, tileX, tileY) {
  const unit = findUnitById(game, unitId);
  if (!unit || !isTileInBounds(tileX, tileY)) {
    return;
  }

  unit.moveTargetTile = { x: tileX, y: tileY };
  unit.targetId = null;
}

export function commandAttack(game, unitId, targetId) {
  const unit = findUnitById(game, unitId);
  if (!unit) {
    return;
  }

  unit.targetId = targetId;
  unit.moveTargetTile = null;
}

export function commandAttackBase(game, unitId, team) {
  const unit = findUnitById(game, unitId);
  if (!unit) {
    return;
  }

  unit.targetId = team === TEAM_PLAYER ? "enemyBase" : "playerBase";
  unit.moveTargetTile = null;
}

export function setSelectedUnit(game, unitId) {
  game.selectedUnitId = unitId;
}

export function getSelectedUnit(game) {
  return findUnitById(game, game.selectedUnitId);
}

export function getUnitsForTeam(game, team) {
  return game.units.filter((unit) => unit.team === team);
}

export function getTargetById(game, targetId) {
  if (targetId === "playerBase") {
    return game.playerBase;
  }

  if (targetId === "enemyBase") {
    return game.enemyBase;
  }

  return findUnitById(game, targetId);
}

export function getTileAtScreen(game, screenX, screenY) {
  const tile = screenToTile(screenX, screenY);
  if (!isTileInBounds(tile.x, tile.y)) {
    return null;
  }

  return tile;
}

export function updateGame(game, deltaTime) {
  if (game.paused || game.gameOver) {
    return;
  }

  game.time += deltaTime;
  tickIncome(game, deltaTime);
  tickAutoSpawns(game, deltaTime);
  updateUnits(game, deltaTime);
  resolveCombat(game);
  cleanupDeadEntities(game);
  syncScreenPositions(game);
  resolveVictory(game);
}

function tickIncome(game, deltaTime) {
  game.playerIncomeTimer += deltaTime;
  game.enemyIncomeTimer += deltaTime;

  if (game.playerIncomeTimer >= 1.5) {
    game.playerGold += Math.floor(game.playerIncomeTimer / 1.5) * 20;
    game.playerIncomeTimer = 0;
  }

  if (game.enemyIncomeTimer >= 1.6) {
    game.enemyGold += Math.floor(game.enemyIncomeTimer / 1.6) * 18;
    game.enemyIncomeTimer = 0;
  }
}

function tickAutoSpawns(game, deltaTime) {
  game.playerSpawnTimer += deltaTime;
  game.enemySpawnTimer += deltaTime;

  if (game.playerSpawnTimer >= 7) {
    if (game.playerGold >= UNIT_TYPES.infantry.cost) {
      spawnUnit(game, TEAM_PLAYER, "infantry");
    }
    game.playerSpawnTimer = 0;
  }

  if (game.enemySpawnTimer >= 4.5) {
    const type = game.enemyGold >= UNIT_TYPES.ranger.cost && Math.random() > 0.5 ? "ranger" : "infantry";
    spawnUnit(game, TEAM_ENEMY, type);
    game.enemySpawnTimer = 0;
  }
}

function updateUnits(game, deltaTime) {
  const occupancy = buildOccupancyMap(game.units);

  for (const unit of game.units) {
    unit.attackTimer = Math.max(0, unit.attackTimer - deltaTime);
    unit.moveTimer += deltaTime;

    const stepInterval = unit.speed > 80 ? 0.2 : 0.3;
    if (unit.moveTimer < stepInterval) {
      continue;
    }

    unit.moveTimer = 0;

    if (unit.type === "ranger" && tryRangerShot(game, unit)) {
      continue;
    }

    const target = getTargetById(game, unit.targetId);
    if (target && inAttackRange(unit, target)) {
      continue;
    }

    if (target) {
      moveOneTileToward(unit, { x: target.tileX, y: target.tileY }, occupancy);
      continue;
    }

    if (unit.moveTargetTile) {
      if (unit.tileX === unit.moveTargetTile.x && unit.tileY === unit.moveTargetTile.y) {
        unit.moveTargetTile = null;
      } else {
        moveOneTileToward(unit, unit.moveTargetTile, occupancy);
      }
      continue;
    }

    const fallback = unit.team === TEAM_PLAYER ? game.enemyBase : game.playerBase;
    moveOneTileToward(unit, { x: fallback.tileX, y: fallback.tileY }, occupancy);
  }
}

function moveOneTileToward(unit, destinationTile, occupancy) {
  const currentKey = toTileKey(unit.tileX, unit.tileY);
  occupancy.delete(currentKey);

  const stepX = clampStep(destinationTile.x - unit.tileX);
  const stepY = clampStep(destinationTile.y - unit.tileY);
  const options = [
    { x: unit.tileX + stepX, y: unit.tileY + stepY },
    { x: unit.tileX + stepX, y: unit.tileY },
    { x: unit.tileX, y: unit.tileY + stepY },
    { x: unit.tileX - stepX, y: unit.tileY },
    { x: unit.tileX, y: unit.tileY - stepY },
  ];

  for (const option of options) {
    if (!isTileInBounds(option.x, option.y)) {
      continue;
    }

    const key = toTileKey(option.x, option.y);
    if (occupancy.has(key)) {
      continue;
    }

    unit.tileX = option.x;
    unit.tileY = option.y;
    occupancy.add(key);
    return;
  }

  occupancy.add(currentKey);
}

function tryRangerShot(game, unit) {
  if (unit.attackTimer > 0) {
    return false;
  }

  const enemy = findNearestEnemy(game, unit);
  if (!enemy) {
    return false;
  }

  if (tileDistance(unit.tileX, unit.tileY, enemy.tileX, enemy.tileY) > unit.attackRangeTiles) {
    return false;
  }

  enemy.health -= unit.attackDamage;
  unit.attackTimer = unit.attackCooldown;
  return true;
}

function resolveCombat(game) {
  for (const unit of game.units) {
    if (unit.type === "ranger" || unit.attackTimer > 0) {
      continue;
    }

    const target = unit.targetId ? getTargetById(game, unit.targetId) : findNearestEnemy(game, unit);
    if (!target || !inAttackRange(unit, target)) {
      continue;
    }

    if (target.team) {
      target.health -= unit.attackDamage;
    } else {
      target.health -= Math.round(unit.attackDamage * 0.8);
    }

    unit.attackTimer = unit.attackCooldown;
  }
}

function inAttackRange(unit, target) {
  if (typeof target.tileX !== "number" || typeof target.tileY !== "number") {
    return false;
  }

  const range = target.team ? unit.attackRangeTiles : 1;
  return tileDistance(unit.tileX, unit.tileY, target.tileX, target.tileY) <= range;
}

function cleanupDeadEntities(game) {
  game.units = game.units.filter((unit) => unit.health > 0);

  if (game.selectedUnitId && !game.units.some((unit) => unit.id === game.selectedUnitId)) {
    game.selectedUnitId = null;
  }
}

function resolveVictory(game) {
  if (game.playerBase.health <= 0) {
    game.gameOver = true;
    game.winner = "enemy";
    game.messages.unshift("Defeat. The red faction has captured the battlefield.");
  }

  if (game.enemyBase.health <= 0) {
    game.gameOver = true;
    game.winner = "player";
    game.messages.unshift("Victory. The red base has fallen.");
  }

  game.messages = game.messages.slice(0, 4);
}

function createBaseState(team, tileX, tileY) {
  return {
    team,
    tileX,
    tileY,
    x: 0,
    y: 0,
    width: 74,
    height: 74,
    maxHealth: 900,
    health: 900,
  };
}

function spawnInitialUnits(game) {
  game.units.push(createUnit("infantry", TEAM_PLAYER, 23, 20));
  game.units.push(createUnit("ranger", TEAM_PLAYER, 25, 21));
  game.units.push(createUnit("infantry", TEAM_ENEMY, 6, 8));
  game.units.push(createUnit("ranger", TEAM_ENEMY, 4, 9));
}

function findSpawnTile(game, team) {
  const base = team === TEAM_PLAYER ? game.playerBase : game.enemyBase;
  const occupancy = buildOccupancyMap(game.units);

  for (let radius = 1; radius <= 5; radius += 1) {
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        const tileX = base.tileX + x;
        const tileY = base.tileY + y;
        if (!isTileInBounds(tileX, tileY)) {
          continue;
        }

        if (team === TEAM_PLAYER && tileY < game.deploymentSplitRow) {
          continue;
        }

        if (team === TEAM_ENEMY && tileY >= game.deploymentSplitRow) {
          continue;
        }

        if (!occupancy.has(toTileKey(tileX, tileY))) {
          return { x: tileX, y: tileY };
        }
      }
    }
  }

  return null;
}

function syncScreenPositions(game) {
  for (const unit of game.units) {
    setUnitScreenPosition(unit);
  }

  setBaseScreenPosition(game.playerBase);
  setBaseScreenPosition(game.enemyBase);
}

function setUnitScreenPosition(unit) {
  const point = tileToScreen(unit.tileX, unit.tileY);
  unit.x = point.x;
  unit.y = point.y;
}

function setBaseScreenPosition(base) {
  const point = tileToScreen(base.tileX, base.tileY);
  base.x = point.x - base.width / 2;
  base.y = point.y - base.height / 2;
}

function buildOccupancyMap(units) {
  const occupancy = new Set();
  for (const unit of units) {
    occupancy.add(toTileKey(unit.tileX, unit.tileY));
  }
  return occupancy;
}

function clampStep(value) {
  if (value === 0) {
    return 0;
  }

  return value > 0 ? 1 : -1;
}

function findNearestEnemy(game, unit) {
  const enemies = game.units.filter((candidate) => candidate.team !== unit.team);
  if (enemies.length === 0) {
    return null;
  }

  let nearest = enemies[0];
  let nearestDistance = tileDistance(unit.tileX, unit.tileY, nearest.tileX, nearest.tileY);

  for (let index = 1; index < enemies.length; index += 1) {
    const candidateDistance = tileDistance(unit.tileX, unit.tileY, enemies[index].tileX, enemies[index].tileY);
    if (candidateDistance < nearestDistance) {
      nearest = enemies[index];
      nearestDistance = candidateDistance;
    }
  }

  return nearest;
}

function findUnitById(game, id) {
  return game.units.find((unit) => unit.id === id) ?? null;
}

function toTileKey(x, y) {
  return `${x},${y}`;
}
