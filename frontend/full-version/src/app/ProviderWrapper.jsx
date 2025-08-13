'use client';
import PropTypes from 'prop-types';
import { useEffect } from 'react';
// @project
import Locales from '@/components/Locales';
import RTLLayout from '@/components/RTLLayout';
import { ConfigProvider } from '@/contexts/ConfigContext';
import ThemeCustomization from '@/themes';

// Initialize Smart API Monitor globally
// Removed smartApiMonitor per user request

// @types
/***************************  LAYOUT - CONFIG, THEME  ***************************/
export default function ProviderWrapper({ children }) {
  // Initialize API Monitor on app start
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // console.log('[API Monitor] Initialized globally');
    }
  }, []);

  return (
    <ConfigProvider>
      <ThemeCustomization>
        <RTLLayout>
          <Locales>{children}</Locales>
        </RTLLayout>
      </ThemeCustomization>
    </ConfigProvider>
  );
}

ProviderWrapper.propTypes = { children: PropTypes.any };
