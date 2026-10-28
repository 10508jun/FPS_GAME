// ============================================================
//  WallbangSystem.js — 벽 관통 대미지 계산
// ============================================================
class WallbangSystem {
  constructor(mapWalls) {
    this.walls = mapWalls; // MAP_DATA.walls 배열
  }

  /**
   * 레이(시작→끝)가 통과하는 벽 목록 및 피어싱 대미지 배율 계산
   * @param {number} sx,sy  발사 시작점
   * @param {number} ex,ey  끝점
   * @param {number} weaponWallbangFactor  무기의 벽관통 계수 (0~1)
   * @returns {{ pierced: boolean, dmgMultiplier: number, walls: Array }}
   */
  calculate(sx, sy, ex, ey, weaponWallbangFactor) {
    const pierced = [];
    const dx = ex - sx, dy = ey - sy;

    for (const wall of this.walls) {
      if (!wall.solid) continue;

      // AABB vs 선분 교차 검사
      const hits = this._lineAABB(sx, sy, ex, ey, wall);
      if (hits.length >= 2) {
        // 벽 내부를 통과하는 거리 계산
        const t1 = hits[0], t2 = hits[1];
        const thickness = Math.hypot(
          (t2 - t1) * dx,
          (t2 - t1) * dy,
        );
        // 두께에 따라 타입 결정
        const type = thickness < 40 ? 'thin' : thickness < 80 ? 'normal' : 'thick';
        pierced.push({ wall, type, thickness });
      }
    }

    if (pierced.length === 0) return { pierced: false, dmgMultiplier: 1, walls: [] };

    // 대미지 배율 계산: 무기 wallbang 계수 × 벽 타입 계수
    let mult = 1;
    for (const p of pierced) {
      const retain = MAP_DATA.wallThickness[p.type].damageRetain;
      mult *= weaponWallbangFactor * retain;
    }

    return { pierced: true, dmgMultiplier: Math.max(0, mult), walls: pierced };
  }

  /**
   * 선분 vs AABB 교차: t 매개변수 목록 반환
   * t=0 → 시작점, t=1 → 끝점
   */
  _lineAABB(sx, sy, ex, ey, rect) {
    const dx = ex - sx, dy = ey - sy;
    const ts = [];

    // 4개 경계선과 교차
    const tests = [
      { axis: 'x', val: rect.x            },
      { axis: 'x', val: rect.x + rect.w   },
      { axis: 'y', val: rect.y            },
      { axis: 'y', val: rect.y + (rect.h || rect.height || 30) },
    ];

    for (const t of tests) {
      let tVal;
      if (t.axis === 'x') {
        if (Math.abs(dx) < 0.0001) continue;
        tVal = (t.val - sx) / dx;
      } else {
        if (Math.abs(dy) < 0.0001) continue;
        tVal = (t.val - sy) / dy;
      }
      if (tVal < 0 || tVal > 1) continue;

      const ix = sx + tVal * dx;
      const iy = sy + tVal * dy;
      const rh = rect.h || rect.height || 30;

      // 교차점이 사각형 경계 안에 있는지 확인
      const inX = ix >= rect.x - 0.5 && ix <= rect.x + rect.w + 0.5;
      const inY = iy >= rect.y - 0.5 && iy <= rect.y + rh     + 0.5;
      if (inX && inY) ts.push(tVal);
    }

    return ts.sort((a, b) => a - b);
  }

  /**
   * 주어진 두 점 사이에 시야를 막는 벽이 있는지 (LOS 체크)
   */
  hasLineOfSight(sx, sy, ex, ey) {
    for (const wall of this.walls) {
      if (!wall.solid) continue;
      const hits = this._lineAABB(sx, sy, ex, ey, wall);
      if (hits.length >= 2) return false;
    }
    return true;
  }

  /**
   * 레이가 처음 충돌하는 벽의 교차점 반환
   * @returns {{ x, y, wall } | null}
   */
  firstHit(sx, sy, ex, ey) {
    let minT = Infinity, hitWall = null;
    const dx = ex - sx, dy = ey - sy;

    for (const wall of this.walls) {
      if (!wall.solid) continue;
      const hits = this._lineAABB(sx, sy, ex, ey, wall);
      if (hits.length > 0 && hits[0] < minT) {
        minT = hits[0];
        hitWall = wall;
      }
    }

    if (hitWall && minT <= 1) {
      return {
        x: sx + minT * dx,
        y: sy + minT * dy,
        wall: hitWall,
        t: minT,
      };
    }
    return null;
  }
}
