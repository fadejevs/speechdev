'use client';
import PropTypes from 'prop-types';

import { useEffect } from 'react';

// @mui
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// @third-party
import rtlPlugin from 'stylis-plugin-rtl';

// @project
import { ThemeDirection } from '@/config';
import useConfig from '@/hooks/useConfig';

// @types

/***************************  RTL LAYOUT  ***************************/

export default function RTLLayout({ children }) {
  const { themeDirection } = useConfig();

  useEffect(() => {
    document.dir = themeDirection;
  }, [themeDirection]);

  const cacheRtl = createCache({
    key: themeDirection === ThemeDirection.RTL ? 'rtl' : 'css',
    prepend: true,
    stylisPlugins: themeDirection === ThemeDirection.RTL ? [rtlPlugin] : []
  });

  return <CacheProvider value={cacheRtl}>{children}</CacheProvider>;
}

RTLLayout.propTypes = { children: PropTypes.any };
