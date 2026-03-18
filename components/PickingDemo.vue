<!-- PickingDemo.vue -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const container = ref(null)
let p5Instance

const sketch = (p) => {
  let models
  let hitId = 0

  // Fixed palette — 6 hues cycled across objects
  const palette = [
    [0.95, 0.32, 0.22], // coral red
    [0.25, 0.62, 0.95], // sky blue
    [0.30, 0.88, 0.58], // mint
    [0.95, 0.72, 0.18], // amber
    [0.68, 0.32, 0.95], // violet
    [0.95, 0.52, 0.22], // orange
  ]

  p.setup = function () {
    p.createCanvas(600, 340, p.WEBGL)
    p.colorMode(p.RGB, 1)
    p.frameRate(1000)
    document.oncontextmenu = () => false

    const types = ['box', 'sphere', 'torus', 'cone', 'cylinder']
    models = Array.from({ length: 22 }, (_, i) => ({
      position: p5.Vector.random3D().mult(p.random(55, 140)),
      size:     p.random(12, 26),
      color:    palette[i % palette.length],
      type:     types[Math.floor(p.random(types.length))],
      id:       i + 1,
    }))
  }

  p.draw = function () {
    p.background(0.07)
    p.orbitControl()
    p.axes({ size: 110 })
    p.push(); p.stroke(0.16); p.grid({ size: 340, subdivisions: 12 }); p.pop()

    // ── GPU pick pass — one call resolves the whole scene ─────────────────
    hitId = p.mousePick(() => {
      models.forEach(m => {
        p.push()
        p.translate(m.position)
        p.fill(p.tag(m.id))
        drawShape(m)
        p.pop()
      })
    })

    // ── Lighting ──────────────────────────────────────────────────────────
    p.ambientLight(0.22)
    p.directionalLight(1.0, 0.90, 0.72,  0.4,  0.55, -1.0)  // warm key
    p.directionalLight(0.12, 0.28, 0.70, -0.5, -0.35,  0.6)  // cool fill
    p.pointLight(0.55, 0.55, 1.0,  0, 200, 80)                // blue rim

    // ── Shading pass ──────────────────────────────────────────────────────
    models.forEach(m => {
      const hit = hitId === m.id
      p.push()
      p.translate(m.position)
      p.noStroke()
      if (hit) {
        p.emissiveMaterial(1, 1, 1)
      } else {
        p.specularMaterial(...m.color)
        p.shininess(90)
      }
      drawShape(m)
      p.pop()
    })
  }

  function drawShape(m) {
    const s = m.size
    if      (m.type === 'box')      p.box(s * 1.5)
    else if (m.type === 'sphere')   p.sphere(s, 9, 6)
    else if (m.type === 'torus')    p.torus(s, s * 0.30)
    else if (m.type === 'cone')     p.cone(s, s * 1.9, 8)
    else if (m.type === 'cylinder') p.cylinder(s * 0.65, s * 1.7, 8)
  }
}

onMounted(() => { p5Instance = new p5(sketch, container.value) })
onUnmounted(() => { p5Instance?.remove() })
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div ref="container" class="rounded-xl shadow-2xl border border-white/10 overflow-hidden" />
    <p class="text-xs opacity-40 italic tracking-wide">
      Hover objects — GPU color-ID picking · single mousePick pass resolves all 22 objects
    </p>
  </div>
</template>
