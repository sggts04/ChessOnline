var socket = io();
var playing = false;
var color = 'white';
var board = null
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')
var $room = $('#room')
var $roomSelector = $('#roomSelector')
var moveAudio = new Audio('sounds/Move.mp3');
var captureAudio = new Audio('sounds/Capture.mp3');
var genAudio = new Audio('sounds/Generic.mp3');
var whiteSquareGrey = '#a9a9a9'
var blackSquareGrey = '#696969'

function connect() {
    roomId = $room.val();
    if(roomId != "" && parseInt(roomId) < 100) {
        $roomSelector.remove();
        document.getElementById("gameDiv").style.display = 'flex';
        socket.emit('joined', roomId);
        console.log(roomId);
    }
}

function removeGreySquares() {
    $('#myBoard .square-55d63').css('background', '')
}

function greySquare(square) {
    var $square = $('#myBoard .square-' + square)

    var background = whiteSquareGrey
    if ($square.hasClass('black-3c85d')) {
        background = blackSquareGrey
    }

    $square.css('background', background)
}

function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false

    // only pick up pieces for the side to move
    if (!playing || (game.turn() === 'w' && (piece.search(/^b/) !== -1 || color==='black')) ||
        (game.turn() === 'b' && (piece.search(/^w/) !== -1 || color==='white')) || (color !== 'black' && color !== 'white')) {
        return false
    }
}

function onDrop(source, target) {
    removeGreySquares()
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })

    console.log(move)
    // illegal move
    if (move === null) return 'snapback'
    else {
        socket.emit('move', {move: move, board: game.fen(), roomId: roomId});
    }

    if (game.in_checkmate() || game.in_check()) genAudio.play()
    else if (move.captured) captureAudio.play()
    else moveAudio.play()

    updateStatus()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    board.position(game.fen())
}

function updateStatus() {
    var status = ''

    var moveColor = 'White'
    if (game.turn() === 'b') {
        moveColor = 'Black'
    }

    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game Over<br/>' + moveColor + ' is in checkmate.'
    }

    // draw?
    else if (game.in_draw()) {
        status = 'Game Over<br/>Drawn position'
    }

    // game still on
    else {
        status = moveColor + ' to move'

        // check?
        if (game.in_check()) {
            status += '<br/>' + moveColor + ' is in check'
        }
    }

    $status.html(status)
    let moves = game.history();
    let pgn = '';
    for (let i = 0; i < moves.length; i++) {
        if (i == 0) {
            pgn = String(i + 1) + ". " + moves[i];
        } else if (i % 2 != 0) {
            pgn += " " + moves[i];
        } else {
            pgn += "<br/>" + String((i / 2) + 1) + ". " + moves[i];
        }
    }
    $pgn.html(pgn)
    $pgn.scrollTop($pgn[0].scrollHeight);
}

function onMouseoverSquare(square, piece) {
    // get list of possible moves for this square
    var moves = game.moves({
        square: square,
        verbose: true
    })

    // exit if there are no moves available for this square
    if (moves.length === 0) return

    // highlight the square they moused over
    greySquare(square)

    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to)
    }
}

function onMouseoutSquare(square, piece) {
    removeGreySquares()
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onSnapEnd: onSnapEnd
}
board = Chessboard('myBoard', config)

updateStatus()

socket.on('full', function (msg) {
    if(roomId == msg)
      alert('Room is already full!');
      window.location.reload();
});

socket.on('opponentDisconnect', function (msg) {
    if(roomId == msg)
      alert('Your opponent left!');
      window.location.reload();
});

socket.on('play', function (msg) {
    if (msg.room == roomId) {
        playing=true;
        $('#gameState').remove();
        game.load(msg.serverGame);
        board.position(msg.serverGame);
    }
});

socket.on('player', function(msg) {
    color = msg.color;
    if(color==='black') board.flip();
    
    $('#stats').html('You are '+msg.color);

    if(msg.players == 2){
        playing=true;
        socket.emit('play', msg.roomId);
        $('#gameState').remove();
    } else {
        $('#gameState').html("Waiting...");
    }
});

socket.on('move', function (msg) {
    if(roomId === msg.roomId) {
        game.move(msg.move);
        board.position(game.fen());
        updateStatus();
        
        if (game.in_checkmate() || game.in_check()) genAudio.play()
        else if (msg.move.captured) captureAudio.play()
        else moveAudio.play()
    }
});

socket.on('resetBoard', function (msg) {
    if(roomId === msg.roomId) {
        game.load(msg.board);
        board.position(game.fen());
        updateStatus();
        genAudio.play();
        color = msg.mycolor;
        alert("Are you sure you want to do that mate?");
    }
});