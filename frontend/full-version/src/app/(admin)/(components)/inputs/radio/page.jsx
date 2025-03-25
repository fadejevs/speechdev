// @next
import dynamic from 'next/dynamic';

// @project
const InputsRadio = dynamic(() => import('@/views/components/inputs/radio'));

/***************************  INPUTS - RADIO  ***************************/

export default function Inputs() {
  return <InputsRadio />;
}
