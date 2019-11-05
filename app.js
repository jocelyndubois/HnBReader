var config = require('./config.json');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fs = require('fs');
const URL = require('url').URL;
const dataFileUrl = new URL(config.dataUrl);

var globalData = {
  'floor': null,
  'players': {},
};

function refreshData() {
  fs.readFile(dataFileUrl, (err, data) => {
    try {
        var data = JSON.parse(data);

        var floor = data.floor;
        if (Number.isInteger(floor) && globalData.floor != data['floor']) {
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

http.listen(config.port, function(){
  console.log('listening on *:' + config.port);
});

refreshData();
setInterval(function(){ refreshData();},config.refreshDelay);
