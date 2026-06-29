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
    { type: 'heart',     label: 'Heart',            svg: SVG_HEART,    realWidthCm: 14, aspectRatio: 90 / 100 },
    { type: 'ring',      label: 'Ring',             svg: SVG_RING,     realWidthCm: 12, aspectRatio: 120 / 100 },
    { type: 'balloon',   label: 'Balloon',          svg: SVG_BALLOON,  realWidthCm: 10, aspectRatio: 130 / 80 },
    { type: 'star',      label: 'Star',             svg: SVG_STAR,     realWidthCm: 13, aspectRatio: 96 / 100 },
    { type: 'banner',    label: 'Banner ribbon',    svg: SVG_BANNER,   realWidthCm: 18, aspectRatio: 70 / 200 },
    { type: 'flutes',    label: 'Champagne flutes', svg: SVG_FLUTES,   realWidthCm: 12, aspectRatio: 140 / 110 },
    { type: 'confetti',  label: 'Confetti burst',   svg: SVG_CONFETTI, realWidthCm: 15, aspectRatio: 120 / 120 }
  ];

  // Numeral glyphs 0-9, each its own catalog entry (type 'num-N').
  for (var d = 0; d <= 9; d++) {
    CATALOG.push({
      type: 'num-' + d,
      label: 'Number ' + d,
      svg: numeralSvg(d),
      realWidthCm: 8,
      aspectRatio: 96 / 60
    });
  }

  // Index by type for O(1) lookup.
  var BY_TYPE = {};
  for (var i = 0; i < CATALOG.length; i++) {
    BY_TYPE[CATALOG[i].type] = CATALOG[i];
  }

  function getCatalog() {
    // Return a shallow copy so callers cannot mutate the bundled source array.
    return CATALOG.slice();
  }

  function getCatalogEntry(type) {
    return BY_TYPE[type];
  }

  var api = {
    getCatalog: getCatalog,
    getCatalogEntry: getCatalogEntry
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
