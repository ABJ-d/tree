<!-- VisibilityDemo.vue -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const sketchContainer = ref(null)
let p5Instance

const sketch = (p) => {
  let fbo, models
  let animate, cull
  let persp, aspect
  let cameraZ, fieldOfView
  let nearPlane, farPlane
  let leftPlane, rightPlane, bottomPlane, topPlane
  let e, pm

  const position = [-350, -279, 181]
  const center   = [12.9, 6.4, 48.3]
  const up       = [-0.53, 0.78, 0.23]
  const _axes    = ['x', 'y', 'z']

  const update = () => {
    p.camera(0, 0, cameraZ.value(), 0, 0, cameraZ.value() > 0 ? -300 : 300, 0, 1, 0)
    e = p.eMatrix()

    if (persp.checked()) {
      if (aspect.checked()) {
        const near  = nearPlane.value()
        const top_  = near * Math.tan(fieldOfView.value() / 2)
        const right_ = top_ * (p.width / p.height)
        p.frustum(-right_, right_, top_, -top_, near, farPlane.value())
      } else {
        p.frustum(
          leftPlane.value(), rightPlane.value(),
          topPlane.value(),  bottomPlane.value(),
          nearPlane.value(), farPlane.value()
        )
      }
      // ── show/hide in sync with checkboxes — use p5 DOM .show()/.hide() ──
      aspect.checked() ? fieldOfView.show() : fieldOfView.hide()
      aspect.checked() ? leftPlane.hide()   : leftPlane.show()
      aspect.checked() ? rightPlane.hide()  : rightPlane.show()
      aspect.checked() ? topPlane.hide()    : topPlane.show()
      aspect.checked() ? bottomPlane.hide() : bottomPlane.show()
    } else {
      fieldOfView.hide()
      topPlane.show()
      if (aspect.checked()) {
        rightPlane.value(topPlane.value() * (p.width / p.height))
        p.ortho(
          -rightPlane.value(), rightPlane.value(),
           topPlane.value(),  -topPlane.value(),
           nearPlane.value(),  farPlane.value()
        )
      } else {
        p.ortho(
          leftPlane.value(),  rightPlane.value(),
          topPlane.value(),   bottomPlane.value(),
          nearPlane.value(),  farPlane.value()
        )
      }
      aspect.checked() ? rightPlane.hide()  : rightPlane.show()
      aspect.checked() ? leftPlane.hide()   : leftPlane.show()
      aspect.checked() ? bottomPlane.hide() : bottomPlane.show()
    }
    pm = p.pMatrix()
  }

  p.setup = function () {
    const canvas = p.createCanvas(580, 360, p.WEBGL)
    canvas.parent(sketchContainer.value)
    p.frameRate(100)
    p.colorMode(p.RGB, 1)
    fbo = p.createFramebuffer({ format: p.FLOAT })

    // ── scene models ────────────────────────────────────────────────────
    const range = 100
    models = []
    for (let i = 0; i < 50; i++) {
      const m = {
        type:       p.random() < 0.5 ? 'box' : 'sphere',
        visibility: p5.Tree.VISIBLE,
        color:      p.color(p.random(), p.random(), p.random()),
        position:   p5.Vector.random3D().mult(range),
        velocity:   p.createVector(
                      p.random() * 2 - 1,
                      p.random() * 2 - 1,
                      p.random() * 2 - 1).mult(0.5),
      }

      // animate — no per-frame allocations
      m.animate = function () {
        this.position.add(this.velocity)
        for (let a = 0; a < 3; a++) {
          const ax = _axes[a]
          if (p.abs(this.position[ax]) > range) {
            this.velocity[ax] *= -1
            this.position[ax]  = p.constrain(this.position[ax], -range, range)
          }
        }
      }

      if (m.type === 'box') {
        m.w = p.random() * 12 + 8
        m.h = p.random() * 12 + 8
        m.d = p.random() * 12 + 8
        // 🗄️ corners pre-allocated once — mutated in place every cull()
        m._c1 = p.createVector()
        m._c2 = p.createVector()
        m.cull = function () {
          const hw = this.w / 2, hh = this.h / 2, hd = this.d / 2
          this._c1.set(this.position.x - hw, this.position.y - hh, this.position.z - hd)
          this._c2.set(this.position.x + hw, this.position.y + hh, this.position.z + hd)
          this.visibility = p.visibility({ corner1: this._c1, corner2: this._c2 })
        }
      } else {
        m.radius = p.random() * 12 + 8
        m.cull = function () {
          this.visibility = p.visibility({ center: this.position, radius: this.radius })
        }
      }
      models.push(m)
    }

    // ── DOM controls — parented to container, rows spaced 25px apart ───
    const par = sketchContainer.value
    const mkCheck = (label, val, x, y, col) => {
      const c = p.createCheckbox(label, val)
      c.parent(par); c.style('color', col); c.position(x, y)
      return c
    }
    const mkSlider = (lo, hi, val, step, x, y) => {
      const s = p.createSlider(lo, hi, val, step)
      s.parent(par); s.style('width', '100px'); s.position(x, y)
      return s
    }

    // left column: animate / cull  — right column: projection controls
    // keep right column high enough so last slider clears the HUD inset
    // (HUD inset is width/3 × height/3 = 193×120 at bottom-right)
    const lx = p.width - 200
    const rx = p.width - 110
    const ry = 10        // start y for right column
    const rs = 25        // row stride

    animate     = mkCheck('animate',      true,  lx, 10,  'indigo')
    cull        = mkCheck('cull',         true,  lx, 35,  'indigo')
    persp       = mkCheck('perspective',  true,  rx, ry + rs * 0, 'yellow')
    aspect      = mkCheck('aspect ratio', true,  rx, ry + rs * 1, 'yellow')
    cameraZ     = mkSlider(-150, 200,  115,    1,    rx, ry + rs * 2)
    fieldOfView = mkSlider(0.1,  1.4,  0.6,   0.01, rx, ry + rs * 3)
    nearPlane   = mkSlider(20,   100,  30,    1,    rx, ry + rs * 4)
    farPlane    = mkSlider(110,  330,  230,   1,    rx, ry + rs * 5)
    topPlane    = mkSlider(10,   p.height / 3,  p.height / 12,  1, rx, ry + rs * 6)
    rightPlane  = mkSlider(10,   p.width / 3,   p.width / 12,   1, rx, ry + rs * 7)
    bottomPlane = mkSlider(-p.height / 3, -10, -p.height / 12,  1, rx, ry + rs * 8)
    leftPlane   = mkSlider(-p.width / 3,  -10, -p.width / 12,   1, rx, ry + rs * 9)
    // ry + rs*9 = 10 + 225 = 235 — well above the HUD inset which starts at height-120=240

    p.camera(...position, ...center, ...up)
    p.ortho(-p.width / 3, p.width / 3, -p.height / 3, p.height / 3, 1, 10000)
  }

  p.draw = function () {
    ;(p.mouseX <= p.width - 120 || p.mouseY >= 265) && p.orbitControl()

    // ── overview scene ─────────────────────────────────────────────────
    p.background('#879319')
    p.push()
    p.rotateX(p.HALF_PI); p.strokeWeight(0.5); p.stroke('blue')
    p.grid({ subdivisions: 20, size: 300 })
    p.pop()

    models.forEach(m => {
      p.push(); p.translate(m.position)
      if (m.visibility === p5.Tree.VISIBLE) {
        p.fill(m.color); p.noStroke()
      } else if (m.visibility === p5.Tree.SEMIVISIBLE) {
        p.noFill(); p.stroke(m.color); p.strokeWeight(1)
      } else {
        p.noFill(); p.stroke('black'); p.strokeWeight(1)
      }
      const det = m.visibility === p5.Tree.VISIBLE ? 20 : 6
      m.type === 'box'
        ? p.box(m.w, m.h, m.d)
        : p.sphere(m.radius, det, det)
      p.pop()
    })

    p.push()
    p.strokeWeight(3); p.stroke('magenta'); p.fill(p.color(1, 0, 1, 0.3))
    p.viewFrustum({
      eMatrix: e  ?? p.createMatrix(4),
      pMatrix: pm ?? p.createMatrix(4),
      bits: p5.Tree.NEAR | p5.Tree.FAR,
      viewer: () => p.axes({ size: 50, bits: p5.Tree.X | p5.Tree._Y | p5.Tree._Z })
    })
    p.pop()

    // ── FBO scene ──────────────────────────────────────────────────────
    fbo.begin()
    p.clear(); p.background(0.7, 0.4, 0.3)
    update()
    models.forEach(m => {
      animate.checked() && m.animate()
      cull.checked() ? m.cull() : (m.visibility = p5.Tree.VISIBLE)
      if (m.visibility !== p5.Tree.INVISIBLE) {
        p.push(); p.translate(m.position)
        p.noStroke(); p.fill(m.color)
        m.type === 'box' ? p.box(m.w, m.h, m.d) : p.sphere(m.radius)
        p.pop()
      }
    })
    fbo.end()

    // ── HUD inset (bottom-right) ────────────────────────────────────────
    p.beginHUD()
    p.translate(p.width - p.width / 3, p.height)
    p.scale(1, -1)
    p.image(fbo, 0, 0, p.width / 3, p.height / 3)
    p.endHUD()
  }

  p.mouseWheel = () => false
}

onMounted(() => { p5Instance = new p5(sketch, sketchContainer.value) })
onUnmounted(() => { p5Instance?.remove() })
</script>

<template>
  <div class="relative inline-block rounded-lg shadow-2xl border border-white/10 overflow-hidden">
    <div ref="sketchContainer" />
    <p class="mt-2 text-xs opacity-50 italic text-center">
      View-frustum culling · VISIBLE · SEMIVISIBLE · INVISIBLE
    </p>
  </div>
</template>
