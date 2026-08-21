# XPLAY Vision Resilience V2

This build hardens the Gemini pathway against temporary 503/high-demand spikes.

## Request flow

1. Send the normal Vision request to `GEMINI_VISION_MODEL`.
2. Retry transient failures only: 408, 429, 500, 502, 503, 504.
3. Use exponential backoff + jitter.
4. After the configured retry limit, fail over to additional stable multimodal Gemini models.
5. Stop after the bounded model cascade. There are no infinite retry loops.
6. Screenshot mode fails closed if all semantic models are unavailable. XPLAY does not silently invent a semantic substitute.

Default model cascade:

- configured `GEMINI_VISION_MODEL`
- `gemini-3.7-flash`
- `gemini-3.5-flash`
- `gemini-3.5-flash-lite`

The fallback list can be overridden with `GEMINI_VISION_FALLBACK_MODELS`.

## Browser timeout

The browser-side Vision timeout was increased from 5 seconds to 110 seconds so it no longer cancels the backend while the resilience layer is retrying.

## Spatial Vision

`POST /api/vision/spatial` uses the same bounded retry + model failover layer, so the grid/bounding-box/scene-graph pathway does not depend on one overloaded model instance.

## Error behavior

If all configured models remain unavailable, the backend returns:

- HTTP 503
- `code: VISION_PROVIDER_BUSY`
- `retryable: true`
- models/attempts in `details`

The creator UI explains that Google is busy and keeps the Retry button active.
