// Pour three glasses so the froth stops right at the line. Get it right and a
// hand lifts the glass for a long sip. Overfill it and it is too hot to hold.
(function () {
  'use strict';

  const CB = window.CB;
  const GLASS_X = 410;
  const BASE_Y = 690;
  const HEIGHT = 230;
  const TOP_W = 152;
  const BOTTOM_W = 108;
  const MARK = HEIGHT * 0.76; // Height of the marker line, from the base.
  const CLOSE_ENOUGH = 12; // How far the froth may be from the line.
  const DEAD_ON = 5; // Closer than this earns the top reward.
  const POUR_RATE = 0.19; // Share of the glass filled per second.
  const LOW = 400; // Lowest spout position, in stage y.
  const HIGH = 240;
  const REST_Y = 300;
  const SPILL_LIMIT = 1.1; // Seconds of overflow before the pour is forced to stop.
  const GRIP = HEIGHT * 0.45; // Where the hand holds the glass, up from the base.
  const SKIN = '#CB8E61';
  const SKIN_EDGE = '#8E5A36';

  function glassPath(c) {
    c.beginPath();
    c.moveTo(-TOP_W / 2, -HEIGHT);
    c.lineTo(TOP_W / 2, -HEIGHT);
    c.lineTo(BOTTOM_W / 2, -6);
    c.quadraticCurveTo(BOTTOM_W / 2, 0, BOTTOM_W / 2 - 8, 0);
    c.lineTo(-BOTTOM_W / 2 + 8, 0);
    c.quadraticCurveTo(-BOTTOM_W / 2, 0, -BOTTOM_W / 2, -6);
    c.closePath();
  }

  function widthAt(h) {
    return CB.lerp(BOTTOM_W, TOP_W, h / HEIGHT);
  }

  // The height of the top of the froth, which is what the line measures.
  function frothTop(g) {
    return Math.min(HEIGHT, HEIGHT * g.fill + g.foam);
  }

  function drawGlass(c, g, inAir) {
    if (!inAir) {
      c.fillStyle = 'rgba(30,14,4,0.25)';
      c.beginPath();
      c.ellipse(4, 3, BOTTOM_W / 2 + 8, 9, 0, 0, Math.PI * 2);
      c.fill();
    }

    glassPath(c);
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fill();

    c.save();
    glassPath(c);
    c.clip();
    const liquid = Math.min(HEIGHT * g.fill, HEIGHT - g.foam);
    if (liquid > 0 || g.foam > 0) {
      const grad = c.createLinearGradient(0, -Math.max(liquid, 1), 0, 0);
      grad.addColorStop(0, '#BC7C3E');
      grad.addColorStop(1, '#8A4F22');
      c.fillStyle = grad;
      c.fillRect(-TOP_W, -liquid, TOP_W * 2, liquid);
      if (g.foam > 0) {
        const w = widthAt(liquid);
        c.fillStyle = '#EBD0A5';
        c.fillRect(-TOP_W, -liquid - g.foam, TOP_W * 2, g.foam + 2);
        c.fillStyle = 'rgba(255,248,232,0.75)';
        const r = CB.rng(g.seed);
        const count = Math.round(g.foam * 1.6);
        for (let i = 0; i < count; i++) {
          c.beginPath();
          c.arc((r() - 0.5) * w, -liquid - r() * g.foam, 1.5 + r() * 3.2, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    if (g.drunk) {
      // The thin line a finished chai leaves behind.
      c.fillStyle = 'rgba(190,140,86,0.55)';
      c.fillRect(-TOP_W, -MARK, TOP_W * 2, 6);
      c.fillStyle = 'rgba(138,79,34,0.65)';
      c.fillRect(-TOP_W, -10, TOP_W * 2, 10);
    }
    // The fluted sides of a cutting chai glass.
    c.strokeStyle = 'rgba(255,255,255,0.3)';
    c.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo((i / 3) * (TOP_W / 2 - 6), -HEIGHT);
      c.lineTo((i / 3) * (BOTTOM_W / 2 - 6), -8);
      c.stroke();
    }
    c.restore();

    glassPath(c);
    c.strokeStyle = 'rgba(255,255,255,0.72)';
    c.lineWidth = 3.5;
    c.stroke();
  }

  function capsule(c, x0, y0, x1, y1, width, color) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  }

  // The arm and palm go behind the glass, the fingers in front of it.
  function drawHandBack(c) {
    for (const [extra, color] of [[5, SKIN_EDGE], [0, SKIN]]) {
      capsule(c, 96, 8, 1050, 900, 96 + extra, color);
      capsule(c, 66, -40, 86, 30, 92 + extra, color);
    }
    // A bangle at the wrist.
    c.save();
    c.translate(190, 96);
    c.rotate(0.75);
    c.fillStyle = CB.colors.marigold;
    CB.rr(c, -9, -54, 18, 108, 8);
    c.fill();
    c.restore();
  }

  function drawHandFront(c, open) {
    const reach = open ? 34 : -58;
    for (let i = 0; i < 4; i++) {
      const y = -56 + i * 27;
      capsule(c, 74, y, reach, y - 3, 28, SKIN_EDGE);
      capsule(c, 74, y, reach, y - 3, 24, SKIN);
    }
    capsule(c, 74, -74, open ? 44 : 2, -84, 28, SKIN_EDGE);
    capsule(c, 74, -74, open ? 44 : 2, -84, 24, SKIN);
  }

  function drawKettle(c, sx, sy, tilt) {
    c.save();
    c.translate(sx, sy);
    c.rotate(-tilt);

    const bodyX = 170;
    const bodyY = -42;
    // Spout.
    c.beginPath();
    c.moveTo(0, -6);
    c.quadraticCurveTo(52, 2, 104, -48);
    c.lineTo(112, -2);
    c.quadraticCurveTo(52, 28, -3, 8);
    c.closePath();
    c.fillStyle = '#AEB6BA';
    c.fill();

    // Handle.
    c.strokeStyle = '#3B2A1E';
    c.lineWidth = 15;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bodyX + 70, bodyY - 42);
    c.bezierCurveTo(bodyX + 150, bodyY - 66, bodyX + 148, bodyY + 48, bodyX + 76, bodyY + 34);
    c.stroke();

    // Body.
    const g = c.createLinearGradient(bodyX - 90, bodyY - 80, bodyX + 80, bodyY + 80);
    g.addColorStop(0, '#E7ECEE');
    g.addColorStop(0.45, '#B6BEC2');
    g.addColorStop(1, '#7E878C');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(bodyX, bodyY, 90, 76, 0, 0, Math.PI * 2);
    c.fill();

    // Lid.
    c.fillStyle = '#9AA3A8';
    c.beginPath();
    c.ellipse(bodyX, bodyY - 74, 54, 13, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3B2A1E';
    c.beginPath();
    c.arc(bodyX, bodyY - 88, 10, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  const POUR_PROMPT = 'Hold to pour. Stop when the froth meets the line';

  const level = {
    id: 'chai',
    title: 'Chai',
    bg: 'stall',
    cardY: 104,

    enter() {
      this.glasses = [];
      this.pouring = false;
      this.spoutY = REST_Y;
      this.targetY = REST_Y;
      this.tilt = 0;
      this.away = 0;
      this.puddle = 0;
      this.shards = [];
      this.drops = 0;
      this.label = null;
      this.hand = null;
      this.newRound();
    },

    newRound() {
      this.current = { fill: 0, foam: 0, over: 0, seed: 40 + this.glasses.length * 7 };
      this.pos = { x: GLASS_X, y: BASE_Y, scale: 1, rot: 0 };
      this.gone = false;
      this.state = 'pour';
      this.t = 0;
      this.pinged = false;
      this.targetY = REST_Y;
      this.prompt = POUR_PROMPT;
    },

    down(p) {
      if (this.state !== 'pour') return;
      this.pouring = true;
      this.targetY = CB.clamp(p.y, HIGH, LOW);
      this.prompt = POUR_PROMPT;
      CB.audio.clink(1500);
    },

    move(p) {
      if (this.pouring) this.targetY = CB.clamp(p.y, HIGH, LOW);
    },

    up() {
      if (!this.pouring) return;
      this.pouring = false;
      this.targetY = REST_Y;
      CB.audio.setLoop('pour', 0);
      if (this.state === 'pour') this.judge();
    },

    judge() {
      const miss = frothTop(this.current) - MARK;
      if (miss < -CLOSE_ENOUGH) {
        if (this.current.fill > 0.02) {
          this.prompt = 'Not at the line yet. Keep pouring';
          CB.audio.nope();
        }
        return;
      }
      this.verdict = Math.abs(miss) <= CLOSE_ENOUGH ? 'good' : 'hot';
      this.deadOn = Math.abs(miss) <= DEAD_ON;
      this.prompt = null;
      this.state = 'reach';
      this.t = 0;
      const right = (CB.view.w - CB.view.ox) / CB.view.scale;
      this.handFrom = { x: Math.max(1000, right + 120), y: 880 };
      this.hand = { x: this.handFrom.x, y: this.handFrom.y, scale: 1, rot: 0, open: true };
      CB.audio.whoosh();
    },

    setLabel(text, x, y) {
      this.label = { text, x, y, t: 0 };
    },

    update(dt) {
      this.spoutY = CB.lerp(this.spoutY, this.targetY, Math.min(1, dt * 12));
      this.tilt = CB.lerp(this.tilt, this.pouring ? 0.42 : 0, Math.min(1, dt * 10));
      const wantAway = this.state === 'pour' || this.state === 'done' ? 0 : 1;
      this.away = CB.lerp(this.away, wantAway, Math.min(1, dt * 7));
      if (this.label) {
        this.label.t += dt;
        if (this.label.t > 1.6) this.label = null;
      }

      this.t += dt;
      if (this.state === 'pour') this.updatePour(dt);
      else if (this.state === 'reach') this.updateReach();
      else if (this.state === 'lift') this.updateLift();
      else if (this.state === 'drink') this.updateDrink();
      else if (this.state === 'lower') this.updateLower();
      else if (this.state === 'hot') this.updateHot();
      else if (this.state === 'drop') this.updateDrop(dt);
      else if (this.state === 'leave') this.updateLeave();

      for (let i = 0; i < this.glasses.length; i++) {
        if (Math.random() < dt * 0.4) CB.steam(this.restX(i), BASE_Y - 100, 26);
      }
    },

    updatePour(dt) {
      const g = this.current;
      if (!this.pouring || this.tilt <= 0.28) {
        CB.audio.setLoop('pour', 0);
        return;
      }
      const lift = (LOW - this.spoutY) / (LOW - HIGH);
      g.fill = Math.min(1, g.fill + dt * POUR_RATE);
      g.foam = Math.min(40, g.foam + dt * (2 + 11 * lift * lift));
      const top = frothTop(g);
      CB.audio.setLoop('pour', 0.5 + lift * 0.2, 340 + (top / HEIGHT) * 1100);
      this.splash(lift);

      const miss = top - MARK;
      if (miss >= HEIGHT - MARK) {
        g.over += dt;
        this.puddle = Math.min(1, this.puddle + dt * 0.45);
        this.overflowDrips();
        this.prompt = "It's overflowing! Let go";
        if (g.over >= SPILL_LIMIT) {
          this.pouring = false;
          this.targetY = REST_Y;
          CB.audio.setLoop('pour', 0);
          this.judge();
        }
      } else if (miss > CLOSE_ENOUGH) {
        this.prompt = 'Too much! It will be too hot to hold';
      } else if (miss >= -CLOSE_ENOUGH) {
        this.prompt = 'Let go now!';
        if (!this.pinged) {
          this.pinged = true;
          CB.audio.ping();
        }
      }
    },

    updateReach() {
      const k = CB.ease(CB.clamp(this.t / 0.55, 0, 1));
      this.hand.x = CB.lerp(this.handFrom.x, GLASS_X, k);
      this.hand.y = CB.lerp(this.handFrom.y, BASE_Y, k);
      if (this.t < 0.55) return;
      this.hand.open = false;
      this.t = 0;
      CB.audio.clink(2300);
      if (this.verdict === 'good') {
        this.state = 'lift';
      } else {
        this.state = 'hot';
        CB.audio.hot();
        this.setLabel('Too hot!', 400, 400);
        this.prompt = 'Too full and too hot to hold!';
      }
    },

    // The glass is brought up towards the player, as if to their own lips.
    updateLift() {
      const k = CB.ease(CB.clamp(this.t / 0.6, 0, 1));
      this.pos.x = CB.lerp(GLASS_X, 400, k);
      this.pos.y = CB.lerp(BASE_Y, 640, k);
      this.pos.scale = CB.lerp(1, 1.45, k);
      this.pos.rot = CB.lerp(0, -0.2, k);
      this.syncHand();
      if (this.t < 0.6) return;
      this.state = 'drink';
      this.t = 0;
      this.startFill = this.current.fill;
      this.startFoam = this.current.foam;
      CB.audio.slurp(1.5);
      this.setLabel('Surrrrr…', 400, 170);
    },

    updateDrink() {
      const k = CB.clamp(this.t / 1.5, 0, 1);
      this.current.fill = this.startFill * (1 - k);
      this.current.foam = this.startFoam * (1 - k * k);
      this.pos.rot = CB.lerp(-0.2, -0.42, k);
      this.syncHand();
      if (Math.random() < 0.3) CB.steam(this.pos.x - 20, this.pos.y - HEIGHT * this.pos.scale, 50);
      if (this.t < 1.5) return;
      this.current.drunk = true;
      this.current.foam = 0;
      this.current.fill = 0;
      const coins = this.deadOn ? 3 : 2;
      CB.awardCoins(this, coins, 400, 300);
      this.setLabel(this.deadOn ? 'Perfect!' : 'Ahh, lovely', 400, 170);
      this.state = 'lower';
      this.t = 0;
    },

    updateLower() {
      const k = CB.ease(CB.clamp(this.t / 0.7, 0, 1));
      this.pos.x = CB.lerp(400, this.restX(this.glasses.length), k);
      this.pos.y = CB.lerp(640, BASE_Y, k);
      this.pos.scale = CB.lerp(1.45, 0.56, k);
      this.pos.rot = CB.lerp(-0.42, 0, k);
      this.syncHand();
      if (this.t < 0.7) return;
      CB.audio.clink(2600);
      this.glasses.push(this.current);
      this.gone = true;
      this.releaseHand();
    },

    // A flinch on contact, then the glass slips out of the hand.
    updateHot() {
      const k = CB.clamp(this.t / 0.5, 0, 1);
      this.pos.y = BASE_Y - 70 * CB.ease(k);
      this.pos.x = GLASS_X + Math.sin(this.t * 44) * 9;
      this.syncHand();
      if (this.t < 0.5) return;
      this.hand.open = true;
      this.state = 'drop';
      this.t = 0;
      this.fallSpeed = 0;
      CB.audio.whoosh();
    },

    updateDrop(dt) {
      this.fallSpeed += 2400 * dt;
      this.pos.y = Math.min(BASE_Y, this.pos.y + this.fallSpeed * dt);
      this.pos.x = GLASS_X;
      this.pos.rot += dt * 1.3;
      this.hand.x += dt * 620;
      this.hand.y -= dt * 200 - Math.sin(this.t * 40) * 3;
      if (this.pos.y < BASE_Y) return;
      this.shatter();
      this.gone = true;
      this.drops += 1;
      this.puddle = Math.min(1, this.puddle + 0.55);
      this.prompt = 'It broke! Stop at the line this time';
      this.releaseHand();
    },

    shatter() {
      CB.audio.smash();
      for (let i = 0; i < 26; i++) {
        CB.fx.add({
          x: GLASS_X + (Math.random() - 0.5) * 60,
          y: BASE_Y - 8,
          vx: (Math.random() - 0.5) * 460,
          vy: -80 - Math.random() * 320,
          g: 1100,
          life: 0.6,
          size: 2 + Math.random() * 3.4,
          color: i % 2 ? '#E9F2F2' : '#B57A40',
        });
      }
      for (let i = 0; i < 14 && this.shards.length < 42; i++) {
        this.shards.push({
          x: GLASS_X + (Math.random() - 0.5) * 240,
          y: BASE_Y + 2 + Math.random() * 22,
          size: 5 + Math.random() * 9,
          rot: Math.random() * 6,
        });
      }
    },

    releaseHand() {
      this.state = 'leave';
      this.t = 0;
      this.handFrom = { x: this.hand.x, y: this.hand.y };
      this.hand.open = true;
      this.hand.scale = this.hand.scale || 1;
    },

    updateLeave() {
      const k = CB.ease(CB.clamp(this.t / 0.45, 0, 1));
      const right = (CB.view.w - CB.view.ox) / CB.view.scale;
      this.hand.x = CB.lerp(this.handFrom.x, Math.max(1000, right + 120), k);
      this.hand.y = CB.lerp(this.handFrom.y, 880, k);
      this.hand.scale = CB.lerp(this.hand.scale, 1, k);
      this.hand.rot = CB.lerp(this.hand.rot, 0, k);
      if (this.t < 0.45) return;
      this.hand = null;
      if (this.glasses.length >= 3) {
        this.state = 'done';
        this.gone = true;
        this.targetY = 430;
        CB.finishLevel(
          this,
          this.drops > 0 ? 'Three sips, after one hot lesson.' : 'Three perfect cutting chais.'
        );
      } else {
        const prompt = this.prompt;
        this.newRound();
        if (prompt) this.prompt = prompt;
      }
    },

    syncHand() {
      this.hand.x = this.pos.x;
      this.hand.y = this.pos.y;
      this.hand.scale = this.pos.scale;
      this.hand.rot = this.pos.rot;
    },

    overflowDrips() {
      for (const side of [-1, 1]) {
        if (Math.random() > 0.55) continue;
        CB.fx.add({
          x: GLASS_X + (side * TOP_W) / 2,
          y: BASE_Y - HEIGHT + 2,
          vx: side * (6 + Math.random() * 14),
          vy: 10,
          g: 620,
          life: 0.5,
          size: 2.4 + Math.random() * 2.6,
          color: '#B57A40',
        });
      }
    },

    splash(lift) {
      if (Math.random() > 0.3 + lift * 0.5) return;
      CB.fx.add({
        x: GLASS_X + (Math.random() - 0.5) * 14,
        y: BASE_Y - frothTop(this.current),
        vx: (Math.random() - 0.5) * (50 + lift * 90),
        vy: -40 - Math.random() * (40 + lift * 120),
        g: 520,
        life: 0.42,
        size: 1.8 + Math.random() * 2.2,
        color: Math.random() > 0.5 ? '#F1DDBB' : '#C98B50',
      });
    },

    restX(i) {
      return 92 + i * 104;
    },

    withTransform(c, t, fn) {
      c.save();
      c.translate(t.x, t.y);
      c.rotate(t.rot || 0);
      const s = t.scale || 1;
      c.scale(s, s);
      fn();
      c.restore();
    },

    draw(c) {
      if (this.puddle > 0) {
        c.fillStyle = 'rgba(146,88,40,0.82)';
        c.beginPath();
        c.ellipse(GLASS_X + 6, BASE_Y + 8, 90 + 110 * this.puddle, 8 + 16 * this.puddle, 0, 0, Math.PI * 2);
        c.fill();
      }
      for (const s of this.shards) {
        c.save();
        c.translate(s.x, s.y);
        c.rotate(s.rot);
        c.fillStyle = 'rgba(232,242,242,0.85)';
        c.beginPath();
        c.moveTo(-s.size, s.size * 0.4);
        c.lineTo(s.size * 0.8, s.size * 0.6);
        c.lineTo(0, -s.size * 0.8);
        c.closePath();
        c.fill();
        c.restore();
      }
      for (let i = 0; i < this.glasses.length; i++) {
        this.withTransform(c, { x: this.restX(i), y: BASE_Y, scale: 0.56 }, () => drawGlass(c, this.glasses[i]));
      }

      const hand = this.hand;
      if (hand) this.withTransform(c, hand, () => {
        c.translate(0, -GRIP);
        drawHandBack(c);
      });
      if (!this.gone) {
        this.withTransform(c, this.pos, () => drawGlass(c, this.current, this.pos.y < BASE_Y));
      }
      if (this.state === 'pour') this.drawMarker(c);
      if (hand) this.withTransform(c, hand, () => {
        c.translate(0, -GRIP);
        drawHandFront(c, hand.open);
      });
      if (this.state === 'pour' && this.pouring && this.tilt > 0.28) this.drawStream(c);

      const restOffset = this.state === 'done' ? 40 : 0;
      const kettleX = GLASS_X + restOffset + (this.pouring ? -2 : 26) + this.away * 640;
      drawKettle(c, kettleX, this.spoutY, this.tilt);

      if (this.label) {
        c.globalAlpha = CB.clamp(1.6 - this.label.t, 0, 1);
        CB.text(c, this.label.text, this.label.x, this.label.y - this.label.t * 22, 46, {
          font: 'serif',
          italic: true,
          weight: 700,
          color: CB.colors.cream,
        });
        c.globalAlpha = 1;
      }
    },

    drawMarker(c) {
      const w = widthAt(MARK) / 2 + 14;
      c.setLineDash([9, 8]);
      c.strokeStyle = 'rgba(255,244,214,0.95)';
      c.lineWidth = 3.5;
      c.beginPath();
      c.moveTo(GLASS_X - w, BASE_Y - MARK);
      c.lineTo(GLASS_X + w, BASE_Y - MARK);
      c.stroke();
      c.setLineDash([]);
    },

    drawStream(c) {
      const surface = BASE_Y - frothTop(this.current);
      const top = this.spoutY;
      const wob = Math.sin(CB.time * 28) * 2;
      const grad = c.createLinearGradient(0, top, 0, surface);
      grad.addColorStop(0, '#C58747');
      grad.addColorStop(1, '#A7682F');
      c.fillStyle = grad;
      c.beginPath();
      c.moveTo(GLASS_X - 5, top);
      c.lineTo(GLASS_X + 6, top);
      c.lineTo(GLASS_X + 3.5 + wob, surface);
      c.lineTo(GLASS_X - 3.5 + wob, surface);
      c.closePath();
      c.fill();
    },
  };

  CB.levels.push(level);
})();
