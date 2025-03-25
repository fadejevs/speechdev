// @third-party
import { FormattedMessage } from 'react-intl';

// @project
import { AuthRole } from '@/enum';

// @types

/***************************  MENU ITEMS - APPLICATIONS  ***************************/

const other = {
  id: 'group-other',
  title: <FormattedMessage id="other" />,
  icon: 'IconDotsVertical',
  type: 'group',
  children: [
    {
      id: 'components',
      title: <FormattedMessage id="components" />,
      type: 'collapse',
      icon: 'IconAppWindow',
      roles: [AuthRole.SUPER_ADMIN, AuthRole.ADMIN],
      children: [
        {
          id: 'avatar',
          title: <FormattedMessage id="avatar" />,
          type: 'item',
          url: '/data-display/avatar'
        },
        {
          id: 'button',
          title: <FormattedMessage id="button" />,
          type: 'item',
          url: '/inputs/button'
        },
        {
          id: 'card',
          title: <FormattedMessage id="card" />,
          type: 'item',
          url: '/surface/card'
        },

        {
          id: 'checkbox',
          title: <FormattedMessage id="checkbox" />,
          type: 'item',
          url: '/inputs/checkbox'
        },
        {
          id: 'chip',
          title: <FormattedMessage id="chip" />,
          type: 'item',
          url: '/data-display/chip'
        },
        {
          id: 'color',
          title: <FormattedMessage id="color" />,
          type: 'item',
          url: '/utils/color'
        },
        {
          id: 'drop-down',
          title: <FormattedMessage id="drop-down" />,
          type: 'item',
          url: '/inputs/drop-down'
        },
        {
          id: 'dialog',
          title: <FormattedMessage id="dialog" />,
          type: 'item',
          url: '/feedback/dialog'
        },
        {
          id: 'illustration',
          title: <FormattedMessage id="illustration" />,
          type: 'item',
          url: '/data-display/illustration'
        },
        {
          id: 'input',
          title: <FormattedMessage id="input" />,
          type: 'item',
          url: '/inputs/input'
        },

        {
          id: 'progress',
          title: <FormattedMessage id="progress" />,
          type: 'item',
          url: '/feedback/progress'
        },
        {
          id: 'radio',
          title: <FormattedMessage id="radio" />,
          type: 'item',
          url: '/inputs/radio'
        },
        {
          id: 'shadow',
          title: <FormattedMessage id="shadow" />,
          type: 'item',
          url: '/utils/shadow'
        },
        {
          id: 'slider',
          title: <FormattedMessage id="slider" />,
          type: 'item',
          url: '/inputs/slider'
        },
        {
          id: 'switch',
          title: <FormattedMessage id="switch" />,
          type: 'item',
          url: '/inputs/switch'
        },
        {
          id: 'tabs',
          title: <FormattedMessage id="tabs" />,
          type: 'item',
          url: '/navigation/tabs'
        },

        {
          id: 'tooltip',
          title: <FormattedMessage id="tooltip" />,
          type: 'item',
          url: '/data-display/tooltip'
        },
        {
          id: 'typography',
          title: <FormattedMessage id="typography" />,
          type: 'item',
          url: '/data-display/typography'
        },
        {
          id: 'other',
          title: <FormattedMessage id="other" />,
          type: 'item',
          url: '/data-display/other'
        }
      ]
    },
    {
      id: 'plugins',
      title: <FormattedMessage id="plugins" />,
      type: 'collapse',
      icon: 'IconCloudUpload',
      children: [
        {
          id: 'color-picker',
          title: <FormattedMessage id="color-picker" />,
          type: 'item',
          url: '/plugins/color-picker'
        },
        {
          id: 'calendar',
          title: <FormattedMessage id="calendar" />,
          type: 'item',
          url: '/plugins/calendar'
        }
      ]
    },
    {
      id: 'charts',
      title: <FormattedMessage id="chart" />,
      type: 'item',
      url: '/chart',
      icon: 'IconChartHistogram',
      roles: [AuthRole.SUPER_ADMIN, AuthRole.ADMIN]
    },
    {
      id: 'react-table',
      title: <FormattedMessage id="tanstack-table" />,
      type: 'item',
      url: '/table',
      icon: 'IconTableShare',
      roles: [AuthRole.SUPER_ADMIN, AuthRole.ADMIN]
    },
    {
      id: 'sample-page',
      title: <FormattedMessage id="sample-page" />,
      type: 'item',
      url: '/sample-page',
      icon: 'IconBrandChrome'
    },
    {
      id: 'changelog',
      title: <FormattedMessage id="changelog" />,
      type: 'item',
      url: 'https://phoenixcoded.gitbook.io/saasable/changelog',
      target: true,
      icon: 'IconHistory'
    },
    {
      id: 'documentation',
      title: <FormattedMessage id="documentation" />,
      type: 'item',
      url: 'https://phoenixcoded.gitbook.io/saasable',
      target: true,
      icon: 'IconNotes'
    },
    {
      id: 'support',
      title: <FormattedMessage id="support" />,
      type: 'item',
      url: 'https://support.phoenixcoded.net',
      target: true,
      icon: 'IconLifebuoy'
    },
    {
      id: 'menu-levels',
      title: <FormattedMessage id="menu-levels" />,
      type: 'collapse',
      icon: 'IconMenu2',
      children: [
        {
          id: 'menu-level-1.1',
          title: (
            <>
              <FormattedMessage id="level" /> 1
            </>
          ),
          type: 'item',
          url: '#'
        },
        {
          id: 'menu-level-1.2',
          title: (
            <>
              <FormattedMessage id="level" /> 1
            </>
          ),
          type: 'collapse',
          children: [
            {
              id: 'menu-level-2.1',
              title: (
                <>
                  <FormattedMessage id="level" /> 2
                </>
              ),
              type: 'item',
              url: '#'
            },
            {
              id: 'menu-level-2.2',
              title: (
                <>
                  <FormattedMessage id="level" /> 2
                </>
              ),
              type: 'collapse',
              children: [
                {
                  id: 'menu-level-3.1',
                  title: (
                    <>
                      <FormattedMessage id="level" /> 3
                    </>
                  ),
                  type: 'item',
                  url: '#'
                },
                {
                  id: 'menu-level-3.2',
                  title: (
                    <>
                      <FormattedMessage id="level" /> 3
                    </>
                  ),
                  type: 'item',
                  url: '#'
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export default other;
