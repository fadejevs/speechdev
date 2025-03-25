// @next
import dynamic from 'next/dynamic';

// @project
const DataDisplayChip = dynamic(() => import('@/views/components/data-display/chip'));

/***************************  DATA DISPLAY - CHIP  ***************************/

export default function DataDisplay() {
  return <DataDisplayChip />;
}
