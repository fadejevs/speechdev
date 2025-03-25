import PropTypes from 'prop-types';
// @next
import dynamic from 'next/dynamic';

// @project
const DashboardAnalytics = dynamic(() => import('@/views/admin/dashboard/analytics'));

export default async function Dashboard({ params }) {
  const { tab } = await params;
  return <DashboardAnalytics tab={tab} />;
}

// Return a list of `params` to populate the [slug] dynamic segment
export async function generateStaticParams() {
  const response = ['overview', 'use-behavior', 'performance'];

  return response.map((tab) => ({
    tab: tab
  }));
}

Dashboard.propTypes = { params: PropTypes.object };
