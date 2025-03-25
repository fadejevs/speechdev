// @next
import dynamic from 'next/dynamic';

// @project
const FeedbackProgress = dynamic(() => import('@/views/components/feedback/progress'));

/***************************  FEEDBACK - PROGRESS  ***************************/

export default function Feedback() {
  return <FeedbackProgress />;
}
