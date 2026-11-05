// The level menu and start-up sequence, including the Playables lifecycle calls.
(function () {
  'use strict';

  const CB = window.CB;
  const yt = window.ytgame;

  function buildTiles() {
    const w = 186;
    const h = 226;
    const gap = 10;
    const left = (800 - (w * 4 + gap * 3)) / 2;
    // Breathe has no goal, so it sits beside the levels without counting as one.
    return CB.levels.concat(CB.breath).map((level, i) => ({
      x: left + (w + gap) * (i % 4),
      y: 192 + Math.floor(i / 4) * (h + gap),
      w,
      h,
      draw: drawTile,
      level,
      onTap: () => CB.startLevel(level),
    }));
  }

  function drawTile(c, b) {
    CB.rr(c, b.x, b.y, b.w, b.h, 26);
    c.fillStyle = CB.colors.cream;
    c.fill();
    CB.icon(c, b.level.id, b.x + b.w / 2, b.y + 92);
    CB.fitText(c, b.level.title, b.x + b.w / 2, b.y + b.h - 34, 32, b.w - 24, {
      weight: 650,
    });
    if (CB.save.done[b.level.id]) {
      const cx = b.x + b.w - 34;
      const cy = b.y + 34;
      c.fillStyle = CB.colors.leaf;
      c.beginPath();
      c.arc(cx, cy, 21, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(cx - 9, cy);
      c.lineTo(cx - 2, cy + 8);
      c.lineTo(cx + 10, cy - 8);
      c.stroke();
    }
  }

  CB.menu = {
    bg: 'menu',
    enter() {
      this.buttons = buildTiles();
    },
    draw(c) {
      CB.text(c, 'Chai Break', 400, 84, 84, {
        font: 'serif',
        weight: 700,
        color: CB.colors.marigold,
      });
      CB.text(c, 'Small Indian moments to slow down', 400, 150, 31, {
        color: CB.colors.cream,
      });
      const count = CB.levels.filter((l) => CB.save.done[l.id]).length;
      let line = 'Tap a moment to begin';
      if (count === CB.levels.length) {
        line = "You've played them all. More moments coming soon.";
      } else if (count > 0) {
        line = count + ' of ' + CB.levels.length + ' done';
      }
      CB.fitText(c, line, 400, 688, 28, 760, { color: CB.colors.cream });
    },
  };

  const LOAD_TIME = 900; // Milliseconds the loading bar takes to fill.
  const startedAt = performance.now();

  const splash = {
    bg: 'menu',
    showSound: false,
    showCoins: false,
    buttons: [],
    loaded: false,
    draw(c) {
      CB.text(c, 'Chai Break', 400, 330, 84, {
        font: 'serif',
        weight: 700,
        color: CB.colors.marigold,
      });
      if (this.loaded) return;
      const k = Math.min(1, (performance.now() - startedAt) / LOAD_TIME);
      CB.rr(c, 220, 420, 360, 22, 11);
      c.fillStyle = 'rgba(251,241,222,0.2)';
      c.fill();
      CB.rr(c, 220, 420, Math.max(22, 360 * k), 22, 11);
      c.fillStyle = CB.colors.marigold;
      c.fill();
      CB.text(c, 'Loading…', 400, 478, 32, { color: CB.colors.cream });
    },
  };

  function showPlayButton() {
    splash.loaded = true;
    splash.buttons = [
      {
        x: 270, y: 410, w: 260, h: 90, primary: true, label: 'Play', fontSize: 42,
        onTap: () => {
          CB.audio.startMusic();
          CB.audio.play();
          CB.setScene(CB.menu);
        },
      },
    ];
  }

  function callSdk(fn) {
    try {
      fn();
    } catch (err) {
      // The SDK is a no-op or absent outside YouTube; never block the game on it.
    }
  }

  function start() {
    CB.audio.init();

    // Outside YouTube the SDK reports audio as off, so only listen to it inside.
    if (CB.inPlayables) {
      callSdk(() => {
        CB.audio.setPlatformEnabled(yt.system.isAudioEnabled());
        yt.system.onAudioEnabledChange((on) => CB.audio.setPlatformEnabled(on));
        yt.system.onPause(() => {
          CB.halt();
          CB.audio.pause();
        });
        yt.system.onResume(() => {
          CB.audio.resume();
          CB.run();
        });
      });
    }

    // Not tied to animation frames: the view may be hidden and zero-sized here.
    CB.setScene(splash, true);
    CB.render();
    callSdk(() => yt.game.firstFrameReady());

    CB.run();

    // A timer, not animation frames: it still fires if the view is hidden.
    window.setTimeout(() => {
      showPlayButton();
      CB.render();
      callSdk(() => yt.game.gameReady());
    }, LOAD_TIME);
  }

  start();
})();
