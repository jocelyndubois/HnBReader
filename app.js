var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fs = require('fs')
const URL = require('url').URL;
const myFileURL = new URL('file://192.168.0.47/LAN/data.json');

var globalData = {
  'floor': null,
  'players': {},
}

function refreshData() {
  fs.readFile(myFileURL, (err, data) => {
    try {
        var data = JSON.parse(data);

        var floor = data.floor;
        if (Number.isInteger(floor) && globalData.floor != data['floor']) {
          console.log('new flor : ' + floor);
          globalData.floor = floor;
          io.emit('floor update', floor);
        }

        var players = data.players;
        if (Object.keys(globalData.players).length != players.length) {
          var tempPlayers = [];
          for (var i=0; i < players.length; i++) {
            tempPlayers.push(players[i][0]);
            if (!globalData.players[players[i][0]]) {
              globalData.players[players[i][0]] = {
                'name': players[i][1],
                'levels': 0,
                'folies': 0,
              }
            }
          }

          for (let [id, player] of Object.entries(globalData.players)) {
            if (tempPlayers.indexOf(id) === -1) {
              delete globalData.players[id];
              console.log(globalData.players);
            }
          }

          // globalData.players = players;
          io.emit('players update', globalData.players);
        }

        var levels = data.levels;
        for (let [id, level] of Object.entries(levels)) {
          if (globalData.players[id].levels != level) {
            globalData.players[id].levels = level;
            io.emit('players update', globalData.players);
          }
        }

        var folies = data.folies;
        for (let [id, folie] of Object.entries(folies)) {
          if (globalData.players[id].folies != folie) {
            globalData.players[id].folies = folie;
            io.emit('players update', globalData.players);
          }
        }
    } catch(e) {
        console.log(e)
    }
  });
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket){
  io.emit('floor update', globalData.floor);
  io.emit('players update', globalData.players);
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

refreshData();
setInterval(function(){ refreshData();},1000)


// app.listen(3000, function () {
//   refreshData();
// })
