<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const sketchContainer = ref(null)
let p5Instance = null

const sketch = (p) => {
  let fbo
  let models

  let animate, cull
  let persp, aspect
  let cameraZ, fieldOfView
  let nearPlane, farPlane
  let leftPlane, rightPlane, bottomPlane, topPlane

  let e, pm

  const position = [-350, -279, 181]
  const center = [12.9, 6.4, 48.3]
  const up = [-0.53, 0.78, 0.23]

  const update = () => {
    p.camera(0, 0, cameraZ.value(), 0, 0, cameraZ.value() > 0 ? -300 : 300, 0, 1, 0)

    e = p.eMatrix()

    if (persp.checked()) {
      if (aspect.checked()) {
        const near = nearPlane.value()
        const top = near * Math.tan(fieldOfView.value() / 2)
        const bottom = -top
        const right = top * (p.width / p.height)
        const left = -right
        p.frustum(left, right, top, bottom, near, farPlane.value())
      } else {
        p.frustum(
          leftPlane.value(),
          rightPlane.value(),
          topPlane.value(),
          bottomPlane.value(),
          nearPlane.value(),
          farPlane.value()
        )
      }

      aspect.checked() ? fieldOfView.show() : fieldOfView.hide()
      aspect.checked() ? leftPlane.hide() : leftPlane.show()
      aspect.checked() ? rightPlane.hide() : rightPlane.show()
      aspect.checked() ? topPlane.hide() : topPlane.show()
      aspect.checked() ? bottomPlane.hide() : bottomPlane.show()
    } else {
      fieldOfView.hide()
      topPlane.show()

      if (aspect.checked()) {
        rightPlane.value(topPlane.value() * (p.width / p.height))
        p.ortho(
          -rightPlane.value(),
          rightPlane.value(),
          topPlane.value(),
          -topPlane.value(),
          nearPlane.value(),
          farPlane.value()
        )
      } else {
        p.ortho(
          leftPlane.value(),
          rightPlane.value(),
          topPlane.value(),
          bottomPlane.value(),
          nearPlane.value(),
          farPlane.value()
        )
      }

      aspect.checked() ? rightPlane.hide() : rightPlane.show()
      aspect.checked() ? leftPlane.hide() : leftPlane.show()
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

    // scene
    const range = 100
    models = []

    for (let i = 0; i < 50; i++) {
      const objectModel = {
        type: p.random() < 0.5 ? 'box' : 'sphere',
        visibility: p5.Tree.VISIBLE,
        color: p.color(p.random(), p.random(), p.random()),
        position: p5.Vector.random3D().mult(range),
        velocity: p
          .createVector(p.random() * 2 - 1, p.random() * 2 - 1, p.random() * 2 - 1)
          .mult(0.5),
        rotation: p.createVector(p.random(), p.random(), p.random()).normalize().mult(0.01),
        animate () {
          this.position.add(this.velocity)
          ;['x', 'y', 'z'].forEach((axis) => {
            if (p.abs(this.position[axis]) > range) {
              this.velocity[axis] *= -1
              this.position[axis] = p.constrain(this.position[axis], -range, range)
            }
          })
        }
      }

      if (objectModel.type === 'box') {
        objectModel.width = p.random() * 12 + 8
        objectModel.height = p.random() * 12 + 8
        objectModel.depth = p.random() * 12 + 8
        objectModel.cull = () => {
          objectModel.visibility = p.visibility({
            corner1: p5.Vector.sub(
              objectModel.position,
              p.createVector(objectModel.width / 2, objectModel.height / 2, objectModel.depth / 2)
            ),
            corner2: p5.Vector.add(
              objectModel.position,
              p.createVector(objectModel.width / 2, objectModel.height / 2, objectModel.depth / 2)
            )
          })
        }
      } else {
        objectModel.radius = p.random() * 12 + 8
        objectModel.cull = () => {
          objectModel.visibility = p.visibility({
            center: objectModel.position,
            radius: objectModel.radius
          })
        }
      }

      models.push(objectModel)
    }

    // ui (DOM p5) — IMPORTANT: parent to container
    animate = p.createCheckbox('animate', true)
    animate.parent(sketchContainer.value)
    animate.style('color', 'indigo')
    animate.position(p.width - 200, 10)

    cull = p.createCheckbox('cull', true)
    cull.parent(sketchContainer.value)
    cull.style('color', 'indigo')
    cull.position(p.width - 200, 35)

    persp = p.createCheckbox('perspective', true)
    persp.parent(sketchContainer.value)
    persp.style('color', 'yellow')
    persp.position(p.width - 110, 10)

    aspect = p.createCheckbox('aspect ratio', true)
    aspect.parent(sketchContainer.value)
    aspect.style('color', 'yellow')
    aspect.position(p.width - 110, 35)

    cameraZ = p.createSlider(-150, 200, 115, 1)
    cameraZ.parent(sketchContainer.value)
    cameraZ.style('width', '100px')
    cameraZ.position(p.width - 110, 60)

    fieldOfView = p.createSlider(0.1, 1.4, 0.6, 0.01)
    fieldOfView.parent(sketchContainer.value)
    fieldOfView.style('width', '100px')
    fieldOfView.position(p.width - 110, 85)

    nearPlane = p.createSlider(20, 100, 30, 1)
    nearPlane.parent(sketchContainer.value)
    nearPlane.style('width', '100px')
    nearPlane.position(p.width - 110, 110)

    farPlane = p.createSlider(110, 330, 230, 1)
    farPlane.parent(sketchContainer.value)
    farPlane.style('width', '100px')
    farPlane.position(p.width - 110, 135)

    topPlane = p.createSlider(10, p.height / 3, p.height / 12, 1)
    topPlane.parent(sketchContainer.value)
    topPlane.style('width', '100px')
    topPlane.position(p.width - 110, 160)

    rightPlane = p.createSlider(10, p.width / 3, p.width / 12, 1)
    rightPlane.parent(sketchContainer.value)
    rightPlane.style('width', '100px')
    rightPlane.position(p.width - 110, 185)

    bottomPlane = p.createSlider(-p.height / 3, -10, -p.height / 12, 1)
    bottomPlane.parent(sketchContainer.value)
    bottomPlane.style('width', '100px')
    bottomPlane.position(p.width - 110, 210)

    leftPlane = p.createSlider(-p.width / 3, -10, -p.width / 12, 1)
    leftPlane.parent(sketchContainer.value)
    leftPlane.style('width', '100px')
    leftPlane.position(p.width - 110, 235)

    p.camera(...position, ...center, ...up)
    p.ortho(-p.width / 3, p.width / 3, -p.height / 3, p.height / 3, 1, 10000)
  }

  p.draw = function () {
    (p.mouseX <= p.width - 120 || p.mouseY >= 265) && p.orbitControl()

    // scene1
    p.background('#879319')

    p.push()
    p.rotateX(p.HALF_PI)
    p.strokeWeight(0.5)
    p.stroke('blue')
    p.grid({ subdivisions: 20, size: 300 })
    p.pop()

    models.forEach((model) => {
      p.push()
      p.translate(model.position)

      p.strokeWeight(model.visibility === p5.Tree.INVISIBLE ? 1 : 1.2)
      model.visibility === p5.Tree.VISIBLE
        ? (p.fill(model.color), p.noStroke())
        : (p.noFill(),
          p.strokeWeight(1),
          model.visibility === p5.Tree.SEMIVISIBLE ? p.stroke(model.color) : p.stroke('black'))

      const detail = model.visibility === p5.Tree.VISIBLE ? 20 : 6
      model.type === 'box'
        ? p.box(model.width, model.height, model.depth)
        : p.sphere(model.radius, detail, detail)

      p.pop()
    })

    p.push()
    p.strokeWeight(3)
    p.stroke('magenta')
    p.fill(p.color(1, 0, 1, 0.3))
    p.viewFrustum({
      eMatrix: e ?? p.createMatrix(4),
      pMatrix: pm ?? p.createMatrix(4),
      bits: p5.Tree.NEAR | p5.Tree.FAR,
      viewer: () =>
        p.axes({
          size: 50,
          bits: p5.Tree.X | p5.Tree._Y | p5.Tree._Z
        })
    })
    p.pop()

    // main scene (FBO)
    fbo.begin()
    p.clear()
    p.background(0.7, 0.4, 0.3)

    update()

    models.forEach((model) => {
      animate.checked() && model.animate()
      cull.checked() ? model.cull() : (model.visibility = p5.Tree.VISIBLE)

      if (model.visibility === p5.Tree.VISIBLE || model.visibility === p5.Tree.SEMIVISIBLE) {
        p.push()
        p.translate(model.position)
        p.noStroke()
        p.fill(model.color)
        model.type === 'box'
          ? p.box(model.width, model.height, model.depth)
          : p.sphere(model.radius)
        p.pop()
      }
    })

    fbo.end()

    // HUD preview
    p.beginHUD()
    p.translate(p.width - p.width / 3, p.height)
    p.scale(1, -1)
    p.image(fbo, 0, 0, p.width / 3, p.height / 3)
    p.endHUD()
  }

  p.mouseWheel = () => false
}

onMounted(() => {
  p5Instance = new p5(sketch, sketchContainer.value)
})

onUnmounted(() => {
  p5Instance && p5Instance.remove()
})
</script>

<template>
  <div class="relative inline-block rounded-lg shadow-2xl border border-white/10 overflow-hidden">
    <div ref="sketchContainer"></div>
    <p class="mt-12 text-sm opacity-60 italic">
      Interactive view-frustum manipulation and visibility classification
    </p>
  </div>
</template>
