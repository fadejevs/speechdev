import PropTypes from 'prop-types';
// @next
import dynamic from 'next/dynamic';

// @project
const Setting = dynamic(() => import('@/views/admin/setting'));

export default async function Settings({ params }) {
  const { tab } = await params;
  return <Setting tab={tab} />;
}

export async function generateStaticParams() {
  const response = ['general', 'pricing', 'internationalization', 'authentication'];

  return response.map((tab) => ({
    tab: tab
  }));
}

Settings.propTypes = { params: PropTypes.object };
