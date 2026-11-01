# Agent Durbar worlds

World packs that [Agent Durbar](https://github.com/three-feathers/agent-durbar) can download on demand. A pack holds art and data only, never code.

The rules, the pack format and the review process live in the app's repository: its `AGENTS.md`, spec 102 (`specs/102-worlds-on-demand/`) and `docs/world-design.md`. Worlds that ship inside the app (Flat, Photo office, Cave, Loft, Retro game) stay in that repository. **Nothing is published here yet, and no real art is committed yet.**

## What a pack is

A world is the look of the office: wall, floor, desk, fixtures, light and a few extra pictures, as a folder `worlds/<id>/` of:

- `world.json`, a small manifest (name, version, colour tokens, light shapes, anchor points of each picture). Data only.
- WebP pictures, from a fixed list of part names. The layout, the words, the lights, the screens and the motion are the app's, never a pack's.
- `ASSETS.md` and `card.json`, which are for reviewers and are not part of the downloaded pack. [Template](worlds/_template/ASSETS.md).

Packs are built into a zip and published as assets of a `worlds-<date>` release of this repository (never marked as the latest release, so the app's own update pages are not affected). The app lists the packs it knows from a catalogue that it carries with its hashes: **no hash, no load**, and anything that is not an image or a JSON pack of the expected size is rejected on download. Installing is always the person's own choice, after a notice that it connects to the internet.

## Propose a world

1. Open an issue with the *Propose a world* form (no pictures there). A maintainer answers before anyone draws.
2. Make the pictures. Every world differs from every other in wall, floor, desk, fixture style, light temperature, plants and one signature motif (card). Read the app's `docs/world-design.md` first.
3. Open a pull request on a branch `NNN-slug` with `worlds/<id>/`, an `ASSETS.md` row for every picture, and the link to the matching pull request in the app repository (it holds the pack's hash; a new world needs a pull request in both repositories).
4. Check it first, if you can: `node tools/validate.js --app <built checkout of the app> worlds/<id>`. CI runs the same validator.
5. One approval is needed on `main`, commits must be signed, and the art needs its approver (below). Maintainers decide; a world can be turned down without a reason being owed.

## What gets refused

- Any file that is not `world.json`, `card.json`, `ASSETS.md` or a listed `.webp` picture: no script, HTML, CSS, SVG, font, link, archive, executable bit or sub-folder.
- A picture with metadata, animation, a wrong size, or over its size cap; a pack over 4 MB or 40 files.
- A picture without an `ASSETS.md` row, an exclusion clause missing from its prompt, an approval that is missing, refused, or given by the picture's own maker.
- Pictures with a flag, national emblem, logo, text, religious building or symbol, landmark, stereotype, national caricature or arch (kingdom worlds follow their history, spec 102 FR-010).
- **Any likeness of a real person.** If a picture of a person looks like someone real, it is refused or removed, and the pack can be revoked in a later app release.
- **Crew art** (a crew's own character style) without Paco's approval of each image.
- Pictures you may not offer under the licence you state.

## Licence of the art

The repository's code and text are under the [MIT licence](LICENSE), and **MIT is the default for the art** too, unless a world's `ASSETS.md` row says otherwise. Be honest about its limits: art made with AI image tools has its own uncertainty. Whether such output can be owned or licensed at all, and what a tool's terms allow, depends on the tool and on the country, and nobody here has verified it. The `ASSETS.md` row records the tool, its version and the maker so that a question can be answered later. This is not legal advice and nothing here is a legal claim; if it matters to you, ask a lawyer before you use a picture elsewhere.

## Checks and working here

`Validate worlds` (`.github/workflows/validate.yml`) runs on every pull request, with a read-only token and no secrets, so a pull request from a fork runs the same way. It validates every changed pack with the app repository's validator, checks `ASSETS.md`, the sizes and the file-type allow-list, and runs a self-test on a good and many hostile fixture packs. The checks themselves are taken from the base commit (`main`), not from the pull request, so a pull request cannot weaken the gate it is judged by; a change to `tools/` is judged by the current tools and applies after merge. A pull request can still edit the workflow file, which is why code owner review on `.github/` should be mandatory (a setting for the owners). Set ids are read from the pinned app (`CHARACTER_CHOICES`), not kept here. `APP_SHA` in that workflow is pinned; at first it points at the pull-request branch of the validator and must be moved to the app's `main` once that is merged.

Agents and humans follow the app repository's [AGENTS.md](https://github.com/three-feathers/agent-durbar/blob/main/AGENTS.md); this repository's [AGENTS.md](AGENTS.md) adds the art rules and the rule on untrusted text.
