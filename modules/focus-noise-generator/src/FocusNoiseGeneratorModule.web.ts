import { NativeModule, registerWebModule } from "expo";

import type {
  FocusNoiseGeneratorModuleEvents,
  NoiseType,
} from "./FocusNoiseGenerator.types";

class FocusNoiseGeneratorModule extends NativeModule<FocusNoiseGeneratorModuleEvents> {
  async playNoise(_type: NoiseType): Promise<void> {}

  async stopNoise(): Promise<void> {}

  async setVolume(_value: number): Promise<void> {}

  async playNotice(): Promise<void> {}
}

export default registerWebModule(FocusNoiseGeneratorModule, "FocusNoiseGenerator");
