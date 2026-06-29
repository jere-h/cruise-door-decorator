/*
 * persistence.js — localStorage adapter for Cruise Door Decal Studio.
 *
 * Pure-ish and testable: the only side effects are reads/writes to a storage
 * backend (window.localStorage in the browser, or none under Node tests). All
 * sizes/positions in the persisted Composition are stored ONLY in cm, so they
 * are render-scale-independent.
 *
 * Public API (attached to window.CDDS.persistence):
 *   STORAGE_KEY           — 'cdds.composition.v1'
 *   loadComposition()     — rehydrate + HARDEN; returns Composition | null
 *   saveComposition(state)— debounced serialize to STORAGE_KEY
 *
 * Hardening on load:
 *   - corrupt / missing JSON              -> null (caller falls back to sample)
 *   - schemaVersion mismatch / missing    -> null (stale store discarded)
 *   - unknown / stale top-level fields     -> tolerated (ignored, not fatal)
 *   - PlacedDecals with a type not in the catalog -> DROPPED (dangling-FK guard)
 *   - selectedId                          -> reset to null (no sticky selection)
 */
(function (root) {
  'use strict';

  var CDDS = root.CDDS = root.CDDS || {};

  var STORAGE_KEY = 'cdds.composition.v1';
  var SCHEMA_VERSION = 1;
  var SAVE_DEBOUNCE_MS = 250;

  // Default door, used to backfill a missing/partial door block. The store and
  // geometry treat 66cm x 190cm as the canonical door.
  var DEFAULT_DOOR_W_CM = 66;
  var DEFAULT_DOOR_H_CM = 190;

  // --- storage backend ------------------------------------------------------
  // Resolved lazily and defensively: localStorage can throw (private mode,
  // disabled storage) and is simply absent under Node, so every access is
  // wrapped. We never let a storage failure crash the app.
  function getStorage() {
    try {
      var ls = root.localStorage;
      if (!ls) return null;
      return ls;
    } catch (e) {
      return null;
    }
  }

  // --- helpers --------------------------------------------------------------
  function isFiniteNumber(n) {
    return typeof n === 'number' && isFinite(n);
  }

  function getCatalogTypes() {
    var types = {};
    try {
      var catalog = CDDS.catalog;
      if (catalog && typeof catalog.getCatalog === 'function') {
        var entries = catalog.getCatalog();
        if (entries && entries.length) {
          for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if (entry && typeof entry.type === 'string') {
              types[entry.type] = true;
            }
          }
        }
      }
    } catch (e) {
      // If the catalog can't be read for any reason, return an empty set; the
      // dangling-FK guard then drops every decal (safer than keeping unknowns).
    }
    return types;
  }

  // Coerce one raw decal into a clean PlacedDecal, or return null if it is not
  // usable (missing id/type, non-numeric coords, or a dangling type).
  function sanitizeDecal(raw, validTypes) {
    if (!raw || typeof raw !== 'object') return null;
    if (typeof raw.id !== 'string' || raw.id === '') return null;
    if (typeof raw.type !== 'string' || raw.type === '') return null;
    // Dangling-FK guard: drop decals whose type is not in the live catalog.
    if (!validTypes[raw.type]) return null;
    if (!isFiniteNumber(raw.xCm)) return null;
    if (!isFiniteNumber(raw.yCm)) return null;
    if (!isFiniteNumber(raw.widthCm) || raw.widthCm <= 0) return null;
    // Keep ONLY the known cm-based fields; unknown/stale per-decal fields are
    // tolerated by being dropped here.
    return {
      id: raw.id,
      type: raw.type,
      xCm: raw.xCm,
      yCm: raw.yCm,
      widthCm: raw.widthCm
    };
  }

  function sanitizeDoor(raw) {
    var widthCm = (raw && isFiniteNumber(raw.widthCm) && raw.widthCm > 0)
      ? raw.widthCm : DEFAULT_DOOR_W_CM;
    var heightCm = (raw && isFiniteNumber(raw.heightCm) && raw.heightCm > 0)
      ? raw.heightCm : DEFAULT_DOOR_H_CM;
    return { widthCm: widthCm, heightCm: heightCm };
  }

  /**
   * loadComposition() -> Composition | null
   * Reads the persisted JSON, parses it defensively, and HARDENS it into a
   * clean Composition. Returns null on anything the caller should treat as
   * "no usable saved state" (corrupt JSON, wrong/missing schema, empty store),
   * so app.js falls back to the bundled sample composition.
   */
  function loadComposition() {
    var storage = getStorage();
    if (!storage) return null;

    var raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
    if (raw === null || raw === undefined || raw === '') return null;

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // Corrupt / non-JSON payload -> null (caller falls back to sample).
      return null;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    // schemaVersion gate: a missing or non-matching version means the stored
    // shape predates this build and is not safe to rehydrate.
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return null;
    }

    var validTypes = getCatalogTypes();

    var rawDecals = Array.isArray(parsed.decals) ? parsed.decals : [];
    var decals = [];
    for (var i = 0; i < rawDecals.length; i++) {
      var clean = sanitizeDecal(rawDecals[i], validTypes);
      if (clean) decals.push(clean);
    }

    // Unknown/stale top-level fields on `parsed` are simply not copied across
    // here, so they are tolerated without corrupting the rehydrated shape.
    return {
      schemaVersion: SCHEMA_VERSION,
      door: sanitizeDoor(parsed.door),
      decals: decals,
      // No sticky selection: selectedId always resets to null on load.
      selectedId: null
    };
  }

  // --- save (debounced) -----------------------------------------------------
  var saveTimer = null;
  var pendingState = null;

  function serializeForStorage(state) {
    // Persist a normalized, cm-only Composition. We re-derive the shape rather
    // than JSON.stringify(state) directly so transient/unknown fields the store
    // may carry never leak into storage.
    var door = sanitizeDoor(state && state.door);
    var rawDecals = (state && Array.isArray(state.decals)) ? state.decals : [];
    var decals = [];
    for (var i = 0; i < rawDecals.length; i++) {
      var d = rawDecals[i];
      if (!d || typeof d !== 'object') continue;
      decals.push({
        id: d.id,
        type: d.type,
        xCm: d.xCm,
        yCm: d.yCm,
        widthCm: d.widthCm
      });
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      door: door,
      decals: decals,
      // selectedId is a view concern, not persisted state; always store null.
      selectedId: null
    };
  }

  function flushSave() {
    saveTimer = null;
    if (pendingState === null) return;
    var state = pendingState;
    pendingState = null;

    var storage = getStorage();
    if (!storage) return;

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(serializeForStorage(state)));
    } catch (e) {
      // Quota / disabled storage: silently give up. Persistence is best-effort;
      // the in-memory store remains the source of truth for this session.
    }
  }

  /**
   * saveComposition(state) -> void
   * Debounced persistence sink wired to the store's subscribe(). Rapid bursts
   * of mutations (e.g. a drag) collapse into a single write.
   */
  function saveComposition(state) {
    pendingState = state;

    if (saveTimer !== null) return;

    var hasTimers = typeof root.setTimeout === 'function';
    if (!hasTimers) {
      // No timer environment (some Node test contexts): write through directly.
      flushSave();
      return;
    }

    saveTimer = root.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  }

  CDDS.persistence = {
    STORAGE_KEY: STORAGE_KEY,
    loadComposition: loadComposition,
    saveComposition: saveComposition
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      STORAGE_KEY: STORAGE_KEY,
      loadComposition: loadComposition,
      saveComposition: saveComposition
    };
  }
})(typeof window !== 'undefined' ? window : this);
