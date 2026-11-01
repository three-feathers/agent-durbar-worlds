# Assets of a world (template: copy to worlds/<id>/ASSETS.md)

One row for every picture in the folder and nothing else. `tools/validate.js` and the CI check `Validate worlds` read this table.

- **Maker**: the GitHub login of the person responsible for the picture (compared with Approver as a login; owners written as Paco, Vikram or Ruben count as their logins).
- **Kind**: `world` (room art) or `crew` (a crew's own art style). Crew art is approved by `fjcabello` per image; world art by `vikramgorla`. The maker never approves their own picture.
- **Approval**: `pending` (allowed in a draft PR, but nobody merges a world that is not `approved` before it is offered), `approved` (needs Approver and Approved on) or `refused` (cannot merge).
- **Prompt**: the exact prompt, which must carry the exclusion clause (spec 102 FR-010: no flag, national emblem, logo, text, religious building or symbol, landmark, stereotype or arch). Hand-made pictures: say how it was made.
- No generated originals and no metadata are committed here; this table is the record.

| File | Kind | Tool and version | Date | Maker | Prompt | Processing | Licence | Approval | Approver | Approved on |
|---|---|---|---|---|---|---|---|---|---|---|
| wall.webp | world | (example) tool name and version | 2026-01-01 | example-login | (example) the exact prompt, ... no flag, no logo, no text ... | cut, resized, re-encoded as WebP, metadata stripped | MIT | pending | | |
