// Shell three pods by running a finger along each one. The seam only opens as far
// as the pointer has actually travelled, and the peas plink into a steel bowl.
(function () {
  'use strict';

  const CB = window.CB;
  const X0 = 110;
  const X1 = 690;
  const SEAM_Y = 250;
  const BODY = 66; // Half the thickness of the pod at its widest.
  const REACH_Y = 100; // How far from the seam the finger can be.
  const LEAD = 70; // How far ahead of the open part the finger can start.
  const BOWL = { x: 400, y: 548, r: 172 };
  const RIM = 0.36; // The rim's height compared with its width, for the viewing angle.
  const FLOOR_Y = 20; // The bowl's inner floor, below the middle of the rim.
  const FLOOR_R = 0.58; // Size of the inner floor compared with the rim.
  const ART_PAD = 40; // Space around the bowl in its pre-drawn image.
  const BOWL_FULL = 42;
  const PEAS = 8;
  const POP_BEHIND = 74;
  const GOAL = 3;

  // Grey between dark steel and a near-white reflection, with a cool tint.
  function steel(v) {
    const k = CB.clamp(v, 0, 1);
    return CB.mixColor('#3F464B', '#FBFCFD', k);
  }

  // A tight highlight around one direction, repeating on the opposite side. Spun
  // metal lights up in these narrow fans, and that is what makes it read as steel.
  function fan(angle, centre, focus) {
    return Math.pow(Math.abs(Math.cos(angle - centre)), focus);
  }

  // The bowl never changes, so it is drawn once and reused every frame.
  function makeBowlArt() {
    const { r } = BOWL;
    const size = (r + ART_PAD) * 2;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size * scale;
    const c = canvas.getContext('2d');
    c.scale(scale, scale);
    c.translate(size / 2, r * RIM + ART_PAD);

    const rimY = r * RIM;
    const depth = r * 0.8;
    const foot = r * 0.66;
    const footY = foot * RIM * 0.72;

    // A soft shadow on the counter.
    c.save();
    c.translate(8, depth + 8);
    c.scale(1, 0.2);
    const shadow = c.createRadialGradient(0, 0, foot * 0.5, 0, 0, r * 1.02);
    shadow.addColorStop(0, 'rgba(40,32,24,0.55)');
    shadow.addColorStop(1, 'rgba(40,32,24,0)');
    c.fillStyle = shadow;
    c.beginPath();
    c.arc(0, 0, r * 1.02, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Outside: steep sides with sharp, high-contrast vertical reflections.
    const bodyPath = () => {
      c.beginPath();
      c.moveTo(-r + 3, 0);
      c.bezierCurveTo(-r + 3, depth * 0.5, -foot - 12, depth * 0.9, -foot, depth);
      c.ellipse(0, depth, foot, footY, 0, Math.PI, 0, true);
      c.bezierCurveTo(foot + 12, depth * 0.9, r - 3, depth * 0.5, r - 3, 0);
      c.closePath();
    };
    const bands = c.createLinearGradient(-r, 0, r, 0);
    [
      [0, 0.1], [0.05, 0.5], [0.09, 0.97], [0.14, 1], [0.18, 0.62], [0.25, 0.34],
      [0.31, 0.14], [0.35, 0.36], [0.39, 0.86], [0.44, 1], [0.47, 0.72], [0.56, 0.42],
      [0.66, 0.2], [0.72, 0.1], [0.78, 0.44], [0.84, 0.92], [0.89, 0.98], [0.94, 0.42], [1, 0.08],
    ].forEach(([at, v]) => bands.addColorStop(at, steel(v)));
    bodyPath();
    c.fillStyle = bands;
    c.fill();

    c.save();
    bodyPath();
    c.clip();
    // Dark under the rolled rim, and the counter's warm colour reflected low down.
    const shade = c.createLinearGradient(0, 0, 0, depth + footY);
    shade.addColorStop(0, 'rgba(18,22,26,0.2)');
    shade.addColorStop(0.3, 'rgba(18,22,26,0.42)');
    shade.addColorStop(0.42, 'rgba(18,22,26,0)');
    shade.addColorStop(0.7, 'rgba(216,204,186,0.12)');
    shade.addColorStop(1, 'rgba(216,204,186,0.62)');
    c.fillStyle = shade;
    c.fillRect(-r, 0, r * 2, depth + footY + 4);
    // Fine brushed lines running around the bowl.
    for (let i = 0; i < 46; i++) {
      const t = i / 46;
      const y = rimY * 0.2 + t * (depth - rimY * 0.2);
      c.strokeStyle = i % 2 ? 'rgba(255,255,255,0.1)' : 'rgba(10,14,18,0.07)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(0, y, r, rimY, 0, 0, Math.PI);
      c.stroke();
    }
    c.restore();

    // The narrow foot ring it stands on.
    c.strokeStyle = 'rgba(20,24,28,0.6)';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, depth, foot, footY, 0, 0, Math.PI);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(0, depth - 5, foot - 2, footY, 0, 0.15, Math.PI - 0.15);
    c.stroke();

    // Inside wall, drawn as slices so each direction takes its own reflection.
    const wallX = r - 9;
    const wallY = rimY - 5;
    const floorX = r * FLOOR_R;
    const floorY = floorX * RIM;
    const slices = 220;
    const point = (rx, ry, oy, a) => [Math.cos(a) * rx, oy + Math.sin(a) * ry];
    for (let i = 0; i < slices; i++) {
      const a0 = (i / slices) * Math.PI * 2;
      const a1 = ((i + 1.5) / slices) * Math.PI * 2;
      const mid = (a0 + a1) / 2;
      const v =
        0.26 +
        0.68 * fan(mid, 0.62, 30) +
        0.5 * fan(mid, 2.3, 44) +
        0.22 * fan(mid, 1.5, 12) +
        0.1 * Math.sin(mid * 3 + 1);
      c.fillStyle = steel(v);
      c.strokeStyle = c.fillStyle;
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(...point(wallX, wallY, 0, a0));
      c.lineTo(...point(wallX, wallY, 0, a1));
      c.lineTo(...point(floorX, floorY, FLOOR_Y, a1));
      c.lineTo(...point(floorX, floorY, FLOOR_Y, a0));
      c.closePath();
      c.fill();
      c.stroke();
    }

    // The floor, with the bow-tie highlight of a spun steel base.
    const wedges = 180;
    for (let i = 0; i < wedges; i++) {
      const a0 = (i / wedges) * Math.PI * 2;
      const a1 = ((i + 1.5) / wedges) * Math.PI * 2;
      const v = 0.42 + 0.56 * fan((a0 + a1) / 2, 0.85, 7);
      c.fillStyle = steel(v);
      c.beginPath();
      c.moveTo(0, FLOOR_Y);
      c.lineTo(...point(floorX, floorY, FLOOR_Y, a0));
      c.lineTo(...point(floorX, floorY, FLOOR_Y, a1));
      c.closePath();
      c.fill();
    }
    for (let i = 1; i <= 26; i++) {
      const k = i / 26;
      c.strokeStyle = i % 2 ? 'rgba(255,255,255,0.14)' : 'rgba(14,18,22,0.1)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(0, FLOOR_Y, floorX * k, floorY * k, 0, 0, Math.PI * 2);
      c.stroke();
    }
    // A dark seam where the floor meets the wall.
    c.strokeStyle = 'rgba(16,20,24,0.55)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(0, FLOOR_Y, floorX, floorY, 0, 0, Math.PI * 2);
    c.stroke();

    // The thick rolled rim, with sharp reflections of its own.
    const rim = c.createLinearGradient(-r, 0, r, 0);
    [
      [0, 0.34], [0.08, 0.98], [0.15, 1], [0.22, 0.5], [0.34, 0.76], [0.44, 1],
      [0.52, 0.56], [0.66, 0.42], [0.76, 0.96], [0.84, 1], [0.92, 0.5], [1, 0.3],
    ].forEach(([at, v]) => rim.addColorStop(at, steel(v)));
    c.strokeStyle = 'rgba(14,18,22,0.55)';
    c.lineWidth = 14;
    c.beginPath();
    c.ellipse(0, 1.5, r - 3, rimY, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = rim;
    c.lineWidth = 11;
    c.beginPath();
    c.ellipse(0, 0, r - 3, rimY, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, -1.5, r - 3, rimY, 0, 0, Math.PI * 2);
    c.stroke();

    // Pin-sharp glints where the rim catches the light.
    for (const a of [3.75, 5.55, 0.95]) {
      const [x, y] = point(r - 3, rimY, 0, a);
      const glint = c.createRadialGradient(x, y, 0, x, y, 20);
      glint.addColorStop(0, 'rgba(255,255,255,1)');
      glint.addColorStop(0.2, 'rgba(255,255,255,0.7)');
      glint.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = glint;
      c.fillRect(x - 20, y - 20, 40, 40);
    }
    return canvas;
  }

  function thickness(x) {
    const t = CB.clamp((x - X0) / (X1 - X0), 0, 1);
    return BODY * Math.pow(Math.sin(Math.PI * t), 0.55);
  }

  function seam(x) {
    return SEAM_Y + Math.sin(((x - X0) / (X1 - X0)) * Math.PI) * -14;
  }

  const toy = {
    id: 'matar',
    title: 'Matar',
    bg: 'stone',
    cardY: 120,

    enter() {
      this.count = 0;
      this.pile = [];
      this.falling = [];
      this.pileRng = CB.rng(19);
      this.bowlArt = this.bowlArt || makeBowlArt();
      this.pressing = false;
      this.prompt = 'Run your finger along the pod, from left to right';
      this.newPod();
    },

    newPod() {
      this.head = X0;
      this.lastSplit = X0;
      this.state = 'arrive';
      this.slideX = 900;
      this.gap = 0;
      this.peas = [];
      for (let i = 0; i < PEAS; i++) {
        const t = (i + 0.7) / (PEAS + 0.4);
        this.peas.push({ x: CB.lerp(X0 + 30, X1 - 30, t), popped: false, size: 19 + Math.random() * 5 });
      }
    },

    down(p) {
      this.pressing = true;
      this.pointer = p;
      this.follow(p);
    },

    move(p) {
      if (!this.pressing) return;
      const last = this.pointer || p;
      this.pointer = p;
      const steps = Math.max(1, Math.ceil(CB.dist(p.x, p.y, last.x, last.y) / 10));
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        this.follow({ x: CB.lerp(last.x, p.x, k), y: CB.lerp(last.y, p.y, k) });
      }
    },

    up() {
      this.pressing = false;
      this.pointer = null;
    },

    // The seam only opens under the finger, not ahead of it.
    follow(q) {
      if (this.state !== 'play') return;
      if (Math.abs(q.y - seam(q.x)) > REACH_Y) return;
      if (q.x <= this.head || q.x > this.head + LEAD) return;
      this.head = q.x;
      this.prompt = null;
      if (this.head - this.lastSplit >= 26) {
        this.lastSplit = this.head;
        CB.audio.split();
      }
      // Peas show in the open pod for a moment, then pop out behind the finger.
      for (const pea of this.peas) {
        if (!pea.popped && pea.x < this.head - POP_BEHIND) this.popPea(pea);
      }
      if (this.head >= X1 - 12) {
        this.head = X1;
        this.state = 'empty';
        this.t = 0;
        this.count += 1;
      }
    },

    popPea(pea) {
      pea.popped = true;
      CB.audio.pop();
      this.falling.push({
        x: pea.x,
        y: seam(pea.x),
        vx: (BOWL.x - pea.x) * 0.95 + (Math.random() - 0.5) * 120,
        vy: -180 - Math.random() * 120,
        size: pea.size * 0.85,
      });
    },

    update(dt) {
      this.t = (this.t || 0) + dt;
      for (let i = this.falling.length - 1; i >= 0; i--) {
        const f = this.falling[i];
        f.vy += 1250 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        const floor = BOWL.y + FLOOR_Y;
        if (f.y >= floor) {
          this.falling.splice(i, 1);
          this.land(f);
        }
      }

      if (this.state === 'arrive') {
        this.slideX = Math.max(0, this.slideX - dt * 1700);
        if (this.slideX === 0) this.state = 'play';
      } else if (this.state === 'empty') {
        this.gap = Math.min(1, this.gap + dt * 2);
        // Any peas still in the pod tumble out now that it is fully open.
        const left = this.peas.find((pea) => !pea.popped);
        if (left && this.t > 0.08 * this.peas.filter((pea) => pea.popped).length - 0.3) this.popPea(left);
        if (this.t > 0.7) this.slideX -= dt * 2100;
        if (this.t > 0.72 && !this.whooshed) {
          this.whooshed = true;
          CB.audio.whoosh();
        }
        if (this.t > 1.3) {
          this.whooshed = false;
          if (this.count >= GOAL) {
            this.state = 'done';
            CB.finishLevel(this, 'All shelled, and not a pea lost.', 5);
          } else {
            this.newPod();
          }
        }
      }
    },

    land(f) {
      const r = this.pileRng;
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * BOWL.r * FLOOR_R * 0.9;
      this.pile.push({
        x: BOWL.x + Math.cos(a) * d,
        y: BOWL.y + FLOOR_Y + Math.sin(a) * d * RIM - 6,
        size: f.size,
        shade: r(),
      });
      // Peas nearer the front are drawn over those behind them.
      this.pile.sort((p, q) => p.y - q.y);
      CB.audio.plink(this.pile.length);
      if (this.pile.length >= BOWL_FULL) {
        this.pile = [];
        CB.audio.finish();
      }
    },

    draw(c) {
      this.drawBowl(c);
      if (this.state !== 'done') {
        c.save();
        c.translate(this.slideX, 0);
        this.drawPod(c);
        c.restore();
      }
      for (const f of this.falling) this.drawPea(c, f.x, f.y, f.size, 0.5);
      if (!this.finished) {
        CB.text(c, this.count + ' of ' + GOAL + ' shelled', 400, 390, 28, { weight: 600 });
      }
    },

    // A polished stainless steel katori, seen from slightly above.
    drawBowl(c) {
      const { x, y, r } = BOWL;
      const size = (r + ART_PAD) * 2;
      c.drawImage(this.bowlArt, x - size / 2, y - r * RIM - ART_PAD, size, size);

      // Everything inside is clipped to the rim, so nothing pokes through the bowl.
      c.save();
      c.beginPath();
      c.ellipse(x, y, r - 9, r * RIM - 5, 0, 0, Math.PI * 2);
      c.clip();
      // Mirror steel picks up a faint green smear from the peas sitting in it.
      for (const p of this.pile) {
        const glow = c.createRadialGradient(p.x, p.y - 34, 0, p.x, p.y - 34, p.size * 1.7);
        glow.addColorStop(0, 'rgba(110,190,70,0.2)');
        glow.addColorStop(1, 'rgba(110,190,70,0)');
        c.fillStyle = glow;
        c.fillRect(p.x - p.size * 2, p.y - 34 - p.size * 2, p.size * 4, p.size * 4);
      }
      for (const p of this.pile) {
        c.fillStyle = 'rgba(16,24,12,0.3)';
        c.beginPath();
        c.ellipse(p.x + 3, p.y + p.size * 0.72, p.size * 0.92, p.size * 0.36, 0, 0, Math.PI * 2);
        c.fill();
        this.drawPea(c, p.x, p.y, p.size, p.shade);
      }
      c.restore();
    },

    drawPea(c, x, y, size, shade) {
      const g = c.createRadialGradient(x - size * 0.35, y - size * 0.4, size * 0.1, x, y, size);
      g.addColorStop(0, CB.mixColor('#C9EE8C', '#B5E076', shade));
      g.addColorStop(1, CB.mixColor('#62A83A', '#538F30', shade));
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, size, 0, Math.PI * 2);
      c.fill();
    },

    // The two halves of the shell part behind the finger and stay shut ahead of it.
    drawPod(c) {
      const step = 4;
      const xs = [];
      for (let x = X0; x <= X1; x += step) xs.push(x);
      if (xs[xs.length - 1] !== X1) xs.push(X1);

      const opening = (x) => {
        if (x >= this.head) return 0;
        const tip = Math.min(1, (X1 - x + 40) / 60);
        const behind = Math.min(1, (this.head - x) / 70);
        return (20 + 18 * this.gap) * behind * Math.min(tip, Math.min(1, (x - X0 + 30) / 70));
      };
      // How far each shell reaches in towards the seam.
      const inner = (x) => {
        const t = thickness(x);
        return x >= this.head ? 0 : t * 0.48 * Math.min(1, (this.head - x) / 40);
      };
      const edgeTrace = (sign, outerFirst) => {
        c.beginPath();
        xs.forEach((x, i) => {
          const y = seam(x) + sign * (thickness(x) + opening(x));
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        });
        for (let i = xs.length - 1; i >= 0; i--) {
          const x = xs[i];
          const reach = x >= this.head ? 0 : thickness(x) - inner(x);
          const y = seam(x) + sign * (x >= this.head ? 0 : reach + opening(x));
          c.lineTo(x, y);
        }
        c.closePath();
        if (outerFirst) c.fill();
      };

      // A stem at the left tip.
      c.strokeStyle = '#3E6E27';
      c.lineWidth = 8;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(X0 + 4, seam(X0));
      c.quadraticCurveTo(X0 - 22, seam(X0) - 6, X0 - 30, seam(X0) - 26);
      c.stroke();

      // The pale inside of the opened part.
      if (this.head > X0 + 4) {
        const open = xs.filter((x) => x <= this.head);
        const g = c.createLinearGradient(0, SEAM_Y - BODY, 0, SEAM_Y + BODY);
        g.addColorStop(0, '#B9DD86');
        g.addColorStop(0.5, '#E2F3BE');
        g.addColorStop(1, '#AFD67C');
        c.fillStyle = g;
        c.beginPath();
        open.forEach((x, i) => {
          const y = seam(x) - thickness(x) * 0.9 - opening(x);
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        });
        for (let i = open.length - 1; i >= 0; i--) {
          const x = open[i];
          c.lineTo(x, seam(x) + thickness(x) * 0.9 + opening(x));
        }
        c.closePath();
        c.fill();
      }

      // Peas still sitting in the open part of the pod.
      for (const pea of this.peas) {
        if (pea.popped || pea.x > this.head) continue;
        this.drawPea(c, pea.x, seam(pea.x), pea.size, 0.4);
      }

      const top = c.createLinearGradient(0, SEAM_Y - BODY - 40, 0, SEAM_Y);
      top.addColorStop(0, '#74B548');
      top.addColorStop(1, '#4A8A30');
      c.fillStyle = top;
      edgeTrace(-1, true);
      const bottom = c.createLinearGradient(0, SEAM_Y, 0, SEAM_Y + BODY + 40);
      bottom.addColorStop(0, '#4A8A30');
      bottom.addColorStop(1, '#346A22');
      c.fillStyle = bottom;
      edgeTrace(1, true);

      // Soft bulges where peas are hiding in the part still closed.
      c.fillStyle = 'rgba(190,230,130,0.2)';
      for (const pea of this.peas) {
        if (pea.x <= this.head) continue;
        c.beginPath();
        c.ellipse(pea.x, seam(pea.x) - 14, pea.size + 5, pea.size * 0.7, 0, 0, Math.PI * 2);
        c.fill();
      }

      // The seam line still to be opened.
      c.strokeStyle = 'rgba(28,62,18,0.75)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(Math.max(this.head, X0), seam(Math.max(this.head, X0)));
      for (let x = Math.max(this.head, X0); x <= X1; x += 10) c.lineTo(x, seam(x));
      c.stroke();

      // A pulsing mark where the finger should be next.
      if (this.state === 'play' && !this.pressing) {
        const px = Math.max(this.head, X0 + 16);
        c.strokeStyle = 'rgba(255,255,255,0.95)';
        c.lineWidth = 4;
        c.beginPath();
        c.arc(px, seam(px), 17 + Math.sin(CB.time * 5) * 4, 0, Math.PI * 2);
        c.stroke();
      }
    },
  };

  CB.levels.push(toy);
})();
