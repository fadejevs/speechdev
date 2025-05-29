export const metadata = {
  title: "Dashboard — Create & Manage Your Next Multilingual Event",
  description: "Easily create, schedule, and manage your next multilingual event with Everspeak. Designed for individuals, teams, and event organisers.",
  alternates: {
    canonical: "https://app.everspeak.ai/",
  },
  viewport: "width=device-width, initial-scale=1",
  // No need to set icons here if you want to inherit the root favicon
  openGraph: {
    type: "website",
    url: "https://app.everspeak.ai/",
    title: "Event Dashboard — Create & Manage Your Next Multilingual Event",
    description: "Easily create, schedule, and manage your next multilingual event with Everspeak. Designed for individuals, teams, and event organizers.",
    images: [
      {
        url: "https://app.everspeak.ai/assets/OG-Dashboard.png",
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
      "https://app.everspeak.ai/assets/OG-Dashboard.png"
    ],
  },
};

export default function DashboardLayout({ children }) {
  return (
    <>
      {children}
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
    </>
  );
} 