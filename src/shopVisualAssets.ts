import type { SpecialChestId } from "./caseLogic";

export type AtlasCell = {
  column: number;
  row: number;
  translateX: string;
  translateY: string;
};

export const ROCKET_SHIP_ATLAS_COLUMNS = 5;
export const ROCKET_SHIP_ATLAS_ROWS = 3;

export const SPECIAL_CHEST_ATLAS_COLUMNS = 4;
export const SPECIAL_CHEST_ATLAS_ROWS = 1;

const ROCKET_SHIP_ART_CELLS: Record<string, AtlasCell> = {
  "rocket-classic": cell(0, 0, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-comet": cell(1, 0, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-solar": cell(2, 0, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-nebula": cell(3, 0, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-scout": cell(4, 0, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-cargo": cell(0, 1, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-redcap": cell(1, 1, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-delta": cell(2, 1, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-falcon": cell(3, 1, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-eclipse": cell(4, 1, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-ion-wing": cell(0, 2, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-starlancer": cell(1, 2, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-blackbird": cell(2, 2, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-capsule-v": cell(3, 2, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
  "rocket-orbital-x": cell(4, 2, ROCKET_SHIP_ATLAS_COLUMNS, ROCKET_SHIP_ATLAS_ROWS),
};

const SPECIAL_CHEST_ART_CELLS: Record<SpecialChestId, AtlasCell> = {
  nebula: cell(0, 0, SPECIAL_CHEST_ATLAS_COLUMNS, SPECIAL_CHEST_ATLAS_ROWS),
  royal: cell(1, 0, SPECIAL_CHEST_ATLAS_COLUMNS, SPECIAL_CHEST_ATLAS_ROWS),
  prism: cell(2, 0, SPECIAL_CHEST_ATLAS_COLUMNS, SPECIAL_CHEST_ATLAS_ROWS),
  orbital: cell(3, 0, SPECIAL_CHEST_ATLAS_COLUMNS, SPECIAL_CHEST_ATLAS_ROWS),
};

export function getRocketShipArtCell(id: string): AtlasCell | undefined {
  return ROCKET_SHIP_ART_CELLS[id];
}

export function getSpecialChestArtCell(id: SpecialChestId): AtlasCell {
  return SPECIAL_CHEST_ART_CELLS[id];
}

function cell(column: number, row: number, columns: number, rows: number): AtlasCell {
  return {
    column,
    row,
    translateX: `${column * -(100 / columns)}%`,
    translateY: `${row * -(100 / rows)}%`,
  };
}
