// ============================================================
//  Bot.js — AI 봇 (순찰 / 추적 / 공격 / 사격장 마네킹)
// ============================================================
class Bot {
  constructor(x, y, team = 'attacker', agentId = 'phoenix', isDummy = false) {
    this.x = x; this.y = y;
    this.team    = team;
    this.agentId = agentId;
    this.agentData = AGENT_DATA[agentId] || AGENT_DATA['phoenix'];
    this.isDummy = isDummy;    // 사격장 마네킹

    this.radius = CONFIG.PLAYER_RADIUS;
    this.hp     = CONFIG.PLAYER_HP;
    this.maxHp  = CONFIG.PLAYER_HP;
    this.armor  = 0;
    this.maxArmor = 0;
    this.alive  = true;

    // 킬/데스
    this.kills  = 0;
    this.deaths = 0;
    this.assists = 0;
    this.damageDealt = 0;

    // 무기
    this.currentWeapon = 'vandal';

    // 상태 머신: 'patrol' | 'chase' | 'attack' | 'dummy'
    this.state = isDummy ? 'dummy' : 'patrol';

    // 순찰 경로 포인트
    this.patrolPoints = [];
    this.patrolIdx    = 0;
    this._genPatrolPoints(x, y);

    // 시각
    this.angle   = 0;
    this.hitFlash = 0;

    // 공격 타이머
    this.attackTimer   = 0;
    this.attackRate    = 0.5 + Math.random() * 0.5;  // 초당
    this.detectionRange = 600;
    this.attackRange    = 550;

    // 이동
    this.moveSpeed = CONFIG.SPEED_RUN * 0.8;
    this.targetX = x; this.targetY = y;

    // 사격장 리스폰 타이머
    this.respawnTimer = 0;
    this.respawnDelay = 2.5;

    // 체력바용
    this.showHpBar = true;
  }

  // ── 순찰 경로 생성 ────────────────────────────────────────
  _genPatrolPoints(cx, cy) {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.patrolPoints.push({
        x: cx + (Math.random() - 0.5) * 400,
        y: cy + (Math.random() - 0.5) * 400,
      });
    }
  }

  // ── 업데이트 ──────────────────────────────────────────────
  update(dt, walls, player, audio) {
    if (this.isDummy) {
      this._updateDummy(dt, player);
      return;
    }
    if (!this.alive) return;

    // 히트 플래시 감소
    if (this.hitFlash > 0) this.hitFlash -= dt * 3;

    const distToPlayer = this.alive && player.alive
      ? Math.hypot(player.x - this.x, player.y - this.y)
      : Infinity;

    // 상태 전환
    switch (this.state) {
      case 'patrol':
        if (distToPlayer < this.detectionRange) this.state = 'chase';
        this._patrol(dt, walls);
        break;
      case 'chase':
        if (distToPlayer > this.detectionRange * 1.3) this.state = 'patrol';
        else if (distToPlayer < this.attackRange) this.state = 'attack';
        this._moveToward(player.x, player.y, dt, walls);
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        break;
      case 'attack': {
        if (distToPlayer > this.attackRange * 1.1) this.state = 'chase';
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.attackTimer += dt;
        if (this.attackTimer >= 1 / this.attackRate) {
          this.attackTimer = 0;
          this._fireAtPlayer(player, walls, audio);
        }
        // 조금 이동 (strafing)
        const strafe = Math.sin(Date.now() * 0.003) * 80 * dt;
        const perp = this.angle + Math.PI * 0.5;
        this._moveBy(Math.cos(perp) * strafe, Math.sin(perp) * strafe, walls);
        break;
      }
    }
  }

  // ── 사격장 마네킹 ─────────────────────────────────────────
  _updateDummy(dt, player) {
    if (!this.alive) {
      this.respawnTimer += dt;
      if (this.respawnTimer >= this.respawnDelay) {
        this.respawn(this.x, this.y);
        this.respawnTimer = 0;
      }
      return;
    }
    if (this.hitFlash > 0) this.hitFlash -= dt * 3;
    // 마네킹은 플레이어를 바라봄
    if (player) {
      this.angle = Math.atan2(player.y - this.y, player.x - this.x);
    }
  }

  // ── 순찰 ─────────────────────────────────────────────────
  _patrol(dt, walls) {
    if (this.patrolPoints.length === 0) return;
    const target = this.patrolPoints[this.patrolIdx];
    const dist   = Math.hypot(target.x - this.x, target.y - this.y);
    if (dist < 20) {
      this.patrolIdx = (this.patrolIdx + 1) % this.patrolPoints.length;
    } else {
      this._moveToward(target.x, target.y, dt, walls);
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    }
  }

  // ── 이동 ─────────────────────────────────────────────────
  _moveToward(tx, ty, dt, walls) {
    const dist = Math.hypot(tx - this.x, ty - this.y);
    if (dist < 1) return;
    const dx = (tx - this.x) / dist;
    const dy = (ty - this.y) / dist;
    
    // 무기별 이동 속도 비율 적용
    let finalSpeed = this.moveSpeed;
    const wData = WEAPON_DATA[this.currentWeapon];
    if (wData && wData.speed) {
      finalSpeed *= wData.speed;
    }

    this._moveBy(dx * finalSpeed * dt, dy * finalSpeed * dt, walls);
  }

  _moveBy(dx, dy, walls) {
    this.x += dx;
    for (const w of walls) {
      if (!w.solid) continue;
      if (this._collides(w)) { this.x -= dx; break; }
    }
    this.y += dy;
    for (const w of walls) {
      if (!w.solid) continue;
      if (this._collides(w)) { this.y -= dy; break; }
    }
    this.x = Math.max(this.radius, Math.min(CONFIG.WORLD_WIDTH  - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(CONFIG.WORLD_HEIGHT - this.radius, this.y));
  }

  _collides(rect) {
    const rh = rect.h || rect.height || 30;
    return (
      this.x + this.radius > rect.x &&
      this.x - this.radius < rect.x + rect.w &&
      this.y + this.radius > rect.y &&
      this.y - this.radius < rect.y + rh
    );
  }

  // ── 발사 ─────────────────────────────────────────────────
  _hasLOS(sx, sy, ex, ey, walls) {
    const dx = ex - sx, dy = ey - sy;
    for (const rect of walls) {
      if (!rect.solid) continue;
      const rh = rect.h || rect.height || 30;
      let hit = false;
      const tests = [rect.x, rect.x + rect.w, rect.y, rect.y + rh];
      for (let i = 0; i < 4; i++) {
        const isX = i < 2;
        const delta = isX ? dx : dy;
        if (Math.abs(delta) < 0.0001) continue;
        const tVal = (tests[i] - (isX ? sx : sy)) / delta;
        if (tVal >= 0 && tVal <= 1) {
          const ix = sx + tVal * dx;
          const iy = sy + tVal * dy;
          if (ix >= rect.x - 0.5 && ix <= rect.x + rect.w + 0.5 &&
              iy >= rect.y - 0.5 && iy <= rect.y + rh + 0.5) {
            hit = true;
            break;
          }
        }
      }
      if (hit) return false;
    }
    return true;
  }

  _fireAtPlayer(player, walls, audio) {
    if (!player.alive) return;
    if (!this._hasLOS(this.x, this.y, player.x, player.y, walls)) return;

    // 대미지
    const wData = WEAPON_DATA[this.currentWeapon] || WEAPON_DATA['vandal'];
    const roll  = Math.random();
    let dmg, zone;
    if (roll < 0.15) { dmg = wData.damage.head; zone = 'head'; }
    else if (roll < 0.85) { dmg = wData.damage.body; zone = 'body'; }
    else { dmg = wData.damage.leg; zone = 'leg'; }

    // 거리 감쇠 (팬텀)
    if (wData.id === 'phantom' && wData.damage.falloff) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      for (const r of wData.damage.ranges) {
        if (dist <= r.maxDist) {
          dmg = zone === 'head' ? r.head : zone === 'body' ? r.body : r.leg;
          break;
        }
      }
    }

    // 봇 정확도 보정 (80%)
    if (Math.random() < 0.2 && zone === 'head') { zone = 'body'; dmg = wData.damage.body; }

    player.takeDamage(dmg, zone);
    if (audio) audio.playGunshot(this.currentWeapon, this.x, this.y);
  }

  // ── 피격 ─────────────────────────────────────────────────
  takeDamage(amount, hitZone) {
    if (!this.alive) return 0;
    let dmg = amount;
    if (this.armor > 0 && hitZone !== 'head') {
      const absorbed = Math.min(this.armor, dmg * 0.5);
      this.armor -= absorbed; dmg -= absorbed;
    }
    this.hp -= dmg;
    this.hitFlash = 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deaths++;
    }
    return dmg;
  }

  respawn(x, y) {
    this.x = x; this.y = y;
    this.hp    = this.maxHp;
    this.armor = this.maxArmor;
    this.alive = true;
    this.state = this.isDummy ? 'dummy' : 'patrol';
  }

  // ── 렌더링 ───────────────────────────────────────────────
  render(ctx) {
    if (!this.alive && !this.isDummy) return;
    if (!this.alive && this.isDummy) {
      this._renderDeadDummy(ctx);
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    const displayColor = this.isDummy ? '#ff4655' : (this.team === 'attacker' ? CONFIG.C.ALLY : CONFIG.C.ENEMY);
    const flashAmt = Math.max(0, this.hitFlash);

    // ── 사격장 전용 타겟 오라 & 지면 과녁 마크 ──
    if (this.isDummy) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 70, 85, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(this.angle);

    ctx.shadowColor = displayColor;
    ctx.shadowBlur  = 12 + flashAmt * 18;

    // 어깨 패드 (Shoulder Armor)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = displayColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(-3, -11, 7.5, 4, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-3, 11, 7.5, 4, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 몸통 (Body Core)
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, this.radius);
    bodyGrad.addColorStop(0, flashAmt > 0.5 ? '#ffffff' : (this.isDummy ? '#2d151c' : '#3a0f18'));
    bodyGrad.addColorStop(0.7, '#0f172a');
    bodyGrad.addColorStop(1, displayColor);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.stroke();

    // 코어 원자로 (Glowing Core Unit)
    ctx.fillStyle = flashAmt > 0.5 ? '#fff' : displayColor;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // 머리 (Head & Bullseye Visor)
    ctx.save();
    ctx.translate(4, 0);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = displayColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 헤드 과녁 / 붉은 센서 비전 (Bullseye Sensor)
    ctx.fillStyle = flashAmt > 0.5 ? '#fff' : displayColor;
    ctx.beginPath();
    ctx.arc(2, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 과녁 십자선 (Crosshair Visor Lines)
    ctx.strokeStyle = displayColor;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(5, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(2, 3); ctx.stroke();

    ctx.restore();

    // 총기 (Gun Model)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(this.radius - 2, -2.5, 12, 5);
    ctx.fillStyle = displayColor;
    ctx.fillRect(this.radius + 10, -1.5, 3, 3);

    ctx.restore();

    // 마네킹 뱃지 / 헤드샷 전용 가이드
    ctx.save();
    ctx.font = `700 11px ${CONFIG.FONT_HUD}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = displayColor;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(this.isDummy ? 'TARGET DUMMY' : this.agentData.name, this.x, this.y - this.radius - 6);
    ctx.restore();
  }

  _renderDeadDummy(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle   = '#334155';
    ctx.strokeStyle = '#ff4655';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    
    // 리스폰 타이머 표시
    const remaining = (this.respawnDelay - this.respawnTimer).toFixed(1);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle   = '#ff4655';
    ctx.font = `900 13px ${CONFIG.FONT_HUD}`;
    ctx.textAlign = 'center';
    ctx.fillText('RESPAWN IN ' + remaining + 's', this.x, this.y + 4);
    ctx.restore();
  }

  renderHealthBar(ctx) {
    if (!this.alive) return;
    const w = 40, h = 4;
    const bx = this.x - w / 2;
    const by = this.y - this.radius - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
    const ratio = this.hp / this.maxHp;
    ctx.fillStyle = this.isDummy ? '#888' : CONFIG.C.ENEMY;
    ctx.fillRect(bx, by, w * ratio, h);
  }
}

// 간단한 선분-AABB 충돌 헬퍼 (Bot 내부 LOS 체크용)
function _lineAABBSimple(sx, sy, ex, ey, rect) {
  const rh = rect.h || rect.height || 30;
  const dx = ex - sx, dy = ey - sy;
  let tmin = 0, tmax = 1;
  for (const [lo, hi, d, s] of [
    [rect.x, rect.x + rect.w, dx, sx],
    [rect.y, rect.y + rh,     dy, sy],
  ]) {
    if (Math.abs(d) < 0.0001) {
      if (s < lo || s > hi) return false;
    } else {
      let t1 = (lo - s) / d, t2 = (hi - s) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return tmin < 1 && tmax > 0;
}
