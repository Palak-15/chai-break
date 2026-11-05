// Backgrounds and menu icons, all drawn in code.
(function () {
  'use strict';

  const CB = window.CB;

  function stageY(v, y) {
    return v.oy + y * v.scale;
  }

  CB.backgrounds.menu = function (c, w, h) {
    c.fillStyle = CB.colors.deep;
    c.fillRect(0, 0, w, h);
    // Jaali: a repeating carved-screen lattice.
    const size = 64;
    c.strokeStyle = 'rgba(242,163,27,0.09)';
    c.lineWidth = 2;
    for (let y = -size; y < h + size; y += size) {
      for (let x = -size; x < w + size; x += size) {
        const cx = x + size / 2;
        const cy = y + size / 2;
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          c.beginPath();
          c.arc(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, 15, 0, Math.PI * 2);
          c.stroke();
        }
      }
    }
  };

  CB.backgrounds.wood = function (c, w, h) {
    c.fillStyle = '#7A4A28';
    c.fillRect(0, 0, w, h);
    const r = CB.rng(11);
    const plank = Math.max(70, h / 6);
    for (let y = 0; y < h; y += plank) {
      c.fillStyle = CB.mixColor('#83502C', '#6C4022', r());
      c.fillRect(0, y, w, plank - 2);
      c.strokeStyle = 'rgba(40,20,8,0.16)';
      c.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) {
        const gy = y + r() * plank;
        c.beginPath();
        c.moveTo(0, gy);
        c.bezierCurveTo(w * 0.3, gy + r() * 12 - 6, w * 0.6, gy + r() * 12 - 6, w, gy);
        c.stroke();
      }
    }
  };

  CB.backgrounds.stall = function (c, w, h, v) {
    const counter = stageY(v, 650);
    c.fillStyle = '#1F6F71';
    c.fillRect(0, 0, w, counter);
    // A painted border on the stall wall.
    c.fillStyle = 'rgba(251,241,222,0.12)';
    const bandY = stageY(v, 96);
    c.fillRect(0, bandY, w, 6 * v.scale + 2);
    c.fillStyle = 'rgba(242,163,27,0.32)';
    for (let x = 0; x < w; x += 44) {
      c.beginPath();
      c.arc(x, bandY + 24 * v.scale, 7 * v.scale + 1, 0, Math.PI * 2);
      c.fill();
    }
    const grad = c.createLinearGradient(0, counter, 0, h);
    grad.addColorStop(0, '#A9713F');
    grad.addColorStop(1, '#6E4324');
    c.fillStyle = grad;
    c.fillRect(0, counter, w, h - counter);
    c.fillStyle = 'rgba(255,235,200,0.32)';
    c.fillRect(0, counter, w, 4 * v.scale + 1);
  };

  CB.backgrounds.floor = function (c, w, h) {
    c.fillStyle = '#3A3430';
    c.fillRect(0, 0, w, h);
    const r = CB.rng(5);
    for (let i = 0; i < (w * h) / 900; i++) {
      c.fillStyle = 'rgba(255,240,220,' + r() * 0.05 + ')';
      c.fillRect(r() * w, r() * h, 2, 2);
    }
    const glow = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.7);
    glow.addColorStop(0, 'rgba(255,220,170,0.09)');
    glow.addColorStop(1, 'rgba(0,0,0,0.26)');
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
  };

  CB.backgrounds.cloth = function (c, w, h) {
    c.fillStyle = '#E9B872';
    c.fillRect(0, 0, w, h);
    // Block print, in a slightly deeper tone of the cloth.
    c.fillStyle = 'rgba(166,86,30,0.16)';
    const size = 72;
    for (let row = -1; row * size < h + size; row++) {
      for (let col = -1; col * size < w + size; col++) {
        const x = col * size + (row % 2 ? size / 2 : 0);
        const y = row * size;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          c.beginPath();
          c.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 8, 4, a, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
  };

  CB.backgrounds.stone = function (c, w, h) {
    c.fillStyle = '#D8D1C4';
    c.fillRect(0, 0, w, h);
    const r = CB.rng(23);
    for (let i = 0; i < (w * h) / 500; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(80,70,60,0.14)' : 'rgba(255,255,255,0.28)';
      c.beginPath();
      c.arc(r() * w, r() * h, r() * 2.4 + 0.4, 0, Math.PI * 2);
      c.fill();
    }
  };

  // ---------- Menu icons ----------

  CB.icon = function (c, id, x, y) {
    c.save();
    c.translate(x, y);
    ICONS[id](c);
    c.restore();
  };

  function marigold(c, radius) {
    const rings = [[12, 1, '#E8791C'], [10, 0.72, '#F2A31B'], [8, 0.46, '#F7C046']];
    for (const [count, scale, color] of rings) {
      c.fillStyle = color;
      for (let i = 0; i < count; i++) {
        c.save();
        c.rotate((i / count) * Math.PI * 2);
        c.beginPath();
        c.ellipse(0, -radius * scale * 0.62, radius * scale * 0.24, radius * scale * 0.4, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
    c.fillStyle = '#B85C12';
    c.beginPath();
    c.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
    c.fill();
  }

  const ICONS = {
    breath(c) {
      marigold(c, 62);
    },
    papad(c) {
      c.fillStyle = '#EFD79E';
      c.beginPath();
      c.moveTo(-58, -18);
      c.lineTo(-20, -60);
      c.lineTo(36, -52);
      c.lineTo(10, -8);
      c.lineTo(62, 8);
      c.lineTo(38, 52);
      c.lineTo(-18, 60);
      c.lineTo(-8, 14);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(150,92,36,0.55)';
      for (const s of [[-26, -30, 6], [14, -36, 5], [34, 26, 6], [-2, 40, 4], [-30, 0, 3]]) {
        c.beginPath();
        c.arc(s[0], s[1], s[2], 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#EFD79E';
      c.beginPath();
      c.moveTo(-58, 30);
      c.lineTo(-30, 28);
      c.lineTo(-38, 56);
      c.closePath();
      c.fill();
    },
    matar(c) {
      c.fillStyle = '#4E8F36';
      c.beginPath();
      c.moveTo(-72, 14);
      c.quadraticCurveTo(0, -60, 72, -14);
      c.quadraticCurveTo(0, 62, -72, 14);
      c.closePath();
      c.fill();
      c.fillStyle = '#A7D86A';
      for (const x of [-34, -6, 22, 46]) {
        c.beginPath();
        c.arc(x, x * -0.15, 13, 0, Math.PI * 2);
        c.fill();
      }
    },
    roti(c) {
      c.fillStyle = '#E9C88E';
      c.beginPath();
      c.arc(0, 0, 62, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(122,70,28,0.62)';
      const spots = [[-22, -18, 10], [16, -28, 7], [28, 8, 11], [-8, 24, 8], [-34, 16, 6], [6, -2, 5]];
      for (const s of spots) {
        c.beginPath();
        c.arc(s[0], s[1], s[2], 0, Math.PI * 2);
        c.fill();
      }
    },
    chai(c) {
      c.beginPath();
      c.moveTo(-36, -38);
      c.lineTo(36, -38);
      c.lineTo(26, 58);
      c.lineTo(-26, 58);
      c.closePath();
      c.fillStyle = '#A9672F';
      c.fill();
      c.fillStyle = '#E8C99B';
      c.fillRect(-35, -38, 70, 13);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 3;
      for (const dx of [-14, 0, 14]) {
        c.beginPath();
        c.moveTo(dx, -24);
        c.lineTo(dx * 0.72, 56);
        c.stroke();
      }
      c.strokeStyle = 'rgba(90,60,40,0.42)';
      c.lineWidth = 4;
      c.lineCap = 'round';
      const t = CB.time * 1.6;
      for (const dx of [-14, 14]) {
        c.beginPath();
        c.moveTo(dx, -48);
        c.bezierCurveTo(dx + 8 * Math.sin(t), -58, dx - 8 * Math.sin(t), -66, dx, -76);
        c.stroke();
      }
    },
    rangoli(c) {
      const colors = ['#E0457B', '#F2A31B', '#38A9B8'];
      for (let i = 0; i < 8; i++) {
        c.save();
        c.rotate((i * Math.PI) / 4);
        c.fillStyle = colors[i % 3];
        c.beginPath();
        c.ellipse(0, -39, 13, 25, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      c.fillStyle = '#F2A31B';
      c.beginPath();
      c.arc(0, 0, 14, 0, Math.PI * 2);
      c.fill();
    },
    mehndi(c) {
      c.lineCap = 'round';
      c.strokeStyle = '#C98B5E';
      c.lineWidth = 16;
      for (const f of [[-27, -44], [-9, -62], [9, -64], [27, -50]]) {
        c.beginPath();
        c.moveTo(f[0], 0);
        c.lineTo(f[0], f[1]);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(34, 26);
      c.lineTo(58, -6);
      c.stroke();
      c.fillStyle = '#C98B5E';
      CB.rr(c, -36, -10, 72, 76, 22);
      c.fill();
      c.strokeStyle = '#8C2E10';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 26, 15, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(0, 26, 6, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(0, 8);
      c.lineTo(0, -52);
      c.stroke();
    },
    dabba(c) {
      c.fillStyle = '#B9BEC2';
      c.beginPath();
      c.arc(0, 0, 66, 0, Math.PI * 2);
      c.fill();
      const colors = ['#E9B52C', '#B8321F', '#8D5A2B', '#2F2A28', '#7E8A3C', '#C08A3E'];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        c.fillStyle = colors[i];
        c.beginPath();
        c.arc(Math.cos(a) * 41, Math.sin(a) * 41, 17, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#6B3E1E';
      c.beginPath();
      c.arc(0, 0, 17, 0, Math.PI * 2);
      c.fill();
    },
  };
})();
