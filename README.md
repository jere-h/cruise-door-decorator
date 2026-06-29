# Cruise Door Decal Studio

A single-page, static, client-only design tool for composing a cruise stateroom
door layout and printing a true-to-size, A4-paginated cutout sheet.

You build a composition by dragging and resizing decals from a bundled gallery
of generic, owned SVG decals against a representative door. Everything is
**centimeters as the source of truth**: positions and sizes are stored only in
cm, so the on-screen preview is proportionally accurate and the printed output —
laid out in physical CSS units — is the only thing claimed true-to-size.

## Features

- Left tool/gallery rail plus a central door canvas — a restrained, functional
  product UI.
- Drag and resize decals at a proportionally-accurate scale against the door.
- True-to-size, A4-paginated cutout sheet for printing.
- State persists in `localStorage`, so your composition survives page reloads.
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
| `geometry.js`    | cm-based geometry: positions, sizes, and scale conversions. |
| `catalog.js`     | The bundled gallery of generic owned SVG decals.            |
| `store.js`       | In-memory composition state.                                |
| `persistence.js` | `localStorage` load/save of the composition.               |
| `app.js`         | UI wiring: rail, canvas, drag/resize, print.                |
| `sample-data.js` | The pre-populated sample composition shown on first load.   |
