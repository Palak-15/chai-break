// All sound is synthesised here at runtime, so the game ships no audio files
// and there are no third-party music rights to clear.
(function () {
  'use strict';

  const SA = 196; // Tonic. The melody wanders a five-note scale above it.
  const SCALE = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, (2 * 9) / 8, (2 * 5) / 4];

  let ac = null;
  let master = null;
  let noiseBuffer = null;
  const loops = {};

  let platformEnabled = true;
  let paused = false;
  let musicOn = false; // Stays quiet until the player presses Play.
  let musicTimer = 0.8;
  let droneTimer = 0;
  let droneStep = 0;
  let melodyIdx = 2;

  const audio = (window.CB.audio = {
    userEnabled: true,

    init() {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx || ac) return;
      ac = new Ctx();
      master = ac.createGain();
      master.gain.value = this.outputOn() ? 1 : 0;
      // Keeps several sounds at once from distorting.
      const limiter = ac.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.ratio.value = 8;
      master.connect(limiter);
      limiter.connect(ac.destination);

      const len = ac.sampleRate * 2;
      noiseBuffer = ac.createBuffer(1, len, ac.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      loops.roll = makeLoop('lowpass', 320);
      loops.pour = makeLoop('bandpass', 500);
      loops.grain = makeLoop('highpass', 3200);
      loops.sizzle = makeLoop('bandpass', 5200);
      loops.air = makeLoop('bandpass', 500);
      this.unlock();

      // Touch browsers only allow audio to start on release, not on press.
      const unlock = () => this.unlock();
      for (const type of ['pointerup', 'touchend', 'click', 'keydown']) {
        window.addEventListener(type, unlock, true);
      }
    },

    outputOn() {
      return platformEnabled && this.userEnabled && !paused;
    },

    applyOutput() {
      if (master) {
        master.gain.setTargetAtTime(this.outputOn() ? 1 : 0, ac.currentTime, 0.02);
      }
    },

    // Called on start-up as well as on touch: Playables can hand the game
    // audio focus without any tap, while browsers wait for the first gesture.
    unlock() {
      if (ac && ac.state !== 'running' && !paused) ac.resume().catch(() => {});
    },

    setPlatformEnabled(on) {
      platformEnabled = on;
      this.applyOutput();
    },

    setUserEnabled(on) {
      this.userEnabled = on;
      this.applyOutput();
      try {
        window.localStorage.setItem('chai-break-sound', on ? '1' : '0');
      } catch (err) {
        // Only a convenience; ignore blocked storage.
      }
    },

    pause() {
      paused = true;
      this.stopLoops();
      if (ac) ac.suspend().catch(() => {});
    },

    resume() {
      paused = false;
      if (ac) ac.resume().catch(() => {});
      this.applyOutput();
    },

    // Driven from the game loop, so the music rests whenever frames stop.
    tick(dt) {
      if (!ac || ac.state !== 'running' || !musicOn) return;
      droneTimer -= dt;
      if (droneTimer <= 0) {
        droneTimer = 4.2;
        drone(droneStep % 4 === 2 ? SA * 0.75 : SA * 0.5);
        droneStep++;
      }
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = 1.3 + Math.random() * 2.2;
        const move = Math.random() < 0.5 ? -1 : 1;
        melodyIdx = window.CB.clamp(melodyIdx + move, 0, SCALE.length - 1);
        pluck(SA * SCALE[melodyIdx], 0.11, 1.8);
      }
    },

    setLoop(name, level, freq) {
      const l = loops[name];
      if (!l) return;
      const now = ac.currentTime;
      l.gain.gain.setTargetAtTime(level, now, 0.05);
      if (freq) l.filter.frequency.setTargetAtTime(freq, now, 0.06);
    },

    stopLoops() {
      for (const k in loops) this.setLoop(k, 0);
    },

    startMusic() {
      musicOn = true;
    },

    tap() {
      pluck(SA * 3, 0.2, 0.3);
    },

    note(step) {
      pluck(SA * 2 * SCALE[step % SCALE.length], 0.3, 1.1);
    },

    oops() {
      if (!ac) return;
      pluck(SA * 1.5, 0.28, 0.5);
      later(220, () => pluck(SA, 0.28, 0.9));
    },

    finish() {
      [0, 2, 3, 5].forEach((step, i) => {
        later(i * 160, () => pluck(SA * 2 * SCALE[step], 0.28, 1.6));
      });
    },

    play() {
      [0, 1, 2, 3, 5].forEach((step, i) => {
        later(i * 90, () => pluck(SA * 2 * SCALE[step], 0.26, 0.9));
      });
    },

    // ---------- One-shot sounds for player actions ----------

    // Wrong move: two short dull notes.
    nope() {
      if (!ac) return;
      glide('triangle', 300, 230, 0.32, 0.12);
      later(120, () => glide('triangle', 230, 170, 0.32, 0.16));
    },

    // Rolling pin set down on the board.
    pin() {
      if (!ac) return;
      burst('lowpass', 500, 180, 0.8, 0.14);
      glide('sine', 150, 80, 0.55, 0.16);
    },

    whoosh() {
      if (!ac) return;
      burst('bandpass', 420, 2600, 1.8, 0.32, 1.1);
    },

    // Roti landing on the hot tawa.
    slap() {
      if (!ac) return;
      burst('lowpass', 2200, 500, 0.9, 0.1);
      glide('sine', 190, 90, 0.5, 0.12);
      later(60, () => burst('highpass', 4500, 6500, 0.4, 0.5));
    },

    puff() {
      if (!ac) return;
      burst('bandpass', 260, 1100, 1.8, 0.6, 0.8);
    },

    // Steel or glass being touched. Lower frequency means a heavier object.
    clink(freq, loudness) {
      if (!ac) return;
      const f = freq || 2300;
      const v = loudness || 1;
      tone('sine', f, 0.28 * v, 0.32);
      tone('sine', f * 1.51, 0.16 * v, 0.22);
      tone('sine', f * 2.76, 0.08 * v, 0.14);
    },

    // Lid settling onto the steel tin.
    thunk() {
      if (!ac) return;
      glide('sine', 170, 85, 0.65, 0.26);
      this.clink(900);
      later(90, () => this.clink(1250));
    },

    squish() {
      if (!ac) return;
      burst('lowpass', 1000, 300, 0.7, 0.13);
      glide('sine', 320, 180, 0.22, 0.13);
    },

    blot() {
      if (!ac) return;
      burst('lowpass', 620, 200, 1.7, 0.11);
    },

    pinch() {
      if (!ac) return;
      burst('highpass', 3000, 5000, 0.45, 0.09);
    },

    click() {
      if (!ac) return;
      tone('sine', 1250, 0.13, 0.05);
    },

    // A brittle papad cracking: several tiny snaps over a dry burst.
    crunch() {
      if (!ac) return;
      burst('highpass', 1500, 3600, 0.7, 0.09);
      burst('bandpass', 700, 1500, 1.5, 0.12, 0.9);
      [20, 48, 80, 118].forEach((ms) => {
        later(ms, () => burst('highpass', 2300 + Math.random() * 2400, 3000, 0.34 + Math.random() * 0.3, 0.035));
      });
    },

    // A pea pod's seam splitting open a little further.
    split() {
      if (!ac) return;
      burst('bandpass', 1500, 2600, 0.8, 0.045, 2);
    },

    // A pea popping out of the pod.
    pop() {
      if (!ac) return;
      glide('sine', 520, 980, 0.4, 0.08);
    },

    // A pea landing in the steel bowl. The pitch climbs as the bowl fills.
    plink(step) {
      if (!ac) return;
      const f = SA * 8 * SCALE[(step || 0) % SCALE.length];
      tone('sine', f, 0.2, 0.2);
      tone('triangle', f * 1.5, 0.05, 0.12);
    },

    // The froth has reached the line.
    ping() {
      if (!ac) return;
      tone('sine', 1320, 0.34, 0.45);
      tone('sine', 1980, 0.12, 0.3);
    },

    coin(i) {
      if (!ac) return;
      const lift = 1 + (i || 0) * 0.04;
      tone('square', 1320 * lift, 0.09, 0.09);
      later(70, () => {
        tone('square', 1760 * lift, 0.09, 0.26);
        tone('sine', 1760 * lift, 0.2, 0.3);
      });
    },

    // A long "surrr": air and hot chai pulled through a narrowing gap.
    slurp(length) {
      if (!ac) return;
      const len = length || 1.4;
      const now = ac.currentTime;
      const src = ac.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 3;
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(2300, now + len * 0.8);
      filter.frequency.exponentialRampToValueAtTime(1300, now + len);
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.85, now + 0.1);
      gain.gain.setValueAtTime(0.85, now + len * 0.75);
      gain.gain.linearRampToValueAtTime(0.0001, now + len);
      // A fast flutter is what makes it read as a sip rather than as a hiss.
      const flutter = ac.createOscillator();
      const depth = ac.createGain();
      flutter.frequency.value = 13;
      depth.gain.value = 0.32;
      flutter.connect(depth);
      depth.connect(gain.gain);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(now, Math.random());
      flutter.start(now);
      src.stop(now + len + 0.02);
      flutter.stop(now + len + 0.02);
    },

    // The hand flinching from a glass that is too hot.
    hot() {
      if (!ac) return;
      burst('highpass', 3800, 6200, 0.35, 0.3);
      glide('sawtooth', 620, 300, 0.15, 0.17);
      later(170, () => glide('sawtooth', 560, 240, 0.16, 0.24));
    },

    smash() {
      if (!ac) return;
      burst('highpass', 1700, 4200, 0.45, 0.3);
      glide('sine', 160, 70, 0.3, 0.14);
      [3100, 4300, 2600, 5200, 3700].forEach((f, i) => {
        later(i * 38, () => this.clink(f, 0.55));
      });
    },
  });

  function later(ms, fn) {
    window.setTimeout(fn, ms);
  }

  function glide(type, f0, f1, level, length) {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f1, now + length);
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + length + 0.02);
  }

  function burst(type, f0, f1, level, length, q) {
    const now = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    if (q) filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, now);
    filter.frequency.exponentialRampToValueAtTime(f1, now + length);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(now, Math.random());
    src.stop(now + length + 0.02);
  }

  function makeLoop(type, freq) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ac.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    return { filter, gain };
  }

  function tone(type, freq, level, length) {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + length + 0.02);
  }

  function pluck(freq, level, length) {
    if (!ac) return;
    tone('triangle', freq, level, length);
    tone('sine', freq * 2, level * 0.3, length * 0.6);
  }

  function drone(freq) {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.4);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 5.5);
  }

  try {
    audio.userEnabled = window.localStorage.getItem('chai-break-sound') !== '0';
  } catch (err) {
    audio.userEnabled = true;
  }
})();
