<!-- PoseTrackDemo.vue -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const container = ref(null)
let p5Instance
let trackUIRef = null  // hold ref so we can dispose the DOM panel

const sketch = (p) => {
  let track
  let bg = [18, 20, 30]

  p.setup = function () {
    p.createCanvas(600, 340, p.WEBGL)
    track = p.createPoseTrack()
    track.add({ pos: [0,    0,   0],  scl: [1, 1, 1] })
    track.add({ pos: [160, -60,  80], rot: { axis: [1, 0, 0], angle: p.PI }, scl: [1, 2.5, 1] })
    track.add({ pos: [-140, 80, -60], rot: { axis: [0, 0, 1], angle: p.PI }, scl: [2.5, 1, 1] })
    track.add({ pos: [0,    0,   0],  scl: [1, 1, 1] }) // 🔁 loop back

    // createTrackUI mounts inside the canvas parent and auto-ticks via player
    trackUIRef = p.createTrackUI(track, { rate: 0.4, info: true, color: 'white' })

    // 🎨 flash a new palette on every cycle end
    track.onEnd = () => { bg = [p.random(255), p.random(255), p.random(255)] }
  }

  p.draw = function () {
    p.background(...bg)
    p.orbitControl()
    p.axes({ size: 180 })
    p.push(); p.stroke(60, 75, 95, 120); p.grid({ size: 440 }); p.pop()

    const t = p.frameCount * 0.013
    p.pointLight(255, 190, 90,  220 * Math.cos(t), -100, 220 * Math.sin(t))
    p.directionalLight(120, 170, 240, -0.4, 0.6, -1)
    p.ambientLight(45)

    // 🎯 animated object — pose driven by track
    p.push()
    p.applyPose(track.eval())
    p.axes({ size: 60,
      bits: p5.Tree.X | p5.Tree._X | p5.Tree.Y | p5.Tree._Y | p5.Tree.Z | p5.Tree._Z })
    p.specularMaterial(230, 190, 70); p.shininess(80)
    p.cylinder(30, 80)
    p.pop()

    // 🌐 static reference objects
    p.push()
    p.translate(200, 20, 0)
    p.specularMaterial(60, 200, 210); p.shininess(50)
    p.sphere(38, 5, 3)
    p.pop()

    p.push()
    p.translate(-190, -10, -80)
    p.specularMaterial(170, 90, 230); p.shininess(50)
    p.torus(45, 14)
    p.pop()
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
      PoseTrack — TRS keyframes · Catmull-Rom spline · background flashes on cycle end
    </p>
  </div>
</template>
