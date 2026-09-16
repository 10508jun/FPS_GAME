const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 정적 파일 서비스 (dev 폴더 기준)
app.use(express.static(path.join(__dirname, 'dev')));

const players = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 새로운 플레이어 등록
    socket.on('join', (data) => {
        players[socket.id] = {
            id: socket.id,
            x: data.x,
            y: data.y,
            angle: data.angle,
            agentId: data.agentId,
            team: data.team,
            hp: 100,
            alive: true,
            currentWeapon: data.currentWeapon
        };
        
        // 기존 플레이어 정보 전달
        socket.emit('players', players);
        
        // 다른 플레이어들에게 새 플레이어 알림
        socket.broadcast.emit('playerJoined', players[socket.id]);
    });

    // 상태 업데이트
    socket.on('update', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].angle = data.angle;
            players[socket.id].isMoving = data.isMoving;
            players[socket.id].stance = data.stance;
            
            socket.broadcast.emit('playerUpdated', players[socket.id]);
        }
    });

    // 사격 이벤트
    socket.on('fire', (data) => {
        socket.broadcast.emit('playerFired', {
            id: socket.id,
            weaponId: data.weaponId,
            angle: data.angle
        });
    });

    // 피격 이벤트
    socket.on('damage', (data) => {
        const victim = players[data.victimId];
        if (victim) {
            victim.hp -= data.damage;
            if (victim.hp <= 0) {
                victim.hp = 0;
                victim.alive = false;
                io.emit('playerKilled', { victimId: data.victimId, killerId: socket.id });
            }
            io.emit('hpUpdated', { id: data.victimId, hp: victim.hp });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
