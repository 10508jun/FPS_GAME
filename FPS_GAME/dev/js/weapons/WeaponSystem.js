// ============================================================
//  WeaponSystem.js — 발사, 재장전, 대미지 계산, 히트스캔
// ============================================================
class WeaponSystem {
  constructor(wallbangSystem, damageTextSystem, audioSystem) {
    this.wallbang    = wallbangSystem;
    this.dmgText     = damageTextSystem;
    this.audio       = audioSystem;

    // 발사 쿨다운 (무기별)
    this._fireCooldowns = {};   // weaponId → 남은 시간
    // 재장전 상태
    this._reloading     = {};   // weaponId → { timer, total }
    // 탄약 현재 상태
    this._ammo = {};            // weaponId → { mag, reserve }

    this.infiniteAmmo = false;
    this._initAmmo();

    // 트레이서 & 파티클 버킷
    this.bullets  = [];   // Bullet 인스턴스
    this.impacts  = [];   // ImpactParticle 인스턴스

    // 킬 피니셔 파티클
    this.finishers = [];

    // 반동 시스템 (Recoil Accumulation)
    this.recoilAccum = 0;       // 현재 누적 반동
    this.recoilDecay = 4.0;     // 초당 반동 감소율
    this.consecutiveShots = 0;  // 연속 사격 카운터

    // 반자동 무기 발사 플래그 (한 번 누르면 한 발)
    this._semiAutoFired = {};   // weaponId → boolean

    // 마지막 발사 이벤트 (GameManager가 킬 처리용)
    this.lastHitResult = null;
  }

  setInfiniteAmmo(enabled) {
    this.infiniteAmmo = !!enabled;
  }

  // ── 탄약 초기화 ───────────────────────────────────────────
  _initAmmo() {
    for (const [id, d] of Object.entries(WEAPON_DATA)) {
      this._ammo[id] = {
        mag:     d.magazineSize || 999,
        reserve: d.reserveAmmo  || 0,
      };
      this._fireCooldowns[id] = 0;
      this._reloading[id]     = null;
    }
  }

  getAmmo(weaponId) { return this._ammo[weaponId] || { mag: 0, reserve: 0 }; }
  isReloading(weaponId) { return !!this._reloading[weaponId]; }

  // ── 매 프레임 업데이트 ────────────────────────────────────
  update(dt) {
    // 쿨다운 타이머
    for (const id in this._fireCooldowns) {
      if (this._fireCooldowns[id] > 0) this._fireCooldowns[id] -= dt;
    }
    // 재장전 타이머
    for (const id in this._reloading) {
      if (!this._reloading[id]) continue;
      this._reloading[id].timer -= dt;
      if (this._reloading[id].timer <= 0) {
        const d = WEAPON_DATA[id];
        const a = this._ammo[id];
        const needed = (d.magazineSize || 30) - a.mag;
        const refill = Math.min(needed, a.reserve);
        a.mag     += refill;
        a.reserve -= refill;
        this._reloading[id] = null;
      }
    }
    // 반동 자연 감소
    if (this.recoilAccum > 0) {
      this.recoilAccum = Math.max(0, this.recoilAccum - this.recoilDecay * dt);
    }
    if (this.consecutiveShots > 0 && this.recoilAccum < 0.01) {
      this.consecutiveShots = 0;
    }
    // 트레이서 & 파티클 업데이트
    this.bullets = this.bullets.filter(b => { b.update(dt); return !b.dead; });
    this.impacts = this.impacts.filter(p => { p.update(dt); return !p.dead; });
    // 킬 피니셔 업데이트
    this.finishers = this.finishers.filter(f => { f.timer -= dt; return f.timer > 0; });
  }

  // ── 발사 시도 ─────────────────────────────────────────────
  /**
   * @param {Player}  player
   * @param {Bot[]}   bots
   * @param {boolean} isPrimary 마우스 좌클릭
   * @param {boolean} isAlt 마우스 우클릭
   * @returns {object|null}  { hit: boolean, kill: boolean, ... }
   */
  tryFire(player, bots, isPrimary, isAlt = false, justPressedLeft = false) {
    if (!player.alive) return null;
    if (!isPrimary && !isAlt) return null;

    const wId  = player.currentWeapon;
    const wData = WEAPON_DATA[wId];
    if (!wData) return null;

    // 근접무기
    if (wData.type === 'melee') return this._fireMelee(player, bots, isAlt);

    // 반자동 무기: 마우스 홀드로 연발 불가 (한 클릭 한 발)
    if (!wData.auto) {
      if (!justPressedLeft) return null;
      if (this._semiAutoFired[wId]) return null;
      this._semiAutoFired[wId] = true;
    } else {
      this._semiAutoFired[wId] = false;
    }

    // 쿨다운 체크
    if (this._fireCooldowns[wId] > 0) return null;

    // 재장전 중
    if (this._reloading[wId]) return null;

    // 탄약 체크
    const ammo = this._ammo[wId];
    if (!this.infiniteAmmo && ammo.mag <= 0) {
      this.startReload(wId);
      return null;
    }

    // 탄약 소모
    if (!this.infiniteAmmo) {
      ammo.mag--;
    }

    // 쿨다운 설정 (발사 속도)
    this._fireCooldowns[wId] = 1 / wData.fireRate;

    // 반동 누적 (연속 사격 시 정확도 하락)
    this.consecutiveShots++;
    const recoilPerShot = wData.auto ? 0.008 : 0.003;
    this.recoilAccum += recoilPerShot * Math.min(this.consecutiveShots, 15);
    this.recoilAccum = Math.min(this.recoilAccum, 0.35); // 최대 반동 캡

    // 오디오
    if (this.audio) this.audio.playGunshot(wId, player.x, player.y);

    // 산탄총 특수 처리
    if (wData.type === 'shotgun') {
      return this._fireShotgun(player, bots, wData);
    }

    // 일반 히트스캔
    return this._fireHitscan(player, bots, wData);
  }

  // 반자동 무기 클릭 해제 시 호출
  resetSemiAuto(weaponId) {
    this._semiAutoFired[weaponId] = false;
  }

  // ── 일반 히트스캔 ─────────────────────────────────────────
  _fireHitscan(player, bots, wData) {
    const baseSpread = player.getAccuracy();
    const totalSpread = baseSpread + this.recoilAccum;
    const angle  = player.angle + (Math.random() - 0.5) * totalSpread * 2;
    const range  = 2400;
    const ex = player.x + Math.cos(angle) * range;
    const ey = player.y + Math.sin(angle) * range;

    // 벽 충돌 먼저
    const wallHit = this.wallbang.firstHit(player.x, player.y, ex, ey);
    const maxDist = wallHit ? Math.hypot(wallHit.x - player.x, wallHit.y - player.y) : range;

    // 봇 히트 판정
    let hitResult = null;
    let minDist   = maxDist;

    for (const bot of bots) {
      if (!bot.alive) continue;
      const hit = this._rayCircle(player.x, player.y, angle, bot.x, bot.y, bot.radius);
      if (hit && hit.dist < minDist) {
        // 벽 관통 체크
        const wbCalc = this.wallbang.calculate(player.x, player.y, bot.x, bot.y, wData.wallbang);
        const dmgMult = wbCalc.pierced ? wbCalc.dmgMultiplier : 1;
        if (dmgMult > 0.05) {
          minDist   = hit.dist;
          hitResult = { bot, hit, wbCalc, dmgMult };
        }
      }
    }

    // 트레이서 끝점
    let endX, endY;
    if (hitResult) {
      endX = hitResult.hit.x; endY = hitResult.hit.y;
    } else if (wallHit) {
      endX = wallHit.x; endY = wallHit.y;
    } else {
      endX = ex; endY = ey;
    }

    // 트레이서 생성 (스킨 색상 적용)
    let tracerColor = wData.silenced ? '#8899ff' : '#ffee88';
    if (typeof SKIN_DATA !== 'undefined' && typeof EQUIPPED_SKINS !== 'undefined') {
      const skins = SKIN_DATA[wData.id];
      const skinId = EQUIPPED_SKINS[wData.id];
      if (skins && skinId) {
        const skin = skins.find(s => s.id === skinId);
        if (skin && skin.tracer) tracerColor = skin.tracer;
      }
    }
    this.bullets.push(new Bullet(player.x, player.y, endX, endY, tracerColor));

    if (!hitResult) {
      // 벽 임팩트
      if (wallHit) this.impacts.push(new ImpactParticle(wallHit.x, wallHit.y, 'wall', false));
      return { hit: false, kill: false };
    }

    // 히트존 결정
    const headThresh = hitResult.bot.radius * 0.65;
    const dy = hitResult.hit.y - hitResult.bot.y;
    let zone = dy < -headThresh * 0.5 ? 'head' : (dy > headThresh) ? 'leg' : 'body';

    // 대미지 계산
    let baseDmg;
    if (wData.damage.falloff && wData.damage.ranges) {
      const dist = minDist;
      baseDmg = wData.damage.body;
      for (const r of wData.damage.ranges) {
        if (dist <= r.maxDist) {
          baseDmg = zone === 'head' ? r.head : zone === 'body' ? r.body : r.leg;
          break;
        }
      }
    } else {
      baseDmg = zone === 'head' ? wData.damage.head
              : zone === 'leg'  ? wData.damage.leg
              : wData.damage.body;
    }
    const finalDmg = Math.round(baseDmg * hitResult.dmgMult);

    // 피해 적용
    const actualDmg = hitResult.bot.takeDamage(finalDmg, zone);
    player.damageDealt += actualDmg;

    // 임팩트 & 대미지 텍스트
    this.impacts.push(new ImpactParticle(hitResult.hit.x, hitResult.hit.y, zone, zone === 'head'));

    const killed = !hitResult.bot.alive;
    if (killed) {
      player.kills++;
      // 킬 피니셔 이펙트 스폰
      this._spawnFinisher(hitResult.bot.x, hitResult.bot.y, wData.id);
    }

    this.lastHitResult = { hit: true, bot: hitResult.bot, damage: actualDmg, zone, killed, wallbang: hitResult.wbCalc.pierced };
    return this.lastHitResult;
  }

  // ── 산탄총 (Bucky) ────────────────────────────────────────
  _fireShotgun(player, bots, wData) {
    const results = [];
    for (let i = 0; i < wData.pellets; i++) {
      const spread = player.getAccuracy() + wData.spread;
      const angle  = player.angle + (Math.random() - 0.5) * spread * 2;
      const range  = 800;
      const ex = player.x + Math.cos(angle) * range;
      const ey = player.y + Math.sin(angle) * range;

      // 간단 히트
      for (const bot of bots) {
        if (!bot.alive) continue;
        const hit = this._rayCircle(player.x, player.y, angle, bot.x, bot.y, bot.radius);
        if (!hit) continue;
        const dist = Math.hypot(bot.x - player.x, bot.y - player.y);
        
        let pelletDmg = 0;
        if (wData.damage.ranges) {
          for (const r of wData.damage.ranges) {
            if (dist <= r.maxDist) {
              // 산탄총은 보통 몸통 판정이 주류지만 데이터에 맞춰 body로 적용
              pelletDmg = r.body;
              break;
            }
          }
        }
        
        if (pelletDmg > 0) {
          const actual = bot.takeDamage(pelletDmg, 'body');
          player.damageDealt += actual;
          results.push({ bot, damage: actual, zone: 'body' });
        }
      }

      // 트레이서
      const wallHit = this.wallbang.firstHit(player.x, player.y, ex, ey);
      const traEnd = wallHit || { x: ex, y: ey };
      this.bullets.push(new Bullet(player.x, player.y, traEnd.x, traEnd.y, '#ffaa44', 0.1));
    }
    if (results.length === 0) return { hit: false, kill: false };
    // 킬 여부 집계 (first result 기준)
    const firstHit = results[0];
    const wasKilled = !firstHit.bot.alive;
    if (wasKilled) player.kills++;
    return { hit: true, kill: wasKilled, bot: firstHit.bot, damage: firstHit.damage, zone: firstHit.zone, wallbang: false };
  }

  // ── 근접 무기 ─────────────────────────────────────────────
  _fireMelee(player, bots, isAlt = false) {
    // 쿨다운 체크
    if (this._fireCooldowns['knife'] > 0) return null;

    const wData = WEAPON_DATA.knife;
    const range = wData.range;
    for (const bot of bots) {
      if (!bot.alive) continue;
      const dist = Math.hypot(bot.x - player.x, bot.y - player.y);
      if (dist <= range) {
        // 방향 판정 (대략 앞쪽 80도)
        const angleToBot = Math.atan2(bot.y - player.y, bot.x - player.x);
        const playerBotAngleDiff = Math.abs(this._angleDiff(player.angle, angleToBot));
        if (playerBotAngleDiff > 0.8) continue;

        // 등 뒤 판정 (Backstab)
        // 봇이 바라보는 방향과 플레이어->봇 방향이 유사하면 등 뒤임
        const backstabDiff = Math.abs(this._angleDiff(angleToBot, bot.angle));
        const isBack = backstabDiff < 0.8;

        let dmg = isAlt 
          ? (isBack ? wData.damage.alt.back : wData.damage.alt.body)
          : (isBack ? wData.damage.primary.back : wData.damage.primary.body);

        const actual = bot.takeDamage(dmg, 'body');
        player.damageDealt += actual;
        
        // 쿨다운 설정
        this._fireCooldowns['knife'] = isAlt ? 1.0 : 0.5;

        return { hit: true, kill: !bot.alive, damage: actual, zone: 'body', bot };
      }
    }
    return { hit: false };
  }

  _angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // ── 재장전 ───────────────────────────────────────────────
  startReload(weaponId) {
    if (this._reloading[weaponId]) return;
    const d = WEAPON_DATA[weaponId];
    if (!d) return;
    const a = this._ammo[weaponId];
    if (a.reserve <= 0 || a.mag >= d.magazineSize) return;
    this._reloading[weaponId] = { timer: d.reloadTime, total: d.reloadTime };
    if (this.audio) this.audio.playBeep(500, 0.05, 0.08);
  }

  // 탄약 리필 (라운드 시작/구매)
  refillAmmo(weaponId) {
    const d = WEAPON_DATA[weaponId];
    if (!d) return;
    this._ammo[weaponId] = { mag: d.magazineSize, reserve: d.reserveAmmo };
    this._reloading[weaponId] = null;
  }

  refillAll(weapons) {
    weapons.forEach(id => this.refillAmmo(id));
  }

  // ── 레이-원 교차 ─────────────────────────────────────────
  /**
   * 광선과 원의 교차 계산
   * @returns {{ x, y, dist } | null}
   */
  _rayCircle(sx, sy, angle, cx, cy, r) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const fx = sx - cx,  fy = sy - cy;
    const a  = dx*dx + dy*dy;
    const b  = 2 * (fx*dx + fy*dy);
    const c  = fx*fx + fy*fy - r*r;
    const disc = b*b - 4*a*c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2*a);
    if (t < 0) return null;
    return {
      x: sx + dx * t,
      y: sy + dy * t,
      dist: t,
    };
  }

  // ── 킬 피니셔 이펙트 생성 ──────────────────────────────────
  _spawnFinisher(x, y, weaponId) {
    // 스킨에 따른 피니셔 색상 & 타입 결정
    let finisherColor = '#ff4655';
    let finisherType = 'default';
    if (typeof SKIN_DATA !== 'undefined' && typeof EQUIPPED_SKINS !== 'undefined') {
      const skins = SKIN_DATA[weaponId];
      const skinId = EQUIPPED_SKINS[weaponId];
      if (skins && skinId) {
        const skin = skins.find(s => s.id === skinId);
        if (skin) {
          finisherColor = skin.accent || finisherColor;
          finisherType = skin.finisher || 'default';
        }
      }
    }
    // 파티클 12~20개 생성
    const count = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      this.finishers.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        timer: 0.6 + Math.random() * 0.6,
        color: finisherColor,
        type: finisherType,
        size: 2 + Math.random() * 4,
      });
    }
  }

  // ── 렌더링 ───────────────────────────────────────────────
  render(ctx) {
    this.bullets.forEach(b => b.render(ctx));
    this.impacts.forEach(p => p.render(ctx));
    // 킬 피니셔 파티클 렌더링
    for (const f of this.finishers) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.timer * 2);
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 8;
      if (f.type === 'reaver') {
        // 약탈자: 보라색 소용돌이 궤적
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === 'prime') {
        // 프라임: 금색 기하학 파편
        ctx.fillStyle = f.color;
        ctx.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
      } else if (f.type === 'fire') {
        // 엘더플레임/오니: 불꽃 파티클
        const fireGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 2);
        fireGrad.addColorStop(0, '#fbbf24');
        fireGrad.addColorStop(0.5, f.color);
        fireGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === 'spectrum') {
        // 스펙트럼: 무지개 빛 글로우
        const hue = (Date.now() * 0.5) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 기본: 적색 폭발 파편
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // 이동
      const subDt = 0.016;
      f.x += f.vx * subDt;
      f.y += f.vy * subDt;
      f.vx *= 0.96;
      f.vy *= 0.96;
    }
  }

  // 발사 재장전 진행률 (HUD용)
  getReloadProgress(weaponId) {
    const r = this._reloading[weaponId];
    if (!r) return 1;
    return 1 - r.timer / r.total;
  }
}
