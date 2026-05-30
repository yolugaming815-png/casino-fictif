export type AnimationAspect = "16:9" | "9:16";
export type AnimationTrigger = "hover" | "slow-loop";

export type AnimationAsset = {
  id: string;
  title: string;
  aspect: AnimationAspect;
  trigger: AnimationTrigger;
  placement: string;
  image: string;
  prompt: string;
};

export const ANIMATION_ASSETS = [
  {
    id: "hero-duel-16x9",
    title: "Hero duel lobby",
    aspect: "16:9",
    trigger: "slow-loop",
    placement: "Lobby hero",
    image: new URL("./assets/lobby/hero-duel-16x9.png", import.meta.url).href,
    prompt:
      "Rival casino players face each other across a glowing VS scene with floating chips, trophy light, slot reels and violet-gold energy. Perfect seamless loop with first and last frame strictly identical. Eye-catching premium social casino energy, inviting the player to click and join.",
  },
  {
    id: "dragon-spin-card-9x16",
    title: "Dragon spin game card",
    aspect: "9:16",
    trigger: "hover",
    placement: "Popular games card",
    image: new URL("./assets/lobby/game-dragon-spin-9x16.png", import.meta.url).href,
    prompt:
      "A golden dragon coils around bright slot symbols and coins, sparks and chip glints orbiting in a seamless loop. First and last frame strictly identical. High contrast, premium casino card art, click-enticing motion.",
  },
  {
    id: "blackjack-card-9x16",
    title: "Blackjack game card",
    aspect: "9:16",
    trigger: "hover",
    placement: "Popular games card",
    image: new URL("./assets/lobby/game-blackjack-9x16.png", import.meta.url).href,
    prompt:
      "Blackjack cards, chips and green table light pulse subtly while a soft gold rim light travels across the card faces. Perfect seamless loop with first and last frame strictly identical. Elegant, readable, click-enticing.",
  },
  {
    id: "roulette-card-9x16",
    title: "Roulette game card",
    aspect: "9:16",
    trigger: "hover",
    placement: "Popular games card",
    image: new URL("./assets/lobby/game-roulette-9x16.png", import.meta.url).href,
    prompt:
      "Roulette wheel glow rotates subtly with sparks, chips and red-black highlights moving in a seamless circular rhythm. First and last frame strictly identical. Premium casino energy, inviting hover motion.",
  },
  {
    id: "battle-poker-card-9x16",
    title: "Battle poker game card",
    aspect: "9:16",
    trigger: "hover",
    placement: "Popular games card",
    image: new URL("./assets/lobby/game-battle-poker-9x16.png", import.meta.url).href,
    prompt:
      "Two poker hands clash in a violet VS burst, chips drift outward, card edges glow and settle back into a perfect seamless loop with first and last frame strictly identical. Competitive social casino energy.",
  },
  {
    id: "gems-quest-card-9x16",
    title: "Gems quest game card",
    aspect: "9:16",
    trigger: "hover",
    placement: "Popular games card",
    image: new URL("./assets/lobby/game-gems-quest-9x16.png", import.meta.url).href,
    prompt:
      "A mega diamond rotates slowly over a casino table while cyan light rays and tiny gems pulse, then returns to the exact same frame for a seamless loop with first and last frame strictly identical. Reward-focused click-enticing motion.",
  },
  {
    id: "reward-chest-16x9",
    title: "Daily reward chest strip",
    aspect: "16:9",
    trigger: "hover",
    placement: "Lobby reward strip",
    image: new URL("./assets/lobby/reward-chest-16x9.png", import.meta.url).href,
    prompt:
      "A treasure chest opens with gold coins, purple gems and soft light beams rising, then returns to the identical opening frame for a perfect seamless loop. First and last frame strictly identical. Eye-catching reward moment that makes the player want to click.",
  },
  {
    id: "promo-friends-16x9",
    title: "Friends duel promo",
    aspect: "16:9",
    trigger: "hover",
    placement: "Lobby promo grid",
    image: new URL("./assets/lobby/promo-friends-16x9.png", import.meta.url).href,
    prompt:
      "Two friends lock into a duel, chips float between them, a soft purple spark travels across the table and returns to the identical first frame for a seamless loop. First and last frame strictly identical.",
  },
  {
    id: "promo-profile-16x9",
    title: "Profile customization promo",
    aspect: "16:9",
    trigger: "hover",
    placement: "Lobby promo grid",
    image: new URL("./assets/lobby/promo-profile-16x9.png", import.meta.url).href,
    prompt:
      "Avatar badges orbit slowly around the player, jacket highlights shimmer, mirror light breathes and returns to the identical first frame for a seamless loop. First and last frame strictly identical.",
  },
  {
    id: "promo-rewards-16x9",
    title: "Rewards promo",
    aspect: "16:9",
    trigger: "hover",
    placement: "Lobby promo grid",
    image: new URL("./assets/lobby/promo-rewards-16x9.png", import.meta.url).href,
    prompt:
      "Coins and purple gems rise from the chest in a slow arc, light beams pulse, then all particles return to the identical first frame for a seamless loop. First and last frame strictly identical.",
  },
  {
    id: "tournament-cup-16x9",
    title: "Tournament cup",
    aspect: "16:9",
    trigger: "hover",
    placement: "Lobby tournament rows",
    image: new URL("./assets/lobby/tournament-cup-16x9.png", import.meta.url).href,
    prompt:
      "The trophy glows while chips orbit and purple spotlights sweep softly, returning to the identical first frame for a seamless loop. First and last frame strictly identical.",
  },
] as const satisfies readonly AnimationAsset[];

export type AnimationAssetId = (typeof ANIMATION_ASSETS)[number]["id"];

export function getAnimationAsset(id: AnimationAssetId): AnimationAsset | undefined {
  return ANIMATION_ASSETS.find((asset) => asset.id === id);
}
