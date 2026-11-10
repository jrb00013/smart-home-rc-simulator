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
Tex.variant('weathered.grey', 'wood.weathered', { base: '#8a8580' });
Tex.variant('weathered.barn', 'wood.weathered', { base: '#7a6a5a' });
Tex.variant('marble.carrara', 'stone.marble', { base: '#ece9e2' });
Tex.variant('marble.calacatta', 'stone.marble', { base: '#f0ede6' });
Tex.variant('marble.grey', 'stone.marble', { base: '#c8c8c8' });
Tex.variant('marble.cream', 'stone.marble', { base: '#efe6d0' });
Tex.variant('granite.black', 'stone.granite', { base: '#3a3a3e' });
Tex.variant('granite.white', 'stone.granite', { base: '#c8c8cc' });
Tex.variant('granite.brown', 'stone.granite', { base: '#6a5040' });
Tex.variant('granite.green', 'stone.granite', { base: '#4a5a50' });
Tex.variant('slate.charcoal', 'stone.slate', { base: '#2f343c' });
Tex.variant('slate.blue', 'stone.slate', { base: '#3a4a60' });
Tex.variant('terrazzo.pink', 'stone.terrazzo', { base: '#f0d8d0' });
Tex.variant('terrazzo.green', 'stone.terrazzo', { base: '#d8e6d8' });
Tex.variant('limestone.white', 'stone.limestone', { base: '#e6ddc8' });
Tex.variant('limestone.grey', 'stone.limestone', { base: '#c0b8a8' });
Tex.variant('limestone.sand', 'stone.limestone', { base: '#d8c8a8' });
Tex.variant('ceramic.white', 'tile.ceramic', { base: '#f4f4f2' });
Tex.variant('ceramic.cream', 'tile.ceramic', { base: '#efe6d2' });
Tex.variant('ceramic.sage', 'tile.ceramic', { base: '#c8d4c0' });
Tex.variant('ceramic.blue', 'tile.ceramic', { base: '#bcd0e0' });
Tex.variant('subway.white', 'tile.subway', { base: '#f6f6f4' });
Tex.variant('subway.black', 'tile.subway', { base: '#2a2a2c' });
Tex.variant('subway.green', 'tile.subway', { base: '#c0d4c4' });
Tex.variant('hex.white', 'tile.hex', { base: '#f2f2ee' });
