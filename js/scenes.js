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
      this.state = { p: { base: hexToRgb(bg.base), c1: hexToRgb(bg.c1), c2: hexToRgb(bg.c2), c3: hexToRgb(bg.c3) }, amt: bg.amount / 100 };
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

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const speed = (this.bg ? this.bg.speed : 1) * (this.reduced ? 0.35 : 1);
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
  const state = { p: { base: hexToRgb(bg.base), c1: hexToRgb(bg.c1), c2: hexToRgb(bg.c2), c3: hexToRgb(bg.c3) }, amt: bg.amount / 100 };
  scene.init(state);
  // run a few steps so moving scenes settle into a natural look
  for (let i = 0; i < 3; i++) scene.draw(ctx, canvas.width, canvas.height, t + i * 0.2, state, 0.2);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (bg.dim) { ctx.fillStyle = `rgba(0,0,0,${bg.dim / 100})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}
