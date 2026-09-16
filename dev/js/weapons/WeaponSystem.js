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

    this._initAmmo();

    // 트레이서 & 파티클 버킷
    this.bullets  = [];   // Bullet 인스턴스
    this.impacts  = [];   // ImpactParticle 인스턴스

    // 마지막 발사 이벤트 (GameManager가 킬 처리용)
    this.lastHitResult = null;
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
    // 트레이서 & 파티클 업데이트
    this.bullets = this.bullets.filter(b => { b.update(dt); return !b.dead; });
    this.impacts = this.impacts.filter(p => { p.update(dt); return !p.dead; });
  }

  // ── 발사 시도 ─────────────────────────────────────────────
  /**
   * @param {Player}  player
   * @param {Bot[]}   bots
   * @param {boolean} isPrimary 마우스 좌클릭
   * @param {boolean} isAlt 마우스 우클릭
   * @returns {object|null}  { hit: boolean, kill: boolean, ... }
   */
  tryFire(player, bots, isPrimary, isAlt = false) {
    if (!player.alive) return null;
    if (!isPrimary && !isAlt) return null;

    const wId  = player.currentWeapon;
    const wData = WEAPON_DATA[wId];
    if (!wData) return null;

    // 근접무기
    if (wData.type === 'melee') return this._fireMelee(player, bots, isAlt);

    // 쿨다운 체크
    if (this._fireCooldowns[wId] > 0) return null;

    // 재장전 중
    if (this._reloading[wId]) return null;

    // 탄약 체크
    const ammo = this._ammo[wId];
    if (ammo.mag <= 0) {
      this.startReload(wId);
      return null;
    }

    // 탄약 소모
    ammo.mag--;

    // 쿨다운 설정 (발사 속도)
    this._fireCooldowns[wId] = 1 / wData.fireRate;

    // 오디오
    if (this.audio) this.audio.playGunshot(wId, player.x, player.y);

    // 산탄총 특수 처리
    if (wData.type === 'shotgun') {
      return this._fireShotgun(player, bots, wData);
    }

    // 일반 히트스캔
    return this._fireHitscan(player, bots, wData);
  }

  // ── 일반 히트스캔 ─────────────────────────────────────────
  _fireHitscan(player, bots, wData) {
    const spread = player.getAccuracy();
    const angle  = player.angle + (Math.random() - 0.5) * spread * 2;
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

    // 트레이서 생성
    this.bullets.push(new Bullet(player.x, player.y, endX, endY,
      wData.silenced ? '#8899ff' : '#ffee88',
    ));

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
    if (killed) player.kills++;

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

  // ── 렌더링 ───────────────────────────────────────────────
  render(ctx) {
    this.bullets.forEach(b => b.render(ctx));
    this.impacts.forEach(p => p.render(ctx));
  }

  // 발사 재장전 진행률 (HUD용)
  getReloadProgress(weaponId) {
    const r = this._reloading[weaponId];
    if (!r) return 1;
    return 1 - r.timer / r.total;
  }
}
