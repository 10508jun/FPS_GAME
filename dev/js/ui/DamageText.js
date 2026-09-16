// ============================================================
//  DamageText.js — 부동 대미지 숫자 시스템
// ============================================================
class DamageTextSystem {
  constructor() {
    this.entries = [];
  }

  /**
   * @param {number} x         월드 X
   * @param {number} y         월드 Y
   * @param {number} damage    대미지 값
   * @param {string} hitZone   'head' | 'body' | 'leg'
   * @param {boolean} isWallbang
   * @param {object} camera    { x, y } 카메라 오프셋
   */
  spawn(x, y, damage, hitZone = 'body', isWallbang = false, camera = null) {
    // 화면 좌표로 변환
    const sx = camera ? x - camera.x : x;
    const sy = camera ? y - camera.y : y;

    let color, size, prefix;
    if (hitZone === 'head') {
      color = '#ffdd00'; size = 22; prefix = '';
    } else if (hitZone === 'leg') {
      color = '#ff9955'; size = 15; prefix = '';
    } else {
      color = '#ffffff'; size = 17; prefix = '';
    }
    if (isWallbang) { color = '#88aaff'; prefix = '⤵'; }
    if (damage >= 150) { size += 4; } // 즉사급 강조

    this.entries.push({
      x: sx + (Math.random() - 0.5) * 30,
      y: sy,
      vy: -90 - Math.random() * 40,     // 위로 이동
      vx: (Math.random() - 0.5) * 30,
      life: 0.9,
      maxLife: 0.9,
      text: prefix + damage,
      color, size,
      hitZone,
    });
  }

  /** 사격장 마네킹 타격 (큰 텍스트) */
  spawnRange(x, y, damage, hitZone, camera) {
    this.spawn(x, y, damage, hitZone, false, camera);
    // 사격장에서는 세부 텍스트도 추가
    const sx = camera ? x - camera.x : x;
    const sy = camera ? y - camera.y : y;
    const label = hitZone === 'head' ? 'HEADSHOT!' : hitZone === 'leg' ? 'LEG' : '';
    if (label) {
      this.entries.push({
        x: sx,
        y: sy + 22,
        vy: -50,
        vx: 0,
        life: 0.7,
        maxLife: 0.7,
        text: label,
        color: hitZone === 'head' ? '#ffdd00' : '#ff9955',
        size: 12,
        hitZone,
      });
    }
  }

  update(dt) {
    this.entries = this.entries.filter(e => {
      e.life -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy *= 0.92;   // 감속
      return e.life > 0;
    });
  }

  render(ctx) {
    ctx.save();
    for (const e of this.entries) {
      const alpha = Math.min(1, e.life / (e.maxLife * 0.5));
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${e.size}px ${CONFIG.FONT_HUD}`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      // 외곽선
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth   = 3;
      ctx.strokeText(e.text, e.x, e.y);

      // 본 색상
      ctx.fillStyle = e.color;
      if (e.hitZone === 'head') {
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur  = 12;
      }
      ctx.fillText(e.text, e.x, e.y);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}
