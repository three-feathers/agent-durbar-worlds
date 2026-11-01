# worlds/

One folder per world: `worlds/<id>/` (lowercase letters, digits, `-` and `_`; the id is also `world.json`'s `id`). There is no real art here yet.

| File | In the pack | What |
|---|---|---|
| `world.json` | yes | The manifest (spec 102 FR-040): `formatVersion`, `id`, `name`, `version`, `defaultSet`, `tokens`, `lights`, `rideStyle`, `parts`, optional `description` and `licence`. Data only. |
| `*.webp` | yes | Pictures from the closed list of part names (spec 102 FR-041, `src/shared/worldpack.ts` in the app repository). WebP with alpha, no metadata, no animation. |
| `ASSETS.md` | no | One row per picture: tool, date, maker, prompt, processing, licence, approval state. [`_template/ASSETS.md`](_template/ASSETS.md) |
| `card.json` | no | The seven items that make a world look different from every other (spec 102 FR-014). [`_template/card.json`](_template/card.json) |

Nothing else is allowed in a world folder: no script, HTML, CSS, SVG, font or link, and no sub-folder. Sizes: a pack at most 4 MB here (the app's hard cap is 10 MB), 40 pack files.

Check your folder before opening a pull request, with a built checkout of the app repository (see the README):
`node tools/validate.js --app <app checkout> worlds/<id>`.
