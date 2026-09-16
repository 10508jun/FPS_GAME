// ============================================================
//  RoundSystem.js — 라운드 진행 / 승리 조건 / 게임 모드 로직
// ============================================================
class RoundSystem {
  constructor(gameMode, economy, audio) {
    this.mode    = gameMode;  // 'standard' | 'competitive' | 'spikerush' | 'range'
    this.economy = economy;
    this.audio   = audio;

    // 점수
    this.scoreAtk = 0;
    this.scoreDef = 0;

    // 라운드 카운터
    this.currentRound    = 1;
    this.maxRoundsToWin  = this.mode === 'spikerush' ? 5 : 13;

    // 라운드 단계: 'buy' | 'round' | 'end' | 'gameover'
    this.phase      = 'buy';
    this.phaseTimer = CONFIG.BUY_PHASE;

    // 신속 모드 강제 무기
    this.spikeRushWeapon = null;
    if (this.mode === 'spikerush') {
      this._assignSpikeRushWeapon();
    }

    // 라운드 종료 결과
    this.lastRoundWinner = null;  // 'atk' | 'def'
    this.lastRoundReason = '';

    // 게임 오버 여부
    this.gameOver     = false;
    this.gameWinner   = null;

    // 이벤트 콜백
    this.onRoundStart = null;
    this.onRoundEnd   = null;
    this.onGameOver   = null;
    this.onBuyStart   = null;
  }

  // ── 신속 모드 무기 할당 ───────────────────────────────────
  _assignSpikeRushWeapon() {
    const idx = (this.currentRound - 1) % CONFIG.SPIKE_RUSH_WEAPONS.length;
    this.spikeRushWeapon = CONFIG.SPIKE_RUSH_WEAPONS[idx];
  }

  // ── 매 프레임 업데이트 ────────────────────────────────────
  update(dt, player, bots) {
    if (this.gameOver || this.mode === 'range') return;

    this.phaseTimer -= dt;

    switch (this.phase) {
      case 'buy':
        if (this.phaseTimer <= 0) this.startRoundPhase(player);
        break;

      case 'round':
        if (this.phaseTimer <= 0) {
          // 시간 종료 → 수비팀 승리
          this._endRound('def', '시간 초과', player);
          break;
        }
        // 승리 조건 체크
        this._checkWinConditions(player, bots);
        break;

      case 'end':
        if (this.phaseTimer <= 0) {
          this._nextRound(player);
        }
        break;
    }
  }

  // ── 구매 단계 시작 ────────────────────────────────────────
  startBuyPhase(player) {
    this.phase      = 'buy';
    this.phaseTimer = CONFIG.BUY_PHASE;

    // 신속 모드 무기 강제 지급
    if (this.mode === 'spikerush' && this.spikeRushWeapon) {
      player.equipWeapon(this.spikeRushWeapon);
      // 탄약 리필은 GameManager에서 처리
    }

    if (this.audio) this.audio.playBeep(440, 0.15, 0.2);
    if (this.onBuyStart) this.onBuyStart(this.spikeRushWeapon);
  }

  // ── 라운드 단계 시작 ─────────────────────────────────────
  startRoundPhase(player) {
    this.phase      = 'round';
    this.phaseTimer = CONFIG.ROUND_TIME;
    if (this.audio) this.audio.playRoundStart();
    if (this.onRoundStart) this.onRoundStart(this.currentRound);
  }

  // ── 승리 조건 체크 ───────────────────────────────────────
  _checkWinConditions(player, bots) {
    const attackers = bots.filter(b => b.team === 'attacker' && !b.isDummy);
    const defenders = bots.filter(b => b.team === 'defender' && !b.isDummy);
    
    const anyAttackerAlive = player.alive || attackers.some(b => b.alive);
    const anyDefenderAlive = defenders.some(b => b.alive);

    // 공격팀 전멸 → 방어팀 승
    if (!anyAttackerAlive) {
      this._endRound('def', '공격팀 전멸', player);
      return;
    }

    // 방어팀 전멸 → 공격팀 승
    if (!anyDefenderAlive) {
      this._endRound('atk', '방어팀 전멸', player);
    }
  }

  // ── 라운드 종료 ──────────────────────────────────────────
  _endRound(winner, reason, player) {
    if (this.phase === 'end' || this.phase === 'gameover') return;
    this.phase      = 'end';
    this.phaseTimer = CONFIG.ROUND_END;

    this.lastRoundWinner = winner;
    this.lastRoundReason = reason;

    const playerWon = winner === 'atk'; // 플레이어 = 공격팀 (기본)

    // 점수 업데이트
    if (winner === 'atk') this.scoreAtk++;
    else                   this.scoreDef++;

    // 경제 처리
    if (this.mode !== 'range' && this.mode !== 'spikerush') {
      this.economy.onRoundEnd(playerWon, player.kills);
    }

    // 궁극기 포인트 보상
    // (AbilitySystem에서 처리)

    if (this.audio) this.audio.playRoundEnd(playerWon);
    if (this.onRoundEnd) this.onRoundEnd(winner, reason, playerWon);

    // 승리 체크
    if (this.scoreAtk >= this.maxRoundsToWin || this.scoreDef >= this.maxRoundsToWin) {
      this.gameOver   = true;
      this.gameWinner = this.scoreAtk >= this.maxRoundsToWin ? 'atk' : 'def';
      if (this.onGameOver) this.onGameOver(this.gameWinner);
      this.phase = 'gameover';
    }
  }

  // ── 다음 라운드 ──────────────────────────────────────────
  _nextRound(player) {
    this.currentRound++;

    // 하프타임 (경쟁전 13기준 → 13라운드)
    if (this.mode === 'competitive' && this.currentRound === 14) {
      this.economy.onHalfTime();
    }

    // 신속 모드 무기
    if (this.mode === 'spikerush') this._assignSpikeRushWeapon();

    // 플레이어 리스폰
    const spawn = MAP_DATA.spawns.attacker[0] || { x: 200, y: 200 };
    player.respawn(spawn.x, spawn.y);
    player.kills = 0; // 라운드 킬 초기화 (전체 통산은 유지 필요시 별도)

    this.startBuyPhase(player);
  }

  // ── 강제 종료 (라운드 스킵, 사격장 등) ───────────────────
  killPlayer(player) {
    player.alive = false;
    this._endRound('def', '전술적 선택', player);
  }

  // ── HUD용 남은 시간 텍스트 ───────────────────────────────
  getTimerLabel() {
    const t = Math.ceil(Math.max(0, this.phaseTimer));
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // 신속 모드 무기 이름
  spikeRushWeaponName() {
    if (!this.spikeRushWeapon) return '';
    return WEAPON_DATA[this.spikeRushWeapon]?.name || '';
  }
}
