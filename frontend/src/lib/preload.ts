/** Anatomy layers for the pain map (built by scripts/prepare-anatomy.mjs). */
export const MODEL_URLS = { body: '/models/body.glb', inside: '/models/inside.glb' }

/** Warm the 3D code and models while the board is idle, so the pain map opens fast. */
export function preloadBody() {
  void import('../components/Body3D.tsx')
  for (const url of Object.values(MODEL_URLS)) fetch(url, { priority: 'low' }).catch(() => {})
}
