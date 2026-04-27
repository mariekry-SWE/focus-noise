import { NativeModule, requireNativeModule } from "expo";

import type {
  FocusNoiseGeneratorModuleEvents,
  NoiseType,
} from "./FocusNoiseGenerator.types";

declare class FocusNoiseGeneratorModule extends NativeModule<FocusNoiseGeneratorModuleEvents> {
  playNoise(type: NoiseType): Promise<void>;
  stopNoise(): Promise<void>;
  setVolume(value: number): Promise<void>;
  playNotice(): Promise<void>;
}

export default requireNativeModule<FocusNoiseGeneratorModule>("FocusNoiseGenerator");
