class Player {
    constructor(id, active, name, language) {
        this.id = id
        this.active = active
        this.name = name
        this.language = language
    }
}

var players = []
var doubles = []

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        players = players.filter(player => player.id !== socket.id);

        let foundDoubleIndex = -1;
        for (let i = 0; i < doubles.length; i++) {
            if (doubles[i].Player1.id === socket.id || doubles[i].Player2.id === socket.id) {
                foundDoubleIndex = i;
                break;
            }
        }

        if (foundDoubleIndex !== -1) {
            let remainingDouble = doubles[foundDoubleIndex];

            players = players.filter(player => player.id !== remainingDouble.Player1.id && player.id !== remainingDouble.Player2.id);

            if (remainingDouble.Player1.id !== socket.id) {
                players.push(remainingDouble.Player1);
                io.to(remainingDouble.Player1.id).emit('left');
            }
            if (remainingDouble.Player2.id !== socket.id) {
                players.push(remainingDouble.Player2);
                io.to(remainingDouble.Player2.id).emit('left');
            }

            doubles.splice(foundDoubleIndex, 1);
        }
    });

    socket.on('register', (name, language) => {
        let player = new Player(socket.id, false, name, language)
        players.push(player)
        io.to(player.id).emit('login');
    });

    socket.on('offerRequest', (id) => {
        const requestingPlayer = players.find(player => player.id === socket.id);
        const requestedPlayer = players.find(player => player.id === id);
    
        if (requestingPlayer && !requestingPlayer.active && requestedPlayer && !requestedPlayer.active) {
            io.to(id).emit('request', requestingPlayer);
        }
    });
    
    socket.on('acceptRequest', (id) => {
        var player1 = players.filter(play => play.id === socket.id);
        var player2 = players.filter(play => play.id === id);

        let double = {
            "Player1": player1[0],
            "Player2": player2[0],
        }

        doubles.push(double)
        player1[0].active = true
        player2[0].active = true

        value = getRandomInt(0, 4)

        io.to(double["Player1"].id).emit('textCount', value);
        io.to(double["Player2"].id).emit('textCount', value);
        io.to(double["Player1"].id).emit('gameStart');
        io.to(double["Player2"].id).emit('gameStart');

    });

    socket.on('refuseRequest', (id) => {
        io.to(id).emit('refused');
    });

    socket.on('updateText', (text) => {
        for (let i = 0; i < doubles.length; i++) {
            if (doubles[i].Player1.id === socket.id || doubles[i].Player2.id === socket.id) {
                if (doubles[i].Player1.id === socket.id) {
                    io.to(doubles[i].Player2.id).emit('updateEnemyText', text);
                } else if (doubles[i].Player2.id === socket.id) {
                    io.to(doubles[i].Player1.id).emit('updateEnemyText', text);
                }
                break;
            }
        }
    });

    socket.on('reMatch', () => {
        for (let i = 0; i < doubles.length; i++) {
            if (doubles[i].Player1.id === socket.id || doubles[i].Player2.id === socket.id) {
                if (doubles[i].Player1.id === socket.id) {
                    io.to(doubles[i].Player2.id).emit('reMatchOffer');
                } else if (doubles[i].Player2.id === socket.id) {
                    io.to(doubles[i].Player1.id).emit('reMatchOffer');
                }
                break;
            }
        }
    });

    socket.on('reMatchAccepted', () => {
        for (let i = 0; i < doubles.length; i++) {
            if (doubles[i].Player1.id === socket.id || doubles[i].Player2.id === socket.id) {
                io.to(doubles[i].Player2.id).emit('gameStart');
                io.to(doubles[i].Player1.id).emit('gameStart');
                break;
            }
        }
    });

    socket.on('win', () => {
        for (let i = 0; i < doubles.length; i++) {
            if (doubles[i].Player1.id === socket.id || doubles[i].Player2.id === socket.id) {
                if (doubles[i].Player1.id === socket.id) {
                    io.to(doubles[i].Player2.id).emit('lose');
                } else if (doubles[i].Player2.id === socket.id) {
                    io.to(doubles[i].Player1.id).emit('lose');
                }
                break;
            }
        }
    });

    socket.on('newOponent', () => {
        let foundDoubleIndex = -1;
        for (let i = 0; i < doubles.length; i++) {
            if (doubles[i].Player1.id === socket.id || doubles[i].Player2.id === socket.id) {
                foundDoubleIndex = i;
                break;
            }
        }

        if (foundDoubleIndex !== -1) {
            let remainingDouble = doubles[foundDoubleIndex];

            players = players.filter(player => player.id !== remainingDouble.Player1.id && player.id !== remainingDouble.Player2.id);

            players.push(remainingDouble.Player1);
            players.push(remainingDouble.Player2);

            remainingDouble.Player1.active = false;
            remainingDouble.Player2.active = false;

            if (remainingDouble.Player2.id !== socket.id) {
                io.to(remainingDouble.Player1.id).emit('notRematch');
            }
            if (remainingDouble.Player1.id !== socket.id) {
                io.to(remainingDouble.Player2.id).emit('notRematch');
            }

            doubles.splice(foundDoubleIndex, 1);
        }
    });

});

server.listen(3000, '192.168.1.189',() => {
    console.log('listening on 192.168.1.189:3000');
});

setInterval(() => {

    players.forEach(player => {
        data = players.filter(play => play.id !== player.id);
        io.to(player.id).emit('enemyList', data);
    });

}, 1000);

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


