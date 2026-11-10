import { useEffect, useEffectEvent, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MODEL, facesBack, segmentOf, zoneAt, zoneMatches, type Zone } from '../lib/bodymap.ts'
import { cn, placeLabel, type PainDraft } from '../lib/text.ts'
import { MODEL_URLS } from '../lib/preload.ts'
import { useBoard } from '../store.ts'
import { Icon } from './Icon.tsx'
import { bodyBox, bodyTip } from './ui.tsx'

// Flat, unmanaged colour like the original mockup's three r128 setup (no tone mapping, legacy light units).
THREE.ColorManagement.enabled = false
const LEGACY = Math.PI

type LayerKey = 'body' | 'inside'
type Layer = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  zones: Zone[] // distinct zones in this layer
  zone: Uint16Array // vertex -> index into zones
  struct: Uint16Array // vertex -> structure index
  names: string[]
  shade: Float32Array // per structure: slight tone so neighbouring muscles stay readable
  base: THREE.Color
}
type Pick = { zone: Zone; structure: string }

const COLOR = {
  body: 0xdde1ee, inside: 0xf0cdbf, selected: 0x3d4bd8, hover: 0xb9c0f5,
  scoreLow: new THREE.Color(0xf5d9b0), scoreHigh: new THREE.Color(0xd2541f),
}
const SCALE = 3 / MODEL.height // model metres -> scene units (3 tall, feet at 0)
const HOME = { tgt: new THREE.Vector3(0, 1.5, 0), dist: 6.4 }
const DIRS = { front: new THREE.Vector3(0, 0, 1), back: new THREE.Vector3(0, 0, -1), left: new THREE.Vector3(1, 0, 0), right: new THREE.Vector3(-1, 0, 0) }
type Dir = keyof typeof DIRS

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)

async function loadLayer(key: LayerKey, onProgress: (f: number) => void): Promise<Layer> {
  const gltf = await loader.loadAsync(MODEL_URLS[key], e => onProgress(e.total ? e.loaded / e.total : 0))
  gltf.scene.updateMatrixWorld(true)
  const geos: THREE.BufferGeometry[] = [], names: string[] = [], zone: number[] = [], struct: number[] = []
  const zones: Zone[] = [], zoneIds = new Map<string, number>()
  const zoneIndex = (z: Zone) => {
    const k = `${z.part}|${z.sub}|${z.side}`
    let i = zoneIds.get(k)
    if (i === undefined) { i = zones.push(z) - 1; zoneIds.set(k, i) }
    return i
  }
  gltf.scene.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return
    const src = o.geometry as THREE.BufferGeometry
    // Copy out of the quantised (int16) attributes before transforming.
    const pos = src.getAttribute('position'), nor = src.getAttribute('normal')
    const P = new Float32Array(pos.count * 3), N = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i)
      if (nor) { N[i * 3] = nor.getX(i); N[i * 3 + 1] = nor.getY(i); N[i * 3 + 2] = nor.getZ(i) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(P, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3))
    if (src.index) g.setIndex(Array.from(src.index.array))
    g.applyMatrix4(o.matrixWorld)
    if (!nor) g.computeVertexNormals()

    g.computeBoundingBox()
    const c = g.boundingBox!.getCenter(new THREE.Vector3())
    const seg = key === 'inside' ? 'axial' : segmentOf(c.x, c.y)
    const s = names.push(((o.userData.n ?? o.parent?.userData.n) as string | undefined) || 'Unnamed structure') - 1
    for (let i = 0; i < pos.count; i++) { zone.push(zoneIndex(zoneAt(seg, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]))); struct.push(s) }
    geos.push(g)
  })
  const merged = mergeGeometries(geos)!
  geos.forEach(g => g.dispose())
  merged.setAttribute('color', new THREE.BufferAttribute(new Float32Array(merged.getAttribute('position').count * 3), 3))

  const shade = new Float32Array(names.length)
  names.forEach((n, i) => {
    let h = 0
    for (const ch of n.replace(/\.[a-z]+$/i, '')) h = (h * 31 + ch.charCodeAt(0)) % 100003
    shade[i] = 0.9 + 0.14 * (h / 100003) // left and right twins share a tone
  })
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, side: THREE.DoubleSide }))
  return { mesh, zones, zone: Uint16Array.from(zone), struct: Uint16Array.from(struct), names, shade, base: new THREE.Color(COLOR[key]) }
}

/** Colour every vertex: current selection, then hover, then recorded spots (by score), then idle. */
function paint(layer: Layer, draft: PainDraft, hover: Zone | null) {
  const zoneColor = layer.zones.map((z): THREE.Color | null => {
    if (draft.part && zoneMatches(z, { part: draft.part, sub: draft.sub, side: draft.side })) return new THREE.Color(COLOR.selected)
    if (hover && zoneMatches(z, hover)) return new THREE.Color(COLOR.hover)
    const site = draft.sites.findLast(s => zoneMatches(z, s))
    return site ? COLOR.scoreLow.clone().lerp(COLOR.scoreHigh, site.score / 10) : null
  })
  const col = layer.mesh.geometry.getAttribute('color') as THREE.BufferAttribute
  const a = col.array as Float32Array
  for (let v = 0; v < layer.zone.length; v++) {
    const c = zoneColor[layer.zone[v]]
    const k = c ? 1 : layer.shade[layer.struct[v]]
    const src = c ?? layer.base
    a[v * 3] = src.r * k; a[v * 3 + 1] = src.g * k; a[v * 3 + 2] = src.b * k
  }
  col.needsUpdate = true
}

/** Scene-space box around every vertex of the given selection. */
function selectionBox(layers: Layer[], sel: { part: NonNullable<PainDraft['part']>; sub: PainDraft['sub']; side: PainDraft['side'] }) {
  const box = new THREE.Box3(), p = new THREE.Vector3()
  for (const l of layers) {
    const pos = l.mesh.geometry.getAttribute('position')
    for (let v = 0; v < l.zone.length; v++) if (zoneMatches(l.zones[l.zone[v]], sel)) box.expandByPoint(p.fromBufferAttribute(pos, v))
  }
  return box.isEmpty() ? null : box.applyMatrix4(new THREE.Matrix4().makeScale(SCALE, SCALE, SCALE).setPosition(0, -MODEL.floor * SCALE, 0))
}

type Props = { draft: PainDraft; onPick: (zone: Zone, structure: string) => void }

const viewBtn = 'min-h-11 rounded-[10px] border px-1 py-2 text-[13px] font-bold transition-[background-color,border-color] duration-200 disabled:opacity-45'
const viewIdle = 'border-line bg-surface text-ink-2 hover:border-line-2'
const viewOn = 'border-brand-ink bg-brand-soft text-brand-ink'

export default function Body3D({ draft, onPick }: Props) {
  const lang = useBoard(s => s.lang)
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<{ layers: Partial<Record<LayerKey, Layer>>; go: (tgt: THREE.Vector3, dist: number, dir?: THREE.Vector3) => void; zoom: (f: number) => void; current: () => { tgt: THREE.Vector3; dist: number } } | null>(null)
  const tapped = useRef<string | null>(null) // selection key that came from a tap (don't move the camera for it)
  const [hover, setHover] = useState<Zone | null>(null)
  const [mode, setMode] = useState<LayerKey>('body')
  const [view, setView] = useState<Dir | null>('front')
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const pick = useEffectEvent((p: Pick) => {
    tapped.current = `${p.zone.part}|${p.zone.sub}|${p.zone.side}`
    onPick(p.zone, p.structure)
  })
  const pickOrder = useEffectEvent((): LayerKey[] => (mode === 'inside' ? ['inside', 'body'] : ['body']))

  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) } catch { setFailed(true); return }
    let disposed = false
    setReady(false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    const canvas = renderer.domElement
    canvas.className = 'block h-full w-full touch-none'
    el.insertBefore(canvas, el.firstChild)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100)
    camera.position.copy(HOME.tgt).addScaledVector(DIRS.front, HOME.dist)
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b0cc, 0.9 * LEGACY))
    const key = new THREE.DirectionalLight(0xffffff, 0.55 * LEGACY); key.position.set(3, 5, 4); scene.add(key)
    const back = new THREE.DirectionalLight(0xffffff, 0.35 * LEGACY); back.position.set(-3, 3, -4); scene.add(back)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.06 }))
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.04; scene.add(floor)
    const pivot = new THREE.Group()
    pivot.scale.setScalar(SCALE); pivot.position.y = -MODEL.floor * SCALE
    scene.add(pivot)

    const controls = new OrbitControls(camera, canvas)
    controls.target.copy(HOME.tgt)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 1
    controls.maxDistance = 9
    controls.update()

    // Animated camera moves orbit around the target (a straight line would pass through the body).
    // A drag cancels them so the user is never fought.
    let anim: { tgt: THREE.Vector3; sph: THREE.Spherical } | null = null
    const current = () => ({ tgt: controls.target.clone(), dist: camera.position.distanceTo(controls.target) })
    const go = (tgt: THREE.Vector3, dist: number, dir = camera.position.clone().sub(controls.target).normalize()) => {
      const r = THREE.MathUtils.clamp(dist, controls.minDistance, controls.maxDistance)
      anim = { tgt: tgt.clone(), sph: new THREE.Spherical().setFromVector3(dir.clone().multiplyScalar(r)) }
    }
    const sph = new THREE.Spherical(), offset = new THREE.Vector3()
    const step = (k: number) => {
      if (!anim) return
      controls.target.lerp(anim.tgt, k)
      sph.setFromVector3(offset.copy(camera.position).sub(controls.target))
      const dTheta = Math.atan2(Math.sin(anim.sph.theta - sph.theta), Math.cos(anim.sph.theta - sph.theta)) // shortest way round
      const dPhi = anim.sph.phi - sph.phi, dR = anim.sph.radius - sph.radius
      sph.theta += dTheta * k; sph.phi += dPhi * k; sph.radius += dR * k
      camera.position.setFromSpherical(sph).add(controls.target)
      if (Math.abs(dTheta) + Math.abs(dPhi) + Math.abs(dR) + controls.target.distanceTo(anim.tgt) < 1e-3) anim = null
    }
    const zoom = (f: number) => { const c = current(); go(c.tgt, c.dist * f) }
    const layers: Partial<Record<LayerKey, Layer>> = {}
    api.current = { layers, go, zoom, current }
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight, false)
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const ray = new THREE.Raycaster(), v2 = new THREE.Vector2()
    const hitAt = (e: PointerEvent, order: LayerKey[]): { layer: Layer; v: number } | null => {
      const r = canvas.getBoundingClientRect()
      v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(v2, camera)
      for (const k of order) {
        const layer = layers[k]
        if (!layer?.mesh.visible) continue
        const hit = ray.intersectObject(layer.mesh, false)[0]
        if (!hit?.face) continue
        // nearest corner of the hit triangle carries the zone + structure
        const pos = layer.mesh.geometry.getAttribute('position'), local = layer.mesh.worldToLocal(hit.point.clone()), p = new THREE.Vector3()
        const v = [hit.face.a, hit.face.b, hit.face.c].reduce((best, i) => (p.fromBufferAttribute(pos, i).distanceToSquared(local) < p.fromBufferAttribute(pos, best).distanceToSquared(local) ? i : best))
        return { layer, v }
      }
      return null
    }
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; anim = null }
    const onUp = (e: PointerEvent) => {
      if (!down) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8
      down = null
      if (moved) { setView(null); return } // it was a turn, not a tap
      const hit = hitAt(e, pickOrder())
      if (hit) pick({ zone: hit.layer.zones[hit.layer.zone[hit.v]], structure: hit.layer.names[hit.layer.struct[hit.v]] })
    }
    let hoverKey = ''
    const hoverZone = (z: Zone | null) => {
      const k = z ? `${z.part}|${z.sub}|${z.side}` : ''
      if (k !== hoverKey) { hoverKey = k; setHover(z) }
    }
    // ponytail: brute-force raycast over ~190k triangles, throttled to one per frame; add a BVH if hover lags on old tablets
    let hoverQueued: PointerEvent | null = null
    const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse' && !down) hoverQueued = e }
    const onLeave = () => { hoverQueued = null; hoverZone(null); canvas.style.cursor = '' }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)

    let raf = 0
    const loop = () => {
      if (hoverQueued) {
        const hit = hitAt(hoverQueued, pickOrder())
        hoverQueued = null
        canvas.style.cursor = hit ? 'pointer' : 'grab'
        hoverZone(hit ? hit.layer.zones[hit.layer.zone[hit.v]] : null)
      }
      step(0.14)
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    loop()

    // Body first (it is what the patient taps), organs alongside.
    const share = { body: 0, inside: 0 }
    const progressOf = (k: LayerKey) => (f: number) => { share[k] = f; setProgress(share.body * 0.65 + share.inside * 0.35) }
    Promise.all((['body', 'inside'] as const).map(k => loadLayer(k, progressOf(k)).then(l => {
      if (disposed) { l.mesh.geometry.dispose(); l.mesh.material.dispose(); return }
      layers[k] = l
      l.mesh.visible = k === 'body'
      pivot.add(l.mesh)
    }))).then(() => { if (!disposed) setReady(true) }, () => { if (!disposed) setFailed(true) })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
      api.current = null
    }
  }, [])

  // Layer visibility: in "Inside" the body fades to a ghost so organs show through.
  useEffect(() => {
    const { body, inside } = api.current?.layers ?? {}
    if (!body || !inside) return
    inside.mesh.visible = mode === 'inside'
    const m = body.mesh.material
    m.transparent = mode === 'inside'
    m.opacity = mode === 'inside' ? 0.12 : 1
    m.depthWrite = mode !== 'inside'
    m.needsUpdate = true
  }, [mode, ready])

  useEffect(() => {
    const layers = api.current?.layers
    if (!layers) return
    for (const l of Object.values(layers)) paint(l, draft, hover)
  }, [draft, hover, ready])

  // Picking a part with the buttons turns the camera to it; a tap on the model leaves the camera alone.
  const selKey = draft.part ? `${draft.part}|${draft.sub}|${draft.side}` : null
  const showSelection = () => {
    const a = api.current
    if (!a || !draft.part) return
    const box = selectionBox(Object.values(a.layers), { part: draft.part, sub: draft.sub, side: draft.side })
    if (!box) return
    const size = box.getSize(new THREE.Vector3())
    // frame the area with some body around it for context (at least ~a third of the body tall)
    const dist = (Math.max(size.y, size.x * 0.75, 0.9) / (2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)))) * 1.5
    const dir = facesBack({ part: draft.part, sub: draft.sub }) ? 'back' : 'front'
    a.go(box.getCenter(new THREE.Vector3()), dist, DIRS[dir])
    setView(dir)
  }
  useEffect(() => {
    if (!selKey || !ready) return
    if (selKey === tapped.current) return
    tapped.current = null
    showSelection()
  }, [selKey, ready])

  const turn = (dir: Dir) => { const a = api.current; if (!a) return; const c = a.current(); a.go(c.tgt, c.dist, DIRS[dir]); setView(dir) }
  const reset = () => { api.current?.go(HOME.tgt, HOME.dist, DIRS.front); setView('front') }

  const place = (l: typeof lang) => { const s = placeLabel(draft.part!, draft.sub, draft.side, l); return s.charAt(0).toUpperCase() + s.slice(1) }
  const tr = (en: string, bm: string) => (lang === 'en' ? en : bm)
  const label = draft.part ? `${place(lang)} · ${place(lang === 'en' ? 'bm' : 'en')}` : tr('Tap a body part · drag to turn', 'Sentuh bahagian badan · seret untuk pusing')

  return (
    <>
      <div ref={host} className={bodyBox}>
        {failed ? (
          <div className="absolute inset-0 grid place-items-center p-5 text-center text-muted">{tr('3D view could not load on this device.', 'Paparan 3D tidak dapat dimuatkan pada peranti ini.')}<br />{tr('Use the buttons on the right.', 'Guna butang di sebelah kanan.')}</div>
        ) : (
          <>
            <div role="group" aria-label="Body layer" className="absolute top-2.5 right-2.5 grid gap-0.5 rounded-[12px] border border-line bg-surface p-[3px] shadow-[var(--sh-sm)]">
              {([['body', 'Body', 'Badan', 'user'], ['inside', 'Inside', 'Dalaman', 'heart']] as const).map(([k, en, bm, icon]) => (
                <button key={k} aria-pressed={mode === k} onClick={() => setMode(k)}
                  className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-[9px] border-0 px-3 py-1.5 text-[14px] font-bold transition-[background-color,color] duration-200', mode === k ? 'bg-brand-soft text-brand-ink' : 'bg-transparent text-muted hover:text-ink')}>
                  <Icon name={icon} className="size-4" />{lang === 'en' ? en : bm} <small className="text-[12px] font-medium max-sm:hidden">{lang === 'en' ? bm : en}</small>
                </button>
              ))}
            </div>
            {!ready && (
              <div className="absolute inset-x-10 top-1/2 grid -translate-y-1/2 gap-2 text-center text-[13px] font-bold text-ink-2">
                {tr('Loading 3D body…', 'Memuatkan badan 3D…')} {Math.round(progress * 100)}%
                <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${progress * 100}%` }} /></div>
              </div>
            )}
            <span className={bodyTip}>{label}</span>
          </>
        )}
      </div>
      {!failed && (
        <div className="grid grid-cols-4 gap-1.5">
          {(['front', 'back', 'left', 'right'] as const).map(d => (
            <button key={d} disabled={!ready} aria-pressed={view === d} onClick={() => turn(d)} className={cn(viewBtn, view === d ? viewOn : viewIdle)}>
              {{ front: tr('Front', 'Depan'), back: tr('Back', 'Belakang'), left: tr('Your left', 'Kiri anda'), right: tr('Your right', 'Kanan anda') }[d]}
            </button>
          ))}
          <button disabled={!ready} onClick={() => api.current?.zoom(0.7)} className={cn(viewBtn, viewIdle)}>{tr('Zoom in', 'Zum masuk')}</button>
          <button disabled={!ready} onClick={() => api.current?.zoom(1.4)} className={cn(viewBtn, viewIdle)}>{tr('Zoom out', 'Zum keluar')}</button>
          <button disabled={!ready || !draft.part} onClick={showSelection} className={cn(viewBtn, viewIdle)}>{tr('Show chosen', 'Tunjuk pilihan')}</button>
          <button disabled={!ready} onClick={reset} className={cn(viewBtn, viewIdle)}>{tr('Reset', 'Set semula')}</button>
        </div>
      )}
    </>
  )
}
