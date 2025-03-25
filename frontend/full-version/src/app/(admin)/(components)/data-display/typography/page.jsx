// @next
import dynamic from 'next/dynamic';

// @project
const DataDisplayTypography = dynamic(() => import('@/views/components/data-display/typography'));

/***************************  DATA DISPLAY - TYPOOGRAPHY  ***************************/

export default function DataDisplay() {
  return <DataDisplayTypography />;
}
