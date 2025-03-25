// @next
import dynamic from 'next/dynamic';

// @project
const InputsSlider = dynamic(() => import('@/views/components/inputs/slider'));

/***************************  INPUTS - SLIDER  ***************************/

export default function Inputs() {
  return <InputsSlider />;
}
