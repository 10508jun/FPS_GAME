// ============================================================
//  RangeMapManager.js — 사격장 맵 및 훈련 커스텀 시스템
// ============================================================
class RangeMapManager {
  static PRESETS = {
    standard: {
      id: 'standard',
      name: '🎯 클래식 사격장',
      desc: '넓은 사격 전용 야외 연습장. 전방 마네킹 타겟 사격.',
      icon: '🎯'
    },
    alley: {
      id: 'alley',
      name: '📏 롱 라이플 사격장',
      desc: '1200px 좁고 긴 복도. 원거리 정밀 헤드샷 & 스나이퍼 사격.',
      icon: '📏'
    },
    arena360: {
      id: 'arena360',
      name: '🔄 360° 원형 훈련장',
      desc: '사방 360도 위치에서 마네킹 배치. 빠른 에임 반응 속도 훈련.',
      icon: '🔄'
    },
    cover_maze: {
      id: 'cover_maze',
      name: '🧱 엄폐 & 피킹 미로',
      desc: '다수의 벽과 상자가 설치된 모의 맵. 엿보기(Peek) & 예샷 훈련.',
      icon: '🧱'
    },
    custom: {
      id: 'custom',
      name: '🛠️ 사용자 정의 맵',
      desc: '봇 수, 무빙, 아머, 장애물 밀도, 사격 거리를 자유롭게 조절.',
      icon: '🛠️'
    }
  };

  static DEFAULT_SETTINGS = {
    preset: 'standard',
    botCount: 4,
    botMove: 'static',      // 'static' | 'strafe' | 'random'
    botArmor: 'none',        // 'none' | 'light' | 'heavy' | 'headonly'
    obstacleDensity: 'medium', // 'none' | 'low' | 'medium' | 'high'
    targetDistance: 'medium',  // 'near' | 'medium' | 'far' | 'mixed'
    infiniteAmmo: true,
  };

  constructor() {
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('forge_range_settings');
      if (saved) {
        return Object.assign({}, RangeMapManager.DEFAULT_SETTINGS, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Range settings load failed, using defaults', e);
    }
    return Object.assign({}, RangeMapManager.DEFAULT_SETTINGS);
  }

  saveSettings(newSettings) {
    this.settings = Object.assign({}, this.settings, newSettings);
    try {
      localStorage.setItem('forge_range_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Range settings save failed', e);
    }
  }

  /**
   * 설정에 맞는 사격장 MAP_DATA 동적 생성
   */
  generateMapData(customSettings = null) {
    const s = customSettings || this.settings;
    const preset = s.preset || 'standard';

    let mapData = {
      name: `사격장 [${RangeMapManager.PRESETS[preset]?.name || preset}]`,
      worldW: 2000,
      worldH: 2000,
      floors: [],
      walls: [],
      spawns: {
        attacker: [{ x: 1000, y: 1500 }],
        defender: []
      },
      sites: {},
      buyZones: {
        attacker: { x: 800, y: 1300, w: 400, h: 400 },
        defender: { x: 0, y: 0, w: 0, h: 0 }
      },
      wallThickness: MAP_DATA.wallThickness
    };

    switch (preset) {
      case 'alley':
        this._buildAlleyMap(mapData, s);
        break;
      case 'arena360':
        this._buildArena360Map(mapData, s);
        break;
      case 'cover_maze':
        this._buildCoverMazeMap(mapData, s);
        break;
      case 'custom':
        this._buildCustomMap(mapData, s);
        break;
      case 'standard':
      default:
        this._buildStandardMap(mapData, s);
        break;
    }

    return mapData;
  }

  // 1. 클래식 사격장
  _buildStandardMap(map, s) {
    map.worldW = 2000; map.worldH = 2000;
    // 바닥
    map.floors.push({ x: 400, y: 400, w: 1200, h: 1200, type: 'site_a', color: '#111f14', label: 'RANGE MAIN' });
    // 외곽 벽
    map.walls.push(
      { x: 370, y: 370, w: 1260, h: 30, solid: true },
      { x: 370, y: 1570, w: 1260, h: 30, solid: true },
      { x: 370, y: 370, w: 30, h: 1230, solid: true },
      { x: 1600, y: 370, w: 30, h: 1230, solid: true }
    );
    // 엄폐물
    if (s.obstacleDensity !== 'none') {
      map.walls.push(
        { x: 700, y: 900, w: 80, h: 80, solid: true, type: 'cover' },
        { x: 1220, y: 900, w: 80, h: 80, solid: true, type: 'cover' }
      );
    }
    // 플레이어 스폰
    map.spawns.attacker = [{ x: 1000, y: 1400 }];
    // 봇 스폰
    map.spawns.defender = this._calcBotPositions(1000, 1400, s);
  }

  // 2. 롱 사격장
  _buildAlleyMap(map, s) {
    map.worldW = 2000; map.worldH = 2400;
    map.floors.push({ x: 700, y: 300, w: 600, h: 1700, type: 'corridor', color: '#111827', label: 'LONG ALLEY' });
    map.walls.push(
      { x: 670, y: 270, w: 660, h: 30, solid: true },
      { x: 670, y: 1970, w: 660, h: 30, solid: true },
      { x: 670, y: 270, w: 30, h: 1730, solid: true },
      { x: 1300, y: 270, w: 30, h: 1730, solid: true }
    );
    // 엄폐물
    if (s.obstacleDensity === 'medium' || s.obstacleDensity === 'high') {
      map.walls.push(
        { x: 750, y: 1100, w: 100, h: 50, solid: true, type: 'cover' },
        { x: 1150, y: 800, w: 100, h: 50, solid: true, type: 'cover' }
      );
    }
    map.spawns.attacker = [{ x: 1000, y: 1800 }];
    map.spawns.defender = this._calcBotPositions(1000, 1800, s, 'alley');
  }

  // 3. 360도 원형 훈련장
  _buildArena360Map(map, s) {
    map.worldW = 2000; map.worldH = 2000;
    map.floors.push({ x: 400, y: 400, w: 1200, h: 1200, type: 'mid', color: '#101722', label: '360° ARENA' });
    map.walls.push(
      { x: 370, y: 370, w: 1260, h: 30, solid: true },
      { x: 370, y: 1570, w: 1260, h: 30, solid: true },
      { x: 370, y: 370, w: 30, h: 1230, solid: true },
      { x: 1600, y: 370, w: 30, h: 1230, solid: true }
    );
    // 중앙 기둥 4개
    if (s.obstacleDensity !== 'none') {
      map.walls.push(
        { x: 750, y: 750, w: 70, h: 70, solid: true, type: 'cover' },
        { x: 1180, y: 750, w: 70, h: 70, solid: true, type: 'cover' },
        { x: 750, y: 1180, w: 70, h: 70, solid: true, type: 'cover' },
        { x: 1180, y: 1180, w: 70, h: 70, solid: true, type: 'cover' }
      );
    }
    map.spawns.attacker = [{ x: 1000, y: 1000 }];
    map.spawns.defender = this._calcBotPositions(1000, 1000, s, 'circle');
  }

  // 4. 피킹 미로 훈련장
  _buildCoverMazeMap(map, s) {
    map.worldW = 2000; map.worldH = 2000;
    map.floors.push({ x: 400, y: 400, w: 1200, h: 1200, type: 'site_c', color: '#1f1111', label: 'PEEK MAZE' });
    map.walls.push(
      { x: 370, y: 370, w: 1260, h: 30, solid: true },
      { x: 370, y: 1570, w: 1260, h: 30, solid: true },
      { x: 370, y: 370, w: 30, h: 1230, solid: true },
      { x: 1600, y: 370, w: 30, h: 1230, solid: true }
    );
    // 복잡한 L자 벽 & 상자들
    map.walls.push(
      { x: 600, y: 700, w: 250, h: 40, solid: true },
      { x: 1150, y: 700, w: 250, h: 40, solid: true },
      { x: 850, y: 950, w: 300, h: 40, solid: true },
      { x: 700, y: 1150, w: 90, h: 90, solid: true, type: 'cover' },
      { x: 1200, y: 1150, w: 90, h: 90, solid: true, type: 'cover' }
    );
    map.spawns.attacker = [{ x: 1000, y: 1450 }];
    map.spawns.defender = this._calcBotPositions(1000, 1450, s, 'scatter');
  }

  // 5. 커스텀 사용자 정의
  _buildCustomMap(map, s) {
    this._buildStandardMap(map, s);
  }

  // 봇 위치 계산
  _calcBotPositions(px, py, s, pattern = 'grid') {
    const count = parseInt(s.botCount) || 4;
    const posList = [];

    let dist = 500;
    if (s.targetDistance === 'near') dist = 300;
    else if (s.targetDistance === 'far') dist = 800;

    if (pattern === 'circle') {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        posList.push({
          x: px + Math.cos(angle) * dist,
          y: py + Math.sin(angle) * dist
        });
      }
    } else if (pattern === 'alley') {
      for (let i = 0; i < count; i++) {
        const step = (i / count) * (dist * 1.2) + 400;
        posList.push({
          x: px + (i % 2 === 0 ? -120 : 120),
          y: py - step
        });
      }
    } else if (pattern === 'scatter') {
      const offsets = [
        { x: -300, y: -450 }, { x: 300, y: -450 },
        { x: -150, y: -650 }, { x: 150, y: -650 },
        { x: -400, y: -250 }, { x: 400, y: -250 },
        { x: 0, y: -750 }, { x: -200, y: -500 }
      ];
      for (let i = 0; i < count; i++) {
        const off = offsets[i % offsets.length];
        posList.push({ x: px + off.x, y: py + off.y });
      }
    } else {
      // grid / default
      const startX = px - ((count - 1) * 70);
      const targetY = py - dist;
      for (let i = 0; i < count; i++) {
        posList.push({
          x: startX + i * 140,
          y: targetY + (i % 2 === 0 ? 0 : -40)
        });
      }
    }
    return posList;
  }
}

// 전역 인스턴스
if (typeof window !== 'undefined') {
  window.RangeMapManager = RangeMapManager;
}
