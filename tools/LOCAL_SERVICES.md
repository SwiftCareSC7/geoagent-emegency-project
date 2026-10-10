# SwiftCare Local / External Services

Only what SwiftCare actually needs. Nothing here runs automatically or affects production.

## Penpot — optional external design tool

- Purpose: UI mockups / prototypes that feed the Stitch → SwiftCare implementation loop.
- Required: no. Local or external: external (hosted or self-hosted, developer's choice).
- Connects: design handoff only — export spec, implement in `app/` + `components/` with
  existing shadcn/taste-design standards. No code dependency, no production impact.

## Plane — optional external project management

- Purpose: work items / cycles for SwiftCare tasks if the team wants it.
- Required: no. Local or external: external service.
- Connects: process only — mirrors GitHub issues. No runtime dependency on the app,
  never deployed as part of SwiftCare, no production impact.
