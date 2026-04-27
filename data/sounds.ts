import type { FocusNoiseType } from "@/lib/noiseGenerator";

/**
 * Ett enskilt ljud (t.ex. White noise). Kan ha olika loop-gränser för freemium vs premium senare.
 */
export type NoiseSound = {
  id: string;
  title: string;
  /** Kort beskrivning, t.ex. "Lika energi över alla frekvenser" */
  description?: string;
  noiseType: FocusNoiseType;
};

/**
 * Kategori för fokus/sömnljud. UI: accordion – en kategori i taget öppen.
 */
export type NoiseCategory = {
  id: string;
  title: string;
  /** Beskrivning för hela kategorin (inte enskilda spår). */
  description?: string;
  sounds: NoiseSound[];
};

/**
 * Kategorier för Focus Noise. Lägg till fler senare (t.ex. Rain, Ocean).
 * För freemium: första ljudet i varje kategori (eller bara första kategorin) kan vara gratis.
 */
export const NOISE_CATEGORIES: NoiseCategory[] = [
  {
    id: "white",
    title: "White noise",
    description:
      "Best for: Masking sudden, sharp environmental noises (e.g., neighbors slamming doors, barking dogs).\n\nUse for: Sleeping in noisy urban environments or managing tinnitus.",
    sounds: [
      {
        id: "white-1",
        title: "White noise",
        noiseType: "white",
      },
      {
        id: "white-2",
        title: "White noise Deep",
        noiseType: "white",
      },
    ],
  },
  {
    id: "pink",
    title: "Pink noise",
    description:
      "Best for: Long-term focus and memory consolidation during sleep. Studies suggest pink noise can help stabilize brain waves.\n\nUse for: Studying, deep work sessions, or improving overall sleep quality.",
    sounds: [
      {
        id: "pink-1",
        title: "Pink noise",
        noiseType: "pink",
      },
      {
        id: "pink-2",
        title: "Pink noise Focus",
        noiseType: "pink",
      },
    ],
  },
  {
    id: "brown",
    title: "Brown noise",
    description:
      "Best for: Short bursts of intense focus, relaxation, and calming an overactive mind (highly recommended for individuals with AD(H)D).\n\nUse for: Breaking through a \"mental fog,\" calming anxiety, or for those who find deep, heavy sounds comforting for sleep.",
    sounds: [
      {
        id: "brown-1",
        title: "Brown noise",
        noiseType: "brown",
      },
      {
        id: "brown-2",
        title: "Brown noise Deep Sleep",
        noiseType: "brown",
      },
    ],
  },
];
