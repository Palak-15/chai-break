// Core loop, input, drawing helpers, saving and the Playables SDK bridge.
// Every scene draws on a square 800 x 800 stage that is scaled to fit the
// viewport; backgrounds fill whatever space the stage leaves over.
(function () {
  'use strict';

  const CB = (window.CB = { levels: [], STAGE: 800 });
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const view = (CB.view = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 });

  CB.colors = {
    cream: '#FBF1DE',
    paper: '#F6E7C9',
    marigold: '#F2A31B',
    chilli: '#B8321F',
    terracotta: '#C65D34',
    teal: '#0F5C5E',
    deep: '#123A3C',
    ink: '#2B1B12',
    henna: '#6B2A14',
    leaf: '#4E7B3A',
  };

  const FONTS = {
    serif: 'Georgia, "Times New Roman", serif',
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  };

  // ---------- Small helpers ----------

  CB.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  CB.lerp = (a, b, t) => a + (b - a) * t;
  CB.ease = (t) => t * t * (3 - 2 * t);
  CB.dist = (a, b, x, y) => Math.hypot(a - x, b - y);

  // Repeatable randomness, so art does not change when it is redrawn.
  CB.rng = function (seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  CB.mixColor = function (a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const mix = (shift) =>
      Math.round(CB.lerp((pa >> shift) & 255, (pb >> shift) & 255, t));
    return 'rgb(' + mix(16) + ',' + mix(8) + ',' + mix(0) + ')';
  };

  CB.rr = function (c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };

  CB.text = function (c, str, x, y, size, opts) {
    const o = opts || {};
    c.font =
      (o.italic ? 'italic ' : '') +
      (o.weight || 500) + ' ' + size + 'px ' + FONTS[o.font || 'sans'];
    c.textAlign = o.align || 'center';
    c.textBaseline = o.baseline || 'middle';
    c.fillStyle = o.color || CB.colors.ink;
    c.fillText(str, x, y);
  };

  // Draws one line of text, shrinking it if needed so it never leaves its box.
  CB.fitText = function (c, str, x, y, size, maxWidth, opts) {
    const o = opts || {};
    const font = (s) =>
      (o.italic ? 'italic ' : '') + (o.weight || 500) + ' ' + s + 'px ' + FONTS[o.font || 'sans'];
    c.font = font(size);
    const width = c.measureText(str).width;
    const fitted = width > maxWidth ? Math.floor((size * maxWidth) / width) : size;
    CB.text(c, str, x, y, fitted, o);
    return fitted;
  };

  CB.textWidth = function (c, str, size, opts) {
    const o = opts || {};
    c.font = (o.italic ? 'italic ' : '') + (o.weight || 500) + ' ' + size + 'px ' + FONTS[o.font || 'sans'];
    return c.measureText(str).width;
  };

  // ---------- Particles ----------

  CB.Particles = function () {
    this.list = [];
  };
  CB.Particles.prototype = {
    add(p) {
      if (this.list.length > 600) this.list.shift();
      p.age = 0;
      this.list.push(p);
    },
    update(dt) {
      const l = this.list;
      for (let i = l.length - 1; i >= 0; i--) {
        const p = l[i];
        p.age += dt;
        if (p.age >= p.life) {
          l.splice(i, 1);
          continue;
        }
        p.vy += (p.g || 0) * dt;
        if (p.sway) p.x += Math.sin(p.age * 2.4 + p.phase) * p.sway * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.spin) p.rot += p.spin * dt;
      }
    },
    draw(c) {
      for (const p of this.list) {
        const k = 1 - p.age / p.life;
        c.globalAlpha = (p.alpha == null ? 1 : p.alpha) * Math.min(1, k * 2.5);
        c.fillStyle = p.color;
        if (p.shape === 'petal') {
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.beginPath();
          c.ellipse(0, 0, p.size, p.size * 0.58, 0, 0, Math.PI * 2);
          c.fill();
          c.restore();
        } else if (p.shape === 'steam') {
          // Fades out at the edge, so steam reads as a soft wisp rather than a disc.
          const r = p.size * (2.4 - k * 0.8);
          const puff = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          puff.addColorStop(0, 'rgba(' + p.rgb + ',1)');
          puff.addColorStop(1, 'rgba(' + p.rgb + ',0)');
          c.fillStyle = puff;
          c.beginPath();
          c.arc(p.x, p.y, r, 0, Math.PI * 2);
          c.fill();
        } else {
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.globalAlpha = 1;
    },
  };

  CB.fx = new CB.Particles();

  CB.steam = function (x, y, spread) {
    CB.fx.add({
      x: x + (Math.random() - 0.5) * spread,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: -40 - Math.random() * 30,
      phase: Math.random() * 6,
      sway: 24,
      life: 1.7,
      size: 9 + Math.random() * 7,
      alpha: 0.28,
      rgb: '255,255,255',
      shape: 'steam',
    });
  };

  CB.smoke = function (x, y, spread) {
    CB.fx.add({
      x: x + (Math.random() - 0.5) * spread,
      y,
      vx: (Math.random() - 0.5) * 12,
      vy: -55 - Math.random() * 35,
      phase: Math.random() * 6,
      sway: 30,
      life: 1.9,
      size: 14 + Math.random() * 12,
      alpha: 0.42,
      rgb: '55,50,47',
      shape: 'steam',
    });
  };

  CB.celebrate = function () {
    const colors = ['#F2A31B', '#F7C046', '#E8791C', '#FBE08A'];
    const left = -view.ox / view.scale;
    const right = (view.w - view.ox) / view.scale;
    const top = -view.oy / view.scale - 30;
    for (let i = 0; i < 70; i++) {
      CB.fx.add({
        x: CB.lerp(left, right, Math.random()),
        y: top - Math.random() * 500,
        vx: (Math.random() - 0.5) * 20,
        vy: 120 + Math.random() * 90,
        phase: Math.random() * 6,
        sway: 60,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 4,
        life: 6.5,
        size: 7 + Math.random() * 7,
        color: colors[i % colors.length],
        shape: 'petal',
      });
    }
  };

  // ---------- Coins: earned for playing well, and only ever spent inside the game ----------

  let shownCoins = 0;
  const flying = [];

  CB.drawCoin = function (c, x, y, r) {
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#FFE98A');
    g.addColorStop(0.65, '#F2B21B');
    g.addColorStop(1, '#C47F0E');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(130,78,8,0.75)';
    c.lineWidth = Math.max(1.5, r * 0.11);
    c.beginPath();
    c.arc(x, y, r * 0.68, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = 'rgba(130,78,8,0.85)';
    c.beginPath();
    c.arc(x, y, r * 0.2, 0, Math.PI * 2);
    c.fill();
  };

  function coinCounterPos() {
    return {
      x: (view.w - view.ox) / view.scale - 86,
      y: -view.oy / view.scale + 42,
    };
  }

  // Coins fly from where they were earned up to the counter, one at a time.
  CB.awardCoins = function (level, amount, x, y) {
    if (amount <= 0) return;
    if (level) level.earned = (level.earned || 0) + amount;
    CB.save.coins += amount;
    for (let i = 0; i < amount; i++) {
      flying.push({ x0: x + (i - amount / 2) * 16, y0: y, t: -i * 0.13, index: i });
    }
  };

  CB.updateCoins = function (dt) {
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      f.t += dt / 0.75;
      if (f.t >= 1) {
        flying.splice(i, 1);
        shownCoins = Math.min(CB.save.coins, shownCoins + 1);
        CB.audio.coin(f.index);
      }
    }
  };

  function drawCoinCounter(c) {
    const p = coinCounterPos();
    CB.rr(c, p.x - 66, p.y - 28, 136, 56, 28);
    c.fillStyle = 'rgba(18,28,28,0.82)';
    c.fill();
    CB.drawCoin(c, p.x - 36, p.y, 20);
    CB.text(c, String(shownCoins), p.x + 2, p.y + 1, 30, {
      align: 'left',
      weight: 700,
      color: CB.colors.cream,
    });
  }

  function drawFlyingCoins(c) {
    const p = coinCounterPos();
    for (const f of flying) {
      if (f.t < 0) {
        CB.drawCoin(c, f.x0, f.y0 + f.t * 40, 18);
        continue;
      }
      const k = CB.ease(f.t);
      const arc = Math.sin(f.t * Math.PI) * 90;
      CB.drawCoin(c, CB.lerp(f.x0, p.x - 36, k), CB.lerp(f.y0, p.y, k) - arc, 18);
    }
  }

  // ---------- Progress: kept for this session only, so every launch starts fresh ----------

  const yt = window.ytgame;
  const IN_PLAYABLES = !!(yt && yt.IN_PLAYABLES_ENV);
  CB.inPlayables = IN_PLAYABLES;

  CB.save = { done: {}, coins: 0 };

  // ---------- Resize and backgrounds ----------

  const bgCache = {};
  CB.backgrounds = {};

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Playables may load the game in a hidden view with no size at first.
    if (!w || !h) {
      view.w = view.h = 0;
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    view.w = w;
    view.h = h;
    view.dpr = dpr;
    view.scale = Math.min(w, h) / CB.STAGE;
    view.ox = (w - CB.STAGE * view.scale) / 2;
    view.oy = (h - CB.STAGE * view.scale) / 2;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    for (const k in bgCache) delete bgCache[k];
  }

  function background(name) {
    if (bgCache[name]) return bgCache[name];
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const c = off.getContext('2d');
    c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    CB.backgrounds[name](c, view.w, view.h, view);
    bgCache[name] = off;
    return off;
  }

  window.addEventListener('resize', resize);
  resize();

  // ---------- Scenes ----------

  let scene = null;
  let nextScene = null;
  let fade = 0;
  CB.time = 0;

  CB.setScene = function (s, instant) {
    if (instant || !scene) {
      scene = s;
      if (s.enter) s.enter();
      return;
    }
    nextScene = s;
  };

  function allButtons() {
    const list = scene && scene.buttons ? scene.buttons.slice() : [];
    if (!IN_PLAYABLES && scene && scene.showSound !== false && !scene.finished) {
      list.push(soundButton);
    }
    return list;
  }

  // Playables supplies its own mute control, so this only exists elsewhere.
  const soundButton = {
    x: 610, y: 716, w: 170, h: 66, small: true,
    get label() {
      return CB.audio && CB.audio.userEnabled ? 'Sound on' : 'Sound off';
    },
    onTap() {
      CB.audio.setUserEnabled(!CB.audio.userEnabled);
    },
  };

  function drawButton(c, b) {
    if (b.draw) {
      b.draw(c, b);
      return;
    }
    CB.rr(c, b.x, b.y, b.w, b.h, b.h / 2);
    if (b.primary) {
      c.fillStyle = CB.colors.marigold;
      c.fill();
    } else {
      c.fillStyle = 'rgba(251,241,222,0.92)';
      c.fill();
      c.strokeStyle = 'rgba(43,27,18,0.25)';
      c.lineWidth = 2;
      c.stroke();
    }
    CB.fitText(c, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, b.fontSize || (b.small ? 26 : 30), b.w - 28, {
      weight: 600,
    });
  }

  function drawPrompt(c, str) {
    const w = Math.min(770, CB.textWidth(c, str, 30) + 56);
    CB.rr(c, 400 - w / 2, 22, w, 60, 30);
    c.fillStyle = 'rgba(18,28,28,0.78)';
    c.fill();
    CB.fitText(c, str, 400, 53, 30, w - 40, { color: CB.colors.cream });
  }

  function drawFinishCard(c, level) {
    const y = level.cardY == null ? 628 : level.cardY;
    CB.rr(c, 70, y, 660, 158, 26);
    c.fillStyle = 'rgba(251,241,222,0.97)';
    c.fill();
    c.strokeStyle = CB.colors.marigold;
    c.lineWidth = 3;
    c.stroke();
    CB.fitText(c, level.message, 400, y + 42, 31, 620, {
      font: 'serif',
      italic: true,
      weight: 600,
    });
    if (level.earned > 0) {
      CB.rr(c, 562, y - 30, 148, 50, 25);
      c.fillStyle = CB.colors.deep;
      c.fill();
      CB.drawCoin(c, 592, y - 5, 17);
      CB.text(c, '+' + level.earned, 618, y - 4, 28, {
        align: 'left',
        weight: 700,
        color: CB.colors.cream,
      });
    }
  }

  function render() {
    if (!view.w || !scene) return;
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(background(scene.bg || 'menu'), 0, 0);
    const s = view.dpr * view.scale;
    c.setTransform(s, 0, 0, s, view.ox * view.dpr, view.oy * view.dpr);
    scene.draw(c);
    if (scene.message) drawFinishCard(c, scene);
    else if (scene.prompt) drawPrompt(c, scene.prompt);
    for (const b of allButtons()) drawButton(c, b);
    CB.fx.draw(c);
    if (scene.showCoins !== false) drawCoinCounter(c);
    drawFlyingCoins(c);
    if (fade > 0) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = fade;
      c.fillStyle = CB.colors.deep;
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.globalAlpha = 1;
    }
  }
  CB.render = render;

  // ---------- Levels ----------

  CB.startLevel = function (level) {
    level.message = null;
    level.finished = false;
    level.failed = false;
    level.earned = 0;
    level.buttons = [
      {
        x: 20, y: 716, w: 170, h: 66, small: true, label: 'Levels',
        onTap: () => CB.setScene(CB.menu),
      },
    ];
    CB.setScene(level);
  };

  CB.finishLevel = function (level, message, coins) {
    if (level.finished) return;
    level.finished = true;
    level.message = message;
    level.prompt = null;
    CB.save.done[level.id] = true;
    CB.celebrate();
    if (coins) CB.awardCoins(level, coins, 400, 480);
    CB.audio.stopLoops();
    CB.audio.finish();

    const idx = CB.levels.indexOf(level);
    const next = CB.levels[idx + 1];
    const y = (level.cardY == null ? 628 : level.cardY) + 78;
    level.buttons = [
      {
        x: 90, y, w: 270, h: 66, small: true, label: 'All levels',
        onTap: () => CB.setScene(CB.menu),
      },
    ];
    if (next) {
      level.buttons.push({
        x: 380, y, w: 330, h: 66, small: true, primary: true,
        label: 'Next: ' + next.title,
        onTap: () => CB.startLevel(next),
      });
    } else {
      level.buttons.push({
        x: 380, y, w: 330, h: 66, small: true, primary: true,
        label: 'Finish',
        onTap: () => CB.setScene(CB.menu),
      });
    }
  };

  // A mistake ends the attempt without marking the level as done.
  CB.failLevel = function (level, message) {
    if (level.finished) return;
    level.finished = true;
    level.failed = true;
    level.message = message;
    level.prompt = null;
    CB.audio.stopLoops();
    CB.audio.oops();
    const y = (level.cardY == null ? 628 : level.cardY) + 78;
    level.buttons = [
      {
        x: 90, y, w: 270, h: 66, small: true, label: 'All levels',
        onTap: () => CB.setScene(CB.menu),
      },
      {
        x: 380, y, w: 330, h: 66, small: true, primary: true, label: 'Try again',
        onTap: () => CB.startLevel(level),
      },
    ];
  };

  // ---------- Input ----------

  let activeId = null;
  let pressed = null;

  function toStage(e) {
    return {
      x: (e.clientX - view.ox) / view.scale,
      y: (e.clientY - view.oy) / view.scale,
      touch: e.pointerType === 'touch',
    };
  }

  function hit(b, p) {
    const pad = 10;
    return (
      p.x >= b.x - pad && p.x <= b.x + b.w + pad &&
      p.y >= b.y - pad && p.y <= b.y + b.h + pad
    );
  }

  canvas.addEventListener('pointerdown', (e) => {
    // A second finger is ignored. A new primary press means the last release
    // was lost, so it takes over rather than leaving input stuck.
    if (!e.isPrimary || !scene || nextScene) return;
    activeId = e.pointerId;
    pressed = null;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      // Capture is only a nicety for drags that leave the canvas.
    }
    if (CB.audio) CB.audio.unlock();
    const p = toStage(e);
    const buttons = allButtons();
    for (let i = buttons.length - 1; i >= 0; i--) {
      if (hit(buttons[i], p)) {
        pressed = buttons[i];
        return;
      }
    }
    if (scene.down && !scene.finished) scene.down(p);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!scene) return;
    const p = toStage(e);
    if (activeId === null) {
      canvas.style.cursor = allButtons().some((b) => hit(b, p)) ? 'pointer' : 'default';
      return;
    }
    if (e.pointerId !== activeId || pressed) return;
    if (scene.move && !scene.finished) scene.move(p);
  });

  function endPointer(e, cancelled) {
    if (e.pointerId !== activeId) return;
    activeId = null;
    const p = toStage(e);
    if (pressed) {
      const b = pressed;
      pressed = null;
      if (!cancelled && hit(b, p)) {
        CB.audio.tap();
        b.onTap();
      }
      return;
    }
    if (scene && scene.up) scene.up(p);
  }
  canvas.addEventListener('pointerup', (e) => endPointer(e, false));
  canvas.addEventListener('pointercancel', (e) => endPointer(e, true));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- Main loop, paused only by Playables onPause/onResume ----------

  let raf = 0;
  let last = 0;
  let running = false;

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (nextScene) {
      fade = Math.min(1, fade + dt * 5);
      if (fade >= 1) {
        scene = nextScene;
        nextScene = null;
        CB.fx.list.length = 0;
        CB.audio.stopLoops();
        if (scene.enter) scene.enter();
      }
    } else if (fade > 0) {
      fade = Math.max(0, fade - dt * 4);
    }
    CB.time += dt;
    if (scene && scene.update) scene.update(dt);
    CB.fx.update(dt);
    CB.updateCoins(dt);
    CB.audio.tick(dt);
    render();
  }

  CB.run = function () {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  CB.halt = function () {
    running = false;
    cancelAnimationFrame(raf);
  };
})();
