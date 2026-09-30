// ============================================================
//  InputHandler.js — 키보드 / 마우스 입력 통합 관리자
// ============================================================
class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;

    // 현재 프레임 상태
    this.keys   = {};        // 키 누름 상태
    this.mouse  = { x: 0, y: 0, worldX: 0, worldY: 0, left: false, right: false };

    // 단발 이벤트 큐 (업데이트 후 소비됨)
    this._justPressed  = new Set();
    this._justReleased = new Set();
    this._mouseClicks  = [];   // { button, x, y }

    // 카메라 오프셋 (월드 좌표 변환용)
    this.camX = 0;
    this.camY = 0;

    this._bind();
  }

  _bind() {
    // 키보드
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this._justPressed.add(e.code);
      this.keys[e.code] = true;
      // 기본 동작 차단 (스크롤 등)
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      this._justReleased.add(e.code);
    });

    // 마우스 이동
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width  / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x      = (e.clientX - rect.left) * scaleX;
      this.mouse.y      = (e.clientY - rect.top)  * scaleY;
      this.mouse.worldX = this.mouse.x + this.camX;
      this.mouse.worldY = this.mouse.y + this.camY;
    });

    // 마우스 버튼
    this.canvas.addEventListener('mousedown', e => {
      if (e.button === 0) this.mouse.left  = true;
      if (e.button === 2) this.mouse.right = true;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width  / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this._mouseClicks.push({
        button: e.button,
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top)  * scaleY,
      });
    });
    this.canvas.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.left  = false;
      if (e.button === 2) this.mouse.right = false;
    });

    // 우클릭 메뉴 방지
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // 포커스 잃을 때 모든 키 해제
    window.addEventListener('blur', () => {
      this.keys  = {};
      this.mouse.left  = false;
      this.mouse.right = false;
    });
  }

  /** 매 프레임 끝에 호출 — 단발 이벤트 소비 */
  flush() {
    this._justPressed.clear();
    this._justReleased.clear();
    this._mouseClicks = [];
  }

  /** 카메라 업데이트 */
  updateCamera(camX, camY) {
    this.camX = camX;
    this.camY = camY;
    this.mouse.worldX = this.mouse.x + camX;
    this.mouse.worldY = this.mouse.y + camY;
  }

  // ── 조회 헬퍼 ──────────────────────────────────────────────

  isDown(code)        { return !!this.keys[code]; }
  justPressed(code)   { return this._justPressed.has(code); }
  justReleased(code)  { return this._justReleased.has(code); }

  // 이동 방향 벡터 (정규화됨)
  getMovement() {
    let dx = 0, dy = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp'))    dy -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown'))  dy += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  dx -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) dx += 1;
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }
    return { dx, dy };
  }

  // 자세 / 소음 스탠스
  getStance() {
    if (this.isDown('ControlLeft') || this.isDown('ControlRight')) return 'crouch';
    if (this.isDown('ShiftLeft')   || this.isDown('ShiftRight'))   return 'walk';
    return 'run';
  }

  // 스캔한 마우스 클릭 목록 반환
  getClicks() { return [...this._mouseClicks]; }

  // 무기 숫자키 (1~5)
  getWeaponSwitch() {
    for (let i = 1; i <= 5; i++) {
      if (this.justPressed(`Digit${i}`)) return i;
    }
    return null;
  }

  // 스킬 키 (C, Q, E, X)
  getAbilityKey() {
    if (this.justPressed('KeyC')) return 'c';
    if (this.justPressed('KeyQ')) return 'q';
    if (this.justPressed('KeyE')) return 'e';
    if (this.justPressed('KeyX')) return 'x';
    return null;
  }
}
