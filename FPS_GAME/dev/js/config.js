// ============================================================
//  CONFIG.js — 전역 게임 상수
// ============================================================
const CONFIG = {
  // 캔버스 / 월드
  CANVAS_WIDTH:  1280,
  CANVAS_HEIGHT: 720,
  WORLD_WIDTH:   2560,
  WORLD_HEIGHT:  2560,
  TILE_SIZE:     32,

  // 플레이어 이동속도 (px/s)
  SPEED_RUN:    260,
  SPEED_WALK:   156,   // 60 %
  SPEED_CROUCH: 104,   // 40 %

  // 소음 범위 (월드 단위 반경)
  SOUND_RUN:    420,
  SOUND_WALK:   0,
  SOUND_CROUCH: 70,

  // 플레이어 스탯
  PLAYER_RADIUS: 13,
  PLAYER_HP:    100,
  ARMOR_LIGHT:   50,
  ARMOR_HEAVY:  100,

  // 미니맵
  MINIMAP_SIZE: 210,
  MINIMAP_PAD:   14,

  // 라운드 타이밍 (초)
  BUY_PHASE:     30,
  ROUND_TIME:   100,
  ROUND_END:      5,

  // 경제
  KILL_REWARD:       300,
  WIN_REWARD:       3000,
  LOSS_BASE_REWARD: 1900,
  STARTING_CREDITS:  800,
  MAX_CREDITS:      9000,

  // 신속 강제 무기 배열 (라운드 1~5)
  SPIKE_RUSH_WEAPONS: ['vandal','phantom','operator','bucky','ghost'],

  // 색상 팔레트
  C: {
    BG:           '#0b1220',
    WALL:         '#1c2b3a',
    WALL_EDGE:    '#2a3f56',
    FLOOR:        '#111b28',
    FLOOR_ALT:    '#0f1923',
    A_SITE:       '#1a2a1a',
    B_SITE:       '#1a1a2a',
    C_SITE:       '#2a1a1a',

    ALLY:         '#00d4ff',
    ALLY_GLOW:    'rgba(0,212,255,0.25)',
    ENEMY:        '#ff4655',
    ENEMY_GLOW:   'rgba(255,70,85,0.25)',
    NEUTRAL:      '#ecf0f1',

    MINIMAP_BG:   'rgba(8,15,28,0.92)',
    SOUND_WAVE:   'rgba(255,210,50,0.55)',
    ENEMY_LAST:   'rgba(255,70,85,0.7)',

    HP_BAR:       '#2ecc71',
    HP_LOW:       '#e74c3c',
    SHIELD_BAR:   '#3498db',
    AMMO:         '#f1c40f',

    RED:    '#ff4655',
    CYAN:   '#00d4ff',
    GOLD:   '#f5a623',
    GREEN:  '#2ecc71',
    PURPLE: '#9b59b6',
    WHITE:  '#ecf0f1',
    DIM:    '#768079',
  },

  // 폰트
  FONT_MAIN:  '"Rajdhani", "Inter", sans-serif',
  FONT_HUD:   '"Rajdhani", monospace',
};
