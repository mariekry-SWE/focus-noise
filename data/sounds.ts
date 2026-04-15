type LocalAudioSource = number | string;

/**
 * Ett enskilt ljud (t.ex. White noise). Kan ha olika loop-gränser för freemium vs premium senare.
 */
export type NoiseSound = {
  id: string;
  title: string;
  /** Kort beskrivning, t.ex. "Lika energi över alla frekvenser" */
  description?: string;
  /**
   * Ljudfil. Om undefined visas posten men går inte att spela (tills du lagt till filen).
   * Exempel: require("../assets/audio/white.mp3") eller { uri: "https://..." } (expo-audio AudioSource)
   */
  audioSource?: LocalAudioSource;
  /** Ska ljudet loopa? (Nu: alltid true. Senare: freemium kan ha begränsat antal loopar.) */
  isLooping: boolean;
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
        audioSource: require("../assets/audio/white_noise_loopable_5min.mp3"),
        isLooping: true,
      },
      {
        id: "white-2",
        title: "White noise Deep",
        audioSource: require("../assets/audio/white_noise_loopable_5min.mp3"),
        isLooping: true,
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
        audioSource: require("../assets/audio/pink-noise-loopable-5min.mp3"),
        isLooping: true,
      },
      {
        id: "pink-2",
        title: "Pink noise Focus",
        audioSource: require("../assets/audio/pink-noise-loopable-5min.mp3"),
        isLooping: true,
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
        title: "Brown noise WAV",
        audioSource: require("../assets/audio/brown-stereo-loopable-90sek.wav"),
        isLooping: true,
      },
      {
        id: "brown-2",
        title: "Brown noise mp3",
        audioSource: require("../assets/audio/brown-stereo-loopable-90sek.mp3"),
        isLooping: true,
      },
    ],
  },
];
