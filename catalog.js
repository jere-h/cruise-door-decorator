/*
 * catalog.js - Cruise Door Decal Studio
 *
 * Hardcoded bundled decal catalog. Every decal is a generic, clearly-owned
 * inline SVG (no Disney / no third-party IP art) so the whole gallery ships
 * self-contained with zero external or CDN assets. Each entry visually
 * showcases the use-case on first paint.
 *
 * Each DecalCatalogEntry is:
 *   { type, label, svg, realWidthCm, aspectRatio }
 * where aspectRatio is the viewBox height / width (h/w) so a placed decal's
 * print height = widthCm * aspectRatio stays true to the artwork proportion.
 *
 * Public API (attached to window.CDDS.catalog, also module.exports for Node):
 *   getCatalog()            -> DecalCatalogEntry[]
 *   getCatalogEntry(type)   -> DecalCatalogEntry | undefined
 */
(function () {
  'use strict';

  // All artwork uses an explicit viewBox + preserveAspectRatio="xMidYMid meet"
  // so the renderer never distorts the glyph regardless of the placed box.
  // aspectRatio below is derived directly from each viewBox (height / width).
  // All realWidthCm are kept well below usable A4 width (~190mm = 19cm minus
  // margins) so any single decal always fits one print page.

  var ACCENT = '#1f6feb'; // single nautical accent, matches contract Accent Lock

  // --- Inline SVG artwork ---------------------------------------------------
  // viewBox dimensions are noted beside each so aspectRatio is auditable.

  // heart: viewBox 0 0 100 90  -> aspectRatio 90/100 = 0.9
  var SVG_HEART =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Heart">' +
    '<path d="M50 86 L12 47 C-1 34 -1 14 14 7 C28 0 42 9 50 22 ' +
    'C58 9 72 0 86 7 C101 14 101 34 88 47 Z" ' +
    'fill="#e3506a" stroke="#b23552" stroke-width="3" stroke-linejoin="round"/>' +
    '</svg>';

  // ring band: viewBox 0 0 100 120 -> aspectRatio 120/100 = 1.2
  var SVG_RING =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ring band">' +
    '<polygon points="50,6 64,26 36,26" fill="#9fd0ff" stroke="#5aa0e0" stroke-width="2"/>' +
    '<polygon points="50,6 64,26 50,30 36,26" fill="#d7ecff"/>' +
    '<circle cx="50" cy="74" r="40" fill="none" stroke="#d4af37" stroke-width="12"/>' +
    '<circle cx="50" cy="74" r="40" fill="none" stroke="#f3d98a" stroke-width="4"/>' +
    '</svg>';

  // balloon: viewBox 0 0 80 130 -> aspectRatio 130/80 = 1.625
  var SVG_BALLOON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 130" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Balloon">' +
    '<ellipse cx="40" cy="48" rx="36" ry="44" fill="' + ACCENT + '" ' +
    'stroke="#16529f" stroke-width="2"/>' +
    '<ellipse cx="28" cy="34" rx="9" ry="14" fill="#ffffff" opacity="0.35"/>' +
    '<polygon points="40,92 33,102 47,102" fill="#16529f"/>' +
    '<path d="M40 102 C50 112 30 120 40 128" fill="none" ' +
    'stroke="#5b6b7b" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';

  // star: viewBox 0 0 100 96 -> aspectRatio 96/100 = 0.96
  var SVG_STAR =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 96" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Star">' +
    '<polygon points="50,4 61,36 95,36 67,57 78,90 50,69 22,90 33,57 5,36 39,36" ' +
    'fill="#f4c542" stroke="#d39a16" stroke-width="3" stroke-linejoin="round"/>' +
    '</svg>';

  // banner ribbon: viewBox 0 0 200 70 -> aspectRatio 70/200 = 0.35
  var SVG_BANNER =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 70" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Banner ribbon">' +
    '<polygon points="0,12 16,30 0,48" fill="#16529f"/>' +
    '<polygon points="200,12 184,30 200,48" fill="#16529f"/>' +
    '<path d="M14 8 H186 L176 30 L186 52 H14 L24 30 Z" ' +
    'fill="' + ACCENT + '" stroke="#16529f" stroke-width="2" stroke-linejoin="round"/>' +
    '<text x="100" y="38" text-anchor="middle" font-family="Georgia, serif" ' +
    'font-size="22" font-style="italic" fill="#ffffff">Bon Voyage</text>' +
    '</svg>';

  // champagne flutes: viewBox 0 0 110 140 -> aspectRatio 140/110 = 1.2727272727272727
  var SVG_FLUTES =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 140" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Champagne flutes">' +
    '<g stroke="#9bb3c9" stroke-width="2" fill="#eaf3fb">' +
    '<path d="M30 18 C30 46 40 58 40 58 L40 110" transform="rotate(-12 40 60)"/>' +
    '<path d="M80 18 C80 46 70 58 70 58 L70 110" transform="rotate(12 70 60)"/>' +
    '</g>' +
    '<path d="M24 16 L46 16 C44 40 36 50 35 50 C34 50 26 40 24 16 Z" ' +
    'transform="rotate(-12 35 33)" fill="#f6e7a8" stroke="#d9c071" stroke-width="2"/>' +
    '<path d="M64 16 L86 16 C84 40 76 50 75 50 C74 50 66 40 64 16 Z" ' +
    'transform="rotate(12 75 33)" fill="#f6e7a8" stroke="#d9c071" stroke-width="2"/>' +
    '<rect x="30" y="108" width="22" height="6" rx="3" fill="#9bb3c9"/>' +
    '<rect x="58" y="108" width="22" height="6" rx="3" fill="#9bb3c9"/>' +
    '</svg>';

  // confetti burst: viewBox 0 0 120 120 -> aspectRatio 120/120 = 1
  var SVG_CONFETTI =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Confetti burst">' +
    '<g stroke-width="0">' +
    '<rect x="56" y="6" width="8" height="14" rx="2" fill="#e3506a" transform="rotate(18 60 13)"/>' +
    '<rect x="100" y="48" width="8" height="14" rx="2" fill="#f4c542" transform="rotate(70 104 55)"/>' +
    '<rect x="12" y="44" width="8" height="14" rx="2" fill="' + ACCENT + '" transform="rotate(-40 16 51)"/>' +
    '<rect x="30" y="96" width="8" height="14" rx="2" fill="#3aa86b" transform="rotate(28 34 103)"/>' +
    '<rect x="86" y="92" width="8" height="14" rx="2" fill="#e3506a" transform="rotate(-30 90 99)"/>' +
    '<circle cx="60" cy="60" r="7" fill="#f4c542"/>' +
    '<circle cx="38" cy="26" r="5" fill="' + ACCENT + '"/>' +
    '<circle cx="92" cy="30" r="5" fill="#3aa86b"/>' +
    '<circle cx="22" cy="80" r="5" fill="#e3506a"/>' +
    '<circle cx="98" cy="80" r="5" fill="' + ACCENT + '"/>' +
    '<circle cx="60" cy="104" r="5" fill="#f4c542"/>' +
    '</g>' +
    '</svg>';

  // --- Character fan-art ----------------------------------------------------
  // Original, hand-authored SVG artwork inspired by the kinds of characters
  // fans love (a round-eared mouse, a fairy-tale castle, a tiara, a sprite, a
  // magic lamp, a reef fish, a mermaid tail, a snowflake). None of these are
  // traced from or copies of any copyrighted character art — they are generic,
  // owned glyphs so the gallery stays self-contained and IP-clean.

  // mouse head silhouette: viewBox 0 0 100 86 -> aspectRatio 86/100 = 0.86
  var SVG_MOUSE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 86" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mouse ears">' +
    '<circle cx="24" cy="20" r="17" fill="#222222"/>' +
    '<circle cx="76" cy="20" r="17" fill="#222222"/>' +
    '<circle cx="50" cy="56" r="29" fill="#222222"/>' +
    '</svg>';

  // fairy-tale castle: viewBox 0 0 120 120 -> aspectRatio 1
  var SVG_CASTLE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Castle">' +
    '<rect x="18" y="72" width="84" height="44" rx="2" fill="#dde9f6" stroke="#9bb6d6" stroke-width="2"/>' +
    '<rect x="12" y="60" width="20" height="56" fill="#caddee" stroke="#9bb6d6" stroke-width="2"/>' +
    '<rect x="88" y="60" width="20" height="56" fill="#caddee" stroke="#9bb6d6" stroke-width="2"/>' +
    '<rect x="51" y="46" width="18" height="70" fill="#eaf3fc" stroke="#9bb6d6" stroke-width="2"/>' +
    '<polygon points="10,60 34,60 22,38" fill="#4f86c6"/>' +
    '<polygon points="86,60 110,60 98,38" fill="#4f86c6"/>' +
    '<polygon points="49,46 71,46 60,20" fill="#e58bb0"/>' +
    '<line x1="22" y1="38" x2="22" y2="28" stroke="#caa53a" stroke-width="2"/>' +
    '<polygon points="22,28 32,31 22,34" fill="#f4c542"/>' +
    '<line x1="98" y1="38" x2="98" y2="28" stroke="#caa53a" stroke-width="2"/>' +
    '<polygon points="98,28 108,31 98,34" fill="#f4c542"/>' +
    '<line x1="60" y1="20" x2="60" y2="8" stroke="#caa53a" stroke-width="2"/>' +
    '<polygon points="60,8 72,12 60,16" fill="#f4c542"/>' +
    '<path d="M52 116 V96 a8 8 0 0 1 16 0 V116 Z" fill="#7c5a99"/>' +
    '<rect x="20" y="80" width="8" height="10" rx="1" fill="#7fb0e0"/>' +
    '<rect x="92" y="80" width="8" height="10" rx="1" fill="#7fb0e0"/>' +
    '</svg>';

  // princess crown / tiara: viewBox 0 0 120 84 -> aspectRatio 84/120 = 0.7
  var SVG_CROWN =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 84" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Crown">' +
    '<path d="M14 70 L24 28 L46 52 L60 22 L74 52 L96 28 L106 70 Z" ' +
    'fill="#f4c542" stroke="#d39a16" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="13" y="68" width="94" height="12" rx="4" fill="#e7b637" stroke="#d39a16" stroke-width="3"/>' +
    '<circle cx="24" cy="24" r="5" fill="#e3506a"/>' +
    '<circle cx="60" cy="18" r="6" fill="#e3506a"/>' +
    '<circle cx="96" cy="24" r="5" fill="#e3506a"/>' +
    '<circle cx="40" cy="74" r="3.5" fill="#4f86c6"/>' +
    '<circle cx="60" cy="74" r="3.5" fill="#3aa86b"/>' +
    '<circle cx="80" cy="74" r="3.5" fill="#4f86c6"/>' +
    '</svg>';

  // fairy / sprite: viewBox 0 0 100 116 -> aspectRatio 116/100 = 1.16
  var SVG_FAIRY =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Fairy">' +
    '<ellipse cx="33" cy="58" rx="20" ry="28" fill="#bfe3c9" opacity="0.85" stroke="#8fcda3" stroke-width="2"/>' +
    '<ellipse cx="67" cy="58" rx="20" ry="28" fill="#bfe3c9" opacity="0.85" stroke="#8fcda3" stroke-width="2"/>' +
    '<path d="M38 44 L62 44 L72 98 L28 98 Z" fill="#7ed0a3" stroke="#4fae7e" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="33" r="11" fill="#ffd9b3" stroke="#e6b58a" stroke-width="1.5"/>' +
    '<path d="M39 30 q11 -16 22 0 q-11 -7 -22 0 Z" fill="#f0c14b"/>' +
    '<line x1="64" y1="50" x2="84" y2="30" stroke="#caa53a" stroke-width="3" stroke-linecap="round"/>' +
    '<polygon points="84,21 87,29 95,29 89,34 91,42 84,37 77,42 79,34 73,29 81,29" fill="#f4c542"/>' +
    '</svg>';

  // magic lamp: viewBox 0 0 130 80 -> aspectRatio 80/130 = 0.6153846153846154
  var SVG_LAMP =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 80" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Magic lamp">' +
    '<path d="M18 56 Q65 22 112 56 Z" fill="#f4c542" stroke="#b6892a" stroke-width="2" stroke-linejoin="round"/>' +
    '<ellipse cx="65" cy="56" rx="48" ry="12" fill="#e7b637" stroke="#b6892a" stroke-width="2"/>' +
    '<rect x="58" y="38" width="14" height="9" rx="2" fill="#f6db8e" stroke="#b6892a" stroke-width="1.5"/>' +
    '<circle cx="65" cy="34" r="5" fill="#e7b637" stroke="#b6892a" stroke-width="1.5"/>' +
    '<path d="M112 48 q16 0 16 9 t-14 8" fill="none" stroke="#e7b637" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M18 50 q-12 2 -8 13" fill="none" stroke="#e7b637" stroke-width="6" stroke-linecap="round"/>' +
    '<polygon points="34,10 37,18 45,19 39,24 41,32 34,27 27,32 29,24 23,19 31,18" fill="#9fd0ff"/>' +
    '</svg>';

  // reef clownfish: viewBox 0 0 130 84 -> aspectRatio 84/130 = 0.6461538461538462
  var SVG_FISH =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 84" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Clownfish">' +
    '<polygon points="12,42 36,22 36,62" fill="#ef8a3c"/>' +
    '<ellipse cx="76" cy="42" rx="44" ry="26" fill="#f3933f" stroke="#d9711f" stroke-width="2"/>' +
    '<path d="M58 17 q9 -9 19 -4 l-3 14 Z" fill="#ef8a3c"/>' +
    '<path d="M60 67 q7 8 17 5 l-3 -13 Z" fill="#ef8a3c"/>' +
    '<path d="M46 22 q11 20 0 40 q11 4 17 0 q-9 -20 0 -40 q-8 -4 -17 0 Z" fill="#ffffff"/>' +
    '<path d="M88 24 q9 18 0 36 q9 2 13 -2 q-7 -16 0 -32 q-6 -4 -13 -2 Z" fill="#ffffff"/>' +
    '<circle cx="100" cy="38" r="7" fill="#ffffff" stroke="#d9711f" stroke-width="1.5"/>' +
    '<circle cx="102" cy="38" r="3.5" fill="#222222"/>' +
    '<path d="M108 50 q7 2 11 -2" stroke="#d9711f" fill="none" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';

  // mermaid tail: viewBox 0 0 90 120 -> aspectRatio 120/90 = 1.3333333333333333
  var SVG_MERMAID =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 120" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mermaid tail">' +
    '<path d="M45 8 C30 30 30 60 38 84 C20 92 14 110 30 116 C40 112 44 104 45 98 ' +
    'C46 104 50 112 60 116 C76 110 70 92 52 84 C60 60 60 30 45 8 Z" ' +
    'fill="#3fb6a8" stroke="#2a8a7e" stroke-width="2" stroke-linejoin="round"/>' +
    '<g fill="none" stroke="#2a8a7e" stroke-width="1.5" opacity="0.7">' +
    '<path d="M38 26 q7 6 14 0"/><path d="M36 40 q9 7 18 0"/>' +
    '<path d="M35 56 q10 8 20 0"/><path d="M36 72 q9 7 18 0"/></g>' +
    '</svg>';

  // snowflake: viewBox 0 0 100 100 -> aspectRatio 1
  var SVG_SNOWFLAKE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" ' +
    'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Snowflake">' +
    '<g stroke="#7fc4e6" stroke-width="4" stroke-linecap="round" fill="none">' +
    '<line x1="50" y1="12" x2="50" y2="88"/>' +
    '<line x1="17" y1="31" x2="83" y2="69"/>' +
    '<line x1="83" y1="31" x2="17" y2="69"/>' +
    '<path d="M50 22 l-8 8 M50 22 l8 8"/>' +
    '<path d="M50 78 l-8 -8 M50 78 l8 -8"/>' +
    '<path d="M26 36 l-2 11 M26 36 l11 -2"/>' +
    '<path d="M74 64 l2 -11 M74 64 l-11 2"/>' +
    '<path d="M74 36 l-11 -2 M74 36 l2 11"/>' +
    '<path d="M26 64 l11 2 M26 64 l-2 -11"/>' +
    '</g>' +
    '<circle cx="50" cy="50" r="5" fill="#bfe6f5"/>' +
    '</svg>';

  // Numeral glyph builder. Each numeral shares one square-ish viewBox so they
  // line up when spelling a milestone. viewBox 0 0 60 96 -> aspectRatio 96/60 = 1.6
  function numeralSvg(digit) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 96" ' +
      'preserveAspectRatio="xMidYMid meet" role="img" aria-label="Numeral ' + digit + '">' +
      '<rect x="2" y="2" width="56" height="92" rx="10" ' +
      'fill="#ffffff" stroke="' + ACCENT + '" stroke-width="3"/>' +
      '<text x="30" y="68" text-anchor="middle" ' +
      'font-family="Georgia, \'Times New Roman\', serif" font-weight="700" ' +
      'font-size="64" fill="' + ACCENT + '">' + digit + '</text>' +
      '</svg>'
    );
  }

  // --- Catalog entries ------------------------------------------------------
  // aspectRatio values are the literal viewBox h/w; a unit test asserts each
  // entry's aspectRatio matches the height/width parsed from its own viewBox.

  var CATALOG = [
    // Character fan-art (original, IP-clean glyphs).
    { type: 'mouse',     label: 'Mouse ears',       svg: SVG_MOUSE,     realWidthCm: 16, aspectRatio: 86 / 100,  category: 'character' },
    { type: 'castle',    label: 'Castle',           svg: SVG_CASTLE,    realWidthCm: 18, aspectRatio: 120 / 120, category: 'character' },
    { type: 'crown',     label: 'Crown',            svg: SVG_CROWN,     realWidthCm: 16, aspectRatio: 84 / 120,  category: 'character' },
    { type: 'fairy',     label: 'Fairy',            svg: SVG_FAIRY,     realWidthCm: 13, aspectRatio: 116 / 100, category: 'character' },
    { type: 'lamp',      label: 'Magic lamp',       svg: SVG_LAMP,      realWidthCm: 16, aspectRatio: 80 / 130,  category: 'character' },
    { type: 'fish',      label: 'Clownfish',        svg: SVG_FISH,      realWidthCm: 16, aspectRatio: 84 / 130,  category: 'character' },
    { type: 'mermaid',   label: 'Mermaid tail',     svg: SVG_MERMAID,   realWidthCm: 12, aspectRatio: 120 / 90,  category: 'character' },
    { type: 'snowflake', label: 'Snowflake',        svg: SVG_SNOWFLAKE, realWidthCm: 12, aspectRatio: 100 / 100, category: 'character' },

    // Celebration decals.
    { type: 'heart',     label: 'Heart',            svg: SVG_HEART,    realWidthCm: 14, aspectRatio: 90 / 100,   category: 'celebration' },
    { type: 'ring',      label: 'Ring',             svg: SVG_RING,     realWidthCm: 12, aspectRatio: 120 / 100,  category: 'celebration' },
    { type: 'balloon',   label: 'Balloon',          svg: SVG_BALLOON,  realWidthCm: 10, aspectRatio: 130 / 80,   category: 'celebration' },
    { type: 'star',      label: 'Star',             svg: SVG_STAR,     realWidthCm: 13, aspectRatio: 96 / 100,   category: 'celebration' },
    { type: 'banner',    label: 'Banner ribbon',    svg: SVG_BANNER,   realWidthCm: 18, aspectRatio: 70 / 200,   category: 'celebration' },
    { type: 'flutes',    label: 'Champagne flutes', svg: SVG_FLUTES,   realWidthCm: 12, aspectRatio: 140 / 110,  category: 'celebration' },
    { type: 'confetti',  label: 'Confetti burst',   svg: SVG_CONFETTI, realWidthCm: 15, aspectRatio: 120 / 120,  category: 'celebration' }
  ];

  // Numeral glyphs 0-9, each its own catalog entry (type 'num-N').
  for (var d = 0; d <= 9; d++) {
    CATALOG.push({
      type: 'num-' + d,
      label: 'Number ' + d,
      svg: numeralSvg(d),
      realWidthCm: 8,
      aspectRatio: 96 / 60,
      category: 'number'
    });
  }

  // Mark every bundled entry as inline-SVG artwork so the renderer can tell
  // built-in glyphs apart from user-uploaded raster (image) decals.
  for (var ci = 0; ci < CATALOG.length; ci++) {
    CATALOG[ci].kind = 'svg';
  }

  // Index by type for O(1) lookup.
  var BY_TYPE = {};
  for (var i = 0; i < CATALOG.length; i++) {
    BY_TYPE[CATALOG[i].type] = CATALOG[i];
  }

  // --- Custom (user-uploaded) decals ---------------------------------------
  // Uploaded PNGs are registered at runtime as raster decal entries (kind
  // 'image', carrying a data-URL in `image` instead of an inline `svg`). They
  // live alongside the bundled catalog so the rest of the app can resolve them
  // through the same getCatalogEntry() lookup. persistence.js re-registers them
  // on load before the saved composition is rehydrated.
  var CUSTOM = [];

  function registerCustomDecal(entry) {
    if (!entry || typeof entry !== 'object') return null;
    if (typeof entry.type !== 'string' || !entry.type) return null;
    if (typeof entry.image !== 'string' || !entry.image) return null;
    var aspect = (isFinite(entry.aspectRatio) && entry.aspectRatio > 0) ? entry.aspectRatio : 1;
    var width = (isFinite(entry.realWidthCm) && entry.realWidthCm > 0) ? entry.realWidthCm : 15;
    var clean = {
      type: entry.type,
      label: typeof entry.label === 'string' && entry.label ? entry.label : 'Upload',
      image: entry.image,
      realWidthCm: width,
      aspectRatio: aspect,
      kind: 'image',
      category: 'custom'
    };
    // Replace any existing entry of the same type (idempotent re-registration).
    if (BY_TYPE[clean.type]) {
      for (var j = 0; j < CUSTOM.length; j++) {
        if (CUSTOM[j].type === clean.type) { CUSTOM[j] = clean; break; }
      }
    } else {
      CUSTOM.push(clean);
    }
    BY_TYPE[clean.type] = clean;
    return clean;
  }

  function getCustomDecals() {
    // Serializable copies for persistence.
    return CUSTOM.map(function (e) {
      return {
        type: e.type,
        label: e.label,
        image: e.image,
        realWidthCm: e.realWidthCm,
        aspectRatio: e.aspectRatio
      };
    });
  }

  function getCatalog() {
    // Bundled glyphs first, then user uploads. Shallow copy so callers cannot
    // mutate the bundled source array.
    return CATALOG.concat(CUSTOM);
  }

  function getCatalogEntry(type) {
    return BY_TYPE[type];
  }

  var api = {
    getCatalog: getCatalog,
    getCatalogEntry: getCatalogEntry,
    registerCustomDecal: registerCustomDecal,
    getCustomDecals: getCustomDecals
  };

  // Browser: attach to the shared CDDS namespace.
  if (typeof window !== 'undefined') {
    window.CDDS = window.CDDS || {};
    window.CDDS.catalog = api;
  }

  // Node (unit tests): export the public API + constants.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
