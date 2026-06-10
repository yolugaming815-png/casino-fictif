import assert from "node:assert/strict";
import test from "node:test";
import {
  PLINKO_AUTO_DROP_OPTIONS,
  PLINKO_MULTIPLIER_TABLES,
  PLINKO_ROW_OPTIONS,
  calculatePlinkoPayout,
  generatePlinkoPath,
  getFinalSlot,
  getPlinkoMultiplier,
  getPlinkoMultiplierV2,
  getPlinkoMultipliersV2,
  getPlinkoProbabilitiesV2,
  playPlinko,
  updatePlinkoBalance,
  type PlinkoRisk,
} from "./plinkoLogic.ts";

const PLINKO_RISKS: PlinkoRisk[] = ["low", "medium", "high"];

test("genere le chemin de la bille avec une source aleatoire injectable", () => {
  const values = [0.1, 0.8, 0.2, 0.9];

  assert.deepEqual(generatePlinkoPath(10, () => values.shift() ?? 0.1).slice(0, 4), ["L", "R", "L", "R"]);
});

test("calcule la case finale avec le nombre de pas a droite", () => {
  assert.equal(getFinalSlot(["L", "R", "R", "L", "R"]), 3);
});

test("attribue les multiplicateurs selon la position", () => {
  assert.equal(getPlinkoMultiplier(0, 10), 10);
  assert.equal(getPlinkoMultiplier(1, 10), 5);
  assert.equal(getPlinkoMultiplier(2, 10), 2);
  assert.equal(getPlinkoMultiplier(3, 10), 0.5);
  assert.equal(getPlinkoMultiplier(4, 10), 0.2);
  assert.equal(getPlinkoMultiplier(5, 10), 0.2);
});

test("inverse les multiplicateurs extremes sur telephone", () => {
  const values = Array.from({ length: 11 }, (_, slot) => getPlinkoMultiplier(slot, 10, "mobile"));

  assert.deepEqual(values, [0.2, 0.2, 0.5, 1, 2, 10, 2, 1, 0.5, 0.2, 0.2]);
});

test("donne davantage de cases faibles sur 10 rangees", () => {
  const values = Array.from({ length: 11 }, (_, slot) => getPlinkoMultiplier(slot, 10));
  const count = (multiplier: number) => values.filter((value) => value === multiplier).length;

  assert.equal(Math.max(...values), 10);
  assert.equal(count(0.2), 3);
  assert.equal(count(0.5), 2);
  assert.equal(count(2), 2);
});

test("calcule le gain a partir de la mise et du multiplicateur", () => {
  assert.deepEqual(calculatePlinkoPayout(100, 10), { payout: 1000, net: 900 });
  assert.deepEqual(calculatePlinkoPayout(100, 0.5), { payout: 50, net: -50 });
});

test("met a jour le solde apres un lancer", () => {
  assert.equal(updatePlinkoBalance(1000, 100, 5), 1400);
  assert.equal(updatePlinkoBalance(1000, 100, 0.5), 950);
});

test("joue un lancer complet", () => {
  const values = Array.from({ length: 10 }, () => 0.9);
  const outcome = playPlinko(10, 10, () => values.shift() ?? 0.9);

  assert.equal(outcome.slot, 10);
  assert.equal(outcome.multiplier, 10);
  assert.equal(outcome.payout, 100);
});

test("expose les options V2 de rangées et de lancers automatiques", () => {
  assert.deepEqual([...PLINKO_ROW_OPTIONS], [8, 12, 16]);
  assert.deepEqual([...PLINKO_AUTO_DROP_OPTIONS], [10, 25, 50]);
});

test("fournit des tables V2 symétriques de longueur rangées + 1", () => {
  for (const risk of PLINKO_RISKS) {
    for (const rows of PLINKO_ROW_OPTIONS) {
      const table = getPlinkoMultipliersV2(rows, risk);

      assert.equal(table.length, rows + 1);

      for (let slot = 0; slot <= rows; slot += 1) {
        assert.equal(table[slot], table[rows - slot]);
        assert.equal(getPlinkoMultiplierV2(slot, rows, risk), table[slot]);
      }
    }
  }
});

test("garde une esperance binomiale entre 0,93 et 1,00 pour les 9 tables V2", () => {
  for (const risk of PLINKO_RISKS) {
    for (const rows of PLINKO_ROW_OPTIONS) {
      const probabilities = getPlinkoProbabilitiesV2(rows, risk);
      const expectedValue = probabilities.reduce(
        (total, entry) => total + entry.probability * entry.multiplier,
        0,
      );

      assert.ok(expectedValue >= 0.93, `EV trop basse pour ${risk}/${rows} : ${expectedValue}`);
      assert.ok(expectedValue <= 1, `EV trop haute pour ${risk}/${rows} : ${expectedValue}`);
    }
  }
});

test("place le multiplicateur 110 au bord en risque eleve sur 16 rangees", () => {
  assert.equal(getPlinkoMultiplierV2(0, 16, "high"), 110);
  assert.equal(getPlinkoMultiplierV2(16, 16, "high"), 110);
  assert.equal(PLINKO_MULTIPLIER_TABLES.high[16][0], 110);
});

test("somme les probabilites V2 a 1", () => {
  for (const rows of PLINKO_ROW_OPTIONS) {
    const total = getPlinkoProbabilitiesV2(rows, "medium").reduce(
      (sum, entry) => sum + entry.probability,
      0,
    );

    assert.ok(Math.abs(total - 1) < 1e-9);
  }
});

test("rejette une case V2 hors de la planche", () => {
  assert.throws(() => getPlinkoMultiplierV2(-1, 8, "low"));
  assert.throws(() => getPlinkoMultiplierV2(9, 8, "low"));
});

test("laisse la table legacy 10 rangees inchangee", () => {
  const values = Array.from({ length: 11 }, (_, slot) => getPlinkoMultiplier(slot, 10));

  assert.deepEqual(values, [10, 5, 2, 0.5, 0.2, 0.2, 0.2, 0.5, 2, 5, 10]);
});
