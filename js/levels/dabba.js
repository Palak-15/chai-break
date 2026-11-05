// Pour seven spices into the masala dabba, arranged however you like. The player
// stops each pour, and holding on too long makes the bowl overflow onto the tin.
(function () {
  'use strict';

  const CB = window.CB;
  const TIN = { x: 400, y: 340, r: 238 };
  const BOWL_R = 68;
  const HOME = { x: 400, y: 730 };
  const POUR_DELAY = 0.18;
  const FILL_TIME = 1.7; // Seconds of pouring to fill a bowl.
  const FULL_ENOUGH = 0.82; // Letting go from here counts as a full bowl.
  const OVER_GRACE = 0.2; // Seconds a bowl can sit full before it starts to spill.
  const OVER_FAIL = 2.2; // Seconds of spilling in one attempt before it is too much.
  const SPILL_AFTER = 0.5; // Seconds held still away from a bowl before spice spills.
  const SPILL_TIME = 2.2; // Seconds until a whole packet has spilled.
  const MAX_SPILL = 700;

  const SPICES = [
    { name: 'turmeric', title: 'Turmeric', base: '#E5AC1E', grain: '#F4C940', kind: 'powder' },
    { name: 'red chilli', title: 'Red chilli', base: '#A82A1A', grain: '#D2482A', kind: 'powder' },
    { name: 'cumin', title: 'Cumin', base: '#7C5A30', grain: '#A98150', kind: 'seed' },
    { name: 'mustard seeds', title: 'Mustard', base: '#2B2422', grain: '#4A3D36', kind: 'round' },
    { name: 'coriander', title: 'Coriander', base: '#8B8440', grain: '#ABA55C', kind: 'powder' },
    { name: 'fenugreek', title: 'Fenugreek', base: '#B98535', grain: '#D6A650', kind: 'chunk' },
    { name: 'garam masala', title: 'Garam masala', base: '#5E371B', grain: '#8A5A2E', kind: 'powder' },
  ];

  function makeHeap(spice, seed) {
    const size = BOWL_R * 2;
    const off = document.createElement('canvas');
    off.width = off.height = size * 2;
    const c = off.getContext('2d');
    c.scale(2, 2);
    const g = c.createRadialGradient(size * 0.42, size * 0.4, 6, size / 2, size / 2, size / 2);
    g.addColorStop(0, CB.mixColor(spice.base, '#FFFFFF', 0.14));
    g.addColorStop(1, spice.base);
    c.fillStyle = g;
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    c.fill();
    const r = CB.rng(seed);
    const count = spice.kind === 'powder' ? 460 : 240;
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * (size / 2 - 2);
      const x = size / 2 + Math.cos(a) * d;
      const y = size / 2 + Math.sin(a) * d;
      c.fillStyle = CB.mixColor(spice.grain, r() > 0.5 ? '#FFFFFF' : '#201008', r() * 0.3);
      c.beginPath();
      if (spice.kind === 'seed') c.ellipse(x, y, 4.2, 1.5, r() * 6, 0, Math.PI * 2);
      else if (spice.kind === 'round') c.arc(x, y, 2.2, 0, Math.PI * 2);
      else if (spice.kind === 'chunk') c.rect(x - 1.8, y - 1.8, 3.6, 3.6);
      else c.arc(x, y, 0.9, 0, Math.PI * 2);
      c.fill();
    }
    return off;
  }

  function makeBowls() {
    const list = [{ x: TIN.x, y: TIN.y, fill: 0, over: 0, spice: null }];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      list.push({ x: TIN.x + Math.cos(a) * 152, y: TIN.y + Math.sin(a) * 152, fill: 0, over: 0, spice: null });
    }
    return list;
  }

  const level = {
    id: 'dabba',
    title: 'Masala Dabba',
    bg: 'stone',

    enter() {
      this.bowls = makeBowls();
      this.heaps = SPICES.map((s, i) => makeHeap(s, 100 + i * 17));
      this.current = 0;
      this.packet = { x: HOME.x, y: HOME.y, held: false, left: 1, bowl: null };
      this.hover = null;
      this.dwell = 0;
      this.lastMove = 0;
      this.spills = [];
      this.overTotal = 0;
      this.pinged = false;
      this.state = 'spices';
      this.lid = { x: 400, y: 900, held: false, on: false };
      this.setSpicePrompt();
    },

    setSpicePrompt() {
      this.prompt = 'Drag the ' + SPICES[this.current].name + ' into any bowl';
    },

    down(p) {
      if (this.state === 'spices') {
        const dx = p.x - this.packet.x;
        const dy = p.y - this.packet.y;
        if (Math.abs(dx) < 110 && dy > -170 && dy < 70) {
          this.packet.held = true;
          this.lastMove = CB.time;
          CB.audio.clink(2000);
          this.packet.x = p.x;
          this.packet.y = p.y;
        }
      } else if (this.state === 'lid') {
        if (CB.dist(p.x, p.y, this.lid.x, this.lid.y) < TIN.r + 10) {
          this.lid.held = true;
          CB.audio.clink(1100);
          this.lid.grabX = p.x - this.lid.x;
          this.lid.grabY = p.y - this.lid.y;
        }
      }
    },

    move(p) {
      if (this.packet.held) {
        if (CB.dist(p.x, p.y, this.packet.x, this.packet.y) > 4) this.lastMove = CB.time;
        this.packet.x = p.x;
        this.packet.y = p.y;
      }
      if (this.lid.held) {
        this.lid.x = p.x - this.lid.grabX;
        this.lid.y = p.y - this.lid.grabY;
      }
    },

    up() {
      const s = this.packet;
      if (s.held) {
        CB.audio.click();
        s.held = false;
        if (s.bowl) {
          if (s.bowl.fill >= FULL_ENOUGH) this.bowlDone();
          else CB.audio.nope();
        }
      }
      if (this.lid.held) {
        this.lid.held = false;
        if (CB.dist(this.lid.x, this.lid.y, TIN.x, TIN.y) < 170) {
          this.lid.on = true;
          this.state = 'closing';
        } else {
          CB.audio.nope();
        }
      }
    },

    bowlUnderPacket() {
      const s = this.packet;
      for (const b of this.bowls) {
        if (CB.dist(s.x, s.y, b.x, b.y) > BOWL_R + 12) continue;
        // A half-poured spice must finish in the bowl it started in.
        if (s.bowl && s.bowl !== b) continue;
        if (!s.bowl && b.spice !== null) continue;
        return b;
      }
      return null;
    },

    update(dt) {
      const s = this.packet;
      if (this.state === 'spices') {
        let pouring = false;
        if (s.held) {
          const b = this.bowlUnderPacket();
          if (b === this.hover) this.dwell += dt;
          else {
            this.hover = b;
            this.dwell = 0;
          }
          // A short pause over a bowl starts the pour, so dragging across one does not.
          if (b && (this.dwell > POUR_DELAY || s.bowl === b)) {
            pouring = true;
            if (s.bowl !== b) CB.audio.clink(2700);
            b.spice = this.current;
            s.bowl = b;
            this.pour(b, dt);
            this.fall(b);
          } else if (!b) {
            // Moving away from a full bowl finishes it, just like letting go.
            if (s.bowl && s.bowl.fill >= FULL_ENOUGH) this.bowlDone();
            else pouring = this.handleAwayFromBowl(dt);
          }
        } else {
          this.hover = null;
          if (s.bowl) this.prompt = 'Not full yet. Finish the ' + SPICES[this.current].name;
          s.x = CB.lerp(s.x, HOME.x, Math.min(1, dt * 9));
          s.y = CB.lerp(s.y, HOME.y, Math.min(1, dt * 9));
        }
        if (this.state === 'spices') CB.audio.setLoop('grain', pouring ? 0.3 : 0);
      } else if (this.state === 'lid') {
        CB.audio.setLoop('grain', 0);
        if (!this.lid.held) {
          this.lid.y = CB.lerp(this.lid.y, 880 + Math.sin(CB.time * 2.4) * 8, Math.min(1, dt * 6));
          this.lid.x = CB.lerp(this.lid.x, 400, Math.min(1, dt * 6));
        }
      } else if (this.state === 'closing') {
        this.lid.x = CB.lerp(this.lid.x, TIN.x, Math.min(1, dt * 12));
        this.lid.y = CB.lerp(this.lid.y, TIN.y, Math.min(1, dt * 12));
        if (CB.dist(this.lid.x, this.lid.y, TIN.x, TIN.y) < 1.5) {
          this.lid.x = TIN.x;
          this.lid.y = TIN.y;
          this.state = 'done';
          CB.audio.thunk();
          CB.finishLevel(
            this,
            this.spills.length > 0
              ? 'Packed, with a little spice on the side.'
              : "All packed for tomorrow's cooking.",
            this.spills.length > 0 ? 2 : 5
          );
        }
      }
    },

    // Returns true while spice is spilling, so the pouring sound keeps playing.
    handleAwayFromBowl(dt) {
      const s = this.packet;
      const taken = this.bowls.some(
        (x) => x.spice !== null && x !== s.bowl && CB.dist(s.x, s.y, x.x, x.y) <= BOWL_R + 12
      );
      if (taken) {
        if (!this.overFull) CB.audio.nope();
        this.overFull = true;
        this.prompt = 'That bowl is full. Pick an empty one';
        this.lastMove = CB.time;
        return false;
      }
      this.overFull = false;
      if (s.bowl) return false;
      const away = CB.dist(s.x, s.y, HOME.x, HOME.y) > 110;
      if (!away || CB.time - this.lastMove < SPILL_AFTER) {
        this.setSpicePrompt();
        return false;
      }
      this.prompt = "You're spilling it! Move over a bowl";
      this.spillSpice(dt);
      return true;
    },

    spillSpice(dt) {
      const s = this.packet;
      const spice = SPICES[this.current];
      s.left -= dt / SPILL_TIME;
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 46;
        this.addSpill(s.x + Math.cos(a) * d, s.y + 14 + Math.sin(a) * d * 0.6, spice);
      }
      this.fall({ x: s.x, y: s.y });
      if (s.left <= 0) {
        s.held = false;
        s.left = 1;
        s.x = HOME.x;
        s.y = HOME.y + 140;
        this.prompt = "Spilled! Here's a fresh packet";
        CB.audio.oops();
      }
    },

    addSpill(x, y, spice) {
      if (this.spills.length >= MAX_SPILL) return;
      this.spills.push({ x, y, size: 1.4 + Math.random() * 2, color: spice.grain });
    },

    // Pouring is in the player's hands: nothing stops it when the bowl is full.
    pour(b, dt) {
      b.fill = Math.min(1, b.fill + dt / FILL_TIME);
      if (b.fill >= FULL_ENOUGH && !this.pinged) {
        this.pinged = true;
        CB.audio.ping();
      }
      if (b.fill < FULL_ENOUGH) {
        this.prompt = 'Keep pouring until the bowl is full';
      } else if (b.fill < 1) {
        this.prompt = 'Full! Let go now';
      } else {
        this.overflow(b, dt);
      }
    },

    overflow(b, dt) {
      b.over += dt;
      this.prompt = "It's overflowing! Let go";
      if (b.over < OVER_GRACE) return;
      this.overTotal += dt;
      const spice = SPICES[this.current];
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = BOWL_R + Math.random() * Math.random() * 62;
        this.addSpill(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, spice);
      }
      if (Math.random() < dt * 8) CB.audio.blot();
      if (this.overTotal >= OVER_FAIL) {
        this.state = 'failed';
        this.packet.held = false;
        CB.failLevel(this, "Spice everywhere! Let's start again.");
      }
    },

    // The current spice is finished, so the next packet comes up.
    bowlDone() {
      const s = this.packet;
      CB.audio.note(this.current);
      s.held = false;
      s.bowl = null;
      s.left = 1;
      this.hover = null;
      this.pinged = false;
      s.x = HOME.x;
      s.y = HOME.y + 140;
      this.current += 1;
      if (this.current >= SPICES.length) {
        this.state = 'lid';
        this.prompt = 'All full. Drag the lid onto the tin';
        this.lid.y = 900;
      } else {
        this.setSpicePrompt();
      }
    },

    fall(b) {
      const spice = SPICES[this.current];
      const s = this.packet;
      for (let i = 0; i < 2; i++) {
        CB.fx.add({
          x: s.x + (Math.random() - 0.5) * 20,
          y: s.y + 6,
          vx: (b.x - s.x) * 0.7 + (Math.random() - 0.5) * 30,
          vy: 30 + Math.random() * 20,
          g: 360,
          life: 0.36,
          size: 1.6 + Math.random() * 2,
          color: spice.grain,
        });
      }
    },

    draw(c) {
      this.drawTin(c);
      for (const b of this.bowls) this.drawBowl(c, b);
      for (const g of this.spills) {
        c.fillStyle = g.color;
        c.beginPath();
        c.arc(g.x, g.y, g.size, 0, Math.PI * 2);
        c.fill();
      }
      if (this.state === 'spices') this.drawPacket(c);
      if (this.state !== 'spices') this.drawLid(c);
    },

    drawTin(c) {
      c.fillStyle = 'rgba(50,40,30,0.3)';
      c.beginPath();
      c.arc(TIN.x + 6, TIN.y + 12, TIN.r + 2, 0, Math.PI * 2);
      c.fill();
      const g = c.createLinearGradient(TIN.x - TIN.r, TIN.y - TIN.r, TIN.x + TIN.r, TIN.y + TIN.r);
      g.addColorStop(0, '#E8ECEE');
      g.addColorStop(0.5, '#B2BABE');
      g.addColorStop(1, '#858D92');
      c.fillStyle = g;
      c.beginPath();
      c.arc(TIN.x, TIN.y, TIN.r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#9CA4A9';
      c.beginPath();
      c.arc(TIN.x, TIN.y, TIN.r - 13, 0, Math.PI * 2);
      c.fill();
    },

    drawBowl(c, b) {
      const g = c.createLinearGradient(b.x - BOWL_R, b.y - BOWL_R, b.x + BOWL_R, b.y + BOWL_R);
      g.addColorStop(0, '#F0F3F4');
      g.addColorStop(1, '#8F979C');
      c.fillStyle = g;
      c.beginPath();
      c.arc(b.x, b.y, BOWL_R, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#737B80';
      c.beginPath();
      c.arc(b.x, b.y, BOWL_R - 7, 0, Math.PI * 2);
      c.fill();
      if (b.spice !== null && b.fill > 0) {
        c.save();
        c.beginPath();
        c.arc(b.x, b.y, BOWL_R - 7, 0, Math.PI * 2);
        c.clip();
        const rad = (BOWL_R - 7) * Math.sqrt(b.fill);
        c.drawImage(this.heaps[b.spice], b.x - rad, b.y - rad, rad * 2, rad * 2);
        c.restore();
        // An overfilled bowl heaps up past its rim.
        if (b.over > 0) {
          const heap = (BOWL_R - 7) * (1 + Math.min(0.24, b.over * 0.2));
          c.drawImage(this.heaps[b.spice], b.x - heap, b.y - heap, heap * 2, heap * 2);
        }
      }
      const s = this.packet;
      if (this.state === 'spices' && (s.bowl === b || (s.held && this.hover === b))) {
        c.strokeStyle = b.fill >= 1 ? CB.colors.chilli : CB.colors.marigold;
        c.lineWidth = 5;
        c.beginPath();
        c.arc(b.x, b.y, BOWL_R + 4, 0, Math.PI * 2);
        c.stroke();
      }
    },

    // A paper spice packet, with its open corner on the pointer.
    drawPacket(c) {
      const s = this.packet;
      const spice = SPICES[this.current];
      const bob = s.held ? 0 : Math.sin(CB.time * 2.6) * 5;
      c.save();
      c.translate(s.x, s.y + bob);
      c.rotate(s.held ? -0.75 : -0.12);
      c.fillStyle = 'rgba(40,30,20,0.22)';
      CB.rr(c, -46, -128, 112, 134, 12);
      c.fill();
      c.fillStyle = spice.base;
      c.beginPath();
      c.moveTo(-14, 0);
      c.lineTo(52, 0);
      c.lineTo(58, -130);
      c.lineTo(-52, -130);
      c.lineTo(-52, -34);
      c.closePath();
      c.fill();
      // A pale band with the spice's name.
      c.fillStyle = 'rgba(251,241,222,0.94)';
      c.fillRect(-52, -96, 110, 46);
      CB.fitText(c, spice.title, 3, -72, 24, 98, { weight: 700 });
      c.restore();
    },

    drawLid(c) {
      const l = this.lid;
      c.fillStyle = 'rgba(50,40,30,0.18)';
      c.beginPath();
      c.arc(l.x + 5, l.y + 9, TIN.r + 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(226,240,246,0.3)';
      c.beginPath();
      c.arc(l.x, l.y, TIN.r + 2, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.lineWidth = 7;
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      c.lineWidth = 9;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(l.x, l.y, TIN.r - 44, Math.PI * 1.1, Math.PI * 1.42);
      c.stroke();
    },
  };

  CB.levels.push(level);
})();
