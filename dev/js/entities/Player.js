// ============================================================
//  Player.js — 플레이어 엔티티 (이동, 물리, 자세, 사격)
// ============================================================
class Player {
  constructor(x, y, agentId, team = 'attacker') {
    this.x = x; this.y = y;
    this.agentId = agentId;
    this.team    = team;

    // 체력 & 방어구
    this.hp    = CONFIG.PLAYER_HP;
    this.maxHp = CONFIG.PLAYER_HP;
    this.armor = 0;
    this.maxArmor = 0;
    this.alive = true;

    // 자세
    this.stance  = 'run';    // 'run' | 'walk' | 'crouch'
    this.isMoving = false;

    // 위치 & 방향
    this.angle   = 0;        // 마우스 방향 (rad)
    this.vx = 0; this.vy = 0;

    // 무기
    this.weapons  = ['knife'];      // 인벤토리
    this.weaponIdx = 0;
    this.currentWeapon = 'knife';

    // 경제
    this.credits = CONFIG.STARTING_CREDITS;

    // 통계
    this.kills  = 0;
    this.deaths = 0;
    this.assists = 0;
    this.damageDealt = 0;

    // 시각 효과
    this.flashAlpha  = 0;   // 섬광 효과
    this.hitFlash    = 0;   // 피격 효과
    this.slowFactor  = 1;   // 감속 (세이지 슬로우)
    this.healingAura = false;

    // 줌 (오퍼레이터)
    this.scoped = false;

    // 에이전트 참조
    this.agentData = AGENT_DATA[agentId] || AGENT_DATA['jett'];

    // 피닉스 리스폰 위치
    this.respawnPoint = null;

    // 반경
    this.radius = CONFIG.PLAYER_RADIUS;

    // 신속 모드 강제 무기 여부
    this.forcedWeapon = null;
  }

  // ── 장비 ─────────────────────────────────────────────────
  equipWeapon(weaponId) {
    if (!this.weapons.includes(weaponId)) this.weapons.push(weaponId);
    this.weaponIdx    = this.weapons.indexOf(weaponId);
    this.currentWeapon = weaponId;
  }

  equipArmor(type) {
    const d = ARMOR_DATA[type];
    if (!d) return;
    this.armor    = d.hp;
    this.maxArmor = d.hp;
  }

  // ── 업데이트 ──────────────────────────────────────────────
  update(dt, input, mapWalls, audio) {
    if (!this.alive) return;

    // 자세 & 속도
    this.stance = input.getStance();
    let speed;
    if (this.stance === 'crouch') speed = CONFIG.SPEED_CROUCH;
    else if (this.stance === 'walk') speed = CONFIG.SPEED_WALK;
    else speed = CONFIG.SPEED_RUN;

    // 무기별 이동 속도 비율 적용
    const wData = WEAPON_DATA[this.currentWeapon];
    if (wData && wData.speed) {
      speed *= wData.speed;
    }

    speed *= this.slowFactor;

    const { dx, dy } = input.getMovement();
    this.isMoving = (dx !== 0 || dy !== 0);

    // 줌 시 이동 속도 감소
    if (this.scoped) speed *= 0.5;

    // 이동 적용 + 충돌
    if (this.isMoving) {
      this._move(dx * speed * dt, dy * speed * dt, mapWalls);
    }

    // 방향 (마우스 바라보기)
    this.angle = Math.atan2(
      input.mouse.worldY - this.y,
      input.mouse.worldX - this.x,
    );

    // 발소리 & 오디오
    if (audio) {
      audio.updateListener(this.x, this.y);
      audio.updateFootstep(dt, this.x, this.y, this.stance, this.isMoving);
    }

    // 줌 토글 (우클릭)
    if (input.mouse.right && wData && wData.hasScope) {
      this.scoped = true;
    } else {
      this.scoped = false;
    }

    // 무기 전환
    const wSwitch = input.getWeaponSwitch();
    if (wSwitch !== null && wSwitch <= this.weapons.length) {
      this.weaponIdx     = wSwitch - 1;
      this.currentWeapon = this.weapons[this.weaponIdx];
    }

    // G키 — 무기 전환 (근접 ↔ 전 무기)
    if (input.justPressed('KeyG')) {
      this.weaponIdx = (this.weaponIdx + 1) % this.weapons.length;
      this.currentWeapon = this.weapons[this.weaponIdx];
    }

    // 피격 플래시 감소
    if (this.hitFlash > 0) this.hitFlash -= dt * 3;
    if (this.flashAlpha > 0) this.flashAlpha -= dt * 0.8;

    // 슬로우 초기화
    this.slowFactor = 1;
  }

  // ── AABB 충돌 이동 ────────────────────────────────────────
  _move(dx, dy, walls) {
    // X 먼저
    this.x += dx;
    for (const w of walls) {
      if (!w.solid) continue;
      if (this._collides(w)) { this.x -= dx; break; }
    }
    // Y
    this.y += dy;
    for (const w of walls) {
      if (!w.solid) continue;
      if (this._collides(w)) { this.y -= dy; break; }
    }
    // 월드 경계
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

  // ── 소음 범위 계산 ────────────────────────────────────────
  getSoundRadius() {
    if (!this.isMoving) return 0;
    if (this.stance === 'walk')   return CONFIG.SOUND_WALK;
    if (this.stance === 'crouch') return CONFIG.SOUND_CROUCH;
    return CONFIG.SOUND_RUN;
  }

  // 정확도 배율 반환 (스프레드 rad)
  getAccuracy() {
    const wData = WEAPON_DATA[this.currentWeapon];
    if (!wData || !wData.accuracy) return 0.1;
    const acc = wData.accuracy;
    if (this.scoped && wData.scopedAccuracy !== undefined) return wData.scopedAccuracy;
    if (!this.isMoving) return this.stance === 'crouch' ? acc.crouch : acc.still;
    if (this.stance === 'walk')   return acc.walk;
    if (this.stance === 'crouch') return acc.crouch;
    return acc.run;
  }

  // ── 피격 처리 ─────────────────────────────────────────────
  takeDamage(amount, hitZone) {
    if (!this.alive) return 0;

    let dmg = amount;

    // 방어구 흡수: 몸샷/다리샷만 (헤드는 퍼센트)
    if (this.armor > 0 && hitZone !== 'head') {
      const absorbed = Math.min(this.armor, dmg * 0.5);
      this.armor -= absorbed;
      dmg -= absorbed;
      if (this.armor < 0) this.armor = 0;
    } else if (this.armor > 0 && hitZone === 'head') {
      const absorbed = Math.min(this.armor, dmg * 0.3);
      this.armor -= absorbed;
      dmg -= absorbed;
    }

    this.hp -= dmg;
    this.hitFlash = 1;

    if (this.hp <= 0) {
      this.hp    = 0;
      this.alive = false;
      this.deaths++;
    }
    return dmg;
  }

  // ── 치유 ──────────────────────────────────────────────────
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  // ── 리스폰 ────────────────────────────────────────────────
  respawn(x, y) {
    this.x = x; this.y = y;
    this.hp    = this.maxHp;
    this.armor = this.maxArmor;
    this.alive = true;
  }

  // ── 렌더링 ───────────────────────────────────────────────
  render(ctx, isLocalPlayer = true) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // ── 플레이어 본체 렌더링 ──
    const displayColor = isLocalPlayer ? CONFIG.C.ALLY : CONFIG.C.ENEMY;
    const bodyColor    = this.isMoving ? displayColor : '#fff';
    const flashAmt     = Math.max(0, this.hitFlash);

    // 1. 그림자/글로우
    ctx.shadowColor = displayColor;
    ctx.shadowBlur  = 12 + flashAmt * 15;

    // 2. 몸통 (Body)
    ctx.rotate(this.angle);

    // 어깨
    ctx.fillStyle = displayColor;
    ctx.beginPath(); ctx.ellipse(-2, -9, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2, 9, 7, 4, 0, 0, Math.PI * 2); ctx.fill();

    // 본체
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    bodyGrad.addColorStop(0, flashAmt > 0.5 ? '#fff' : displayColor);
    bodyGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = displayColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. 머리 (Head)
    ctx.save();
    ctx.translate(3, 0); // 머리 위치를 앞쪽으로 살짝 이동
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#111'; // 머리카락/헬멧 느낌의 어두운 색
    ctx.fill();
    ctx.strokeStyle = displayColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    // 눈/바이저 (Visor)
    ctx.fillStyle = displayColor;
    ctx.fillRect(2, -4, 2, 8);
    ctx.restore();

    // 4. 총기 (Gun)
    const wData = WEAPON_DATA[this.currentWeapon];
    const barrelLen = this.radius + (wData?.type === 'sniper' ? 18 : 12);
    const barrelWidth = wData?.type === 'sniper' ? 4 : 3;
    
    ctx.fillStyle = '#222';
    ctx.fillRect(this.radius - 2, -barrelWidth/2, barrelLen - this.radius + 2, barrelWidth);
    
    // 머즐 플래시 (총구 형태 추가)
    ctx.fillStyle = displayColor;
    ctx.fillRect(barrelLen - 2, -barrelWidth/2 - 0.5, 3, barrelWidth + 1);

    // 줌 효과 (오퍼레이터)
    if (this.scoped) {
      ctx.strokeStyle = '#ffffaa';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, -0.4, 0.4);
      ctx.stroke();
    }

    ctx.restore();

    // 자세 링 (앉기)
    if (this.stance === 'crouch') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 에이전트 이름 뱃지 (타 플레이어용)
    if (!isLocalPlayer) {
      ctx.save();
      ctx.font         = `700 10px ${CONFIG.FONT_HUD}`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle    = displayColor;
      ctx.fillText(this.agentData.name, this.x, this.y - this.radius - 4);
      ctx.restore();
    }
  }

  // ── 체력바 렌더링 (게임 중 캐릭터 위) ──────────────────────
  renderHealthBar(ctx) {
    if (!this.alive) return;
    const w = 40, h = 4;
    const bx = this.x - w / 2;
    const by = this.y - this.radius - 14;

    ctx.save();
    // 배경
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
    // HP
    const ratio = this.hp / this.maxHp;
    ctx.fillStyle = ratio > 0.5 ? CONFIG.C.HP_BAR : CONFIG.C.HP_LOW;
    ctx.fillRect(bx, by, w * ratio, h);
    // 방어구
    if (this.armor > 0) {
      ctx.fillStyle = CONFIG.C.SHIELD_BAR;
      ctx.fillRect(bx, by + h + 1, w * (this.armor / this.maxArmor), 2);
    }
    ctx.restore();
  }
}
