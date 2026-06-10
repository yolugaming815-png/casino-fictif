import assert from "node:assert/strict";
import test from "node:test";
import {
  MINES_GRID_SIZE,
  MINES_OPTIONS,
  evaluateMinesCashOut,
  generateMinePositions,
  getMinesMultiplier,
  getMinesMultiplierTable,
  isMine,
} from "./minesLogic.ts";

test("respecte les multiplicateurs de controle", () => {
  assert.equal(getMinesMultiplier(3, 1), 1.1);
  assert.equal(getMinesMultiplier(5, 1), 1.21);
  assert.equal(getMinesMultiplier(10, 1), 1.62);
  assert.equal(getMinesMultiplier(3, 5), 1.96);
});

test("renvoie 1 sans case revelee et refuse les reveals impossibles", () => {
  assert.equal(getMinesMultiplier(3, 0), 1);
  assert.equal(getMinesMultiplier(5, -2), 1);
  assert.throws(() => getMinesMultiplier(3, 23));
  assert.throws(() => getMinesMultiplier(10, 16));
});

test("croit strictement avec le nombre de cases sures", () => {
  for (const mines of MINES_OPTIONS) {
    const table = getMinesMultiplierTable(mines);

    assert.equal(table.length, MINES_GRID_SIZE - mines);

    for (let i = 1; i < table.length; i += 1) {
      assert.ok(table[i] > table[i - 1], `mult(${mines}, ${i + 1}) doit depasser mult(${mines}, ${i})`);
    }
  }
});

test("reste fini quand toutes les cases sures sont revelees", () => {
  for (const mines of MINES_OPTIONS) {
    const maximum = getMinesMultiplier(mines, MINES_GRID_SIZE - mines);

    assert.ok(Number.isFinite(maximum));
    assert.ok(maximum > 1);
  }
});

test("genere des positions distinctes et bornees", () => {
  for (const mines of MINES_OPTIONS) {
    const positions = generateMinePositions(mines);

    assert.equal(positions.length, mines);
    assert.equal(new Set(positions).size, mines);

    for (const cell of positions) {
      assert.ok(Number.isInteger(cell));
      assert.ok(cell >= 0 && cell < MINES_GRID_SIZE);
    }
  }
});

test("reste deterministe avec une source aleatoire injectee", () => {
  const makeRng = () => {
    const values = [0.1, 0.8, 0.2, 0.9, 0.4];
    let index = 0;

    return () => values[index++ % values.length];
  };

  assert.deepEqual(generateMinePositions(5, makeRng()), generateMinePositions(5, makeRng()));
  assert.deepEqual(generateMinePositions(3, () => 0), [0, 1, 2]);
});

test("arrondit le gain et le net au centime", () => {
  assert.deepEqual(evaluateMinesCashOut(100, 3, 1), { multiplier: 1.1, payout: 110, net: 10 });
  assert.deepEqual(evaluateMinesCashOut(33, 5, 1), { multiplier: 1.21, payout: 39.93, net: 6.93 });
  assert.deepEqual(evaluateMinesCashOut(50, 10, 1), { multiplier: 1.62, payout: 81, net: 31 });
  assert.deepEqual(evaluateMinesCashOut(75, 3, 0), { multiplier: 1, payout: 75, net: 0 });
});

test("detecte les cellules minees", () => {
  const positions = [2, 7, 18];

  assert.equal(isMine(positions, 7), true);
  assert.equal(isMine(positions, 8), false);
});
