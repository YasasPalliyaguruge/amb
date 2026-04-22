import type { ThemeControls, ThemePreset } from './types';

const defaultControls: ThemeControls = {
  surfaceMode: 'paper',
  contrastMode: 'balanced',
  radiusScale: 1,
  shadowDepth: 0.72,
  grainIntensity: 0.2,
  motionDensity: 0.9,
};

function preset(
  id: string,
  label: string,
  family: string,
  description: string,
  background: string,
  primary: string,
  accent: string,
  text: string,
  overrides: Partial<ThemeControls> = {}
): ThemePreset {
  return {
    id,
    label,
    family,
    description,
    colors: { background, primary, accent, text },
    defaults: { ...defaultControls, ...overrides },
  };
}

export const themePresets: ThemePreset[] = [
  preset('terracotta-editorial', 'Terracotta Editorial', 'Warm', 'Sunlit clay, paper grain, and warm gallery tones.', '#f4ece3', '#be6542', '#6f8f86', '#2b221d'),
  preset('saffron-paper', 'Saffron Paper', 'Warm', 'Soft parchment with a saffron pulse and sage edges.', '#f7efe0', '#c77a2f', '#728c7b', '#2e2418'),
  preset('rose-atelier', 'Rose Atelier', 'Warm', 'A rose-stained studio mood with muted olive balance.', '#f6e9e8', '#b96a69', '#7e8f73', '#2c2226'),
  preset('bronze-study', 'Bronze Study', 'Warm', 'Burnished neutrals with deep bronze depth.', '#eee4d8', '#8a5638', '#6c8f86', '#271c18', { surfaceMode: 'velvet', shadowDepth: 0.82 }),

  preset('sea-glass', 'Sea Glass', 'Coastal', 'Misty mineral blues with a polished glass sheen.', '#e8f1ef', '#3b8190', '#7db0a1', '#1d2b30', { surfaceMode: 'glass' }),
  preset('lagoon-note', 'Lagoon Note', 'Coastal', 'Lagoon greens with calm editorial contrast.', '#e5f0ec', '#2f6f68', '#94b7c1', '#1a2825', { surfaceMode: 'glass' }),
  preset('mist-harbor', 'Mist Harbor', 'Coastal', 'Cloudy harbor blues and muted stone typography.', '#edf2f4', '#557c9b', '#89a08c', '#24303d'),
  preset('teal-monograph', 'Teal Monograph', 'Coastal', 'A darker scholarly teal with luminous highlights.', '#dfe9e8', '#2c7a78', '#d39b63', '#162626', { contrastMode: 'high' }),

  preset('pine-ritual', 'Pine Ritual', 'Botanical', 'Pine, bark, and fern in a quietly cinematic palette.', '#e6ede7', '#406046', '#9daa7d', '#1e2a20'),
  preset('olive-manuscript', 'Olive Manuscript', 'Botanical', 'Olive mineral tones with handwritten softness.', '#efede3', '#6f7048', '#8fa087', '#292819'),
  preset('botanical-shadow', 'Botanical Shadow', 'Botanical', 'Dark botanical greens with velvety contrast.', '#e5eadf', '#4a5f31', '#b38d60', '#1f2418', { surfaceMode: 'velvet' }),
  preset('celadon-dawn', 'Celadon Dawn', 'Botanical', 'Celadon paper lifted by warm coral details.', '#edf3ec', '#628a7a', '#d58a6f', '#1f2925'),

  preset('noir-velvet', 'Noir Velvet', 'Noir', 'Black velvet drama with editorial copper light.', '#151316', '#bf7b4d', '#8f93b6', '#f4efe9', { surfaceMode: 'ink', contrastMode: 'high', shadowDepth: 0.92, grainIntensity: 0.3 }),
  preset('silver-screen', 'Silver Screen', 'Noir', 'Monochrome cinema with muted platinum contrast.', '#1a1d22', '#d4d2ce', '#7f899b', '#f5f3ee', { surfaceMode: 'ink', contrastMode: 'high', motionDensity: 0.82 }),
  preset('midnight-plum', 'Midnight Plum', 'Noir', 'Deep plum and moonlit silver with a gallery hush.', '#191420', '#9260b8', '#d4a67f', '#f4eef8', { surfaceMode: 'ink', contrastMode: 'high' }),
  preset('ink-gallery', 'Ink Gallery', 'Noir', 'A charcoal-and-ivory gallery with soft cyan lift.', '#14181c', '#77a0c9', '#dbc7ab', '#eef2f4', { surfaceMode: 'ink', contrastMode: 'high', grainIntensity: 0.28 }),

  preset('blush-cinema', 'Blush Cinema', 'Pastel', 'Blush paper and apricot highlights with soft drama.', '#f7e8e6', '#ce7b6d', '#9fbecc', '#33252a'),
  preset('powder-bloom', 'Powder Bloom', 'Pastel', 'Powder blue, blush rose, and quiet studio light.', '#eef1f8', '#9f7bb0', '#d58f8a', '#2a2431'),
  preset('gallery-mint', 'Gallery Mint', 'Pastel', 'Mint plaster with petal-toned contrast.', '#edf6f2', '#6d9981', '#d39a95', '#223028'),
  preset('lilac-haze', 'Lilac Haze', 'Pastel', 'Hazy lilac and warm ivory with dreamlike softness.', '#f2edf8', '#8f74c9', '#dfad7a', '#272235'),

  preset('ivory-gold', 'Ivory Gold', 'Luxury', 'Ivory stock, antique gold, and quiet opulence.', '#f8f2e7', '#b48a3c', '#7f8e87', '#2b241a'),
  preset('sandstone-muse', 'Sandstone Muse', 'Luxury', 'Sandstone warmth with a polished bronze accent.', '#efe4d6', '#a7663e', '#698c96', '#2d221d'),
  preset('desert-modern', 'Desert Modern', 'Luxury', 'Desert limewash with sun-baked coral and teal.', '#f2e6d8', '#c76a4f', '#5f8c8c', '#2f241e'),
  preset('amber-dust', 'Amber Dust', 'Luxury', 'Amber glow against pale linen and smoky type.', '#f4ebdd', '#b86d2f', '#8f9a8a', '#31251a'),

  preset('monochrome-pearl', 'Monochrome Pearl', 'Monochrome', 'Pearl paper with ink-black contrast and cool steel accents.', '#f4f2ef', '#44464e', '#9ea6b2', '#1d1f23'),
  preset('charcoal-ivory', 'Charcoal Ivory', 'Monochrome', 'Ivory light over charcoal structure.', '#f5f1ea', '#2c3139', '#8f7c6e', '#202226'),
  preset('graphite-echo', 'Graphite Echo', 'Monochrome', 'Graphite, stone, and faint editorial bronze.', '#ece9e4', '#53555e', '#b48a70', '#23252a'),
  preset('pewter-page', 'Pewter Page', 'Monochrome', 'Pewter neutrals with a modern print mood.', '#eeefef', '#68707a', '#a68b70', '#23282d'),

  preset('electric-fig', 'Electric Fig', 'Jewel', 'Fig purple with electric teal against pale dust.', '#f1ebf2', '#7a4e8c', '#3e9ca6', '#261f29'),
  preset('cobalt-muse', 'Cobalt Muse', 'Jewel', 'Cobalt drama cut with pale clay and cool silver.', '#ebedf5', '#3e5eb8', '#b88a68', '#21273a'),
  preset('vineyard-smoke', 'Vineyard Smoke', 'Jewel', 'Wine-dark warmth and smoky green restraint.', '#efe7e7', '#874a5b', '#7f9a8e', '#2b2125'),
  preset('copper-storm', 'Copper Storm', 'Jewel', 'Copper sparks over slate and stormwashed blue.', '#e7e4e1', '#a45d41', '#5f7b9b', '#22262d'),

  preset('teal-afterglow', 'Teal Afterglow', 'Experimental', 'A luminous teal wash with warm ember detail.', '#e3f0ef', '#2d8c8b', '#de8558', '#1a2929', { surfaceMode: 'glow', shadowDepth: 0.78 }),
  preset('plum-nocturne', 'Plum Nocturne', 'Experimental', 'Nocturne plum and candlelit apricot.', '#ebe5ee', '#775287', '#d29d6d', '#261f2b', { surfaceMode: 'velvet' }),
  preset('opal-script', 'Opal Script', 'Experimental', 'Opal paper with shifting aqua and coral notes.', '#f2f4f2', '#6e8b8e', '#dc8b7a', '#232a2c', { surfaceMode: 'glow' }),
  preset('moss-satin', 'Moss Satin', 'Experimental', 'Satin moss softened with pale rose and ink.', '#e8ede6', '#5e7357', '#ca8c8c', '#222821', { surfaceMode: 'velvet' }),
];

export const defaultThemePreset = themePresets[0];
