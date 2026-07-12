import { ballColors } from './palettes.js';

const GRAVITY_SCALE = 640; // px/s^2 per unit of state.gravity
const BASE_MAX_SPEED = 42; // px/s at speed=1, gravity=0 — matches the original ambient network's drift ceiling
const REST_EPS = 6;        // px/s, below this + resting on floor -> extra floor friction

export class Simulation {
  constructor(canvas, state){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.balls = [];
    this.dpr = 1;
    this.w = 0; this.h = 0;
    this.mouse = { x: -9999, y: -9999, active: false };
    this.raf = 0;
    this._last = 0;
    this._onResize = () => this.resize();
    this._onMove = e => { this.mouse.x = e.clientX * this.dpr; this.mouse.y = e.clientY * this.dpr; this.mouse.active = true; };
    this._onLeave = () => { this.mouse.active = false; };
    addEventListener('resize', this._onResize, { passive: true });
    addEventListener('mousemove', this._onMove, { passive: true });
    addEventListener('mouseout', this._onLeave, { passive: true });
    this.resize();
  }

  resize(){
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.width = Math.floor(innerWidth * this.dpr);
    this.h = this.canvas.height = Math.floor(innerHeight * this.dpr);
    this.canvas.style.width = innerWidth + 'px';
    this.canvas.style.height = innerHeight + 'px';
    this.rebuild();
  }

  rebuild(){
    const { count, size } = this.state;
    const prev = this.balls;
    this.balls = [];
    for(let i = 0; i < count; i++){
      const old = prev[i];
      const r = (size + (i % 5 - 2) * (size * 0.12)) * this.dpr;
      if(old){ this.balls.push({ ...old, r }); continue; }
      this.balls.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 13.2 * this.dpr,
        vy: (Math.random() - 0.5) * 13.2 * this.dpr,
        r,
        hue: Math.floor(Math.random() * 5),
      });
    }
  }

  setState(patch){
    const countOrSizeChanged = ('count' in patch && patch.count !== this.state.count) || ('size' in patch && patch.size !== this.state.size);
    Object.assign(this.state, patch);
    if(countOrSizeChanged) this.rebuild();
  }

  start(){
    if(this.raf) return;
    this._last = performance.now();
    const loop = now => {
      const dt = Math.min((now - this._last) / 1000, 0.033);
      this._last = now;
      this.step(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(){
    if(this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy(){
    this.stop();
    removeEventListener('resize', this._onResize);
    removeEventListener('mousemove', this._onMove);
    removeEventListener('mouseout', this._onLeave);
  }

  step(dt){
    const s = this.state;
    const dpr = this.dpr;
    const dtS = dt * s.speed;
    const gravityAccel = s.gravity * GRAVITY_SCALE * dpr;
    const cap = BASE_MAX_SPEED * dpr * s.speed * (1 + Math.abs(s.gravity));
    const mr = s.mouseRadius * dpr;
    const mouseOn = s.mouseMode !== 'none' && this.mouse.active;
    const mouseSign = s.mouseMode === 'attract' ? -1 : 1;

    for(const b of this.balls){
      b.vy += gravityAccel * dtS;

      if(mouseOn){
        const dx = b.x - this.mouse.x, dy = b.y - this.mouse.y;
        const d = Math.hypot(dx, dy) || 1;
        if(d < mr){
          const f = (1 - d / mr) * s.mouseStrength * 900 * dpr * mouseSign;
          b.vx += (dx / d) * f * dtS;
          b.vy += (dy / d) * f * dtS;
        }
      }

      const sp = Math.hypot(b.vx, b.vy);
      if(sp > cap){ b.vx = (b.vx / sp) * cap; b.vy = (b.vy / sp) * cap; }

      b.x += b.vx * dtS;
      b.y += b.vy * dtS;

      if(b.x - b.r < 0){ b.x = b.r; b.vx = -b.vx * s.bounce; }
      else if(b.x + b.r > this.w){ b.x = this.w - b.r; b.vx = -b.vx * s.bounce; }
      if(b.y - b.r < 0){ b.y = b.r; b.vy = -b.vy * s.bounce; }
      else if(b.y + b.r > this.h){
        b.y = this.h - b.r; b.vy = -b.vy * s.bounce;
        if(Math.abs(b.vy) < REST_EPS * dpr) b.vx *= 0.985;
      }
    }

    if(s.collisions) this._resolveCollisions();
  }

  // uniform-grid broad phase so collisions stay smooth at high ball counts
  _resolveCollisions(){
    const balls = this.balls;
    if(balls.length < 2) return;
    let maxR = 0;
    for(const b of balls) if(b.r > maxR) maxR = b.r;
    const cell = maxR * 2.2;
    const cols = Math.max(1, Math.ceil(this.w / cell));
    const grid = new Map();
    const key = (cx, cy) => cx + ',' + cy;

    for(let i = 0; i < balls.length; i++){
      const b = balls[i];
      const cx = Math.floor(b.x / cell), cy = Math.floor(b.y / cell);
      const k = key(cx, cy);
      if(!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }

    const checked = new Set();
    for(let i = 0; i < balls.length; i++){
      const a = balls[i];
      const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
      for(let ox = -1; ox <= 1; ox++){
        for(let oy = -1; oy <= 1; oy++){
          const bucket = grid.get(key(cx + ox, cy + oy));
          if(!bucket) continue;
          for(const j of bucket){
            if(j <= i) continue;
            const pairKey = i * balls.length + j;
            if(checked.has(pairKey)) continue;
            checked.add(pairKey);
            this._collidePair(a, balls[j]);
          }
        }
      }
    }
  }

  _collidePair(a, b){
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const minDist = a.r + b.r;
    if(dist >= minDist) return;
    const nx = dx / dist, ny = dy / dist;
    const overlap = (minDist - dist) / 2;
    a.x -= nx * overlap; a.y -= ny * overlap;
    b.x += nx * overlap; b.y += ny * overlap;

    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if(rel > 0) return; // already separating
    const restitution = this.state.bounce;
    const impulse = -(1 + restitution) * rel / 2;
    a.vx -= impulse * nx; a.vy -= impulse * ny;
    b.vx += impulse * nx; b.vy += impulse * ny;
  }

  draw(){
    const ctx = this.ctx, s = this.state;
    ctx.clearRect(0, 0, this.w, this.h);
    const colors = ballColors(s.palette, s.theme);
    const dpr = this.dpr;

    if(s.links){
      const lk = s.linkDistance * dpr;
      ctx.lineWidth = dpr;
      for(let i = 0; i < this.balls.length; i++){
        const a = this.balls[i];
        for(let j = i + 1; j < this.balls.length; j++){
          const b = this.balls[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if(d < lk){
            ctx.strokeStyle = hexA(colors[a.hue % colors.length], 0.28 * (1 - d / lk));
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
    }

    if(s.mouseMode !== 'none' && this.mouse.active){
      const mr = s.mouseRadius * dpr;
      ctx.lineWidth = 1.1 * dpr;
      for(const b of this.balls){
        const dx = b.x - this.mouse.x, dy = b.y - this.mouse.y, d = Math.hypot(dx, dy);
        if(d < mr){
          ctx.strokeStyle = hexA(colors[b.hue % colors.length], 0.45 * (1 - d / mr));
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(this.mouse.x, this.mouse.y); ctx.stroke();
        }
      }
    }

    for(const b of this.balls){
      const color = colors[b.hue % colors.length];
      ctx.beginPath();
      ctx.ellipse(b.x + b.r * 0.35, b.y + b.r * 0.55, b.r * 0.9, b.r * 0.5, 0, 0, 6.2832);
      ctx.fillStyle = s.theme === 'dark' ? 'rgba(0,0,0,.45)' : 'rgba(50,38,24,.18)';
      ctx.fill();

      const grad = ctx.createRadialGradient(
        b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.15,
        b.x, b.y, b.r * 1.05
      );
      grad.addColorStop(0, lighten(color, s.theme === 'dark' ? 30 : 40));
      grad.addColorStop(0.55, color);
      grad.addColorStop(1, darken(color, s.theme === 'dark' ? 12 : 22));
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, 6.2832);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }
}

function hexToRgb(hex){
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hexA(hex, a){
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
function lighten(hex, amt){
  const [r, g, b] = hexToRgb(hex);
  const f = c => Math.min(255, c + amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function darken(hex, amt){
  const [r, g, b] = hexToRgb(hex);
  const f = c => Math.max(0, c - amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
