const DEMO_PORTFOLIOS = {
  barber: [
    {
      before: "/images/demo/barber/skin-fade-before.jpg",
      after: "/images/demo/barber/skin-fade-after.jpg",
      label: "Skin Fade & Beard Sculpt",
    },
    {
      before: "/images/demo/barber/curly-taper-before.jpg",
      after: "/images/demo/barber/curly-taper-after.jpg",
      label: "Curly Taper & Line-Up",
    },
    {
      before: "/images/demo/barber/textured-crop-after.jpg",
      after: "/images/demo/barber/textured-crop-before.jpg",
      label: "Textured Crop & Beard Shape",
    },
  ],
  hairdresser: [
    {
      before: "/images/demo/hairdresser/balayage-after.jpg",
      after: "/images/demo/hairdresser/balayage-before.jpg",
      label: "Honey Balayage & Long Layers",
    },
    {
      before: "/images/demo/hairdresser/brunette-lob-after.jpg",
      after: "/images/demo/hairdresser/brunette-lob-before.jpg",
      label: "Glossy Brunette Lob",
    },
    {
      before: "/images/demo/hairdresser/curly-cut-after.jpg",
      after: "/images/demo/hairdresser/curly-cut-before.jpg",
      label: "Curl Definition & Shape",
    },
  ],
  trainer: [
    {
      before: "/images/demo/trainer/male-strength-after.jpg",
      after: "/images/demo/trainer/male-strength-before.jpg",
      label: "12-Month Strength Transformation",
    },
    {
      before: "/images/demo/trainer/female-strength-after.jpg",
      after: "/images/demo/trainer/female-strength-before.jpg",
      label: "9-Month Strength Transformation",
    },
    {
      before: "/images/demo/trainer/six-month-strength-after.jpg",
      after: "/images/demo/trainer/six-month-strength-before.jpg",
      label: "6-Month Strength Transformation",
    },
  ],
  decorator: [
    {
      before: "/images/demo/decorator/living-room-after.jpg",
      after: "/images/demo/decorator/living-room-before.jpg",
      label: "Living Room Refinish",
    },
    {
      before: "/images/demo/decorator/kitchen-after.jpg",
      after: "/images/demo/decorator/kitchen-before.jpg",
      label: "Kitchen Preparation & Paint",
    },
    {
      before: "/images/demo/decorator/hallway-after.jpg",
      after: "/images/demo/decorator/hallway-before.jpg",
      label: "Hallway & Woodwork Refresh",
    },
  ],
  plumber: [
    {
      before: "/images/demo/plumber/pipe-repair-after.jpg",
      after: "/images/demo/plumber/pipe-repair-before.jpg",
      label: "Leaking Waste Pipe Repair",
    },
    {
      before: "/images/demo/plumber/shower-reseal-after.jpg",
      after: "/images/demo/plumber/shower-reseal-before.jpg",
      label: "Shower Reseal & Grout Refresh",
    },
  ],
};

const DEMO_HERO_IMAGES = {
  barber: {
    heroImage: "/images/demo/barber/hero.jpg",
    homeHeroImage: "/images/demo/barber/home-hero.jpg",
    mobileHomeHeroImage: "/images/demo/barber/home-hero-mobile.jpg",
  },
  hairdresser: { heroImage: "/images/demo/hairdresser/hero.jpg" },
  trainer: {
    heroImage: "/images/demo/trainer/hero.jpg",
    heroBgImage: "/images/demo/trainer/hero-bg.jpg",
    heroBgImageMobile: "/images/demo/trainer/hero-bg-mobile.jpg",
  },
  decorator: {
    heroImage: "/images/demo/decorator/hero.jpg",
    servicesImage: "/images/demo/decorator/services-painting.jpg",
  },
  plumber: { heroImage: "/images/demo/plumber/hero.jpg" },
};

const DEMO_ACCOUNT_IDS = new Set([
  "S5s1FWMaz1XuAEo8gDSTTIqlqgL2",
  "xyPHCqfFgoYympmcqUAzNS37URG3",
  "cKyzLBNBHuYKBS439GuE74UYEUv1",
  "Ih8OFcRzvuS3QbwtsYPeUFCnUEo1",
  "bookrightly-trades-demo",
]);

/** Some older seeded records pre-date the `isDemo` field. Their immutable
 * account IDs still let every route identify them without affecting customer
 * businesses that happen to use a similar name. */
export function isDemoProfile(profile) {
  return Boolean(
    profile?.isDemo ||
    DEMO_ACCOUNT_IDS.has(profile?.id) ||
    DEMO_ACCOUNT_IDS.has(profile?.uid) ||
    DEMO_ACCOUNT_IDS.has(profile?.shopId)
  );
}

/** Seeded demo accounts always show the curated set, so the demo stays
 * controlled and consistent. Real customer accounts show their own saved
 * portfolio/hero when they have one — otherwise they get the same curated
 * placeholder (matched to their business type) rather than an empty section,
 * on both the platform domain and any custom domain, until they upload their
 * own. */
export function portfolioForProfile(profile, fallback = []) {
  if (isDemoProfile(profile)) return DEMO_PORTFOLIOS[profile?.businessType] || fallback;
  if (fallback?.length) return fallback;
  return DEMO_PORTFOLIOS[profile?.businessType] || fallback;
}

export function heroForProfile(profile, fallback = "", field = "heroImage") {
  if (isDemoProfile(profile)) return DEMO_HERO_IMAGES[profile?.businessType]?.[field] || fallback;
  if (fallback) return fallback;
  return DEMO_HERO_IMAGES[profile?.businessType]?.[field] || fallback;
}

export { DEMO_HERO_IMAGES, DEMO_PORTFOLIOS };
