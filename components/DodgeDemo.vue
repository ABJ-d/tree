<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import p5 from 'p5'
import 'p5.tree'

const container = ref(null)
let inst = null

const sketch = p => {
  const W = 600, H = 340
  const ENEMY_R  = 16
  const PLAYER_R = 12
  const HIT_DIST = ENEMY_R + PLAYER_R + 4
  const N        = 6      // enemies always in play

  let enemies  = []
  let lives    = 3
  let score    = 0
  let hitCool  = 0        // invincibility frames after a hit
  let over     = false

  // zero-alloc scratch
  const playerPos = new Float32Array(3)
  const pv        = new Float32Array(16)
  const rim       = Math.min(W, H) * 0.46

  // ── spawn one enemy at a random boundary angle ────────────────────────
  function spawnEnemy() {
    const angle = p.random(p.TWO_PI)
    const sx    = Math.cos(angle) * rim
    const sy    = Math.sin(angle) * rim
    const dur   = p.floor(p.random(80, 200))
    const track = p.createPoseTrack()
    const e     = {
      out:   { pos: [sx, sy, 0], rot: [0,0,0,1], scl: [1,1,1] },
      track,
      col:   [p.random(80, 200), p.random(100, 200), p.random(200, 255)],
    }
    track.add({ pos: [sx, sy, 0] })
    track.add({ pos: [0, 0, 0]  })
    track.onEnd = () => {
      score++
      respawn(e)          // loop: send it back from a new angle
    }
    track.play({ duration: dur })
    return e
  }

  // respawn same object from new angle
  function respawn(e) {
    const angle = p.random(p.TWO_PI)
    const sx    = Math.cos(angle) * rim
    const sy    = Math.sin(angle) * rim
    const dur   = p.max(60, p.floor(p.random(80, 200) - score * 0.5))
    e.track.reset()
    e.track.add({ pos: [sx, sy, 0] })
    e.track.add({ pos: [0, 0, 0]  })
    e.out.pos[0] = sx; e.out.pos[1] = sy
    e.track.play({ duration: dur })
  }

  // ── setup ──────────────────────────────────────────────────────────────
  p.setup = () => {
    p.createCanvas(W, H, p.WEBGL)
    p.ortho(-W/2, W/2, -H/2, H/2, -500, 500)
    p.camera(0, 0, 200, 0, 0, 0, 0, 1, 0)
    for (let i = 0; i < N; i++) enemies.push(spawnEnemy())
  }

  // ── draw ───────────────────────────────────────────────────────────────
  p.draw = () => {
    if (over) { gameOverScreen(); return }
    if (hitCool > 0) hitCool--

    // cache P·V once
    p.mat4PV(pv)

    // mouse → world (ortho: z=0.5 midpoint)
    p.mapLocation(playerPos, [p.mouseX, p.mouseY, 0.5],
      { from: p5.Tree.SCREEN, to: p5.Tree.WORLD })

    // collision + nearest distance
    let minDist = 9999
    for (const e of enemies) {
      e.track.eval(e.out)
      const dx = playerPos[0] - e.out.pos[0]
      const dy = playerPos[1] - e.out.pos[1]
      const d  = Math.sqrt(dx*dx + dy*dy)
      if (d < minDist) minDist = d
      if (d < HIT_DIST && hitCool === 0) {
        hitCool = 40
        if (--lives <= 0) { over = true }
      }
    }

    // danger 0→1 from 5× hitDist down to threshold
    const danger = p.constrain(1 - (minDist - HIT_DIST) / (HIT_DIST * 5), 0, 1)
    const flash  = hitCool > 0 && hitCool % 6 < 3

    // background tint encodes danger — no framebuffer needed
    if (flash)             p.background(140, 20, 20)
    else if (danger > 0.1) p.background(p.lerp(12, 90, danger), p.lerp(12, 10, danger), 12)
    else                   p.background(12)

    // ── enemies ───────────────────────────────────────────────────────────
    p.noStroke()
    for (const e of enemies) {
      p.push()
      p.applyPose(e.out)
      p.emissiveMaterial(...e.col)
      p.sphere(ENEMY_R, 7, 5)
      p.pop()
    }

    // ── player ────────────────────────────────────────────────────────────
    p.push()
    p.translate(playerPos[0], playerPos[1], 0)
    const pc = flash ? [255, 80, 80] : [200, 225, 255]
    p.emissiveMaterial(...pc)
    p.sphere(PLAYER_R, 8, 6)
    const ch = PLAYER_R * 2
    p.stroke(...pc, 180); p.strokeWeight(1)
    p.line(-ch, 0, 2, ch, 0, 2)
    p.line(0, -ch, 2, 0, ch, 2)
    p.pop()

    // ── HUD ───────────────────────────────────────────────────────────────
    p.beginHUD()
    p.noStroke(); p.fill(200, 225, 255)
    p.textSize(14)
    for (let i = 0; i < lives; i++) p.text('♥', 10 + i * 22, 26)
    p.textAlign(p.RIGHT)
    p.text(`${score}`, W - 10, 26)
    p.textAlign(p.LEFT)
    p.endHUD()
  }

  function gameOverScreen() {
    p.background(0)
    p.beginHUD()
    p.fill(200, 225, 255); p.noStroke()
    p.textAlign(p.CENTER, p.CENTER)
    p.textSize(28)
    p.text('GAME OVER', W/2, H/2 - 20)
    p.textSize(13)
    p.text(`${score} waves survived`, W/2, H/2 + 16)
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
