// @next
import dynamic from 'next/dynamic';

// @project
const DataDisplayOther = dynamic(() => import('@/views/components/data-display/other'));

/***************************  DATA DISPLAY - OTHER  ***************************/

export default function DataDisplay() {
  return <DataDisplayOther />;
}
