export type NoiseType = "white" | "pink" | "brown";

export type FocusNoiseGeneratorModuleEvents = Record<string, never>;

export type FocusNoiseGeneratorViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: { url: string } }) => void;
  style?: unknown;
};
