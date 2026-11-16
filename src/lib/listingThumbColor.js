/** Vibrant placeholder backgrounds (works without Tailwind safelist) */

const PLACEHOLDER_GRADIENTS = [
  ["oklch(0.68 0.19 45)", "oklch(0.58 0.17 55)"],
  ["oklch(0.65 0.22 15)", "oklch(0.58 0.21 350)"],
  ["oklch(0.62 0.21 295)", "oklch(0.58 0.2 305)"],
  ["oklch(0.68 0.15 235)", "oklch(0.52 0.18 265)"],
  ["oklch(0.7 0.16 165)", "oklch(0.58 0.12 180)"],
  ["oklch(0.66 0.22 325)", "oklch(0.55 0.22 285)"],
  ["oklch(0.75 0.16 75)", "oklch(0.62 0.17 55)"],
  ["oklch(0.72 0.14 210)", "oklch(0.55 0.14 250)"],
];

function hashSeed(seed) {
  if (!seed) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Inline style for avatars / thumbs — always renders color (no dynamic Tailwind).
 * @param {string} [seed]
 */
export function getListingThumbGradientStyle(seed) {
  const idx = hashSeed(seed) % PLACEHOLDER_GRADIENTS.length;
  const [from, to] = PLACEHOLDER_GRADIENTS[idx];
  return {
    backgroundImage: `linear-gradient(to bottom right in oklch, ${from}, ${to})`,
  };
}