// Background animations. All drawn in code on a <canvas>: no images, no
// outside art. Each scene gets the palette (base + 3 colors), a speed, and an
// "amount" (0-100) that sets how busy or bright it is.

const TAU = Math.PI * 2;

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, a))})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round);

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sprite(rgb, size = 64, hard = 0) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, rgba(rgb, 1));
  grad.addColorStop(Math.min(0.95, 0.15 + hard), rgba(rgb, 0.55 + hard * 0.4));
  grad.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function baseFill(ctx, w, h, p, glowAmt = 0.18) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = rgba(p.base, 1);
  ctx.fillRect(0, 0, w, h);
  if (glowAmt > 0) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.75);
    g.addColorStop(0, rgba(mix(p.base, p.c1, 0.5), glowAmt));
    g.addColorStop(1, rgba(p.base, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

// ---------------------------------------------------------------- scenes
const scenes = {};

scenes.none = {
  scale: 0.5,
  init() {},
  draw(ctx, w, h, t, s) { baseFill(ctx, w, h, s.p, 0.1 + s.amt * 0.3); },
  still: true,
};

scenes.glow = {
  scale: 0.2,
  init(s) {
    const r = rng(7);
    const cols = [s.p.c1, s.p.c2, s.p.c3, s.p.c1, s.p.c3, s.p.c2];
    s.blobs = cols.map((c, i) => ({
      c, ax: 0.25 + r() * 0.3, ay: 0.2 + r() * 0.3, fx: 0.03 + r() * 0.05, fy: 0.025 + r() * 0.05,
      ph: r() * TAU, rad: 0.35 + r() * 0.3, k: i,
    }));
  },
  draw(ctx, w, h, t, s) {
    baseFill(ctx, w, h, s.p, 0);
    ctx.globalCompositeOperation = 'lighter';
    const m = Math.max(w, h);
    for (const b of s.blobs) {
      const x = w * (0.5 + b.ax * Math.sin(t * b.fx * TAU + b.ph));
      const y = h * (0.5 + b.ay * Math.cos(t * b.fy * TAU + b.ph * 1.3));
      const rad = m * b.rad * (0.9 + 0.1 * Math.sin(t * 0.2 + b.k));
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, rgba(b.c, 0.07 + s.amt * 0.2));
      g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  },
};

scenes.candles = {
  scale: 0.5,
  init(s) {
    const r = rng(11);
    const n = Math.round(18 + s.amt * 50);
    const cols = [s.p.c2, s.p.c2, s.p.c1, s.p.c3];
    s.spr = cols.map((c) => sprite(c, 96, 0.45));
    s.dots = Array.from({ length: n }, () => ({
      x: r(), y: r(), z: 0.3 + r() * 0.7, k: Math.floor(r() * cols.length),
      vx: (r() - 0.5) * 0.008, vy: -0.004 - r() * 0.01, ph: r() * TAU, fl: 0.6 + r() * 1.6,
    }));
  },
  draw(ctx, w, h, t, s, dt) {
    baseFill(ctx, w, h, s.p, 0.25);
    ctx.globalCompositeOperation = 'lighter';
    const m = Math.min(w, h);
    for (const d of s.dots) {
      d.x += d.vx * dt * d.z; d.y += d.vy * dt * d.z;
      if (d.y < -0.15) { d.y = 1.15; d.x = Math.random(); }
      if (d.x < -0.15) d.x = 1.15; else if (d.x > 1.15) d.x = -0.15;
      const size = m * (0.04 + d.z * 0.13);
      const a = (0.08 + 0.22 * d.z) * (0.75 + 0.25 * Math.sin(t * d.fl + d.ph)) * (0.5 + s.amt);
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(s.spr[d.k], d.x * w - size / 2, d.y * h - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  },
};

scenes.snow = {
  scale: 1,
  init(s) {
    const r = rng(5);
    const n = Math.round(50 + s.amt * 250);
    s.spr = sprite([255, 255, 255], 32, 0.25);
    s.flakes = Array.from({ length: n }, () => ({
      x: r(), y: r(), z: Math.pow(r(), 1.6), ph: r() * TAU, sw: 0.4 + r(),
    }));
  },
  draw(ctx, w, h, t, s, dt) {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(s.p.base, 1));
    g.addColorStop(1, rgba(mix(s.p.base, s.p.c3, 0.22), 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const m = Math.min(w, h);
    for (const f of s.flakes) {
      const sp = 0.02 + f.z * 0.07;
      f.y += sp * dt;
      if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); }
      const x = (f.x + Math.sin(t * 0.5 * f.sw + f.ph) * 0.015 * (0.5 + f.z)) * w;
      const size = m * (0.0025 + f.z * 0.009);
      ctx.globalAlpha = 0.3 + f.z * 0.55;
      ctx.drawImage(s.spr, x - size, f.y * h - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
  },
};

scenes.waters = {
  scale: 0.6,
  init(s) {
    const r = rng(3);
    s.layers = [0, 1, 2, 3, 4].map((i) => ({
      y: 0.58 + i * 0.09, a1: 0.018 + r() * 0.02, a2: 0.008 + r() * 0.01,
      f1: 1.2 + r() * 1.5, f2: 3 + r() * 3, sp: (0.12 + r() * 0.15) * (i % 2 ? -1 : 1), ph: r() * TAU, i,
    }));
    s.glints = Array.from({ length: 40 }, () => ({ x: r(), y: 0.6 + r() * 0.4, ph: r() * TAU, f: 0.5 + r() * 1.5 }));
  },
  draw(ctx, w, h, t, s) {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(s.p.base, 1));
    g.addColorStop(0.6, rgba(mix(s.p.base, s.p.c1, 0.25), 1));
    g.addColorStop(1, rgba(s.p.base, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // horizon light
    const hg = ctx.createRadialGradient(w * 0.5, h * 0.58, 0, w * 0.5, h * 0.58, w * 0.6);
    hg.addColorStop(0, rgba(s.p.c2, 0.1 + s.amt * 0.25));
    hg.addColorStop(1, rgba(s.p.c2, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);
    const cols = [s.p.c3, s.p.c1, s.p.c3, s.p.c1, s.p.base];
    for (const L of s.layers) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      const step = Math.max(4, w / 120);
      for (let x = 0; x <= w + step; x += step) {
        const u = x / w;
        const y = L.y + L.a1 * Math.sin(u * L.f1 * TAU + t * L.sp + L.ph) + L.a2 * Math.sin(u * L.f2 * TAU - t * L.sp * 1.7);
        ctx.lineTo(x, y * h);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      const c = mix(s.p.base, cols[L.i], 0.35 - L.i * 0.05);
      ctx.fillStyle = rgba(c, 0.35 + 0.1 * L.i);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const gl of s.glints) {
      const a = Math.max(0, Math.sin(t * gl.f + gl.ph)) ** 6 * (0.2 + s.amt * 0.6);
      if (a < 0.01) continue;
      ctx.fillStyle = rgba(s.p.c2, a);
      ctx.fillRect(gl.x * w, gl.y * h, w * 0.012, Math.max(1, h * 0.0025));
    }
  },
};

scenes.rays = {
  scale: 0.35,
  init(s) {
    const r = rng(9);
    s.rays = Array.from({ length: 11 }, (_, i) => ({
      a: -0.62 + i * 0.124 + (r() - 0.5) * 0.06, wdt: 0.03 + r() * 0.05, ph: r() * TAU, f: 0.08 + r() * 0.12,
    }));
    s.spr = sprite(s.p.c2, 32, 0.3);
    s.motes = Array.from({ length: Math.round(20 + s.amt * 60) }, () => ({ x: r(), y: r(), z: r(), ph: r() * TAU }));
  },
  draw(ctx, w, h, t, s, dt) {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(mix(s.p.base, s.p.c1, 0.35), 1));
    g.addColorStop(1, rgba(s.p.base, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const ox = w * 0.5, oy = -h * 0.25, len = Math.hypot(w, h) * 1.4;
    for (const r of s.rays) {
      const sway = Math.sin(t * r.f + r.ph) * 0.03;
      const a = r.a + sway;
      const wd = r.wdt * (0.8 + 0.2 * Math.sin(t * 0.3 + r.ph));
      const alpha = (0.05 + s.amt * 0.16) * (0.6 + 0.4 * Math.sin(t * r.f * 2 + r.ph));
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.sin(a - wd) * len, oy + Math.cos(a - wd) * len);
      ctx.lineTo(ox + Math.sin(a + wd) * len, oy + Math.cos(a + wd) * len);
      ctx.closePath();
      const rg = ctx.createLinearGradient(ox, oy, ox, oy + len * 0.6);
      rg.addColorStop(0, rgba(s.p.c2, alpha * 1.6));
      rg.addColorStop(1, rgba(s.p.c2, 0));
      ctx.fillStyle = rg;
      ctx.fill();
    }
    const m = Math.min(w, h);
    for (const d of s.motes) {
      d.y -= 0.004 * dt * (0.3 + d.z); d.x += Math.sin(t * 0.3 + d.ph) * 0.0006;
      if (d.y < -0.05) { d.y = 1.05; d.x = Math.random(); }
      const size = m * (0.006 + d.z * 0.012);
      ctx.globalAlpha = 0.15 + 0.35 * d.z * (0.6 + 0.4 * Math.sin(t + d.ph));
      ctx.drawImage(s.spr, d.x * w - size, d.y * h - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
  },
};

scenes.aurora = {
  scale: 0.25,
  init(s) {
    const r = rng(21);
    s.bands = [s.p.c1, s.p.c3, s.p.c2].map((c, i) => ({
      c, y: 0.32 + i * 0.12, f1: 0.6 + r() * 0.8, f2: 1.6 + r() * 1.6, ph: r() * TAU, sp: 0.05 + r() * 0.05, hgt: 0.25 + r() * 0.15,
    }));
  },
  draw(ctx, w, h, t, s) {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(s.p.base, 1));
    g.addColorStop(1, rgba(mix(s.p.base, s.p.c3, 0.15), 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const step = Math.max(1, Math.floor(w / 160));
    for (const b of s.bands) {
      const bh = h * b.hgt;
      const grad = ctx.createLinearGradient(0, -bh, 0, 0);
      grad.addColorStop(0, rgba(b.c, 0));
      grad.addColorStop(0.75, rgba(b.c, 0.5));
      grad.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = grad;
      for (let x = 0; x < w; x += step) {
        const u = x / w;
        const y = h * (b.y + 0.06 * Math.sin(u * b.f1 * TAU + t * b.sp * TAU + b.ph) + 0.025 * Math.sin(u * b.f2 * TAU - t * b.sp * 1.3 * TAU));
        // curtain shimmer along x
        const shimmer = 0.5 + 0.5 * Math.sin(u * 11 + t * 0.6 + b.ph) * Math.sin(u * 4.3 - t * 0.35);
        ctx.globalAlpha = (0.12 + s.amt * 0.5) * (0.45 + 0.55 * shimmer);
        ctx.setTransform(1, 0, 0, 1, 0, y);
        ctx.fillRect(x, -bh, step, bh * 1.15);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  },
};

scenes.embers = {
  scale: 0.75,
  init(s) {
    const r = rng(13);
    s.sprA = sprite(s.p.c2, 48, 0.55);
    s.sprB = sprite(s.p.c1, 48, 0.4);
    s.n = Math.round(40 + s.amt * 160);
    s.parts = Array.from({ length: s.n }, () => this.spawn(r, true));
    s.r = r;
  },
  spawn(r, anywhere) {
    return { x: r(), y: anywhere ? r() * 1.1 : 1.05 + r() * 0.1, z: 0.3 + r() * 0.7, ph: r() * TAU, life: r(), sw: 0.5 + r() * 1.5, b: r() > 0.4 };
  },
  draw(ctx, w, h, t, s, dt) {
    baseFill(ctx, w, h, s.p, 0);
    const bg = ctx.createLinearGradient(0, h, 0, h * 0.35);
    bg.addColorStop(0, rgba(s.p.c1, 0.18 + s.amt * 0.25));
    bg.addColorStop(1, rgba(s.p.c1, 0));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const m = Math.min(w, h);
    for (let i = 0; i < s.parts.length; i++) {
      const p = s.parts[i];
      p.y -= (0.03 + p.z * 0.06) * dt;
      p.x += Math.sin(t * p.sw + p.ph) * 0.0009 * p.z;
      if (p.y < -0.05) s.parts[i] = this.spawn(s.r, false);
      const fade = Math.min(1, Math.max(0, (p.y - 0.0) * 1.4));
      const flick = 0.6 + 0.4 * Math.sin(t * 7 * p.sw + p.ph);
      const size = m * (0.006 + p.z * 0.02);
      ctx.globalAlpha = fade * flick * (0.4 + 0.6 * p.z);
      ctx.drawImage(p.b ? s.sprA : s.sprB, p.x * w - size, p.y * h - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
  },
};

scenes.nightsky = {
  scale: 1,
  init(s) {
    const r = rng(17);
    s.stars = Array.from({ length: Math.round(150 + s.amt * 450) }, () => ({
      x: r() * 1.6 - 0.3, y: r() * 1.6 - 0.3, z: Math.pow(r(), 3), ph: r() * TAU, f: 0.5 + r() * 2.5,
      c: r() > 0.85 ? 2 : r() > 0.8 ? 3 : 0,
    }));
    s.shoot = null;
    s.nextShoot = 3 + r() * 5;
    s.r = r;
  },
  draw(ctx, w, h, t, s) {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(s.p.base, 1));
    g.addColorStop(1, rgba(mix(s.p.base, s.p.c3, 0.28), 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // faint glowing band across the sky
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.35);
    const band = ctx.createLinearGradient(0, -h * 0.3, 0, h * 0.3);
    band.addColorStop(0, rgba(s.p.c1, 0));
    band.addColorStop(0.5, rgba(s.p.c1, 0.05 + s.amt * 0.1));
    band.addColorStop(1, rgba(s.p.c1, 0));
    ctx.fillStyle = band;
    ctx.fillRect(-w, -h * 0.3, w * 2, h * 0.6);
    ctx.restore();
    // slow rotation of the whole sky
    const rot = t * 0.004;
    const cx = w * 0.5, cy = h * 1.2;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const m = Math.min(w, h);
    const cols = [[255, 255, 255], null, s.p.c2, s.p.c3];
    for (const st of s.stars) {
      const px = st.x * w - cx, py = st.y * h - cy;
      const x = cx + px * cos - py * sin, y = cy + px * sin + py * cos;
      if (x < -5 || y < -5 || x > w + 5 || y > h + 5) continue;
      const tw = 0.55 + 0.45 * Math.sin(t * st.f + st.ph);
      const size = Math.max(0.6, m * (0.0008 + st.z * 0.0032));
      ctx.fillStyle = rgba(cols[st.c] || cols[0], (0.25 + 0.75 * st.z) * tw);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }
    // shooting star
    if (!s.shoot && t > s.nextShoot && s.amt > 0.05) {
      s.shoot = { x: 0.1 + s.r() * 0.7, y: 0.05 + s.r() * 0.3, t0: t, a: 0.35 + s.r() * 0.3 };
    }
    if (s.shoot) {
      const k = (t - s.shoot.t0) / 1.1;
      if (k > 1) { s.shoot = null; s.nextShoot = t + (14 - s.amt * 9) + s.r() * 6; } else {
        const L = m * 0.25;
        const x = (s.shoot.x + k * 0.3) * w, y = (s.shoot.y + k * 0.3 * Math.tan(s.shoot.a)) * h;
        const dx = Math.cos(s.shoot.a), dy = Math.sin(s.shoot.a);
        const lg = ctx.createLinearGradient(x, y, x - dx * L, y - dy * L);
        lg.addColorStop(0, `rgba(255,255,255,${0.9 * Math.sin(k * Math.PI)})`);
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = lg;
        ctx.lineWidth = Math.max(1, m * 0.002);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - dx * L, y - dy * L);
        ctx.stroke();
      }
    }
  },
};

scenes.glass = {
  scale: 0.5,
  init(s) {
    s.r = rng(31);
    s.cells = null;
  },
  build(w, h, s) {
    const r = rng(31);
    const cols = Math.max(6, Math.round(w / (Math.min(w, h) / 6)));
    const rows = 6;
    const pts = [];
    for (let j = 0; j <= rows; j++) {
      const row = [];
      for (let i = 0; i <= cols; i++) {
        const edgeX = i === 0 || i === cols, edgeY = j === 0 || j === rows;
        row.push([
          (i + (edgeX ? 0 : (r() - 0.5) * 0.7)) / cols * w,
          (j + (edgeY ? 0 : (r() - 0.5) * 0.7)) / rows * h,
        ]);
      }
      pts.push(row);
    }
    const palette = [s.p.c1, s.p.c2, s.p.c3, mix(s.p.c1, s.p.c3, 0.5), mix(s.p.c1, s.p.base, 0.4)];
    const cells = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i + 1], d = pts[j + 1][i];
      const flip = r() > 0.5;
      const tris = flip ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const tri of tris) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const k = r();
        cells.push({ tri, cx, cy, c: palette[k < 0.08 ? 1 : Math.floor(r() * palette.length)], ph: r() * TAU });
      }
    }
    s.cells = cells; s.bw = w; s.bh = h;
  },
  draw(ctx, w, h, t, s) {
    if (!s.cells || s.bw !== w || s.bh !== h) this.build(w, h, s);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba(mix(s.p.base, [0, 0, 0], 0.4), 1);
    ctx.fillRect(0, 0, w, h);
    const diag = w + h;
    // a soft band of light sweeps across the glass
    const sweep = ((t * 0.05) % 1.6 - 0.3) * diag;
    for (const c of s.cells) {
      const d = (c.cx + c.cy - sweep) / (diag * 0.25);
      const light = Math.exp(-d * d);
      const shimmer = 0.5 + 0.5 * Math.sin(t * 0.6 + c.ph);
      ctx.fillStyle = rgba(c.c, 0.14 + s.amt * 0.25 + light * (0.25 + s.amt * 0.35) + shimmer * 0.06);
      ctx.beginPath();
      ctx.moveTo(c.tri[0][0], c.tri[0][1]);
      ctx.lineTo(c.tri[1][0], c.tri[1][1]);
      ctx.lineTo(c.tri[2][0], c.tri[2][1]);
      ctx.closePath();
      ctx.fill();
    }
    // lead lines
    ctx.strokeStyle = rgba(mix(s.p.base, [0, 0, 0], 0.6), 0.95);
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.006);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const c of s.cells) {
      ctx.moveTo(c.tri[0][0], c.tri[0][1]);
      ctx.lineTo(c.tri[1][0], c.tri[1][1]);
      ctx.lineTo(c.tri[2][0], c.tri[2][1]);
      ctx.closePath();
    }
    ctx.stroke();
  },
};

scenes.halo = {
  scale: 0.75,
  init(s) {
    const r = rng(41);
    const cols = [s.p.c1, s.p.c2, s.p.c3];
    s.rings = Array.from({ length: 7 }, (_, i) => ({
      rad: 0.16 + i * 0.075, sp: (0.02 + r() * 0.05) * (i % 2 ? -1 : 1), dash: 2 + Math.floor(r() * 10),
      gap: 0.3 + r() * 0.8, c: cols[i % 3], lw: 0.002 + r() * 0.006, ph: r() * TAU,
    }));
  },
  draw(ctx, w, h, t, s) {
    baseFill(ctx, w, h, s.p, 0.2);
    const cx = w / 2, cy = h / 2, m = Math.min(w, h);
    // soft pulse once per second
    const frac = (Date.now() % 1000) / 1000;
    const pulse = Math.exp(-frac * 3.5);
    const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.75);
    pg.addColorStop(0, rgba(s.p.c2, (0.05 + s.amt * 0.12) * (0.6 + 0.4 * pulse)));
    pg.addColorStop(1, rgba(s.p.c2, 0));
    ctx.fillStyle = pg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const r of s.rings) {
      const R = m * r.rad * (1 + 0.015 * pulse);
      const circ = TAU * R;
      const seg = circ / (r.dash * 2);
      ctx.setLineDash([seg * (1 - r.gap * 0.5), seg * r.gap]);
      ctx.lineWidth = m * r.lw;
      ctx.strokeStyle = rgba(r.c, 0.18 + s.amt * 0.45);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * r.sp * TAU + r.ph);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);
  },
};

// ================================================================ EPIC scenes
// Big, bold shapes with strong motion. Kept to large glowing forms (not tiny
// noise) so they still look good after livestream video compression.
// `s.urg` (0..1) rises in the final minute so the scene builds toward zero.

const fade = (ctx, w, h, p, a) => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(p.base, a);
  ctx.fillRect(0, 0, w, h);
};

scenes.lightspeed = {
  scale: 0.6,
  init(s) {
    const r = rng(101);
    s.r = r;
    s.n = Math.round(160 + s.amt * 420);
    s.stars = Array.from({ length: s.n }, () => this.spawn(r, true));
    s.cols = [s.p.c1, s.p.c2, s.p.c3, [255, 255, 255]];
    s.fresh = true;
  },
  spawn(r, anywhere) {
    return { a: r() * TAU, z: anywhere ? 0.05 + r() * 1 : 1, k: Math.floor(r() * 4), v: 0.25 + r() * 0.5 };
  },
  draw(ctx, w, h, t, s, dt) {
    if (s.fresh || !dt) { baseFill(ctx, w, h, s.p, 0); s.fresh = false; }
    fade(ctx, w, h, s.p, 0.32);
    const cx = w / 2 + Math.sin(t * 0.21) * w * 0.03, cy = h / 2 + Math.cos(t * 0.17) * h * 0.03;
    const m = Math.max(w, h);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.45);
    g.addColorStop(0, rgba(s.p.c2, 0.18 + 0.2 * s.urg));
    g.addColorStop(0.4, rgba(s.p.c1, 0.08));
    g.addColorStop(1, rgba(s.p.c1, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const spd = 1 + s.urg * 2.5;
    for (let i = 0; i < s.stars.length; i++) {
      const st = s.stars[i];
      const z0 = st.z;
      st.z -= st.v * dt * 0.55 * spd;
      if (st.z <= 0.02) { s.stars[i] = this.spawn(s.r, false); continue; }
      const r0 = (0.06 / z0) * m * 0.5, r1 = (0.06 / st.z) * m * 0.5;
      if (r0 > m) continue;
      const x0 = cx + Math.cos(st.a) * r0, y0 = cy + Math.sin(st.a) * r0;
      const x1 = cx + Math.cos(st.a) * r1, y1 = cy + Math.sin(st.a) * r1;
      const near = 1 - st.z;
      ctx.strokeStyle = rgba(s.cols[st.k], 0.25 + near * 0.75);
      ctx.lineWidth = Math.max(1, near * near * m * 0.006);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1 + (x1 - x0) * 0.6, y1 + (y1 - y0) * 0.6);
      ctx.stroke();
    }
  },
};

scenes.arena = {
  scale: 0.45,
  init(s) {
    const r = rng(77);
    const cols = [s.p.c1, s.p.c2, s.p.c3];
    s.beams = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      s.beams.push({ x: (i + 0.5) / n, y: 1.04, base: -Math.PI / 2, sw: 0.35 + r() * 0.25, f: 0.12 + r() * 0.18, ph: r() * TAU, c: cols[i % 3], wd: 0.05 + r() * 0.03 });
    }
    for (let i = 0; i < 4; i++) {
      s.beams.push({ x: 0.12 + i * 0.25, y: -0.04, base: Math.PI / 2, sw: 0.5, f: 0.09 + r() * 0.1, ph: r() * TAU, c: cols[(i + 1) % 3], wd: 0.04 });
    }
    s.haze = Array.from({ length: 10 }, () => ({ x: r(), y: 0.3 + r() * 0.7, rad: 0.25 + r() * 0.3, sp: 0.01 + r() * 0.02 }));
  },
  draw(ctx, w, h, t, s, dt) {
    baseFill(ctx, w, h, s.p, 0);
    const m = Math.max(w, h);
    ctx.globalCompositeOperation = 'lighter';
    // haze
    for (const hz of s.haze) {
      hz.x += hz.sp * dt; if (hz.x > 1.3) hz.x = -0.3;
      const g = ctx.createRadialGradient(hz.x * w, hz.y * h, 0, hz.x * w, hz.y * h, hz.rad * m);
      g.addColorStop(0, rgba(s.p.c3, 0.05 + s.amt * 0.05));
      g.addColorStop(1, rgba(s.p.c3, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    const len = m * 1.3;
    const boost = 1 + s.urg * 1.5;
    for (const b of s.beams) {
      const a = b.base + Math.sin(t * b.f * TAU * boost + b.ph) * b.sw;
      const ox = b.x * w, oy = b.y * h;
      const alpha = (0.1 + s.amt * 0.22) * (0.75 + 0.25 * Math.sin(t * 1.3 + b.ph)) * (1 + s.urg * 0.6);
      const ex1 = ox + Math.cos(a - b.wd) * len, ey1 = oy + Math.sin(a - b.wd) * len;
      const ex2 = ox + Math.cos(a + b.wd) * len, ey2 = oy + Math.sin(a + b.wd) * len;
      const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * len * 0.8, oy + Math.sin(a) * len * 0.8);
      g.addColorStop(0, rgba(b.c, alpha * 2.2));
      g.addColorStop(0.5, rgba(b.c, alpha * 0.7));
      g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ex1, ey1);
      ctx.lineTo(ex2, ey2);
      ctx.closePath();
      ctx.fill();
      // source flare
      const fg = ctx.createRadialGradient(ox, oy, 0, ox, oy, m * 0.06);
      fg.addColorStop(0, rgba([255, 255, 255], 0.5 * alpha * 4));
      fg.addColorStop(0.3, rgba(b.c, 0.4 * alpha * 4));
      fg.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = fg;
      ctx.fillRect(ox - m * 0.06, oy - m * 0.06, m * 0.12, m * 0.12);
    }
  },
};

scenes.galaxy = {
  scale: 0.7,
  init(s) {
    const r = rng(55);
    const n = Math.round(1200 + s.amt * 2200);
    s.pts = Array.from({ length: n }, () => {
      const rad = Math.pow(r(), 0.7);
      const arm = Math.floor(r() * 3);
      return { rad, a: arm * (TAU / 3) + rad * 5.2 + (r() - 0.5) * (0.7 - rad * 0.4), z: r(), sz: 0.5 + r() * 1.5 };
    });
    s.bg = Array.from({ length: 120 }, () => ({ x: r(), y: r(), z: r() }));
  },
  draw(ctx, w, h, t, s) {
    baseFill(ctx, w, h, s.p, 0.1);
    const cx = w / 2, cy = h / 2, m = Math.min(w, h) * 0.62 * (w > h ? 1.25 : 1);
    for (const b of s.bg) { ctx.fillStyle = rgba([255, 255, 255], 0.15 + b.z * 0.4); ctx.fillRect(b.x * w, b.y * h, 1.2, 1.2); }
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.75);
    core.addColorStop(0, rgba([255, 255, 255], 0.6 + s.urg * 0.3));
    core.addColorStop(0.1, rgba(s.p.c2, 0.45));
    core.addColorStop(0.45, rgba(s.p.c1, 0.16));
    core.addColorStop(1, rgba(s.p.c1, 0));
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);
    const tilt = 0.5, rot = t * 0.06 * (1 + s.urg * 2);
    const cr = Math.cos(-0.35), sr = Math.sin(-0.35);
    for (const p of s.pts) {
      const ang = p.a + rot / (0.25 + p.rad);
      const x = Math.cos(ang) * p.rad * m, y = Math.sin(ang) * p.rad * m * tilt;
      const X = cx + x * cr - y * sr, Y = cy + x * sr + y * cr;
      const col = p.rad < 0.18 ? s.p.c2 : p.rad < 0.55 ? s.p.c1 : s.p.c3;
      ctx.fillStyle = rgba(col, Math.min(1, (0.55 + p.z * 0.6) * (1.2 - p.rad * 0.5)));
      const sz = p.sz * Math.max(1.4, m / 320);
      ctx.fillRect(X, Y, sz, sz);
    }
  },
};

scenes.tunnel = {
  scale: 0.55,
  init(s) {
    s.rings = Array.from({ length: 22 }, (_, i) => ({ z: (i + 1) / 22 }));
    s.cols = [s.p.c1, s.p.c2, s.p.c3];
    s.count = 0;
  },
  draw(ctx, w, h, t, s, dt) {
    baseFill(ctx, w, h, s.p, 0);
    const m = Math.max(w, h);
    const spd = (0.12 + s.amt * 0.12) * (1 + s.urg * 2);
    const cx = w / 2 + Math.sin(t * 0.35) * w * 0.08, cy = h / 2 + Math.cos(t * 0.27) * h * 0.08;
    const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.25);
    vg.addColorStop(0, rgba(s.p.c2, 0.35));
    vg.addColorStop(1, rgba(s.p.c2, 0));
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    for (const r of s.rings) {
      r.z -= spd * dt;
      if (r.z <= 0.02) { r.z += 1; s.count++; r.k = s.count % 3; }
    }
    const sorted = [...s.rings].sort((a, b) => b.z - a.z);
    for (const r of sorted) {
      const size = (0.09 / r.z) * m * 0.5;
      if (size > m * 2) continue;
      // centre drifts with depth to feel like flying through a curve
      const px = w / 2 + (cx - w / 2) * r.z * 1.6, py = h / 2 + (cy - h / 2) * r.z * 1.6;
      const near = 1 - r.z;
      const col = s.cols[(r.k ?? Math.round(r.z * 22)) % 3];
      ctx.strokeStyle = rgba(col, Math.min(1, near * 1.1) * (0.5 + s.amt * 0.5));
      ctx.lineWidth = Math.max(1, near * near * m * 0.012);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(r.z * 2.2 + t * 0.15);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        const x = Math.cos(a) * size * 1.25, y = Math.sin(a) * size;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  },
};

scenes.glory = {
  scale: 0.4,
  init(s) {
    const r = rng(63);
    s.rays = 18;
    s.sparks = Array.from({ length: Math.round(30 + s.amt * 70) }, () => ({ a: r() * TAU, d: r(), v: 0.04 + r() * 0.08, z: r() }));
    s.spr = sprite(s.p.c2, 32, 0.3);
    s.r = r;
  },
  draw(ctx, w, h, t, s, dt) {
    baseFill(ctx, w, h, s.p, 0);
    const cx = w / 2, cy = h * 0.5, m = Math.hypot(w, h);
    const rot = t * 0.05 * (1 + s.urg * 3);
    const frac = (Date.now() % 1000) / 1000;
    const beat = Math.exp(-frac * 4);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < s.rays; i++) {
      const a = rot + i / s.rays * TAU;
      const wd = TAU / s.rays * 0.28;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.7);
      const col = i % 2 ? s.p.c1 : s.p.c2;
      g.addColorStop(0, rgba(col, (0.18 + s.amt * 0.25) * (0.85 + 0.15 * beat)));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, m * 0.7, a - wd, a + wd);
      ctx.closePath();
      ctx.fill();
    }
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.3);
    core.addColorStop(0, rgba([255, 255, 255], 0.35 + 0.15 * beat + s.urg * 0.2));
    core.addColorStop(0.25, rgba(s.p.c2, 0.25));
    core.addColorStop(1, rgba(s.p.c2, 0));
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);
    const mm = Math.min(w, h);
    for (const sp of s.sparks) {
      sp.d += sp.v * dt * (1 + s.urg * 2);
      if (sp.d > 1) { sp.d = 0; sp.a = s.r() * TAU; }
      const R = sp.d * m * 0.55;
      const size = mm * (0.006 + sp.z * 0.012) * (0.5 + sp.d);
      ctx.globalAlpha = Math.sin(sp.d * Math.PI) * (0.4 + sp.z * 0.6);
      ctx.drawImage(s.spr, cx + Math.cos(sp.a) * R - size, cy + Math.sin(sp.a) * R - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
  },
};

scenes.heartbeat = {
  scale: 0.6,
  init() {},
  draw(ctx, w, h, t, s) {
    baseFill(ctx, w, h, s.p, 0);
    const hz = h * 0.58, cx = w / 2;
    const frac = (Date.now() % 1000) / 1000;
    const beat = Math.exp(-frac * 5);
    // horizon glow
    const hg = ctx.createLinearGradient(0, hz - h * 0.35, 0, hz + h * 0.05);
    hg.addColorStop(0, rgba(s.p.c2, 0));
    hg.addColorStop(1, rgba(s.p.c2, 0.22 + 0.15 * beat + s.urg * 0.2));
    ctx.fillStyle = hg;
    ctx.fillRect(0, hz - h * 0.35, w, h * 0.4);
    ctx.globalCompositeOperation = 'lighter';
    // floor grid
    const lw = Math.max(1, h * 0.0025);
    ctx.lineWidth = lw;
    ctx.strokeStyle = rgba(s.p.c1, 0.35 + s.amt * 0.35 + beat * 0.25);
    ctx.beginPath();
    for (let i = -14; i <= 14; i++) {
      ctx.moveTo(cx + i * w * 0.012, hz);
      ctx.lineTo(cx + i * w * 0.16, h);
    }
    const scroll = (t * 0.6 * (1 + s.urg * 2)) % 1;
    for (let j = 0; j < 14; j++) {
      const d = (j + scroll) / 14;
      const y = hz + (h - hz) * d * d;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    // floor fades into the horizon
    ctx.globalCompositeOperation = 'source-over';
    const ff = ctx.createLinearGradient(0, hz, 0, hz + (h - hz) * 0.35);
    ff.addColorStop(0, rgba(s.p.base, 0.9));
    ff.addColorStop(1, rgba(s.p.base, 0));
    ctx.fillStyle = ff;
    ctx.fillRect(0, hz, w, h - hz);
    ctx.globalCompositeOperation = 'lighter';
    // shockwave rings, one per second
    const m = Math.max(w, h);
    for (let k = 0; k < 3; k++) {
      const f = frac + k;
      const R = (f / 3) * m * 0.75;
      ctx.lineWidth = Math.max(1.5, m * 0.006 * (1 - f / 3));
      ctx.strokeStyle = rgba(k === 0 ? s.p.c2 : s.p.c3, (1 - f / 3) ** 2 * (0.35 + s.amt * 0.4));
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.5, R, R * 0.92, 0, 0, TAU);
      ctx.stroke();
    }
  },
};

scenes.fireworks = {
  scale: 0.7,
  init(s) {
    s.r = rng(88);
    s.rockets = [];
    s.sparks = [];
    s.next = 0.3;
    s.cols = [s.p.c1, s.p.c2, s.p.c3, [255, 255, 255]];
    s.fresh = true;
  },
  draw(ctx, w, h, t, s, dt) {
    if (s.fresh || !dt) { baseFill(ctx, w, h, s.p, 0.1); s.fresh = false; if (!dt) { this.burst(s, 0.5, 0.35); this.burst(s, 0.25, 0.3); this.burst(s, 0.75, 0.4); for (let i = 0; i < 12; i++) this.step(ctx, w, h, s, 0.05); } }
    fade(ctx, w, h, s.p, 0.22);
    const rate = (1.5 - s.amt * 1.1) / (1 + s.urg * 2.5);
    s.next -= dt;
    if (s.next <= 0) {
      s.next = rate * (0.4 + s.r());
      const k = s.r() < 0.35 + s.amt * 0.3 ? 2 : 1;
      for (let i = 0; i < k; i++) s.rockets.push({ x: 0.1 + s.r() * 0.8, y: 1.02, vy: -(0.75 + s.r() * 0.35), vx: (s.r() - 0.5) * 0.1, top: 0.12 + s.r() * 0.33, c: s.cols[Math.floor(s.r() * 4)] });
    }
    this.step(ctx, w, h, s, dt);
  },
  burst(s, x, y, c) {
    const n = 90 + Math.floor(s.r() * 60);
    const col = c || s.cols[Math.floor(s.r() * 4)];
    const col2 = s.cols[Math.floor(s.r() * 4)];
    const pw = 0.3 + s.r() * 0.2;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + s.r() * 0.05;
      const v = pw * (0.7 + s.r() * 0.3);
      s.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.45 + s.r() * 0.3, c: s.r() > 0.25 ? col : col2 });
    }
    if (s.sparks.length > 2500) s.sparks.splice(0, s.sparks.length - 2500);
  },
  step(ctx, w, h, s, dt) {
    ctx.globalCompositeOperation = 'lighter';
    const m = Math.min(w, h);
    const ar = w / h;
    for (let i = s.rockets.length - 1; i >= 0; i--) {
      const r = s.rockets[i];
      r.y += r.vy * dt; r.x += r.vx * dt / ar; r.vy += 0.35 * dt;
      ctx.fillStyle = rgba([255, 240, 220], 0.9);
      ctx.fillRect(r.x * w - 1.5, r.y * h - 1.5, 3, 3);
      if (r.y <= r.top || r.vy >= 0) { this.burst(s, r.x, r.y, r.c); s.rockets.splice(i, 1); }
    }
    for (let i = s.sparks.length - 1; i >= 0; i--) {
      const p = s.sparks[i];
      p.x += p.vx * dt / ar; p.y += p.vy * dt;
      p.vx *= 1 - 1.6 * dt; p.vy = p.vy * (1 - 1.6 * dt) + 0.16 * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) { s.sparks.splice(i, 1); continue; }
      const size = Math.max(1.5, m * 0.0065 * Math.sqrt(p.life));
      ctx.fillStyle = rgba(p.c, Math.min(1, p.life * 1.3));
      ctx.fillRect(p.x * w - size / 2, p.y * h - size / 2, size, size);
    }
  },
};

scenes.clouds = {
  scale: 0.3,
  init(s) {
    const r = rng(29);
    s.r = r;
    const cloudCol = mix(mix(s.p.base, [0, 0, 0], 0.2), s.p.c3, 0.3);
    s.puffs = Array.from({ length: 34 }, () => ({ x: r() * 1.4 - 0.2, y: r() * 1.1 - 0.05, rad: 0.12 + r() * 0.2, sp: (0.006 + r() * 0.012), sh: 0.6 + r() * 0.4 }));
    s.spr = sprite(cloudCol, 128, 0.15);
    s.lit = sprite(mix(s.p.c2, [255, 255, 255], 0.3), 128, 0.1);
    s.flash = 0; s.fx = 0.5; s.fy = 0.4;
    s.nextFlash = 4 + r() * 6;
  },
  draw(ctx, w, h, t, s, dt) {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(mix(s.p.base, [0, 0, 0], 0.3), 1));
    g.addColorStop(1, rgba(mix(s.p.base, s.p.c1, 0.25), 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const m = Math.max(w, h);
    // light breaking through behind the clouds
    const beat = 0.85 + 0.15 * Math.sin(t * 0.7);
    const lg = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, m * 0.55);
    lg.addColorStop(0, rgba([255, 255, 255], (0.6 + s.urg * 0.3) * beat));
    lg.addColorStop(0.18, rgba(s.p.c2, 0.45 * beat));
    lg.addColorStop(1, rgba(s.p.c2, 0));
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);
    // light shafts from behind the clouds
    ctx.globalCompositeOperation = 'lighter';
    const lx = w * 0.5, ly = h * 0.42;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU + t * 0.02;
      const wd = 0.06 + 0.03 * Math.sin(t * 0.4 + i);
      const rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, m * 0.8);
      rg.addColorStop(0, rgba(s.p.c2, (0.1 + s.amt * 0.12) * beat));
      rg.addColorStop(1, rgba(s.p.c2, 0));
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, m * 0.8, a - wd, a + wd); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // soft flash inside the clouds now and then (gentle, never a strobe)
    if (dt) {
      s.nextFlash -= dt;
      if (s.nextFlash <= 0 && s.amt > 0.1) { s.flash = 1; s.fx = 0.15 + s.r() * 0.7; s.fy = 0.15 + s.r() * 0.4; s.nextFlash = (12 - s.amt * 7) * (0.6 + s.r() * 0.8) / (1 + s.urg * 2); }
      s.flash = Math.max(0, s.flash - dt * 1.8);
    }
    for (const p of s.puffs) {
      p.x += p.sp * dt; if (p.x - p.rad > 1.2) p.x = -0.2 - p.rad;
      const size = p.rad * m;
      const X = p.x * w - size, Y = p.y * h - size * p.sh;
      ctx.globalAlpha = 0.6 + s.amt * 0.35;
      ctx.drawImage(s.spr, X, Y, size * 2, size * 2 * p.sh);
      const d = Math.hypot(p.x - 0.5, (p.y - 0.42) * 1.3);
      const rim = Math.max(0, 1 - d * 2) * 0.8 + s.flash * Math.max(0, 1 - Math.hypot(p.x - s.fx, p.y - s.fy) * 2.5);
      if (rim > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, rim);
        ctx.drawImage(s.lit, X, Y, size * 2, size * 2 * p.sh);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  },
};

// ---------------------------------------------------------------- runner
const MAX_PIXELS = 1920 * 1080;

export class SceneRunner {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.state = null;
    this.scene = null;
    this.t = 0;
    this.last = 0;
    this.running = false;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.loop = this.loop.bind(this);
  }

  set(bg) {
    const key = JSON.stringify(bg);
    if (key === this.key) return;
    const sceneChanged = !this.bg || this.bg.scene !== bg.scene || this.bg.amount !== bg.amount ||
      ['base', 'c1', 'c2', 'c3'].some((k) => this.bg[k] !== bg[k]);
    this.key = key;
    this.bg = { ...bg };
    this.scene = scenes[bg.scene] || scenes.none;
    if (sceneChanged) {
      this.state = { p: { base: hexToRgb(bg.base), c1: hexToRgb(bg.c1), c2: hexToRgb(bg.c2), c3: hexToRgb(bg.c3) }, amt: bg.amount / 100, urg: this.urg || 0 };
      this.scene.init(this.state);
      this.resize(true);
    }
    this.drawOnce();
  }

  resize(force) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !this.scene) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let scale = this.scene.scale * dpr;
    const px = rect.width * rect.height * scale * scale;
    if (px > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / px);
    const w = Math.max(16, Math.round(rect.width * scale));
    const h = Math.max(16, Math.round(rect.height * scale));
    if (force || w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.drawOnce();
    }
  }

  drawOnce() {
    if (!this.scene || !this.state) return;
    this.scene.draw(this.ctx, this.canvas.width, this.canvas.height, this.t, this.state, 0);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() { this.running = false; }

  // 0..1: how close we are to zero (rises over the final minute).
  setUrgency(u) {
    this.urg = u;
    if (this.state) this.state.urg = u;
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const speed = (this.bg ? this.bg.speed : 1) * (this.reduced ? 0.35 : 1) * (1 + (this.urg || 0) * 0.6);
    this.t += dt * speed;
    if (this.scene && !this.scene.still) {
      this.scene.draw(this.ctx, this.canvas.width, this.canvas.height, this.t, this.state, dt * speed);
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = 1;
    }
    requestAnimationFrame(this.loop);
  }
}

// Draw one still frame of a scene into a small canvas (used for picker cards).
export function renderStill(canvas, bg, t = 6) {
  const scene = scenes[bg.scene] || scenes.none;
  const ctx = canvas.getContext('2d', { alpha: false });
  const state = { p: { base: hexToRgb(bg.base), c1: hexToRgb(bg.c1), c2: hexToRgb(bg.c2), c3: hexToRgb(bg.c3) }, amt: bg.amount / 100, urg: 0 };
  scene.init(state);
  // run a few steps so moving scenes settle into a natural look
  for (let i = 0; i < 4; i++) scene.draw(ctx, canvas.width, canvas.height, t + i * 0.2, state, i ? 0.2 : 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (bg.dim) { ctx.fillStyle = `rgba(0,0,0,${bg.dim / 100})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}
