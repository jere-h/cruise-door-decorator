/* sample-data.js
 * Bundled pre-populated sample composition for Cruise Door Decal Studio.
 *
 * Used by app.js ONLY when persistence.loadComposition() returns null, so the
 * door is showcased fully decorated on first load (the ship-it-pre-populated
 * rule). The user can clear/reset and build their own composition, which then
 * persists to localStorage and overrides this sample on subsequent loads.
 *
 * Everything here is stored in cm only (render-scale-independent). Positions
 * are left/top from the door's top-left corner; widthCm is the real-world
 * print width and height is derived from each catalog entry's aspectRatio.
 *
 * Plain (non-module) script: attaches to window.CDDS and also exports for Node.
 */
(function () {
  'use strict';

  var CDDS = (typeof window !== 'undefined')
    ? (window.CDDS = window.CDDS || {})
    : {};

  // The default door, per the contract data shape (Composition.door).
  var DOOR_W_CM = 66;
  var DOOR_H_CM = 190;

  /**
   * sampleComposition() -> Composition
   *
   * A small, tasteful decorated layout on the default 66x190cm door:
   *   - a banner ribbon greeting near the top,
   *   - a heart centerpiece in the upper-middle,
   *   - the numerals "5" "0" spelling a 50th-anniversary milestone below it.
   *
   * Returns a fresh object every call so callers can mutate it freely without
   * aliasing the sample. selectedId starts null (no sticky selection).
   *
   * Types reference catalog entries by their stable keys: 'banner', 'heart',
   * and 'numeral-5' / 'numeral-0'. If a sibling catalog uses different numeral
   * keys, persistence's dangling-type guard simply drops the unknown decals and
   * the rest of the sample still renders, so the door is never an empty shell.
   */
  function sampleComposition() {
    return {
      schemaVersion: 1,
      door: { widthCm: DOOR_W_CM, heightCm: DOOR_H_CM, roomNumber: '8024' },
      decals: [
        // Character fan-art flanking the room number plate up top.
        {
          id: 'sample-mouse',
          type: 'mouse',
          xCm: 5,
          yCm: 5,
          widthCm: 16
        },
        {
          id: 'sample-star',
          type: 'star',
          xCm: 47,
          yCm: 6,
          widthCm: 14
        },
        // Banner ribbon greeting just below the plate.
        {
          id: 'sample-banner',
          type: 'banner',
          xCm: 8,
          yCm: 46,
          widthCm: 50
        },
        // Heart centerpiece, horizontally centered (door 66cm, heart 22cm -> left 22).
        {
          id: 'sample-heart',
          type: 'heart',
          xCm: 22,
          yCm: 74,
          widthCm: 22
        },
        // Milestone numerals "50", side by side and centered below the heart.
        {
          id: 'sample-numeral-5',
          type: 'num-5',
          xCm: 21,
          yCm: 106,
          widthCm: 12
        },
        {
          id: 'sample-numeral-0',
          type: 'num-0',
          xCm: 34,
          yCm: 106,
          widthCm: 12
        },
        // A little castle anchoring the lower third of the door.
        {
          id: 'sample-castle',
          type: 'castle',
          xCm: 20,
          yCm: 150,
          widthCm: 26
        }
      ],
      selectedId: null
    };
  }

  CDDS.sampleComposition = sampleComposition;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sampleComposition: sampleComposition };
  }
})();
