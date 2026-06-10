import assert from "node:assert/strict";
import test from "node:test";
import { CARD_RANKS, createDeck, type Card } from "./blackjackLogic.ts";
import {
  HILO_HOUSE_EDGE,
  cardValue,
  drawHiLoCard,
  drawHiLoNextCard,
  getHiLoCounts,
  getHiLoMultiplier,
  resolveHiLoGuess,
} from "./hiLoLogic.ts";

function makeCard(rank: Card["rank"], suit: Card["suit"] = "♠"): Card {
  return { rank, suit };
}

test("attribue les valeurs hi-lo de A=1 a K=13", () => {
  CARD_RANKS.forEach((rank, index) => {
    assert.equal(cardValue(makeCard(rank)), index + 1);
  });
});

test("compte higher/lower/tie pour les 13 rangs", () => {
  for (const rank of CARD_RANKS) {
    const card = makeCard(rank);
    const value = cardValue(card);
    const counts = getHiLoCounts(card);

    assert.equal(counts.higher, (13 - value) * 4);
    assert.equal(counts.lower, (value - 1) * 4);
    assert.equal(counts.tie, 3);
    assert.equal(counts.higher + counts.lower + counts.tie, 51);
  }
});

test("controle les multiplicateurs du 7, du 2, du K et de l'A", () => {
  assert.equal(getHiLoMultiplier(makeCard("7"), "higher"), 1.94);
  assert.equal(getHiLoMultiplier(makeCard("7"), "lower"), 1.94);
  assert.equal(getHiLoMultiplier(makeCard("2"), "higher"), 1.06);
  assert.equal(getHiLoMultiplier(makeCard("2"), "lower"), 11.64);
  assert.equal(getHiLoMultiplier(makeCard("K"), "higher"), null);
  assert.equal(getHiLoMultiplier(makeCard("K"), "lower"), 0.97);
  assert.equal(getHiLoMultiplier(makeCard("A"), "lower"), null);
  assert.equal(getHiLoMultiplier(makeCard("A"), "higher"), 0.97);
});

test("respecte la propriete EV mult x winCount / (higher+lower) ~ 0.97", () => {
  for (const rank of CARD_RANKS) {
    const card = makeCard(rank);
    const counts = getHiLoCounts(card);

    for (const guess of ["higher", "lower"] as const) {
      const multiplier = getHiLoMultiplier(card, guess);
      const winCount = guess === "higher" ? counts.higher : counts.lower;

      if (multiplier === null) {
        assert.equal(winCount, 0);
        continue;
      }

      const ev = (multiplier * winCount) / (counts.higher + counts.lower);
      assert.ok(Math.abs(ev - HILO_HOUSE_EDGE) <= 0.01, `EV ${ev} hors tolerance pour ${rank} ${guess}`);
    }
  }
});

test("tire une carte uniforme parmi les 52", () => {
  const deck = createDeck();

  assert.deepEqual(drawHiLoCard(() => 0), deck[0]);
  assert.deepEqual(drawHiLoCard(() => 0.999999), deck[51]);
});

test("tire la carte suivante parmi les 51 differentes de la courante", () => {
  const current = makeCard("7", "♥");

  for (let step = 0; step < 51; step += 1) {
    const next = drawHiLoNextCard(current, () => step / 51);
    assert.ok(next.rank !== current.rank || next.suit !== current.suit);
  }
});

test("resout la devinette higher/lower", () => {
  assert.equal(resolveHiLoGuess(makeCard("7"), makeCard("K"), "higher"), "win");
  assert.equal(resolveHiLoGuess(makeCard("7"), makeCard("2"), "higher"), "lose");
  assert.equal(resolveHiLoGuess(makeCard("7"), makeCard("2"), "lower"), "win");
  assert.equal(resolveHiLoGuess(makeCard("7"), makeCard("K"), "lower"), "lose");
});

test("pousse sur un rang identique quelle que soit la devinette", () => {
  assert.equal(resolveHiLoGuess(makeCard("7", "♠"), makeCard("7", "♦"), "higher"), "push");
  assert.equal(resolveHiLoGuess(makeCard("7", "♠"), makeCard("7", "♦"), "lower"), "push");
});
