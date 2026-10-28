// ============================================================
//  EconomySystem.js — 라운드 경제 시스템
// ============================================================
class EconomySystem {
  constructor() {
    this.credits      = CONFIG.STARTING_CREDITS;
    this.maxCredits   = CONFIG.MAX_CREDITS;
    this.lossStreak   = 0;   // 연패 보너스용
  }

  // ── 구매 ─────────────────────────────────────────────────
  canAfford(cost) { return this.credits >= cost; }

  buy(cost) {
    if (!this.canAfford(cost)) return false;
    this.credits -= cost;
    if (this.credits < 0) this.credits = 0;
    return true;
  }

  addCredits(amount) {
    this.credits = Math.min(this.maxCredits, this.credits + amount);
  }

  // ── 킬 보상 ──────────────────────────────────────────────
  onKill(weaponId) {
    let bonus = CONFIG.KILL_REWARD;
    // 무기별 킬 보상 차등
    const bonuses = {
      knife:    800,
      operator: 100,  // 오퍼레이터 킬 보상 낮음
      bucky:    100,
      ghost:    300,
      vandal:   300,
      phantom:  300,
    };
    bonus = bonuses[weaponId] ?? CONFIG.KILL_REWARD;
    this.addCredits(bonus);
    return bonus;
  }

  // ── 라운드 종료 보상 ─────────────────────────────────────
  /**
   * @param {boolean} won    이번 라운드 승리 여부
   * @param {number}  kills  이번 라운드 킬 수
   */
  onRoundEnd(won, kills = 0) {
    if (won) {
      this.addCredits(CONFIG.WIN_REWARD);
      this.lossStreak = 0;
    } else {
      // 연패 보너스 (최대 +500)
      const lossBonus = Math.min(CONFIG.LOSS_BASE_REWARD + this.lossStreak * 500, 2900);
      this.addCredits(lossBonus);
      this.lossStreak++;
    }

    // 스파이크 추가 보상 (식재: +300 / 해제: +300)
    // (GameManager에서 별도 호출)
  }

  onSpikeEvent(wasDefused = false) {
    this.addCredits(300);
  }

  // ── 라운드 시작 ──────────────────────────────────────────
  onRoundStart() {
    // 크레딧은 유지 (경쟁전), 신속 모드는 GameManager에서 처리
  }

  // 경쟁전 하프타임 크레딧 리셋
  onHalfTime() {
    this.credits    = CONFIG.STARTING_CREDITS;
    this.lossStreak = 0;
  }

  // 총 크레딧 표시 포맷
  formatted() {
    return this.credits.toLocaleString();
  }
}
