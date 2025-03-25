// @next
import dynamic from 'next/dynamic';

// @project
const DataDisplayAvatar = dynamic(() => import('@/views/components/data-display/avatar'));

/***************************  DATA DISPLAY - AVATAR  ***************************/

export default function DataDisplay() {
  return <DataDisplayAvatar />;
}
