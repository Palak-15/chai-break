// Sprinkle coloured powder into a chalk mandala. Every grain mirrors around
// the ring, so one small gesture blooms across the whole pattern.
(function () {
  'use strict';

  const CB = window.CB;
  const CX = 400;
  const CY = 398;
  const LAYER = 1000; // Grain layer resolution; shown scaled to the stage.
  const BRUSH = 30;
  const REACH = 26;
  const FULL_AT = 0.6;
  const MESSY = 40;
  const MAX_STRAY = 300;

  const POWDERS = [
    { name: 'Marigold', color: '#F5A623' },
    { name: 'Rose', color: '#E8497F' },
    { name: 'Leaf', color: '#62B041' },
    { name: 'Sky', color: '#3CBBD0' },
    { name: 'Chalk', color: '#FBF6EA' },
  ];

  function petal(r0, r1, width) {
    return (r) => (r < r0 || r > r1 ? -1 : width * Math.pow(Math.sin((Math.PI * (r - r0)) / (r1 - r0)), 0.7));
  }

  function dot(rc, radius) {
    return (r) => {
      const d = r - rc;
      return Math.abs(d) > radius ? -1 : Math.sqrt(radius * radius - d * d) / rc;
    };
  }

  function wedge(r0, r1, half) {
    return (r) => (r < r0 || r > r1 ? -1 : half);
  }

  function diamond(r0, r1, width) {
    const mid = (r0 + r1) / 2;
    return (r) => (r < r0 || r > r1 ? -1 : width * (1 - Math.abs(r - mid) / (mid - r0)));
  }

  function makeRings() {
    return [
      { n: 8, offset: 0, r0: 0, r1: 46, shape: wedge(0, 46, Math.PI / 8) },
      { n: 8, offset: 0, r0: 54, r1: 150, shape: petal(54, 150, 0.31) },
      { n: 8, offset: Math.PI / 8, r0: 104, r1: 138, shape: dot(121, 17) },
      { n: 8, offset: 0, r0: 158, r1: 222, shape: diamond(158, 222, 0.27) },
      { n: 16, offset: Math.PI / 16, r0: 226, r1: 286, shape: petal(226, 286, 0.13) },
      { n: 24, offset: 0, r0: 287, r1: 307, shape: dot(297, 10) },
    ];
  }

  function prepareRing(ring) {
    // Very small shapes need a tighter grid or their grains look patchy.
    const step = ring.r1 - ring.r0 < 40 ? 3.5 : 6.5;
    const sw = (Math.PI * 2) / ring.n;
    ring.points = [];
    const r = CB.rng(Math.round(ring.r1 * 13));
    for (let rad = Math.max(1, ring.r0); rad <= ring.r1; rad += step) {
      const half = Math.min(ring.shape(rad), sw / 2);
      if (half < 0) continue;
      const count = Math.max(1, Math.floor((2 * half * rad) / step));
      for (let i = 0; i < count; i++) {
        const a = -half + (2 * half * (i + 0.5)) / count;
        const jr = rad + (r() - 0.5) * 3;
        const ja = a + ((r() - 0.5) * 3) / Math.max(rad, 8);
        ring.points.push({ x: Math.cos(ja) * jr, y: Math.sin(ja) * jr, on: false });
      }
    }
    ring.filled = 0;
    ring.color = null;
    ring.complete = false;
  }

  function canonical(ring, p) {
    const dx = p.x - CX;
    const dy = p.y - CY;
    const r = Math.hypot(dx, dy);
    const sw = (Math.PI * 2) / ring.n;
    let a = (Math.atan2(dy, dx) - ring.offset) % sw;
    if (a < 0) a += sw;
    if (a > sw / 2) a -= sw;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }

  const level = {
    id: 'rangoli',
    title: 'Rangoli',
    bg: 'floor',

    enter() {
      this.rings = makeRings();
      this.rings.forEach(prepareRing);
      this.picked = 0;
      this.stray = 0;
      this.painting = false;
      this.finger = null;
      this.moving = 0;
      this.step = 0;
      this.settle = 0;
      this.prompt = 'Pick a colour, then sprinkle inside the chalk';
      this.makeLayers();
      this.grainRng = CB.rng(31);

      this.buttons = this.buttons.concat(
        POWDERS.map((powder, i) => ({
          x: 226 + i * 72, y: 712, w: 64, h: 64, powder, index: i,
          draw: (c, b) => this.drawBowl(c, b),
          onTap: () => {
            this.picked = i;
            CB.audio.note(i);
          },
        }))
      );
    },

    makeLayers() {
      this.grains = document.createElement('canvas');
      this.grains.width = this.grains.height = LAYER;
      this.gc = this.grains.getContext('2d');
      this.gc.translate(LAYER / 2, LAYER / 2);
      this.gc.scale(LAYER / 800, LAYER / 800);

      this.chalk = document.createElement('canvas');
      this.chalk.width = this.chalk.height = LAYER;
      const c = this.chalk.getContext('2d');
      c.translate(LAYER / 2, LAYER / 2);
      c.scale(LAYER / 800, LAYER / 800);
      c.strokeStyle = 'rgba(251,246,234,0.72)';
      c.lineWidth = 1.8;
      c.setLineDash([3, 5]);
      for (const ring of this.rings) {
        const sw = (Math.PI * 2) / ring.n;
        for (let s = 0; s < ring.n; s++) {
          const base = ring.offset + s * sw;
          const up = [];
          const down = [];
          for (let r = Math.max(1, ring.r0); r <= ring.r1; r += 2) {
            const half = Math.min(ring.shape(r), sw / 2);
            if (half < 0) continue;
            up.push([Math.cos(base + half) * r, Math.sin(base + half) * r]);
            down.push([Math.cos(base - half) * r, Math.sin(base - half) * r]);
          }
          const all = up.concat(down.reverse());
          c.beginPath();
          all.forEach((pt, i) => (i ? c.lineTo(pt[0], pt[1]) : c.moveTo(pt[0], pt[1])));
          c.closePath();
          c.stroke();
        }
      }
    },

    paintPoint(ring, pt) {
      const c = this.gc;
      const r = this.grainRng;
      const sw = (Math.PI * 2) / ring.n;
      const a0 = Math.atan2(pt.y, pt.x);
      const rad = Math.hypot(pt.x, pt.y);
      for (let s = 0; s < ring.n; s++) {
        const a = a0 + ring.offset + s * sw;
        for (let k = 0; k < 3; k++) {
          c.fillStyle = CB.mixColor(ring.color, r() > 0.5 ? '#FFFFFF' : '#2B1B12', r() * 0.2);
          const jx = (r() - 0.5) * 7;
          const jy = (r() - 0.5) * 7;
          c.beginPath();
          c.arc(Math.cos(a) * rad + jx, Math.sin(a) * rad + jy, 1.5 + r() * 2.1, 0, Math.PI * 2);
          c.fill();
        }
      }
    },

    // Only the ring under the finger takes powder, so colour stays in its lines.
    ringAt(p) {
      let best = null;
      let bestDist = REACH;
      for (const ring of this.rings) {
        const cp = canonical(ring, p);
        for (const pt of ring.points) {
          const d = CB.dist(pt.x, pt.y, cp.x, cp.y);
          if (d < bestDist) {
            bestDist = d;
            best = ring;
          }
        }
      }
      return best;
    },

    // Powder falls wherever it is sprinkled, so outside the chalk it makes a mess.
    spill(p) {
      if (CB.dist(p.x, p.y, CX, CY) > 345 || this.stray >= MAX_STRAY) return;
      this.stray += 1;
      if (this.stray % 6 === 1) CB.audio.blot();
      const c = this.gc;
      const r = this.grainRng;
      c.fillStyle = POWDERS[this.picked].color;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.arc(p.x - CX + (r() - 0.5) * 34, p.y - CY + (r() - 0.5) * 34, 1.3 + r() * 1.8, 0, Math.PI * 2);
        c.fill();
      }
      if (this.stray > MESSY) this.prompt = 'Careful! Keep the powder inside the chalk';
    },

    sprinkle(p) {
      const ring = this.ringAt(p);
      if (!ring) {
        this.spill(p);
        return;
      }
      if (ring.complete) return;
      const cp = canonical(ring, p);
      ring.color = POWDERS[this.picked].color;
      for (const pt of ring.points) {
        if (pt.on) continue;
        if (CB.dist(pt.x, pt.y, cp.x, cp.y) > BRUSH) continue;
        pt.on = true;
        ring.filled += 1;
        this.paintPoint(ring, pt);
      }
    },

    down(p) {
      if (p.y > 706) return;
      this.painting = true;
      this.finger = p;
      CB.audio.pinch();
      this.sprinkle(p);
    },

    move(p) {
      if (!this.painting) return;
      const moved = this.finger ? CB.dist(p.x, p.y, this.finger.x, this.finger.y) : 0;
      this.moving = Math.min(1, this.moving + moved / 70);
      this.finger = p;
      this.sprinkle(p);
    },

    up() {
      this.painting = false;
    },

    update(dt) {
      this.moving = Math.max(0, this.moving - dt * 3.5);
      CB.audio.setLoop('grain', this.painting ? 0.1 + this.moving * 0.24 : 0);

      if (this.painting && this.finger && Math.random() < 0.8) {
        const color = POWDERS[this.picked].color;
        CB.fx.add({
          x: this.finger.x + (Math.random() - 0.5) * 18,
          y: this.finger.y - 26,
          vx: (Math.random() - 0.5) * 16,
          vy: 30,
          g: 240,
          life: 0.32,
          size: 1.6 + Math.random() * 1.8,
          color,
        });
      }

      // Once a ring is mostly covered, the powder settles into the rest of it.
      let allDone = true;
      for (const ring of this.rings) {
        if (ring.complete) continue;
        allDone = false;
        if (ring.filled / ring.points.length >= FULL_AT) {
          let budget = Math.ceil(ring.points.length * dt * 3);
          for (const pt of ring.points) {
            if (pt.on) continue;
            pt.on = true;
            ring.filled += 1;
            this.paintPoint(ring, pt);
            if (--budget <= 0) break;
          }
          if (ring.filled >= ring.points.length) {
            ring.complete = true;
            CB.audio.note(this.step++);
          }
        }
      }

      if (allDone) {
        if (!this.finished) {
          CB.audio.setLoop('grain', 0);
          this.painting = false;
          CB.finishLevel(
            this,
            this.stray > MESSY ? 'Full of colour, with a little mess.' : 'A bright welcome at the door.',
            this.stray > MESSY ? 2 : 5
          );
          this.buttons = this.buttons.filter((b) => !b.powder);
        }
        this.settle = Math.min(1, this.settle + dt / 0.9);
      }
    },

    draw(c) {
      const k = CB.ease(this.settle);
      const scale = CB.lerp(1, 0.86, k);
      const y = CB.lerp(CY, 300, k);
      const size = 800 * scale;
      c.drawImage(this.chalk, CX - size / 2, y - size / 2, size, size);
      c.drawImage(this.grains, CX - size / 2, y - size / 2, size, size);
    },

    drawBowl(c, b) {
      const x = b.x + b.w / 2;
      const y = b.y + b.h / 2;
      const on = b.index === this.picked;
      if (on) {
        c.strokeStyle = CB.colors.cream;
        c.lineWidth = 4;
        c.beginPath();
        c.arc(x, y, 33, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = '#8A6A4C';
      c.beginPath();
      c.arc(x, y, 27, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = b.powder.color;
      c.beginPath();
      c.arc(x, y, 21, 0, Math.PI * 2);
      c.fill();
    },
  };

  CB.levels.push(level);
})();
