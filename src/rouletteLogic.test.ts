import assert from "node:assert/strict";
import test from "node:test";
import {
  ROULETTE_RECENT_LIMIT,
  evaluateRouletteBet,
  evaluateRouletteBets,
  getRouletteColdNumbers,
  getRouletteColor,
  getRouletteColorStats,
  getRouletteHotNumbers,
  playRoulette,
  playRouletteRound,
  spinRouletteNumber,
  updateRouletteBalance,
  type PlacedRouletteBet,
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

test("evalue des mises multiples comme la somme des evaluations unitaires", () => {
  const bets = [
    { kind: "red", amount: 50 },
    { kind: "straight", number: 17, amount: 10 },
    { kind: "dozen2", amount: 20 },
  ] satisfies PlacedRouletteBet[];
  const outcome = evaluateRouletteBets(bets, 17);
  const expected = bets.map((bet) => evaluateRouletteBet(bet, bet.amount, 17));

  assert.equal(outcome.number, 17);
  assert.equal(outcome.color, "black");
  assert.equal(outcome.totalStake, 80);
  assert.deepEqual(
    outcome.results.map((result) => result.payout),
    expected.map((unit) => unit.payout),
  );
  assert.equal(outcome.totalPayout, 0 + 360 + 60);
  assert.equal(outcome.net, 340);
});

test("seules les mises straight sur 0 paient quand le zero sort", () => {
  const bets = [
    { kind: "straight", number: 0, amount: 10 },
    { kind: "red", amount: 50 },
    { kind: "even", amount: 20 },
    { kind: "low", amount: 30 },
    { kind: "dozen1", amount: 40 },
  ] satisfies PlacedRouletteBet[];
  const outcome = evaluateRouletteBets(bets, 0);

  assert.equal(outcome.color, "green");
  assert.equal(outcome.totalPayout, 360);
  assert.equal(outcome.net, 360 - 150);
  assert.deepEqual(
    outcome.results.map((result) => result.isWin),
    [true, false, false, false, false],
  );
});

test("joue un tour multi-mises avec un rng deterministe", () => {
  const outcome = playRouletteRound([{ kind: "high", amount: 100 }], () => 0.9);

  assert.equal(outcome.number, 33);
  assert.equal(outcome.totalPayout, 200);
  assert.equal(outcome.net, 100);
});

test("calcule les numeros chauds (top 3, compte >= 2)", () => {
  const recent = [17, 5, 17, 5, 17, 8, 8, 8, 8, 3, 2, 1];

  assert.deepEqual(getRouletteHotNumbers(recent), [
    { number: 8, count: 4 },
    { number: 17, count: 3 },
    { number: 5, count: 2 },
  ]);
  assert.deepEqual(getRouletteHotNumbers([1, 2, 3]), []);
});

test("calcule les numeros froids absents des tirages recents", () => {
  assert.deepEqual(getRouletteColdNumbers([0, 1, 2, 4]), [3, 5, 6]);
  assert.deepEqual(getRouletteColdNumbers([]), [0, 1, 2]);
});

test("calcule les statistiques de couleurs et parites", () => {
  const stats = getRouletteColorStats([0, 1, 2, 4, 17, 32]);

  assert.deepEqual(stats, { red: 2, black: 3, green: 1, even: 3, odd: 2 });
  assert.deepEqual(getRouletteColorStats([]), { red: 0, black: 0, green: 0, even: 0, odd: 0 });
});

test("respecte la limite d'historique recent", () => {
  assert.equal(ROULETTE_RECENT_LIMIT, 12);
});
