# XPLAY V14 — Beast Orchestrator Charter

The final architecture is no longer “agents passing prose to each other.”
All agents share one structured **Build DNA** object.

## Chain of authority
VISION -> GAME GRAMMAR -> ART -> ASSEMBLY -> FUN -> QA -> REPAIR

Downstream agents are not allowed to overwrite high-confidence upstream facts.

Examples:
- If screenshot analysis + user selection lock Fighting, Runtime cannot reinterpret it as Open World.
- If source analysis locks three foreground enemies, Art cannot silently replace them with airport props.
- If the current build has buildId A, an asset from buildId B is stale and should be rejected.

## Required methods
- structured multimodal output
- game grammar inference
- source fingerprinting
- build-specific provenance
- stale asset rejection
- manifest preflight
- runtime startup validation
- render/capture/compare/repair
- AI playtest before release

## Product stop condition
Do not stop when code builds.
Do not stop when assets exist.
Do not stop when a canvas mounts.
Stop when a generated PLX is playable, visually source-aware, fun, and QA-verified.
