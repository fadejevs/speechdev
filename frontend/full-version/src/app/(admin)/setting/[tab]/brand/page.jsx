// @next
import dynamic from 'next/dynamic';

// @project
const Brand = dynamic(() => import('@/views/admin/setting/manage-brand'));

/***************************  GENERAL - MANAGE BRAND  ***************************/

export default function GeneralBrand() {
  return <Brand />;
}
