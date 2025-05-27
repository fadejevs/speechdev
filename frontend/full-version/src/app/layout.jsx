import PropTypes from 'prop-types';

// @styles
import './globals.css';

// @project
import branding from '@/branding.json';
import ProviderWrapper from './ProviderWrapper';

// @utils
import '@/utils/devPerformance';

/***************************  METADATA - MAIN  ***************************/

// Configures the viewport settings for the application.
export const viewport = {
  userScalable: false // Disables user scaling of the viewport.
};

export const metadata = {
  title: "Everspeak — Create & Manage Your Next Multilingual Event",
  description: "Easily create, schedule, and manage your next multilingual event with Everspeak. Designed for individuals, teams, and event organisers.",
  alternates: {
    canonical: "https://app.everspeak.ai/",
  },
  viewport: "width=device-width, initial-scale=1",
  openGraph: {
    type: "website",
    url: "https://app.everspeak.ai/",
    title: "Event Dashboard — Create & Manage Your Next Multilingual Event",
    description: "Easily create, schedule, and manage your next multilingual event with Everspeak. Designed for individuals, teams, and event organizers.",
    images: [
      {
        url: "https://app.everspeak.ai/assets/OG%20Image%20Dashboard.png",
        width: 1200,
        height: 630,
        alt: "Everspeak Event Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    url: "https://app.everspeak.ai/",
    title: "Event Dashboard — Create & Manage Your Next Multilingual Event",
    description: "Easily create, schedule, and manage your next multilingual event with Everspeak. Designed for individuals, teams, and event organizers.",
    images: [
      "https://app.everspeak.ai/assets/OG%20Image%20Dashboard.png"
    ],
  },
};

/***************************  LAYOUT - ROOT  ***************************/

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>
        <ProviderWrapper>{children}</ProviderWrapper>
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Everspeak Event Dashboard",
              "url": "https://app.everspeak.ai",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": "0.00",
                "priceCurrency": "EUR"
              }
            }),
          }}
        />
      </body>
    </html>
  );
}

RootLayout.propTypes = { children: PropTypes.any };
