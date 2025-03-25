// @next
import dynamic from 'next/dynamic';

// @project
const InputsInput = dynamic(() => import('@/views/components/inputs/input'));

/***************************  INPUTS - INPUT  ***************************/

export default function Inputs() {
  return <InputsInput />;
}
