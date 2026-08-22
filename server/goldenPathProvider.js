export function providerConfig() {
  return {
    name: process.env.GOLDEN_PATH_PROVIDER || (process.env.BRIA_API_TOKEN ? 'bria' : 'local-fallback'),
    configured: !!process.env.BRIA_API_TOKEN
  };
}

// Keep provider secrets here on the server, never in the browser.
// Replace these stubs with exact current API calls once the provider key is chosen.
export async function extractActors({ imageUrl, regions }) {
  throw new Error('Wire real segmentation/cutout API here.');
}
export async function repairPlate({ imageUrl, masks }) {
  throw new Error('Wire real erase/inpaint API here.');
}
export async function extendPlate({ imageUrl, width = 2600 }) {
  throw new Error('Wire real image expansion/outpaint API here.');
}
