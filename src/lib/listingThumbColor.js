/** Vibrant placeholder backgrounds (works without Tailwind safelist) */

const PLACEHOLDER_GRADIENTS = [
  ["#f97316", "#d97706"],
  ["#f43f5e", "#db2777"],
  ["#8b5cf6", "#9333ea"],
  ["#0ea5e9", "#2563eb"],
  ["#10b981", "#0d9488"],
  ["#d946ef", "#7c3aed"],
  ["#f59e0b", "#ea580c"],
  ["#06b6d4", "#0284c7"],
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
    backgroundImage: `linear-gradient(to bottom right, ${from}, ${to})`,
  };
}