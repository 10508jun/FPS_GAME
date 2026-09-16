// ============================================================
//  main.js — 게임 진입점 & 초기화
// ============================================================
(function () {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  // 마우스 포인터 잠금 (선택적)
  // canvas.requestPointerLock();

  // GameManager 생성
  const gm = new GameManager(canvas);

  // 마우스 클릭 → GameManager 전달
  canvas.addEventListener('mousedown', e => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    gm.handleClick(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top)  * scaleY,
    );
    // 첫 클릭 시 AudioContext 재개 (브라우저 정책)
    if (gm.audio?.ctx?.state === 'suspended') {
      gm.audio.ctx.resume();
    }
  });

  // 게임 시작
  gm.start();

  // 로딩 화면 제거
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }
})();
