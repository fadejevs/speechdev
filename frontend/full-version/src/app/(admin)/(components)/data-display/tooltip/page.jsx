// @next
import dynamic from 'next/dynamic';

// @project
const DataDisplayTooltip = dynamic(() => import('@/views/components/data-display/tooltip'));

/***************************  DATA DISPLAY - TOOLTIP  ***************************/

export default function DataDisplay() {
  return <DataDisplayTooltip />;
}
