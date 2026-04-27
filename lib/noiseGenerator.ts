import FocusNoiseGenerator, {
  type NoiseType,
} from "@/modules/focus-noise-generator";

export type FocusNoiseType = NoiseType;

export async function playNoise(type: FocusNoiseType) {
  await FocusNoiseGenerator.playNoise(type);
}

export async function stopNoise() {
  await FocusNoiseGenerator.stopNoise();
}

export async function setNoiseVolume(value: number) {
  await FocusNoiseGenerator.setVolume(value);
}

export async function playNoiseNotice() {
  await FocusNoiseGenerator.playNotice();
}
