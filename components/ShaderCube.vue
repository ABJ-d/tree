<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const sketchContainer = ref(null)
let p5Instance = null

const sketch = (p) => {
  let edge = 80
  let teapot, bunny, texShader
  let teapotTex, bunnyTex
  
  // Define cameras explicitly to manage references manually
  // 'mainCam' is controlled by the user (orbitControl)
  // 'fboCam' is a "slave" camera used inside Framebuffers to bypass v2 beta bugs
  let mainCam, fboCam

  // --- Shader Definitions ---

  let vertSrc = `#version 300 es
    precision highp float;
    in vec4 aPosition;
    uniform mat4 uModelViewProjectionMatrix;
    void main() {
      gl_Position = uModelViewProjectionMatrix * aPosition;
    }`

  let fragSrc = `#version 300 es
    precision highp float;
    uniform sampler2D model;
    uniform vec2 u_resolution;
    out vec4 outColor;
    void main() {
      // Calculate normalized coordinates
      outColor = texture(model, gl_FragCoord.xy / u_resolution);
    }`

  p.setup = async function () {
    const canvas = p.createCanvas(400, 400, p.WEBGL)
    canvas.parent(sketchContainer.value)
    
    // Load 3D assets asynchronously
    teapot = await p.loadModel('teapot.obj', true)
    bunny = await p.loadModel('bunny.obj', true)
    
    // Initialize cameras
    mainCam = p.createCamera()
    fboCam = p.createCamera()

    // Create Framebuffers (FBOs) to hold the textures
    teapotTex = p.createFramebuffer({ format: p.FLOAT })
    bunnyTex = p.createFramebuffer({ format: p.FLOAT })

    // Initialize Shader
    texShader = p.createShader(vertSrc, fragSrc)
    p.shader(texShader)
    // p5.tree dependency
    texShader.setUniform('u_resolution', p.resolution())
    
    console.log("Using p5 version:", p.VERSION)
    // p5.tree dependency
    console.log("Using p5.Tree version:", p5.Tree.VERSION)
  }

  p.draw = function () {
    p.background(20)
    
    // 1. Update Main Camera
    // We only apply orbitControl to the main camera
    p.setCamera(mainCam)
    p.orbitControl()

    // 2. Camera Synchronization (The Fix)
    // Manually link the slave camera's matrices to the main camera.
    // This bypasses p5.js v2 beta bugs regarding p.camera() getters in FBOs.
    fboCam.cameraMatrix = mainCam.cameraMatrix
    fboCam.projMatrix = mainCam.projMatrix

    p.resetShader()

    // 3. Render Pass: Front Face (Bunny) 
    bunnyTex.begin()
    p.clear()
    p.setCamera(fboCam) // Activate the synchronized slave camera
    p.push()
    p.noStroke()
    p.fill('red')
    p.scale(1, -1) // Correction for model coordinate system
    p.scale(0.8)
    p.model(bunny)
    p.pop()
    bunnyTex.end()

    // 4. Render Pass: Right Face (Teapot) 
    teapotTex.begin()
    p.clear()
    p.setCamera(fboCam) // Re-use the synchronized camera
    p.push()
    p.noStroke()
    p.fill('blue')
    p.scale(1, -1)
    p.model(teapot)
    p.pop()
    teapotTex.end()

    // 5. Final Scene Composition
    // Switch back to the main camera to draw the cube faces
    p.setCamera(mainCam)
    
    p.shader(texShader)
    p.push()
    p.stroke('purple')
    p.strokeWeight(2)

    // Apply the Bunny FBO texture to the NEAR face
    texShader.setUniform('model', bunnyTex.color)
    // p5.tree dependency
    cubeFace(p5.Tree.NEAR, edge)

    // Apply the Teapot FBO texture to the RIGHT face
    texShader.setUniform('model', teapotTex.color)
    // p5.tree dependency
    cubeFace(p5.Tree.RIGHT, edge)
    
    p.pop()
  }

  // p5.tree dependency
  function cubeFace(face, edgeSize) {
    p.push()
    p.beginShape()
    const faces = {
      [p5.Tree.NEAR]:   [[-edgeSize, -edgeSize, +edgeSize], [+edgeSize, -edgeSize, +edgeSize], [+edgeSize, +edgeSize, +edgeSize], [-edgeSize, +edgeSize, +edgeSize]],
      [p5.Tree.FAR]:    [[-edgeSize, -edgeSize, -edgeSize], [+edgeSize, -edgeSize, -edgeSize], [+edgeSize, +edgeSize, -edgeSize], [-edgeSize, +edgeSize, -edgeSize]],
      [p5.Tree.LEFT]:   [[-edgeSize, -edgeSize, -edgeSize], [-edgeSize, -edgeSize, +edgeSize], [-edgeSize, +edgeSize, +edgeSize], [-edgeSize, +edgeSize, -edgeSize]],
      [p5.Tree.RIGHT]:  [[+edgeSize, -edgeSize, +edgeSize], [+edgeSize, -edgeSize, -edgeSize], [+edgeSize, +edgeSize, -edgeSize], [+edgeSize, +edgeSize, +edgeSize]],
      [p5.Tree.BOTTOM]: [[-edgeSize, +edgeSize, +edgeSize], [+edgeSize, +edgeSize, +edgeSize], [+edgeSize, +edgeSize, -edgeSize], [-edgeSize, +edgeSize, -edgeSize]],
      [p5.Tree.TOP]:    [[-edgeSize, -edgeSize, +edgeSize], [+edgeSize, -edgeSize, +edgeSize], [+edgeSize, -edgeSize, -edgeSize], [-edgeSize, -edgeSize, -edgeSize]],
    }
    if (faces[face]) {
      for (const [vx, vy, vz] of faces[face]) p.vertex(vx, vy, vz)
    }
    p.endShape(p.CLOSE)
    p.pop()
  }

  p.mouseWheel = () => false
}

onMounted(() => {
  p5Instance = new p5(sketch, sketchContainer.value)
})

onUnmounted(() => {
  if (p5Instance) p5Instance.remove()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-4">
    <div ref="sketchContainer" class="rounded-lg overflow-hidden border border-white/10 shadow-2xl"></div>
    <p class="text-xs text-gray-400 italic">Non-euclidean multi-pass rendering with programmable fragment shaders</p>
  </div>
</template>
