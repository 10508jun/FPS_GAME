// ============================================================
//  WeaponData.js — 모든 무기 스탯 (발로란트 최신 패치 기반)
// ============================================================
const WEAPON_DATA = {

  // ── 권총류 (Sidearms) ──────────────────────────────────────
  classic: {
    id: 'classic', name: '클래식', type: 'pistol', cost: 0, speed: 0.9, icon: '🔫',
    fireRate: 6.75, magazineSize: 12, reserveAmmo: 36, reloadTime: 1.75,
    accuracy: { still: 0.03, crouch: 0.02, walk: 0.08, run: 0.15, air: 0.4 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 300, head: 78, body: 26, leg: 22 },
        { maxDist: Infinity, head: 66, body: 22, leg: 18 }
      ]
    },
    wallbang: 0.2, pellets: 1, auto: false
  },
  shorty: {
    id: 'shorty', name: '쇼티', type: 'shotgun', cost: 300, speed: 0.85, icon: '🔫',
    fireRate: 3.3, magazineSize: 2, reserveAmmo: 10, reloadTime: 1.75,
    accuracy: { still: 0.08, crouch: 0.06, walk: 0.15, run: 0.25, air: 0.45 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 70,  head: 22, body: 11, leg: 9 },
        { maxDist: 150, head: 12, body: 6,  leg: 5 },
        { maxDist: Infinity, head: 6, body: 3, leg: 2 }
      ]
    },
    wallbang: 0.1, pellets: 15, spread: 0.18, auto: false
  },
  frenzy: {
    id: 'frenzy', name: '프렌지', type: 'pistol', cost: 450, speed: 0.9, icon: '🔫',
    fireRate: 10, magazineSize: 13, reserveAmmo: 39, reloadTime: 1.5,
    accuracy: { still: 0.035, crouch: 0.025, walk: 0.09, run: 0.18, air: 0.45 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 200, head: 78, body: 26, leg: 22 },
        { maxDist: Infinity, head: 63, body: 21, leg: 17 }
      ]
    },
    wallbang: 0.2, pellets: 1, auto: true
  },
  ghost: {
    id: 'ghost', name: '고스트', type: 'pistol', cost: 500, speed: 0.9, icon: '🔫',
    fireRate: 6.75, magazineSize: 15, reserveAmmo: 45, reloadTime: 1.5,
    accuracy: { still: 0.03, crouch: 0.016, walk: 0.07, run: 0.14, air: 0.35 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 300, head: 105, body: 30, leg: 25 },
        { maxDist: Infinity, head: 87, body: 25, leg: 21 }
      ]
    },
    wallbang: 0.2, pellets: 1, auto: false, silenced: true
  },
  sheriff: {
    id: 'sheriff', name: '셰리프', type: 'pistol', cost: 800, speed: 0.9, icon: '🔫',
    fireRate: 4, magazineSize: 6, reserveAmmo: 24, reloadTime: 2.25,
    accuracy: { still: 0.02, crouch: 0.01, walk: 0.1, run: 0.2, air: 0.4 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 300, head: 159, body: 55, leg: 46 },
        { maxDist: Infinity, head: 145, body: 50, leg: 42 }
      ]
    },
    wallbang: 0.45, pellets: 1, auto: false
  },

  // ── 기관단총류 (SMGs) ─────────────────────────────────────
  stinger: {
    id: 'stinger', name: '스티어', type: 'smg', cost: 1100, speed: 0.85, icon: '🔫',
    fireRate: 16, magazineSize: 20, reserveAmmo: 60, reloadTime: 2.25,
    accuracy: { still: 0.04, crouch: 0.03, walk: 0.1, run: 0.2, air: 0.4 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 200, head: 67, body: 27, leg: 22 },
        { maxDist: Infinity, head: 62, body: 25, leg: 21 }
      ]
    },
    wallbang: 0.2, pellets: 1, auto: true
  },
  spectre: {
    id: 'spectre', name: '스펙터', type: 'smg', cost: 1600, speed: 0.85, icon: '🔫',
    fireRate: 13.33, magazineSize: 30, reserveAmmo: 90, reloadTime: 2.25,
    accuracy: { still: 0.035, crouch: 0.025, walk: 0.09, run: 0.18, air: 0.4 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 150, head: 78, body: 26, leg: 22 },
        { maxDist: 300, head: 66, body: 22, leg: 18 },
        { maxDist: Infinity, head: 60, body: 20, leg: 17 }
      ]
    },
    wallbang: 0.2, pellets: 1, auto: true, silenced: true
  },

  // ── 산탄총류 (Shotguns) ────────────────────────────────────
  bucky: {
    id: 'bucky', name: '버키', type: 'shotgun', cost: 850, speed: 0.8, icon: '🔫',
    fireRate: 1.1, magazineSize: 5, reserveAmmo: 15, reloadTime: 2.5,
    accuracy: { still: 0.08, crouch: 0.06, walk: 0.14, run: 0.25, air: 0.45 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 80,  head: 40, body: 20, leg: 17 },
        { maxDist: 120, head: 26, body: 13, leg: 11 },
        { maxDist: Infinity, head: 18, body: 9, leg: 7 }
      ]
    },
    wallbang: 0.1, pellets: 15, spread: 0.12, auto: false
  },
  judge: {
    id: 'judge', name: '저지', type: 'shotgun', cost: 1850, speed: 0.8, icon: '🔫',
    fireRate: 3.5, magazineSize: 7, reserveAmmo: 21, reloadTime: 2.2,
    accuracy: { still: 0.1, crouch: 0.08, walk: 0.18, run: 0.3, air: 0.5 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 100, head: 34, body: 17, leg: 14 },
        { maxDist: 150, head: 20, body: 10, leg: 8 },
        { maxDist: Infinity, head: 14, body: 7, leg: 5 }
      ]
    },
    wallbang: 0.2, pellets: 12, spread: 0.15, auto: true
  },

  // ── 소총류 (Rifles) ──────────────────────────────────────
  bulldog: {
    id: 'bulldog', name: '불독', type: 'rifle', cost: 2050, speed: 0.8, icon: '🔫',
    fireRate: 9.15, magazineSize: 24, reserveAmmo: 72, reloadTime: 2.5,
    accuracy: { still: 0.02, crouch: 0.015, walk: 0.08, run: 0.16, air: 0.4 },
    damage: { head: 115, body: 35, leg: 29, falloff: false },
    wallbang: 0.35, pellets: 1, auto: true
  },
  guardian: {
    id: 'guardian', name: '가디언', type: 'rifle', cost: 2250, speed: 0.8, icon: '🔫',
    fireRate: 5.25, magazineSize: 12, reserveAmmo: 36, reloadTime: 2.5,
    accuracy: { still: 0.01, crouch: 0.005, walk: 0.06, run: 0.12, air: 0.3 },
    damage: { head: 195, body: 65, leg: 54, falloff: false },
    wallbang: 0.65, pellets: 1, auto: false
  },
  phantom: {
    id: 'phantom', name: '팬텀', type: 'rifle', cost: 2900, speed: 0.8, icon: '🔫',
    fireRate: 11, magazineSize: 30, reserveAmmo: 90, reloadTime: 2.5,
    accuracy: { still: 0.012, crouch: 0.008, walk: 0.05, run: 0.1, air: 0.25 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 150, head: 156, body: 39, leg: 33 },
        { maxDist: 300, head: 140, body: 35, leg: 29 },
        { maxDist: Infinity, head: 124, body: 31, leg: 26 }
      ]
    },
    wallbang: 0.35, pellets: 1, auto: true, silenced: true
  },
  vandal: {
    id: 'vandal', name: '밴달', type: 'rifle', cost: 2900, speed: 0.8, icon: '🔫',
    fireRate: 9.75, magazineSize: 25, reserveAmmo: 75, reloadTime: 2.5,
    accuracy: { still: 0.015, crouch: 0.01, walk: 0.06, run: 0.12, air: 0.3 },
    damage: { head: 160, body: 40, leg: 34, falloff: false },
    wallbang: 0.35, pellets: 1, auto: true
  },

  // ── 저격소총류 (Snipers) ────────────────────────────────────
  marshal: {
    id: 'marshal', name: '마샬', type: 'sniper', cost: 950, speed: 0.8, icon: '🎯',
    fireRate: 1.5, magazineSize: 5, reserveAmmo: 15, reloadTime: 2.5,
    accuracy: { still: 0.01, crouch: 0.005, walk: 0.4, run: 0.8, air: 1.2 },
    damage: { head: 202, body: 101, leg: 85, falloff: false },
    wallbang: 0.35, pellets: 1, auto: false, hasScope: true
  },
  outlaw: {
    id: 'outlaw', name: '아웃로', type: 'sniper', cost: 2400, speed: 0.8, icon: '🎯',
    fireRate: 2.75, magazineSize: 2, reserveAmmo: 10, reloadTime: 2.5,
    accuracy: { still: 0.005, crouch: 0.002, walk: 0.5, run: 1.0, air: 1.5 },
    damage: { head: 238, body: 140, leg: 119, falloff: false },
    wallbang: 0.45, pellets: 1, auto: false, hasScope: true
  },
  operator: {
    id: 'operator', name: '오퍼레이터', type: 'sniper', cost: 4700, speed: 0.76, icon: '🎯',
    fireRate: 0.75, magazineSize: 5, reserveAmmo: 10, reloadTime: 3.7,
    accuracy: { still: 0.003, crouch: 0.002, walk: 0.8, run: 1.5, air: 2.0 },
    scopedAccuracy: 0.0001,
    damage: { head: 255, body: 150, leg: 120, falloff: false },
    wallbang: 0.85, pellets: 1, auto: false, hasScope: true, zoomFactor: 2.5
  },

  // ── 중화기류 (Heavy) ──────────────────────────────────────
  ares: {
    id: 'ares', name: '아레스', type: 'heavy', cost: 1600, speed: 0.76, icon: '🔫',
    fireRate: 13, magazineSize: 50, reserveAmmo: 100, reloadTime: 3.25,
    accuracy: { still: 0.03, crouch: 0.02, walk: 0.12, run: 0.24, air: 0.5 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 300, head: 72, body: 30, leg: 25 },
        { maxDist: Infinity, head: 67, body: 28, leg: 23 }
      ]
    },
    wallbang: 0.35, pellets: 1, auto: true
  },
  odin: {
    id: 'odin', name: '오딘', type: 'heavy', cost: 3200, speed: 0.76, icon: '🔫',
    fireRate: 15, magazineSize: 100, reserveAmmo: 200, reloadTime: 5.0,
    accuracy: { still: 0.04, crouch: 0.03, walk: 0.15, run: 0.3, air: 0.6 },
    damage: {
      falloff: true,
      ranges: [
        { maxDist: 300, head: 95, body: 38, leg: 32 },
        { maxDist: Infinity, head: 77, body: 31, leg: 26 }
      ]
    },
    wallbang: 0.65, pellets: 1, auto: true
  },

  // ── 근접 무기 ──────────────────────────────────────────────
  knife: {
    id: 'knife', name: '근접무기', type: 'melee', cost: 0, speed: 1.0, icon: '🔪',
    fireRate: 2, range: 80,
    damage: {
      primary: { body: 50, back: 100 },
      alt:     { body: 75, back: 150 },
      falloff: false
    },
    auto: false
  }
};

// 무기 구매 가능 목록 (상점용)
const SHOP_WEAPONS = {
  pistol:  ['classic', 'shorty', 'frenzy', 'ghost', 'sheriff'],
  smg:     ['stinger', 'spectre'],
  shotgun: ['bucky', 'judge'],
  rifle:   ['bulldog', 'guardian', 'phantom', 'vandal'],
  sniper:  ['marshal', 'outlaw', 'operator'],
  heavy:   ['ares', 'odin']
};

// 방어구
const ARMOR_DATA = {
  light: { id:'lightArmor', name:'라이트 쉴드', cost: 400,  hp: 50 },
  heavy: { id:'heavyArmor', name:'헤비 쉴드',  cost: 1000, hp: 100 },
};
