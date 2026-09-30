// ============================================================
//  mapData.js — Haven 영감 탑다운 맵 (벽, 지역, 스폰)
//  좌표 단위: 월드 픽셀 (WORLD 2560×2560)
// ============================================================

// 색상 키는 CONFIG.C 기반
const MAP_DATA = {
  name: 'Forge',
  worldW: 2560,
  worldH: 2560,

  // ── 바닥 지역 (rect 기반 채우기) ──────────────────────────
  floors: [
    // 공격팀 스폰
    { x: 40,  y: 40,   w: 600, h: 300, type: 'spawn_atk', color: '#131e2c', label: 'ATK SPAWN' },

    // A 사이트로 가는 복도 (A Long)
    { x: 40,  y: 340,  w: 200, h: 480, type: 'corridor', color: '#111827', label: 'A LONG' },
    // A 사이트
    { x: 40,  y: 820,  w: 500, h: 500, type: 'site_a',   color: '#111f14', label: 'A SITE' },

    // 미드 복도 (Mid Mail)
    { x: 300, y: 340,  w: 900, h: 300, type: 'corridor', color: '#111827', label: 'MID MAIL' },
    // 미드 광장
    { x: 600, y: 600,  w: 400, h: 400, type: 'mid',      color: '#101722', label: 'MID' },

    // B 사이트로 가는 복도 (B Short)
    { x: 1000,y: 340,  w: 200, h: 680, type: 'corridor', color: '#111827', label: 'B SHORT' },
    // B 사이트
    { x: 750, y: 820,  w: 500, h: 500, type: 'site_b',   color: '#11111f', label: 'B SITE' },

    // C 사이트로 가는 복도 (Long C)
    { x: 1260,y: 40,   w: 200, h: 680, type: 'corridor', color: '#111827', label: 'C LONG' },
    // C 사이트
    { x: 1260,y: 720,  w: 500, h: 500, type: 'site_c',   color: '#1f1111', label: 'C SITE' },

    // 방어팀 스폰
    { x: 600, y: 1050, w: 700, h: 300, type: 'spawn_def', color: '#131e2c', label: 'DEF SPAWN' },

    // 헤이번 (윗 통로)
    { x: 40,  y: 40,   w: 1400, h: 60, type: 'corridor', color: '#111827', label: 'HEAVEN' },

    // 가라지
    { x: 1500,y: 260,  w: 300, h: 500, type: 'corridor', color: '#111827', label: 'GARAGE' },

    // 추가 연결 복도들
    { x: 240, y: 820,  w: 300, h: 80,  type: 'corridor', color: '#111827' },
    { x: 750, y: 1020, w: 300, h: 80,  type: 'corridor', color: '#111827' },
    { x: 1260,y: 1020, w: 300, h: 80,  type: 'corridor', color: '#111827' },
    { x: 540, y: 240,  w: 760, h: 160, type: 'corridor', color: '#111827' },
  ],

  // ── 벽 (충돌 오브젝트) x,y,w,h ───────────────────────────
  walls: [
    // ── 외곽 경계 ──
    { x: 0,    y: 0,    w: 2560, h: 30,   solid: true },
    { x: 0,    y: 2530, w: 2560, h: 30,   solid: true },
    { x: 0,    y: 0,    w: 30,   h: 2560, solid: true },
    { x: 2530, y: 0,    w: 30,   h: 2560, solid: true },

    // ── ATK 스폰 경계 ──
    { x: 640,  y: 40,   w: 30,   h: 320,  solid: true }, // 오른쪽 벽
    { x: 40,   y: 330,  w: 200,  h: 30,   solid: true }, // 아래
    { x: 280,  y: 330,  w: 320,  h: 30,   solid: true },

    // ── A 사이트 ──
    { x: 40,   y: 780,  w: 30,   h: 560,  solid: true }, // 왼쪽
    { x: 40,   y: 1310, w: 540,  h: 30,   solid: true }, // 아래
    { x: 540,  y: 810,  w: 30,   h: 530,  solid: true }, // 오른쪽
    { x: 240,  y: 800,  w: 30,   h: 50,   solid: true }, // 진입로 왼쪽
    // A 사이트 박스 오브젝트
    { x: 100,  y: 880,  w: 90,   h: 90,   solid: true, type:'cover' },
    { x: 380,  y: 1100, w: 90,   h: 90,   solid: true, type:'cover' },

    // ── 미드 ──
    { x: 240,  y: 330,  w: 30,   h: 310,  solid: true }, // A복도 왼쪽
    { x: 600,  y: 590,  w: 30,   h: 420,  solid: true }, // 미드 왼쪽
    { x: 600,  y: 990,  w: 100,  h: 30,   solid: true }, // 미드 하단
    { x: 1000, y: 590,  w: 30,   h: 420,  solid: true }, // 미드 오른쪽
    { x: 600,  y: 590,  w: 430,  h: 30,   solid: true }, // 미드 상단
    // 미드 커버
    { x: 720,  y: 750,  w: 90,   h: 60,   solid: true, type:'cover' },
    { x: 820,  y: 840,  w: 60,   h: 90,   solid: true, type:'cover' },

    // ── B 사이트 ──
    { x: 750,  y: 800,  w: 30,   h: 540,  solid: true }, // 왼쪽
    { x: 750,  y: 1310, w: 540,  h: 30,   solid: true }, // 아래
    { x: 1250, y: 800,  w: 30,   h: 540,  solid: true }, // 오른쪽
    // B 진입로 상단 벽
    { x: 1000, y: 330,  w: 30,   h: 490,  solid: true },
    // B 사이트 커버
    { x: 900,  y: 880,  w: 90,   h: 90,   solid: true, type:'cover' },
    { x: 1100, y: 1100, w: 90,   h: 90,   solid: true, type:'cover' },

    // ── C 사이트 ──
    { x: 1260, y: 700,  w: 30,   h: 640,  solid: true }, // 왼쪽
    { x: 1260, y: 1310, w: 540,  h: 30,   solid: true }, // 아래
    { x: 1760, y: 700,  w: 30,   h: 640,  solid: true }, // 오른쪽
    // C 상단 벽
    { x: 1260, y: 30,   w: 30,   h: 490,  solid: true },
    { x: 1260, y: 520,  w: 30,   h: 200,  solid: true },
    // C 사이트 커버
    { x: 1350, h: 90,   w: 90,   y: 780,  solid: true, type:'cover' },
    { x: 1580, y: 1050, w: 90,   h: 90,   solid: true, type:'cover' },

    // ── DEF 스폰 ──
    { x: 540,  y: 1040, w: 30,   h: 330,  solid: true },
    { x: 540,  y: 1340, w: 740,  h: 30,   solid: true },
    { x: 1250, y: 1040, w: 30,   h: 330,  solid: true },

    // ── 헤이번 상단 통로 ──
    { x: 40,   y: 100,  w: 1240, h: 30,   solid: true },

    // ── 가라지 ──
    { x: 1490, y: 240,  w: 30,   h: 540,  solid: true },
    { x: 1800, y: 240,  w: 30,   h: 540,  solid: true },
    { x: 1490, y: 240,  w: 340,  h: 30,   solid: true },
    { x: 1490, y: 760,  w: 340,  h: 30,   solid: true },
    // 가라지 커버
    { x: 1560, y: 400,  w: 90,   h: 90,   solid: true, type:'cover' },

    // ── 추가 복도 연결 벽 ──
    { x: 540,  y: 330,  w: 30,   h: 310,  solid: true },
    { x: 300,  y: 630,  w: 310,  h: 30,   solid: true },
  ],

  // ── 스폰 포인트 ───────────────────────────────────────────
  spawns: {
    attacker: [
      { x: 150, y: 150 }, { x: 250, y: 150 }, { x: 350, y: 150 },
      { x: 450, y: 150 }, { x: 150, y: 220 }, { x: 550, y: 150 },
    ],
    defender: [
      { x: 700, y: 1150 }, { x: 800, y: 1150 }, { x: 900, y: 1150 },
      { x: 1000,y: 1150 }, { x: 1100,y: 1150 }, { x: 1200,y: 1150 },
    ],
  },

  // ── 사이트 스파이크 플랜트 구역 ──────────────────────────
  sites: {
    A: { x: 80,   y: 860,  w: 420, h: 400, label: 'A' },
    B: { x: 790,  y: 860,  w: 400, h: 400, label: 'B' },
    C: { x: 1300, y: 760,  w: 400, h: 500, label: 'C' },
  },

  // ── 구매 구역 (스폰 안) ───────────────────────────────────
  buyZones: {
    attacker: { x: 40,  y: 40,   w: 600, h: 290 },
    defender: { x: 600, y: 1060, w: 660, h: 270 },
  },

  // ── 벽 두께 카테고리 (wallbang 계산용) ───────────────────
  wallThickness: {
    thin:   { label: '얇은 벽',   damageRetain: 0.75 },  // 75% 유지
    normal: { label: '일반 벽',   damageRetain: 0.50 },  // 50%
    thick:  { label: '두꺼운 벽', damageRetain: 0.25 },  // 25%
  },
};
