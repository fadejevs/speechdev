// @next
import dynamic from 'next/dynamic';

// @project
const ComponentTable = dynamic(() => import('@/views/components/table'));

/***************************  COMPONENT - TABLE  ***************************/

export default function Component() {
  return <ComponentTable />;
}
