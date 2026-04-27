import * as React from 'react';

import { FocusNoiseGeneratorViewProps } from './FocusNoiseGenerator.types';

export default function FocusNoiseGeneratorView(props: FocusNoiseGeneratorViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
