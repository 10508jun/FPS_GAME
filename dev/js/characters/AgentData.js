// ============================================================
//  AgentData.js — 에이전트 데이터 (국가별 모티브, 스킬 구조)
// ============================================================

/**
 * IAgent Interface (JavaScript 문서 목적)
 * {
 *   id         : string
 *   name       : string
 *   country    : string
 *   flag       : string (이모지)
 *   role       : 'Duelist' | 'Sentinel' | 'Initiator' | 'Controller'
 *   color      : string (hex)
 *   bgColor    : string (hex)
 *   description: string
 *   lore       : string
 *
 *   abilities: {
 *     c: AbilityDef,
 *     q: AbilityDef,
 *     e: AbilityDef,
 *   }
 *   ultimate: UltimateDef
 * }
 *
 * AbilityDef {
 *   key, name, cost, maxCharges, description, type, duration?, radius?, damage?
 * }
 *
 * UltimateDef {
 *   key:'X', name, pointsRequired, description, type
 * }
 */

const AGENT_DATA = {

  // ── 제트 (한국) — 듀얼리스트 ─────────────────────────────
  jett: {
    id: 'jett',
    name: '제트',
    nameEn: 'Jett',
    country: '대한민국',
    flag: '🇰🇷',
    role: 'Duelist',
    color: '#7ecef0',
    bgColor: '#0a2035',
    description: '바람을 조종하는 한국 출신 듀얼리스트',
    lore: '전설적인 검객이자 바람을 다루는 능력으로 전장을 누비는 한국 출신 요원.',
    portrait: '🌊',

    abilities: {
      c: {
        key: 'C', name: '클라우드버스트', cost: 200, maxCharges: 2,
        type: 'smoke',
        description: '작은 연기 구름을 투척합니다. 날아가는 동안 방향을 조준해 유도할 수 있습니다.',
        duration: 4.5, radius: 110, color: 'rgba(150,200,230,0.7)',
      },
      q: {
        key: 'Q', name: '업드래프트', cost: 200, maxCharges: 2,
        type: 'mobility',
        description: '잠시 후 위로 도약합니다.',
        duration: 0, radius: 0,
      },
      e: {
        key: 'E', name: '테일윈드', cost: 0, maxCharges: 1,
        type: 'dash',
        description: '잠깐 동안 전진 방향으로 빠르게 돌진합니다.',
        duration: 0.25, radius: 0, dashSpeed: 900, cooldown: 12,
      },
    },
    ultimate: {
      key: 'X', name: '블레이드 스톰', pointsRequired: 7,
      type: 'projectile',
      description: '정밀 단검을 5개 장착합니다. 좌클릭으로 단검 하나를 던지고, 우클릭으로 남은 단검을 모두 던집니다.',
      damage: { head: 150, body: 50, leg: 30 },
      bladeCount: 5, projectileSpeed: 1200,
    },
  },

  // ── 피닉스 (영국) — 듀얼리스트 ──────────────────────────
  phoenix: {
    id: 'phoenix',
    name: '피닉스',
    nameEn: 'Phoenix',
    country: '영국',
    flag: '🇬🇧',
    role: 'Duelist',
    color: '#f4a261',
    bgColor: '#2a1505',
    description: '불꽃을 다루는 영국 출신 듀얼리스트',
    lore: '자신의 힘으로 전장을 밝히는 영국 출신 요원. 불꽃이 그를 치유한다.',
    portrait: '🔥',

    abilities: {
      c: {
        key: 'C', name: '블레이즈', cost: 200, maxCharges: 1,
        type: 'wall',
        description: '불꽃 벽을 전방에 설치합니다. 벽은 시야를 차단하고 아군을 치유합니다.',
        duration: 8, width: 200, height: 30, healRate: 3,
        color: 'rgba(244,120,50,0.75)',
      },
      q: {
        key: 'Q', name: '커브볼', cost: 100, maxCharges: 2,
        type: 'flash',
        description: '전방으로 구부러지는 섬광탄을 던집니다.',
        duration: 1.1, radius: 260, color: 'rgba(255,255,200,0.95)',
      },
      e: {
        key: 'E', name: '핫 핸즈', cost: 0, maxCharges: 1,
        type: 'heal_zone',
        description: '화염구를 던집니다. 착탄 지점에 화염 구역을 생성해 적을 불태우고 아군을 치유합니다.',
        duration: 4, radius: 130, damage: 20, healRate: 15,
        color: 'rgba(255,100,30,0.5)', cooldown: 40,
      },
    },
    ultimate: {
      key: 'X', name: '런 잇 백', pointsRequired: 8,
      type: 'respawn',
      description: '현재 위치를 표시합니다. 발동 중 사망하면 표시된 위치에서 체력을 회복한 채 부활합니다.',
      duration: 12, healOnSpawn: 100,
    },
  },

  // ── 세이지 (중국) — 센티넬 ───────────────────────────────
  sage: {
    id: 'sage',
    name: '세이지',
    nameEn: 'Sage',
    country: '중국',
    flag: '🇨🇳',
    role: 'Sentinel',
    color: '#52b788',
    bgColor: '#051a10',
    description: '치유와 방벽을 다루는 중국 출신 센티넬',
    lore: '생명의 힘을 다루는 중국 출신 요원. 아군의 생존을 책임진다.',
    portrait: '💎',

    abilities: {
      c: {
        key: 'C', name: '슬로우 오브', cost: 200, maxCharges: 2,
        type: 'slow',
        description: '감속 구체를 투척합니다. 착탄 지점에 플레이어를 감속시키는 구역을 생성합니다.',
        duration: 3, radius: 120, slowFactor: 0.4,
        color: 'rgba(100,200,150,0.55)',
      },
      q: {
        key: 'Q', name: '배리어 오브', cost: 400, maxCharges: 1,
        type: 'barrier',
        description: '견고한 벽을 설치합니다. 벽은 400HP를 보유합니다.',
        duration: 40, wallHp: 400, width: 220, height: 30,
        color: 'rgba(100,255,180,0.85)',
      },
      e: {
        key: 'E', name: '힐링 오브', cost: 0, maxCharges: 1,
        type: 'heal',
        description: '자신 또는 겨냥한 아군을 치유합니다.',
        healRate: 60, duration: 5, cooldown: 45, range: 200,
        color: 'rgba(100,255,180,0.5)',
      },
    },
    ultimate: {
      key: 'X', name: '리저덱션', pointsRequired: 8,
      type: 'revive',
      description: '사망한 아군을 목표로 삼아 부활시킵니다.',
      range: 500,
    },
  },

  // ── 소바 (러시아) — 이니시에이터 ────────────────────────
  sova: {
    id: 'sova',
    name: '소바',
    nameEn: 'Sova',
    country: '러시아',
    flag: '🇷🇺',
    role: 'Initiator',
    color: '#457b9d',
    bgColor: '#050f1a',
    description: '정찰 능력의 러시아 출신 이니시에이터',
    lore: '숲에서 성장한 러시아 출신 요원. 독수리 올빼미 드론으로 전장을 지배한다.',
    portrait: '🦅',

    abilities: {
      c: {
        key: 'C', name: '쇼크 볼트', cost: 100, maxCharges: 2,
        type: 'damage_projectile',
        description: '전기 충격 화살을 발사합니다. 최대 2회 바운스하며 착탄 지점에 전기 충격파를 발생시킵니다.',
        damage: 90, radius: 130, bounces: 2, speed: 700,
        color: 'rgba(69,123,157,0.7)',
      },
      q: {
        key: 'Q', name: '리콘 볼트', cost: 200, maxCharges: 1,
        type: 'reveal',
        description: '정찰 화살을 발사합니다. 착탄 지점 주변의 적을 탐지해 팀에게 표시합니다.',
        duration: 1.5, radius: 380, speed: 650,
        color: 'rgba(69,123,157,0.6)',
      },
      e: {
        key: 'E', name: '아울 드론', cost: 0, maxCharges: 1,
        type: 'drone',
        description: '조종 가능한 드론을 발사합니다. 드론으로 적을 표시하거나 전기 충격으로 무력화할 수 있습니다.',
        duration: 10, speed: 350, cooldown: 40,
        color: 'rgba(69,123,157,0.8)',
      },
    },
    ultimate: {
      key: 'X', name: '헌터스 퓨리', pointsRequired: 8,
      type: 'beam',
      description: '에너지 빔을 3개 발사할 수 있습니다. 각 빔은 관통하며 적중한 적에게 80 대미지를 줍니다.',
      damage: 80, beamCount: 3, beamWidth: 30, range: 2000,
      color: 'rgba(69,123,200,0.9)',
    },
  },
};

// 역할 색상
const ROLE_COLORS = {
  Duelist:    '#ff6b6b',
  Sentinel:   '#4ecdc4',
  Initiator:  '#45b7d1',
  Controller: '#a8e6cf',
};
