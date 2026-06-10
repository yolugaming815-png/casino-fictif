import assert from "node:assert/strict";
import test from "node:test";
import {
  FREE_SPINS_AWARDED,
  JACKPOT_CONTRIBUTION_RATE,
  SLOT_SYMBOL_WEIGHTS,
  SYMBOLS_V2,
  WILD_SYMBOL,
  canPlaceBet,
  createReels,
  createReelsV2,
  evaluateReels,
  evaluateReelsV2,
  getJackpotContribution,
  getMultiplier,
  spinV2,
  type Reels,
} from "./gameLogic.ts";

test("3x 7 paie x50", () => {
  assert.equal(getMultiplier(["7️⃣", "7️⃣", "7️⃣"]), 50);
  assert.equal(evaluateReels(["7️⃣", "7️⃣", "7️⃣"], 10).payout, 500);
});

test("3x etoile paie x20", () => {
  assert.equal(getMultiplier(["⭐", "⭐", "⭐"]), 20);
  assert.equal(evaluateReels(["⭐", "⭐", "⭐"], 25).net, 475);
});

test("les autres triples paient x10", () => {
  assert.equal(getMultiplier(["🍒", "🍒", "🍒"]), 10);
  assert.equal(getMultiplier(["🍋", "🍋", "🍋"]), 10);
  assert.equal(getMultiplier(["🔔", "🔔", "🔔"]), 10);
});

test("deux symboles identiques paient x2", () => {
  assert.equal(getMultiplier(["🍒", "🍒", "⭐"]), 2);
  assert.equal(getMultiplier(["🔔", "7️⃣", "🔔"]), 2);
  assert.equal(evaluateReels(["🍒", "🍋", "🍒"], 50).net, 50);
});

test("trois symboles differents perdent la mise", () => {
  const outcome = evaluateReels(["🍒", "🍋", "🔔"], 100);

  assert.equal(outcome.multiplier, 0);
  assert.equal(outcome.payout, 0);
  assert.equal(outcome.net, -100);
});

test("la generation aleatoire accepte une source RNG injectable", () => {
  const values = [0, 0.2, 0.99];
  const reels = createReels(() => values.shift() ?? 0) satisfies Reels;

  assert.deepEqual(reels, ["🍒", "🍋", "🍉"]);
});

test("une mise est possible uniquement si le solde suffit", () => {
  assert.equal(canPlaceBet(50, 50), true);
  assert.equal(canPlaceBet(49, 50), false);
  assert.equal(canPlaceBet(1000, 9), false);
  assert.equal(canPlaceBet(1000, -100), false);
});

test("V2 : la table de poids couvre les 9 symboles pour un total de 33", () => {
  assert.equal(SYMBOLS_V2.length, 9);
  assert.equal(SYMBOLS_V2.at(-1), WILD_SYMBOL);

  const total = SYMBOLS_V2.reduce((sum, symbol) => sum + SLOT_SYMBOL_WEIGHTS[symbol], 0);

  assert.equal(total, 33);
  assert.equal(SLOT_SYMBOL_WEIGHTS[WILD_SYMBOL], 1);
});

test("V2 : le RTP de base par enumeration ponderee est entre 0,82 et 0,92", () => {
  let totalWeight = 0;
  let weightedReturn = 0;
  let freeSpinWeight = 0;
  let jackpotWeight = 0;

  for (const a of SYMBOLS_V2) {
    for (const b of SYMBOLS_V2) {
      for (const c of SYMBOLS_V2) {
        const weight = SLOT_SYMBOL_WEIGHTS[a] * SLOT_SYMBOL_WEIGHTS[b] * SLOT_SYMBOL_WEIGHTS[c];
        const outcome = evaluateReelsV2([a, b, c], 1);

        totalWeight += weight;
        weightedReturn += weight * outcome.multiplier;
        freeSpinWeight += outcome.freeSpinsWon > 0 ? weight : 0;
        jackpotWeight += outcome.jackpotWon ? weight : 0;
      }
    }
  }

  assert.equal(totalWeight, 33 ** 3);

  const rtp = weightedReturn / totalWeight;
  const freeSpinProbability = freeSpinWeight / totalWeight;
  const jackpotProbability = jackpotWeight / totalWeight;

  assert.ok(rtp >= 0.82 && rtp <= 0.92, `RTP de base ${rtp}`);
  assert.ok(Math.abs(freeSpinProbability - 0.0405) < 0.001, `p(free spins) ${freeSpinProbability}`);
  assert.ok(Math.abs(jackpotProbability - 1 / 290) < 0.0001, `p(jackpot) ${jackpotProbability}`);
});

test("V2 : un triple complete par le wild paie la moitie arrondie sup", () => {
  assert.equal(evaluateReelsV2(["7️⃣", "7️⃣", "🃏"], 10).multiplier, 25);
  assert.equal(evaluateReelsV2(["⭐", "🃏", "⭐"], 10).multiplier, 10);
  assert.equal(evaluateReelsV2(["🃏", "🃏", "🍒"], 10).multiplier, 5);
  assert.equal(evaluateReelsV2(["🃏", "🃏", "🍒"], 10).wildAssisted, true);
});

test("V2 : le triple wild paie x20", () => {
  const outcome = evaluateReelsV2(["🃏", "🃏", "🃏"], 10);

  assert.equal(outcome.multiplier, 20);
  assert.equal(outcome.wildAssisted, true);
  assert.equal(outcome.jackpotWon, false);
});

test("V2 : le wild ne compte pas pour les paires", () => {
  const outcome = evaluateReelsV2(["🃏", "🍒", "🍋"], 100);

  assert.equal(outcome.multiplier, 0);
  assert.equal(outcome.payout, 0);
  assert.equal(outcome.net, -100);
  assert.equal(outcome.wildAssisted, false);
});

test("V2 : les triples naturels restent inchanges", () => {
  assert.equal(evaluateReelsV2(["7️⃣", "7️⃣", "7️⃣"], 10).multiplier, 50);
  assert.equal(evaluateReelsV2(["🍒", "🍒", "🍒"], 10).multiplier, 10);
  assert.equal(evaluateReelsV2(["🍒", "🍒", "🍋"], 10).multiplier, 2);
});

test("V2 : deux etoiles naturelles donnent des free spins sans payer la paire", () => {
  const outcome = evaluateReelsV2(["⭐", "⭐", "🍒"], 50);

  assert.equal(outcome.freeSpinsWon, FREE_SPINS_AWARDED);
  assert.equal(outcome.multiplier, 0);
  assert.equal(outcome.net, -50);
});

test("V2 : le triple etoile paie x20 et declenche aussi les free spins", () => {
  const triple = evaluateReelsV2(["⭐", "⭐", "⭐"], 10);

  assert.equal(triple.multiplier, 20);
  assert.equal(triple.freeSpinsWon, FREE_SPINS_AWARDED);

  const assisted = evaluateReelsV2(["⭐", "⭐", "🃏"], 10);

  assert.equal(assisted.multiplier, 10);
  assert.equal(assisted.freeSpinsWon, FREE_SPINS_AWARDED);
});

test("V2 : trois diamants avec ou sans wild declenchent le jackpot", () => {
  const natural = evaluateReelsV2(["💎", "💎", "💎"], 10);

  assert.equal(natural.jackpotWon, true);
  assert.equal(natural.multiplier, 10);

  const assisted = evaluateReelsV2(["💎", "🃏", "💎"], 10);

  assert.equal(assisted.jackpotWon, true);
  assert.equal(assisted.multiplier, 5);

  assert.equal(evaluateReelsV2(["💎", "💎", "🍒"], 10).jackpotWon, false);
});

test("V2 : createReelsV2 respecte les bornes de la table de poids", () => {
  const reelAt = (value: number) => createReelsV2(() => value)[0];

  assert.equal(reelAt(0), "🍒");
  assert.equal(reelAt(3.5 / 33), "🍒");
  assert.equal(reelAt(4.5 / 33), "🍋");
  assert.equal(reelAt(31.5 / 33), "🍉");
  assert.equal(reelAt(32.5 / 33), "🃏");
  assert.equal(reelAt(1), "🃏");
});

test("V2 : spinV2 combine tirage pondere et evaluation", () => {
  const values = [32.5 / 33, 32.5 / 33, 0.5 / 33];
  const outcome = spinV2(20, () => values.shift() ?? 0);

  assert.deepEqual(outcome.reels, ["🃏", "🃏", "🍒"]);
  assert.equal(outcome.multiplier, 5);
  assert.equal(outcome.payout, 100);
  assert.equal(outcome.net, 80);
  assert.equal(outcome.wildAssisted, true);
});

test("V2 : la contribution jackpot vaut 1 % de la mise", () => {
  assert.equal(JACKPOT_CONTRIBUTION_RATE, 0.01);
  assert.equal(getJackpotContribution(100), 1);
  assert.equal(getJackpotContribution(250), 2.5);
});
