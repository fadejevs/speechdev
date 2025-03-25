// @next
import dynamic from 'next/dynamic';

// @project
const InputsCheckbox = dynamic(() => import('@/views/components/inputs/checkbox'));

/***************************  INPUTS - CHECKBOX  ***************************/

export default function Inputs() {
  return <InputsCheckbox />;
}
