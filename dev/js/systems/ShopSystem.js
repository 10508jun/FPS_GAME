// ============================================================
//  ShopSystem.js — 로테이션 스킨 상점 (24h 갱신)
// ============================================================

// ── 스킨 데이터 정의 ─────────────────────────────────────
const SKIN_CATALOG = [
  // Premium (특수 이펙트)
  { id:'prime_vandal',   weapon:'vandal',  name:'프라임 밴달',     rarity:'premium', cost:1775, icon:'⚡', color:'#f5a623', desc:'번개 이펙트 & 충전음' },
  { id:'reaver_vandal',  weapon:'vandal',  name:'리버 밴달',       rarity:'premium', cost:1775, icon:'💀', color:'#9b59b6', desc:'어둠의 기운 이펙트' },
  { id:'rgx_vandal',     weapon:'vandal',  name:'RGX 밴달',        rarity:'premium', cost:2175, icon:'🤖', color:'#00d4ff', desc:'전자 애니메이션 스킨' },
  { id:'oni_phantom',    weapon:'phantom', name:'오니 팬텀',        rarity:'premium', cost:1775, icon:'👹', color:'#ff4655', desc:'도깨비 불꽃 이펙트' },
  { id:'prime_phantom',  weapon:'phantom', name:'프라임 팬텀',      rarity:'premium', cost:1775, icon:'⚡', color:'#f5a623', desc:'번개 & 충전 이펙트' },
  { id:'spectrum_phantom',weapon:'phantom',name:'스펙트럼 팬텀',    rarity:'premium', cost:2675, icon:'🌈', color:'#00ff88', desc:'실시간 색상 변경' },
  { id:'ion_phantom',    weapon:'phantom', name:'이온 팬텀',        rarity:'premium', cost:1775, icon:'🔵', color:'#00d4ff', desc:'전기 충격 사운드' },
  { id:'elderflame_oper',weapon:'operator',name:'엘더플레임 오페라',rarity:'premium', cost:2475, icon:'🐉', color:'#ff6600', desc:'용 불꽃 애니메이션' },
  { id:'reaver_oper',    weapon:'operator',name:'리버 오퍼레이터', rarity:'premium', cost:1775, icon:'💀', color:'#9b59b6', desc:'영혼 흡수 이펙트' },
  { id:'forsaken_vandal',weapon:'vandal',  name:'포세이큰 밴달',    rarity:'premium', cost:1775, icon:'🌿', color:'#52b788', desc:'자연 성장 이펙트' },

  // Standard
  { id:'surge_vandal',   weapon:'vandal',  name:'서지 밴달',        rarity:'standard', cost:875,  icon:'🔫', color:'#e74c3c', desc:'기본 스킨' },
  { id:'surge_phantom',  weapon:'phantom', name:'서지 팬텀',         rarity:'standard', cost:875,  icon:'🔫', color:'#9b59b6', desc:'기본 스킨' },
  { id:'striker_ghost',  weapon:'ghost',   name:'스트라이커 고스트', rarity:'standard', cost:475,  icon:'🔫', color:'#95a5a6', desc:'기본 스킨' },
  { id:'tactic_bucky',   weapon:'bucky',   name:'택틱 버키',         rarity:'standard', cost:475,  icon:'🔫', color:'#e67e22', desc:'기본 스킨' },
  { id:'prime_ghost',    weapon:'ghost',   name:'프라임 고스트',     rarity:'premium',  cost:1275, icon:'⚡', color:'#f5a623', desc:'프라임 컬렉션' },
];

// ── 스킨 상점 시스템 ─────────────────────────────────────
class ShopSystem {
  constructor() {
    this.catalog  = SKIN_CATALOG;

    // 로테이션: 매일 갱신 (localStorage로 시드 유지)
    this.rotation = [];
    this._loadOrGenRotation();

    // 소유한 스킨
    this.owned = JSON.parse(localStorage.getItem('owned_skins') || '[]');

    // VP (유료) 잔액
    this.vp = parseInt(localStorage.getItem('vp') || '1000');
  }

  // ── 로테이션 생성 / 불러오기 ─────────────────────────────
  _loadOrGenRotation() {
    const stored = localStorage.getItem('shop_rotation');
    const now    = Date.now();

    if (stored) {
      const { items, generatedAt } = JSON.parse(stored);
      // 24시간 이내면 유지
      if (now - generatedAt < 24 * 60 * 60 * 1000) {
        this.rotation = items;
        this.rotationExpiry = generatedAt + 24 * 60 * 60 * 1000;
        return;
      }
    }

    this._generateRotation(now);
  }

  _generateRotation(now) {
    // 하루 날짜를 시드로 4개 랜덤 선택
    const seed    = Math.floor(now / (24 * 60 * 60 * 1000));
    const shuffled = this._seededShuffle([...this.catalog], seed);
    this.rotation = shuffled.slice(0, 4);
    this.rotationExpiry = (Math.floor(now / (24 * 60 * 60 * 1000)) + 1) * 24 * 60 * 60 * 1000;

    localStorage.setItem('shop_rotation', JSON.stringify({
      items: this.rotation,
      generatedAt: now,
    }));
  }

  // Seeded shuffle (Mulberry32 PRNG)
  _seededShuffle(arr, seed) {
    let s = seed;
    const rand = () => {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ── 다음 갱신까지 남은 시간 ──────────────────────────────
  getTimeUntilRefresh() {
    const ms  = Math.max(0, this.rotationExpiry - Date.now());
    const h   = Math.floor(ms / 3600000);
    const m   = Math.floor((ms % 3600000) / 60000);
    const s   = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  // ── 스킨 구매 ────────────────────────────────────────────
  buySkin(skinId) {
    const skin = this.catalog.find(s => s.id === skinId);
    if (!skin) return { ok: false, reason: '스킨을 찾을 수 없습니다.' };
    if (this.owned.includes(skinId)) return { ok: false, reason: '이미 소유한 스킨입니다.' };
    if (this.vp < skin.cost) return { ok: false, reason: 'VP가 부족합니다.' };

    this.vp -= skin.cost;
    this.owned.push(skinId);
    localStorage.setItem('owned_skins', JSON.stringify(this.owned));
    localStorage.setItem('vp', this.vp.toString());

    return { ok: true, skin };
  }

  // ── VP 충전 (결제 프로토타입) ─────────────────────────────
  chargeVP(amount) {
    this.vp += amount;
    localStorage.setItem('vp', this.vp.toString());
    return this.vp;
  }

  // ── 스킨이 프리미엄인지 확인 ─────────────────────────────
  isPremium(skinId) {
    const s = this.catalog.find(s => s.id === skinId);
    return s && s.rarity === 'premium';
  }

  // ── 소유 여부 ────────────────────────────────────────────
  isOwned(skinId) { return this.owned.includes(skinId); }

  // ── 프리미엄 이펙트 적용 여부 (무기 렌더링용) ──────────────
  getActiveSkin(weaponId) {
    return this.owned.find(id => {
      const s = this.catalog.find(c => c.id === id);
      return s && s.weapon === weaponId;
    }) || null;
  }

  // ── VP 결제 패키지 (UI용) ────────────────────────────────
  static get VP_PACKAGES() {
    return [
      { vp: 475,  bonus: 0,   price: 4990 },
      { vp: 1000, bonus: 50,  price: 9900 },
      { vp: 2050, bonus: 150, price: 19800},
      { vp: 4175, bonus: 325, price: 39600},
    ];
  }
}
