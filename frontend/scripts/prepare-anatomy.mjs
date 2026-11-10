// One-off: turns the Z-Anatomy / BodyParts3D system models into the two small
// layers the pain map loads (public/models/body.glb, inside.glb).
//
//   node scripts/prepare-anatomy.mjs <path-to-anatomi-simulatoru/systems>
//
// Source: https://github.com/DrMuratAltun/anatomi-simulatoru (3D data CC BY-SA 4.0)
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const src = process.argv[2]
if (!src) throw new Error('usage: node scripts/prepare-anatomy.mjs <systems dir>')
const out = new URL('../public/models/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
mkdirSync(out, { recursive: true })

// Sheets that cover everything underneath, genital structures (hidden on a hospital board),
// and Z-Anatomy's floating 3D text labels (".g").
const DROP = /fascia|aponeuros|retinacul|peritone|pleura|dura mater|pericardi|omentum|epicardium|penis|scrot|testis|testicul|epididym|prostat|seminal|ductus deferens|spermat|glans|corpus cavernos|corpus spongios|uter|ovar|vagin|clitor|salping|\.g$/i

const LAYERS = [
  { from: 'kas.glb', to: 'body.glb', ratio: 0.25 },
  { from: 'ic-organlar.glb', to: 'inside.glb', ratio: 0.35 },
]

await MeshoptEncoder.ready
await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })

for (const layer of LAYERS) {
  const doc = await io.read(join(src, layer.from))
  let kept = 0, dropped = 0
  for (const node of doc.getRoot().listNodes()) {
    if (!node.getMesh()) continue
    if (DROP.test(node.getName())) { node.dispose(); dropped++; continue }
    // three.js sanitises node names ("Incus.l" -> "Incusl"); extras survive as userData.
    node.setExtras({ n: node.getName() })
    for (const prim of node.getMesh().listPrimitives()) prim.setAttribute('TEXCOORD_0', null)
    kept++
  }
  await doc.transform(
    prune(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: layer.ratio, error: 0.0008 }),
    dedup(),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  )
  const file = join(out, layer.to)
  await io.write(file, doc)
  let tris = 0
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? 0) / 3
  console.log(`${layer.to}: ${kept} structures (${dropped} dropped), ${Math.round(tris / 1000)}k triangles, ${(statSync(file).size / 1e6).toFixed(2)} MB`)
}
