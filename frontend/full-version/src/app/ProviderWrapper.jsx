'use client';
import PropTypes from 'prop-types';

// @project
import Locales from '@/components/Locales';
import RTLLayout from '@/components/RTLLayout';
import { ConfigProvider } from '@/contexts/ConfigContext';
import ThemeCustomization from '@/themes';

// @types

/***************************  LAYOUT - CONFIG, THEME  ***************************/

export default function ProviderWrapper({ children }) {
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
