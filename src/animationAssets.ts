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
