'use client';

import { useState } from 'react';

// @project
import ColorPicker from '@/components/ColorPicker';
import PresentationCard from '@/components/cards/PresentationCard';

/***************************  PLUGINES - COLOR PICKER  ***************************/

export default function ColorPCiker() {
  const [color, setColor] = useState('#606BDF');

  return (
    <PresentationCard title="Color Picker">
      <ColorPicker label="Primary color" defaultColor={color} onColorChange={(data) => setColor(data)} />
    </PresentationCard>
  );
}
