<!-- ShapeCollector.vue — p5.tree v0.0.22 demo game -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const container = ref(null)
let p5Instance

const sketch = (p) => {
  const TOTAL    = 16
  const DEATH_MS = 450

  const palette = [
    [0.95, 0.32, 0.22],  // coral
    [0.25, 0.62, 0.95],  // sky
    [0.30, 0.88, 0.58],  // mint
    [0.95, 0.72, 0.18],  // amber
    [0.68, 0.32, 0.95],  // violet
    [0.95, 0.52, 0.22],  // orange
  ]
  const types = ['box', 'sphere', 'torus', 'cone', 'cylinder']
  
  let font

  // ── State ────────────────────────────────────────────────────────────────
  let state    = 'INTRO'   // INTRO | PLAYING | DONE
  let shapes, camTrack
  let hitId    = 0
  let score    = 0
  let startMs  = 0
  let elapsed  = 0
  let finalSec = 0

  // ── Helpers ──────────────────────────────────────────────────────────────

  function makeShape(i) {
    const track = p.createPoseTrack()
    for (let j = 0, n = Math.floor(p.random(2, 5)); j < n; j++) {
      track.add({
        pos: [p.random(-155, 155), p.random(-120, 120), p.random(-155, 155)],
        rot: [0, 0, 0, 1],
        scl: [1, 1, 1],
      })
    }
    track.play({ loop: true, duration: p.random(4, 10) })
    return {
      id:      i + 1,
      type:    types[i % types.length],
      color:   palette[i % palette.length],
      size:    p.random(13, 24),
      track,
      // 🗄️ pose buffer reused every frame — zero alloc in draw loop
      pose:    { pos: [0, 0, 0], rot: [0, 0, 0, 1], scl: [1, 1, 1] },
      dying:   false,
      deathMs: 0,
      gone:    false,
    }
  }

  function drawShape(s) {
    const z = s.size
    if      (s.type === 'box')      p.box(z * 1.5)
    else if (s.type === 'sphere')   p.sphere(z, 9, 6)
    else if (s.type === 'torus')    p.torus(z, z * 0.30)
    else if (s.type === 'cone')     p.cone(z, z * 1.9, 8)
    else                            p.cylinder(z * 0.65, z * 1.7, 8)
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  p.setup = async function () {
    p.createCanvas(600, 380, p.WEBGL)
    font = await p.loadFont('/fonts/noto_sans.ttf')
    p.textFont(font)
    p.colorMode(p.RGB, 1)
    p.frameRate(60)
    document.oncontextmenu = () => false
    init()
  }

  function init() {
    shapes = Array.from({ length: TOTAL }, (_, i) => makeShape(i))

    // CameraTrack — 4-keyframe intro flyby, one-shot
    const cam = p.createCamera()
    camTrack  = p.createCameraTrack(cam)
    camTrack.add({ eye: [  0, -480,  650] })
    camTrack.add({ eye: [320, -260,  420] })
    camTrack.add({ eye: [-200, -170, 380] })
    camTrack.add({ eye: [  0, -140,  340] })
    camTrack.play({ loop: false, duration: 5 })
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  p.mousePressed = function () {
    if (state === 'DONE') {
      shapes.forEach(s => s.track.stop())
      shapes   = Array.from({ length: TOTAL }, (_, i) => makeShape(i))
      score    = 0
      elapsed  = 0
      state    = 'PLAYING'
      startMs  = p.millis()
      return
    }
    if (state !== 'PLAYING' || hitId === 0) return
    const s = shapes.find(s => s.id === hitId && !s.dying && !s.gone)
    if (!s) return
    s.dying   = true
    s.deathMs = p.millis()
    score++
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  p.draw = function () {
    const now = p.millis()
    p.background(0.07)

    // INTRO → PLAYING (CameraTrack finished)
    if (state === 'INTRO' && !camTrack.playing) {
      state   = 'PLAYING'
      startMs = now
    }

    if (state !== 'INTRO') p.orbitControl()

    // ── Update: death arcs + PoseTrack evals ─────────────────────────────
    shapes.forEach(s => {
      if (s.gone) return
      if (s.dying) {
        const t   = Math.min(1, (now - s.deathMs) / DEATH_MS)
        // scale arc: pop 1 → 1.4, then collapse → 0
        const scl = t < 0.35
          ? 1 + (t / 0.35) * 0.4
          : (1 - (t - 0.35) / 0.65) * 1.4
        const v = Math.max(0, scl)
        s.pose.scl[0] = s.pose.scl[1] = s.pose.scl[2] = v
        if (t >= 1) s.gone = true
      } else {
        // PoseTrack fills pose buffer in-place — no alloc
        s.track.eval(s.pose)
      }
    })

    const visible = shapes.filter(s => !s.gone)
    const active  = visible.filter(s => !s.dying)

    // PLAYING → DONE
    if (state === 'PLAYING') {
      elapsed = (now - startMs) / 1000
      if (shapes.every(s => s.gone)) {
        state    = 'DONE'
        finalSec = elapsed
      }
    }

    // ── Lighting ─────────────────────────────────────────────────────────
    p.ambientLight(0.20)
    p.directionalLight(1.0, 0.88, 0.70,  0.4,  0.55, -1.0)   // warm key
    p.directionalLight(0.10, 0.25, 0.65, -0.5, -0.35,  0.6)  // cool fill
    p.pointLight(0.50, 0.50, 0.90,  0, 200, 80)                // blue rim

    // ── Gizmos ───────────────────────────────────────────────────────────
    p.push(); p.stroke(0.15); p.grid({ size: 360, subdivisions: 12 }); p.pop()
    if (state !== 'INTRO') p.axes({ size: 110 })

    // ── GPU pick pass — one call resolves all active shapes ───────────────
    hitId = 0
    if (state === 'PLAYING') {
      hitId = p.mousePick(() => {
        active.forEach(s => {
          p.push()
          p.applyPose(s.pose)
          p.fill(p.tag(s.id))
          drawShape(s)
          p.pop()
        })
      })
    }

    // ── Shading pass ─────────────────────────────────────────────────────
    p.noStroke()
    visible.forEach(s => {
      p.push()
      p.applyPose(s.pose)
      if (s.dying) {
        p.emissiveMaterial(...s.color)        // flash own color on collect
      } else if (hitId === s.id) {
        p.emissiveMaterial(1, 1, 1)           // white hover highlight
      } else {
        p.specularMaterial(...s.color)
        p.shininess(90)
      }
      drawShape(s)
      p.pop()
    })

    // ── HUD ───────────────────────────────────────────────────────────────
    p.beginHUD()
    p.noStroke()

    if (state === 'INTRO') {
      p.textSize(12)
      p.textAlign(p.CENTER, p.BOTTOM)
      p.fill(1, 1, 1, 0.40)
      p.text('CameraTrack intro flyby…', p.width / 2, p.height - 14)
    }

    if (state === 'PLAYING' || state === 'DONE') {
      p.textSize(18)
      p.textAlign(p.LEFT, p.TOP)
      p.fill(0.95, 0.75, 0.20)
      p.text(`collected  ${score} / ${TOTAL}`, 18, 16)

      p.textAlign(p.RIGHT, p.TOP)
      p.fill(0.55, 0.82, 1.0)
      p.text(fmtTime(state === 'DONE' ? finalSec : elapsed), p.width - 18, 16)
    }

    if (state === 'PLAYING') {
      p.textSize(12)
      p.textAlign(p.CENTER, p.BOTTOM)
      p.fill(1, 1, 1, 0.32)
      p.text('hover to highlight · click to collect · drag to orbit', p.width / 2, p.height - 14)
    }

    if (state === 'DONE') {
      p.textSize(30)
      p.textAlign(p.CENTER, p.CENTER)
      p.fill(0.30, 0.88, 0.58)
      p.text('all collected!', p.width / 2, p.height / 2 - 22)
      p.textSize(15)
      p.fill(1, 1, 1, 0.65)
      p.text(`time  ${fmtTime(finalSec)}`, p.width / 2, p.height / 2 + 14)
      p.textSize(12)
      p.fill(1, 1, 1, 0.35)
      p.text('click to play again', p.width / 2, p.height / 2 + 40)
    }

    p.endHUD()
  }
}

onMounted(() => { p5Instance = new p5(sketch, container.value) })
onUnmounted(() => { p5Instance?.remove() })
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div ref="container" class="rounded-xl shadow-2xl border border-white/10 overflow-hidden" />
    <p class="text-xs opacity-40 italic tracking-wide">
      Shape Collector · CameraTrack intro · PoseTrack drift loops · GPU mousePick · HUD
    </p>
  </div>
</template>
