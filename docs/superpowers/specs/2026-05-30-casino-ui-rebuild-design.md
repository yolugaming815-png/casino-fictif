# Casino UI Rebuild Design

## Status

Approved direction: option A, "lobby premium fidèle à l'image".

Reference concept: `docs/superpowers/specs/assets/casino-ui-option-a-concept.png`

The UI must be inspired by the provided `ChatGPT Image May 30, 2026, 01_33_54 PM.png`: dark premium casino lobby, violet and gold lighting, strong social competition, visible game cards, tournaments, leaderboard, chat/activity, rewards, and virtual-credit safety.

## Goals

- Rebuild the first experience as a premium casino lobby rather than a plain app dashboard.
- Keep the existing React/Vite app, game rules, Firebase behavior, and saved data model intact.
- Keep "credits virtuels uniquement" and the responsible pause action visible.
- Make future animated-image work easy by clearly identifying animatable image zones and storing animation prompts in code.
- Support both animation asset formats the user expects: `16:9` and `9:16`.
- Keep animation prompts loop-friendly: first and last frame strictly identical, eye-catching, click-oriented. Do not mention a duration limit in prompts.

## Non-Goals

- No real-money claims, payment UX, deposits, withdrawals, or anything implying gambling with real money.
- No gameplay logic rewrite in this pass.
- No Firebase rules or admin model changes in this pass.
- No replacing the entire app with a static marketing landing page.

## UX Direction

The app opens on a lobby screen:

- Top nav with brand, major areas, virtual credit balance, pause action, and account profile.
- Compact left rail for frequent destinations and responsible/virtual-credit status.
- Cinematic hero using a `16:9` animatable zone. Copy: "Joue. Défie. Deviens légende."
- Popular game cards using vertical `9:16` zones, especially slots, blackjack, roulette, poker/duel, and rewards.
- Right column with leaderboard and live/social activity using existing leaderboard, friend/message/trade/activity data.
- Tournament/mission rows using existing missions and online-room concepts.
- Reward strip or promo tiles for bonus, boutique, profile/inventory, and friends.

The lobby should feel close to the inspiration image, but controls, navigation, buttons, forms, leaderboard rows, and chat/activity text remain real code-native UI.

## Component Plan

Introduce small UI/data components around existing state rather than moving game rules:

- `animationAssets.ts`: registry of animatable visual zones and prompts.
- `AnimatedMedia`: wrapper that renders `data-animatable-id`, `data-aspect`, `data-animation-trigger`, and `data-animation-prompt`.
- `LobbyHero`: hero section with CTA to games/online and responsible virtual-credit messaging.
- `PopularGames`: visual cards that call existing section/game selection handlers.
- `LobbyLeaderboard`: wrapper around existing leaderboard data, tuned for the new layout.
- `LobbySocialFeed`: compact activity/chat-style surface fed by existing activity items and messages where available.
- `LobbyTournaments`: rows for missions/online/tournament-like calls to action.
- `RewardStrip`: bonus/chest/shop CTA with one `16:9` animatable reward asset.

Existing game components can stay in `src/App.tsx` for this pass, but the home/lobby area should be factored enough that the visual work is not buried in the central file.

## Animation Asset Registry

Each future animation target must be defined in a typed registry:

```ts
type AnimationAsset = {
  id: string;
  title: string;
  aspect: "16:9" | "9:16";
  trigger: "hover" | "slow-loop";
  placement: string;
  prompt: string;
};
```

Initial assets:

- `hero-duel-16x9`: lobby hero, `16:9`, `slow-loop`.
  Prompt: Rival casino players face each other across a glowing VS scene with floating chips, trophy light, slot reels and violet-gold energy. Perfect seamless loop with first and last frame strictly identical. Eye-catching premium social casino energy, inviting the player to click and join.

- `dragon-spin-card-9x16`: popular slots card, `9:16`, `hover`.
  Prompt: A golden dragon coils around bright slot symbols and coins, sparks and chip glints orbiting in a seamless loop. First and last frame strictly identical. High contrast, premium casino card art, click-enticing motion.

- `blackjack-card-9x16`: blackjack card, `9:16`, `hover`.
  Prompt: Blackjack cards, chips and green table light pulse subtly while a soft gold rim light travels across the card faces. Perfect seamless loop with first and last frame strictly identical. Elegant, readable, click-enticing.

- `roulette-card-9x16`: roulette card, `9:16`, `hover`.
  Prompt: Roulette wheel glow rotates subtly with sparks, chips and red-black highlights moving in a seamless circular rhythm. First and last frame strictly identical. Premium casino energy, inviting hover motion.

- `reward-chest-16x9`: daily reward strip, `16:9`, `hover`.
  Prompt: A treasure chest opens with gold coins, purple gems and soft light beams rising, then returns to the identical opening frame for a perfect seamless loop. First and last frame strictly identical. Eye-catching reward moment that makes the player want to click.

Implementation detail: these prompts are exposed as `data-animation-prompt` for exportability, but visible UI should not show prompt text.

## Responsive Behavior

- Desktop: top navigation, left rail, hero, main content plus right column visible.
- Tablet: top nav compacts, right column moves below the popular games.
- Mobile: top nav becomes compact, left rail becomes a bottom or drawer-style menu, hero remains first, game cards become horizontal scroll or two-column cards with fixed aspect ratios.
- Text must not overlap or overflow inside buttons/cards. Long names use truncation only where appropriate, never on primary hero copy.

## Data Flow

Use the existing app state:

- Balance and total net from current local/cloud save state.
- Account status and profile from existing Firebase auth state.
- Leaderboard from existing leaderboard loading/subscription.
- Activity/social badges from existing friend, trade, message, and activity calculations.
- CTAs call existing `selectMainSection`, `selectGame`, and `selectOnlineGame` flow.

The refactor should not change persisted save shape or Firestore document shape.

## Error Handling

- If Firebase is not configured, keep login disabled messaging and still render the lobby with local play.
- If leaderboard/activity data is empty, render polished empty states rather than blank panels.
- If generated or static art fails to load, the section should retain gradient/background fallback and readable text.
- Pause state still disables play actions as currently implemented.

## Testing And Verification

Required before handoff:

- `npm run build`
- `npm test` if logic or shared data behavior changes
- Run the local dev server and inspect desktop and mobile in the browser.
- Compare the implemented lobby against `docs/superpowers/specs/assets/casino-ui-option-a-concept.png` and the user-provided inspiration image.
- Verify at least these interactions: hero CTA to games, popular game card click, leaderboard profile click where available, bonus/shop CTA, pause toggle.
- Inspect DOM for animatable targets: every registered asset must render stable `data-animatable-id`, `data-aspect`, `data-animation-trigger`, and `data-animation-prompt`.

## Implementation Flexibility

Direction is chosen. Implementation can choose exact extracted component boundaries as long as the visual result matches the option A lobby and the registry/DOM contract above is kept.
