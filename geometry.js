/*
 * geometry.js — Units / Geometry module (Cruise Door Decal Studio)
 *
 * The single source of truth for all sizing. Pure functions only, so the exact
 * same code runs in the browser and under Node unit tests.
 *
 * Core principle: cm is the source of truth. The on-screen preview is merely
 * proportional (scaled by a fixed PX_PER_CM, never a CSS transform zoom). Only
 * the printed A4 sheet, laid out in physical cm/mm CSS units, is claimed to be
 * true-to-size. Nothing here multiplies by a DPI to get pixels for print.
 */
(function () {
  'use strict';

  // --- Real-world reference dimensions -------------------------------------
  // A representative cruise stateroom door.
  var DOOR_W_CM = 66;
  var DOOR_H_CM = 190;

  // ISO A4 page, in millimetres (portrait).
  var A4_W_MM = 210;
  var A4_H_MM = 297;

  // Fixed printable margin on every edge of the A4 sheet, in millimetres.
  // styles.css mirrors this in its @page { margin } rule.
  var PAGE_MARGIN_MM = 10;

  // --- Preview scale --------------------------------------------------------
  // The preview is scaled so the full door height fits a comfortable target
  // height on screen. This yields ONE fixed pixels-per-cm factor; there is no
  // separate zoom transform, so px<->cm conversions are a simple multiply.
  var TARGET_MAX_PREVIEW_HEIGHT_PX = 620;
  var PX_PER_CM = TARGET_MAX_PREVIEW_HEIGHT_PX / DOOR_H_CM;

  // --- cm <-> preview px round-trip ----------------------------------------

  /**
   * Convert a centimetre measurement to on-screen preview pixels.
   * @param {number} cm
   * @returns {number} pixels (may be fractional)
   */
  function cmToPreviewPx(cm) {
    var value = Number(cm);
    if (!isFinite(value)) return 0;
    return value * PX_PER_CM;
  }

  /**
   * Convert on-screen preview pixels back to centimetres.
   * Inverse of cmToPreviewPx within floating-point tolerance.
   * @param {number} px
   * @returns {number} centimetres
   */
  function previewPxToCm(px) {
    var value = Number(px);
    if (!isFinite(value)) return 0;
    return value / PX_PER_CM;
  }

  // --- Door-bounds clamping -------------------------------------------------

  /**
   * Clamp a placed decal so it stays fully inside the door.
   *
   * Sizes are in cm. The decal's printed height is derived from its width and
   * the catalog aspect ratio (h/w); callers pass that ratio so geometry stays
   * free of any catalog dependency.
   *
   * @param {{xCm:number, yCm:number, widthCm:number, aspectRatio?:number}} decal
   * @param {{widthCm:number, heightCm:number}} door
   * @returns {{xCm:number, yCm:number, widthCm:number}} a NEW clamped decal
   *          (other fields are preserved)
   */
  function clampDecalToDoor(decal, door) {
    var d = decal || {};
    var doorW = (door && isFinite(door.widthCm)) ? door.widthCm : DOOR_W_CM;
    var doorH = (door && isFinite(door.heightCm)) ? door.heightCm : DOOR_H_CM;

    var ratio = (isFinite(d.aspectRatio) && d.aspectRatio > 0) ? d.aspectRatio : 1;

    // Width can never exceed the door width.
    var widthCm = isFinite(d.widthCm) ? d.widthCm : 0;
    widthCm = Math.max(0, Math.min(widthCm, doorW));

    var heightCm = widthCm * ratio;
    // If the derived height overflows the door, shrink width to fit (preserve ratio).
    if (heightCm > doorH && ratio > 0) {
      heightCm = doorH;
      widthCm = heightCm / ratio;
    }

    // Position so the decal box stays within [0, door - size].
    var maxX = Math.max(0, doorW - widthCm);
    var maxY = Math.max(0, doorH - heightCm);

    var xCm = isFinite(d.xCm) ? d.xCm : 0;
    var yCm = isFinite(d.yCm) ? d.yCm : 0;
    xCm = Math.max(0, Math.min(xCm, maxX));
    yCm = Math.max(0, Math.min(yCm, maxY));

    // Return a shallow copy with corrected geometry, preserving other fields.
    var out = {};
    for (var k in d) {
      if (Object.prototype.hasOwnProperty.call(d, k)) out[k] = d[k];
    }
    out.xCm = xCm;
    out.yCm = yCm;
    out.widthCm = widthCm;
    return out;
  }

  // --- Print packing (shelf / row algorithm) -------------------------------

  /**
   * Usable A4 area (page minus margins on every side), in millimetres.
   * @returns {{widthMm:number, heightMm:number}}
   */
  function usablePageMm() {
    return {
      widthMm: A4_W_MM - 2 * PAGE_MARGIN_MM,
      heightMm: A4_H_MM - 2 * PAGE_MARGIN_MM
    };
  }

  /**
   * Resolve a placed decal's printed size in millimetres.
   * Real-world width comes from the placed decal (widthCm); the aspect ratio
   * (h/w) comes from its catalog entry. Sizes are physical (cm*10 = mm); there
   * is NO DPI/px multiplication.
   *
   * @param {{type:string, widthCm:number}} decal
   * @param {function(string):({aspectRatio:number}|undefined)} getEntry
   * @returns {{widthMm:number, heightMm:number}}
   */
  function printSizeMm(decal, getEntry) {
    var widthCm = (decal && isFinite(decal.widthCm)) ? decal.widthCm : 0;
    var entry = (typeof getEntry === 'function' && decal) ? getEntry(decal.type) : undefined;
    var ratio = (entry && isFinite(entry.aspectRatio) && entry.aspectRatio > 0)
      ? entry.aspectRatio
      : 1;
    return { widthMm: widthCm * 10, heightMm: widthCm * 10 * ratio };
  }

  /**
   * Clamp a printed size (mm) to the usable A4 page, preserving aspect ratio.
   * A single decal larger than a page would otherwise spill off the sheet.
   *
   * @param {{widthMm:number, heightMm:number}} sizeMm
   * @returns {{widthMm:number, heightMm:number}}
   */
  function clampSizeToPage(sizeMm) {
    var page = usablePageMm();
    var w = Math.max(0, sizeMm.widthMm);
    var h = Math.max(0, sizeMm.heightMm);
    if (w <= 0 || h <= 0) return { widthMm: w, heightMm: h };

    var scale = Math.min(1, page.widthMm / w, page.heightMm / h);
    return { widthMm: w * scale, heightMm: h * scale };
  }

  /**
   * Pack placed decals into A4 pages using a shelf (row) bin-packing approach,
   * then paginate. Everything is laid out within the usable area (page minus
   * margins) and positioned in millimetres relative to that usable origin.
   *
   * A decal too large for a page is clamped to the usable page size (guard).
   *
   * @param {Array<{id:string, type:string, widthCm:number}>} decals
   * @param {{getCatalogEntry:function(string):object}|function(string):object} catalog
   *        Either the catalog module (with getCatalogEntry) or a bare lookup fn.
   * @returns {{pages: Array<Array<{decal:object, xMm:number, yMm:number, widthMm:number, heightMm:number}>>}}
   */
  function packPrintLayout(decals, catalog) {
    var page = usablePageMm();
    var GAP_MM = 5; // breathing room between cutouts for easier cutting

    // Normalise the catalog lookup into a single function.
    var getEntry;
    if (typeof catalog === 'function') {
      getEntry = catalog;
    } else if (catalog && typeof catalog.getCatalogEntry === 'function') {
      getEntry = function (type) { return catalog.getCatalogEntry(type); };
    } else {
      getEntry = function () { return undefined; };
    }

    var list = Array.isArray(decals) ? decals.slice() : [];

    // Precompute each decal's clamped printed size.
    var items = list.map(function (decal) {
      var raw = printSizeMm(decal, getEntry);
      var sized = clampSizeToPage(raw);
      return { decal: decal, widthMm: sized.widthMm, heightMm: sized.heightMm };
    });

    // Shelf packing: tallest-first reduces wasted vertical space per row.
    items.sort(function (a, b) { return b.heightMm - a.heightMm; });

    var pages = [];
    var current = [];
    var cursorX = 0;          // left offset within usable area
    var cursorY = 0;          // top offset of the current shelf
    var shelfHeight = 0;      // tallest item in the current shelf

    function startNewPage() {
      if (current.length) pages.push(current);
      current = [];
      cursorX = 0;
      cursorY = 0;
      shelfHeight = 0;
    }

    items.forEach(function (item) {
      var w = item.widthMm;
      var h = item.heightMm;

      // New shelf if this item won't fit in the remaining width of the row.
      if (cursorX > 0 && cursorX + w > page.widthMm + 1e-9) {
        cursorY += shelfHeight + GAP_MM;
        cursorX = 0;
        shelfHeight = 0;
      }

      // New page if the shelf won't fit vertically.
      if (cursorY + h > page.heightMm + 1e-9 && (cursorX > 0 || cursorY > 0)) {
        startNewPage();
      }

      current.push({
        decal: item.decal,
        xMm: cursorX,
        yMm: cursorY,
        widthMm: w,
        heightMm: h
      });

      cursorX += w + GAP_MM;
      if (h > shelfHeight) shelfHeight = h;
    });

    if (current.length) pages.push(current);

    return { pages: pages };
  }

  // --- Public API -----------------------------------------------------------
  var api = {
    DOOR_W_CM: DOOR_W_CM,
    DOOR_H_CM: DOOR_H_CM,
    A4_W_MM: A4_W_MM,
    A4_H_MM: A4_H_MM,
    PAGE_MARGIN_MM: PAGE_MARGIN_MM,
    PX_PER_CM: PX_PER_CM,
    cmToPreviewPx: cmToPreviewPx,
    previewPxToCm: previewPxToCm,
    clampDecalToDoor: clampDecalToDoor,
    packPrintLayout: packPrintLayout,
    usablePageMm: usablePageMm,
    printSizeMm: printSizeMm,
    clampSizeToPage: clampSizeToPage
  };

  // Browser: attach to the single shared namespace.
  if (typeof window !== 'undefined') {
    window.CDDS = window.CDDS || {};
    window.CDDS.geometry = api;
  }

  // Node unit tests.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
