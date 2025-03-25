// @next
import dynamic from 'next/dynamic';

// @project
const InputsButton = dynamic(() => import('@/views/components/inputs/button'));

/***************************  INPUTS - BUTTON  ***************************/

export default function Inputs() {
  return <InputsButton />;
}
