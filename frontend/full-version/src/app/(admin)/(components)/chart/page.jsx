// @next
import dynamic from 'next/dynamic';

// @project
const ComponentChart = dynamic(() => import('@/views/components/chart'));

/***************************  COMPONENT - CHART  ***************************/

export default function Component() {
  return <ComponentChart />;
}
