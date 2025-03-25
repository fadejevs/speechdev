// @next
import dynamic from 'next/dynamic';

// @project
const FeedbackDialog = dynamic(() => import('@/views/components/feedback/dialog'));

/***************************  FEEDBACK - DIALOG  ***************************/

export default function Feedback() {
  return <FeedbackDialog />;
}
