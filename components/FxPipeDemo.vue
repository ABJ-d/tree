<!-- FxPipeDemo.vue -->
<script setup>
import { onMounted, onUnmounted, ref, reactive } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const container = ref(null)
const enabled   = reactive({ chroma: false })
let p5Instance
let uiSceneRef  = null
let uiChromaRef = null

const toggle = (key) => {
  enabled[key] = !enabled[key]
  if (key === 'chroma' && uiChromaRef) uiChromaRef.visible = enabled[key]
}

const chromaFrag = `#version 300 es
precision mediump float;
uniform sampler2D tex0;
uniform float strength;  // RGB split radius
uniform float vignette;  // falloff intensity
in  vec2 vTexCoord;
out vec4 outColor;
void main() {
  vec2 uv  = vTexCoord;
  vec2 dir = uv - 0.5;          // vector from screen centre
  float d  = length(dir);
  // Chromatic aberration — R pushed out, B pulled in
  float r = texture(tex0, uv + dir * strength * 0.04).r;
  float g = texture(tex0, uv).g;
  float b = texture(tex0, uv - dir * strength * 0.04).b;
  // Radial vignette
  float vig = 1.0 - smoothstep(0.35, 1.0, d * vignette);
  outColor = vec4(r, g, b, 1.0) * vig;
}
`

const sketch = (p) => {
  let layer, models, chromaFilter

  p.setup = function () {
    p.createCanvas(600, 340, p.WEBGL)
    layer = p.createFramebuffer()

    // createPanel mounts inside the canvas parent and auto-ticks
    // every predraw via the registered player — no manual tick() needed
    uiSceneRef = p.createPanel({
      speed:     { min: 0,   max: 0.05, value: 0.012, step: 0.001 },
      shininess: { min: 1,   max: 200,  value: 80,    step: 1     },
    }, { title: 'Scene', labels: true, collapsed: false, color: 'white', x: 10,  y: 10, width: 150 })

    chromaFilter = p.createFilterShader(chromaFrag)

    // target: chromaFilter — bridge wraps setUniform, tick() pushes automatically
    uiChromaRef = p.createPanel({
      strength: { min: 0, max: 1, value: 0.4, step: 0.01 },
      vignette: { min: 0, max: 3, value: 1.4, step: 0.05 },
    }, { target: chromaFilter, title: 'Chroma + Vignette',
         labels: true, color: 'white', x: 170, y: 10, width: 160 })

    uiChromaRef.visible = enabled.chroma

    models = Array.from({ length: 32 }, (_, i) => ({
      pos:  [p.random(-190, 190), p.random(-150, 150), p.random(-150, 150)],
      size: p.random(10, 28),
      col:  p.color(p.random(80, 255), p.random(80, 255), p.random(80, 255)),
      type: ['box', 'sphere', 'torus'][i % 3],
    }))
  }

  p.draw = function () {
    const speed = uiSceneRef.speed.value()
    const shine = uiSceneRef.shininess.value()

    layer.begin()
    p.background(12, 14, 22)
    p.orbitControl()
    p.axes({ size: 160 })
    p.push(); p.stroke(50, 65, 85, 100); p.grid({ size: 400 }); p.pop()

    const t = p.frameCount * speed
    p.pointLight(255, 180, 80,  200 * Math.cos(t), -100, 200 * Math.sin(t))
    p.directionalLight(90, 150, 220, -0.4, 0.6, -1)
    p.ambientLight(50)

    models.forEach(m => {
      p.push()
      p.fill(m.col); p.noStroke()
      p.specularMaterial(255); p.shininess(shine)
      p.translate(...m.pos)
      if      (m.type === 'box')   p.box(m.size)
      else if (m.type === 'torus') p.torus(m.size, m.size * 0.3)
      else                         p.sphere(m.size, 5, 3)
      p.pop()
    })

    layer.end()
    p.pipe(layer, enabled.chroma ? [chromaFilter] : [])
  }
}

onMounted(() => {
  p5Instance = new p5(sketch, container.value)
})

onUnmounted(() => {
  // dispose() removes DOM nodes — clearPlayers (called by p5.remove) does not
  uiSceneRef?.dispose()
  uiChromaRef?.dispose()
  uiSceneRef = uiChromaRef = null
  p5Instance?.remove()
})
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="flex items-center gap-2 text-xs font-mono">
      <span class="opacity-40 mr-1">post-fx</span>
      <button
        @click="toggle('chroma')"
        :class="[
          'px-3 py-1 rounded border transition-all duration-150 select-none',
          enabled.chroma
            ? 'bg-white/15 border-white/40 text-white'
            : 'bg-transparent border-white/15 text-white/35 hover:text-white/60'
        ]"
      >chroma + vignette</button>
    </div>
    <div ref="container" class="relative rounded-xl shadow-2xl border border-white/10" />
    <p class="text-xs opacity-40 italic tracking-wide">
      Orbit freely · tune scene · toggle chromatic aberration
    </p>
  </div>
</template>
