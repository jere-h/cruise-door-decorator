/*
 * app.js - Wiring + view/render + interaction layer (Cruise Door Decal Studio).
 *
 * One-way data flow: input event -> store mutation -> emit -> render(state).
 * render(state) is the SOLE store subscriber and fully (re)paints the door,
 * the gallery, and the placed decals from the current cm-only state.
 *
 * cm is the single source of truth. The preview is proportional via
 * geometry.PX_PER_CM (NO CSS transform zoom), so pointer px deltas map back to
 * cm with a plain previewPxToCm() and no zoom factor. Only the printed A4 sheet
 * (laid out in physical cm/mm CSS units) is true-to-size.
 *
 * Browser: window.CDDS.initApp(rootDoc), window.CDDS.buildPrintLayout(state),
 *          window.CDDS.exportPrint().
 * Node tests: module.exports = { initApp, buildPrintLayout, exportPrint }.
 */
(function () {
  'use strict';

  var CDDS = (typeof window !== 'undefined')
    ? (window.CDDS = window.CDDS || {})
    : {};

  // --- Sibling lookups (browser global; require() fallback under Node) ------

  function getGeometry() {
    if (CDDS.geometry) return CDDS.geometry;
    if (typeof require !== 'undefined') {
      try { return require('./geometry.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }

  function getCatalogModule() {
    if (CDDS.catalog) return CDDS.catalog;
    if (typeof require !== 'undefined') {
      try { return require('./catalog.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }

  function getCatalogEntry(type) {
    var cat = getCatalogModule();
    return (cat && typeof cat.getCatalogEntry === 'function')
      ? cat.getCatalogEntry(type)
      : undefined;
  }

  function aspectFor(type) {
    var entry = getCatalogEntry(type);
    return (entry && isFinite(entry.aspectRatio) && entry.aspectRatio > 0)
      ? entry.aspectRatio
      : 1;
  }

  // --- DOM helpers ----------------------------------------------------------

  function el(doc, tag, attrs, text) {
    var node = doc.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) node.textContent = String(text);
    return node;
  }

  // Render an inline SVG string into a host element without using innerHTML in
  // a way that could trip up older engines. The catalog SVGs are owned, static,
  // trusted strings, so assigning innerHTML is safe and keeps the markup intact.
  function setSvg(host, svgString) {
    host.innerHTML = svgString || '';
  }

  // --- Render ---------------------------------------------------------------
  // A render context holds the resolved DOM refs and interaction wiring for one
  // initApp() call, so multiple instances (e.g. tests) never collide.

  function createView(rootDoc, store) {
    var geo = getGeometry();
    var doc = rootDoc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return null;

    var galleryEl = doc.getElementById('gallery');
    var canvasEl = doc.getElementById('door-canvas');
    var printRoot = doc.getElementById('print-root');
    var btnPrint = doc.getElementById('btn-print');
    var btnReset = doc.getElementById('btn-reset');

    var PX_PER_CM = geo ? geo.PX_PER_CM : (620 / 190);

    function cmToPx(cm) {
      return geo ? geo.cmToPreviewPx(cm) : cm * PX_PER_CM;
    }
    function pxToCm(px) {
      return geo ? geo.previewPxToCm(px) : px / PX_PER_CM;
    }

    // -- Gallery (built once; static catalog) --------------------------------
    function renderGallery() {
      if (!galleryEl) return;
      var cat = getCatalogModule();
      var entries = (cat && typeof cat.getCatalog === 'function') ? cat.getCatalog() : [];
      galleryEl.innerHTML = '';
      entries.forEach(function (entry) {
        var thumb = el(doc, 'button', {
          'type': 'button',
          'class': 'gallery-thumb',
          'data-type': entry.type,
          'role': 'listitem',
          'aria-label': 'Add ' + entry.label,
          'title': 'Add ' + entry.label + ' (about ' + entry.realWidthCm + ' cm wide)'
        });
        var art = el(doc, 'span', { 'class': 'gallery-thumb-art', 'aria-hidden': 'true' });
        setSvg(art, entry.svg);
        var label = el(doc, 'span', { 'class': 'gallery-thumb-label' }, entry.label);
        thumb.appendChild(art);
        thumb.appendChild(label);
        thumb.addEventListener('click', function () {
          store.addDecal(entry.type);
        });
        galleryEl.appendChild(thumb);
      });
    }

    // -- Door + placed decals (re-rendered on every state change) ------------
    function renderDoor(state) {
      if (!canvasEl) return;
      var door = state.door || { widthCm: 66, heightCm: 190 };

      // Size the door surface to the proportional preview. cm is the source of
      // truth; this is the only place cm becomes px, with no zoom transform.
      canvasEl.style.width = cmToPx(door.widthCm) + 'px';
      canvasEl.style.height = cmToPx(door.heightCm) + 'px';

      canvasEl.innerHTML = '';

      (state.decals || []).forEach(function (decal) {
        var aspect = aspectFor(decal.type);
        var wPx = cmToPx(decal.widthCm);
        var hPx = cmToPx(decal.widthCm * aspect);
        var xPx = cmToPx(decal.xCm);
        var yPx = cmToPx(decal.yCm);

        var node = el(doc, 'div', { 'class': 'placed-decal', 'data-id': decal.id });
        node.style.left = xPx + 'px';
        node.style.top = yPx + 'px';
        node.style.width = wPx + 'px';
        node.style.height = hPx + 'px';

        if (state.selectedId === decal.id) {
          node.className = 'placed-decal is-selected';
        }

        var entry = getCatalogEntry(decal.type);
        var art = el(doc, 'div', { 'class': 'placed-decal-art', 'aria-hidden': 'true' });
        setSvg(art, entry ? entry.svg : '');
        node.appendChild(art);

        // Resize handle only matters when selected, but ship it always so the
        // affordance is discoverable; CSS reveals it on the selected decal.
        var handle = el(doc, 'div', {
          'class': 'resize-handle',
          'role': 'slider',
          'aria-label': 'Resize ' + (entry ? entry.label : 'decal'),
          'title': 'Drag to resize'
        });
        node.appendChild(handle);

        wireDecalPointer(node, handle, decal, door);
        canvasEl.appendChild(node);
      });
    }

    // -- Interaction: pointer drag (move) + handle drag (resize) -------------
    function wireDecalPointer(node, handle, decal, door) {
      // Select on press (pointerdown) so the user gets immediate feedback even
      // before any drag movement.
      node.addEventListener('pointerdown', function (ev) {
        // Ignore clicks that originate on the resize handle here; the handle has
        // its own listener that stops propagation.
        if (ev.target === handle) return;
        ev.preventDefault();
        store.selectDecal(decal.id);
        beginDrag(ev, decal, door);
      });

      handle.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        store.selectDecal(decal.id);
        beginResize(ev, decal, door);
      });
    }

    function beginDrag(startEv, decal, door) {
      var startX = startEv.clientX;
      var startY = startEv.clientY;
      var originX = decal.xCm;
      var originY = decal.yCm;

      function onMove(ev) {
        var dxPx = ev.clientX - startX;
        var dyPx = ev.clientY - startY;
        // No zoom factor: the preview has no CSS transform, so px deltas convert
        // straight to cm. The store clamps to the door bounds.
        store.moveDecal(decal.id, originX + pxToCm(dxPx), originY + pxToCm(dyPx));
      }
      function onUp() {
        doc.removeEventListener('pointermove', onMove, true);
        doc.removeEventListener('pointerup', onUp, true);
        doc.removeEventListener('pointercancel', onUp, true);
      }
      doc.addEventListener('pointermove', onMove, true);
      doc.addEventListener('pointerup', onUp, true);
      doc.addEventListener('pointercancel', onUp, true);
    }

    function beginResize(startEv, decal, door) {
      var startX = startEv.clientX;
      var originWidthCm = decal.widthCm;

      function onMove(ev) {
        var dxPx = ev.clientX - startX;
        // Width tracks horizontal drag in true door-proportion cm; the store
        // preserves aspect (height derived) and clamps to the door.
        var nextWidthCm = originWidthCm + pxToCm(dxPx);
        if (nextWidthCm < 1) nextWidthCm = 1; // keep it grabbable
        store.resizeDecal(decal.id, nextWidthCm);
      }
      function onUp() {
        doc.removeEventListener('pointermove', onMove, true);
        doc.removeEventListener('pointerup', onUp, true);
        doc.removeEventListener('pointercancel', onUp, true);
      }
      doc.addEventListener('pointermove', onMove, true);
      doc.addEventListener('pointerup', onUp, true);
      doc.addEventListener('pointercancel', onUp, true);
    }

    // -- Canvas background click deselects -----------------------------------
    if (canvasEl) {
      canvasEl.addEventListener('pointerdown', function (ev) {
        if (ev.target === canvasEl) {
          store.selectDecal(null);
        }
      });
    }

    // -- Output buttons ------------------------------------------------------
    if (btnPrint) {
      btnPrint.addEventListener('click', function () {
        exportPrint(store, rootDoc);
      });
    }
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        store.reset();
      });
    }

    function render(state) {
      renderDoor(state);
    }

    return {
      renderGallery: renderGallery,
      render: render,
      printRoot: printRoot
    };
  }

  // --- Print layout ---------------------------------------------------------

  /**
   * Build the A4-paginated print DOM for a composition. Each decal is sized in
   * PHYSICAL cm/mm CSS units (never px) and exposes data-print-width-mm /
   * data-print-height-mm = realWidthCm*10 etc. for the deterministic headless
   * acceptance check. Pages are split per the shelf-packing algorithm.
   *
   * @param {object} state Composition
   * @param {Document} [rootDoc]
   * @returns {DocumentFragment}
   */
  function buildPrintLayout(state, rootDoc) {
    var doc = rootDoc || (typeof document !== 'undefined' ? document : null);
    var geo = getGeometry();
    var cat = getCatalogModule();
    var frag = doc.createDocumentFragment();

    var decals = (state && Array.isArray(state.decals)) ? state.decals : [];
    var layout = (geo && typeof geo.packPrintLayout === 'function')
      ? geo.packPrintLayout(decals, cat)
      : { pages: [] };

    var marginMm = geo ? geo.PAGE_MARGIN_MM : 10;

    layout.pages.forEach(function (placements, pageIndex) {
      var page = el(doc, 'section', { 'class': 'print-page' });
      page.setAttribute('data-page', String(pageIndex + 1));

      // Usable-area origin inside the page margins. Sizes are physical mm.
      var area = el(doc, 'div', { 'class': 'print-area' });
      area.style.position = 'absolute';
      area.style.top = marginMm + 'mm';
      area.style.left = marginMm + 'mm';

      placements.forEach(function (placement) {
        var decal = placement.decal;
        var entry = cat && cat.getCatalogEntry ? cat.getCatalogEntry(decal.type) : undefined;

        // Physical mm dimensions: real-world width in cm * 10 -> mm. Height is
        // derived from the catalog aspect ratio so artwork stays true-to-shape.
        var widthMm = isFinite(placement.widthMm)
          ? placement.widthMm
          : decal.widthCm * 10;
        var aspect = (entry && isFinite(entry.aspectRatio) && entry.aspectRatio > 0)
          ? entry.aspectRatio
          : 1;
        var heightMm = isFinite(placement.heightMm)
          ? placement.heightMm
          : widthMm * aspect;

        var item = el(doc, 'div', { 'class': 'print-decal' });
        // Deterministic verifier hooks: the claimed physical size in mm.
        item.setAttribute('data-print-width-mm', String(widthMm));
        item.setAttribute('data-print-height-mm', String(heightMm));
        item.setAttribute('data-type', decal.type);

        // Layout in physical units only - no px anywhere on the print sheet.
        item.style.position = 'absolute';
        item.style.left = placement.xMm + 'mm';
        item.style.top = placement.yMm + 'mm';
        item.style.width = widthMm + 'mm';
        item.style.height = heightMm + 'mm';

        var art = el(doc, 'div', { 'class': 'print-decal-art' });
        setSvg(art, entry ? entry.svg : '');
        item.appendChild(art);

        area.appendChild(item);
      });

      page.appendChild(area);

      // Printed calibration ruler so the user can confirm 100% scale.
      var ruler = el(doc, 'div', { 'class': 'print-ruler', 'aria-hidden': 'true' });
      ruler.setAttribute('data-ruler-cm', '10');
      for (var c = 0; c <= 10; c++) {
        var tick = el(doc, 'span', { 'class': 'print-ruler-tick' });
        tick.style.left = (c * 10) + 'mm';
        if (c % 5 === 0) tick.textContent = String(c);
        ruler.appendChild(tick);
      }
      var rulerNote = el(doc, 'p', { 'class': 'print-ruler-note' },
        'This bar is exactly 10 cm. Print at 100% with Fit to Page turned off, then measure to confirm.');

      page.appendChild(ruler);
      page.appendChild(rulerNote);

      frag.appendChild(page);
    });

    // If there are no decals, still emit one empty page with the ruler so the
    // print sheet is never an empty shell and calibration is always available.
    if (!layout.pages.length) {
      var emptyPage = el(doc, 'section', { 'class': 'print-page', 'data-page': '1' });
      var ruler2 = el(doc, 'div', { 'class': 'print-ruler', 'aria-hidden': 'true' });
      ruler2.setAttribute('data-ruler-cm', '10');
      for (var k = 0; k <= 10; k++) {
        var t2 = el(doc, 'span', { 'class': 'print-ruler-tick' });
        t2.style.left = (k * 10) + 'mm';
        if (k % 5 === 0) t2.textContent = String(k);
        ruler2.appendChild(t2);
      }
      emptyPage.appendChild(ruler2);
      emptyPage.appendChild(el(doc, 'p', { 'class': 'print-ruler-note' },
        'Add decals to the door, then print this true-to-size sheet at 100%.'));
      frag.appendChild(emptyPage);
    }

    return frag;
  }

  /**
   * Mount the print layout into #print-root and trigger the browser print
   * dialog. Guarded so headless (no window.print) stays a clean no-op.
   *
   * @param {object} store the active store (for current state)
   * @param {Document} [rootDoc]
   */
  function exportPrint(store, rootDoc) {
    var doc = rootDoc || (typeof document !== 'undefined' ? document : null);
    if (!doc || !store) return;
    var printRoot = doc.getElementById('print-root');
    if (!printRoot) return;

    var state = store.getState();
    printRoot.innerHTML = '';
    printRoot.appendChild(buildPrintLayout(state, doc));

    // Guard: only call window.print when present and callable, so headless
    // render checks (which mount the layout but have no print) stay clean.
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      try {
        window.print();
      } catch (e) {
        // Swallow: a blocked/headless print must not throw to the console.
      }
    }
  }

  // --- Bootstrap ------------------------------------------------------------

  // The single live app store + its document, captured by initApp so the
  // contract's exportPrint()->void (no args) signature can resolve them.
  var activeStore = null;
  var activeDoc = null;

  /**
   * Bootstrap the app: rehydrate from persistence (falling back to the bundled
   * sample composition so the door is DECORATED on first paint), create the
   * store, wire persistence as a save sink, build the gallery once, subscribe
   * the render, and paint the initial state.
   *
   * @param {Document} [rootDoc]
   */
  function initApp(rootDoc) {
    var doc = rootDoc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    var persistence = CDDS.persistence || null;

    // Rehydrate, else seed from the sample so we never show an empty shell.
    var initial = null;
    if (persistence && typeof persistence.loadComposition === 'function') {
      initial = persistence.loadComposition();
    }
    if (!initial && typeof CDDS.sampleComposition === 'function') {
      initial = CDDS.sampleComposition();
    }

    if (typeof CDDS.createStore !== 'function') return;
    var store = CDDS.createStore(initial || undefined);

    // Capture for the no-arg exportPrint()->void contract entry point.
    activeStore = store;
    activeDoc = doc;

    var view = createView(doc, store);
    if (!view) return;

    view.renderGallery();

    // render(state) is the SOLE subscriber: event -> mutation -> emit -> render.
    store.subscribe(function (state) {
      view.render(state);
    });

    // Persist on every change (the adapter debounces internally).
    if (persistence && typeof persistence.saveComposition === 'function') {
      store.subscribe(function (state) {
        persistence.saveComposition(state);
      });
    }

    // First paint from the (re)hydrated / sample state.
    view.render(store.getState());
  }

  // --- Public API -----------------------------------------------------------

  // Contract entry point: exportPrint()->void with no args. It resolves the
  // live store captured by initApp; if called with an explicit store (internal
  // button handler), that takes precedence.
  function exportPrintPublic(store, rootDoc) {
    var s = store || activeStore;
    var d = rootDoc || activeDoc;
    if (!s || !d) return;
    exportPrint(s, d);
  }

  if (typeof window !== 'undefined') {
    CDDS.initApp = initApp;
    CDDS.buildPrintLayout = function (state, rootDoc) {
      return buildPrintLayout(state, rootDoc || activeDoc);
    };
    CDDS.exportPrint = function () {
      exportPrintPublic();
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      initApp: initApp,
      buildPrintLayout: buildPrintLayout,
      exportPrint: exportPrintPublic
    };
  }
})();
