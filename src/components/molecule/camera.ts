import type { MoleculeGraph } from '../../contracts/molecule';

/** Camera coordinates are separate from the saved molecular graph. */
export interface MoleculeCamera { readonly x: number; readonly y: number; readonly scale: number; }
export const DEFAULT_DRAWING_SCALE = 1.4;
export function fitMoleculeCamera(graph: MoleculeGraph, width: number, height: number): MoleculeCamera {
  if (!graph.atoms.length) return { x: 0, y: 0, scale: DEFAULT_DRAWING_SCALE };
  const xs = graph.atoms.map(a => a.x), ys = graph.atoms.map(a => a.y);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  return {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
    scale: Math.min(DEFAULT_DRAWING_SCALE, width / (right - left + 140), height / (bottom - top + 100)),
  };
}
export function cameraViewBox(camera: MoleculeCamera, width: number, height: number) {
  const w = width / camera.scale, h = height / camera.scale;
  return { x: camera.x - w / 2, y: camera.y - h / 2, w, h };
}
export function zoomMoleculeCamera(camera: MoleculeCamera, factor: number): MoleculeCamera {
  return { ...camera, scale: Math.max(.15, Math.min(4, camera.scale * factor)) };
}
export function panMoleculeCamera(camera: MoleculeCamera, dx: number, dy: number): MoleculeCamera {
  return { ...camera, x: camera.x - dx / camera.scale, y: camera.y - dy / camera.scale };
}
