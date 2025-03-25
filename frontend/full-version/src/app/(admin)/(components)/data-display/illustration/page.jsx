// @next
import dynamic from 'next/dynamic';

// @project
const DataDisplayIllustarion = dynamic(() => import('@/views/components/data-display/illustration'));

/***************************  DATA DISPLAY - ILLUSTRATION  ***************************/

export default function DataDisplay() {
  return <DataDisplayIllustarion />;
}
