// Named material palette.
//
// Each entry is a reusable finish derived from a procedural generator in textures.js
// via Tex.variant(name, base, overrides). Decor props and future scene work reference
// these names, so a wall colour or wood tone is changed in one place. Kept separate
// from the generators so the library stays about rendering and this file stays about
// the house's material choices.
Tex.variant('oak.natural', 'wood.oak', { base: '#b07a45' });
Tex.variant('oak.honey', 'wood.oak', { base: '#c99a5e' });
Tex.variant('oak.dark', 'wood.oak', { base: '#6a4a2a' });
Tex.variant('oak.grey', 'wood.oak', { base: '#9a9288' });
Tex.variant('walnut.espresso', 'wood.walnut', { base: '#3a2416' });
Tex.variant('walnut.red', 'wood.walnut', { base: '#6a3a26' });
Tex.variant('walnut.light', 'wood.walnut', { base: '#8a6a48' });
Tex.variant('pine.white', 'wood.pine', { base: '#e8dcc0' });
Tex.variant('pine.antique', 'wood.pine', { base: '#c8a86a' });
Tex.variant('pine.knotty', 'wood.pine', { base: '#d0b080' });
Tex.variant('cherry.dark', 'wood.cherry', { base: '#5a2416' });
Tex.variant('cherry.warm', 'wood.cherry', { base: '#8a4026' });
Tex.variant('bamboo.blonde', 'wood.bamboo', { base: '#dcc088' });
Tex.variant('bamboo.dark', 'wood.bamboo', { base: '#9a7a48' });
Tex.variant('parquet.maple', 'wood.parquet', { base: '#c9a86a' });
Tex.variant('parquet.walnut', 'wood.parquet', { base: '#6a4a30' });
Tex.variant('weathered.white', 'wood.weathered', { base: '#d8d4cc' });
