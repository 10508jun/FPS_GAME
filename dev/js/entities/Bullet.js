// ============================================================
//  Bullet.js — 히트스캔 트레이서 (시각 효과만)
//  실제 대미지는 WeaponSystem에서 레이캐스트로 즉시 계산됨
// ============================================================
class Bullet {
  constructor(sx, sy, ex, ey, color = '#ffee88', lifetime = 0.08) {
    this.sx = sx; this.sy = sy;   // 시작점
    this.ex = ex; this.ey = ey;   // 끝점
    this.color    = color;
    this.maxLife  = lifetime;
    this.life     = lifetime;
    this.dead     = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(this.sx, this.sy);
    ctx.lineTo(this.ex, this.ey);
    ctx.stroke();
    ctx.restore();
  }
}

// ── 임팩트 파티클 ─────────────────────────────────────────
class ImpactParticle {
  constructor(x, y, hitType, isHeadshot) {
    this.x = x; this.y = y;
    this.hitType = hitType;   // 'body' | 'head' | 'wall'
    this.isHeadshot = isHeadshot;
    this.particles = [];
    const count = hitType === 'wall' ? 6 : 8;
    const color = hitType === 'wall' ? '#888' : (isHeadshot ? '#ffcc00' : '#ff6666');
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        r: hitType === 'wall' ? 2 : 3,
        color,
      });
    }
    this.dead = false;
  }

  update(dt) {
    let alive = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life > 0) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt; // 중력
        alive++;
      }
    }
    if (alive === 0) this.dead = true;
  }

  render(ctx) {
    ctx.save();
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── 산탄총 펠릿 (Bucky용 다중 탄환) ─────────────────────────
class PelletGroup {
  constructor(sx, sy, angle, spreadRad, pelletCount, range) {
    this.tracers = [];
    for (let i = 0; i < pelletCount; i++) {
      const a = angle + (Math.random() - 0.5) * spreadRad * 2;
      const dist = range * (0.6 + Math.random() * 0.4);
      this.tracers.push(new Bullet(
        sx, sy,
        sx + Math.cos(a) * dist,
        sy + Math.sin(a) * dist,
        '#ffaa44', 0.12,
      ));
    }
    this.dead = false;
  }

  update(dt) {
    this.tracers.forEach(t => t.update(dt));
    if (this.tracers.every(t => t.dead)) this.dead = true;
  }

  render(ctx) {
    this.tracers.forEach(t => t.render(ctx));
  }
}
