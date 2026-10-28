// Font library for headings and text. Every font is a free Google Font.
// `scale` evens out size differences: Anton is very narrow, so a wide font
// shown at the same size would overflow the layout.

export type FontKey = keyof typeof fonts;

export const fonts = {
  // Bold display
  anton: { name: 'Anton', group: 'Bold display', css: "'Anton', Impact, sans-serif", google: 'Anton', weight: 400, scale: 1, upper: true },
  bebas: { name: 'Bebas Neue', group: 'Bold display', css: "'Bebas Neue', Impact, sans-serif", google: 'Bebas+Neue', weight: 400, scale: 1.08, upper: true },
  oswald: { name: 'Oswald', group: 'Bold display', css: "'Oswald', sans-serif", google: 'Oswald:wght@700', weight: 700, scale: 0.92, upper: true },
  bigShoulders: { name: 'Big Shoulders Display', group: 'Bold display', css: "'Big Shoulders Display', sans-serif", google: 'Big+Shoulders+Display:wght@900', weight: 900, scale: 1.02, upper: true },
  archivoBlack: { name: 'Archivo Black', group: 'Bold display', css: "'Archivo Black', sans-serif", google: 'Archivo+Black', weight: 400, scale: 0.72, upper: false },
  // Characterful bold
  bricolage: { name: 'Bricolage Grotesque', group: 'Characterful bold', css: "'Bricolage Grotesque', sans-serif", google: 'Bricolage+Grotesque:opsz,wght@12..96,800', weight: 800, scale: 0.8, upper: false },
  unbounded: { name: 'Unbounded', group: 'Characterful bold', css: "'Unbounded', sans-serif", google: 'Unbounded:wght@800', weight: 800, scale: 0.66, upper: false },
  syne: { name: 'Syne', group: 'Characterful bold', css: "'Syne', sans-serif", google: 'Syne:wght@800', weight: 800, scale: 0.76, upper: false },
  spaceGrotesk: { name: 'Space Grotesk', group: 'Characterful bold', css: "'Space Grotesk', sans-serif", google: 'Space+Grotesk:wght@700', weight: 700, scale: 0.8, upper: false },
  darkerGrotesque: { name: 'Darker Grotesque', group: 'Characterful bold', css: "'Darker Grotesque', sans-serif", google: 'Darker+Grotesque:wght@900', weight: 900, scale: 0.98, upper: false },
  // Serif
  fraunces: { name: 'Fraunces', group: 'Serif', css: "'Fraunces', Georgia, serif", google: 'Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,600', weight: 600, scale: 0.82, upper: false },
  dmSerif: { name: 'DM Serif Display', group: 'Serif', css: "'DM Serif Display', Georgia, serif", google: 'DM+Serif+Display:ital@0;1', weight: 400, scale: 0.86, upper: false },
  playfair: { name: 'Playfair Display', group: 'Serif', css: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:wght@800', weight: 800, scale: 0.8, upper: false },
  youngSerif: { name: 'Young Serif', group: 'Serif', css: "'Young Serif', Georgia, serif", google: 'Young+Serif', weight: 400, scale: 0.8, upper: false },
  instrumentSerif: { name: 'Instrument Serif', group: 'Serif', css: "'Instrument Serif', Georgia, serif", google: 'Instrument+Serif:ital@0;1', weight: 400, scale: 1, upper: false },
  // Clean sans
  manrope: { name: 'Manrope', group: 'Clean sans', css: "'Manrope', sans-serif", google: 'Manrope:wght@400;500;600;700;800', weight: 800, scale: 0.8, upper: false },
  poppins: { name: 'Poppins', group: 'Clean sans', css: "'Poppins', sans-serif", google: 'Poppins:wght@700;800', weight: 800, scale: 0.76, upper: false },
  jakarta: { name: 'Plus Jakarta Sans', group: 'Clean sans', css: "'Plus Jakarta Sans', sans-serif", google: 'Plus+Jakarta+Sans:wght@800', weight: 800, scale: 0.8, upper: false },
  outfit: { name: 'Outfit', group: 'Clean sans', css: "'Outfit', sans-serif", google: 'Outfit:wght@800', weight: 800, scale: 0.82, upper: false },
  sora: { name: 'Sora', group: 'Clean sans', css: "'Sora', sans-serif", google: 'Sora:wght@800', weight: 800, scale: 0.76, upper: false },
  // Hand-written accent
  caveat: { name: 'Caveat', group: 'Hand-written', css: "'Caveat', cursive", google: 'Caveat:wght@700', weight: 700, scale: 1.05, upper: false },
} as const;

// Fonts the site always loads (used by the default design).
export const baseFonts: FontKey[] = ['anton', 'fraunces', 'manrope', 'bricolage'];

export const googleFontsHref = (keys: FontKey[]) =>
  'https://fonts.googleapis.com/css2?' +
  [...new Set(keys)].map((k) => `family=${fonts[k].google}`).join('&') +
  '&display=swap';

export const isFontKey = (k: unknown): k is FontKey => typeof k === 'string' && k in fonts;
