import { requireNativeView } from 'expo';
import * as React from 'react';

import { FocusNoiseGeneratorViewProps } from './FocusNoiseGenerator.types';

const NativeView: React.ComponentType<FocusNoiseGeneratorViewProps> =
  requireNativeView('FocusNoiseGenerator');

export default function FocusNoiseGeneratorView(props: FocusNoiseGeneratorViewProps) {
  return <NativeView {...props} />;
}
