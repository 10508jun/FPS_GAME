// ============================================================
//  MinimapSystem.js — 미니맵 렌더링 (파동, 적 위치, 소음 범위)
// ============================================================
class MinimapSystem {
  constructor(mapData) {
    this.map    = mapData;
    this.size   = CONFIG.MINIMAP_SIZE;
    this.pad    = CONFIG.MINIMAP_PAD;

    // 월드 → 미니맵 스케일
    this.scaleX = this.size / this.map.worldW;
    this.scaleY = this.size / this.map.worldH;

    // 발소리 파동 목록
    this.ripples = [];       // { x, y, r, maxR, life, maxLife, team }

    // 적 마지막 확인 위치
    this.enemyLastSeen = []; // { x, y, life, maxLife }

    // 사이트 플래시 (스파이크 심었을 때)
    this.siteFlash = null;

    // 오프스크린 캔버스 (맵 기하 캐시)
    this._mapCache = null;
    this._buildMapCache();
  }

  // ── 맵 캐시 빌드 ─────────────────────────────────────────
  _buildMapCache() {
    const c = document.createElement('canvas');
    c.width  = this.size;
    c.height = this.size;
    const ctx = c.getContext('2d');

    // 배경
    ctx.fillStyle = '#050d18';
    ctx.fillRect(0, 0, this.size, this.size);

    // 바닥
    const floorColors = {
      spawn_atk:  '#1a2a1a',
      spawn_def:  '#1a1a2a',
      site_a:     '#152415',
      site_b:     '#15152a',
      site_c:     '#2a1515',
      corridor:   '#111827',
      mid:        '#131e28',
    };
    for (const f of this.map.floors) {
      ctx.fillStyle = floorColors[f.type] || '#111827';
      ctx.fillRect(
        f.x * this.scaleX, f.y * this.scaleY,
        f.w * this.scaleX, f.h * this.scaleY,
      );
      // 레이블 (사이트)
      if (f.label) {
        ctx.font      = '600 7px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.textAlign = 'center';
        ctx.fillText(
          f.label,
          (f.x + f.w / 2) * this.scaleX,
          (f.y + f.h / 2) * this.scaleY + 2,
        );
      }
    }

    // 벽
    for (const w of this.map.walls) {
      const rh = w.h || w.height || 30;
      ctx.fillStyle   = w.type === 'cover' ? '#374151' : '#1c2b3a';
      ctx.strokeStyle = '#2a3f56';
      ctx.lineWidth   = 0.5;
      ctx.fillRect(
        w.x * this.scaleX, w.y * this.scaleY,
        w.w * this.scaleX, rh  * this.scaleY,
      );
      ctx.strokeRect(
        w.x * this.scaleX, w.y * this.scaleY,
        w.w * this.scaleX, rh  * this.scaleY,
      );
    }

    // 사이트 레이블 (A/B/C)
    for (const [key, site] of Object.entries(this.map.sites)) {
      ctx.font          = '900 14px Rajdhani, sans-serif';
      ctx.fillStyle     = 'rgba(255,255,255,0.18)';
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText(
        key,
        (site.x + site.w / 2) * this.scaleX,
        (site.y + site.h / 2) * this.scaleY,
      );
    }

    this._mapCache = c;
  }

  // ── w.좌표 → 미니맵 좌표 변환 ─────────────────────────────
  w2m(wx, wy) {
    const mx = this.pad + wx * this.scaleX;
    const my = CONFIG.CANVAS_HEIGHT - this.pad - this.size + wy * this.scaleY;
    return { x: mx, y: my };
  }

  // ── 업데이트 ──────────────────────────────────────────────
  update(dt, player, bots) {
    // 발소리 파동 (플레이어 달리기 시)
    const soundR = player.alive ? player.getSoundRadius() : 0;
    if (soundR > 0 && player.isMoving) {
      // 파동 간격 (0.25초)
      this._rippleTimer = (this._rippleTimer || 0) + dt;
      if (this._rippleTimer >= 0.25) {
        this._rippleTimer = 0;
        this.ripples.push({
          x: player.x, y: player.y,
          r: 0,
          maxR: soundR,
          life: 0.8, maxLife: 0.8,
          team: player.team,
        });
      }
    } else {
      this._rippleTimer = 0;
    }

    // 봇 파동 (적이 뛸 때)
    for (const bot of bots) {
      if (!bot.alive || bot.isDummy) continue;
      if (bot.state === 'patrol' || bot.state === 'chase') {
        this._botRippleTimers = this._botRippleTimers || {};
        this._botRippleTimers[bot.x] = (this._botRippleTimers[bot.x] || 0) + dt;
        if (this._botRippleTimers[bot.x] >= 0.4) {
          this._botRippleTimers[bot.x] = 0;
          this.enemyLastSeen.push({
            x: bot.x, y: bot.y,
            life: 5, maxLife: 5,
          });
        }
      }
    }

    // 파동 업데이트
    this.ripples = this.ripples.filter(r => {
      r.life -= dt;
      r.r    += (r.maxR - r.r) * dt * 4;
      return r.life > 0;
    });

    // 적 마지막 위치 페이드
    this.enemyLastSeen = this.enemyLastSeen.filter(e => {
      e.life -= dt;
      return e.life > 0;
    });
  }

  // ── 렌더링 ───────────────────────────────────────────────
  render(ctx, player, bots) {
    const px = this.pad;                       // 좌측 시작
    const py = CONFIG.CANVAS_HEIGHT - this.pad - this.size;   // 위 시작

    ctx.save();

    // 클리핑
    ctx.beginPath();
    ctx.rect(px, py, this.size, this.size);
    ctx.clip();

    // 배경 & 맵 캐시
    ctx.fillStyle = CONFIG.C.MINIMAP_BG;
    ctx.fillRect(px, py, this.size, this.size);
    ctx.drawImage(this._mapCache, px, py);

    // 적 마지막 확인 위치
    for (const e of this.enemyLastSeen) {
      const { x, y } = this.w2m(e.x, e.y);
      const alpha = (e.life / e.maxLife) * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,70,85,${alpha})`;
      ctx.fill();
      // X 마크
      ctx.strokeStyle = `rgba(255,100,100,${alpha})`;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3);
      ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3);
      ctx.stroke();
    }

    // 발소리 파동 (달리기)
    for (const r of this.ripples) {
      const { x, y } = this.w2m(r.x, r.y);
      const mr = r.maxR * this.scaleX;
      const cr = r.r   * this.scaleX;
      const alpha = (r.life / r.maxLife) * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, cr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,210,50,${alpha})`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // 플레이어 소음 반경 표시
    if (player.alive) {
      const { x: px2, y: py2 } = this.w2m(player.x, player.y);
      const sr = player.getSoundRadius() * this.scaleX;
      if (sr > 2) {
        ctx.beginPath();
        ctx.arc(px2, py2, sr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,210,50,0.25)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 봇 점
    for (const bot of bots) {
      if (!bot.alive) continue;
      const { x, y } = this.w2m(bot.x, bot.y);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle   = bot.isDummy ? '#888' : CONFIG.C.ENEMY;
      ctx.shadowColor = CONFIG.C.ENEMY;
      ctx.shadowBlur  = 4;
      ctx.fill();
      ctx.shadowBlur  = 0;
      // 방향
      const ex = x + Math.cos(bot.angle) * 6;
      const ey = y + Math.sin(bot.angle) * 6;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(ex, ey);
      ctx.strokeStyle = CONFIG.C.ENEMY;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // 플레이어 점
    if (player.alive) {
      const { x, y } = this.w2m(player.x, player.y);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle   = CONFIG.C.ALLY;
      ctx.shadowColor = CONFIG.C.ALLY;
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur  = 0;
      // 방향 화살표
      const ex = x + Math.cos(player.angle) * 8;
      const ey = y + Math.sin(player.angle) * 8;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(ex, ey);
      ctx.strokeStyle = CONFIG.C.ALLY;
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    ctx.restore();

    // 외곽 테두리
    ctx.save();
    ctx.strokeStyle = CONFIG.C.BORDER || '#1e3048';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(px, py, this.size, this.size);
    ctx.restore();

    // 미니맵 레이블
    ctx.save();
    ctx.font      = `600 9px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'left';
    ctx.fillText('FORGE', px + 4, py + 11);
    ctx.restore();
  }

  // 적 위치 마지막 확인 기록 (스킬 정찰 등)
  revealEnemy(wx, wy, duration = 5) {
    this.enemyLastSeen.push({ x: wx, y: wy, life: duration, maxLife: duration });
  }
}
