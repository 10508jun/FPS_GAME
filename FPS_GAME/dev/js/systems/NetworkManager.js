// ============================================================
//  NetworkManager.js — 실시간 멀티플레이어 동기화 (Socket.io)
// ============================================================
class NetworkManager {
  constructor(gameManager) {
    this.gm = gameManager;
    this.socket = null;
    this.remotePlayers = {}; // id -> RemotePlayer (Player instance mockup)
  }

  connect() {
    // Socket.io 라이브러리가 로드되어 있어야 함
    if (typeof io === 'undefined') {
      console.warn('Socket.io가 로드되지 않았습니다. 싱글 플레이 모드로 실행합니다.');
      return;
    }

    this.socket = io({
      timeout: 1500,
      reconnectionAttempts: 2
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket.emit('join', {
        x: this.gm.player.x,
        y: this.gm.player.y,
        angle: this.gm.player.angle,
        agentId: this.gm.player.agentId,
        team: this.gm.player.team,
        currentWeapon: this.gm.player.currentWeapon
      });
    });

    this.socket.on('players', (players) => {
      Object.values(players).forEach(p => {
        if (p.id !== this.socket.id) {
          this._addRemotePlayer(p);
        }
      });
    });

    this.socket.on('playerJoined', (p) => {
      this._addRemotePlayer(p);
    });

    this.socket.on('playerUpdated', (data) => {
      const rp = this.remotePlayers[data.id];
      if (rp) {
        rp.x = data.x;
        rp.y = data.y;
        rp.angle = data.angle;
        rp.isMoving = data.isMoving;
        rp.stance = data.stance;
      }
    });

    this.socket.on('playerLeft', (id) => {
      delete this.remotePlayers[id];
    });

    this.socket.on('playerFired', (data) => {
      const rp = this.remotePlayers[data.id];
      if (rp) {
        this.gm.weaponSys.bullets.push(new Bullet(
          rp.x, rp.y, 
          rp.x + Math.cos(data.angle) * 2000, 
          rp.y + Math.sin(data.angle) * 2000,
          '#ffee88'
        ));
        this.gm.audio.playGunshot(data.weaponId, rp.x, rp.y);
      }
    });
  }

  _addRemotePlayer(data) {
    const rp = new Player(data.x, data.y, data.agentId, data.team);
    rp.id = data.id;
    this.remotePlayers[data.id] = rp;
  }

  update() {
    if (!this.socket || !this.socket.connected) return;

    this.socket.emit('update', {
      x: this.gm.player.x,
      y: this.gm.player.y,
      angle: this.gm.player.angle,
      isMoving: this.gm.player.isMoving,
      stance: this.gm.player.stance
    });
  }

  sendFire(weaponId, angle) {
    if (this.socket) {
      this.socket.emit('fire', { weaponId, angle });
    }
  }

  render(ctx) {
    Object.values(this.remotePlayers).forEach(rp => {
      rp.render(ctx, false);
      rp.renderHealthBar(ctx);
    });
  }
}
