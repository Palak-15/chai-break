// Roll the dough into a round, cook both sides on the tawa, then drag it to the
// plate. A pale side means undercooked and a side left too long burns; only a
// roti that reaches the plate golden on both sides earns coins.
(function () {
  'use strict';

  const CB = window.CB;
  const N = 72;
  const TARGET = 212;
  const CX = 400;
  const CY = 400;
  const BOARD_EDGE = 322; // Dough stretched this far has run off the rolling board.
  const ROLL_RATE = 0.09; // Stretch per unit rolled, along the direction of rolling.
  const ROLL_FOCUS = 8; // Higher means rolling affects a narrower band of directions.
  const ROUND_ENOUGH = 0.8; // Shortest side compared with the longest, to count as round.
  const TOO_LONG = TARGET * 1.16; // Past this, warn that one direction is too long.
  const COOK_TIME = 1.7; // Seconds on one side until it turns golden.
  const COOKED_ENOUGH = 0.92; // Below this, a side counts as undercooked on the plate.
  const SAFE_TIME = 1.5; // Seconds a side can stay golden before it starts to catch.
  const BURN_TIME = 1.5; // Seconds from starting to catch until it is burnt.
  const CATCHING_LOOK = 0.3; // How dark a side looks just before it is burnt.
  const TAWA = { x: 285, y: 370, r: 225 };
  const PLATE = { x: 645, y: 560, r: 132 };
  const TAWA_SCALE = 0.76; // Roti size on the tawa, relative to the rolled dough.
  const PLATE_SCALE = 0.46;
  const PUFF_SIZE = 0.24; // How much bigger a fully puffed roti is.
  const PUFF_TIME = 0.55;
  const DRAG_START = 14; // Moving further than this is a drag rather than a tap.

  function makeSpots(seed) {
    const r = CB.rng(seed);
    const list = [];
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * (TARGET - 16);
      list.push({
        x: Math.cos(a) * d,
        y: Math.sin(a) * d,
        size: 5 + r() * 15,
        at: r() * 0.8,
      });
    }
    return list;
  }

  const FLOUR = (function () {
    const r = CB.rng(77);
    const list = [];
    for (let i = 0; i < 70; i++) {
      list.push({ a: r() * Math.PI * 2, d: Math.sqrt(r()) * 0.94, s: 1 + r() * 2 });
    }
    return list;
  })();

  const level = {
    id: 'roti',
    title: 'Roti',
    bg: 'wood',
    cardY: 36,

    enter() {
      this.phase = 'roll';
      this.t = 0;
      this.R = [];
      for (let i = 0; i < N; i++) {
        this.R.push(76 + 5 * Math.sin(i * 0.33) + 3 * Math.sin(i * 0.87));
      }
      this.pin = { x: 400, y: 690, angle: 0.05, active: false };
      this.prev = null;
      this.speed = 0;
      this.boardY = 0;
      this.tawaY = 900;
      this.cook = [0, 0];
      this.golden = [0, 0]; // Seconds each side has spent past golden.
      this.burn = [0, 0];
      this.charred = 0;
      this.side = 0;
      this.flips = 0;
      this.flipT = -1;
      this.flipped = false;
      this.puff = 0;
      this.puffT = 0;
      this.puffed = false;
      this.rx = CX;
      this.ry = CY;
      this.rs = 1;
      this.press = null;
      this.held = false;
      this.spots = [makeSpots(3), makeSpots(9)];
      this.prompt = 'Roll the pin in every direction to make it round';
    },

    down(p) {
      if (this.phase === 'roll') {
        this.pin.active = true;
        CB.audio.pin();
        this.prev = p;
        this.pin.x = p.x;
        this.pin.y = p.y;
      } else if (this.phase === 'cook' && this.flipT < 0) {
        const onRoti = CB.dist(p.x, p.y, this.rx, this.ry) <= TARGET * this.rs + 12;
        this.press = { x: p.x, y: p.y, onRoti, moved: false };
      }
    },

    // Whichever side is down keeps cooking until it is flipped or taken off.
    heat(dt) {
      const s = this.side;
      if (this.cook[s] < 1) {
        this.cook[s] = Math.min(1, this.cook[s] + dt / COOK_TIME);
      } else {
        this.golden[s] += dt;
        this.burn[s] = CB.clamp((this.golden[s] - SAFE_TIME) / BURN_TIME, 0, 1);
      }
      const burn = this.burn[s];
      CB.audio.setLoop('sizzle', 0.16 + burn * 0.34);
      if (burn > 0 && Math.random() < dt * (6 + burn * 26)) CB.smoke(this.rx, this.ry - 30, 210);
      if (burn >= 1) {
        this.phase = 'burnt';
        this.press = null;
        CB.failLevel(this, "Burnt! Let's roll a fresh one.");
      }
    },

    startFlip() {
      this.flipT = 0;
      this.flipped = false;
      CB.audio.whoosh();
    },

    // Judged on arrival: a side that never turned golden is still raw.
    judge() {
      CB.audio.clink(1500);
      CB.audio.setLoop('sizzle', 0);
      const raw = this.cook.findIndex((v) => v < COOKED_ENOUGH);
      if (raw >= 0) {
        this.phase = 'plated';
        this.side = raw; // Turn the pale side up, so the result is plain to see.
        this.puff = 0;
        CB.failLevel(this, "Undercooked! It's still raw.");
        return;
      }
      this.phase = 'plated';
      CB.finishLevel(this, 'Perfectly cooked, soft and puffed.', 5);
    },

    move(p) {
      if (this.press) {
        const pr = this.press;
        if (CB.dist(p.x, p.y, pr.x, pr.y) > DRAG_START) pr.moved = true;
        if (pr.moved && pr.onRoti && !this.held) {
          this.held = true;
          CB.audio.setLoop('sizzle', 0);
          CB.audio.clink(1300, 0.6);
        }
        if (this.held) {
          this.rx = p.x;
          this.ry = p.y;
        }
        return;
      }
      if (this.phase !== 'roll' || !this.pin.active) return;
      const dx = p.x - this.prev.x;
      const dy = p.y - this.prev.y;
      const moved = Math.hypot(dx, dy);
      this.pin.x = p.x;
      this.pin.y = p.y;
      if (moved < 1) return;
      this.prev = p;
      const motion = Math.atan2(dy, dx);
      this.pin.angle = motion + Math.PI / 2;
      this.speed = Math.min(1, this.speed + moved / 120);
      const over = CB.dist(p.x, p.y, CX, CY) < Math.max(...this.R) + 40;
      if (over) this.roll(motion, moved);
    },

    // Dough only stretches along the direction it is rolled, and keeps going if
    // the player keeps rolling that way, right off the board.
    roll(motion, moved) {
      const R = this.R;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const align = Math.pow(Math.cos(a - motion), ROLL_FOCUS);
        R[i] = Math.min(BOARD_EDGE + 8, R[i] + moved * ROLL_RATE * align);
      }
      if (Math.random() < 0.12) {
        const a = Math.random() * Math.PI * 2;
        CB.fx.add({
          x: CX + Math.cos(a) * R[0],
          y: CY + Math.sin(a) * R[0],
          vx: Math.cos(a) * 30,
          vy: Math.sin(a) * 30,
          life: 0.7,
          size: 2.5,
          alpha: 0.55,
          color: '#FFF8E8',
        });
      }
    },

    up(p) {
      this.pin.active = false;
      const pr = this.press;
      this.press = null;
      if (!pr || this.phase !== 'cook') return;
      if (this.held) {
        this.held = false;
        if (CB.dist(p.x, p.y, PLATE.x, PLATE.y) <= PLATE.r + 30) {
          this.phase = 'placing';
          this.t = 0;
          this.fromX = this.rx;
          this.fromY = this.ry;
          this.prompt = null;
          CB.audio.whoosh();
        }
        return;
      }
      if (!pr.moved) this.startFlip();
    },

    update(dt) {
      this.t += dt;
      this.speed = Math.max(0, this.speed - dt * 3);

      if (this.phase === 'roll') {
        CB.audio.setLoop('roll', this.speed * 0.9);
        const shortest = Math.min(...this.R);
        const longest = Math.max(...this.R);
        if (longest >= BOARD_EDGE) {
          this.phase = 'offboard';
          this.pin.active = false;
          CB.failLevel(this, "It's off the board! Roll it evenly.");
        } else if (longest >= TOO_LONG && shortest < TARGET * 0.95) {
          this.prompt = 'Too long that way! Roll another direction';
        } else if (shortest >= TARGET * 0.95 && shortest / longest >= ROUND_ENOUGH) {
          this.phase = 'slide';
          this.t = 0;
          this.pin.active = false;
          this.prompt = 'Nice and round. To the tawa…';
          CB.audio.setLoop('roll', 0);
          CB.audio.note(4);
          CB.audio.whoosh();
        }
      } else if (this.phase === 'slide') {
        const k = CB.ease(CB.clamp(this.t / 0.9, 0, 1));
        this.boardY = 950 * k;
        this.tawaY = 900 * (1 - k);
        this.rx = CB.lerp(CX, TAWA.x, k);
        this.ry = CB.lerp(CY, TAWA.y, k);
        this.rs = CB.lerp(1, TAWA_SCALE, k);
        for (let i = 0; i < N; i++) this.R[i] = CB.lerp(this.R[i], TARGET, dt * 6);
        if (this.t > 1) {
          this.phase = 'cook';
          this.t = 0;
          CB.audio.slap();
        }
      } else if (this.phase === 'cook') {
        this.updateCooking(dt);
      } else if (this.phase === 'placing') {
        const k = CB.ease(CB.clamp(this.t / 0.28, 0, 1));
        this.rx = CB.lerp(this.fromX, PLATE.x, k);
        this.ry = CB.lerp(this.fromY, PLATE.y, k);
        this.rs = CB.lerp(TAWA_SCALE, PLATE_SCALE, k);
        if (this.t >= 0.28) this.judge();
      }
      if (this.phase === 'burnt') {
        this.charred = Math.min(1, this.charred + dt / 0.6);
        if (Math.random() < dt * 22) CB.smoke(this.rx, this.ry - 30, 230);
      } else if (this.finished && !this.failed && Math.random() < dt * 8) {
        CB.steam(this.rx, this.ry - 20, 130);
      }
    },

    updateCooking(dt) {
      if (this.flipT >= 0) {
        CB.audio.setLoop('sizzle', 0);
        this.flipT += dt / 0.5;
        if (this.flipT >= 0.5 && !this.flipped) {
          this.flipped = true;
          this.side = 1 - this.side;
        }
        if (this.flipT >= 1) {
          this.flipT = -1;
          this.flips += 1;
          CB.audio.slap();
        }
        return;
      }
      if (this.held) {
        this.prompt = 'Drop it on the plate';
        return;
      }
      // A roti dropped anywhere else goes back on the heat.
      this.rx = CB.lerp(this.rx, TAWA.x, Math.min(1, dt * 12));
      this.ry = CB.lerp(this.ry, TAWA.y, Math.min(1, dt * 12));
      this.heat(dt);
      if (this.phase !== 'cook') return;

      const both = this.cook[0] >= 1 && this.cook[1] >= 1;
      if (both && !this.puffed) {
        this.puffed = true;
        CB.audio.puff();
        for (let i = 0; i < 16; i++) CB.steam(this.rx, this.ry - 40, 240);
      }
      if (both) {
        // Swells past full size and settles back, like a real phulka.
        this.puffT = Math.min(1, this.puffT + dt / PUFF_TIME);
        const k = this.puffT - 1;
        this.puff = 1 + 2.7 * k * k * k + 1.7 * k * k;
      }
      if (Math.random() < dt * (both ? 14 : 5)) CB.steam(this.rx, this.ry - 40, 170);

      if (this.burn[this.side] > 0) this.prompt = "It's burning! Flip it or move it";
      else if (both) this.prompt = 'Puffed! Drag it to the plate';
      else if (this.flips === 0) this.prompt = 'Tap to flip when it looks golden';
      else this.prompt = 'Both sides need to turn golden';
    },

    draw(c) {
      if (this.boardY < 940) this.drawBoard(c, this.boardY);
      if (this.tawaY < 890) {
        this.drawTawa(c, this.tawaY);
        this.drawPlate(c, this.tawaY);
      }
      if (this.phase === 'roll' || this.phase === 'slide' || this.phase === 'offboard') {
        c.save();
        c.translate(this.rx, this.ry);
        c.scale(this.rs, this.rs);
        c.translate(-CX, -CY);
        this.drawDough(c);
        c.restore();
      } else {
        this.drawRoti(c);
      }
      if (this.phase === 'roll') this.drawPin(c);
    },

    drawBoard(c, dy) {
      c.save();
      c.translate(CX, CY + dy);
      c.fillStyle = 'rgba(30,14,4,0.32)';
      c.beginPath();
      c.arc(5, 12, 296, 0, Math.PI * 2);
      c.fill();
      const g = c.createRadialGradient(0, -50, 40, 0, 0, 300);
      g.addColorStop(0, '#E2B478');
      g.addColorStop(1, '#C48F52');
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, 292, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(112,64,26,0.2)';
      c.lineWidth = 2;
      for (let r = 40; r < 290; r += 42) {
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    },

    drawTawa(c, dy) {
      c.save();
      c.translate(TAWA.x, TAWA.y + dy);
      c.scale(TAWA.r / 272, TAWA.r / 272);
      const flicker = 0.85 + 0.15 * Math.sin(CB.time * 9);
      const glow = c.createRadialGradient(0, 0, 220, 0, 0, 345);
      glow.addColorStop(0, 'rgba(255,130,30,' + 0.62 * flicker + ')');
      glow.addColorStop(1, 'rgba(255,110,20,0)');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(0, 0, 345, 0, Math.PI * 2);
      c.fill();
      const g = c.createRadialGradient(-40, -60, 30, 0, 0, 280);
      g.addColorStop(0, '#4A4340');
      g.addColorStop(1, '#201C1B');
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, 272, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.13)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, 268, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    },

    // A steel plate beside the tawa.
    drawPlate(c, dy) {
      const x = PLATE.x;
      const y = PLATE.y + dy;
      c.fillStyle = 'rgba(30,14,4,0.32)';
      c.beginPath();
      c.arc(x + 5, y + 10, PLATE.r + 2, 0, Math.PI * 2);
      c.fill();
      const g = c.createLinearGradient(x - PLATE.r, y - PLATE.r, x + PLATE.r, y + PLATE.r);
      g.addColorStop(0, '#EEF1F2');
      g.addColorStop(0.5, '#BCC3C7');
      g.addColorStop(1, '#8D959A');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, PLATE.r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#A7AFB4';
      c.beginPath();
      c.arc(x, y, PLATE.r - 16, 0, Math.PI * 2);
      c.fill();
      const ready = this.held || (this.phase === 'cook' && this.cook[0] >= 1 && this.cook[1] >= 1);
      if (ready) {
        c.strokeStyle = 'rgba(251,241,222,' + (0.5 + 0.35 * Math.sin(CB.time * 5)) + ')';
        c.lineWidth = 5;
        c.beginPath();
        c.arc(x, y, PLATE.r + 9, 0, Math.PI * 2);
        c.stroke();
      }
    },

    dough(c) {
      const R = this.R;
      const pt = (i) => {
        const j = (i + N) % N;
        const a = (j / N) * Math.PI * 2;
        return [CX + Math.cos(a) * R[j], CY + Math.sin(a) * R[j]];
      };
      c.beginPath();
      const first = pt(0);
      const second = pt(1);
      c.moveTo((first[0] + second[0]) / 2, (first[1] + second[1]) / 2);
      for (let i = 1; i <= N; i++) {
        const a = pt(i);
        const b = pt(i + 1);
        c.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      c.closePath();
    },

    drawDough(c) {
      c.save();
      c.translate(4, 8);
      this.dough(c);
      c.fillStyle = 'rgba(70,40,14,0.24)';
      c.fill();
      c.restore();
      const avg = this.R.reduce((a, b) => a + b, 0) / N;
      this.dough(c);
      const g = c.createRadialGradient(CX - 20, CY - 30, avg * 0.2, CX, CY, avg * 1.05);
      g.addColorStop(0, '#F7E7C3');
      g.addColorStop(1, '#E7CD9A');
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = 'rgba(140,96,48,0.32)';
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.65)';
      for (const f of FLOUR) {
        c.beginPath();
        c.arc(CX + Math.cos(f.a) * f.d * avg, CY + Math.sin(f.a) * f.d * avg, f.s, 0, Math.PI * 2);
        c.fill();
      }
    },

    drawRoti(c) {
      const breath = this.puff > 0 ? Math.sin(CB.time * 3.2) * 0.012 : 0;
      const size = this.rs * (1 + PUFF_SIZE * this.puff + breath);
      if (this.held || this.puff > 0) {
        // A puffed roti stands off the surface, so its shadow falls further away.
        const drop = this.held ? 18 : 16 * this.puff;
        c.fillStyle = 'rgba(14,8,4,0.42)';
        c.beginPath();
        c.arc(this.rx + drop * 0.55, this.ry + drop, TARGET * size, 0, Math.PI * 2);
        c.fill();
      }
      c.save();
      c.translate(this.rx, this.ry);
      if (this.flipT >= 0) {
        const squash = Math.abs(Math.cos(this.flipT * Math.PI));
        c.translate(0, -60 * Math.sin(this.flipT * Math.PI));
        c.scale(1, Math.max(0.05, squash));
      }
      c.scale(size, size);
      const g = c.createRadialGradient(-20, -40, 20, 0, 0, TARGET);
      g.addColorStop(0, CB.mixColor('#F1DDB0', '#F2CF8C', this.cook[this.side]));
      g.addColorStop(1, CB.mixColor('#E2C690', '#D9A765', this.cook[this.side]));
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, TARGET, 0, Math.PI * 2);
      c.fill();
      for (const s of this.spots[this.side]) {
        const a = CB.clamp((this.cook[this.side] - s.at) / 0.25, 0, 1);
        if (a <= 0) continue;
        const spot = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
        spot.addColorStop(0, 'rgba(92,48,16,' + 0.78 * a + ')');
        spot.addColorStop(1, 'rgba(120,66,22,0)');
        c.fillStyle = spot;
        c.beginPath();
        c.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        c.fill();
      }
      // A side only darkens slightly while it can be saved, then chars once burnt.
      const burn = Math.max(this.burn[this.side] * CATCHING_LOOK, this.charred);
      if (burn > 0) {
        c.fillStyle = 'rgba(38,20,10,' + 0.72 * burn + ')';
        c.beginPath();
        c.arc(0, 0, TARGET, 0, Math.PI * 2);
        c.fill();
        const strength = Math.min(1, burn * 1.5);
        for (const s of this.spots[this.side]) {
          const size = s.size * (0.8 + burn * 3);
          const char = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, size);
          char.addColorStop(0, 'rgba(10,6,4,' + strength + ')');
          char.addColorStop(0.55, 'rgba(22,12,7,' + 0.75 * strength + ')');
          char.addColorStop(1, 'rgba(30,16,8,0)');
          c.fillStyle = char;
          c.beginPath();
          c.arc(s.x, s.y, size, 0, Math.PI * 2);
          c.fill();
        }
      }
      if (this.puff > 0) {
        // Shading that makes the flat disc read as an inflated ball.
        const k = Math.min(1, this.puff);
        const dome = c.createRadialGradient(-70, -90, 10, -10, -14, TARGET * 1.04);
        dome.addColorStop(0, 'rgba(255,252,238,' + 0.9 * k + ')');
        dome.addColorStop(0.32, 'rgba(255,244,214,' + 0.42 * k + ')');
        dome.addColorStop(0.72, 'rgba(160,100,44,' + 0.1 * k + ')');
        dome.addColorStop(1, 'rgba(84,44,14,' + 0.72 * k + ')');
        c.fillStyle = dome;
        c.beginPath();
        c.arc(0, 0, TARGET, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,' + 0.6 * k + ')';
        c.lineWidth = 10;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(0, 0, TARGET * 0.8, Math.PI * 1.08, Math.PI * 1.42);
        c.stroke();
      }
      c.restore();
    },

    drawPin(c) {
      const p = this.pin;
      const bob = p.active ? 0 : Math.sin(CB.time * 2.4) * 8;
      c.save();
      c.translate(p.x, p.y + bob);
      c.rotate(p.angle);
      c.fillStyle = 'rgba(40,20,6,0.3)';
      CB.rr(c, -176, -12, 352, 38, 19);
      c.fill();
      const g = c.createLinearGradient(0, -19, 0, 19);
      g.addColorStop(0, '#E9C184');
      g.addColorStop(0.5, '#C98F4E');
      g.addColorStop(1, '#8F5C2C');
      c.fillStyle = g;
      CB.rr(c, -176, -8, 352, 16, 8);
      c.fill();
      CB.rr(c, -122, -19, 244, 38, 16);
      c.fill();
      c.restore();
    },
  };

  CB.levels.push(level);
})();
