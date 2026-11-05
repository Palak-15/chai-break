// Crunch three papads into crumbs. When one is mostly gone the rest falls apart
// and a fresh one arrives.
(function () {
  'use strict';

  const CB = window.CB;
  const C = { x: 400, y: 380 };
  const R = 262;
  const RINGS = [62, 124, 196, R];
  const SECTORS = 14;
  const HIT = 88;
  const DRAG_STEP = 34;
  const TEX = 560; // Offscreen canvas size for the papad.
  const GOAL = 3;

  // Papads are made by cell-shattering a jittered polar grid.
  function makeCells(seed) {
    const r = CB.rng(seed);
    const vertex = RINGS.map((rad, ring) => {
      const list = [];
      for (let k = 0; k < SECTORS; k++) {
        const a = ((k + (r() - 0.5) * 0.5 + ring * 0.3) / SECTORS) * Math.PI * 2;
        // The outer ring overshoots, and drawing clips it to a clean round edge.
        const d = ring === RINGS.length - 1 ? rad * 1.12 : rad + (r() - 0.5) * 20;
        list.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
      }
      return list;
    });
    const cells = [];
    for (let k = 0; k < SECTORS; k++) {
      const next = (k + 1) % SECTORS;
      cells.push(polygon([{ x: 0, y: 0 }, vertex[0][k], vertex[0][next]]));
      for (let ring = 0; ring < RINGS.length - 1; ring++) {
        cells.push(polygon([vertex[ring][k], vertex[ring][next], vertex[ring + 1][next], vertex[ring + 1][k]]));
      }
    }
    return cells;
  }

  function polygon(pts) {
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    return { pts, cx, cy, broken: false };
  }

  function makeTexture(seed) {
    const off = document.createElement('canvas');
    off.width = off.height = TEX;
    const c = off.getContext('2d');
    c.translate(TEX / 2, TEX / 2);
    const g = c.createRadialGradient(-50, -70, 30, 0, 0, R + 10);
    g.addColorStop(0, '#F7E5B4');
    g.addColorStop(1, '#E7C680');
    c.fillStyle = g;
    c.fillRect(-TEX / 2, -TEX / 2, TEX, TEX);
    const r = CB.rng(seed);
    // Roasted blisters, pale bubbles and black pepper.
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const size = 4 + r() * 15;
      const b = c.createRadialGradient(x, y, 0, x, y, size);
      b.addColorStop(0, 'rgba(146,84,30,' + (0.2 + r() * 0.5) + ')');
      b.addColorStop(1, 'rgba(146,84,30,0)');
      c.fillStyle = b;
      c.beginPath();
      c.arc(x, y, size, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R;
      c.fillStyle = 'rgba(255,248,222,0.55)';
      c.beginPath();
      c.arc(Math.cos(a) * d, Math.sin(a) * d, 1.5 + r() * 5, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 110; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R;
      c.fillStyle = 'rgba(40,28,20,0.82)';
      c.beginPath();
      c.arc(Math.cos(a) * d, Math.sin(a) * d, 0.8 + r() * 1.5, 0, Math.PI * 2);
      c.fill();
    }
    return off;
  }

  function tracePolygon(c, pts) {
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
  }

  const toy = {
    id: 'papad',
    title: 'Papad',
    bg: 'stone',
    cardY: 640,

    enter() {
      this.count = 0;
      this.crumbs = [];
      this.flying = [];
      this.layer = document.createElement('canvas');
      this.layer.width = this.layer.height = TEX;
      this.lc = this.layer.getContext('2d');
      this.newPapad();
      this.y = -700;
      this.state = 'arrive';
      this.prompt = 'Press anywhere on the papad to crunch it';
      this.pressing = false;
    },

    newPapad() {
      const seed = 11 + (this.seed = (this.seed || 0) + 1) * 13;
      this.cells = makeCells(seed);
      this.texture = makeTexture(seed);
      this.broken = 0;
      this.redraw();
    },

    redraw() {
      const c = this.lc;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, TEX, TEX);
      c.setTransform(1, 0, 0, 1, TEX / 2, TEX / 2);
      c.save();
      c.beginPath();
      c.arc(0, 0, R, 0, Math.PI * 2);
      c.clip();
      for (const cell of this.cells) {
        if (cell.broken) continue;
        c.save();
        tracePolygon(c, cell.pts);
        c.clip();
        c.drawImage(this.texture, -TEX / 2, -TEX / 2);
        c.restore();
      }
      // Crack lines only show once something has broken.
      if (this.broken > 0) {
        c.strokeStyle = 'rgba(112,70,28,0.45)';
        c.lineWidth = 1.6;
        for (const cell of this.cells) {
          if (cell.broken) continue;
          tracePolygon(c, cell.pts);
          c.stroke();
        }
      }
      c.restore();
    },

    down(p) {
      this.pressing = true;
      this.last = p;
      this.crunchAt(p);
    },

    move(p) {
      if (!this.pressing) return;
      if (CB.dist(p.x, p.y, this.last.x, this.last.y) >= DRAG_STEP) {
        this.last = p;
        this.crunchAt(p);
      }
    },

    up() {
      this.pressing = false;
    },

    crunchAt(p) {
      if (this.state !== 'play') return;
      const lx = p.x - C.x;
      const ly = p.y - (C.y + this.y);
      let hit = 0;
      for (const cell of this.cells) {
        if (cell.broken) continue;
        if (CB.dist(cell.cx, cell.cy, lx, ly) > HIT) continue;
        cell.broken = true;
        this.broken += 1;
        hit += 1;
        this.breakApart(cell);
      }
      if (!hit) return;
      CB.audio.crunch();
      this.prompt = null;
      this.redraw();
      // The last few pieces fall by themselves, so nobody hunts for stragglers.
      if (this.broken >= this.cells.length * 0.8) {
        for (const cell of this.cells) {
          if (!cell.broken) {
            cell.broken = true;
            this.breakApart(cell);
          }
        }
        this.broken = this.cells.length;
        this.redraw();
        this.state = 'clear';
        this.t = 0;
        this.count += 1;
      }
    },

    // A broken cell jumps apart into shards that settle as crumbs.
    breakApart(cell) {
      const r = Math.random;
      for (let i = 0; i < 4; i++) {
        const size = 8 + r() * 17;
        const a = r() * Math.PI * 2;
        const pts = [];
        const sides = 3 + Math.floor(r() * 3);
        for (let k = 0; k < sides; k++) {
          const t = a + (k / sides) * Math.PI * 2;
          pts.push({ x: Math.cos(t) * size * (0.6 + r() * 0.6), y: Math.sin(t) * size * (0.6 + r() * 0.6) });
        }
        const shard = {
          x: C.x + cell.cx + (r() - 0.5) * 40,
          y: C.y + cell.cy + (r() - 0.5) * 40,
          vx: (r() - 0.5) * 240,
          vy: -120 - r() * 160,
          rot: r() * 6,
          spin: (r() - 0.5) * 8,
          t: 0,
          pts,
          tone: CB.mixColor('#F5E2B0', '#D9AE66', r()),
        };
        this.flying.push(shard);
      }
      for (let i = 0; i < 7; i++) {
        CB.fx.add({
          x: C.x + cell.cx,
          y: C.y + cell.cy,
          vx: (r() - 0.5) * 300,
          vy: -80 - r() * 220,
          g: 720,
          life: 0.5,
          size: 1.3 + r() * 2.2,
          color: '#EFD79E',
        });
      }
    },

    update(dt) {
      this.t = (this.t || 0) + dt;
      for (let i = this.flying.length - 1; i >= 0; i--) {
        const s = this.flying[i];
        s.t += dt;
        s.vy += 760 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.spin * dt;
        if (s.t > 0.42) {
          this.flying.splice(i, 1);
          this.crumbs.push(s);
          if (this.crumbs.length > 240) this.crumbs.shift();
        }
      }
      if (this.state === 'arrive') {
        this.y = Math.min(0, this.y + dt * 1500);
        if (this.y >= 0) {
          this.state = 'play';
          CB.audio.clink(1500, 0.6);
        }
      } else if (this.state === 'clear') {
        if (this.count >= GOAL) {
          if (this.t > 0.8) {
            this.state = 'done';
            CB.finishLevel(this, 'Every last papad, crunched.', 5);
          }
          return;
        }
        // Crumbs get swept away, then a new papad arrives.
        if (this.t > 0.9) {
          for (const s of this.crumbs) s.x += dt * 1800;
        }
        if (this.t > 0.92 && !this.swept) {
          this.swept = true;
          CB.audio.whoosh();
        }
        if (this.t > 1.5) {
          this.crumbs = [];
          this.swept = false;
          this.newPapad();
          this.y = -700;
          this.state = 'arrive';
        }
      }
    },

    draw(c) {
      // A steel thali under the papad.
      const g = c.createLinearGradient(C.x - 300, C.y - 300, C.x + 300, C.y + 300);
      g.addColorStop(0, '#E8ECEE');
      g.addColorStop(0.5, '#B7BEC2');
      g.addColorStop(1, '#8D959A');
      c.fillStyle = 'rgba(50,40,30,0.25)';
      c.beginPath();
      c.arc(C.x + 6, C.y + 12, 306, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = g;
      c.beginPath();
      c.arc(C.x, C.y, 304, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#A9B1B6';
      c.beginPath();
      c.arc(C.x, C.y, 280, 0, Math.PI * 2);
      c.fill();

      if (this.state !== 'clear' && this.state !== 'done') {
        c.drawImage(this.layer, C.x - TEX / 2, C.y + this.y - TEX / 2);
      }
      for (const s of this.crumbs) this.drawShard(c, s);
      for (const s of this.flying) this.drawShard(c, s);

      if (!this.finished) {
        CB.text(c, this.count + ' of ' + GOAL + ' crunched', 400, 712, 28, { weight: 600 });
      }
    },

    drawShard(c, s) {
      c.save();
      c.translate(s.x, s.y);
      c.rotate(s.rot);
      c.fillStyle = s.tone;
      tracePolygon(c, s.pts);
      c.fill();
      c.restore();
    },
  };

  CB.levels.push(toy);
})();
