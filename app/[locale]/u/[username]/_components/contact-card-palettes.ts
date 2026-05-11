import type { ContactCardPalette } from "@/types";

/**
 * Holographic foil palettes — each maps to 6 HSL color stops driving the two stacked rainbow
 * shine gradients on the contact card. The order matters: the gradient walks through them in
 * sequence so neighboring colors should harmonize. Picking saturation 50-75% / lightness
 * 45-60% keeps the palette in "luxury metallic foil" range — high saturation reads as
 * Pokemon-card neon, low saturation reads as flat tint.
 *
 * <p>The card's substrate (the dark base behind the foil) is also palette-specific so the
 * overall tone shifts beyond just the iridescent layer — sapphire on a navy base reads
 * different from amethyst on indigo, even with similar saturation.
 *
 * <p>Keep ids in lockstep with the backend's ALLOWED_PALETTES (ContactCard.java).
 */

export type PaletteSpec = {
  id: ContactCardPalette;
  /** Display name for the picker UI. */
  label: string;
  /** 6 HSL color stops for the iridescent foil — walked through the gradient in order. */
  colors: [string, string, string, string, string, string];
  /** Base dark surface color (the substrate behind the foil layers). */
  substrate: string;
  /** Two ambient gradient overlay colors for the corners (rgba so they tint subtly). */
  ambient: [string, string];
};

export const PALETTES: readonly PaletteSpec[] = [
  {
    id: "amethyst",
    label: "Amethyst",
    colors: [
      "hsl(283,70%,58%)",
      "hsl(228,70%,55%)",
      "hsl(176,60%,52%)",
      "hsl(93,55%,48%)",
      "hsl(53,75%,55%)",
      "hsl(2,75%,58%)",
    ],
    substrate: "#0a0e1c",
    ambient: ["rgba(67, 56, 202, 0.25)", "rgba(157, 23, 77, 0.18)"],
  },
  {
    id: "rose-gold",
    label: "Rose Gold",
    colors: [
      "hsl(340,70%,62%)",
      "hsl(15,72%,60%)",
      "hsl(35,80%,62%)",
      "hsl(48,75%,58%)",
      "hsl(20,65%,55%)",
      "hsl(340,65%,55%)",
    ],
    substrate: "#1a0d12",
    ambient: ["rgba(190, 80, 100, 0.22)", "rgba(217, 119, 6, 0.18)"],
  },
  {
    id: "emerald",
    label: "Emerald",
    colors: [
      "hsl(160,60%,50%)",
      "hsl(170,65%,48%)",
      "hsl(145,55%,52%)",
      "hsl(190,60%,50%)",
      "hsl(155,60%,45%)",
      "hsl(160,60%,50%)",
    ],
    substrate: "#0a1812",
    ambient: ["rgba(16, 185, 129, 0.2)", "rgba(13, 148, 136, 0.15)"],
  },
  {
    id: "sapphire",
    label: "Sapphire",
    colors: [
      "hsl(220,75%,58%)",
      "hsl(200,72%,55%)",
      "hsl(180,65%,52%)",
      "hsl(240,68%,55%)",
      "hsl(210,75%,50%)",
      "hsl(220,75%,58%)",
    ],
    substrate: "#0a1322",
    ambient: ["rgba(37, 99, 235, 0.25)", "rgba(8, 145, 178, 0.18)"],
  },
  {
    id: "sunset",
    label: "Sunset",
    colors: [
      "hsl(15,80%,60%)",
      "hsl(345,75%,58%)",
      "hsl(330,65%,55%)",
      "hsl(0,78%,60%)",
      "hsl(25,80%,62%)",
      "hsl(15,80%,60%)",
    ],
    substrate: "#1a0e0a",
    ambient: ["rgba(234, 88, 12, 0.25)", "rgba(190, 24, 93, 0.18)"],
  },
  {
    id: "midnight",
    label: "Midnight",
    colors: [
      "hsl(250,55%,48%)",
      "hsl(220,55%,45%)",
      "hsl(280,55%,48%)",
      "hsl(240,50%,42%)",
      "hsl(260,55%,45%)",
      "hsl(250,55%,48%)",
    ],
    substrate: "#050811",
    ambient: ["rgba(67, 56, 202, 0.2)", "rgba(99, 102, 241, 0.15)"],
  },
  {
    id: "champagne",
    label: "Champagne",
    colors: [
      "hsl(48,70%,60%)",
      "hsl(35,65%,55%)",
      "hsl(55,75%,62%)",
      "hsl(28,65%,52%)",
      "hsl(45,75%,60%)",
      "hsl(48,70%,60%)",
    ],
    substrate: "#1a1408",
    ambient: ["rgba(217, 119, 6, 0.25)", "rgba(180, 83, 9, 0.2)"],
  },
  {
    id: "aurora",
    label: "Aurora",
    colors: [
      "hsl(160,70%,55%)",
      "hsl(180,65%,55%)",
      "hsl(220,70%,55%)",
      "hsl(280,65%,55%)",
      "hsl(330,70%,55%)",
      "hsl(160,70%,55%)",
    ],
    substrate: "#0a121a",
    ambient: ["rgba(16, 185, 129, 0.22)", "rgba(168, 85, 247, 0.18)"],
  },
] as const;

const DEFAULT_ID: ContactCardPalette = "amethyst";

export function getPalette(id: ContactCardPalette | null | undefined): PaletteSpec {
  if (!id) return PALETTES[0];
  return PALETTES.find((p) => p.id === id) ?? PALETTES.find((p) => p.id === DEFAULT_ID)!;
}
