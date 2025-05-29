export const metadata = {
  title: "Listen Live — Get Live Speech Translation & Multilingual Captions",
  description: "Join the event in your language with real-time interpretation and live captions. No setup needed. Just listen, follow, and enjoy. Try Everspeak for your next event.",
  alternates: {
    canonical: "https://app.everspeak.ai/",
  },
  viewport: "width=device-width, initial-scale=1",
  openGraph: {
    type: "website",
    url: "https://app.everspeak.ai/",
    title: "Listen Live — Get Live Speech Translation & Multilingual Captions",
    description: "Join the event in your language with real-time interpretation and live captions. No setup needed. Just listen, follow, and enjoy. Try Everspeak for your next event.",
    images: [
      {
        url: "https://app.everspeak.ai/assets/OG-Participant.png",
        width: 1200,
        height: 630,
        alt: "Get Live Speech Translation & Captions On Any Device",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    url: "https://app.everspeak.ai/",
    title: "Listen Live — Get Live Speech Translation & Multilingual Captions",
    description: "Join the event in your language with real-time interpretation and live captions. No setup needed. Just listen, follow, and enjoy. Try Everspeak for your next event.",
    images: [
      "https://app.everspeak.ai/assets/OG-Participant.png"
    ],
  },
};

export default function BroadcastLayout({ children }) {
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
            "name": "Everspeak Participant App",
            "url": "https://app.everspeak.ai/",
            "applicationCategory": "CommunicationApplication",
            "operatingSystem": "All",
            "description": "Join live events with real-time speech translation and multilingual captions. No setup required. Works on any device.",
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