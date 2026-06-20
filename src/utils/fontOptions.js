export const FONT_OPTIONS = [
  { key: "playfair",    label: "Playfair Display",   family: "'Playfair Display', serif",      googleParam: "Playfair+Display:wght@400;700;900",         cat: "Elegant Serif"   },
  { key: "bebas",       label: "Bebas Neue",          family: "'Bebas Neue', sans-serif",        googleParam: "Bebas+Neue",                                cat: "Bold Display"    },
  { key: "montserrat",  label: "Montserrat",          family: "'Montserrat', sans-serif",        googleParam: "Montserrat:wght@400;700;800;900",           cat: "Modern Sans"     },
  { key: "cormorant",   label: "Cormorant Garamond",  family: "'Cormorant Garamond', serif",     googleParam: "Cormorant+Garamond:wght@400;600;700",       cat: "Luxury Serif"    },
  { key: "raleway",     label: "Raleway",             family: "'Raleway', sans-serif",           googleParam: "Raleway:wght@400;700;800;900",              cat: "Geometric Sans"  },
  { key: "baskerville", label: "Libre Baskerville",   family: "'Libre Baskerville', serif",      googleParam: "Libre+Baskerville:wght@400;700",            cat: "Classic Serif"   },
  { key: "josefin",     label: "Josefin Sans",        family: "'Josefin Sans', sans-serif",      googleParam: "Josefin+Sans:wght@300;400;600;700",         cat: "Minimal Sans"    },
  { key: "lora",        label: "Lora",                family: "'Lora', serif",                   googleParam: "Lora:wght@400;600;700",                     cat: "Editorial Serif" },
  { key: "cinzel",      label: "Cinzel",              family: "'Cinzel', serif",                 googleParam: "Cinzel:wght@400;700;900",                   cat: "Decorative"      },
  { key: "outfit",      label: "Outfit",              family: "'Outfit', sans-serif",            googleParam: "Outfit:wght@300;400;700;800;900",           cat: "Contemporary"    },
];

export function getFontFamily(key, defaultKey = "playfair") {
  const f = FONT_OPTIONS.find(o => o.key === key) || FONT_OPTIONS.find(o => o.key === defaultKey);
  return f ? f.family : "'Playfair Display', serif";
}

export function loadGoogleFont(key) {
  const f = FONT_OPTIONS.find(o => o.key === key);
  if (!f) return;
  const id = `gfont-${f.key}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${f.googleParam}&display=swap`;
  document.head.appendChild(link);
}
