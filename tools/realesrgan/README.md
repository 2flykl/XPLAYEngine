# XPLAY Local Upscale Beast — Real-ESRGAN

This folder is the expected local home for the Windows NCNN/Vulkan Real-ESRGAN runtime.

## Install

Download and extract the Windows `realesrgan-ncnn-vulkan` portable package, then place the runtime files here so the executable resolves to:

```text
tools/realesrgan/realesrgan-ncnn-vulkan.exe
```

Keep the package's `models` directory beside the executable. The executable, DLLs, and model files are ignored by Git and stay local to each developer machine.

## XPLAY server behavior

The server automatically checks this repo-relative path. You can override it in `server/.env`:

```env
REALESRGAN_PATH=C:\path\to\realesrgan-ncnn-vulkan.exe
REALESRGAN_MODEL=realesrgan-x4plus
```

No API key is required for local upscaling.

## Endpoints

Check availability:

```text
GET /api/upscale/health
```

Upscale an uploaded image:

```text
POST /api/upscale/2x
POST /api/upscale/4x
```

Send multipart form-data with field `image`. Optional field `kind` may be `general`, `anime`, `cartoon`, or `cel`; cartoon/anime modes automatically select `realesrgan-x4plus-anime` unless a specific `model` form field is supplied.

The response contains a transparent PNG as a data URL and reports `zeroApiUsage: true`.

## Intended XPLAY pipeline

```text
Generated PNG
  -> Local Real-ESRGAN 2x/4x
  -> alpha/silhouette cleanup
  -> frame validation / anchor alignment
  -> cache
  -> runtime
```

Real-ESRGAN enhances existing image detail; it does not repair missing limbs, bad poses, incorrect sprite-state mapping, or clipped source artwork. Those failures should be repaired before or separately from the upscale step.
