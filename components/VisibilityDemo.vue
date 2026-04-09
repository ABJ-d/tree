<!-- VisibilityDemo.vue -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const container = ref(null)
let p5Instance

const INIT_POS    = [-350, -279,  181]
const INIT_CENTER = [ 12.9,  6.4, 48.3]
const INIT_UP     = [ -0.53, 0.78, 0.23]

const sketch = (p) => {
  // ── Per-frame matrix + bounds cache ──────────────────────────────────────
  //
  // _eBuf — Float32Array(16) filled by mat4Eye(_eBuf) = inv(V), inside fbo scope.
  //   Passed to bounds({ mat4Eye: _eBuf }) and viewFrustum({ mat4Eye: _eBuf }).
  //
  // _pBuf — Float32Array(16) filled by mat4Proj(_pBuf) = P, inside fbo scope.
  //   Passed to viewFrustum({ mat4Proj: _pBuf }).
  //
  // _b    — 6 world-space frustum planes from bounds({ mat4Eye: _eBuf }).
  //   Forwarded to all visibility() calls, avoiding 50 frustumPlanes()
  //   recomputations per frame (each involves trig).

  const _eBuf = new Float32Array(16)
  const _pBuf = new Float32Array(16)
  let _b

  let fbo, models
  let cAnimate, cCull, cPersp, cAspect
  let sZ, sFov, sNear, sFar, sTop, sRight, sBottom, sLeft

  // ── update() — sets fbo projection/camera, captures matrix + bounds cache ─
  //
  // Must run inside fbo.begin()…fbo.end() so that mat4Eye() and bounds()
  // operate on the fbo renderer's state.
  //
  // Order is strict:
  //   1. camera()       — writes V
  //   2. frustum/ortho()— writes P
  //   3. mat4Eye(_eBuf) — reads inv(V) into _eBuf  (out-first, zero-alloc)
  //   4. mat4Proj(_pBuf) — reads P into _pBuf        (out-first, zero-alloc)
  //   5. bounds()       — extracts camera basis from _eBuf + projection params,
  //                       calls frustumPlanes() once → _b
  //      Stored and forwarded to all visibility() calls, avoiding 50 redundant
  //      frustumPlanes() recomputations per frame.

  function update() {
    const persp  = cPersp.checked()
    const aspect = cAspect.checked()
    const cz = sZ.value()
    const n  = sNear.value()
    const f  = sFar.value()

    // Step 1
    p.camera(0, 0, cz,   0, 0, cz > 0 ? -300 : 300,   0, 1, 0)

    // Step 2
    if (persp) {
      if (aspect) {
        const t = n * Math.tan(sFov.value() / 2)
        p.frustum(-t*(p.width/p.height), t*(p.width/p.height), -t, t, n, f)  // bottom=-t, top=t
      } else {
        p.frustum(sLeft.value(), sRight.value(), sBottom.value(), sTop.value(), n, f)
      }
    } else {
      if (aspect) {
        const r = sTop.value() * (p.width / p.height)
        sRight.value(r)
        p.ortho(-r, r, -sTop.value(), sTop.value(), n, f)
      } else {
        p.ortho(sLeft.value(), sRight.value(), sBottom.value(), sTop.value(), n, f)
      }
    }

    // Steps 3–5: out-first, no heap allocation.
    p.mat4Eye(_eBuf)
    p.mat4Proj(_pBuf)

    // Compute 6 world-space frustum planes once per frame.
    // bounds() extracts camera basis from _eBuf and projection params,
    // then calls frustumPlanes() (trig) once → keyed plane object _b.
    // _b is forwarded to every visibility() call to skip re-derivation.
    _b = p.bounds({ mat4Eye: _eBuf })
  }

  p.setup = function () {
    p.createCanvas(600, 400, p.WEBGL)
    p.frameRate(100)
    p.colorMode(p.RGB, 1)

    fbo = p.createFramebuffer({ format: p.FLOAT })

    // ── Models ──────────────────────────────────────────────────────────────

    const range = 100
    models = []
    for (let i = 0; i < 50; i++) {
      const type = p.random() < 0.5 ? 'box' : 'sphere'
      const m = {
        type,
        visibility: p5.Tree.VISIBLE,
        color:    p.color(p.random(), p.random(), p.random()),
        position: p5.Vector.random3D().mult(range),
        velocity: p.createVector(p.random()*2-1, p.random()*2-1, p.random()*2-1).mult(0.5),
      }
      if (type === 'box') { m.w = p.random()*12+8; m.h = p.random()*12+8; m.d = p.random()*12+8 }
      else                { m.radius = p.random()*12+8 }
      models.push(m)
    }

    // ── UI — two columns, right-side ─────────────────────────────────────────

    const col1 = p.width - 200, col2 = p.width - 110

    // Column 1: scene toggles
    cAnimate = p.createCheckbox('animate', true)
    cAnimate.style('color', 'indigo'); cAnimate.position(col1, 10)
    cCull = p.createCheckbox('cull', true)
    cCull.style('color', 'indigo'); cCull.position(col1, 35)

    // Column 2: projection controls
    cPersp = p.createCheckbox('perspective', true)
    cPersp.style('color', 'yellow'); cPersp.position(col2, 10)
    cAspect = p.createCheckbox('aspect ratio', true)
    cAspect.style('color', 'yellow'); cAspect.position(col2, 35)

    const slider = (min, max, val, step, y) => {
      const s = p.createSlider(min, max, val, step)
      s.style('width', '100px'); s.position(col2, y)
      return s
    }

    sZ      = slider(-150,          200,           115,         1,     60)
    sFov    = slider(0.1,           1.4,           0.6,         0.01,  85)
    sNear   = slider(20,            100,           30,          1,    110)
    sFar    = slider(110,           330,           230,         1,    135)
    sTop    = slider(10,            p.height/3,    p.height/12, 1,    160)
    sRight  = slider(10,            p.width/3,     p.width/12,  1,    185)
    sBottom = slider(-p.height/3,  -10,           -p.height/12, 1,    210)
    sLeft   = slider(-p.width/3,   -10,           -p.width/12,  1,    235)

    // Wire projection toggles to show/hide sliders
    const syncSliders = () => {
      const persp  = cPersp.checked()
      const aspect = cAspect.checked()
      persp && aspect ? sFov.show()    : sFov.hide()
      aspect          ? sRight.hide()  : sRight.show()
      aspect          ? sLeft.hide()   : sLeft.show()
      aspect          ? sBottom.hide() : sBottom.show()
      persp && aspect ? sTop.hide()    : sTop.show()
    }
    cPersp.changed(syncSliders); cAspect.changed(syncSliders); syncSliders()

    // ── Fixed overview camera (main canvas) ──────────────────────────────────

    p.camera(...INIT_POS, ...INIT_CENTER, ...INIT_UP)
    p.ortho(-p.width/3, p.width/3, -p.height/3, p.height/3, 1, 10000)
  }

  p.draw = function () {
    ;(p.mouseX <= p.width - 120 || p.mouseY >= 265) && p.orbitControl()

    // ── Scene: overview (main canvas) ─────────────────────────────────────

    p.background('#879319')
    p.push()
    p.rotateX(p.HALF_PI)
    p.strokeWeight(0.5); p.stroke('blue')
    p.grid({ subdivisions: 20, size: 300 })
    p.pop()

    models.forEach(m => {
      p.push()
      p.translate(m.position)
      if (m.visibility === p5.Tree.VISIBLE) {
        p.fill(m.color); p.noStroke()
      } else if (m.visibility === p5.Tree.SEMIVISIBLE) {
        p.noFill(); p.stroke(m.color); p.strokeWeight(1)
      } else {
        p.noFill(); p.stroke('black'); p.strokeWeight(1)
      }
      const detail = m.visibility === p5.Tree.VISIBLE ? 20 : 6
      m.type === 'box' ? p.box(m.w, m.h, m.d) : p.sphere(m.radius, detail, detail)
      p.pop()
    })

    // Draw last frame's fbo frustum in overview.
    // Both buffers are Float32Array — viewFrustum accepts them directly
    // via _rawMat4, using core proj functions internally.
    if (_b) {
      p.push()
      p.strokeWeight(3); p.stroke('magenta'); p.fill(1, 0, 1, 0.3)
      p.viewFrustum({
        mat4Eye: _eBuf, mat4Proj: _pBuf,
        bits:    p5.Tree.NEAR | p5.Tree.FAR,
        viewer:  () => p.axes({ size: 50, bits: p5.Tree.X | p5.Tree._Y | p5.Tree._Z }),
      })
      p.pop()
    }

    // ── FBO: adjustable projection camera ──────────────────────────────────

    fbo.begin()
    p.clear()
    p.background(0.7, 0.4, 0.3)

    // Sets camera + projection, then fills _eBuf, _pBuf, _b.
    update()

    models.forEach(m => {
      if (cAnimate.checked()) {
        m.position.add(m.velocity)
        ;['x', 'y', 'z'].forEach(axis => {
          if (p.abs(m.position[axis]) > 100) {
            m.velocity[axis] *= -1
            m.position[axis] = p.constrain(m.position[axis], -100, 100)
          }
        })
      }

      if (cCull.checked()) {
        // Forward _b — the 6 pre-computed frustum planes — so visibility() skips
        // re-deriving them. Without this, each call recomputes frustumPlanes() internally.
        m.visibility = m.type === 'box'
          ? p.visibility({
              corner1: [m.position.x - m.w/2, m.position.y - m.h/2, m.position.z - m.d/2],
              corner2: [m.position.x + m.w/2, m.position.y + m.h/2, m.position.z + m.d/2],
              bounds: _b,
            })
          : p.visibility({ center: m.position, radius: m.radius, bounds: _b })
      } else {
        m.visibility = p5.Tree.VISIBLE
      }

      if (m.visibility !== p5.Tree.INVISIBLE) {
        p.push()
        p.translate(m.position)
        p.noStroke(); p.fill(m.color)
        m.type === 'box' ? p.box(m.w, m.h, m.d) : p.sphere(m.radius)
        p.pop()
      }
    })

    fbo.end()

    // ── HUD: fbo inset ──────────────────────────────────────────────────────

    p.beginHUD()
    p.translate(p.width - p.width/3, p.height)
    p.scale(1, -1)
    p.image(fbo, 0, 0, p.width/3, p.height/3)
    p.endHUD()
  }

  p.mouseWheel = () => false
}

onMounted(() => {
  p5Instance = new p5(sketch, container.value)
})

onUnmounted(() => {
  // p5.remove() disposes all p5-created DOM (checkboxes, sliders, canvas)
  p5Instance?.remove()
})
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <!--
      relative: raw p5 checkboxes/sliders use position() which sets
      CSS position:absolute — they anchor to the nearest positioned ancestor.
    -->
    <div ref="container" class="relative rounded-xl shadow-2xl border border-white/10 overflow-hidden" />
    <p class="text-xs opacity-50 italic tracking-wide">
      Overview · magenta frustum = fbo camera · orbit freely · toggle culling + projection
    </p>
  </div>
</template>
