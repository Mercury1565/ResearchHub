import type { Coordinates } from '../types';

export function fractionalToPixels(
  coords: Coordinates,
  canvasWidth: number,
  canvasHeight: number
) {
  return {
    x: coords.x * canvasWidth,
    y: coords.y * canvasHeight,
    width: coords.width * canvasWidth,
    height: coords.height * canvasHeight,
  };
}
