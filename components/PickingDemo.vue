<!-- PickingDemo.vue -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const container = ref(null)
let p5Instance

const sketch = (p) => {
  let models

  p.setup = function () {
    p.createCanvas(600, 340, p.WEBGL)
    p.colorMode(p.RGB, 1)
    p.frameRate(1000)
    document.oncontextmenu = () => false

    const types = ['box', 'sphere', 'torus']
    models = Array.from({ length: 24 }, () => ({
      position: p5.Vector.random3D().mult(130),
      size:     p.random() * 22 + 8,
      color:    p.color(p.random(0.3, 1), p.random(0.3, 1), p.random(0.3, 1)),
      type:     types[Math.floor(p.random(3))],
    }))
  }

  p.draw = function () {
    p.background(0.08)
    p.orbitControl()
    p.axes({ size: 120 })
    p.push(); p.stroke(0.25); p.grid({ size: 360, subdivisions: 12 }); p.pop()

    p.ambientLight(0.35)
    p.directionalLight(1, 0.95, 0.8,  0.3,  0.5, -1)
    p.directionalLight(0.2, 0.4, 0.8, -0.5, -0.3, 0.5)

    // 🗄️ cache pvMatrix once — reused for every object this frame
    const pv = p.pvMatrix()

    models.forEach(m => {
      p.push()
      p.translate(m.position)

      // picking size scales with object — fits the rendered shape in screen space
      const params = { pvMatrix: pv, size: m.size * 2.5 }
      const hit    = p.mousePicking(params)

      p.noStroke()
      if (hit) {
        p.emissiveMaterial(1, 1, 1)
      } else {
        p.specularMaterial(m.color)
        p.shininess(60)
      }

      if      (m.type === 'box')    p.box(m.size * 1.6)
      else if (m.type === 'torus')  p.torus(m.size, m.size * 0.35)
      else                          p.sphere(m.size, 6, 4)

      // overlay: bullsEye circle tracks each object in screen space
      p.strokeWeight(hit ? 2.5 : 1)
      p.stroke(hit ? p.color(1, 0.9, 0) : p.color(0.3, 0.6, 1))
      p.bullsEye(params)

      p.pop()
    })
  }
}

onMounted(() => { p5Instance = new p5(sketch, container.value) })
onUnmounted(() => { p5Instance?.remove() })
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div ref="container" class="rounded-xl shadow-2xl border border-white/10 overflow-hidden" />
    <p class="text-xs opacity-40 italic tracking-wide">
      Hover objects — screen-space proximity picking · pvMatrix cached per frame
    </p>
  </div>
</template>
