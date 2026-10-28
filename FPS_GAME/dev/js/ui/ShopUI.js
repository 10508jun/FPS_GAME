// ============================================================
//  ShopUI.js — 인게임 구매 상점 캔버스 오버레이
// ============================================================
class ShopUI {
  constructor() {
    this.visible = false;
    this.selectedCategory = 'rifle';
    this.selectedItem     = null;
    this.hoveredItem      = null;

    // 카테고리 목록
    this.categories = [
      { id: 'pistol',  label: '권총',   icon: '🔫' },
      { id: 'smg',     label: '기관단총', icon: '🔫' },
      { id: 'shotgun', label: '산탄총', icon: '🔫' },
      { id: 'rifle',   label: '소총',   icon: '🔫' },
      { id: 'sniper',  label: '저격총', icon: '🎯' },
      { id: 'heavy',   label: '중화기', icon: '🔫' },
      { id: 'armor',   label: '방어구', icon: '🛡️' },
    ];

    // 레이아웃 상수
    this.PW = 860; this.PH = 500;
    this.PX = 0;   this.PY = 0; // render에서 계산

    // 구매 확인 팝업
    this.confirmItem = null;
    this.confirmTimer = 0;
  }

  show() { this.visible = true; this.confirmItem = null; }
  hide() { this.visible = false; this.confirmItem = null; }
  toggle() { this.visible ? this.hide() : this.show(); }

  // ── 클릭 처리 ────────────────────────────────────────────
  handleClick(mx, my, player, weaponSys, economy) {
    if (!this.visible) return false;

    // ESC / X 버튼
    if (mx > this.PX + this.PW - 36 && my > this.PY + 8 && my < this.PY + 44) {
      this.hide(); return true;
    }

    // 카테고리 클릭
    const catX = this.PX + 14;
    for (let i = 0; i < this.categories.length; i++) {
      const cy = this.PY + 60 + i * 46;
      if (mx > catX && mx < catX + 130 && my > cy && my < cy + 38) {
        this.selectedCategory = this.categories[i].id;
        this.selectedItem = null;
        return true;
      }
    }

    // 아이템 클릭
    const items = this._getCategoryItems();
    for (let i = 0; i < items.length; i++) {
      const { bx, by, bw, bh } = this._itemRect(i);
      if (mx > bx && mx < bx + bw && my > by && my < by + bh) {
        this.selectedItem = items[i];
        return true;
      }
    }

    // 구매 버튼
    if (this.selectedItem) {
      const buyBx = this.PX + this.PW - 160;
      const buyBy = this.PY + this.PH - 56;
      if (mx > buyBx && mx < buyBx + 130 && my > buyBy && my < buyBy + 36) {
        this._buyItem(player, weaponSys, economy);
        return true;
      }
    }

    return this.visible;
  }

  _buyItem(player, weaponSys, economy) {
    const item = this.selectedItem;
    if (!item) return;

    if (item.id === 'lightArmor' || item.id === 'heavyArmor') {
      const cost = item.cost;
      if (economy.buy(cost)) {
        const type = item.id === 'lightArmor' ? 'light' : 'heavy';
        player.equipArmor(type);
        this.confirmItem = item;
        this.confirmTimer = 1.5;
      }
    } else {
      // 무기
      const cost = WEAPON_DATA[item.id]?.cost || 0;
      if (economy.buy(cost)) {
        player.equipWeapon(item.id);
        weaponSys.refillAmmo(item.id);
        this.confirmItem = item;
        this.confirmTimer = 1.5;
        this.selectedItem = null;
      }
    }
  }

  // ── 아이템 목록 ──────────────────────────────────────────
  _getCategoryItems() {
    if (this.selectedCategory === 'armor') {
      return [
        { id: 'lightArmor', name: '라이트 쉴드', icon: '🛡️', cost: 400,  stat: '50 HP 방어구' },
        { id: 'heavyArmor', name: '헤비 쉴드',   icon: '🛡️', cost: 1000, stat: '100 HP 방어구' },
      ];
    }
    const ids = SHOP_WEAPONS[this.selectedCategory] || [];
    return ids.map(id => {
      const d = WEAPON_DATA[id];
      return {
        id, name: d.name, icon: d.icon, cost: d.cost,
        stat: `헤드샷: ${d.damage.head} | 몸샷: ${d.damage.body}`,
      };
    });
  }

  _itemRect(i) {
    const cols = 3;
    const col = i % cols, row = Math.floor(i / cols);
    const bx = this.PX + 154 + col * (168 + 8);
    const by = this.PY + 60  + row * (110 + 8);
    return { bx, by, bw: 168, bh: 110 };
  }

  // ── 업데이트 ─────────────────────────────────────────────
  update(dt) {
    if (this.confirmTimer > 0) this.confirmTimer -= dt;
    else this.confirmItem = null;
  }

  // ── 렌더링 ───────────────────────────────────────────────
  render(ctx, economy, player) {
    if (!this.visible) return;

    const W = ctx.canvas.width, H = ctx.canvas.height;
    this.PX = Math.floor((W - this.PW) / 2);
    this.PY = Math.floor((H - this.PH) / 2);

    // 어두운 오버레이
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);

    // 패널 배경
    ctx.fillStyle = '#0d1628';
    ctx.beginPath();
    this._rr(ctx, this.PX, this.PY, this.PW, this.PH, 12);
    ctx.fill();
    ctx.strokeStyle = '#1e3048';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this._rr(ctx, this.PX, this.PY, this.PW, this.PH, 12);
    ctx.stroke();

    // 헤더
    ctx.fillStyle = '#152235';
    ctx.beginPath();
    this._rr(ctx, this.PX, this.PY, this.PW, 52, 12);
    ctx.fill();

    ctx.font      = `700 18px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'left';
    ctx.fillText('무기 구매', this.PX + 20, this.PY + 34);

    // 크레딧
    ctx.font      = `700 20px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = CONFIG.C.GOLD;
    ctx.textAlign = 'right';
    ctx.fillText(`¥ ${economy.formatted()}`, this.PX + this.PW - 60, this.PY + 34);

    // X 닫기
    ctx.font      = `700 20px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('×', this.PX + this.PW - 20, this.PY + 32);

    // ── 카테고리 컬럼 ──
    this.categories.forEach((cat, i) => {
      const cx = this.PX + 14;
      const cy = this.PY + 60 + i * 46;
      const isActive = this.selectedCategory === cat.id;

      ctx.fillStyle = isActive ? 'rgba(255,70,85,0.12)' : 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      this._rr(ctx, cx, cy, 130, 38, 4);
      ctx.fill();

      if (isActive) {
        ctx.fillStyle = '#ff4655';
        ctx.fillRect(cx, cy, 3, 38);
      }

      ctx.font = `${isActive ? 700 : 500} 13px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = isActive ? '#ecf0f1' : '#6a8099';
      ctx.textAlign = 'left';
      ctx.fillText(`${cat.icon} ${cat.label}`, cx + 12, cy + 24);
    });

    // ── 아이템 그리드 ──
    const items = this._getCategoryItems();
    items.forEach((item, i) => {
      const { bx, by, bw, bh } = this._itemRect(i);
      const isSelected = this.selectedItem?.id === item.id;
      const equipped   = player.weapons.includes(item.id) || player.currentWeapon === item.id;
      const canAfford  = economy.canAfford(item.cost);

      ctx.fillStyle = isSelected ? 'rgba(0,212,255,0.1)'
                    : equipped   ? 'rgba(46,204,113,0.08)'
                    : 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      this._rr(ctx, bx, by, bw, bh, 6);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#00d4ff'
                      : equipped   ? '#2ecc71'
                      : canAfford  ? 'rgba(255,255,255,0.1)'
                      : 'rgba(255,255,255,0.04)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      this._rr(ctx, bx, by, bw, bh, 6);
      ctx.stroke();

      // 아이콘
      ctx.font = `26px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(item.icon, bx + 10, by + 38);

      // 이름
      ctx.font = `700 13px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = canAfford ? '#ecf0f1' : '#4a6070';
      ctx.fillText(item.name, bx + 10, by + 58);

      // 스탯
      ctx.font = `400 11px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = canAfford ? '#6a8099' : '#344050';
      ctx.fillText(item.stat, bx + 10, by + 74);

      // 가격
      ctx.font = `700 14px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = canAfford ? CONFIG.C.GOLD : '#664400';
      ctx.fillText(`¥ ${item.cost}`, bx + 10, by + 96);

      // 장착 중 뱃지
      if (equipped) {
        ctx.font = `700 9px ${CONFIG.FONT_HUD}`;
        ctx.fillStyle = '#2ecc71';
        ctx.textAlign = 'right';
        ctx.fillText('장착중', bx + bw - 6, by + 12);
      }
      ctx.textAlign = 'left';
    });

    // ── 하단 구매 버튼 ──
    if (this.selectedItem) {
      const item = this.selectedItem;
      const canAfford = economy.canAfford(item.cost);
      const buyBx = this.PX + this.PW - 160;
      const buyBy = this.PY + this.PH - 56;
      ctx.fillStyle = canAfford ? '#ff4655' : '#3a2020';
      ctx.beginPath();
      this._rr(ctx, buyBx, buyBy, 130, 36, 4);
      ctx.fill();
      ctx.font      = `700 13px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = canAfford ? '#fff' : '#6a3030';
      ctx.textAlign = 'center';
      ctx.fillText(`구매 (¥${item.cost})`, buyBx + 65, buyBy + 23);
    }

    // 취소 버튼
    const cancelBx = this.PX + 20;
    const cancelBy = this.PY + this.PH - 56;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    this._rr(ctx, cancelBx, cancelBy, 100, 36, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this._rr(ctx, cancelBx, cancelBy, 100, 36, 4);
    ctx.stroke();
    ctx.font = `500 12px ${CONFIG.FONT_HUD}`; ctx.fillStyle = '#6a8099';
    ctx.textAlign = 'center';
    ctx.fillText('[ESC] 닫기', cancelBx + 50, cancelBy + 23);

    // 구매 확인 팝업
    if (this.confirmItem && this.confirmTimer > 0) {
      const alpha = Math.min(1, this.confirmTimer);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = 'rgba(0,30,15,0.9)';
      ctx.beginPath();
      this._rr(ctx, this.PX + this.PW/2 - 110, this.PY + this.PH - 100, 220, 40, 8);
      ctx.fill();
      ctx.font      = `700 15px ${CONFIG.FONT_HUD}`;
      ctx.fillStyle = '#2ecc71';
      ctx.textAlign = 'center';
      ctx.fillText(`✓ ${this.confirmItem.name} 구매 완료`, this.PX + this.PW/2, this.PY + this.PH - 74);
      ctx.restore();
    }

    ctx.textAlign = 'left';
  }

  _rr(ctx, x, y, w, h, r) {
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
}
