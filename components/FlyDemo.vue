<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const container = ref(null)
let inst = null

// ── one-pass: chromatic split + radial speed-lines + vignette ─────────────
const FX = `#version 300 es
precision mediump float;
uniform sampler2D tex0;
in  vec2 vTexCoord;
out vec4 outColor;
void main() {
  vec2  uv  = vTexCoord;
  vec2  d   = uv - 0.5;
  float r   = length(d);
  // chromatic aberration
  float col_r = texture(tex0, uv + d * 0.018).r;
  float col_g = texture(tex0, uv).g;
  float col_b = texture(tex0, uv - d * 0.013).b;
  // radial speed-lines
  float ang     = atan(d.y, d.x);
  float streaks = pow(max(0.0, sin(ang * 14.0 + 0.5)), 10.0) * r * 0.55;
  // vignette
  float vig = 1.0 - smoothstep(0.28, 0.88, r * 1.5);
  outColor = vec4(
    (col_r - streaks * 0.7) * vig,
    (col_g - streaks * 0.5) * vig,
    (col_b - streaks * 0.3) * vig,
    1.0);
}`

const sketch = p => {
  const W = 600, H = 340
  const RING_R    = 65
  const RING_TUBE = 7
  const PASS_DIST = RING_R * 0.85
  const BANK      = 44   // max world-unit offset per axis

  // ── path waypoints (5 unique, first duplicated in track for smooth loop) ──
  const PATH = [
    [   0,    0,  700],
    [ 240,  -90,  300],
    [  40,  110,  -50],
    [-210,  -70, -400],
    [ 100,   60, -680],
  ]

  // ── helpers ───────────────────────────────────────────────────────────────
  const lerp3 = (a, b, t) => [
    a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t
  ]
  const norm3 = v => {
    const l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]) || 1
    return [v[0]/l, v[1]/l, v[2]/l]
  }
  const cross3 = (a, b) => [
    a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]
  ]
  const dot3 = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2]

  let cam, track, layer, fx
  let rings = []
  let score = 0
  let mx = 0, my = 0   // smoothed mouse bank [-1..1]

  // ── setup ─────────────────────────────────────────────────────────────────
  p.setup = () => {
    p.createCanvas(W, H, p.WEBGL)
    cam   = p.createCamera()
    layer = p.createFramebuffer()
    fx    = p.createFilterShader(FX)

    // CameraTrack: each keyframe looks toward the next waypoint
    track = p.createCameraTrack(cam)
    for (let i = 0; i < PATH.length; i++) {
      track.add({
        eye:    PATH[i],
        center: PATH[(i + 1) % PATH.length],
      })
    }
    // duplicate first keyframe — closes Catmull-Rom loop without blink
    track.add({ eye: PATH[0], center: PATH[1] })
    track.play({ loop: true, duration: 130 })

    // rings: 2 per segment, placed at t=0.35 and t=0.7 along each leg
    for (let seg = 0; seg < PATH.length; seg++) {
      const a = PATH[seg]
      const b = PATH[(seg + 1) % PATH.length]
      const tang = norm3([b[0]-a[0], b[1]-a[1], b[2]-a[2]])
      for (const t of [0.35, 0.7]) {
        rings.push({ pos: lerp3(a, b, t), tang, passed: false, glow: 0 })
      }
    }
  }

  // ── draw ──────────────────────────────────────────────────────────────────
  p.draw = () => {
    // smooth mouse bank
    mx = p.lerp(mx, (p.mouseX / W) * 2 - 1, 0.07)
    my = p.lerp(my, (p.mouseY / H) * 2 - 1, 0.07)

    // predraw already applied CameraTrack → cam now holds path position
    // compute banking offset in camera-local right + up
    const ex = cam.eyeX,    ey = cam.eyeY,    ez = cam.eyeZ
    const cx = cam.centerX, cy = cam.centerY, cz = cam.centerZ
    const fwd   = norm3([cx-ex, cy-ey, cz-ez])
    const right = norm3(cross3(fwd, [0, 1, 0]))
    const up    = norm3(cross3(right, fwd))
    const bx = right[0]*mx*BANK + up[0]*my*BANK
    const by = right[1]*mx*BANK + up[1]*my*BANK
    const bz = right[2]*mx*BANK + up[2]*my*BANK
    cam.camera(ex+bx, ey+by, ez+bz, cx+bx, cy+by, cz+bz, up[0], up[1], up[2])
    p.setCamera(cam)

    // pass-through detection (distance from banked eye to ring center)
    for (const r of rings) {
      if (!r.passed) {
        const dx = (ex+bx)-r.pos[0], dy = (ey+by)-r.pos[1], dz = (ez+bz)-r.pos[2]
        if (Math.sqrt(dx*dx+dy*dy+dz*dz) < PASS_DIST) {
          r.passed = true; r.glow = 1; score++
        }
      }
      if (r.glow > 0) r.glow = Math.max(0, r.glow - 0.015)
    }

    // ── scene into FBO ───────────────────────────────────────────────────
    layer.begin()
    p.background(3, 4, 18)
    p.noStroke()

    // star field — same seed every frame = stable stars
    p.randomSeed(7)
    p.strokeWeight(1.5)
    for (let i = 0; i < 90; i++) {
      const bri = p.random(90, 220)
      p.stroke(bri, bri, bri + 30)
      p.point(p.random(-2000,2000), p.random(-2000,2000), p.random(-2000,2000))
    }

    // rings
    p.noStroke()
    for (const r of rings) {
      p.push()
      p.translate(r.pos[0], r.pos[1], r.pos[2])
      // rotate torus axis (Y by default) to align with path tangent
      const d = dot3([0,1,0], r.tang)
      if (d > 1 - 1e-5) {
        // already aligned — no rotation
      } else if (d < -1 + 1e-5) {
        p.rotate(Math.PI, [1, 0, 0])
      } else {
        const ax = norm3(cross3([0,1,0], r.tang))
        p.rotate(Math.acos(d), ax)
      }
      const g = r.glow
      p.emissiveMaterial(
        80  + g * 175,   // R: blue → gold
        140 + g *  60,   // G
        220 - g * 180    // B
      )
      p.torus(RING_R, RING_TUBE, 28, 8)
      p.pop()
    }

    layer.end()

    // ── post pass ────────────────────────────────────────────────────────
    p.pipe(layer, [fx])

    // ── HUD ──────────────────────────────────────────────────────────────
    p.beginHUD()
    p.noStroke()
    p.fill(160, 210, 255)
    p.textSize(13)
    p.textAlign(p.RIGHT)
    p.text(`rings  ${score} / ${rings.length}`, W - 10, 26)
    p.textAlign(p.LEFT)
    p.endHUD()
  }
}

onMounted(()  => { inst = new p5(sketch, container.value) })
onUnmounted(() => { inst?.remove() })
</script>

<template>
  <div ref="container" />
</template>
