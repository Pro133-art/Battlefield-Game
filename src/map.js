export const MAP_COLS = 30;
export const MAP_ROWS = 30;
export const TILE_WIDTH = 40;
export const TILE_HEIGHT = 20;

const ORIGIN_X = 640;
const ORIGIN_Y = 90;

export function tileToScreen(tileX, tileY) {
  return {
    x: (tileX - tileY) * (TILE_WIDTH / 2) + ORIGIN_X,
    y: (tileX + tileY) * (TILE_HEIGHT / 2) + ORIGIN_Y,
  };
}

export function screenToTile(screenX, screenY) {
  const a = (screenX - ORIGIN_X) / (TILE_WIDTH / 2);
  const b = (screenY - ORIGIN_Y) / (TILE_HEIGHT / 2);

  return {
    x: Math.round((a + b) / 2),
    y: Math.round((b - a) / 2),
  };
}

export function isTileInBounds(tileX, tileY) {
  return tileX >= 0 && tileX < MAP_COLS && tileY >= 0 && tileY < MAP_ROWS;
}

export function tileDistance(aX, aY, bX, bY) {
  return Math.max(Math.abs(aX - bX), Math.abs(aY - bY));
}

export function getDeploymentSplitRow() {
  return Math.floor(MAP_ROWS / 2);
}
