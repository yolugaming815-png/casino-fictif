import assert from "node:assert/strict";
import test from "node:test";
import { loadSettledKeys, rememberSettledKey } from "./onlineSettlement.ts";

type GlobalWithStorage = typeof globalThis & { localStorage?: unknown };

function stubLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const stub = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  (globalThis as GlobalWithStorage).localStorage = stub;
  return store;
}

function clearLocalStorage() {
  delete (globalThis as GlobalWithStorage).localStorage;
}

test("roundtrip : rememberSettledKey puis loadSettledKeys", () => {
  stubLocalStorage();
  try {
    assert.deepEqual([...loadSettledKeys("casino-test")], []);

    rememberSettledKey("casino-test", "room1:bet:uid1");
    rememberSettledKey("casino-test", "room1:result:uid1");
    rememberSettledKey("casino-test", "room1:bet:uid1");

    const keys = loadSettledKeys("casino-test");
    assert.equal(keys.size, 2);
    assert.ok(keys.has("room1:bet:uid1"));
    assert.ok(keys.has("room1:result:uid1"));
  } finally {
    clearLocalStorage();
  }
});

test("cap a 500 cles en gardant les plus recentes", () => {
  stubLocalStorage();
  try {
    for (let index = 0; index < 520; index += 1) {
      rememberSettledKey("casino-cap", `key-${index}`);
    }

    const keys = loadSettledKeys("casino-cap");
    assert.equal(keys.size, 500);
    assert.ok(!keys.has("key-0"));
    assert.ok(!keys.has("key-19"));
    assert.ok(keys.has("key-20"));
    assert.ok(keys.has("key-519"));
  } finally {
    clearLocalStorage();
  }
});

test("robuste face a un JSON invalide ou inattendu", () => {
  const store = stubLocalStorage({
    "casino-bad": "{pas du json[",
    "casino-object": JSON.stringify({ foo: "bar" }),
    "casino-mixed": JSON.stringify(["ok", 42, null, "aussi-ok"]),
  });
  try {
    assert.deepEqual([...loadSettledKeys("casino-bad")], []);
    assert.deepEqual([...loadSettledKeys("casino-object")], []);
    assert.deepEqual([...loadSettledKeys("casino-mixed")], ["ok", "aussi-ok"]);

    rememberSettledKey("casino-bad", "nouvelle-cle");
    assert.deepEqual([...loadSettledKeys("casino-bad")], ["nouvelle-cle"]);
    assert.ok(store.has("casino-bad"));
  } finally {
    clearLocalStorage();
  }
});

test("ne throw pas sans localStorage (SSR/test)", () => {
  clearLocalStorage();
  assert.deepEqual([...loadSettledKeys("casino-ssr")], []);
  assert.doesNotThrow(() => rememberSettledKey("casino-ssr", "cle"));
  assert.deepEqual([...loadSettledKeys("casino-ssr")], []);
});
