export const BOARD_ROWS = 8;
export const BOARD_COLS = 8;
export const CELL_PITCH = 1.08;
export const BOARD_ORIGIN_X = 0;
export const BOARD_ORIGIN_Z = 0;

export function cellToWorld(row: number, col: number): { x: number; y: number; z: number } {
  return {
    x: col * CELL_PITCH + BOARD_ORIGIN_X,
    y: 0.45,
    z: row * CELL_PITCH + BOARD_ORIGIN_Z,
  };
}

export function worldToCell(x: number, z: number): { row: number; col: number } | null {
  const col = Math.round((x - BOARD_ORIGIN_X) / CELL_PITCH);
  const row = Math.round((z - BOARD_ORIGIN_Z) / CELL_PITCH);
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return null;
  return { row, col };
}

export function boardCenter(): { x: number; z: number } {
  return {
    x: ((BOARD_COLS - 1) * CELL_PITCH) / 2 + BOARD_ORIGIN_X,
    z: ((BOARD_ROWS - 1) * CELL_PITCH) / 2 + BOARD_ORIGIN_Z,
  };
}
