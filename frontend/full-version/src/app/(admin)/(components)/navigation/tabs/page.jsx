// @next
import dynamic from 'next/dynamic';

// @project
const NavigationTabs = dynamic(() => import('@/views/components/navigation/tabs'));

/***************************  NAVIGATION - TABS  ***************************/

export default function Navigation() {
  return <NavigationTabs />;
}
