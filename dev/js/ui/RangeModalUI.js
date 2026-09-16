// ============================================================
//  RangeModalUI.js — 사격장 맵 및 훈련 커스터마이저 모달 UI
// ============================================================
class RangeModalUI {
  constructor(gameManager = null) {
    this.gm = gameManager;
    this.manager = new RangeMapManager();
    this.currentSettings = this.manager.loadSettings();
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this._injectModalHTML();
    this.syncUIFromSettings();
    this.initialized = true;
  }

  _injectModalHTML() {
    if (document.getElementById('range-settings-overlay')) return;

    const div = document.createElement('div');
    div.id = 'range-settings-overlay';
    div.style.display = 'none';
    div.innerHTML = `
      <div id="range-settings-panel">
        <div id="range-modal-header">
          <div id="range-modal-title">
            <span>🎯</span> 사격장 맵 & 훈련 커스터마이저
          </div>
          <button class="modal-close-btn" onclick="window.rangeModalUI.close()">×</button>
        </div>

        <div id="range-modal-body">
          <div class="range-section-title">🗺️ 맵 레이아웃 프리셋 선택</div>
          <div id="range-preset-grid">
            <div class="range-preset-card" data-preset="standard" onclick="window.rangeModalUI.selectPreset('standard')">
              <div class="preset-icon">🎯</div>
              <div class="preset-name">클래식 사격장</div>
              <div class="preset-desc">기본 야외 연습장 & 전방 타겟 마네킹</div>
            </div>
            <div class="range-preset-card" data-preset="alley" onclick="window.rangeModalUI.selectPreset('alley')">
              <div class="preset-icon">📏</div>
              <div class="preset-name">롱 복도 사격장</div>
              <div class="preset-desc">1200px 긴 복도. 원거리 정밀 사격</div>
            </div>
            <div class="range-preset-card" data-preset="arena360" onclick="window.rangeModalUI.selectPreset('arena360')">
              <div class="preset-icon">🔄</div>
              <div class="preset-name">360° 원형 아레나</div>
              <div class="preset-desc">사방 360도 반사 신경 훈련</div>
            </div>
            <div class="range-preset-card" data-preset="cover_maze" onclick="window.rangeModalUI.selectPreset('cover_maze')">
              <div class="preset-icon">🧱</div>
              <div class="preset-name">엄폐 & 피킹 미로</div>
              <div class="preset-desc">장애물 뒤 엿보기 & 예샷 훈련</div>
            </div>
          </div>

          <div class="range-section-title" style="margin-top:20px;">⚙️ 세부 훈련 세팅</div>
          <div id="range-options-grid">
            
            <div class="option-group">
              <label>🤖 마네킹/봇 수 (<span id="bot-count-val">4</span>개)</label>
              <input type="range" id="opt-bot-count" min="1" max="10" value="4" oninput="window.rangeModalUI.updateSliderVal(this.value)">
            </div>

            <div class="option-group">
              <label>🏃 봇 이동 방식</label>
              <div class="btn-group" id="opt-botMove">
                <button class="opt-btn" data-val="static" onclick="window.rangeModalUI.selectOpt('botMove', 'static')">고정 (Static)</button>
                <button class="opt-btn" data-val="strafe" onclick="window.rangeModalUI.selectOpt('botMove', 'strafe')">좌우 무빙</button>
                <button class="opt-btn" data-val="random" onclick="window.rangeModalUI.selectOpt('botMove', 'random')">무작위 이동</button>
              </div>
            </div>

            <div class="option-group">
              <label>🛡️ 봇 체력 및 방어구</label>
              <div class="btn-group" id="opt-botArmor">
                <button class="opt-btn" data-val="none" onclick="window.rangeModalUI.selectOpt('botArmor', 'none')">노아머 (HP 100)</button>
                <button class="opt-btn" data-val="heavy" onclick="window.rangeModalUI.selectOpt('botArmor', 'heavy')">중갑 (HP 150)</button>
                <button class="opt-btn" data-val="headonly" onclick="window.rangeModalUI.selectOpt('botArmor', 'headonly')">헤드 전용</button>
              </div>
            </div>

            <div class="option-group">
              <label>📦 장애물 / 엄폐물 밀도</label>
              <div class="btn-group" id="opt-obstacleDensity">
                <button class="opt-btn" data-val="none" onclick="window.rangeModalUI.selectOpt('obstacleDensity', 'none')">없음</button>
                <button class="opt-btn" data-val="medium" onclick="window.rangeModalUI.selectOpt('obstacleDensity', 'medium')">보통</button>
                <button class="opt-btn" data-val="high" onclick="window.rangeModalUI.selectOpt('obstacleDensity', 'high')">밀집</button>
              </div>
            </div>

            <div class="option-group">
              <label>🎯 봇 사격 거리</label>
              <div class="btn-group" id="opt-targetDistance">
                <button class="opt-btn" data-val="near" onclick="window.rangeModalUI.selectOpt('targetDistance', 'near')">근거리 (300px)</button>
                <button class="opt-btn" data-val="medium" onclick="window.rangeModalUI.selectOpt('targetDistance', 'medium')">중거리 (500px)</button>
                <button class="opt-btn" data-val="far" onclick="window.rangeModalUI.selectOpt('targetDistance', 'far')">원거리 (800px)</button>
              </div>
            </div>

            <div class="option-group">
              <label>♾️ 무한 탄창 (Infinite Ammo)</label>
              <div class="btn-group" id="opt-infiniteAmmo">
                <button class="opt-btn" data-val="true" onclick="window.rangeModalUI.selectOpt('infiniteAmmo', true)">무제한 ON ♾️</button>
                <button class="opt-btn" data-val="false" onclick="window.rangeModalUI.selectOpt('infiniteAmmo', false)">일반 탄약 OFF</button>
              </div>
            </div>

          </div>
        </div>

        <div id="range-modal-footer">
          <button class="btn-secondary" onclick="window.rangeModalUI.close()">취소</button>
          <button class="btn-primary" onclick="window.rangeModalUI.apply()">🚀 맵 & 설정 적용하기</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  }

  open() {
    this.init();
    this.currentSettings = this.manager.loadSettings();
    this.syncUIFromSettings();
    document.getElementById('range-settings-overlay').style.display = 'flex';
  }

  close() {
    const el = document.getElementById('range-settings-overlay');
    if (el) el.style.display = 'none';
  }

  selectPreset(presetKey) {
    this.currentSettings.preset = presetKey;
    document.querySelectorAll('.range-preset-card').forEach(card => {
      card.classList.toggle('active', card.dataset.preset === presetKey);
    });
  }

  updateSliderVal(val) {
    this.currentSettings.botCount = parseInt(val);
    document.getElementById('bot-count-val').textContent = val;
  }

  selectOpt(key, val) {
    this.currentSettings[key] = val;
    const group = document.getElementById(`opt-${key}`);
    if (group) {
      group.querySelectorAll('.opt-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === String(val));
      });
    }
  }

  syncUIFromSettings() {
    const s = this.currentSettings;
    this.selectPreset(s.preset || 'standard');
    
    const slider = document.getElementById('opt-bot-count');
    if (slider) {
      slider.value = s.botCount || 4;
      document.getElementById('bot-count-val').textContent = slider.value;
    }

    ['botMove', 'botArmor', 'obstacleDensity', 'targetDistance', 'infiniteAmmo'].forEach(k => {
      if (s[k] !== undefined) this.selectOpt(k, s[k]);
    });
  }

  apply() {
    this.manager.saveSettings(this.currentSettings);
    this.close();

    // 게임 내인 경우 라이브 맵 교체
    if (this.gm) {
      this.gm.reloadRangeMap(this.currentSettings);
    } else {
      // 메인 메뉴인 경우 바로 사격장으로 진입
      if (typeof startGame === 'function') {
        if (typeof selectMode === 'function') selectMode('range');
        startGame();
      } else {
        window.location.href = `game.html?agent=jett&mode=range`;
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.RangeModalUI = RangeModalUI;
}
