// @third-party
import { FormattedMessage } from 'react-intl';

// @project
import { AuthRole } from '@/enum';

// @types

/***************************  MENU ITEMS - APPLICATIONS  ***************************/

const manage = {
  id: 'group-manage',
  title: <FormattedMessage id="manage" />,
  icon: 'IconBrandAsana',
  type: 'group',
  children: [
    {
      id: 'dashboard',
      // title: <FormattedMessage id="Dashboard" />,
      title: <FormattedMessage id="My Events" />,
      type: 'item',
      url: '/dashboard/analytics',
      // icon: 'IconLayoutGrid'
      icon: 'IconStack2'
    }
    // {
    //   id: 'metrics',
    //   title: <FormattedMessage id="Metrics" />,
    //   type: 'item',
    //   url: '/dashboard/metrics',
    //   icon: 'IconChartHistogram'
    // }
  ]
};

export default manage;
