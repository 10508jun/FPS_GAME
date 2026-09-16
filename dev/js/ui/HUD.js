// ============================================================
//  HUD.js — 인게임 HUD 렌더링 (캔버스 + DOM)
// ============================================================
class HUD {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W      = canvas.width;
    this.H      = canvas.height;

    // 킬피드 목록
    this.killfeed = [];   // { attacker, victim, weapon, time }

    // 라운드 결과 배너
    this.banner = null;   // { text, subtext, color, life }

    // 알림 팝업
    this.notifications = []; // { text, color, life }

    // 조준점 설정
    this.crosshairStyle = 'classic';  // 'classic' | 'dot' | 'circle'
    this.crosshairColor = 'rgba(255,255,255,0.9)';
    this.crosshairSize  = 7;
    this.crosshairGap   = 5;

    // 재장전 진행 링
    this._reloadAngle = 0;
  }

  // ── 매 프레임 업데이트 ────────────────────────────────────
  update(dt) {
    this.killfeed = this.killfeed.filter(k => { k.life -= dt; return k.life > 0; });
    this.notifications = this.notifications.filter(n => { n.life -= dt; return n.life > 0; });
    if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
  }

  // ── 전체 HUD 렌더링 ──────────────────────────────────────
  render(ctx, player, round, economy, ability, weaponSys, gameMode) {
    this.W = ctx.canvas.width;
    this.H = ctx.canvas.height;

    // 피격 화면 효과
    this._renderHitVignette(ctx, player);

    // 섬광 효과
    this._renderFlash(ctx, player);

    // 하단 HUD
    this._renderBottomHUD(ctx, player, weaponSys);

    // 스킬 바
    this._renderAbilities(ctx, player, ability);

    // 상단 점수 & 타이머
    this._renderTopHUD(ctx, round);

    // 크레딧 표시
    if (gameMode !== 'range') {
      this._renderCredits(ctx, economy);
    }

    // 킬피드
    this._renderKillfeed(ctx);

    // 알림
    this._renderNotifications(ctx);

    // 배너
    if (this.banner) this._renderBanner(ctx);

    // 조준점
    this._renderCrosshair(ctx, player);

    // 재장전 표시
    this._renderReloadBar(ctx, player, weaponSys);

    // 사격장 통계
    if (gameMode === 'range') this._renderRangeStats(ctx, player);

    // 구매 단계 안내
    if (round.phase === 'buy' && gameMode !== 'range') {
      this._renderBuyPhaseHint(ctx, round);
    }

    // 신속 모드 무기 표시
    if (gameMode === 'spikerush' && round.spikeRushWeapon) {
      this._renderSpikeRushWeapon(ctx, round);
    }
  }

  // ── 피격 비네트 ──────────────────────────────────────────
  _renderHitVignette(ctx, player) {
    const intensity = Math.max(0, player.hitFlash || 0);
    if (intensity <= 0) return;
    const grad = ctx.createRadialGradient(
      this.W/2, this.H/2, this.H * 0.2,
      this.W/2, this.H/2, this.H * 0.7,
    );
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, `rgba(180,0,0,${intensity * 0.55})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  // ── 섬광 ─────────────────────────────────────────────────
  _renderFlash(ctx, player) {
    if ((player.flashAlpha || 0) <= 0) return;
    ctx.fillStyle = `rgba(255,255,220,${player.flashAlpha})`;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  // ── 하단 HUD ─────────────────────────────────────────────
  _renderBottomHUD(ctx, player, weaponSys) {
    const bH = 90;
    const by = this.H - bH;

    // 반투명 바
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, by, this.W, bH);
    // 상단 구분선
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, by, this.W, 1);

    // ── 체력 ──
    const hpRatio = player.hp / player.maxHp;
    const hpColor = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f1c40f' : '#e74c3c';

    ctx.font      = `900 42px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = hpColor;
    ctx.textAlign = 'left';
    ctx.shadowColor = hpColor;
    ctx.shadowBlur  = hpRatio < 0.3 ? 14 : 0;
    ctx.fillText(Math.ceil(player.hp), 24, by + 56);
    ctx.shadowBlur = 0;

    // HP 아이콘
    ctx.font      = `12px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('HP', 24, by + 72);

    // HP 바
    const hpBarW = 180, hpBarH = 4;
    const hpBx = 24, hpBy = by + 78;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(hpBx, hpBy, hpBarW, hpBarH);
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBx, hpBy, hpBarW * hpRatio, hpBarH);

    // 방어구 바
    if (player.maxArmor > 0) {
      const armorBy = hpBy + 6;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(hpBx, armorBy, hpBarW, 3);
      ctx.fillStyle = '#3498db';
      ctx.fillRect(hpBx, armorBy, hpBarW * (player.armor / player.maxArmor), 3);
    }

    // ── 무기 & 탄약 (오른쪽) ──
    const wData = WEAPON_DATA[player.currentWeapon];
    if (wData) {
      const ammo   = weaponSys.getAmmo(player.currentWeapon);
      const reload  = weaponSys.isReloading(player.currentWeapon);

      // 무기 이름
      ctx.font      = `700 14px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'right';
      ctx.fillText(wData.name.toUpperCase(), this.W - 24, by + 30);

      // 탄약 숫자
      ctx.font      = `900 42px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = reload ? '#f1c40f' : '#ecf0f1';
      ctx.fillText(reload ? 'RELOADING' : ammo.mag, this.W - 24, by + 56);

      if (!reload) {
        // 예비 탄약
        ctx.font      = `500 18px ${CONFIG.FONT_HUD}`;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(`/ ${ammo.reserve}`, this.W - 24, by + 74);
      }
    }
  }

  // ── 스킬 바 (중앙 하단) ──────────────────────────────────
  _renderAbilities(ctx, player, ability) {
    if (!ability) return;
    const agent  = player.agentData;
    const keys   = ['c', 'q', 'e'];
    const bw     = 50, bh = 50, gap = 8;
    const totalW = keys.length * bw + (keys.length - 1) * gap + bw + gap * 2; // +ult
    const startX = (this.W - totalW) / 2;
    const by     = this.H - 82;

    keys.forEach((key, i) => {
      const ab    = agent.abilities[key];
      const charge = ability.charges[key];
      const cd     = ability.cooldowns[key];
      const isReady = charge > 0 && cd <= 0;
      const bx = startX + i * (bw + gap);

      // 배경
      ctx.fillStyle = isReady ? `rgba(255,255,255,0.08)` : 'rgba(0,0,0,0.4)';
      ctx.strokeStyle = isReady ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      this._roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill(); ctx.stroke();

      // 아이콘 (텍스트)
      ctx.font = `700 11px ${CONFIG.FONT_HUD}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = isReady ? CONFIG.C.GOLD : 'rgba(255,255,255,0.3)';
      ctx.fillText(ab.key, bx + bw/2, by + 14);

      // 스킬 이름
      ctx.font = `600 9px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = isReady ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)';
      const shortName = ab.name.slice(0, 6);
      ctx.fillText(shortName, bx + bw/2, by + 28);

      // 충전 수
      if (ab.maxCharges > 1) {
        ctx.font = `900 10px ${CONFIG.FONT_HUD}`;
        ctx.fillStyle = CONFIG.C.GOLD;
        ctx.fillText(`${charge}/${ab.maxCharges}`, bx + bw/2, by + 42);
      }

      // 쿨다운 오버레이
      if (cd > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        this._roundRect(ctx, bx, by, bw, bh, 4);
        ctx.fill();
        ctx.font = `900 16px ${CONFIG.FONT_HUD}`;
        ctx.fillStyle = '#fff';
        ctx.fillText(Math.ceil(cd), bx + bw/2, by + bh/2 + 5);
      }
    });

    // ── 궁극기 ──
    const ux = startX + keys.length * (bw + gap) + gap;
    const uw = bw, uh = bh;
    const ub = by;
    const ultReady = ability.ultReady || ability.ultActive;

    ctx.strokeStyle = ultReady ? CONFIG.C.GOLD : 'rgba(255,165,0,0.3)';
    ctx.lineWidth   = ultReady ? 2 : 1;
    ctx.fillStyle   = ultReady ? 'rgba(245,166,35,0.15)' : 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    this._roundRect(ctx, ux, ub, uw, uh, 4);
    ctx.fill();
    if (ultReady) {
      ctx.shadowColor = CONFIG.C.GOLD;
      ctx.shadowBlur  = 10;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 궁극기 게이지 채우기
    const ultRatio = Math.min(1, ability.ultPoints / ability.maxUltPoints);
    if (ultRatio > 0) {
      ctx.fillStyle = `rgba(245,166,35,${ultReady ? 0.35 : 0.2})`;
      ctx.beginPath();
      this._roundRect(ctx, ux, ub + uh * (1 - ultRatio), uw, uh * ultRatio, 4);
      ctx.fill();
    }

    ctx.font = `700 11px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = ultReady ? CONFIG.C.GOLD : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('X', ux + uw/2, ub + 14);

    ctx.font = `600 9px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`${ability.ultPoints}/${ability.maxUltPoints}`, ux + uw/2, ub + 28);

    if (ultReady) {
      ctx.font = `900 9px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = CONFIG.C.GOLD;
      ctx.fillText('READY', ux + uw/2, ub + 42);
    }
  }

  // ── 상단 HUD ─────────────────────────────────────────────
  _renderTopHUD(ctx, round) {
    if (!round) return;
    const cx = this.W / 2;

    // 배경 알약
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    this._drawPill(ctx, cx - 120, 0, 240, 54);
    ctx.fill();

    // 점수
    ctx.textAlign = 'center';
    ctx.font = `900 26px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = CONFIG.C.ENEMY;
    ctx.fillText(round.scoreAtk, cx - 40, 36);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `400 20px ${CONFIG.FONT_HUD}`;
    ctx.fillText(':', cx, 36);

    ctx.font = `900 26px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = CONFIG.C.ALLY;
    ctx.fillText(round.scoreDef, cx + 40, 36);

    // 타이머 & 라운드
    ctx.font = `400 11px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(`ROUND ${round.currentRound}  ${round.getTimerLabel()}`, cx, 14);

    // 구매 단계 표시
    if (round.phase === 'buy') {
      ctx.font = `700 11px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = CONFIG.C.GOLD;
      ctx.fillText('BUY PHASE', cx, 52);
    }
  }

  // ── 크레딧 ───────────────────────────────────────────────
  _renderCredits(ctx, economy) {
    if (!economy) return;
    const cx = 24, cy = this.H - 110;
    ctx.font      = `700 18px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = CONFIG.C.GOLD;
    ctx.textAlign = 'left';
    ctx.shadowColor = CONFIG.C.GOLD;
    ctx.shadowBlur  = 6;
    ctx.fillText(`¥ ${economy.formatted()}`, cx, cy);
    ctx.shadowBlur = 0;
  }

  // ── 킬피드 ───────────────────────────────────────────────
  _renderKillfeed(ctx) {
    const x = this.W - 24;
    let y = 90;
    ctx.textAlign = 'right';
    for (const k of this.killfeed) {
      const alpha = Math.min(1, k.life / 0.5);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(x - 200, y - 14, 204, 18);
      ctx.font      = `600 12px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = CONFIG.C.ENEMY;
      ctx.fillText(k.attacker, x - 90, y);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(` [${k.weapon}] `, x - 45, y);
      ctx.fillStyle = CONFIG.C.ALLY;
      ctx.fillText(k.victim, x, y);
      ctx.globalAlpha = 1;
      y += 22;
    }
  }

  // ── 알림 팝업 ────────────────────────────────────────────
  _renderNotifications(ctx) {
    const cx = this.W / 2;
    let y = 80;
    ctx.textAlign = 'center';
    for (const n of this.notifications) {
      const alpha = Math.min(1, n.life / 0.4);
      ctx.globalAlpha = alpha;
      ctx.font      = `700 15px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = n.color || '#fff';
      ctx.shadowColor = n.color || '#fff';
      ctx.shadowBlur  = 8;
      ctx.fillText(n.text, cx, y);
      ctx.shadowBlur = 0;
      y += 24;
    }
    ctx.globalAlpha = 1;
  }

  // ── 라운드 결과 배너 ─────────────────────────────────────
  _renderBanner(ctx) {
    const b = this.banner;
    const alpha = Math.min(1, b.life * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign   = 'center';
    ctx.font = `900 60px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle  = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur  = 40;
    ctx.fillText(b.text, this.W/2, this.H/2 - 20);
    ctx.shadowBlur = 0;
    ctx.font = `400 20px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle  = 'rgba(255,255,255,0.7)';
    ctx.fillText(b.subtext || '', this.W/2, this.H/2 + 30);
    ctx.restore();
  }

  // ── 조준점 ───────────────────────────────────────────────
  _renderCrosshair(ctx, player) {
    const cx = this.W / 2, cy = this.H / 2;
    const spread = player.alive ? player.getAccuracy() * 60 : 0;
    const gap    = this.crosshairGap + spread;
    const size   = this.crosshairSize;
    const color  = this.crosshairColor;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur  = 3;

    // 상하좌우 4선
    const lines = [
      [cx, cy - gap - size, cx, cy - gap],
      [cx, cy + gap,        cx, cy + gap + size],
      [cx - gap - size, cy, cx - gap, cy],
      [cx + gap,        cy, cx + gap + size, cy],
    ];
    lines.forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });

    // 중앙 점
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }

  // ── 재장전 링 ────────────────────────────────────────────
  _renderReloadBar(ctx, player, weaponSys) {
    const isRel = weaponSys.isReloading(player.currentWeapon);
    if (!isRel) return;
    const prog = weaponSys.getReloadProgress(player.currentWeapon);
    const cx = this.W / 2, cy = this.H / 2 + 35;
    const r  = 22;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = CONFIG.C.GOLD;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + prog * Math.PI*2);
    ctx.stroke();
    ctx.font      = `700 10px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = CONFIG.C.GOLD;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(prog*100)}%`, cx, cy + 4);
    ctx.restore();
  }

  // ── 사격장 통계 ──────────────────────────────────────────
  _renderRangeStats(ctx, player) {
    const x = 20, y = 90;
    const w = 200, h = 110;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); this._roundRect(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); this._roundRect(ctx, x, y, w, h, 8); ctx.stroke();

    ctx.font = `700 9px ${CONFIG.FONT_HUD}`; ctx.fillStyle = CONFIG.C.DIM || '#768079';
    ctx.textAlign = 'left';
    ctx.fillText('TRAINING RANGE', x + 12, y + 16);

    const rows = [
      ['킬', player.kills],
      ['총 피해량', player.damageDealt],
      ['무기', WEAPON_DATA[player.currentWeapon]?.name || '-'],
    ];
    rows.forEach(([label, val], i) => {
      ctx.font = `400 12px ${CONFIG.FONT_HUD}`; ctx.fillStyle = CONFIG.C.text2 || '#a0b4c8';
      ctx.fillText(label, x + 12, y + 36 + i * 22);
      ctx.font = `700 12px ${CONFIG.FONT_HUD}`; ctx.fillStyle = '#ecf0f1';
      ctx.textAlign = 'right';
      ctx.fillText(val, x + w - 12, y + 36 + i * 22);
      ctx.textAlign = 'left';
    });
  }

  // ── 구매 단계 힌트 ───────────────────────────────────────
  _renderBuyPhaseHint(ctx, round) {
    const cx = this.W / 2;
    ctx.textAlign   = 'center';
    ctx.font        = `700 14px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle   = 'rgba(255,255,255,0.5)';
    ctx.fillText('[B] 무기 구매 상점', cx, this.H - 110);
  }

  // ── 신속 모드 강제 무기 표시 ─────────────────────────────
  _renderSpikeRushWeapon(ctx, round) {
    const wData = WEAPON_DATA[round.spikeRushWeapon];
    if (!wData) return;
    const cx = this.W / 2;
    ctx.textAlign   = 'center';
    ctx.font        = `700 13px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle   = CONFIG.C.GOLD;
    ctx.shadowColor = CONFIG.C.GOLD;
    ctx.shadowBlur  = 6;
    ctx.fillText(`지급 무기: ${wData.name}`, cx, this.H - 130);
    ctx.shadowBlur  = 0;
  }

  // ── 이벤트 추가 헬퍼 ─────────────────────────────────────
  addKillfeed(attacker, victim, weapon) {
    this.killfeed.unshift({ attacker, victim, weapon, life: 5 });
    if (this.killfeed.length > 5) this.killfeed.pop();
  }

  showBanner(text, subtext, color = '#fff', duration = 3) {
    this.banner = { text, subtext, color, life: duration };
  }

  notify(text, color = '#fff', duration = 2) {
    this.notifications.push({ text, color, life: duration });
    if (this.notifications.length > 3) this.notifications.shift();
  }

  // ── 유틸 ─────────────────────────────────────────────────
  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _drawPill(ctx, x, y, w, h) {
    const r = h / 2;
    ctx.beginPath();
    ctx.arc(x + r, y + r, r, Math.PI/2, -Math.PI/2, true);
    ctx.arc(x + w - r, y + r, r, -Math.PI/2, Math.PI/2, false);
    ctx.closePath();
  }
}
