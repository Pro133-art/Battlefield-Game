export const TEAM_PLAYER = "player";
export const TEAM_ENEMY = "enemy";

export const UNIT_TYPES = {
  infantry: {
    label: "Infantry",
    maxHealth: 100,
    speed: 74,
    attackRange: 20,
    attackDamage: 20,
    attackCooldown: 0.7,
    cost: 50,
    radius: 10,
    color: "#69b6ff",
  },
  ranger: {
    label: "Ranger",
    maxHealth: 70,
    speed: 90,
    attackRange: 150,
    attackDamage: 13,
    attackCooldown: 1.0,
    cost: 75,
    radius: 8,
    color: "#9de1ff",
  },
  brute: {
    label: "Brute",
    maxHealth: 160,
    speed: 58,
    attackRange: 18,
    attackDamage: 26,
    attackCooldown: 1.15,
    cost: 0,
    radius: 12,
    color: "#ff8b8b",
  },
};

let nextUnitId = 1;

export function createUnit(type, team, x, y) {
  const stats = UNIT_TYPES[type];

  return {
    id: nextUnitId++,
    type,
    team,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: stats.radius,
    maxHealth: stats.maxHealth,
    health: stats.maxHealth,
    speed: stats.speed,
    attackRange: stats.attackRange,
    attackDamage: stats.attackDamage,
    attackCooldown: stats.attackCooldown,
    attackTimer: 0,
    targetId: null,
    moveTarget: null,
    holdPosition: false,
    dead: false,
  };
}

export function createBase(team, x, y) {
  return {
    team,
    x,
    y,
    width: 92,
    height: 92,
    maxHealth: 900,
    health: 900,
  };
}

export function createProjectile(team, x, y, targetId, damage) {
  return {
    id: `${team}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    team,
    x,
    y,
    radius: 4,
    speed: 360,
    targetId,
    damage,
    dead: false,
  };
}

export function isEnemy(team, otherTeam) {
  return team !== otherTeam;
}

export function clampToArena(entity, arenaWidth, arenaHeight) {
  entity.x = Math.max(entity.radius, Math.min(arenaWidth - entity.radius, entity.x));
  entity.y = Math.max(entity.radius, Math.min(arenaHeight - entity.radius, entity.y));
}