// ============================================================
//  AbilitySystem.js — 스킬 & 궁극기 게이지 관리
// ============================================================
class AbilitySystem {
  constructor(player) {
    this.player    = player;
    this.agentData = player.agentData;

    // 스킬별 상태
    this.charges   = {};  // abilityKey → 현재 충전 수
    this.cooldowns = {};  // abilityKey → 남은 쿨다운 시간
    this.equipped  = null; // 현재 조준 중인 스킬

    // 궁극기 게이지
    this.ultPoints    = 0;
    this.maxUltPoints = this.agentData.ultimate.pointsRequired;
    this.ultReady     = false;
    this.ultActive    = false;
    this.ultTimer     = 0;

    // 활성 스킬 오브젝트 (연기, 불꽃 등)
    this.activeEffects = [];  // { type, x, y, radius, life, ... }

    this._initCharges();
  }

  _initCharges() {
    for (const [key, ab] of Object.entries(this.agentData.abilities)) {
      this.charges[key]   = ab.maxCharges || 1;
      this.cooldowns[key] = 0;
    }
  }

  // ── 매 프레임 업데이트 ────────────────────────────────────
  update(dt) {
    // 쿨다운
    for (const key in this.cooldowns) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] -= dt;
        if (this.cooldowns[key] <= 0) {
          this.cooldowns[key] = 0;
          // 쿨다운 끝나면 충전 회복
          const ab = this.agentData.abilities[key];
          if (ab && ab.cooldown > 0) {
            this.charges[key] = Math.min(ab.maxCharges || 1, this.charges[key] + 1);
          }
        }
      }
    }

    // 궁극기 활성화 타이머
    if (this.ultActive) {
      this.ultTimer -= dt;
      if (this.ultTimer <= 0) this._endUlt();
    }

    // 활성 이펙트 업데이트
    this.activeEffects = this.activeEffects.filter(e => {
      e.life -= dt;
      if (e.applyPerSecond && e.life > 0) {
        e.applyTimer = (e.applyTimer || 0) + dt;
        if (e.applyTimer >= 0.25) {
          e.applyTimer = 0;
          e.applyFn && e.applyFn(dt * 4);
        }
      }
      return e.life > 0;
    });

    // 궁극기 포인트 완료 확인
    if (this.ultPoints >= this.maxUltPoints && !this.ultReady) {
      this.ultReady = true;
    }
  }

  // ── 스킬 사용 ─────────────────────────────────────────────
  /**
   * @param {string} key  'c'|'q'|'e'|'x'
   * @param {object} opts { targetX, targetY, bots, wallbang }
   */
  useAbility(key, opts = {}) {
    if (key === 'x') return this._useUltimate(opts);

    const ab = this.agentData.abilities[key];
    if (!ab) return false;
    if (this.charges[key] <= 0) return false;
    if (this.cooldowns[key] > 0) return false;

    this.charges[key]--;

    // 에이전트별 스킬 처리
    const agentId = this.player.agentId;
    switch (agentId) {
      case 'jett':     return this._jettAbility(key, ab, opts);
      case 'phoenix':  return this._phoenixAbility(key, ab, opts);
      case 'sage':     return this._sageAbility(key, ab, opts);
      case 'sova':     return this._sovaAbility(key, ab, opts);
      default:         return false;
    }
  }

  // ── 제트 스킬 ────────────────────────────────────────────
  _jettAbility(key, ab, { targetX, targetY }) {
    const p = this.player;
    if (key === 'c') {
      // 클라우드버스트 — 연기 구름
      this.activeEffects.push({
        type: 'smoke', x: targetX, y: targetY,
        radius: ab.radius, life: ab.duration,
        maxLife: ab.duration, color: ab.color,
      });
    } else if (key === 'q') {
      // 업드래프트 — 시각적 점프 표시
      this.activeEffects.push({
        type: 'jump_ring', x: p.x, y: p.y,
        radius: 0, maxRadius: 60,
        life: 0.4, maxLife: 0.4, color: '#7ecef0',
      });
    } else if (key === 'e') {
      // 테일윈드 — 빠른 전진 (플레이어 위치 이동)
      const dashDist = ab.dashSpeed * ab.duration;
      p.x += Math.cos(p.angle) * dashDist;
      p.y += Math.sin(p.angle) * dashDist;
      // 쿨다운 설정
      this.cooldowns[key] = ab.cooldown;
      this.activeEffects.push({
        type: 'dash_trail', x: p.x, y: p.y,
        radius: 20, life: 0.3, maxLife: 0.3, color: '#7ecef0',
      });
    }
    return true;
  }

  // ── 피닉스 스킬 ──────────────────────────────────────────
  _phoenixAbility(key, ab, { targetX, targetY }) {
    const p = this.player;
    if (key === 'c') {
      // 블레이즈 — 불꽃 벽
      this.activeEffects.push({
        type: 'fire_wall', x: targetX || p.x + Math.cos(p.angle) * 100,
        y: targetY || p.y + Math.sin(p.angle) * 100,
        angle: p.angle, width: ab.width, life: ab.duration, maxLife: ab.duration,
        color: ab.color,
        applyPerSecond: true,
        applyFn: (amount) => {
          // 범위 안에 있는 봇에게 데미지 (외부 참조 없이 플레이어만 치유)
          p.heal(ab.healRate * amount);
        },
      });
    } else if (key === 'q') {
      // 커브볼 — 섬광탄
      this.activeEffects.push({
        type: 'flash', x: targetX, y: targetY,
        radius: ab.radius, life: ab.duration, maxLife: ab.duration,
        color: ab.color,
      });
      // 플레이어가 범위 안이면 섬광
      const dist = Math.hypot((targetX - p.x), (targetY - p.y));
      if (dist < ab.radius) p.flashAlpha = 0.85;
    } else if (key === 'e') {
      // 핫 핸즈 — 화염구
      this.cooldowns[key] = ab.cooldown;
      this.activeEffects.push({
        type: 'fire_zone', x: targetX, y: targetY,
        radius: ab.radius, life: ab.duration, maxLife: ab.duration,
        color: ab.color,
        applyPerSecond: true,
        applyFn: (amount) => { p.heal(ab.healRate * amount); },
      });
    }
    return true;
  }

  // ── 세이지 스킬 ──────────────────────────────────────────
  _sageAbility(key, ab, { targetX, targetY, bots }) {
    const p = this.player;
    if (key === 'c') {
      // 슬로우 오브 — 감속 구역
      this.activeEffects.push({
        type: 'slow_zone', x: targetX, y: targetY,
        radius: ab.radius, life: ab.duration, maxLife: ab.duration,
        color: ab.color, slowFactor: ab.slowFactor,
        applyPerSecond: true,
        applyFn: () => {
          const dist = Math.hypot(p.x - targetX, p.y - targetY);
          if (dist < ab.radius) p.slowFactor = ab.slowFactor;
        },
      });
    } else if (key === 'q') {
      // 배리어 오브 — 벽 설치 (시각적)
      this.activeEffects.push({
        type: 'barrier', x: targetX, y: targetY,
        angle: p.angle, width: ab.width, hp: ab.wallHp,
        life: ab.duration, maxLife: ab.duration, color: ab.color,
      });
    } else if (key === 'e') {
      // 힐링 오브 — 치유
      this.cooldowns[key] = ab.cooldown;
      const effect = {
        type: 'heal_beam', x: p.x, y: p.y,
        life: ab.duration, maxLife: ab.duration,
        color: ab.color, rate: ab.healRate,
        applyPerSecond: true,
        applyFn: (amount) => { p.heal(ab.healRate * amount); },
      };
      this.activeEffects.push(effect);
    }
    return true;
  }

  // ── 소바 스킬 ────────────────────────────────────────────
  _sovaAbility(key, ab, { targetX, targetY, minimap, bots }) {
    const p = this.player;
    if (key === 'c') {
      // 쇼크 볼트 — 전기 충격
      this.activeEffects.push({
        type: 'shock', x: targetX, y: targetY,
        radius: ab.radius, life: 0.5, maxLife: 0.5, color: ab.color,
        damage: ab.damage,
        applyPerSecond: false,
      });
    } else if (key === 'q') {
      // 리콘 볼트 — 정찰
      this.activeEffects.push({
        type: 'recon', x: targetX, y: targetY,
        radius: ab.radius, life: ab.duration, maxLife: ab.duration, color: ab.color,
      });
      // 미니맵에 적 위치 노출
      if (minimap && bots) {
        bots.forEach(bot => {
          const dist = Math.hypot(bot.x - targetX, bot.y - targetY);
          if (dist < ab.radius) minimap.revealEnemy(bot.x, bot.y, 3);
        });
      }
    } else if (key === 'e') {
      // 아울 드론 (간단 버전 — 위치 기반 정찰)
      this.cooldowns[key] = ab.cooldown;
      this.activeEffects.push({
        type: 'drone', x: targetX, y: targetY,
        radius: 200, life: ab.duration, maxLife: ab.duration, color: ab.color,
      });
    }
    return true;
  }

  // ── 궁극기 ───────────────────────────────────────────────
  _useUltimate(opts) {
    if (!this.ultReady || this.ultActive) return false;
    this.ultPoints  = 0;
    this.ultReady   = false;
    this.ultActive  = true;

    const agentId = this.player.agentId;
    const ult = this.agentData.ultimate;

    switch (agentId) {
      case 'jett': // 블레이드 스톰 — 단검 활성
        this.ultTimer  = 30;
        this.ultCharges = ult.bladeCount;
        break;
      case 'phoenix': // 런 잇 백 — 리스폰 위치 설정
        this.player.respawnPoint = { x: this.player.x, y: this.player.y };
        this.ultTimer = ult.duration;
        break;
      case 'sage': // 리저렉션 — 즉시 (봇 불가 간략 버전)
        this.player.heal(this.player.maxHp);
        this.ultActive = false;
        break;
      case 'sova': // 헌터스 퓨리 — 빔 3발
        this.ultTimer   = 20;
        this.ultCharges = ult.beamCount;
        break;
    }

    return true;
  }

  _endUlt() {
    this.ultActive  = false;
    this.ultTimer   = 0;
    this.ultCharges = 0;
    // 피닉스 리스폰 위치 초기화
    if (this.player.agentId === 'phoenix') this.player.respawnPoint = null;
  }

  // 킬/어시 시 궁극기 포인트 획득
  addUltPoint(amount = 1) {
    this.ultPoints = Math.min(this.maxUltPoints, this.ultPoints + amount);
  }

  // 라운드 시작 시 충전 리셋
  roundReset() {
    this._initCharges();
  }

  // ── 렌더링 ───────────────────────────────────────────────
  render(ctx) {
    for (const e of this.activeEffects) {
      this._renderEffect(ctx, e);
    }
  }

  _renderEffect(ctx, e) {
    const alpha = Math.min(1, e.life / (e.maxLife * 0.3 + 0.01));
    ctx.save();
    ctx.globalAlpha = alpha * 0.75;

    switch (e.type) {
      case 'smoke':
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur  = 20;
        ctx.fill();
        break;

      case 'flash':
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (1 - e.life / e.maxLife), 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        break;

      case 'fire_zone':
      case 'fire_wall':
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius || 60, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur  = 30;
        ctx.fill();
        break;

      case 'slow_zone':
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth   = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha *= 0.3;
        ctx.fillStyle = e.color;
        ctx.fill();
        break;

      case 'barrier':
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle + Math.PI * 0.5);
        ctx.fillStyle   = e.color;
        ctx.strokeStyle = '#aaffcc';
        ctx.lineWidth   = 2;
        ctx.fillRect(-e.width / 2, -15, e.width, 30);
        ctx.strokeRect(-e.width / 2, -15, e.width, 30);
        ctx.restore();
        break;

      case 'shock':
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth   = 3;
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur  = 20;
        ctx.stroke();
        break;

      case 'recon':
        const t = 1 - e.life / e.maxLife;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * t, 0, Math.PI * 2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        break;

      case 'dash_trail':
      case 'jump_ring':
        ctx.beginPath();
        const gr = e.maxRadius ? e.radius * (1 - e.life / e.maxLife) : e.radius;
        ctx.arc(e.x, e.y, gr, 0, Math.PI * 2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth   = 2;
        ctx.shadowColor = e.color;
        ctx.shadowBlur  = 10;
        ctx.stroke();
        break;

      case 'heal_beam':
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, 30, 0, Math.PI * 2);
        ctx.fillStyle   = '#52b788';
        ctx.shadowColor = '#52b788';
        ctx.shadowBlur  = 20;
        ctx.fill();
        break;

      case 'drone':
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth   = 1;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        // 드론 본체
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        break;
    }

    ctx.restore();
  }
}
