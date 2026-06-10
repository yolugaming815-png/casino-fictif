import assert from "node:assert/strict";
import test from "node:test";
import { deriveRng, hashSeed, mulberry32 } from "./seededRng.ts";

test("mulberry32 est deterministe pour un meme seed", () => {
  const first = mulberry32(123456789);
  const second = mulberry32(123456789);
  const firstSequence = Array.from({ length: 20 }, () => first());
  const secondSequence = Array.from({ length: 20 }, () => second());

  assert.deepEqual(firstSequence, secondSequence);
});

test("mulberry32 produit des sequences differentes pour des seeds differents", () => {
  const first = Array.from({ length: 5 }, mulberry32(1));
  const second = Array.from({ length: 5 }, mulberry32(2));

  assert.notDeepEqual(first, second);
});

test("mulberry32 tire 1000 valeurs dans [0, 1) avec une distribution grossiere", () => {
  const rng = mulberry32(987654321);
  const draws = Array.from({ length: 1000 }, () => rng());

  assert.ok(draws.every((value) => value >= 0 && value < 1));

  const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length;
  assert.ok(mean > 0.4 && mean < 0.6, `moyenne hors plage : ${mean}`);

  const below = draws.filter((value) => value < 0.5).length;
  assert.ok(below > 350 && below < 650, `repartition hors plage : ${below}`);
});

test("hashSeed est deterministe et sensible aux parametres", () => {
  assert.equal(hashSeed(42, "round", 1), hashSeed(42, "round", 1));
  assert.notEqual(hashSeed(42, "round", 1), hashSeed(42, "round", 2));
  assert.notEqual(hashSeed("a", "b"), hashSeed("ab"));

  const value = hashSeed(7, "x");
  assert.ok(Number.isInteger(value) && value >= 0 && value <= 4294967295);
});

test("deriveRng est deterministe et change selon le round", () => {
  const roundZeroA = Array.from({ length: 10 }, deriveRng(1337, 0));
  const roundZeroB = Array.from({ length: 10 }, deriveRng(1337, 0));
  const roundOne = Array.from({ length: 10 }, deriveRng(1337, 1));

  assert.deepEqual(roundZeroA, roundZeroB);
  assert.notDeepEqual(roundZeroA, roundOne);
});
