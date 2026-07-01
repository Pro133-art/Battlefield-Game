import { createBase, createProjectile, createUnit, clampToArena, TEAM_ENEMY, TEAM_PLAYER, UNIT_TYPES } from "./units.js";

const ARENA_WIDTH = 1280;
const ARENA_HEIGHT = 720;

function createInitialState() {
  return {
    arenaWidth: ARENA_WIDTH,
    arenaHeight: ARENA_HEIGHT,
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
    playerBase: createBase(TEAM_PLAYER, 100, ARENA_HEIGHT / 2 - 46),
    enemyBase: createBase(TEAM_ENEMY, ARENA_WIDTH - 192, ARENA_HEIGHT / 2 - 46),
    units: [
      createUnit("infantry", TEAM_PLAYER, 190, 260),
      createUnit("ranger", TEAM_PLAYER, 210, 420),
      createUnit("infantry", TEAM_ENEMY, ARENA_WIDTH - 230, 260),
      createUnit("ranger", TEAM_ENEMY, ARENA_WIDTH - 250, 420),
    ],
    projectiles: [],
    selectedUnitId: null,
    messages: ["Select a blue unit and issue a command."],
  };
}

export function createGame() {
  return createInitialState();
}

export function resetGame(game) {
  const fresh = createInitialState();
  Object.assign(game, fresh);
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

  const base = team === TEAM_PLAYER ? game.playerBase : game.enemyBase;
  const offset = team === TEAM_PLAYER ? 1 : -1;
  const unit = createUnit(type, team, base.x + base.width / 2 + offset * 62, base.y + base.height / 2);
  game.units.push(unit);
  game[goldKey] -= stats.cost;
  return true;
}

export function commandMove(game, unitId, x, y) {
  const unit = findUnitById(game, unitId);
  if (!unit) {
    return;
  }

  unit.moveTarget = { x, y };
  unit.targetId = null;
}

export function commandAttack(game, unitId, targetId) {
  const unit = findUnitById(game, unitId);
  if (!unit) {
    return;
  }

  unit.targetId = targetId;
  unit.moveTarget = null;
}

export function commandAttackBase(game, unitId, team) {
  const unit = findUnitById(game, unitId);
  if (!unit) {
    return;
  }

  unit.targetId = team === TEAM_PLAYER ? "enemyBase" : "playerBase";
  unit.moveTarget = null;
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

export function updateGame(game, deltaTime) {
  if (game.paused || game.gameOver) {
    return;
  }

  game.time += deltaTime;
  tickIncome(game, deltaTime);
  tickAutoSpawns(game, deltaTime);
  updateUnits(game, deltaTime);
  updateProjectiles(game, deltaTime);
  resolveCombat(game);
  cleanupDeadEntities(game);
  resolveVictory(game);
}

function tickIncome(game, deltaTime) {
  game.playerIncomeTimer += deltaTime;
  game.enemyIncomeTimer += deltaTime;

  if (game.playerIncomeTimer >= 1.5) {
    const payout = Math.floor(game.playerIncomeTimer / 1.5) * 20;
    game.playerGold += payout;
    game.playerIncomeTimer = 0;
  }

  if (game.enemyIncomeTimer >= 1.6) {
    const payout = Math.floor(game.enemyIncomeTimer / 1.6) * 18;
    game.enemyGold += payout;
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
  for (const unit of game.units) {
    unit.attackTimer = Math.max(0, unit.attackTimer - deltaTime);

    if (unit.type !== "ranger") {
      continue;
    }

    const target = getTargetById(game, unit.targetId);
    if (target) {
      const targetX = target.x + (target.width ? target.width / 2 : 0);
      const targetY = target.y + (target.height ? target.height / 2 : 0);
      const dx = targetX - unit.x;
      const dy = targetY - unit.y;
      const dist = Math.hypot(dx, dy);
      if (dist > unit.attackRange) {
        unit.x += (dx / dist) * unit.speed * deltaTime;
        unit.y += (dy / dist) * unit.speed * deltaTime;
      }
    } else if (unit.moveTarget) {
      moveTowardPoint(unit, unit.moveTarget, deltaTime);
      if (Math.hypot(unit.moveTarget.x - unit.x, unit.moveTarget.y - unit.y) < 10) {
        unit.moveTarget = null;
      }
    } else {
      const fallbackTarget = unit.team === TEAM_PLAYER ? game.enemyBase : game.playerBase;
      moveTowardPoint(unit, { x: fallbackTarget.x + fallbackTarget.width / 2, y: fallbackTarget.y + fallbackTarget.height / 2 }, deltaTime);
    }

    clampToArena(unit, game.arenaWidth, game.arenaHeight);
  }

  for (const unit of game.units) {
    if (unit.type === "ranger") {
      continue;
    }

    const enemy = findNearestEnemy(game, unit);
    if (enemy && distance(unit.x, unit.y, enemy.x, enemy.y) <= unit.attackRange) {
      if (unit.attackTimer <= 0) {
        enemy.health -= unit.attackDamage;
        unit.attackTimer = unit.attackCooldown;
      }
      continue;
    }

    if (unit.targetId) {
      const target = getTargetById(game, unit.targetId);
      if (target) {
        const targetX = target.x + (target.width ? target.width / 2 : 0);
        const targetY = target.y + (target.height ? target.height / 2 : 0);
        moveTowardPoint(unit, { x: targetX, y: targetY }, deltaTime);
      }
    } else if (unit.moveTarget) {
      moveTowardPoint(unit, unit.moveTarget, deltaTime);
    } else {
      const fallbackTarget = unit.team === TEAM_PLAYER ? game.enemyBase : game.playerBase;
      moveTowardPoint(unit, { x: fallbackTarget.x + fallbackTarget.width / 2, y: fallbackTarget.y + fallbackTarget.height / 2 }, deltaTime);
    }

    clampToArena(unit, game.arenaWidth, game.arenaHeight);
  }
}

function moveTowardPoint(unit, point, deltaTime) {
  const dx = point.x - unit.x;
  const dy = point.y - unit.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0.001) {
    return;
  }

  const step = Math.min(unit.speed * deltaTime, dist);
  unit.x += (dx / dist) * step;
  unit.y += (dy / dist) * step;
}

function updateProjectiles(game, deltaTime) {
  for (const projectile of game.projectiles) {
    const target = getTargetById(game, projectile.targetId);
    if (!target) {
      projectile.dead = true;
      continue;
    }

    const targetX = target.x + (target.width ? target.width / 2 : 0);
    const targetY = target.y + (target.height ? target.height / 2 : 0);
    const dx = targetX - projectile.x;
    const dy = targetY - projectile.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= projectile.speed * deltaTime + projectile.radius + (target.radius ?? 0)) {
      target.health -= projectile.damage;
      projectile.dead = true;
      continue;
    }

    projectile.x += (dx / dist) * projectile.speed * deltaTime;
    projectile.y += (dy / dist) * projectile.speed * deltaTime;
  }

  maybeFireRangedProjectiles(game);
}

function maybeFireRangedProjectiles(game) {
  for (const unit of game.units) {
    if (unit.type !== "ranger" || unit.attackTimer > 0) {
      continue;
    }

    const enemy = findNearestEnemy(game, unit);
    if (!enemy) {
      continue;
    }

    const dist = distance(unit.x, unit.y, enemy.x, enemy.y);
    if (dist > unit.attackRange) {
      continue;
    }

    unit.attackTimer = unit.attackCooldown;
    game.projectiles.push(createProjectile(unit.team, unit.x, unit.y, enemy.id, unit.attackDamage));
  }
}

function resolveCombat(game) {
  for (const unit of game.units) {
    if (unit.type === "ranger") {
      continue;
    }

    const target = getTargetById(game, unit.targetId);
    if (target && target.team && distance(unit.x, unit.y, target.x, target.y) <= unit.attackRange && unit.attackTimer <= 0) {
      target.health -= unit.attackDamage;
      unit.attackTimer = unit.attackCooldown;
    }
  }
}

function cleanupDeadEntities(game) {
  game.units = game.units.filter((unit) => unit.health > 0);
  game.projectiles = game.projectiles.filter((projectile) => !projectile.dead);

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

function findNearestEnemy(game, unit) {
  const enemies = game.units.filter((candidate) => candidate.team !== unit.team);
  if (enemies.length === 0) {
    return null;
  }

  let nearest = enemies[0];
  let nearestDistance = distance(unit.x, unit.y, nearest.x, nearest.y);

  for (let index = 1; index < enemies.length; index += 1) {
    const candidateDistance = distance(unit.x, unit.y, enemies[index].x, enemies[index].y);
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

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}
