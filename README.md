# Cruise Door Decal Studio

A single-page, static, client-only design tool for composing a cruise stateroom
door layout and printing a true-to-size, A4-paginated cutout sheet.

You build a composition by dragging and resizing decals from a bundled gallery
of generic, owned SVG decals against a representative door. Everything is
**centimeters as the source of truth**: positions and sizes are stored only in
cm, so the on-screen preview is proportionally accurate and the printed output —
laid out in physical CSS units — is the only thing claimed true-to-size.

## Features

- A mobile-first door canvas with a **light beige wooden** stateroom-door look:
  wood grain, recessed panels and a circular brushed-metal **room number plate**.
- The plate is an **unusable keep-out zone** in the upper middle (like a Disney
  resort room door) — decals are automatically pushed clear of it, and you can
  tap the plate to edit the room number.
- A **decal picker modal** opened from a floating "＋ Decals" button: tap art to
  drop it on the door, add as many as you like, then close to arrange them.
- Bundled decals include original, **non-copyrighted character fan-art**
  (mouse ears, castle, crown, fairy, magic lamp, clownfish, mermaid tail,
  snowflake) alongside celebration glyphs and numerals.
- **Upload your own PNG/JPEG/SVG** images as decals — they are added to the
  gallery, placed on the door, and persisted across reloads.
- Drag, resize and delete decals at a proportionally-accurate scale.
- True-to-size, A4-paginated cutout sheet for printing.
- State persists in `localStorage`, so your composition, room number and uploaded
  decals survive page reloads.
- Ships pre-populated with a sample composition, so the door is showcased
  decorated on first load.

## Running locally

This is a fully static, client-only app — there is no build step and no server
needed. Just open `index.html` in any modern browser:

```sh
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

If your browser restricts `localStorage` or module loading from `file://` URLs,
serve the folder over a tiny local web server instead:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Printing

Use your browser's Print dialog (Cmd/Ctrl+P). Choose A4 paper, set margins to
default/none as prompted by the layout, and disable any "fit to page" / scaling
option so the cutout sheet prints at true size.

## Hosting on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, go to **Settings -> Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select your default branch (e.g. `main`) and the `/ (root)` folder, then
   **Save**.
5. Wait for the deployment to finish; your site will be available at
   `https://<your-username>.github.io/<your-repo>/`.

A `.nojekyll` file is included so GitHub Pages serves all assets verbatim
without running them through Jekyll.

## Project files

| File             | Purpose                                                      |
| ---------------- | ----------------------------------------------------------- |
| `index.html`     | App markup and entry point.                                 |
| `styles.css`     | Layout and styling, including the physical print stylesheet. |
| `geometry.js`    | cm-based geometry: positions, sizes, scale, plate keep-out. |
| `catalog.js`     | Bundled SVG decals (characters/celebration/numbers) + custom-upload registry. |
| `store.js`       | In-memory composition state (decals + room number).        |
| `persistence.js` | `localStorage` load/save of the composition and uploads.   |
| `app.js`         | UI wiring: wooden door, plate, decal modal, upload, print.  |
| `sample-data.js` | The pre-populated sample composition shown on first load.   |
