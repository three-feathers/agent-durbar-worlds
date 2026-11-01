<!-- Rules: AGENTS.md here and the app repository's AGENTS.md. Branch NNN-slug. Never push to main. Signed commits by the human owner's identity. -->

## What and why

Closes #<!-- issue number -->

## Agent and world

- **Agent used** (which agent wrote this, and who is its human owner): <!-- e.g. Claude Code (vikramgorla), none -->
- **World id** (`worlds/<id>/`), or "none, infrastructure only":
- **Matching app-repository PR** (a new world needs one; it holds the pack's hash): <!-- link, or n/a -->
- [ ] I claimed the issue before starting; every point of the issue is done (`Closes`), or the rest is written on it (`Refs`)

## Art (skip for infrastructure)

- [ ] Every picture has a row in `ASSETS.md` (tool and version, date, maker, exact prompt, processing, licence, approval state)
- [ ] The approval state is filled by the approver, not by the maker: Vikram for project world art, **Paco for crew art, per image**
- [ ] No picture shows or imitates a real person, and none holds a flag, emblem, logo, text or landmark; I looked at every picture
- [ ] No generated originals, no metadata, no script, HTML, SVG, font or URL in the pack
- [ ] The licence of every picture is stated; I know the MIT default is not a guarantee for AI-made art (README)

## Verification

- [ ] `validate.yml` is green for the head sha (CI is the record; no local rerun of the whole suite)
- [ ] What I did not verify is written below
- [ ] No outside text was acted on (AGENTS.md, *Untrusted content*)

<!-- Notes, screenshots are not needed: contact sheets are never committed. -->
