import { CONFIG } from '../constants/config'

// ── Particle system for dust, impact, rain splashes ──
//
// Level 2 extends this with water-drip and water-splash particle
// types plus a ripple-effect array (see PROJECT.md §13 Level 2).
// Each particle now carries its own `grav` so the same update
// loop can handle Level 1 dust *and* the heavier water physics
// the underground demands, without branching per type.
interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number; maxLife: number
  size: number; color: string
  type: 'dust' | 'impact' | 'splash' | 'spark' | 'waterdrip' | 'watersplash'
  grav: number
  w?: number
  h?: number
}

interface RippleEffect {
  x: number; y: number
  r: number; maxR: number
  life: number; maxLife: number
}

interface Building {
  x: number; width: number; height: number
  windowRows: { y: number; windows: boolean[] }[]
  hasVertStrip: boolean; stripX: number
  hasSign: boolean; signText: string
  roofDetail: 'antenna' | 'tank' | 'dish' | 'none'
  fireEscape: boolean
}

interface GroundElement {
  x: number; type: 'rack' | 'crate' | 'barrel' | 'pipe' | 'vent'
  width: number; height: number
}

interface NeonSign {
  x: number; y: number; text: string
  color: string; width: number; layer: number
}

interface Ship {
  x: number; y: number; speed: number
  width: number; dir: number; bobY: number
}

interface Wire {
  x1: number; y1: number; x2: number; y2: number; sag: number
}

export class ParallaxBackground {
  private worldWidth: number
  private layers: Building[][] = []
  private ground: GroundElement[] = []
  private signs: NeonSign[] = []
  private ships: Ship[] = []
  private wires: Wire[] = []
  private community: { x:number; type:string }[] = []
  private rain: { x:number;y:number;spd:number;len:number;lay:number }[] = []
  public  particles: Particle[] = []
  public  ripples: RippleEffect[] = []
  private time = 0

  // Water FX palette (Level 2 — PROJECT.md §13)
  private readonly WATER_DRIP_COLORS = [
    '#4a9eff', '#66aaff', '#88ccff', '#2277dd',
  ]
  private readonly WATER_SPLASH_COLOR = '#88ccff'
  private readonly WATER_RIPPLE_COLOR = '#4a9eff'

  // EXACT parallax speeds — tuned for game feel
  // Far = almost still, near = most movement
  private readonly SPEEDS = [0.02, 0.06, 0.14, 0.28, 0.55]

  // EXACT colors from reference image analysis
  private readonly SKY_COLORS = {
    top:    '#05030e',   // near black-purple
    mid:    '#0c0520',   // deep space purple
    horiz:  '#180838',   // rich purple at horizon
    glow:   '#2a0f50',   // city glow bloom
  }

  // Buildings — almost black silhouettes like reference #0f0f11
  private readonly BLDG = [
    '#050408',  // Layer 0 — almost pure black
    '#060509',  // Layer 1 — near black
    '#07060a',  // Layer 2 — very dark purple-black
    '#08070b',  // Layer 3
    '#09080d',  // Layer 4 — nearest, still very dark
  ]

  // Neon colors — cyan + magenta + amber (cyberpunk triad)
  private readonly NEON = {
    cyan:    '#00e5ff',
    magenta: '#e040fb',
    amber:   '#ff9100',
    green:   '#00e676',
    red:     '#ff1744',
    white:   '#ffffff',
  }

  private readonly SIGNS_TEXT = [
    'NEUROCORP', 'NEXUS', 'UPLINK', 'GRID.SYS',
    'DATA HUB', 'CIPHER', 'AXON', 'RELAY',
    'CORE NET', 'SIGNAL', 'VOLT CO', 'STREAM',
  ]

  constructor(worldWidth: number) {
    this.worldWidth = worldWidth
    this.build()
  }

  private rng(seed: number) {
    let s = seed
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff
      return (s >>> 0) / 0xffffffff
    }
  }

  private build() {
    this.buildLayers()
    this.buildGround()
    this.buildCommunity()
    this.buildSigns()
    this.buildShips()
    this.buildWires()
    this.buildRain()
  }

  private buildLayers() {
    const cfgs = [
      // Far layers still tall (distant city glimpse)
      { n:14, minW:120, maxW:240, minH:260, maxH:480 },
      { n:18, minW:100, maxW:200, minH:200, maxH:400 },
      // Mid — mix of tall and short
      { n:24, minW: 70, maxW:160, minH: 80, maxH:300 },
      // Near — SHORT old buildings, District 1 style
      { n:32, minW: 50, maxW:120, minH: 50, maxH:180 },
      // Foreground — very short, crumbling, narrow
      { n:40, minW: 35, maxW: 90, minH: 40, maxH:140 },
    ]
    for (let li = 0; li < 5; li++) {
      const r = this.rng(li*6271+9999)
      const c = cfgs[li]
      const out: Building[] = []
      let x = -300
      for (let i = 0; i < c.n; i++) {
        const w = c.minW + Math.floor(r()*(c.maxW-c.minW))
        const h = c.minH + Math.floor(r()*(c.maxH-c.minH))
        // Narrow alleys — tiny gaps between buildings
        const gap = li >= 3
          ? Math.floor(r()*8)    // near: very narrow alleys
          : Math.floor(r()*6)    // far: almost no gap

        const rows: Building['windowRows'] = []
        for (let wy = 12; wy < h-12; wy += 16) {
          const cols = Math.floor((w-16)/14)
          const winChance = [0.12,0.18,0.25,0.32,0.38][li]
          rows.push({
            y: wy,
            windows: Array.from(
              {length: cols},
              () => r() > (1 - winChance)
            )
          })
        }

        const roofOpts: Building['roofDetail'][] = [
          'antenna','tank','dish','none','none','none'
        ]
        out.push({
          x, width:w, height:h,
          windowRows: rows,
          hasVertStrip: li <= 2 && r() > 0.55,
          stripX: Math.floor(r()*(w-8))+4,
          // Near layers — hand-painted community signs
          hasSign: li >= 3 && r() > 0.65,
          signText: [
            'CHAI','HOT FOOD','REPAIR',
            'KIRAN CO','OPEN','NET NODE',
            'DATA 4 SALE','SHELTER','SAFE',
          ][Math.floor(r()*9)],
          roofDetail: roofOpts[
            Math.floor(r()*roofOpts.length)
          ],
          fireEscape: li >= 3 && r() > 0.45,
        })
        x += w + gap
      }
      this.layers[li] = out
    }
  }

  private buildGround() {
    const r = this.rng(55555)
    this.ground = []
    let x = 20
    while (x < this.worldWidth - 80) {
      // District 1 ground — mostly server racks and
      // community objects, densely packed
      const roll = r()
      let type: GroundElement['type']
      let w: number, h: number

      if (roll < 0.30) {
        type = 'rack'; w = 20; h = 38
      } else if (roll < 0.50) {
        type = 'crate'; w = 24; h = 22
      } else if (roll < 0.65) {
        type = 'barrel'; w = 16; h = 20
      } else if (roll < 0.80) {
        type = 'pipe'; w = 48; h = 8
      } else {
        type = 'vent'; w = 28; h = 12
      }

      this.ground.push({ x, type, width:w, height:h })
      // Dense packing — 8 to 28px gap
      x += w + 8 + Math.floor(r()*20)
    }
  }

  private buildCommunity() {
    // People silhouettes, chai carts, demolition notices
    // Stored as world objects rendered in drawGround()
    this.community = []
    const r = this.rng(88888)

    for (let x = 150; x < this.worldWidth; x += 280+Math.floor(r()*320)) {
      const roll = r()
      if (roll < 0.35) {
        this.community.push({ x, type: 'person_stand' })
      } else if (roll < 0.55) {
        this.community.push({ x, type: 'chai_cart' })
      } else if (roll < 0.70) {
        this.community.push({ x, type: 'demolition' })
      } else if (roll < 0.85) {
        this.community.push({ x, type: 'person_sit' })
      } else {
        this.community.push({ x, type: 'server_wall' })
      }
    }
  }

  private buildSigns() {
    const r = this.rng(77777)
    const colors = [
      this.NEON.cyan, this.NEON.magenta,
      this.NEON.amber, this.NEON.green,
    ]
    for (let x = 200; x < this.worldWidth; x += 180+Math.floor(r()*200)) {
      const layer = 2 + Math.floor(r()*3)
      const groundY = this.getGroundY()
      const y = groundY - 120 - Math.floor(r()*200)
      this.signs.push({
        x, y,
        text: this.SIGNS_TEXT[Math.floor(r()*this.SIGNS_TEXT.length)],
        color: colors[Math.floor(r()*colors.length)],
        width: 90 + Math.floor(r()*70),
        layer,
      })
    }
  }

  private buildShips() {
    this.ships = [
      { x:500,  y:95,  speed:42, width:80, dir:-1, bobY:0 },
      { x:2200, y:68,  speed:28, width:60, dir:-1, bobY:0 },
      { x:3800, y:115, speed:55, width:70, dir: 1, bobY:0 },
    ]
  }

  private buildWires() {
    // Power/data wires strung between buildings — foreground only
    const r = this.rng(33333)
    for (let x = 100; x < this.worldWidth-200; x += 200+Math.floor(r()*150)) {
      const groundY = this.getGroundY()
      const y1 = groundY - 60 - Math.floor(r()*80)
      const y2 = groundY - 60 - Math.floor(r()*80)
      this.wires.push({
        x1:x, y1,
        x2:x+100+Math.floor(r()*80), y2,
        sag: 15+Math.floor(r()*25),
      })
    }
  }

  private buildRain() {
    const r = this.rng(11111)
    for (let i = 0; i < 220; i++) {
      this.rain.push({
        x: r()*CONFIG.CANVAS_WIDTH*4,
        y: r()*CONFIG.CANVAS_HEIGHT,
        spd: 380+r()*320,
        len: 9+r()*14,
        lay: Math.floor(r()*3),
      })
    }
  }

  // ── PUBLIC: spawn particles (called by GameScene) ──
  spawnDust(wx: number, groundY: number, dir: number) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI + (Math.random()-0.5)*1.2
      const spd = 20+Math.random()*60
      this.particles.push({
        x: wx, y: groundY - 2,
        vx: Math.cos(angle)*spd*dir + (Math.random()-0.5)*30,
        vy: -Math.random()*40,
        life:1, maxLife:1,
        size: 1+Math.random()*2,
        color: '#4a3a2a',
        type: 'dust',
        grav: 180,
      })
    }
  }

  spawnImpact(wx: number, wy: number) {
    // Landing impact — small spark + dust burst.
    // Tuned to be subtle: ring renderer scales by *8, so size:2 -> max ~32px radius.
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI + (Math.random()-0.5)*Math.PI
      const spd = 20+Math.random()*55
      const isSpark = Math.random()>0.5
      this.particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle)*spd,
        vy: -Math.random()*40,
        life:1, maxLife: isSpark?0.22:0.45,
        size: isSpark?1:1+Math.random()*1.5,
        color: isSpark ? this.NEON.cyan : '#3a2a1a',
        type: isSpark ? 'spark' : 'impact',
        grav: 180,
      })
    }
    // Shockwave circle ring — small (size >5 triggers ring render branch)
    this.particles.push({
      x:wx, y:wy,
      vx:0, vy:0,
      life:1, maxLife:0.25,
      size:6, color:this.NEON.cyan,
      type:'impact',
      grav: 0,
    })
  }

  spawnSplash(wx: number, wy: number) {
    for (let i = 0; i < 5; i++) {
      const angle = -(0.3+Math.random()*2.4)
      const spd = 30+Math.random()*70
      this.particles.push({
        x:wx, y:wy,
        vx:Math.cos(angle)*spd,
        vy:Math.sin(angle)*spd*0.7,
        life:1, maxLife:0.5,
        size:1+Math.random()*2,
        color:'#00aacc',
        type:'splash',
        grav: 180,
      })
    }
  }

  // ── LEVEL 2 WATER FX ─────────────────────────────────────
  // Small elongated droplets that shoot up then fall (heavier
  // gravity than normal particles). PROJECT.md §13 Level 2.
  spawnWaterDrip(wx: number, wy: number, dir: number) {
    for (let i = 0; i < 4; i++) {
      const colorIdx = Math.floor(Math.random() * this.WATER_DRIP_COLORS.length)
      const color    = this.WATER_DRIP_COLORS[colorIdx] ?? '#4a9eff'
      this.particles.push({
        x: wx, y: wy - 2,
        vx: dir * (10 + Math.random() * 20),
        vy: -(60 + Math.random() * 60),
        life: 1, maxLife: 0.5,
        size: 2,
        color,
        type: 'waterdrip',
        grav: 800,
        w: 2, h: 4,
      })
    }
  }

  // Landing in water — bigger horizontal spray + an expanding
  // ripple ring so AX footsteps clearly "splash".
  spawnWaterSplash(wx: number, wy: number) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: wx, y: wy,
        vx: (Math.random() - 0.5) * 320,
        vy: -(40 + Math.random() * 80),
        life: 1, maxLife: 0.4,
        size: 3,
        color: this.WATER_SPLASH_COLOR,
        type: 'watersplash',
        grav: 800,
        w: 3, h: 3,
      })
    }
    this.ripples.push({
      x: wx, y: wy,
      r: 0, maxR: 35,
      life: 0.3, maxLife: 0.3,
    })
  }

  // Green acid splash — used by Crawler drops hitting the floor.
  // Kept on the bg particle array so Level2 doesn't need its own.
  spawnAcidSplash(wx: number, wy: number) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: wx, y: wy,
        vx: (Math.random() - 0.5) * 200,
        vy: -(30 + Math.random() * 80),
        life: 1, maxLife: 0.35,
        size: 3,
        color: '#8cff14',
        type: 'watersplash',
        grav: 900,
        w: 3, h: 3,
      })
    }
  }

  update(dt: number) {
    this.time += dt

    // Ships bob and move
    for (const s of this.ships) {
      s.x += s.dir * s.speed * dt
      s.bobY = Math.sin(this.time*1.4 + s.x*0.002) * 4
      if (s.x < -400)                    s.x = this.worldWidth+400
      if (s.x > this.worldWidth+400)     s.x = -400
    }

    // Rain
    for (const d of this.rain) {
      d.y += d.spd * dt
      if (d.y > CONFIG.CANVAS_HEIGHT) {
        d.y = -20
        d.x = Math.random()*CONFIG.CANVAS_WIDTH*4
      }
    }

    // Particles
    for (let i = this.particles.length-1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt / p.maxLife
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += p.grav * dt   // per-particle gravity (water drips fall harder)
      p.vx *= 0.92          // air drag
      if (p.life <= 0) this.particles.splice(i, 1)
    }

    // Ripples — life counts down; r is computed each frame from pct
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]!
      r.life -= dt
      r.r = (1 - r.life / r.maxLife) * r.maxR
      if (r.life <= 0) this.ripples.splice(i, 1)
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number) {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = this.getGroundY()
    ctx.imageSmoothingEnabled = false

    this.drawSky(ctx, W, GY)
    this.drawShips(ctx, cameraX)
    for (let li=0; li<5; li++) this.drawLayer(ctx, li, cameraX, GY)
    this.drawWires(ctx, cameraX, GY)
    this.drawHaze(ctx, W, GY)
    this.drawSigns(ctx, cameraX, GY)
    this.drawRain(ctx, cameraX, GY)
    this.drawGround(ctx, cameraX, GY, W, H)
    this.drawParticles(ctx, cameraX)
    this.drawRipples(ctx, cameraX)
  }

  private drawSky(ctx: CanvasRenderingContext2D, W:number, GY:number) {
    // Deep sky bands
    ctx.fillStyle = this.SKY_COLORS.top
    ctx.fillRect(0, 0, W, GY*0.4)
    ctx.fillStyle = this.SKY_COLORS.mid
    ctx.fillRect(0, GY*0.4, W, GY*0.35)
    ctx.fillStyle = this.SKY_COLORS.horiz
    ctx.fillRect(0, GY*0.75, W, GY*0.25)

    // Purple city glow bleeding up from skyline
    ctx.fillStyle = this.SKY_COLORS.glow
    ctx.globalAlpha = 0.18
    ctx.fillRect(0, GY*0.55, W, GY*0.25)
    ctx.globalAlpha = 0.10
    ctx.fillRect(0, GY*0.40, W, GY*0.20)
    ctx.globalAlpha = 1

    // Stars — subtle twinkle
    const stars=[
      [60,18],[155,12],[245,32],[370,9],[455,26],
      [540,7],[640,20],[740,16],[840,28],[940,8],
      [1060,38],[1160,14],[1240,6],[310,44],[750,11],
      [980,52],[420,18],[680,33],[1100,22],[200,8],
    ]
    for (const [sx,sy] of stars) {
      ctx.globalAlpha = 0.2+Math.abs(Math.sin(this.time*1.1+sx*0.07))*0.6
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(sx, sy, 1, 1)
      // Occasional brighter star with cross-flare
      if (sx%120===60) {
        ctx.globalAlpha = 0.15
        ctx.fillRect(sx-2, sy, 5, 1)
        ctx.fillRect(sx, sy-2, 1, 5)
      }
    }
    ctx.globalAlpha = 1

    // Planet — like reference, upper right area
    ctx.fillStyle = '#1a0830'
    ctx.beginPath(); ctx.arc(1080, 75, 45, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = '#220b40'
    ctx.beginPath(); ctx.arc(1080, 75, 38, 0, Math.PI*2); ctx.fill()
    // Planet rings
    ctx.strokeStyle = '#4a1a7a'; ctx.lineWidth=1.5
    ctx.globalAlpha=0.4
    ctx.beginPath(); ctx.ellipse(1080, 75, 58, 12, -0.3, 0, Math.PI*2); ctx.stroke()
    ctx.globalAlpha=0.2
    ctx.beginPath(); ctx.ellipse(1080, 75, 70, 16, -0.3, 0, Math.PI*2); ctx.stroke()
    ctx.globalAlpha=1

    // Vertical light shafts from city (like reference)
    const shafts = [320, 620, 900, 1150]
    for (const sx of shafts) {
      ctx.fillStyle = '#5522aa'
      ctx.globalAlpha = 0.04 + Math.sin(this.time*0.3+sx)*0.02
      ctx.fillRect(sx-8, 0, 18, GY)
      ctx.globalAlpha = 1
    }
  }

  private drawShips(ctx: CanvasRenderingContext2D, cameraX:number) {
    for (const s of this.ships) {
      const sx = s.x - cameraX * 0.08
      const sy = s.y + s.bobY
      if (sx < -200 || sx > CONFIG.CANVAS_WIDTH+200) continue

      ctx.save()
      if (s.dir > 0) { ctx.scale(-1,1); ctx.translate(-sx*2-s.width, 0) }

      // Ship hull — sleek dark shape
      ctx.fillStyle = '#0d0820'
      ctx.beginPath()
      ctx.moveTo(sx+s.width*0.1, sy+8)
      ctx.lineTo(sx+s.width*0.05, sy+4)
      ctx.lineTo(sx+s.width*0.5, sy)
      ctx.lineTo(sx+s.width*0.95, sy+4)
      ctx.lineTo(sx+s.width, sy+8)
      ctx.lineTo(sx+s.width*0.85, sy+14)
      ctx.lineTo(sx+s.width*0.15, sy+14)
      ctx.closePath(); ctx.fill()

      // Cockpit glow
      ctx.fillStyle = this.NEON.cyan
      ctx.globalAlpha=0.6
      ctx.fillRect(sx+s.width*0.55, sy+3, s.width*0.25, 6)
      ctx.globalAlpha=0.2
      ctx.fillRect(sx+s.width*0.5, sy+1, s.width*0.35, 10)
      ctx.globalAlpha=1

      // Engine trail
      const pulse = 0.5+Math.sin(this.time*10+s.x)*0.5
      ctx.fillStyle = this.NEON.magenta
      ctx.globalAlpha=pulse*0.8
      ctx.fillRect(sx, sy+5, 10, 4)
      ctx.globalAlpha=pulse*0.3
      ctx.fillRect(sx-20, sy+5, 22, 4)
      ctx.globalAlpha=pulse*0.1
      ctx.fillRect(sx-40, sy+5, 22, 4)
      ctx.globalAlpha=1

      // Underbelly lights
      ctx.fillStyle = this.NEON.amber
      ctx.globalAlpha=0.4
      ctx.fillRect(sx+s.width*0.3, sy+13, 4, 2)
      ctx.fillRect(sx+s.width*0.55, sy+13, 4, 2)
      ctx.globalAlpha=1

      ctx.restore()
    }
  }

  private drawLayer(
    ctx:CanvasRenderingContext2D,
    li:number, cameraX:number, GY:number
  ) {
    const offset = cameraX * this.SPEEDS[li]
    const bldgColor = this.BLDG[li]

    for (const b of this.layers[li]) {
      const bx = b.x - offset
      const by = GY - b.height
      if (bx+b.width < -5 || bx > CONFIG.CANVAS_WIDTH+5) continue

      // ── BUILDING BODY ──
      ctx.fillStyle = bldgColor
      ctx.fillRect(bx, by, b.width, b.height)

      // Very subtle edge highlight — gives form
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.025
      ctx.fillRect(bx, by, 1, b.height)
      ctx.fillRect(bx, by, b.width, 1)
      ctx.globalAlpha = 1

      // ── WINDOWS ──
      for (const row of b.windowRows) {
        const winH = 7; const winW = 6; const gap = 14
        for (let wi=0; wi<row.windows.length; wi++) {
          const wx = bx + 10 + wi*gap
          const wy = by + row.y
          if (wx+winW > bx+b.width-8) continue
          if (row.windows[wi]) {
            // Window color by layer — far=very dim, near=brighter
            // ALL windows are cool blue-cyan only — no amber
            // This makes AX's warm sprite pop against the city
            const baseFills = [
              '#001820',  // layer 0 — barely visible
              '#002028',  // layer 1
              '#002a33',  // layer 2
              '#003344',  // layer 3
              '#004455',  // layer 4 — most visible
            ]
            const glowFills = [
              '#002233',
              '#002233',
              '#003344',
              '#003344',
              '#004455',
            ]
            ctx.fillStyle = baseFills[li]
            ctx.fillRect(wx, wy, winW, winH)
            ctx.fillStyle = glowFills[li]
            ctx.globalAlpha = 0.15 + (li * 0.05) +
              Math.sin(this.time*0.5+wx*0.3+wy*0.2)*0.05
            ctx.fillRect(wx+1, wy+1, winW-2, winH-2)
            ctx.globalAlpha = 1
          } else {
            ctx.fillStyle = '#050508'
            ctx.fillRect(wx, wy, winW, winH)
          }
        }
      }

      // ── VERTICAL LIGHT STRIPS ──
      if (b.hasVertStrip) {
        const stripColor = li<2 ? '#003344' : li<4 ? '#006688' : this.NEON.cyan
        ctx.fillStyle = stripColor
        ctx.globalAlpha = li<2?0.4:0.7
        ctx.fillRect(bx+b.stripX, by, 2, b.height)
        // Glow bloom
        ctx.globalAlpha = li<2?0.08:0.15
        ctx.fillRect(bx+b.stripX-2, by, 6, b.height)
        ctx.globalAlpha=1
      }

      // ── ROOF DETAILS ──
      if (b.roofDetail === 'antenna') {
        ctx.fillStyle = '#0a0810'
        ctx.fillRect(bx+b.width/2-1, by-18, 2, 18)
        const blink = Math.sin(this.time*3+b.x*0.05) > 0.5
        ctx.fillStyle = blink ? this.NEON.red : '#330000'
        ctx.fillRect(bx+b.width/2-2, by-20, 4, 4)
      } else if (b.roofDetail === 'tank') {
        ctx.fillStyle = '#0c0b14'
        ctx.fillRect(bx+b.width*0.2, by-12, b.width*0.3, 12)
        ctx.fillRect(bx+b.width*0.6, by-8, b.width*0.2, 8)
      } else if (b.roofDetail === 'dish') {
        ctx.strokeStyle = '#1a1530'
        ctx.lineWidth=1
        ctx.beginPath()
        ctx.arc(bx+b.width*0.7, by-2, 10, Math.PI, 0)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(bx+b.width*0.7, by-2)
        ctx.lineTo(bx+b.width*0.7, by-14)
        ctx.stroke()
      }

      // ── FIRE ESCAPE (foreground layers) ──
      if (b.fireEscape && li>=3) {
        ctx.strokeStyle = '#1a1428'
        ctx.lineWidth=1.5
        const feX = bx + b.width*0.75
        for (let fey=by+20; fey<GY-20; fey+=20) {
          ctx.strokeRect(feX, fey, 12, 18)
          ctx.beginPath()
          ctx.moveTo(feX+6, fey+18)
          ctx.lineTo(feX+6, fey+20)
          ctx.stroke()
        }
      }
    }
  }

  private drawWires(
    ctx:CanvasRenderingContext2D,
    cameraX:number, _GY:number
  ) {
    ctx.strokeStyle = '#1a1228'
    ctx.lineWidth = 1
    const offset = cameraX * this.SPEEDS[4]
    for (const w of this.wires) {
      const x1 = w.x1 - offset
      const x2 = w.x2 - offset
      if (x2 < 0 || x1 > CONFIG.CANVAS_WIDTH) continue
      const mx = (x1+x2)/2
      const my = Math.max(w.y1,w.y2) + w.sag
      ctx.beginPath()
      ctx.moveTo(x1, w.y1)
      ctx.quadraticCurveTo(mx, my, x2, w.y2)
      ctx.stroke()
    }
  }

  private drawHaze(
    ctx:CanvasRenderingContext2D,
    W:number, GY:number
  ) {
    // Atmospheric depth — layers of purple haze
    // This is what gives the reference image its depth
    ctx.fillStyle = '#0a0318'
    ctx.globalAlpha = 0.45
    ctx.fillRect(0, GY-520, W, 220)
    ctx.globalAlpha = 0.30
    ctx.fillRect(0, GY-350, W, 160)
    ctx.globalAlpha = 0.18
    ctx.fillRect(0, GY-230, W, 110)

    // Purple horizon bloom — key atmospheric element
    ctx.fillStyle = '#2a0850'
    ctx.globalAlpha = 0.14
    ctx.fillRect(0, GY-150, W, 90)
    ctx.globalAlpha = 0.08
    ctx.fillRect(0, GY-200, W, 70)

    // Subtle cyan city glow at very base of skyline
    ctx.fillStyle = '#003344'
    ctx.globalAlpha = 0.10
    ctx.fillRect(0, GY-80, W, 50)
    ctx.globalAlpha = 1
  }

  private drawSigns(
    ctx:CanvasRenderingContext2D,
    cameraX:number, GY:number
  ) {
    for (const s of this.signs) {
      const sx = s.x - cameraX * this.SPEEDS[s.layer]
      if (sx < -100 || sx > CONFIG.CANVAS_WIDTH+100) continue
      const pulse = 0.6 + Math.sin(this.time*2.2+s.x*0.04)*0.35
      ctx.globalAlpha = pulse

      // Sign backing
      ctx.fillStyle = '#06040e'
      ctx.fillRect(sx, s.y, s.width, 22)

      // Neon border
      ctx.strokeStyle = s.color
      ctx.lineWidth = 1.2
      ctx.strokeRect(sx, s.y, s.width, 22)

      // Inner glow
      ctx.fillStyle = s.color
      ctx.globalAlpha = pulse * 0.15
      ctx.fillRect(sx+1, s.y+1, s.width-2, 20)

      // Text
      ctx.globalAlpha = pulse
      ctx.fillStyle = s.color
      ctx.font = 'bold 12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.text, sx+s.width/2, s.y+11)
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'

      // Ground reflection of sign
      ctx.fillStyle = s.color
      ctx.globalAlpha = 0.04
      ctx.fillRect(sx, GY-30, s.width, 30)
      ctx.globalAlpha=1
    }
  }

  private drawRain(
    ctx:CanvasRenderingContext2D,
    cameraX:number, GY:number
  ) {
    const speeds=[0.08,0.25,0.55]
    for (const d of this.rain) {
      const sx = d.x - cameraX*speeds[d.lay]
      if (sx<0||sx>CONFIG.CANVAS_WIDTH||d.y>GY) continue
      ctx.strokeStyle = '#00ddcc'
      ctx.lineWidth   = 0.4
      ctx.globalAlpha = 0.08 + d.lay*0.04
      ctx.beginPath()
      ctx.moveTo(sx, d.y)
      ctx.lineTo(sx-1.5, d.y+d.len)
      ctx.stroke()
    }
    ctx.globalAlpha=1
  }

  private drawGround(
    ctx:CanvasRenderingContext2D,
    cameraX:number, GY:number, W:number, H:number
  ) {
    // Ground fill — very dark, slight purple tint
    ctx.fillStyle = '#080612'
    ctx.fillRect(0, GY, W, H-GY)

    // Wet ground — subtle blue sheen
    ctx.fillStyle = '#0d0a22'
    ctx.fillRect(0, GY+1, W, 18)

    // Ground neon lines
    ctx.fillStyle = '#001a33'
    ctx.fillRect(0, GY, W, 3)
    ctx.fillStyle = this.NEON.cyan
    ctx.fillRect(0, GY, W, 1)
    ctx.fillStyle = '#220033'
    ctx.fillRect(0, GY+3, W, 2)
    ctx.fillStyle = this.NEON.magenta
    ctx.fillRect(0, GY+3, W, 1)

    // Ground grid
    ctx.strokeStyle = '#110d20'
    ctx.lineWidth = 1
    const go = (cameraX*0.9)%80
    for (let gx=-go; gx<W; gx+=80) {
      ctx.beginPath()
      ctx.moveTo(gx, GY+4); ctx.lineTo(gx, H)
      ctx.stroke()
    }

    // Wet ground reflections of neon signs
    ctx.fillStyle = this.NEON.cyan
    ctx.globalAlpha=0.04
    ctx.fillRect(0, GY+4, W, 12)
    ctx.globalAlpha=1

    // Ground elements
    const gOffset = cameraX * 0.9
    for (const el of this.ground) {
      const sx = el.x - gOffset
      if (sx < -60 || sx > W+60) continue
      const ey = GY + 5 - el.height

      switch(el.type) {
        case 'rack':
          ctx.fillStyle = '#0c0a1a'
          ctx.fillRect(sx, ey, el.width, el.height)
          ctx.strokeStyle = '#1a1535'
          ctx.lineWidth=0.5
          ctx.strokeRect(sx, ey, el.width, el.height)
          // Rack lights
          const blink1 = Math.sin(this.time*4+el.x)>0
          ctx.fillStyle = blink1 ? this.NEON.green : '#003300'
          ctx.globalAlpha=0.8
          ctx.fillRect(sx+3, ey+4, 3, 2)
          ctx.fillRect(sx+3, ey+9, 3, 2)
          ctx.fillRect(sx+3, ey+14, 3, 2)
          ctx.fillStyle = Math.sin(this.time*3+el.x+1)>0.7
            ? this.NEON.red : '#220000'
          ctx.fillRect(sx+3, ey+19, 3, 2)
          ctx.globalAlpha=1
          break

        case 'crate':
          ctx.fillStyle = '#0e0b1c'
          ctx.fillRect(sx, ey, el.width, el.height)
          ctx.strokeStyle = '#201a35'
          ctx.lineWidth=0.5
          ctx.strokeRect(sx, ey, el.width, el.height)
          // Crate markings
          ctx.strokeStyle = '#2a2040'
          ctx.beginPath()
          ctx.moveTo(sx, ey+el.height/2)
          ctx.lineTo(sx+el.width, ey+el.height/2)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(sx+el.width/2, ey)
          ctx.lineTo(sx+el.width/2, ey+el.height)
          ctx.stroke()
          break

        case 'barrel':
          ctx.fillStyle = '#0f0d1e'
          ctx.fillRect(sx, ey, el.width, el.height)
          // Barrel rings
          ctx.strokeStyle = '#252040'
          ctx.lineWidth=1
          ctx.strokeRect(sx, ey+4, el.width, 3)
          ctx.strokeRect(sx, ey+el.height-7, el.width, 3)
          break

        case 'pipe':
          ctx.fillStyle = '#0c0a18'
          ctx.fillRect(sx, ey, el.width, el.height)
          ctx.strokeStyle = '#181428'
          ctx.lineWidth=1
          ctx.strokeRect(sx, ey, el.width, el.height)
          // Pipe joints
          ctx.fillStyle = '#1e1a30'
          ctx.fillRect(sx, ey, 6, el.height)
          ctx.fillRect(sx+el.width-6, ey, 6, el.height)
          // Glowing pipe — data pipe
          ctx.fillStyle = this.NEON.cyan
          ctx.globalAlpha=0.12+Math.sin(this.time*2+el.x)*0.06
          ctx.fillRect(sx+3, ey+2, el.width-6, el.height-4)
          ctx.globalAlpha=1
          break

        case 'vent':
          ctx.fillStyle = '#0d0b1a'
          ctx.fillRect(sx, ey, el.width, el.height)
          // Vent slats
          ctx.strokeStyle = '#1c1830'
          ctx.lineWidth=0.5
          for (let vx=sx+4; vx<sx+el.width-4; vx+=5) {
            ctx.beginPath()
            ctx.moveTo(vx, ey+2)
            ctx.lineTo(vx, ey+el.height-2)
            ctx.stroke()
          }
          // Vent steam
          if (Math.sin(this.time*2+el.x)>0.5) {
            ctx.fillStyle = '#334466'
            ctx.globalAlpha=0.15
            ctx.fillRect(sx+8, ey-8, el.width-16, 8)
            ctx.globalAlpha=1
          }
          break
      }

      // Puddle under each element
      ctx.fillStyle = '#0d0a22'
      ctx.fillRect(sx-4, GY+5, el.width+8, 4)
      ctx.fillStyle = this.NEON.cyan
      ctx.globalAlpha=0.05
      ctx.fillRect(sx-4, GY+5, el.width+8, 2)
      ctx.globalAlpha=1
    }

    this.drawCommunity(ctx, cameraX, GY)
  }

  private drawCommunity(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    GY: number
  ) {
    const offset = cameraX * 0.9

    for (const obj of this.community) {
      const sx = obj.x - offset
      if (sx < -100 || sx > CONFIG.CANVAS_WIDTH + 100) continue

      switch (obj.type) {

        case 'person_stand': {
          // Standing person silhouette
          ctx.fillStyle = '#0a0818'
          // Body
          ctx.fillRect(sx, GY-38, 8, 24)
          // Head
          ctx.fillRect(sx+1, GY-46, 6, 8)
          // Slight cyan rim light (neon from environment)
          ctx.fillStyle = '#003344'
          ctx.fillRect(sx+7, GY-44, 1, 36)
          break
        }

        case 'person_sit': {
          // Sitting person — hunched
          ctx.fillStyle = '#0a0818'
          ctx.fillRect(sx, GY-20, 10, 14)
          ctx.fillRect(sx+2, GY-28, 6, 8)
          // Holding something (phone/device) — tiny cyan glow
          ctx.fillStyle = '#00aacc'
          ctx.globalAlpha = 0.6
          ctx.fillRect(sx+10, GY-22, 4, 6)
          ctx.globalAlpha = 1
          break
        }

        case 'chai_cart': {
          // Chai cart — iconic District 1 element
          // Cart body
          ctx.fillStyle = '#0e0b1c'
          ctx.fillRect(sx, GY-28, 36, 22)
          // Cart top
          ctx.fillStyle = '#12102a'
          ctx.fillRect(sx-2, GY-32, 40, 6)
          // Wheels
          ctx.fillStyle = '#080614'
          ctx.fillRect(sx+2, GY-6, 8, 6)
          ctx.fillRect(sx+26, GY-6, 8, 6)
          // Steam from chai — warm amber glow
          ctx.fillStyle = '#ff9100'
          ctx.globalAlpha = 0.15 +
            Math.sin(this.time*3 + obj.x)*0.08
          ctx.fillRect(sx+14, GY-42, 8, 12)
          ctx.globalAlpha = 1
          // Hand-painted sign on cart
          ctx.fillStyle = '#ff9100'
          ctx.globalAlpha = 0.9
          ctx.font = 'bold 11px monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('CHAI', sx+18, GY-15)
          ctx.textBaseline = 'alphabetic'
          ctx.textAlign = 'left'
          ctx.globalAlpha = 1
          // Person behind cart
          ctx.fillStyle = '#0a0818'
          ctx.fillRect(sx+30, GY-42, 7, 28)
          ctx.fillRect(sx+31, GY-50, 5, 8)
          break
        }

        case 'demolition': {
          // NeuroCorps demolition notice hologram
          // Projected onto building wall
          const pulse = 0.5 +
            Math.sin(this.time*1.5 + obj.x*0.02)*0.3
          ctx.globalAlpha = pulse
          const boxW = 100
          const boxH = 62
          const boxY = GY - 100
          // Warning sign background
          ctx.fillStyle = '#1a0000'
          ctx.fillRect(sx, boxY, boxW, boxH)
          // Red border
          ctx.strokeStyle = '#ff1744'
          ctx.lineWidth = 1.5
          ctx.strokeRect(sx, boxY, boxW, boxH)
          // Warning text
          ctx.fillStyle = '#ff1744'
          ctx.font = 'bold 10px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('NEXUS',       sx+boxW/2, boxY+14)
          ctx.fillText('DEMOLITION',  sx+boxW/2, boxY+28)
          ctx.fillText('SCHEDULED',   sx+boxW/2, boxY+42)
          ctx.fillText('ORDER #4471', sx+boxW/2, boxY+56)
          ctx.textAlign = 'left'
          // Hologram scanline effect
          ctx.fillStyle = '#ff1744'
          ctx.globalAlpha = pulse * 0.15
          for (let sl = 0; sl < boxH; sl += 3) {
            ctx.fillRect(sx, boxY+sl, boxW, 1)
          }
          ctx.globalAlpha = 1
          break
        }

        case 'server_wall': {
          // Stacked server racks used as a wall/barrier
          // This is District 1's signature — servers as furniture
          const wallW = 55
          const wallH = 70
          ctx.fillStyle = '#080614'
          ctx.fillRect(sx, GY-wallH, wallW, wallH)
          // Stack lines (individual rack units)
          ctx.strokeStyle = '#110e22'
          ctx.lineWidth = 0.5
          for (let ry = GY-wallH+6; ry < GY; ry += 10) {
            ctx.beginPath()
            ctx.moveTo(sx, ry)
            ctx.lineTo(sx+wallW, ry)
            ctx.stroke()
          }
          // Blinking status lights — some green, some red
          for (let ry = GY-wallH+8; ry < GY-4; ry += 10) {
            const on = Math.sin(this.time*2+ry+obj.x) > 0
            ctx.fillStyle = ry % 20 === 8
              ? (on ? '#00ff88' : '#003311')
              : (on ? '#ff2200' : '#220000')
            ctx.globalAlpha = 0.8
            ctx.fillRect(sx+4, ry, 3, 2)
            ctx.fillRect(sx+10, ry, 3, 2)
            ctx.globalAlpha = 1
          }
          // Warmth glow — people use these for heat
          ctx.fillStyle = '#ff6600'
          ctx.globalAlpha = 0.04 +
            Math.sin(this.time*0.8+obj.x)*0.02
          ctx.fillRect(sx, GY-wallH, wallW, wallH)
          ctx.globalAlpha = 1
          // Wire hanging off top
          ctx.strokeStyle = '#0d0a18'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(sx+wallW*0.3, GY-wallH)
          ctx.quadraticCurveTo(
            sx+wallW*0.3-8, GY-wallH-12,
            sx+wallW*0.3-20, GY-wallH-8
          )
          ctx.stroke()
          break
        }
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, cameraX: number) {
    // Particles live in WORLD coordinates — convert to screen by
    // subtracting cameraX so they stay locked to their spawn location
    for (const p of this.particles) {
      const sx = p.x - cameraX
      const sy = p.y
      const alpha = p.life
      ctx.globalAlpha = alpha

      if (p.type === 'impact' && p.size > 5) {
        // Shockwave ring — compact (size 6 → radius ~18 start, ~36 end)
        ctx.strokeStyle = p.color
        ctx.lineWidth = 1
        ctx.globalAlpha = alpha * 0.55
        ctx.beginPath()
        ctx.arc(sx, sy, p.size*(2-p.life)*3, 0, Math.PI*2)
        ctx.stroke()
      } else if (p.type === 'waterdrip') {
        // Elongated droplet: tall blue oval.
        const w = p.w ?? 2
        const h = p.h ?? 4
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.ellipse(sx, sy, w/2, h/2, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'watersplash') {
        const w = p.w ?? 3
        const h = p.h ?? 3
        ctx.fillStyle = p.color
        ctx.fillRect(sx - w/2, sy - h/2, w, h)
      } else {
        ctx.fillStyle = p.color
        ctx.fillRect(
          sx - p.size/2,
          sy - p.size/2,
          p.size, p.size
        )
      }
    }
    ctx.globalAlpha = 1
  }

  /** Draw water ripples in world space — called after particles
   *  so the ring sits on top of any drip squares. */
  private drawRipples(ctx: CanvasRenderingContext2D, cameraX: number) {
    for (const r of this.ripples) {
      const sx  = r.x - cameraX
      const pct = r.life / r.maxLife
      ctx.strokeStyle = this.WATER_RIPPLE_COLOR
      ctx.lineWidth   = 1
      ctx.globalAlpha = pct * 0.6
      ctx.beginPath()
      ctx.ellipse(sx, r.y, r.r, r.r * 0.3, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // ── Public accessors for scenes that render their OWN backdrop
  //    (Level 2 needs the bg particle updates but not the L1 city
  //    visuals — see PROJECT.md §13 Level 2 visual identity).
  renderParticles(ctx: CanvasRenderingContext2D, cameraX: number): void {
    this.drawParticles(ctx, cameraX)
  }
  renderRipples(ctx: CanvasRenderingContext2D, cameraX: number): void {
    this.drawRipples(ctx, cameraX)
  }

  getGroundY(): number {
    return CONFIG.CANVAS_HEIGHT - 110
  }
}
