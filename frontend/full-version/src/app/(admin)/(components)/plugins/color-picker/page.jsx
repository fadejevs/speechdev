// @next
import dynamic from 'next/dynamic';

// @project
const PluginColorPicker = dynamic(() => import('@/views/components/plugins/color-picker'));

/***************************  PLUGINS - COLOR PCIKER  ***************************/

export default function Plugins() {
  return <PluginColorPicker />;
}
