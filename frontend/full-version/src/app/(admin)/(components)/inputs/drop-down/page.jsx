// @next
import dynamic from 'next/dynamic';

// @project
const InputsDropDown = dynamic(() => import('@/views/components/inputs/drop-down'));

/***************************  INPUTS - DROP-DOWN  ***************************/

export default function Inputs() {
  return <InputsDropDown />;
}
