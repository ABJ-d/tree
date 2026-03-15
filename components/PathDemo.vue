<!-- PathDemo.vue -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const container = ref(null)
let p5Instance
let trackUIRef = null

const sketch = (p) => {
  let track

  p.setup = function () {
    p.createCanvas(600, 340, p.WEBGL)

    // init camera at path origin so orbit feels natural before playback
    p.camera(0, 0, 800, 0, 0, 0, 0, 1, 0)

    track = p.createTrack(p.getCamera())
    track.add({ eye: [   0,   0,  800], center: [0, 0, 0] }) // wide front
    track.add({ eye: [ 400, -120,  200], center: [0, 0, 0] }) // right-front low
    track.add({ eye: [   0, -300, -150], center: [0, 0, 0] }) // overhead-rear
    track.add({ eye: [-380,  100,  180], center: [0, 0, 0] }) // left-back high
    track.add({ eye: [   0,   0,  800], center: [0, 0, 0] }) // loop back

    // createPanel detects track.add → shows + button; auto-ticks via registered player
    trackUIRef = p.createPanel(track, { info: true, color: 'white' })
  }

  p.draw = function () {
    p.background(18, 20, 30)
    p.orbitControl()
    p.axes({ size: 220 })
    p.push()
    p.stroke(60, 75, 95, 140)
    p.grid({ size: 500 })
    p.pop()

    const t = p.frameCount * 0.012
    p.pointLight(255, 190, 90,  240 * Math.cos(t), -120, 240 * Math.sin(t))
    p.directionalLight(100, 160, 230, -0.4, 0.6, -1)
    p.ambientLight(40)

    // Centre — faceted gem sphere, gold
    p.push()
    p.rotateY(p.frameCount * 0.011)
    p.rotateX(p.frameCount * 0.007)
    p.specularMaterial(230, 190, 70)
    p.shininess(80)
    p.sphere(75, 5, 3)
    p.pop()

    // Right — torus, cyan
    p.push()
    p.translate(220, 10, 0)
    p.rotateX(p.frameCount * 0.014)
    p.specularMaterial(60, 200, 210)
    p.shininess(60)
    p.torus(62, 18)
    p.pop()

    // Left — cone, violet
    p.push()
    p.translate(-220, 20, 0)
    p.rotateY(-p.frameCount * 0.009)
    p.specularMaterial(170, 90, 230)
    p.shininess(50)
    p.cone(55, 110)
    p.pop()
  }

  p.keyPressed = function () {
    if (p.key === 'p') track.play({ loop: true })
    if (p.key === 'r') track.reset()
  }
}

onMounted(() => {
  p5Instance = new p5(sketch, container.value)
})

onUnmounted(() => {
  // dispose() removes the DOM panel — p5.remove() only clears players and pipe
  trackUIRef?.dispose()
  trackUIRef = null
  p5Instance?.remove()
})
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div ref="container" class="relative rounded-xl shadow-2xl border border-white/10 overflow-hidden" />
    <p class="text-xs opacity-50 italic tracking-wide">
      Orbit · 
      <kbd class="px-1 py-0.5 rounded bg-white/10 font-mono">p</kbd> play flythrough · 
      <kbd class="px-1 py-0.5 rounded bg-white/10 font-mono">r</kbd> reset
    </p>
  </div>
</template>
