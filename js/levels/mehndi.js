// Trace henna by hand. The line is drawn exactly where the pointer goes, so
// straying from the guide leaves a visible mess. Then it dries to a deep stain.
(function () {
  'use strict';

  const CB = window.CB;
  const PASTE = '#3D2B14';
  const STAIN = '#8C2E10';
  const TOLERANCE = 14; // How close to a guide dot counts as covering it.
  const STRAY_MARGIN = 16; // Further than tolerance plus this counts as off the line.
  const SHOW_ALL_BELOW = 16; // With this few dots left, show every one of them.
  const INK_SLACK = 1.5; // Drawing beyond this multiple of the line's length is scribbling.
  const INK_EXTRA = 70;
  const TOUCH_BONUS = 1.5; // A fingertip can't be as exact as a mouse.
  const JOIN_LONGEST = 36; // Line ends closer than this get joined when a stroke finishes.
  const STEP = 4; // Fast drags are checked at this spacing, so nothing is skipped.
  const OFF_LINE_MESSY = 90; // Stage units of straying before the finish is "smudged".
  const OFF_LINE_WARN = 150;
  const OFF_LINE_FAIL = 650;
  const WET_TOUCH_COST = 60;
  const FLOWER = { x: 381, y: 528 };

  const FINGERS = [
    { x: 300, top: 306 },
    { x: 352, top: 208 },
    { x: 405, top: 176 },
    { x: 458, top: 212 },
  ];

  function loop(cx, cy, radiusAt) {
    const pts = [];
    const count = 150;
    for (let i = 0; i <= count; i++) {
      const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
      const r = radiusAt(a + Math.PI / 2);
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  function vine(x, yStart, yEnd, wave) {
    const pts = [];
    const count = Math.round(Math.abs(yStart - yEnd) / 5);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      pts.push({
        x: x + Math.sin(t * Math.PI * 3) * wave,
        y: CB.lerp(yStart, yEnd, t),
      });
    }
    return pts;
  }

  function thumbVine() {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      pts.push({
        x: CB.lerp(500, 588, t) + Math.sin(t * Math.PI * 3) * 4,
        y: CB.lerp(548, 442, t),
      });
    }
    return pts;
  }

  // Small dots that pop as a reward once a stroke has been traced.
  function flowerDots() {
    const list = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      list.push({ x: FLOWER.x + Math.cos(a) * 110, y: FLOWER.y + Math.sin(a) * 110, r: i % 2 ? 3 : 5 });
    }
    return list;
  }

  function innerDots() {
    const list = [{ x: FLOWER.x, y: FLOWER.y, r: 7 }];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      list.push({ x: FLOWER.x + Math.cos(a) * 18, y: FLOWER.y + Math.sin(a) * 18, r: 2.8 });
    }
    return list;
  }

  function vineDots(pts) {
    const list = [];
    for (let i = 8; i < pts.length; i += 8) {
      const side = (i / 8) % 2 ? 1 : -1;
      list.push({ x: pts[i].x + side * 11, y: pts[i].y, r: 3 });
    }
    return list;
  }

  function stroke(pts, blooms, hint, tolerance) {
    let length = 0;
    for (let i = 1; i < pts.length; i++) {
      length += CB.dist(pts[i].x, pts[i].y, pts[i - 1].x, pts[i - 1].y);
    }
    return {
      pts,
      blooms,
      hint,
      tolerance: tolerance || TOLERANCE,
      covered: pts.map(() => false),
      coveredCount: 0,
      inkAllowance: length * INK_SLACK + INK_EXTRA,
      ink: 0,
    };
  }

  function makeStrokes() {
    const fingerVine = (f) => vine(f.x, 400, f.top + 26, 5);
    const pinky = vine(FINGERS[0].x, 410, FINGERS[0].top + 26, 4);
    const ring = fingerVine(FINGERS[1]);
    const middle = fingerVine(FINGERS[2]);
    const index = fingerVine(FINGERS[3]);
    const thumb = thumbVine();
    return [
      stroke(
        loop(FLOWER.x, FLOWER.y, (a) => 76 + 17 * Math.cos(a * 8)),
        flowerDots(),
        'Trace the dotted flower with your henna cone'
      ),
      stroke(loop(FLOWER.x, FLOWER.y, () => 33), innerDots(), 'Now the small circle at the centre', 11),
      stroke(middle, vineDots(middle), 'Grow a vine up the tallest line'),
      stroke(index, vineDots(index), 'Add a vine beside it'),
      stroke(ring, vineDots(ring), 'And another on the other side'),
      stroke(pinky, vineDots(pinky), 'Now the shortest one'),
      stroke(thumb, vineDots(thumb), 'Last one, along the thumb'),
    ];
  }

  function onHand(p) {
    for (const f of FINGERS) {
      if (Math.abs(p.x - f.x) < 25 && p.y > f.top - 25 && p.y < 460) return true;
    }
    if (p.x > 268 && p.x < 494 && p.y > 390 && p.y < 660) return true;
    if (Math.abs(p.x - 381) < 79 && p.y > 620) return true;
    // Thumb: close to the line from its base to its tip.
    const t = CB.clamp(((p.x - 480) * 112 + (p.y - 570) * -146) / (112 * 112 + 146 * 146), 0, 1);
    return CB.dist(p.x, p.y, 480 + 112 * t, 570 - 146 * t) < 29;
  }

  const level = {
    id: 'mehndi',
    title: 'Mehndi',
    bg: 'cloth',
    cardY: 640,

    enter() {
      this.strokes = makeStrokes();
      this.active = 0;
      this.bloomAge = this.strokes.map(() => -1);
      this.trails = [];
      this.strokeTrails = 0; // Where the current stroke's ink starts in trails.
      this.trail = null;
      this.smudges = [];
      this.smudgeRng = CB.rng(61);
      this.offLine = 0;
      this.dry = 0;
      this.state = 'trace';
      this.pointer = null;
      this.pressing = false;
      this.speed = 0;
      this.prompt = this.strokes[0].hint;
    },

    down(p) {
      this.pressing = true;
      this.pointer = p;
      this.touch = p.touch;
      if (this.state === 'dry') {
        this.touchWet(p, true, 0);
        return;
      }
      if (this.state !== 'trace') return;
      CB.audio.squish();
      this.trail = null;
      if (onHand(p)) this.extendTrail(p);
      this.sample(p, 0);
    },

    move(p) {
      if (!this.pressing) return;
      const last = this.pointer || p;
      const moved = CB.dist(p.x, p.y, last.x, last.y);
      this.pointer = p;
      if (this.state === 'dry') {
        this.touchWet(p, false, moved);
        return;
      }
      if (this.state !== 'trace') return;
      this.speed = Math.min(1, this.speed + moved / 60);
      const steps = Math.max(1, Math.ceil(moved / STEP));
      for (let i = 1; i <= steps && this.pressing && this.state === 'trace'; i++) {
        const k = i / steps;
        const q = { x: CB.lerp(last.x, p.x, k), y: CB.lerp(last.y, p.y, k) };
        if (onHand(q)) this.extendTrail(q);
        else this.trail = null;
        this.sample(q, moved / steps);
      }
    },

    // A stroke only ever finishes on lifting, so it can't cut the player off mid-line.
    up() {
      const lifted = this.pressing;
      this.pressing = false;
      this.pointer = null;
      this.trail = null;
      if (!lifted || this.state !== 'trace') return;
      const s = this.strokes[this.active];
      if (s.coveredCount >= s.pts.length) this.completeStroke();
      else if (s.coveredCount > 0) this.prompt = 'Keep going. Trace the dots that are left';
    },

    tolerance(s) {
      return s.tolerance * (this.touch ? TOUCH_BONUS : 1);
    },

    // The paste goes wherever the cone goes, on the line or not.
    extendTrail(q) {
      if (!this.trail) {
        this.trail = [];
        this.trails.push(this.trail);
      }
      const end = this.trail[this.trail.length - 1];
      if (!end || CB.dist(end.x, end.y, q.x, q.y) >= 3) this.trail.push({ x: q.x, y: q.y });
    },

    // Any guide dot the pointer passes over is covered, from either direction.
    sample(q, moved) {
      const s = this.strokes[this.active];
      const tol = this.tolerance(s);
      const before = s.coveredCount;
      let nearest = Infinity;
      for (let i = 0; i < s.pts.length; i++) {
        const d = CB.dist(s.pts[i].x, s.pts[i].y, q.x, q.y);
        if (d < nearest) nearest = d;
        if (d <= tol && !s.covered[i]) {
          s.covered[i] = true;
          s.coveredCount += 1;
        }
      }
      if (Math.floor(s.coveredCount / 8) > Math.floor(before / 8)) CB.audio.click();

      // Off the line, or back and forth over it far more than tracing it would need.
      s.ink += moved;
      const offLine = nearest > tol + STRAY_MARGIN && onHand(q);
      if (offLine || s.ink > s.inkAllowance) this.stray(moved);
      if (this.state !== 'trace') return;

      if (s.coveredCount >= s.pts.length) this.prompt = 'All covered. Lift to finish this line';
    },

    // Every dot was reached, but the ink can stop just short of joining up. Only the
    // ends of the player's own lines are joined, so nothing appears beside them.
    closeSmallGaps() {
      const ends = [];
      this.trails.slice(this.strokeTrails).forEach((t) => {
        if (t.length < 2) return;
        ends.push({ line: t, pt: t[0], used: false });
        ends.push({ line: t, pt: t[t.length - 1], used: false });
      });
      const pairs = [];
      for (let i = 0; i < ends.length; i++) {
        for (let j = i + 1; j < ends.length; j++) {
          const d = CB.dist(ends[i].pt.x, ends[i].pt.y, ends[j].pt.x, ends[j].pt.y);
          if (d <= JOIN_LONGEST && (ends[i].line !== ends[j].line || ends[i].line.length > 20)) {
            pairs.push({ a: ends[i], b: ends[j], d });
          }
        }
      }
      pairs.sort((p, q) => p.d - q.d);
      for (const { a, b } of pairs) {
        if (a.used || b.used) continue;
        a.used = b.used = true;
        this.trails.push([a.pt, b.pt]);
      }
    },

    stray(amount) {
      this.offLine += amount;
      if (this.offLine >= OFF_LINE_FAIL) {
        this.state = 'smudged';
        this.pressing = false;
        CB.failLevel(this, "Too messy. Let's start over.");
      } else if (this.offLine >= OFF_LINE_WARN) {
        this.prompt = "Careful! You're off the line";
      }
    },

    completeStroke() {
      this.closeSmallGaps();
      this.strokeTrails = this.trails.length;
      this.bloomAge[this.active] = 0;
      CB.audio.note(this.active + 1);
      this.active += 1;
      // Lift before the next stroke, so moving to it never counts as a mess.
      this.pressing = false;
      this.trail = null;
      this.pointer = null;
      if (this.active >= this.strokes.length) {
        this.state = 'dry';
        this.prompt = "Let it dry. Don't touch it!";
      } else {
        this.prompt = this.strokes[this.active].hint;
      }
    },

    // Wet henna smears if it is touched before it has dried.
    touchWet(p, pressed, moved) {
      if (!onHand(p)) return;
      this.prompt = "Don't touch! It's still wet";
      if (pressed) {
        CB.audio.nope();
        this.dry = Math.max(0, this.dry - 0.2);
        this.addSmudge(p);
        this.stray(WET_TOUCH_COST);
      } else if (moved > 0) {
        this.wetDrag = (this.wetDrag || 0) + moved;
        if (this.wetDrag >= 24) {
          this.wetDrag = 0;
          this.addSmudge(p);
        }
        this.stray(moved);
      }
    },

    addSmudge(p) {
      const r = this.smudgeRng;
      this.smudges.push({ x: p.x, y: p.y, w: 7 + r() * 11, h: 4 + r() * 6, rot: r() * 3 });
      CB.audio.blot();
    },

    update(dt) {
      this.speed = Math.max(0, this.speed - dt * 5);
      const tracing = this.pressing && this.state === 'trace';
      CB.audio.setLoop('grain', tracing ? this.speed * 0.2 : 0);
      for (let i = 0; i < this.bloomAge.length; i++) {
        if (this.bloomAge[i] >= 0) this.bloomAge[i] += dt;
      }
      if (this.state === 'dry') {
        this.dry = Math.min(1, this.dry + dt / 2.6);
        if (this.dry >= 1) {
          this.state = 'done';
          const messy = this.offLine >= OFF_LINE_MESSY;
          CB.finishLevel(
            this,
            messy ? 'A little messy, still beautiful.' : 'Deep colour, beautifully done.',
            messy ? 2 : 5
          );
        }
      }
    },

    draw(c) {
      this.drawHand(c);
      if (this.state === 'trace') this.drawGuide(c);
      this.drawHenna(c);
      this.drawCone(c);
    },

    drawHand(c) {
      const outline = '#8E5A36';
      const shape = (extra, color) => {
        c.strokeStyle = color;
        c.fillStyle = color;
        c.lineCap = 'round';
        c.lineWidth = 50 + extra;
        for (const f of FINGERS) {
          c.beginPath();
          c.moveTo(f.x, 460);
          c.lineTo(f.x, f.top);
          c.stroke();
        }
        c.lineWidth = 58 + extra;
        c.beginPath();
        c.moveTo(480, 570);
        c.lineTo(592, 424);
        c.stroke();
        CB.rr(c, 268 - extra / 2, 390 - extra / 2, 226 + extra, 270 + extra, 76);
        c.fill();
        c.lineWidth = 158 + extra;
        c.lineCap = 'butt';
        c.beginPath();
        c.moveTo(381, 620);
        // Runs well past the stage so the arm reaches the edge of tall screens.
        c.lineTo(381, 2600);
        c.stroke();
      };
      shape(5, outline);
      shape(0, '#CB8E61');

      // Palm shading and creases.
      const g = c.createRadialGradient(FLOWER.x, FLOWER.y, 30, FLOWER.x, FLOWER.y, 170);
      g.addColorStop(0, 'rgba(238,178,136,0.62)');
      g.addColorStop(1, 'rgba(238,178,136,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(FLOWER.x, FLOWER.y, 170, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(122,74,44,0.38)';
      c.lineWidth = 2.5;
      for (const f of FINGERS) {
        for (const dy of [62, 120]) {
          c.beginPath();
          c.moveTo(f.x - 15, f.top + dy);
          c.quadraticCurveTo(f.x, f.top + dy + 5, f.x + 15, f.top + dy);
          c.stroke();
        }
      }

      // Bangles.
      const colors = ['#B8321F', '#F2A31B', '#B8321F', '#0F5C5E', '#F2A31B'];
      colors.forEach((color, i) => {
        c.strokeStyle = color;
        c.lineWidth = 9;
        c.lineCap = 'butt';
        c.beginPath();
        const y = 716 + i * 12;
        c.moveTo(298, y);
        c.quadraticCurveTo(381, y + 22, 464, y);
        c.stroke();
      });
    },

    drawHenna(c) {
      const color = CB.mixColor(PASTE, STAIN, CB.ease(this.dry));
      c.strokeStyle = color;
      c.fillStyle = color;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.lineWidth = 6.5;
      for (const t of this.trails) {
        if (t.length === 1) {
          c.beginPath();
          c.arc(t[0].x, t[0].y, 3.25, 0, Math.PI * 2);
          c.fill();
          continue;
        }
        c.beginPath();
        c.moveTo(t[0].x, t[0].y);
        for (let i = 1; i < t.length; i++) c.lineTo(t[i].x, t[i].y);
        c.stroke();
      }

      c.globalAlpha = 0.72;
      for (const m of this.smudges) {
        c.beginPath();
        c.ellipse(m.x, m.y, m.w, m.h, m.rot, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;

      for (let i = 0; i < this.strokes.length; i++) {
        const age = this.bloomAge[i];
        if (age < 0) continue;
        this.strokes[i].blooms.forEach((d, j) => {
          const k = CB.clamp((age - j * 0.025) / 0.25, 0, 1);
          if (k <= 0) return;
          c.beginPath();
          c.arc(d.x, d.y, d.r * CB.ease(k), 0, Math.PI * 2);
          c.fill();
        });
      }
    },

    drawGuide(c) {
      const s = this.strokes[this.active];
      c.fillStyle = 'rgba(255,248,226,0.95)';
      // The last few dots are all shown, and larger, so they are easy to find.
      const fewLeft = s.pts.length - s.coveredCount <= SHOW_ALL_BELOW;
      const every = fewLeft ? 1 : 3;
      const dot = fewLeft ? 4.2 : 2.6;
      for (let i = 0; i < s.pts.length; i += every) {
        if (s.covered[i]) continue;
        c.beginPath();
        c.arc(s.pts[i].x, s.pts[i].y, dot, 0, Math.PI * 2);
        c.fill();
      }
      // The circle only says where a new stroke is, and goes once drawing starts.
      if (s.coveredCount > 0 || this.pressing) return;
      const pulse = 15 + Math.sin(CB.time * 5) * 4;
      c.strokeStyle = 'rgba(255,248,226,0.95)';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(s.pts[0].x, s.pts[0].y, pulse, 0, Math.PI * 2);
      c.stroke();
    },

    // A paper henna cone with its tip exactly on the pointer. At rest it waits
    // beside the hand instead of creeping along the line by itself.
    drawCone(c) {
      if (this.state !== 'trace') return;
      const tip = this.pointer || { x: 640, y: 640 };
      c.save();
      c.translate(tip.x, tip.y);
      c.rotate(0.62);
      c.fillStyle = 'rgba(40,20,6,0.22)';
      c.beginPath();
      c.moveTo(4, 2);
      c.lineTo(30, -92);
      c.lineTo(-20, -92);
      c.closePath();
      c.fill();
      const g = c.createLinearGradient(-22, 0, 26, 0);
      g.addColorStop(0, '#F4E4C4');
      g.addColorStop(1, '#C9A36D');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(25, -90);
      c.quadraticCurveTo(0, -102, -25, -90);
      c.closePath();
      c.fill();
      c.fillStyle = PASTE;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(5, -16);
      c.lineTo(-5, -16);
      c.closePath();
      c.fill();
      c.restore();
    },
  };

  CB.levels.push(level);
})();
