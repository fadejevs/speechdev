import PropTypes from 'prop-types';

// @styles
import './globals.css';

// @project
import branding from '@/branding.json';
import ProviderWrapper from './ProviderWrapper';

// @types

/***************************  METADATA - MAIN  ***************************/

// Configures the viewport settings for the application.
export const viewport = {
  userScalable: false // Disables user scaling of the viewport.
};

export const metadata = {
  title: `${branding.brandName} React MUI Dashboard Template`,
  description: `${branding.brandName} React MUI Dashboard Template`
};

/***************************  LAYOUT - ROOT  ***************************/

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ProviderWrapper>{children}</ProviderWrapper>
      </body>
    </html>
  );
}

RootLayout.propTypes = { children: PropTypes.any };
