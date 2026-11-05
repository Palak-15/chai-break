// A slow breathing exercise. Hold to breathe in and the marigold opens; let go
// to breathe out and it closes. The pace is the player's own and nothing is scored.
(function () {
  'use strict';

  const CB = window.CB;
  const C = { x: 400, y: 380 };
  const IN_TIME = 4; // Seconds for the flower to open fully.
  const OUT_TIME = 6; // Seconds for it to close, since out-breaths calm best when longer.

  function petals(c, count, reach, width, color, spin) {
    c.fillStyle = color;
    for (let i = 0; i < count; i++) {
      c.save();
      c.rotate(spin + (i / count) * Math.PI * 2);
      c.beginPath();
      c.ellipse(0, -reach * 0.62, width, reach * 0.42, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  const toy = {
    id: 'breath',
    title: 'Breathe',
    bg: 'menu',

    enter() {
      this.open = 0;
      this.pressing = false;
      this.breaths = 0;
      this.peaked = false;
      this.prompt = 'Hold to breathe in';
    },

    down() {
      this.pressing = true;
    },

    up() {
      this.pressing = false;
    },

    update(dt) {
      if (this.pressing) this.open = Math.min(1, this.open + dt / IN_TIME);
      else this.open = Math.max(0, this.open - dt / OUT_TIME);

      if (this.open >= 0.92 && !this.peaked) {
        this.peaked = true;
        CB.audio.note(4);
      }
      if (this.peaked && this.open <= 0.08) {
        this.peaked = false;
        this.breaths += 1;
        CB.audio.note(2);
      }

      if (this.pressing) {
        this.prompt = this.open >= 1 ? 'Now let go, and breathe out slowly' : 'Breathe in…';
      } else if (this.open > 0.02) {
        this.prompt = 'Breathe out…';
      } else {
        this.prompt = 'Hold to breathe in';
      }

      // A soft rush of air that rises on the way in and falls on the way out.
      const moving = this.pressing ? this.open < 1 : this.open > 0;
      const level = moving ? (this.pressing ? 0.5 : 0.36) : 0;
      CB.audio.setLoop('air', level, 300 + this.open * 700);
    },

    draw(c) {
      const k = CB.ease(this.open);
      const size = 90 + 190 * k;

      // A faint ring shows how far the flower can open.
      c.strokeStyle = 'rgba(251,241,222,0.18)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(C.x, C.y, 284, 0, Math.PI * 2);
      c.stroke();

      const glow = c.createRadialGradient(C.x, C.y, 10, C.x, C.y, size * 1.25);
      glow.addColorStop(0, 'rgba(242,163,27,' + (0.12 + 0.2 * k) + ')');
      glow.addColorStop(1, 'rgba(242,163,27,0)');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(C.x, C.y, size * 1.25, 0, Math.PI * 2);
      c.fill();

      c.save();
      c.translate(C.x, C.y);
      const spin = CB.time * 0.05;
      petals(c, 16, size, size * 0.15, '#E8791C', spin);
      petals(c, 14, size * 0.76, size * 0.13, '#F2A31B', -spin * 1.3 + 0.2);
      petals(c, 12, size * 0.52, size * 0.1, '#F7C046', spin * 1.6 + 0.1);
      c.fillStyle = '#B85C12';
      c.beginPath();
      c.arc(0, 0, 14 + size * 0.06, 0, Math.PI * 2);
      c.fill();
      c.restore();

      if (this.breaths > 0) {
        CB.text(c, this.breaths === 1 ? '1 calm breath' : this.breaths + ' calm breaths', 400, 700, 28, {
          color: CB.colors.cream,
          weight: 600,
        });
      }
    },
  };

  CB.breath = toy;
})();
