import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JACKPOT_RATE, JACKPOT_SEED, jackpotContribution, parseJackpotDoc } from "./jackpot.ts";

describe("jackpot", () => {
  it("expose le seed et le taux attendus", () => {
    assert.equal(JACKPOT_SEED, 2000);
    assert.equal(JACKPOT_RATE, 0.01);
  });

  it("preleve 1% arrondi a l'entier inferieur avec un minimum de 1", () => {
    assert.equal(jackpotContribution(100), 1);
    assert.equal(jackpotContribution(199), 1);
    assert.equal(jackpotContribution(250), 2);
    assert.equal(jackpotContribution(10000), 100);
    assert.equal(jackpotContribution(50), 1);
    assert.equal(jackpotContribution(1), 1);
  });

  it("ignore les mises invalides ou nulles", () => {
    assert.equal(jackpotContribution(0), 0);
    assert.equal(jackpotContribution(-500), 0);
    assert.equal(jackpotContribution(Number.NaN), 0);
    assert.equal(jackpotContribution(Number.POSITIVE_INFINITY), 0);
  });

  it("parse un doc jackpot complet", () => {
    const state = parseJackpotDoc({ pot: 5400, lastWinnerName: "Daniel", lastWonAt: 1717000000000 });

    assert.equal(state.pot, 5400);
    assert.equal(state.lastWinnerName, "Daniel");
    assert.equal(state.lastWonAt, 1717000000000);
  });

  it("retombe sur le seed quand le pot est absent ou invalide", () => {
    assert.equal(parseJackpotDoc({}).pot, JACKPOT_SEED);
    assert.equal(parseJackpotDoc({ pot: "9000" }).pot, JACKPOT_SEED);
    assert.equal(parseJackpotDoc({ pot: Number.NaN }).pot, JACKPOT_SEED);
    assert.equal(parseJackpotDoc({ pot: 120 }).pot, JACKPOT_SEED);
  });

  it("retombe sur des valeurs neutres pour le dernier gagnant", () => {
    const state = parseJackpotDoc({ pot: 3000 });

    assert.equal(state.lastWinnerName, "");
    assert.equal(state.lastWonAt, null);
  });
});
