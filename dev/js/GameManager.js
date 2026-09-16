// ============================================================
//  GameManager.js — 게임 상태 머신, 초기화, 루프 통합
// ============================================================
class GameManager {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // URL 파라미터에서 설정 읽기
    const params = new URLSearchParams(window.location.search);
    this.agentId  = params.get('agent') || config?.agentId || 'jett';
    this.gameMode = params.get('mode')  || config?.mode    || 'standard';
    this.teamSize = parseInt(params.get('teamSize')) || 5;

    // 캔버스 크기
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    // ── 시스템 초기화 ────────────────────────────────────────
    this.input   = new InputHandler(canvas);
    this.audio   = new AudioSystem();
    this.shopSys = new ShopSystem();

    // 맵 & 벽관통
    this.wallbang = new WallbangSystem(MAP_DATA.walls);

    // 대미지 텍스트
    this.dmgText = new DamageTextSystem();

    // 카메라
    this.camera = { x: 0, y: 0 };

    // ── 플레이어 생성 ────────────────────────────────────────
    const spawn = MAP_DATA.spawns.attacker[0];
    this.player  = new Player(spawn.x, spawn.y, this.agentId, 'attacker');
    this.player.equipWeapon('ghost'); // 기본 권총

    // ── 봇 생성 ──────────────────────────────────────────────
    this.bots = [];
    this._spawnBots();

    // ── 무기 시스템 ──────────────────────────────────────────
    this.weaponSys = new WeaponSystem(this.wallbang, this.dmgText, this.audio);
    this.weaponSys.refillAll(this.player.weapons);

    // ── 스킬 시스템 ──────────────────────────────────────────
    this.ability = new AbilitySystem(this.player);

    // ── 경제 시스템 ──────────────────────────────────────────
    this.economy = new EconomySystem();

    // ── 라운드 시스템 ────────────────────────────────────────
    this.round = new RoundSystem(this.gameMode, this.economy, this.audio);
    this._setupRoundCallbacks();

    // ── 미니맵 ───────────────────────────────────────────────
    this.minimap = new MinimapSystem(MAP_DATA);

    // ── 네트워킹 (멀티플레이어) ──────────────────────────────
    this.network = new NetworkManager(this);

    // ── UI ───────────────────────────────────────────────────
    this.hud     = new HUD(canvas);
    this.shopUI  = new ShopUI();

    // 로테이션 상점 (메뉴에서 열기)
    this.rotationShopVisible = false;

    // 스코어보드
    this.scoreboardVisible = false;

    // ── 타이밍 ───────────────────────────────────────────────
    this.lastTime  = 0;
    this.running   = false;
    this._fireCooldown = 0;

    // 게임 오버 상태
    this.gameOverState = null; // null | { winner, time }

    // 사격장 보조 데이터
    this.rangeTotalHits = 0;
    this.rangeHeadshots = 0;
  }

  // ── 봇 스폰 ──────────────────────────────────────────────
  _spawnBots() {
    if (this.gameMode === 'range') {
      // 사격장: 마네킹 4개
      const positions = [
        { x: 500, y: 500 }, { x: 650, y: 500 },
        { x: 500, y: 650 }, { x: 650, y: 650 },
      ];
      positions.forEach((pos, i) => {
        const agents = Object.keys(AGENT_DATA);
        const bot = new Bot(pos.x, pos.y, 'defender',
          agents[i % agents.length], true);
        this.bots.push(bot);
      });
    } else {
      // 일반/경쟁/신속: 적 봇 설정
      const enemySpawns = MAP_DATA.spawns.defender;
      const allySpawns  = MAP_DATA.spawns.attacker;
      const agents      = Object.keys(AGENT_DATA);

      // 적팀 스폰
      const enemyCount = this.teamSize;
      for (let i = 0; i < enemyCount; i++) {
        const sp = enemySpawns[i % enemySpawns.length];
        const bot = new Bot(
          sp.x + (Math.random() - 0.5) * 80,
          sp.y + (Math.random() - 0.5) * 80,
          'defender', agents[i % agents.length], false,
        );
        this.bots.push(bot);
      }

      // 우리팀 봇 스폰 (플레이어를 제외한 나머지)
      if (this.teamSize > 1) {
        const allyBotCount = this.teamSize - 1;
        for (let i = 0; i < allyBotCount; i++) {
          const sp = allySpawns[(i + 1) % allySpawns.length]; // i + 1 to avoid player spawn point
          const bot = new Bot(
            sp.x + (Math.random() - 0.5) * 80,
            sp.y + (Math.random() - 0.5) * 80,
            'attacker', agents[(i + 2) % agents.length], false,
          );
          this.bots.push(bot);
        }
      }
    }
  }

  // ── 라운드 콜백 설정 ─────────────────────────────────────
  _setupRoundCallbacks() {
    this.round.onRoundEnd = (winner, reason, playerWon) => {
      const text    = playerWon ? '라운드 승리' : '라운드 패배';
      const color   = playerWon ? CONFIG.C.GREEN : CONFIG.C.RED;
      this.hud.showBanner(text, reason, color, 3);
      this.ability.addUltPoint(1); // 라운드 끝 궁극기 포인트
      // 봇 리스폰 (다음 라운드)
      setTimeout(() => this._respawnBots(), 3200);
    };

    this.round.onGameOver = (winner) => {
      const playerWon = winner === 'atk';
      this.hud.showBanner(
        playerWon ? '승리!' : '패배',
        `${this.round.scoreAtk} : ${this.round.scoreDef}`,
        playerWon ? CONFIG.C.GREEN : CONFIG.C.RED, 10,
      );
      this.gameOverState = { winner, time: Date.now() };
    };

    this.round.onBuyStart = (forcedWeapon) => {
      if (forcedWeapon) {
        this.hud.notify(`이번 라운드 무기: ${WEAPON_DATA[forcedWeapon]?.name}`, CONFIG.C.GOLD);
        this.weaponSys.refillAll(this.player.weapons);
      }
    };

    this.round.onRoundStart = (roundNum) => {
      this.hud.notify(`라운드 ${roundNum} 시작`, CONFIG.C.CYAN);
    };
  }

  // ── 봇 리스폰 ────────────────────────────────────────────
  _respawnBots() {
    const spawns = MAP_DATA.spawns.defender;
    this.bots.forEach((bot, i) => {
      if (bot.isDummy) return;
      const sp = spawns[i % spawns.length];
      bot.respawn(sp.x + (Math.random() - 0.5) * 60, sp.y + (Math.random() - 0.5) * 60);
    });
  }

  // ── 캔버스 리사이즈 ──────────────────────────────────────
  _resizeCanvas() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    CONFIG.CANVAS_WIDTH  = this.canvas.width;
    CONFIG.CANVAS_HEIGHT = this.canvas.height;
    if (this.minimap) this.minimap._buildMapCache && this.minimap._buildMapCache();
  }

  // ── 게임 시작 ────────────────────────────────────────────
  start() {
    this.running = true;
    if (this.gameMode !== 'range') {
      this.round.startBuyPhase(this.player);
    }
    this.network.connect();
    requestAnimationFrame(ts => this._loop(ts));
  }

  // ── 메인 루프 ────────────────────────────────────────────
  _loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this._update(dt);
    this._render();

    if (this.running) requestAnimationFrame(ts => this._loop(ts));
  }

  // ── 업데이트 ─────────────────────────────────────────────
  _update(dt) {
    // 상점 업데이트
    this.shopUI.update(dt);

    // 상점 열기/닫기
    if (this.input.justPressed('KeyB')) this.shopUI.toggle();
    if (this.input.justPressed('Escape')) {
      if (this.shopUI.visible) {
        this.shopUI.hide();
      } else {
        window.location.href = 'index.html'; // 상점이 닫혀있을 때 ESC 누르면 메뉴로 나가기
      }
    }

    // 스코어보드
    this.scoreboardVisible = this.input.isDown('Tab');

    // 게임 오버 시 재시작
    if (this.gameOverState && this.input.justPressed('Enter')) {
      window.location.href = 'index.html';
    }

    // 상점 열려있으면 게임 플레이 멈춤
    if (this.shopUI.visible) {
      this.input.flush();
      return;
    }

    // ── 플레이어 업데이트 ──
    this.player.update(dt, this.input, MAP_DATA.walls, this.audio);
    this.input.updateCamera(this.camera.x, this.camera.y);

    // ── 발사 ──
    if (this.player.alive && (this.input.mouse.left || this.input.mouse.right)) {
      this._fireCooldown -= dt;
      if (this._fireCooldown <= 0) {
        const hitResult = this.weaponSys.tryFire(
          this.player, this.bots, 
          this.input.mouse.left, this.input.mouse.right
        );
        
        // 서버에 발사 알림
        if (hitResult && hitResult.hit) {
          this.network.sendFire(this.player.currentWeapon, this.player.angle);
          
          // 대미지 텍스트
          this.dmgText.spawn(
            hitResult.bot.x, hitResult.bot.y - 20,
            hitResult.damage, hitResult.zone,
            hitResult.wallbang, this.camera,
          );
          // 킬 확인
          if (hitResult.kill) {
            this.audio.playKillConfirm();
            this.ability.addUltPoint(1);
            this.economy.onKill(this.player.currentWeapon);
            this.hud.addKillfeed(
              this.player.agentData.name,
              hitResult.bot.agentData.name,
              this.player.currentWeapon,
              hitResult.zone === 'head'
            );
          }
        }
        this._fireCooldown = 0.016; 
      }
    }

    // 재장전
    if (this.input.justPressed('KeyR')) {
      this.weaponSys.startReload(this.player.currentWeapon);
    }

    // ── 스킬 ──
    const abilityKey = this.input.getAbilityKey();
    if (abilityKey && this.player.alive) {
      this.ability.useAbility(abilityKey, {
        targetX: this.input.mouse.worldX,
        targetY: this.input.mouse.worldY,
        bots:    this.bots,
        minimap: this.minimap,
      });
    }

    // ── 봇 업데이트 ──
    this.bots.forEach(bot => bot.update(dt, MAP_DATA.walls, this.player, this.audio));

    // ── 시스템 업데이트 ──
    this.weaponSys.update(dt);
    this.ability.update(dt);
    this.hud.update(dt);
    this.dmgText.update(dt);
    this.minimap.update(dt, this.player, this.bots);
    this.round.update(dt, this.player, this.bots);
    this.network.update(dt);

    // ── 카메라 (플레이어 중심) ──
    const targetCX = this.player.x - CONFIG.CANVAS_WIDTH  / 2;
    const targetCY = this.player.y - CONFIG.CANVAS_HEIGHT / 2;
    this.camera.x += (targetCX - this.camera.x) * 0.1;
    this.camera.y += (targetCY - this.camera.y) * 0.1;
    this.camera.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH  - CONFIG.CANVAS_WIDTH,  this.camera.x));
    this.camera.y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.CANVAS_HEIGHT, this.camera.y));
    this.input.updateCamera(this.camera.x, this.camera.y);

    this.input.flush();
  }

  // ── 렌더링 ───────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    const W   = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;

    // 배경 청소
    ctx.fillStyle = CONFIG.C.BG;
    ctx.fillRect(0, 0, W, H);

    // ── 월드 (카메라 변환) ──
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // 맵 렌더
    this._renderMap(ctx);

    // 사이트 레이블
    this._renderSiteLabels(ctx);

    // 스킬 이펙트 (벽 뒤)
    this.ability.render(ctx);

    // 봇
    this.bots.forEach(bot => {
      bot.render(ctx);
      bot.renderHealthBar(ctx);
    });

    // 플레이어
    this.player.render(ctx, true);
    this.player.renderHealthBar(ctx);

    // 원격 플레이어 (멀티플레이어)
    this.network.render(ctx);

    // 탄환 & 임팩트
    this.weaponSys.render(ctx);

    ctx.restore();

    // ── 화면 공간 (HUD) ──

    // 대미지 텍스트 (카메라 독립)
    this.dmgText.render(ctx);

    // 미니맵
    this.minimap.render(ctx, this.player, this.bots);

    // HUD
    this.hud.render(ctx, this.player, this.round, this.economy, this.ability, this.weaponSys, this.gameMode);

    // 구매 상점
    if (this.shopUI.visible) {
      this.shopUI.render(ctx, this.economy, this.player);
    }

    // 스코어보드
    if (this.scoreboardVisible) {
      this._renderScoreboard(ctx);
    }

    // 게임 오버
    if (this.gameOverState) {
      this._renderGameOver(ctx);
    }

    // 라운드 종료 시 블러 안내
    if (this.round.phase === 'end' && !this.gameOverState) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── 맵 렌더링 ────────────────────────────────────────────
  _renderMap(ctx) {
    // 바닥 구역
    const floorColors = {
      spawn_atk: '#0f1e12', spawn_def: '#0f0f1e',
      site_a: '#101a10', site_b: '#10101a', site_c: '#1a1010',
      corridor: '#0f1420', mid: '#0e1218',
    };
    for (const f of MAP_DATA.floors) {
      ctx.fillStyle = floorColors[f.type] || '#0f1420';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      // 그리드 패턴
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 1;
      const step = 64;
      for (let gx = f.x; gx < f.x + f.w; gx += step) {
        ctx.beginPath(); ctx.moveTo(gx, f.y); ctx.lineTo(gx, f.y + f.h); ctx.stroke();
      }
      for (let gy = f.y; gy < f.y + f.h; gy += step) {
        ctx.beginPath(); ctx.moveTo(f.x, gy); ctx.lineTo(f.x + f.w, gy); ctx.stroke();
      }

      // 지형 이름 (Callouts) 렌더링
      if (f.label) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = `700 24px ${CONFIG.FONT_HUD}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.label, f.x + f.w / 2, f.y + f.h / 2);
        ctx.restore();
      }
    }

    // 벽
    for (const w of MAP_DATA.walls) {
      const rh = w.h || w.height || 30;
      if (w.type === 'cover') {
        ctx.fillStyle = '#374151';
        ctx.strokeStyle = '#4b5563';
      } else {
        ctx.fillStyle = '#1c2b3a';
        ctx.strokeStyle = '#2a3f56';
      }
      ctx.lineWidth = 1.5;
      ctx.fillRect(w.x, w.y, w.w, rh);
      ctx.strokeRect(w.x, w.y, w.w, rh);

      // 벽 상단 하이라이트
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(w.x, w.y, w.w, 2);
    }
  }

  _renderSiteLabels(ctx) {
    for (const [key, site] of Object.entries(MAP_DATA.sites)) {
      const colors = { A: '#2ecc7133', B: '#3498db33', C: '#e74c3c33' };
      ctx.fillStyle = colors[key] || 'rgba(255,255,255,0.05)';
      ctx.fillRect(site.x, site.y, site.w, site.h);
      ctx.fillStyle = colors[key]?.replace('33', 'aa') || 'rgba(255,255,255,0.4)';
      ctx.font = `900 48px ${CONFIG.FONT_HUD}`;
      ctx.textAlign = 'center';
      ctx.fillText(key, site.x + site.w/2, site.y + site.h/2 + 18);
    }
    ctx.textAlign = 'left';
  }

  // ── 스코어보드 렌더링 ────────────────────────────────────
  _renderScoreboard(ctx) {
    const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);

    const pw = 700, ph = 300;
    const px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = '#0d1628';
    ctx.strokeStyle = '#1e3048';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.fill(); ctx.stroke();

    ctx.font = `700 15px ${CONFIG.FONT_HUD}`; ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'center';
    ctx.fillText('스코어보드', px + pw/2, py + 28);

    const headers = ['에이전트', 'K', 'D', 'A', 'ADR'];
    headers.forEach((h, i) => {
      ctx.font = '700 11px Inter'; ctx.fillStyle = '#6a8099';
      ctx.textAlign = i === 0 ? 'left' : 'center';
      const xPos = i === 0 ? px + 20 : px + 160 + i * 80;
      ctx.fillText(h, xPos, py + 58);
    });

    // 플레이어 행
    this._renderSBRow(ctx, px, py + 72, this.player, '#00d4ff');

    // 봇 행
    this.bots.slice(0, 5).forEach((bot, i) => {
      this._renderSBRow(ctx, px, py + 72 + (i + 1) * 38, bot, '#ff4655');
    });

    ctx.textAlign = 'left';
  }

  _renderSBRow(ctx, px, rowY, entity, color) {
    ctx.fillStyle = `${color}18`;
    ctx.fillRect(px + 8, rowY - 16, 684, 30);
    ctx.font = `600 13px ${CONFIG.FONT_HUD}`; ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(entity.agentData?.name || 'Bot', px + 20, rowY + 2);
    [entity.kills, entity.deaths, entity.assists,
     (entity.damageDealt / Math.max(1, entity.kills + entity.deaths)).toFixed(0)
    ].forEach((v, i) => {
      ctx.font = '600 13px Inter'; ctx.fillStyle = '#ecf0f1';
      ctx.textAlign = 'center';
      ctx.fillText(v, px + 240 + i * 80, rowY + 2);
    });
  }

  // ── 게임 오버 렌더링 ─────────────────────────────────────
  _renderGameOver(ctx) {
    const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    const { winner } = this.gameOverState;
    const playerWon  = winner === 'atk';
    const text  = playerWon ? '승리!' : '패배';
    const color = playerWon ? CONFIG.C.GREEN : CONFIG.C.RED;

    ctx.textAlign = 'center';
    ctx.font = `900 80px ${CONFIG.FONT_HUD}`;
    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 50;
    ctx.fillText(text, W/2, H/2 - 30);
    ctx.shadowBlur  = 0;

    ctx.font = `500 20px ${CONFIG.FONT_HUD}`; ctx.fillStyle = '#a0b4c8';
    ctx.fillText(`최종 스코어: ${this.round.scoreAtk} - ${this.round.scoreDef}`, W/2, H/2 + 30);

    ctx.font = `700 14px ${CONFIG.FONT_HUD}`; ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('[Enter] 메인 메뉴로', W/2, H/2 + 80);

    ctx.textAlign = 'left';
  }

  // ── 클릭 이벤트 ───────────────────────────────────────────
  handleClick(mx, my) {
    if (this.shopUI.visible) {
      this.shopUI.handleClick(mx, my, this.player, this.weaponSys, this.economy);
    }
  }
}
