/*
 * store.js — Composition state model + mutation store (pure, testable).
 *
 * Holds the single Composition object and is the ONLY place state mutates.
 * All sizes/positions are stored ONLY in cm so they are render-scale-independent
 * (the on-screen preview is proportional via geometry.PX_PER_CM; only the printed
 * A4 sheet, laid out in physical cm/mm, is true-to-size).
 *
 * One-way data flow: input event -> store mutation -> emit -> render.
 * subscribe(fn) registers a listener; every mutator applies its change then
 * notifies all listeners with the new state.
 *
 * Browser: window.CDDS.createStore(initial)
 * Node tests: module.exports = { createStore }
 */
(function () {
  'use strict';

  // Reach siblings through the shared global namespace in the browser, and
  // through require() under Node tests. No runtime require in the browser.
  var CDDS = (typeof window !== 'undefined')
    ? (window.CDDS = window.CDDS || {})
    : {};

  function getGeometry() {
    if (CDDS.geometry) return CDDS.geometry;
    if (typeof require !== 'undefined') {
      try { return require('./geometry.js'); } catch (e) { /* fall through */ }
    }
    return null;
  }

  function getCatalog() {
    if (CDDS.catalog) return CDDS.catalog;
    if (typeof require !== 'undefined') {
      try { return require('./catalog.js'); } catch (e) { /* fall through */ }
    }
    return null;
  }

  // Monotonic-ish id generator scoped per store instance, kept short and stable.
  function makeIdFactory() {
    var seq = 0;
    return function nextId(type) {
      seq += 1;
      var stamp = Date.now().toString(36);
      return 'd-' + (type || 'decal') + '-' + stamp + '-' + seq;
    };
  }

  function defaultDoor() {
    var geo = getGeometry();
    return {
      widthCm: geo ? geo.DOOR_W_CM : 66,
      heightCm: geo ? geo.DOOR_H_CM : 190,
      roomNumber: ''
    };
  }

  // Produce a clean, owned Composition from arbitrary input. Never mutates input.
  function normalize(initial) {
    var src = (initial && typeof initial === 'object') ? initial : {};
    var door = (src.door && typeof src.door === 'object') ? src.door : {};
    var fallback = defaultDoor();
    var decals = Array.isArray(src.decals) ? src.decals : [];

    var normalizedDecals = decals
      .filter(function (d) { return d && typeof d === 'object' && typeof d.type === 'string'; })
      .map(function (d) {
        return {
          id: typeof d.id === 'string' && d.id ? d.id : null, // backfilled below
          type: d.type,
          xCm: Number.isFinite(d.xCm) ? d.xCm : 0,
          yCm: Number.isFinite(d.yCm) ? d.yCm : 0,
          widthCm: Number.isFinite(d.widthCm) && d.widthCm > 0 ? d.widthCm : 10
        };
      });

    return {
      schemaVersion: 1,
      door: {
        widthCm: Number.isFinite(door.widthCm) && door.widthCm > 0 ? door.widthCm : fallback.widthCm,
        heightCm: Number.isFinite(door.heightCm) && door.heightCm > 0 ? door.heightCm : fallback.heightCm,
        roomNumber: typeof door.roomNumber === 'string' ? door.roomNumber : ''
      },
      decals: normalizedDecals,
      selectedId: typeof src.selectedId === 'string' ? src.selectedId : null
    };
  }

  // Default real-world print width (cm) for a freshly added decal, from catalog.
  function defaultWidthFor(type) {
    var cat = getCatalog();
    var entry = cat && cat.getCatalogEntry ? cat.getCatalogEntry(type) : null;
    if (entry && Number.isFinite(entry.realWidthCm) && entry.realWidthCm > 0) {
      return entry.realWidthCm;
    }
    return 10;
  }

  function aspectFor(type) {
    var cat = getCatalog();
    var entry = cat && cat.getCatalogEntry ? cat.getCatalogEntry(type) : null;
    if (entry && Number.isFinite(entry.aspectRatio) && entry.aspectRatio > 0) {
      return entry.aspectRatio;
    }
    return 1;
  }

  // Keep a decal inside the door bounds using geometry's clamp when available.
  function clampWithin(decal, door) {
    var geo = getGeometry();
    if (geo && typeof geo.clampDecalToDoor === 'function') {
      var aspect = aspectFor(decal.type);
      // clampDecalToDoor needs height to keep the decal fully inside.
      var withAspect = {
        id: decal.id,
        type: decal.type,
        xCm: decal.xCm,
        yCm: decal.yCm,
        widthCm: decal.widthCm,
        aspectRatio: aspect
      };
      var clamped = geo.clampDecalToDoor(withAspect, door);
      return {
        id: decal.id,
        type: decal.type,
        xCm: Number.isFinite(clamped.xCm) ? clamped.xCm : decal.xCm,
        yCm: Number.isFinite(clamped.yCm) ? clamped.yCm : decal.yCm,
        widthCm: Number.isFinite(clamped.widthCm) ? clamped.widthCm : decal.widthCm
      };
    }
    // Fallback clamp (no geometry available, e.g. isolated unit test): keep the
    // top-left corner on the door and the width no wider than the door.
    var w = Math.min(decal.widthCm, door.widthCm);
    var h = w * aspectFor(decal.type);
    var maxX = Math.max(0, door.widthCm - w);
    var maxY = Math.max(0, door.heightCm - h);
    return {
      id: decal.id,
      type: decal.type,
      xCm: Math.min(Math.max(0, decal.xCm), maxX),
      yCm: Math.min(Math.max(0, decal.yCm), maxY),
      widthCm: w
    };
  }

  function createStore(initial) {
    var state = normalize(initial);
    var nextId = makeIdFactory();

    // Backfill ids for any seeded decals that arrived without one.
    state.decals = state.decals.map(function (d) {
      return d.id ? d : Object.assign({}, d, { id: nextId(d.type) });
    });

    var listeners = [];

    function emit() {
      // Pass the live state object; listeners must treat it as read-only.
      for (var i = 0; i < listeners.length; i++) {
        try {
          listeners[i](state);
        } catch (err) {
          // A faulty subscriber must not break the data flow for the others.
          if (typeof console !== 'undefined' && console.error) {
            console.error('CDDS store subscriber error:', err);
          }
        }
      }
    }

    function getState() {
      return state;
    }

    function subscribe(fn) {
      if (typeof fn !== 'function') {
        return function () {};
      }
      listeners.push(fn);
      return function unsubscribe() {
        var idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    }

    function findDecal(id) {
      for (var i = 0; i < state.decals.length; i++) {
        if (state.decals[i].id === id) return state.decals[i];
      }
      return null;
    }

    function addDecal(type) {
      if (typeof type !== 'string' || !type) return;
      var widthCm = defaultWidthFor(type);
      // Center horizontally, place toward the upper third of the door by default.
      var aspect = aspectFor(type);
      var heightCm = widthCm * aspect;
      var raw = {
        id: nextId(type),
        type: type,
        xCm: Math.max(0, (state.door.widthCm - widthCm) / 2),
        yCm: Math.max(0, (state.door.heightCm / 3) - (heightCm / 2)),
        widthCm: widthCm
      };
      var decal = clampWithin(raw, state.door);
      state.decals = state.decals.concat([decal]);
      state.selectedId = decal.id;
      emit();
    }

    function moveDecal(id, xCm, yCm) {
      var decal = findDecal(id);
      if (!decal) return;
      if (!Number.isFinite(xCm) || !Number.isFinite(yCm)) return;
      var moved = clampWithin(
        { id: decal.id, type: decal.type, xCm: xCm, yCm: yCm, widthCm: decal.widthCm },
        state.door
      );
      state.decals = state.decals.map(function (d) {
        return d.id === id ? moved : d;
      });
      emit();
    }

    function resizeDecal(id, widthCm) {
      var decal = findDecal(id);
      if (!decal) return;
      if (!Number.isFinite(widthCm) || widthCm <= 0) return;
      // Aspect is preserved implicitly: height is always derived as
      // widthCm * aspectRatio at render/print time, so we only store widthCm.
      var resized = clampWithin(
        { id: decal.id, type: decal.type, xCm: decal.xCm, yCm: decal.yCm, widthCm: widthCm },
        state.door
      );
      state.decals = state.decals.map(function (d) {
        return d.id === id ? resized : d;
      });
      emit();
    }

    function selectDecal(id) {
      // id may be null to deselect. Only select ids that exist.
      if (id === null || id === undefined) {
        if (state.selectedId !== null) {
          state.selectedId = null;
          emit();
        }
        return;
      }
      if (findDecal(id)) {
        if (state.selectedId !== id) {
          state.selectedId = id;
          emit();
        }
      }
    }

    function setRoomNumber(value) {
      var next = (value === null || value === undefined) ? '' : String(value);
      if (state.door.roomNumber === next) return;
      state.door = {
        widthCm: state.door.widthCm,
        heightCm: state.door.heightCm,
        roomNumber: next
      };
      emit();
    }

    function removeDecal(id) {
      var before = state.decals.length;
      state.decals = state.decals.filter(function (d) { return d.id !== id; });
      if (state.decals.length !== before) {
        if (state.selectedId === id) state.selectedId = null;
        emit();
      }
    }

    function reset() {
      var seed = (CDDS.sampleComposition && typeof CDDS.sampleComposition === 'function')
        ? CDDS.sampleComposition()
        : { schemaVersion: 1, door: defaultDoor(), decals: [], selectedId: null };
      state = normalize(seed);
      state.decals = state.decals.map(function (d) {
        return d.id ? d : Object.assign({}, d, { id: nextId(d.type) });
      });
      state.selectedId = null;
      emit();
    }

    return {
      getState: getState,
      subscribe: subscribe,
      addDecal: addDecal,
      moveDecal: moveDecal,
      resizeDecal: resizeDecal,
      selectDecal: selectDecal,
      removeDecal: removeDecal,
      setRoomNumber: setRoomNumber,
      reset: reset
    };
  }

  // Browser global
  if (typeof window !== 'undefined') {
    CDDS.createStore = createStore;
  }

  // Node tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createStore: createStore };
  }
})();
