# Casino UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Casino fictif homepage as the approved premium lobby UI and expose a typed registry for future 16:9 and 9:16 animation assets.

**Architecture:** Keep existing gameplay/Firebase state in `src/App.tsx`, but factor the home lobby into focused presentational components and a typed animation registry. The new lobby calls existing section/game navigation handlers and does not change persisted save data or game logic.

**Tech Stack:** React 19, TypeScript, Vite, CSS Modules, Node native test runner.

---

## File Structure

- Create `src/animationAssets.ts`: typed animation asset registry and helper lookup.
- Create `src/animationAssets.test.ts`: Node tests for the registry contract.
- Modify `src/App.tsx`: import registry types, replace the old `HomeDashboard` with a lobby composed of new local components, pass existing state and navigation handlers.
- Modify `src/App.module.css`: add option-A lobby styling and adjust app shell/header/status/nav layout to match the approved concept.
- Modify `package.json`: add `src/animationAssets.test.ts` to the native test command.

## Task 1: Animation Asset Registry

**Files:**
- Create: `src/animationAssets.test.ts`
- Create: `src/animationAssets.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing registry test**

Create `src/animationAssets.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANIMATION_ASSETS, getAnimationAsset } from "./animationAssets.ts";

describe("animation asset registry", () => {
  it("exposes stable 16:9 and 9:16 assets for the lobby", () => {
    const ids = ANIMATION_ASSETS.map((asset) => asset.id);

    assert.deepEqual(ids, [
      "hero-duel-16x9",
      "dragon-spin-card-9x16",
      "blackjack-card-9x16",
      "roulette-card-9x16",
      "reward-chest-16x9",
    ]);
    assert.equal(getAnimationAsset("hero-duel-16x9")?.aspect, "16:9");
    assert.equal(getAnimationAsset("dragon-spin-card-9x16")?.aspect, "9:16");
  });

  it("keeps prompts loop-ready without mentioning duration limits", () => {
    for (const asset of ANIMATION_ASSETS) {
      assert.match(asset.prompt, /first and last frame strictly identical/i);
      assert.doesNotMatch(asset.prompt, /10 seconds|ten seconds|duration|max/i);
      assert.ok(asset.placement.length > 0);
      assert.ok(asset.title.length > 0);
      assert.ok(asset.trigger === "hover" || asset.trigger === "slow-loop");
    }
  });
});
```

- [ ] **Step 2: Add the test command entry and verify red**

Modify `package.json` test script to include `src/animationAssets.test.ts`.

Run: `npm test`

Expected: FAIL with module-not-found for `./animationAssets.ts`.

- [ ] **Step 3: Implement the registry**

Create `src/animationAssets.ts`:

```ts
export type AnimationAspect = "16:9" | "9:16";
export type AnimationTrigger = "hover" | "slow-loop";

export type AnimationAsset = {
  id: string;
  title: string;
  aspect: AnimationAspect;
  trigger: AnimationTrigger;
  placement: string;
  prompt: string;
};

export const ANIMATION_ASSETS = [
  {
    id: "hero-duel-16x9",
    title: "Hero duel lobby",
    aspect: "16:9",
    trigger: "slow-loop",
    placement: "Lobby hero",
    prompt:
      "Rival casino players face each other across a glowing VS scene with floating chips, trophy light, slot reels and violet-gold energy. Perfect seamless loop with first and last frame strictly identical. Eye-catching premium social casino energy, inviting the player to click and join.",
  },
  {
    id: "dragon-spin-card-9x16",
    title: "Dragon spin game card",
    aspect: "9:16",
    trigger: "hover",
    placement: "Popular games card",
    prompt:
      "A golden dragon coils around bright slot symbols and coins, sparks and chip glints orbiting in a seamless loop. First and last frame strictly identical. High contrast, premium casino card art, click-enticing motion.",
  },
  {
    id: "blackjack-card-9x16",
    title: "Blackjack game card",
    aspect: "9:16",
    trigger: "hover",
    placement: "Popular games card",
    prompt:
      "Blackjack cards, chips and green table light pulse subtly while a soft gold rim light travels across the card faces. Perfect seamless loop with first and last frame strictly identical. Elegant, readable, click-enticing.",
  },
  {
    id: "roulette-card-9x16",
    title: "Roulette game card",
    aspect: "9:16",
    trigger: "hover",
    placement: "Popular games card",
    prompt:
      "Roulette wheel glow rotates subtly with sparks, chips and red-black highlights moving in a seamless circular rhythm. First and last frame strictly identical. Premium casino energy, inviting hover motion.",
  },
  {
    id: "reward-chest-16x9",
    title: "Daily reward chest strip",
    aspect: "16:9",
    trigger: "hover",
    placement: "Lobby reward strip",
    prompt:
      "A treasure chest opens with gold coins, purple gems and soft light beams rising, then returns to the identical opening frame for a perfect seamless loop. First and last frame strictly identical. Eye-catching reward moment that makes the player want to click.",
  },
] as const satisfies readonly AnimationAsset[];

export type AnimationAssetId = (typeof ANIMATION_ASSETS)[number]["id"];

export function getAnimationAsset(id: AnimationAssetId): AnimationAsset | undefined {
  return ANIMATION_ASSETS.find((asset) => asset.id === id);
}
```

- [ ] **Step 4: Verify green**

Run: `npm test`

Expected: PASS, including the new registry tests.

## Task 2: Lobby Components And Wiring

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import animation registry and types**

Add:

```ts
import { getAnimationAsset, type AnimationAssetId } from "./animationAssets";
```

- [ ] **Step 2: Replace the home rendering props**

In the `activeSection === "home"` branch, pass the data needed by the new lobby:

```tsx
<HomeDashboard
  activityCount={activityBadgeCount}
  balance={balance}
  currentUserId={accountUser?.uid ?? null}
  leaderboard={leaderboard}
  leaderboardMessage={leaderboardMessage}
  remainingAds={Math.max(0, DAILY_REWARDED_AD_LIMIT - normalizeRewardedAds(rewardedAds).watched)}
  onGoTo={(section) => setActiveSection(section)}
  onOpenProfile={handleOpenPlayerProfile}
  onSelectGame={selectGame}
  onSelectOnlineGame={selectOnlineGame}
/>
```

- [ ] **Step 3: Replace `HomeDashboard` with the lobby implementation**

Replace the old `HomeDashboard` function with a composition that renders:

- `LobbyHero`
- `PopularGames`
- `LobbyLeaderboard`
- `LobbyTournaments`
- `RewardStrip`
- `LobbyPromoGrid`
- `LobbyStats`

The implementation must call existing handlers only; no game logic changes.

- [ ] **Step 4: Add helper components**

Add local components below `HomeDashboard`:

- `AnimatedMedia`
- `LobbyHero`
- `PopularGames`
- `LobbyLeaderboard`
- `LobbyTournaments`
- `RewardStrip`
- `LobbyPromoGrid`
- `LobbyStats`

`AnimatedMedia` must render:

```tsx
data-animatable-id={asset.id}
data-aspect={asset.aspect}
data-animation-trigger={asset.trigger}
data-animation-prompt={asset.prompt}
```

- [ ] **Step 5: Build-check TypeScript**

Run: `npm run build`

Expected: TypeScript succeeds or only surfaces CSS/markup issues to fix in Task 3.

## Task 3: Option-A Visual Styling

**Files:**
- Modify: `src/App.module.css`

- [ ] **Step 1: Restyle the app shell**

Update `.app`, `.shell`, `.header`, `.statusBar`, `.modeTabs`, `.mobileMenuButton`, and related responsive rules so desktop matches a premium lobby:

- dark navy/black base
- violet/gold accents
- top header and compact left rail
- content width close to the approved concept
- no text overlap on mobile

- [ ] **Step 2: Add lobby section styles**

Add styles for:

- `.lobby`
- `.lobbyHero`
- `.heroBackdrop`
- `.animatedMedia`
- `.popularGames`
- `.lobbyGameCard`
- `.lobbySideColumn`
- `.lobbyLeaderboard`
- `.lobbyTournaments`
- `.rewardStrip`
- `.lobbyPromoGrid`
- `.lobbyStats`

Use stable aspect ratios for 16:9 and 9:16 zones.

- [ ] **Step 3: Add hover and slow-loop motion**

Use CSS only:

- `data-animation-trigger="hover"`: animate on hover/focus.
- `data-animation-trigger="slow-loop"`: subtle continuous motion.
- Respect `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 4: Verify responsive layout**

Run dev server and inspect desktop and mobile. Fix text overflow or layout overlap.

## Task 4: Final Verification

**Files:**
- Verify only unless failures require fixes.

- [ ] **Step 1: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Browser QA**

Open the Vite dev server in the in-app browser. Verify:

- hero CTA navigates to games
- popular game card click opens the intended game
- leaderboard row opens profile when data exists
- bonus/shop CTA works
- pause toggle remains accessible
- animatable elements exist in DOM with `data-animatable-id`, `data-aspect`, `data-animation-trigger`, and `data-animation-prompt`

- [ ] **Step 4: Visual comparison**

Compare the rendered UI against:

- `docs/superpowers/specs/assets/casino-ui-option-a-concept.png`
- `ChatGPT Image May 30, 2026, 01_33_54 PM.png`

Fix material mismatches that are practical in this pass.
