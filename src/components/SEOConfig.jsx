import { Helmet } from 'react-helmet-async';

const SEOConfig = ({ barber }) => {
  if (!barber) return null;

  const siteUrl = window.location.origin;
  
  // This is the JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    "name": barber.businessName || barber.name,
    "image": barber.profileImage,
    "description": barber.bio || `Professional barber services at ${barber.businessName}`,
    "url": siteUrl,
    "telephone": barber.phone,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": barber.address,
      "addressLocality": "London", // You can make this dynamic too
      "addressCountry": "GB"
    },
    "priceRange": "££",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "09:00",
        "closes": "19:00"
      }
    ]
  };

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{barber.businessName || barber.name} | Book Now</title>
      <meta name="description" content={barber.bio?.substring(0, 160)} />
      <link rel="canonical" href={window.location.href} />

      {/* Social Media Tags (Open Graph) */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={barber.businessName || barber.name} />
      <meta property="og:description" content="Book your hair appointment online in seconds." />
      <meta property="og:image" content={barber.profileImage} />
      <meta property="og:url" content={window.location.href} />

      {/* The JSON-LD Script */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
};

export default SEOConfig;