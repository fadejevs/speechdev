// @next
import dynamic from 'next/dynamic';

// @project
const SurfaceCard = dynamic(() => import('@/views/components/surface/card'));

/***************************  SURFACE - CARD  ***************************/

export default function Surface() {
  return <SurfaceCard />;
}
