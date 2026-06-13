export enum PowerType {
  None = 'none',
  LineRow = 'line_row',
  LineCol = 'line_col',
  Nova = 'nova',
  Fused = 'fused',
}

export interface BoardCrystalState {
  power: PowerType;
  fusedAbilityId?: string;
}
