/*
 * app.js - Wiring + view/render + interaction layer (Cruise Door Decal Studio).
 *
 * One-way data flow: input event -> store mutation -> emit -> render(state).
 * render(state) is the SOLE store subscriber and fully (re)paints the door
 * (wooden surface, room number plate and placed decals) from the cm-only state.
 * The decal gallery lives in a modal opened from a floating action button, so
 * the door stays the focus on mobile; PNG uploads register runtime decals.
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

  // Render a decal's artwork into a host element. Bundled glyphs are trusted,
  // static inline SVG strings (assigning innerHTML keeps the markup intact).
  // User uploads are raster decals (kind 'image') rendered as an <img> whose
  // src is a data-URL, so untrusted bytes never reach innerHTML.
  function paintDecalArt(doc, host, entry) {
    host.innerHTML = '';
    if (!entry) return;
    if (entry.kind === 'image' && entry.image) {
      var img = doc.createElement('img');
      img.src = entry.image;
      img.alt = '';
      img.setAttribute('draggable', 'false');
      host.appendChild(img);
    } else if (entry.svg) {
      host.innerHTML = entry.svg;
    }
  }

  // --- Render ---------------------------------------------------------------
  // A render context holds the resolved DOM refs and interaction wiring for one
  // initApp() call, so multiple instances (e.g. tests) never collide.

  function createView(rootDoc, store, persistence) {
    var geo = getGeometry();
    var doc = rootDoc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return null;

    var galleryEl = doc.getElementById('gallery');
    var canvasEl = doc.getElementById('door-canvas');
    var printRoot = doc.getElementById('print-root');
    var btnPrint = doc.getElementById('btn-print');
    var btnReset = doc.getElementById('btn-reset');

    var modalEl = doc.getElementById('decal-modal');
    var fabEl = doc.getElementById('fab-decals');
    var btnUpload = doc.getElementById('btn-upload');
    var fileInput = doc.getElementById('file-upload');
    var toastEl = doc.getElementById('toast');

    var PX_PER_CM = geo ? geo.PX_PER_CM : (620 / 190);

    function cmToPx(cm) {
      return geo ? geo.cmToPreviewPx(cm) : cm * PX_PER_CM;
    }
    function pxToCm(px) {
      return geo ? geo.previewPxToCm(px) : px / PX_PER_CM;
    }

    // -- Toast ---------------------------------------------------------------
    var toastTimer = null;
    function showToast(message) {
      if (!toastEl) return;
      toastEl.textContent = message;
      toastEl.hidden = false;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toastEl.hidden = true;
        toastTimer = null;
      }, 1600);
    }

    // -- Gallery (rebuilt when the catalog changes, e.g. after an upload) -----
    var CATEGORY_TITLES = [
      { key: 'character', title: 'Characters' },
      { key: 'celebration', title: 'Celebration' },
      { key: 'number', title: 'Numbers' },
      { key: 'custom', title: 'Your uploads' }
    ];

    function makeThumb(entry) {
      var thumb = el(doc, 'button', {
        'type': 'button',
        'class': 'gallery-thumb',
        'data-type': entry.type,
        'aria-label': 'Add ' + entry.label,
        'title': 'Add ' + entry.label + ' (about ' + entry.realWidthCm + ' cm wide)'
      });
      var art = el(doc, 'span', { 'class': 'gallery-thumb-art', 'aria-hidden': 'true' });
      paintDecalArt(doc, art, entry);
      var label = el(doc, 'span', { 'class': 'gallery-thumb-label' }, entry.label);
      thumb.appendChild(art);
      thumb.appendChild(label);
      thumb.addEventListener('click', function () {
        store.addDecal(entry.type);
        showToast('Added ' + entry.label);
        thumb.classList.add('just-added');
        setTimeout(function () { thumb.classList.remove('just-added'); }, 600);
      });
      return thumb;
    }

    function renderGallery() {
      if (!galleryEl) return;
      var cat = getCatalogModule();
      var entries = (cat && typeof cat.getCatalog === 'function') ? cat.getCatalog() : [];
      var byCategory = {};
      entries.forEach(function (entry) {
        var c = entry.category || 'celebration';
        (byCategory[c] = byCategory[c] || []).push(entry);
      });

      galleryEl.innerHTML = '';
      CATEGORY_TITLES.forEach(function (group) {
        var items = byCategory[group.key] || [];
        // Always show the uploads group (with a hint when empty) so the feature
        // is discoverable; skip other groups only if somehow empty.
        if (!items.length && group.key !== 'custom') return;

        var section = el(doc, 'div', { 'class': 'gallery-group' });
        section.appendChild(el(doc, 'h3', { 'class': 'gallery-group-title' }, group.title));

        if (!items.length) {
          section.appendChild(el(doc, 'p', { 'class': 'gallery-empty' },
            'No uploads yet - tap "Upload PNG" to add your own art.'));
        } else {
          var grid = el(doc, 'div', { 'class': 'gallery-grid' });
          items.forEach(function (entry) { grid.appendChild(makeThumb(entry)); });
          section.appendChild(grid);
        }
        galleryEl.appendChild(section);
      });
    }

    // -- Door surface, room number plate + placed decals ---------------------
    function renderDoor(state) {
      if (!canvasEl) return;
      var door = state.door || { widthCm: 66, heightCm: 190, roomNumber: '' };

      // Size the door surface to the proportional preview. cm is the source of
      // truth; this is the only place cm becomes px, with no zoom transform.
      canvasEl.style.width = cmToPx(door.widthCm) + 'px';
      canvasEl.style.height = cmToPx(door.heightCm) + 'px';

      canvasEl.innerHTML = '';

      // Decorative wooden layers (behind everything, never intercept pointers).
      canvasEl.appendChild(el(doc, 'div', { 'class': 'door-grain', 'aria-hidden': 'true' }));
      canvasEl.appendChild(el(doc, 'div', { 'class': 'door-panel door-panel-top', 'aria-hidden': 'true' }));
      canvasEl.appendChild(el(doc, 'div', { 'class': 'door-panel door-panel-bottom', 'aria-hidden': 'true' }));

      // Room number plate (the unusable keep-out zone made visible).
      canvasEl.appendChild(buildPlate(door));

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
        paintDecalArt(doc, art, entry);
        node.appendChild(art);

        // Delete (top-left) and resize (bottom-right) handles. CSS reveals them
        // only on the selected decal.
        var del = el(doc, 'div', {
          'class': 'delete-handle',
          'role': 'button',
          'aria-label': 'Remove ' + (entry ? entry.label : 'decal'),
          'title': 'Remove'
        }, '×');
        var handle = el(doc, 'div', {
          'class': 'resize-handle',
          'role': 'slider',
          'aria-label': 'Resize ' + (entry ? entry.label : 'decal'),
          'title': 'Drag to resize'
        });
        node.appendChild(del);
        node.appendChild(handle);

        wireDecalPointer(node, handle, del, decal, door);
        canvasEl.appendChild(node);
      });
    }

    // Build the circular room number plate, sized + positioned in cm. The number
    // is editable inline and committed to the store on blur (a single emit), so
    // typing never triggers a re-render that would steal focus.
    function buildPlate(door) {
      var rect = (geo && typeof geo.getPlateRect === 'function')
        ? geo.getPlateRect(door)
        : { xCm: door.widthCm / 2 - 9, yCm: 21, diameterCm: 18 };
      var sizePx = cmToPx(rect.diameterCm);

      var plate = el(doc, 'div', { 'class': 'door-plate', 'title': 'Room number - tap to edit' });
      plate.style.left = cmToPx(rect.xCm) + 'px';
      plate.style.top = cmToPx(rect.yCm) + 'px';
      plate.style.width = sizePx + 'px';
      plate.style.height = sizePx + 'px';

      var label = el(doc, 'span', { 'class': 'plate-label', 'aria-hidden': 'true' }, 'Stateroom');
      label.style.fontSize = Math.max(5, sizePx * 0.11) + 'px';

      var number = el(doc, 'span', {
        'class': 'plate-number',
        'contenteditable': 'true',
        'role': 'textbox',
        'aria-label': 'Room number',
        'spellcheck': 'false',
        'inputmode': 'numeric'
      }, door.roomNumber || '');
      number.style.fontSize = Math.max(9, sizePx * 0.3) + 'px';

      // Keep edits short and free of newlines while typing.
      number.addEventListener('input', function () {
        var t = number.textContent.replace(/\s+/g, ' ');
        if (t.length > 12) {
          number.textContent = t.slice(0, 12);
          placeCaretAtEnd(number);
        }
      });
      number.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); number.blur(); }
      });
      number.addEventListener('blur', function () {
        store.setRoomNumber(number.textContent.trim());
      });

      plate.appendChild(label);
      plate.appendChild(number);
      return plate;
    }

    function placeCaretAtEnd(node) {
      if (typeof doc.createRange !== 'function' || !rootWin || !rootWin.getSelection) return;
      var range = doc.createRange();
      range.selectNodeContents(node);
      range.collapse(false);
      var sel = rootWin.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    var rootWin = (typeof window !== 'undefined') ? window : null;

    // -- Interaction: pointer drag (move) + handle drag (resize) + delete ----
    function wireDecalPointer(node, handle, del, decal, door) {
      node.addEventListener('pointerdown', function (ev) {
        // The handles have their own listeners; ignore presses that start there.
        if (ev.target === handle || ev.target === del) return;
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

      del.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        store.removeDecal(decal.id);
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

    // -- Canvas background press deselects (ignore decorative children) -------
    if (canvasEl) {
      canvasEl.addEventListener('pointerdown', function (ev) {
        var t = ev.target;
        if (t === canvasEl ||
            (t.classList && (t.classList.contains('door-grain') || t.classList.contains('door-panel')))) {
          store.selectDecal(null);
        }
      });
    }

    // -- Modal (decal picker) ------------------------------------------------
    function openModal() {
      if (!modalEl) return;
      modalEl.hidden = false;
      if (rootWin && doc.body) doc.body.style.overflow = 'hidden';
      var closeBtn = doc.getElementById('modal-close');
      if (closeBtn) closeBtn.focus();
    }
    function closeModal() {
      if (!modalEl) return;
      modalEl.hidden = true;
      if (doc.body) doc.body.style.overflow = '';
      if (fabEl) fabEl.focus();
    }

    if (fabEl) fabEl.addEventListener('click', openModal);
    if (modalEl) {
      modalEl.addEventListener('click', function (ev) {
        if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-close') === 'true') {
          closeModal();
        }
      });
    }
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && modalEl && !modalEl.hidden) closeModal();
    });

    // -- Upload PNG / image as a custom decal --------------------------------
    var uploadSeq = 0;
    function handleFiles(fileList) {
      var cat = getCatalogModule();
      if (!cat || typeof cat.registerCustomDecal !== 'function') return;
      var files = Array.prototype.slice.call(fileList || []);
      files.forEach(function (file) {
        if (!file || !file.type || file.type.indexOf('image/') !== 0) {
          showToast('Skipped a non-image file');
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          var dataUrl = reader.result;
          if (typeof dataUrl !== 'string') return;
          var probe = new Image();
          probe.onload = function () {
            var w = probe.naturalWidth || probe.width || 1;
            var h = probe.naturalHeight || probe.height || 1;
            var aspect = (w > 0) ? (h / w) : 1;
            uploadSeq += 1;
            var type = 'custom-' + Date.now().toString(36) + '-' + uploadSeq;
            var label = (file.name || 'Upload').replace(/\.[^.]+$/, '').slice(0, 18) || 'Upload';
            cat.registerCustomDecal({
              type: type,
              label: label,
              image: dataUrl,
              aspectRatio: aspect,
              realWidthCm: 15
            });
            if (persistence && typeof persistence.saveCustomDecals === 'function') {
              persistence.saveCustomDecals(cat.getCustomDecals());
            }
            renderGallery();
            store.addDecal(type);
            showToast('Uploaded ' + label);
          };
          probe.onerror = function () { showToast('Could not read that image'); };
          probe.src = dataUrl;
        };
        reader.onerror = function () { showToast('Could not read that file'); };
        reader.readAsDataURL(file);
      });
    }

    if (btnUpload && fileInput) {
      btnUpload.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        handleFiles(fileInput.files);
        fileInput.value = ''; // allow re-picking the same file
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
        item.setAttribute('data-print-width-mm', String(widthMm));
        item.setAttribute('data-print-height-mm', String(heightMm));
        item.setAttribute('data-type', decal.type);

        item.style.position = 'absolute';
        item.style.left = placement.xMm + 'mm';
        item.style.top = placement.yMm + 'mm';
        item.style.width = widthMm + 'mm';
        item.style.height = heightMm + 'mm';

        var art = el(doc, 'div', { 'class': 'print-decal-art' });
        paintDecalArt(doc, art, entry);
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
   */
  function exportPrint(store, rootDoc) {
    var doc = rootDoc || (typeof document !== 'undefined' ? document : null);
    if (!doc || !store) return;
    var printRoot = doc.getElementById('print-root');
    if (!printRoot) return;

    var state = store.getState();
    printRoot.innerHTML = '';
    printRoot.appendChild(buildPrintLayout(state, doc));

    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      try {
        window.print();
      } catch (e) {
        // Swallow: a blocked/headless print must not throw to the console.
      }
    }
  }

  // --- Bootstrap ------------------------------------------------------------

  var activeStore = null;
  var activeDoc = null;

  /**
   * Bootstrap the app: re-register any uploaded custom decals, rehydrate from
   * persistence (falling back to the bundled sample composition so the door is
   * DECORATED on first paint), create the store, wire persistence, build the
   * gallery, subscribe the render, and paint the initial state.
   *
   * @param {Document} [rootDoc]
   */
  function initApp(rootDoc) {
    var doc = rootDoc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    var persistence = CDDS.persistence || null;
    var catalog = getCatalogModule();

    // Re-register uploaded decals BEFORE loading the composition so placements
    // referencing a custom type survive persistence's dangling-type guard.
    if (persistence && typeof persistence.loadCustomDecals === 'function' &&
        catalog && typeof catalog.registerCustomDecal === 'function') {
      var customs = persistence.loadCustomDecals();
      customs.forEach(function (entry) { catalog.registerCustomDecal(entry); });
    }

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

    activeStore = store;
    activeDoc = doc;

    var view = createView(doc, store, persistence);
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
