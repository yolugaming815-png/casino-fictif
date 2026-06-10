import assert from "node:assert/strict";
import test from "node:test";
import { computeFriendBetSettlements, parseFriendBet, type FriendBetEntry } from "./friendBets.ts";

function buildBet(overrides: Partial<FriendBetEntry> = {}): FriendBetEntry {
  return parseFriendBet("bet-1", {
    creatorUid: "uid-creator",
    creatorName: "Daniel",
    opponentUid: "uid-opponent",
    opponentName: "Yoann",
    participants: ["uid-creator", "uid-opponent"],
    title: "Le premier qui rate son service paie",
    stake: 500,
    status: "active",
    ...overrides,
  });
}

test("parseFriendBet remplit des valeurs sures par defaut", () => {
  const bet = parseFriendBet("bet-vide", {});

  assert.equal(bet.id, "bet-vide");
  assert.equal(bet.creatorUid, "");
  assert.equal(bet.creatorName, "Joueur anonyme");
  assert.deepEqual(bet.participants, []);
  assert.equal(bet.title, "");
  assert.equal(bet.stake, 0);
  assert.equal(bet.status, "proposed");
  assert.equal(bet.creatorEscrowed, false);
  assert.equal(bet.winnerUid, "");
  assert.equal(bet.payoutClaimed, false);
});

test("parseFriendBet ignore un statut inconnu et filtre les participants", () => {
  const bet = parseFriendBet("bet-2", {
    status: "explose",
    participants: ["uid-creator", 42, null, "uid-opponent"],
    stake: 250.9,
  });

  assert.equal(bet.status, "proposed");
  assert.deepEqual(bet.participants, ["uid-creator", "uid-opponent"]);
  assert.equal(bet.stake, 250);
});

test("aucun reglement pour un pari propose ou decline sans sequestre", () => {
  assert.deepEqual(computeFriendBetSettlements([buildBet({ status: "proposed" })], "uid-creator"), []);
  assert.deepEqual(computeFriendBetSettlements([buildBet({ status: "declined" })], "uid-creator"), []);
  assert.deepEqual(computeFriendBetSettlements([buildBet({ status: "active" })], "uid-spectateur"), []);
});

test("pari actif : debit de la mise pour chaque participant", () => {
  const bets = [buildBet()];

  const creatorSettlements = computeFriendBetSettlements(bets, "uid-creator");
  assert.equal(creatorSettlements.length, 1);
  assert.equal(creatorSettlements[0].key, "bet-1:escrow:uid-creator");
  assert.equal(creatorSettlements[0].delta, -500);

  const opponentSettlements = computeFriendBetSettlements(bets, "uid-opponent");
  assert.equal(opponentSettlements.length, 1);
  assert.equal(opponentSettlements[0].key, "bet-1:escrow:uid-opponent");
  assert.equal(opponentSettlements[0].delta, -500);
});

test("pari resolu : le vainqueur recoit 2x la mise en plus du debit", () => {
  const bets = [buildBet({ status: "resolved", winnerUid: "uid-opponent" })];

  const winnerSettlements = computeFriendBetSettlements(bets, "uid-opponent");
  assert.equal(winnerSettlements.length, 2);
  assert.deepEqual(
    winnerSettlements.map((settlement) => [settlement.key, settlement.delta]),
    [
      ["bet-1:escrow:uid-opponent", -500],
      ["bet-1:payout", 1000],
    ],
  );

  const loserSettlements = computeFriendBetSettlements(bets, "uid-creator");
  assert.equal(loserSettlements.length, 1);
  assert.equal(loserSettlements[0].key, "bet-1:escrow:uid-creator");
  assert.equal(loserSettlements[0].delta, -500);
});

test("pari annule apres sequestre : remboursement uniquement pour ceux qui ont mise", () => {
  const bets = [buildBet({ status: "canceled", creatorEscrowed: true, opponentEscrowed: false })];

  const creatorSettlements = computeFriendBetSettlements(bets, "uid-creator");
  assert.equal(creatorSettlements.length, 1);
  assert.equal(creatorSettlements[0].key, "bet-1:refund:uid-creator");
  assert.equal(creatorSettlements[0].delta, 500);

  assert.deepEqual(computeFriendBetSettlements(bets, "uid-opponent"), []);
});

test("pari decline apres sequestre : remboursement", () => {
  const bets = [buildBet({ status: "declined", creatorEscrowed: true })];

  const settlements = computeFriendBetSettlements(bets, "uid-creator");
  assert.equal(settlements.length, 1);
  assert.equal(settlements[0].key, "bet-1:refund:uid-creator");
  assert.equal(settlements[0].delta, 500);
});

test("mise nulle ou pari corrompu : aucun reglement", () => {
  const bets = [buildBet({ stake: 0, status: "resolved", winnerUid: "uid-creator" })];
  assert.deepEqual(computeFriendBetSettlements(bets, "uid-creator"), []);
});

test("garde serveur : flag escrowed pose par un AUTRE appareil => pas de re-debit", () => {
  // Nouveau navigateur (settledKeys vide) : le flag Firestore atteste que l'escrow
  // a deja ete applique ailleurs, on ne re-debite pas.
  const bets = [buildBet({ creatorEscrowed: true })];
  assert.deepEqual(computeFriendBetSettlements(bets, "uid-creator"), []);

  // L'adversaire n'a pas encore son flag : son escrow reste emis.
  const opponentSettlements = computeFriendBetSettlements(bets, "uid-opponent");
  assert.equal(opponentSettlements.length, 1);
  assert.equal(opponentSettlements[0].key, "bet-1:escrow:uid-opponent");
});

test("garde serveur : flag payoutClaimed => pas de re-credit sur un autre appareil", () => {
  const bets = [buildBet({ status: "resolved", winnerUid: "uid-opponent", payoutClaimed: true, opponentEscrowed: true })];
  assert.deepEqual(computeFriendBetSettlements(bets, "uid-opponent"), []);
});

test("garde serveur : flags refunded => pas de re-remboursement", () => {
  const bets = [buildBet({ status: "canceled", creatorEscrowed: true, creatorRefunded: true })];
  assert.deepEqual(computeFriendBetSettlements(bets, "uid-creator"), []);
});

test("cle locale presente : le flag pose par CE client ne bloque pas l'emission (dedup locale)", () => {
  // Ce client vient d'appliquer escrow+payout puis a pose les flags : avec ses cles
  // locales, les entrees restent emises (et seront dedupees par applyOnlineSettlements).
  const bets = [buildBet({ status: "resolved", winnerUid: "uid-creator", creatorEscrowed: true, payoutClaimed: true })];
  const settledKeys = new Set(["bet-1:escrow:uid-creator", "bet-1:payout"]);

  const settlements = computeFriendBetSettlements(bets, "uid-creator", settledKeys);
  assert.deepEqual(
    settlements.map((settlement) => [settlement.key, settlement.delta]),
    [
      ["bet-1:escrow:uid-creator", -500],
      ["bet-1:payout", 1000],
    ],
  );

  const refundBets = [buildBet({ status: "canceled", creatorEscrowed: true, creatorRefunded: true })];
  const refunds = computeFriendBetSettlements(refundBets, "uid-creator", new Set(["bet-1:refund:uid-creator"]));
  assert.equal(refunds.length, 1);
  assert.equal(refunds[0].key, "bet-1:refund:uid-creator");
});
