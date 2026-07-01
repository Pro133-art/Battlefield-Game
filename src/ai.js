import { commandAttack, commandAttackBase, commandMove, getUnitsForTeam, spawnUnit } from "./game.js";
import { TEAM_ENEMY, TEAM_PLAYER } from "./units.js";

export function updateAI(game, deltaTime) {
  if (game.paused || game.gameOver) {
    return;
  }

  const enemyUnits = getUnitsForTeam(game, TEAM_ENEMY);
  const playerUnits = getUnitsForTeam(game, TEAM_PLAYER);

  for (const unit of enemyUnits) {
    if (!unit.targetId && !unit.moveTarget) {
      if (playerUnits.length > 0) {
        const closestPlayer = playerUnits.reduce((best, candidate) => {
          const bestDistance = Math.hypot(best.x - unit.x, best.y - unit.y);
          const candidateDistance = Math.hypot(candidate.x - unit.x, candidate.y - unit.y);
          return candidateDistance < bestDistance ? candidate : best;
        }, playerUnits[0]);

        if (Math.random() < 0.45) {
          commandAttack(game, unit.id, closestPlayer.id);
        } else {
          commandMove(game, unit.id, closestPlayer.x, closestPlayer.y);
        }
      } else {
        commandAttackBase(game, unit.id, TEAM_ENEMY);
      }
    }
  }

  if (game.enemyGold >= 50 && Math.random() < deltaTime * 0.9) {
    const choice = game.enemyGold >= 75 && Math.random() > 0.5 ? "ranger" : "infantry";
    spawnUnit(game, TEAM_ENEMY, choice);
  }
}
