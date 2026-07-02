import { MAP_COLS, MAP_ROWS, TILE_HEIGHT, TILE_WIDTH, tileToScreen } from "./map.js";

const DEFAULT_MIN_ZOOM = 0.7;
const DEFAULT_MAX_ZOOM = 1.6;
const DEFAULT_PAN_SPEED = 640;
const EDGE_MARGIN = 32;

const WORLD_BOUNDS = getWorldBounds();

export function createCamera(canvas) {
  const center = getMapCenter();

  return {
    x: center.x,
    y: center.y,
    zoom: 1,
    minZoom: DEFAULT_MIN_ZOOM,
    maxZoom: DEFAULT_MAX_ZOOM,
    panSpeed: DEFAULT_PAN_SPEED,
    edgeMargin: EDGE_MARGIN,
    viewportWidth: canvas.width,
    viewportHeight: canvas.height,
  };
}

export function setCameraViewport(camera, width, height) {
  camera.viewportWidth = width;
  camera.viewportHeight = height;
  clampCamera(camera);
}

export function updateCamera(camera, inputState, deltaTime) {
  let moveX = 0;
  let moveY = 0;

  if (inputState.keys.has("KeyA") || inputState.keys.has("ArrowLeft")) {
    moveX -= 1;
  }

  if (inputState.keys.has("KeyD") || inputState.keys.has("ArrowRight")) {
    moveX += 1;
  }

  if (inputState.keys.has("KeyW") || inputState.keys.has("ArrowUp")) {
    moveY -= 1;
  }

  if (inputState.keys.has("KeyS") || inputState.keys.has("ArrowDown")) {
    moveY += 1;
  }

  if (inputState.mouseInsideCanvas) {
    const edgeX = getEdgeAxis(inputState.mouseX, camera.viewportWidth, camera.edgeMargin);
    const edgeY = getEdgeAxis(inputState.mouseY, camera.viewportHeight, camera.edgeMargin);
    moveX += edgeX;
    moveY += edgeY;
  }

  if (moveX !== 0 || moveY !== 0) {
    const speed = camera.panSpeed * deltaTime / camera.zoom;
    camera.x += moveX * speed;
    camera.y += moveY * speed;
    clampCamera(camera);
  }
}

export function applyCameraTransform(context, camera) {
  context.translate(camera.viewportWidth / 2, camera.viewportHeight / 2);
  context.scale(camera.zoom, camera.zoom);
  context.translate(-camera.x, -camera.y);
}

export function screenToWorldPoint(camera, screenX, screenY) {
  return {
    x: camera.x + (screenX - camera.viewportWidth / 2) / camera.zoom,
    y: camera.y + (screenY - camera.viewportHeight / 2) / camera.zoom,
  };
}

export function zoomCamera(camera, deltaY) {
  const zoomFactor = Math.exp(-deltaY * 0.0015);
  camera.zoom = clamp(camera.zoom * zoomFactor, camera.minZoom, camera.maxZoom);
  clampCamera(camera);
}

function clampCamera(camera) {
  const halfWidth = camera.viewportWidth / (2 * camera.zoom);
  const halfHeight = camera.viewportHeight / (2 * camera.zoom);

  const minX = WORLD_BOUNDS.minX + halfWidth;
  const maxX = WORLD_BOUNDS.maxX - halfWidth;
  const minY = WORLD_BOUNDS.minY + halfHeight;
  const maxY = WORLD_BOUNDS.maxY - halfHeight;

  camera.x = clampRange(camera.x, minX, maxX);
  camera.y = clampRange(camera.y, minY, maxY);
}

function getWorldBounds() {
  const corners = [
    tileToScreen(0, 0),
    tileToScreen(MAP_COLS - 1, 0),
    tileToScreen(0, MAP_ROWS - 1),
    tileToScreen(MAP_COLS - 1, MAP_ROWS - 1),
  ];

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const corner of corners) {
    minX = Math.min(minX, corner.x - TILE_WIDTH / 2);
    maxX = Math.max(maxX, corner.x + TILE_WIDTH / 2);
    minY = Math.min(minY, corner.y - TILE_HEIGHT / 2);
    maxY = Math.max(maxY, corner.y + TILE_HEIGHT / 2);
  }

  return { minX, maxX, minY, maxY };
}

function getMapCenter() {
  return {
    x: (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2,
    y: (WORLD_BOUNDS.minY + WORLD_BOUNDS.maxY) / 2,
  };
}

function getEdgeAxis(position, size, margin) {
  if (position < margin) {
    return -((margin - position) / margin);
  }

  if (position > size - margin) {
    return (position - (size - margin)) / margin;
  }

  return 0;
}

function clampRange(value, min, max) {
  if (min > max) {
    return (min + max) / 2;
  }

  return clamp(value, min, max);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}