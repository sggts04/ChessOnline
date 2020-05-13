const express = require('express')
const app = express()
var server = require('http').createServer(app);
var io = require('socket.io')(server);
const { Chess } = require('chess.js')
const port = process.env.PORT || 3000

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
})

var games = Array(100);
for (let i = 0; i < 100; i++) {
    games[i] = {
        players: 0,
        pid: [0, 0],
        game: null
    };
}

io.on('connection', function (socket) {
    var playerId = Math.floor((Math.random() * 10000) + 1)
    console.log(playerId + ' connected');
    var color;

    socket.on('joined', function (roomId) {
        if (games[roomId].players < 2) {
            games[roomId].players++;
            games[roomId].pid[games[roomId].players - 1] = playerId;
        } else {
            socket.emit('full', roomId);
            return;
        }
        console.log(games[roomId]);
        var players = games[roomId].players;
        if (players % 2 == 0) color = 'black';
        else color = 'white';

        socket.emit('player', {
            playerId,
            players,
            color,
            roomId
        })
    });

    socket.on('move', function (msg) {
        socket.broadcast.emit('move', msg);
    });

    socket.on('disconnect', function () {   
        for (let i = 0; i < 100; i++) {
            if (games[i].pid[0] == playerId || games[i].pid[1] == playerId) {
                games[i] = {
                    players: 0,
                    pid: [0, 0],
                    game: null
                };
                io.emit('opponentDisconnect', i);
            }
        }
        console.log(playerId + ' disconnected');
    });

    socket.on('play', function (msg) {
        const serverGame = new Chess();
        games[msg].game = serverGame;
        io.emit('play', {room: msg, serverGame: serverGame.fen()});
        console.log("Room " + msg + " is now playing.");
    });

    socket.on('move', function (msg) {
        socket.broadcast.emit('move', msg);
    });

});

server.listen(port, function () {
    console.log(`Chess app listening at http://localhost:${port}`);
})