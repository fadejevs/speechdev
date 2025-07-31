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
      id: 'events',
      title: <FormattedMessage id="My Events" />,
      type: 'item',
      url: '/dashboard/analytics',
      icon: 'IconStack2'
    },
    {
      id: 'system-analytics',
      title: <FormattedMessage id="System Analytics" />,
      type: 'item',
      url: '/dashboard/analytics/everspeak',
      icon: 'IconChartAreaLine'
    }
    // {
    //   id: 'account',
    //   title: <FormattedMessage id="account" />,
    //   type: 'item',
    //   url: '/account',
    //   icon: 'IconUserCog',
    //   roles: [AuthRole.SUPER_ADMIN]
    // },
    // {
    //   id: 'user',
    //   title: <FormattedMessage id="user" />,
    //   type: 'item',
    //   url: '/user',
    //   icon: 'IconUsers'
    // },
    // {
    //   id: 'role-permission',
    //   title: <FormattedMessage id="roles-permissions" />,
    //   type: 'item',
    //   url: '/role-permission',
    //   icon: 'IconChartHistogram',
    //   roles: [AuthRole.SUPER_ADMIN]
    // },
    // {
    //   id: 'billing',
    //   title: <FormattedMessage id="billing" />,
    //   type: 'item',
    //   url: '/billing',
    //   icon: 'IconFileInvoice'
    // },
    // {
    //   id: 'blog',
    //   title: <FormattedMessage id="blog" />,
    //   type: 'item',
    //   url: '/blog',
    //   icon: 'IconBrandBlogger'
    // },
    // {
    //   id: 'setting',
    //   title: <FormattedMessage id="setting" />,
    //   type: 'item',
    //   url: '/setting',
    //   icon: 'IconSettings',
    //   roles: [AuthRole.SUPER_ADMIN, AuthRole.ADMIN]
    // },
  ]
};

export default manage;
