<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

p5.disableFriendlyErrors = true

const sketchContainer = ref(null)
let p5Instance = null

// NOTE: do NOT reference module-scope constants inside Strands uniform callbacks.
// Use the literal key string there.
const POSTFX_KEY = '__P5_TREE_POSTFX__'

// Strands needs these as bare identifiers during modify() transpile.
const installStrandsGlobals = (p) => {
  const names = [
    'uniformFloat', 'uniformTexture', 'getColor', 'getTexture',
    'abs', 'float', 'floor', 'fract', 'sin', 'cos', 'dot', 'mix',
    'TWO_PI'
  ]

  const prev = {}
  names.forEach((k) => {
    prev[k] = globalThis[k]
    const v = p[k]
    globalThis[k] = typeof v === 'function' ? v.bind(p) : v
  })

  prev.millis = globalThis.millis
  globalThis.millis = () => p.millis()

  return () => {
    names.forEach((k) => {
      if (prev[k] === undefined) delete globalThis[k]
      else globalThis[k] = prev[k]
    })
    if (prev.millis === undefined) delete globalThis.millis
    else globalThis.millis = prev.millis
  }
}

const ensurePostFX = () => (globalThis[POSTFX_KEY] ||= {})

const sketch = (p) => {
  let layer
  let models
  let focusVal = 0

  let ui
  let blurFilter, pixelFilter, noiseFilter
  let uninstallStrandsGlobals = null

  function blurCallback () {
    const depthTex = uniformTexture(() => globalThis.__P5_TREE_POSTFX__.layer.depth)
    const focus = uniformFloat(() => globalThis.__P5_TREE_POSTFX__.focusVal)
    const blurIntensity = uniformFloat(() => globalThis.__P5_TREE_POSTFX__.ui.blurIntensity.value())

    const getBlurriness = (d) => abs(d - focus) * 40 * blurIntensity
    const maxBlurDistance = (b) => b * 0.01

    getColor((inputs, canvasContent) => {
      let colour = getTexture(canvasContent, inputs.texCoord)
      let samples = 1

      const centerDepth = getTexture(depthTex, inputs.texCoord).r
      const blurriness = getBlurriness(centerDepth)

      for (let i = 0; i < 20; i++) {
        const angle = float(i) * TWO_PI / 20
        const blurDistance = float(i) / 20 * maxBlurDistance(blurriness)
        const offset = [cos(angle) * blurDistance, sin(angle) * blurDistance]

        const sampleDepth = getTexture(depthTex, inputs.texCoord + offset).r
        const sampleBlurDist = maxBlurDistance(getBlurriness(sampleDepth))

        if (sampleDepth >= centerDepth || sampleBlurDist >= blurDistance) {
          colour += getTexture(canvasContent, inputs.texCoord + offset)
          samples++
        }
      }

      colour /= float(samples)
      return [colour.rgb, 1]
    })
  }

  function pixelCallback () {
    const level = uniformFloat(() => globalThis.__P5_TREE_POSTFX__.ui.level.value())

    getColor((inputs, canvasContent) => {
      let stepCoord = inputs.texCoord * level
      stepCoord = floor(stepCoord)
      stepCoord = stepCoord / level
      const colour = getTexture(canvasContent, stepCoord)
      return [colour.rgb, 1]
    })
  }

  function noiseCallback () {
    const frequency = uniformFloat(() => globalThis.__P5_TREE_POSTFX__.ui.frequency.value())
    const amplitude = uniformFloat(() => globalThis.__P5_TREE_POSTFX__.ui.amplitude.value())
    const speed = uniformFloat(() => globalThis.__P5_TREE_POSTFX__.ui.speed.value())
    const time = uniformFloat(() => performance.now() / 1000)
    //const time = uniformFloat(() => millis() / 1000)

    const hash = (pp) => fract(sin(dot(pp, [127.1, 311.7, 74.7])) * 43758.5453123)
    const fade = (t) => t * t * (3 - 2 * t)

    const valueNoise3 = (pp) => {
      const i = floor(pp)
      const f = fract(pp)
      const u = fade(f)

      const n000 = hash(i + [0, 0, 0])
      const n100 = hash(i + [1, 0, 0])
      const n010 = hash(i + [0, 1, 0])
      const n110 = hash(i + [1, 1, 0])
      const n001 = hash(i + [0, 0, 1])
      const n101 = hash(i + [1, 0, 1])
      const n011 = hash(i + [0, 1, 1])
      const n111 = hash(i + [1, 1, 1])

      const nx00 = mix(n000, n100, u.x)
      const nx10 = mix(n010, n110, u.x)
      const nx01 = mix(n001, n101, u.x)
      const nx11 = mix(n011, n111, u.x)

      const nxy0 = mix(nx00, nx10, u.y)
      const nxy1 = mix(nx01, nx11, u.y)

      return (mix(nxy0, nxy1, u.z) * 2) - 1
    }

    getColor((inputs, canvasContent) => {
      const t = speed * time
      const s = frequency * inputs.texCoord.x
      const v = frequency * inputs.texCoord.y

      const n1 = valueNoise3([s, v, t])
      const n2 = valueNoise3([s + 17, v, t])

      const texCoords = inputs.texCoord + [amplitude * n1, amplitude * n2]
      const colour = getTexture(canvasContent, texCoords)
      return [colour.rgb, 1]
    })
  }

  p.setup = function () {
    const canvas = p.createCanvas(590, 370, p.WEBGL)
    canvas.parent(sketchContainer.value)

    layer = p.createFramebuffer()

    ui = p.createUniformUI({
      frequency: { min: 0, max: 10, value: 0, step: 0.1, label: 'frequency' },
      amplitude: { min: 0, max: 1, value: 0, step: 0.01, label: 'amplitude' },
      speed: { min: 0, max: 1, value: 0, step: 0.01, label: 'speed' },
      level: { min: 1, max: 600, value: 600, step: 1, label: 'level' },
      blurIntensity: { min: 0, max: 4, value: 0, step: 0.1, label: 'blur' }
    }, {
      parent: sketchContainer.value, x: 10, y: 10, width: 160, labels: true, title: 'Post FX', color: 'white'
    })

    const postfx = ensurePostFX()
    postfx.ui = ui
    postfx.layer = layer
    postfx.focusVal = focusVal

    uninstallStrandsGlobals = installStrandsGlobals(p)
    noiseFilter = p.baseFilterShader().modify(noiseCallback)
    pixelFilter = p.baseFilterShader().modify(pixelCallback)
    blurFilter = p.baseFilterShader().modify(blurCallback)
    uninstallStrandsGlobals()
    uninstallStrandsGlobals = null

    const trange = 200
    models = []
    for (let i = 0; i < 50; i++) {
      models.push({
        position: p.createVector(
          (p.random() * 2 - 1) * trange,
          (p.random() * 2 - 1) * trange,
          (p.random() * 2 - 1) * trange
        ),
        size: p.random() * 25 + 8,
        color: p.color(p.int(p.random(256)), p.int(p.random(256)), p.int(p.random(256))),
        type: i === 0 ? 'ball' : i < 25 ? 'torus' : 'box'
      })
    }

    console.log('p5 version:', p5.VERSION)
    console.log('p5.Tree version:', p5.Tree.VERSION)
  }

  p.draw = function () {
    layer.begin()
    p.background(0)
    p.axes()
    p.orbitControl()

    p.noStroke()
    p.ambientLight(100)

    const direction = p.mapDirection(p5.Tree._k, { from: p5.Tree.EYE, to: p5.Tree.WORLD })
    p.directionalLight(255, 255, 255, direction.x, direction.y, direction.z)

    p.specularMaterial(255)
    p.shininess(150)

    models.forEach(model => {
      p.push()
      p.fill(model.color)
      p.translate(model.position)
      model.type === 'box'
        ? p.box(model.size)
        : model.type === 'torus'
          ? p.torus(model.size)
          : p.sphere(model.size)
      p.pop()
    })

    focusVal = p.mapLocation(models[0].position, { from: p5.Tree.WORLD, to: p5.Tree.SCREEN }).z
    layer.end()

    globalThis.__P5_TREE_POSTFX__.focusVal = focusVal

    p.pipe(layer, [noiseFilter, pixelFilter, blurFilter])
  }

  p.mouseWheel = () => false

  p.remove = function () {
    uninstallStrandsGlobals && uninstallStrandsGlobals()
    uninstallStrandsGlobals = null
    try { delete globalThis[POSTFX_KEY] } catch {}
  }
}

onMounted(() => {
  p5Instance = new p5(sketch, sketchContainer.value)
})

onUnmounted(() => {
  p5Instance && p5Instance.remove()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-4">
    <div ref="sketchContainer" class="rounded-lg overflow-hidden border border-white/10 shadow-2xl"></div>
    <p class="text-xs text-gray-400 italic">
      Post FX pipeline: noise → pixel → depth blur
    </p>
  </div>
</template>
