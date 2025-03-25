// @next
import dynamic from 'next/dynamic';

// @project
const InputsSwitch = dynamic(() => import('@/views/components/inputs/switch'));

/***************************  INPUTS - SWITCH  ***************************/

export default function Inputs() {
  return <InputsSwitch />;
}
