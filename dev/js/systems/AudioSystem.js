// ============================================================
//  AudioSystem.js — Web Audio API 3D 입체 사운드 시스템
// ============================================================
class AudioSystem {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
      console.warn('[AudioSystem] Web Audio API 미지원');
      return;
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);

    // 채널별 게인
    this.channels = {
      sfx:      this._makeGain(1.0),
      footstep: this._makeGain(0.5),
      music:    this._makeGain(0.2),
    };

    // 리스너 위치 (플레이어 위치)
    this.listenerX = 0;
    this.listenerY = 0;

    // 풋스텝 타이머
    this._footTimer = 0;

    this.enabled = true;
  }

  _makeGain(vol) {
    const g = this.ctx.createGain();
    g.gain.value = vol;
    g.connect(this.masterGain);
    return g;
  }

  /** 플레이어 월드 위치 업데이트 */
  updateListener(px, py) {
    this.listenerX = px;
    this.listenerY = py;
    if (this.ctx && this.ctx.listener) {
      if (this.ctx.listener.positionX) {
        this.ctx.listener.positionX.setValueAtTime(px * 0.001, this.ctx.currentTime);
        this.ctx.listener.positionY.setValueAtTime(0, this.ctx.currentTime);
        this.ctx.listener.positionZ.setValueAtTime(py * 0.001, this.ctx.currentTime);
      }
    }
  }

  /**
   * 3D 위치로 패너 노드 생성
   */
  _makePanner(x, y) {
    const panner = this.ctx.createPanner();
    panner.panningModel  = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance   = 100;
    panner.maxDistance   = 2000;
    panner.rolloffFactor = 1.5;
    if (panner.positionX) {
      panner.positionX.setValueAtTime(x * 0.001, this.ctx.currentTime);
      panner.positionY.setValueAtTime(0, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(y * 0.001, this.ctx.currentTime);
    }
    panner.connect(this.channels.sfx);
    return panner;
  }

  /**
   * 프로그래밍 방식으로 총소리 생성
   * @param {string} weaponId  무기 ID
   * @param {number} sx,sy     발사 위치 (월드)
   */
  playGunshot(weaponId, sx, sy) {
    if (!this.ctx || !this.enabled) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const panner = this._makePanner(sx, sy);
    const w = WEAPON_DATA[weaponId] || {};

    if (w.type === 'pistol') {
      this._synthPistol(panner, 0.45, w.silenced);
    } else if (w.type === 'smg') {
      this._synthRifle(panner, 0.7, 160, w.silenced);
    } else if (w.type === 'shotgun') {
      this._synthShotgun(panner);
    } else if (w.type === 'rifle') {
      const freq = weaponId === 'vandal' ? 180 : (weaponId === 'guardian' ? 220 : 200);
      this._synthRifle(panner, 0.9, freq, w.silenced);
    } else if (w.type === 'sniper') {
      this._synthSniper(panner);
    } else if (w.type === 'heavy') {
      this._synthRifle(panner, 0.8, 140);
    } else {
      this._synthPistol(panner, 0.4);
    }
  }

  _synthRifle(dest, vol, freq, silenced = false) {
    const now = this.ctx.currentTime;
    // 저음 충격
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(silenced ? vol * 0.4 : vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    // 노이즈 버스트
    const noise = this._makeNoise(0.08, silenced ? 0.03 : 0.06);

    osc.connect(g).connect(dest);
    noise.connect(dest);
    osc.start(now); osc.stop(now + 0.13);
  }

  _synthPistol(dest, vol = 0.5, silenced = false) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(silenced ? vol * 0.35 : vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(g).connect(dest);
    osc.start(now); osc.stop(now + 0.11);
  }

  _synthSniper(dest) {
    const now = this.ctx.currentTime;
    // 강렬한 저음
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(1.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    const noise = this._makeNoise(0.15, 0.12);

    osc.connect(g).connect(dest);
    noise.connect(dest);
    osc.start(now); osc.stop(now + 0.36);
  }

  _synthShotgun(dest) {
    const now = this.ctx.currentTime;
    // 여러 주파수 동시
    [200, 300, 450].forEach(f => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(g).connect(dest);
      osc.start(now); osc.stop(now + 0.19);
    });
    const noise = this._makeNoise(0.12, 0.1);
    noise.connect(dest);
  }

  /** 화이트 노이즈 버스트 */
  _makeNoise(duration, vol) {
    const sampleRate = this.ctx.sampleRate;
    const bufSize = Math.floor(sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufSize, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(g);
    src.start();
    src.stop(this.ctx.currentTime + duration);
    return g;
  }

  /**
   * 발소리 (달리기 시)
   * @param {number} wx,wy  발소리 위치
   * @param {string} stance  'run'|'walk'|'crouch'
   */
  playFootstep(wx, wy, stance) {
    if (!this.ctx || !this.enabled) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const vol = stance === 'run' ? 0.3 : stance === 'walk' ? 0.05 : 0;
    if (vol === 0) return;

    const now = this.ctx.currentTime;
    const panner = this._makePanner(wx, wy);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(g).connect(panner);
    osc.start(now); osc.stop(now + 0.08);
  }

  /** 발소리 루프 호출 (Player.update에서 매 프레임) */
  updateFootstep(dt, px, py, stance, isMoving) {
    if (!isMoving || stance === 'crouch') { this._footTimer = 0; return; }
    const interval = stance === 'run' ? 0.38 : 0.55;
    this._footTimer += dt;
    if (this._footTimer >= interval) {
      this._footTimer = 0;
      this.playFootstep(px, py, stance);
    }
  }

  /** UI 비프음 */
  playBeep(freq = 880, dur = 0.08, vol = 0.15) {
    if (!this.ctx || !this.enabled) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g).connect(this.masterGain);
    osc.start(now); osc.stop(now + dur + 0.01);
  }

  /** 킬 확정음 */
  playKillConfirm() {
    if (!this.ctx || !this.enabled) return;
    this.playBeep(1200, 0.04, 0.2);
    setTimeout(() => this.playBeep(1600, 0.04, 0.18), 60);
  }

  /** 라운드 시작 */
  playRoundStart() {
    if (!this.ctx || !this.enabled) return;
    this.playBeep(440, 0.1, 0.25);
    setTimeout(() => this.playBeep(660, 0.12, 0.25), 150);
  }

  /** 라운드 종료 */
  playRoundEnd(won) {
    if (!this.ctx || !this.enabled) return;
    if (won) {
      this.playBeep(660, 0.1, 0.3);
      setTimeout(() => this.playBeep(880, 0.1, 0.3), 120);
      setTimeout(() => this.playBeep(1100, 0.2, 0.3), 240);
    } else {
      this.playBeep(440, 0.1, 0.3);
      setTimeout(() => this.playBeep(330, 0.15, 0.3), 120);
    }
  }

  setMasterVolume(v) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }
}
