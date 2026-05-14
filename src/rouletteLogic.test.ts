import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateRouletteBet,
  getRouletteColor,
  playRoulette,
  spinRouletteNumber,
  updateRouletteBalance,
} from "./rouletteLogic.ts";

test("genere un numero de roulette entre 0 et 36", () => {
  assert.equal(spinRouletteNumber(() => 0), 0);
  assert.equal(spinRouletteNumber(() => 0.999), 36);
});

test("detecte les couleurs europeennes", () => {
  assert.equal(getRouletteColor(0), "green");
  assert.equal(getRouletteColor(1), "red");
  assert.equal(getRouletteColor(2), "black");
});

test("paie un numero plein a x36", () => {
  const outcome = evaluateRouletteBet({ kind: "straight", number: 17 }, 10, 17);

  assert.equal(outcome.multiplier, 36);
  assert.equal(outcome.payout, 360);
  assert.equal(outcome.net, 350);
});

test("paie les chances simples a x2 et le zero perd", () => {
  assert.equal(evaluateRouletteBet({ kind: "red" }, 25, 1).net, 25);
  assert.equal(evaluateRouletteBet({ kind: "even" }, 25, 2).net, 25);
  assert.equal(evaluateRouletteBet({ kind: "black" }, 25, 0).net, -25);
});

test("paie les douzaines a x3", () => {
  assert.equal(evaluateRouletteBet({ kind: "dozen2" }, 50, 18).net, 100);
  assert.equal(evaluateRouletteBet({ kind: "dozen3" }, 50, 18).net, -50);
});

test("joue un tour complet et met a jour le solde", () => {
  const outcome = playRoulette({ kind: "high" }, 100, () => 0.9);

  assert.equal(outcome.number, 33);
  assert.equal(updateRouletteBalance(1000, 100, outcome), 1100);
});
