// @next
import dynamic from 'next/dynamic';

// @project
const PluginCalendar = dynamic(() => import('@/views/components/plugins/calendar'));

/***************************  PLUGINS - CALENDAR  ***************************/

export default function Plugins() {
  return <PluginCalendar />;
}
