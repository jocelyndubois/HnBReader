var config = require('./config.json');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fs = require('fs');
const URL = require('url').URL;
const dataFileUrl = new URL(config.dataUrl);
const teamsFileUrl = new URL(config.teamsUrl);

var globalData = {
  'floor': null,
  'players': {},
};

var globalTeams = {};

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

      refreshTeams();
  });
}

function refreshTeams() {
    fs.readFile(teamsFileUrl, (err, data) => {
        try {
            var teams = JSON.parse(data);
            var player1 = 0;
            var player2 = 1;
            var teamLevel = 2;
            var needEmit = false;

            var tempTeams = [];
            for (let [name, infos] of Object.entries(teams)) {
                tempTeams.push(name);
                if (globalTeams[name] === undefined || (globalTeams[name].level !== undefined && (globalTeams[name].level != infos[teamLevel]))) {
                    team = {};
                    if (globalData.players[infos[player1]] !== undefined && globalData.players[infos[player2]] !== undefined) {
                        team.player1 = globalData.players[infos[player1]].name;
                        team.player2 = globalData.players[infos[player2]].name;
                        team.level = infos[teamLevel];

                        globalTeams[name] = team;
                    }

                    needEmit = true;
                }
            }

            for (let [name, infos] of Object.entries(globalTeams)) {
                if (tempTeams.indexOf(name) === -1) {
                    needEmit = true;
                    delete globalTeams[name];
                }
            }

            if (needEmit) {
                io.emit('teams update', globalTeams);
            }
        } catch(e) {
            console.log(e)
        }
    });
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/items/', function(req, res){
  res.sendFile(__dirname + '/public/items.html');
});

io.on('connection', function(socket){
  io.emit('floor update', globalData.floor);
  io.emit('players update', globalData.players);
  io.emit('teams update', globalTeams);

  emitItems();

  socket.on('addItem', function (newItem) {
    fs.readFile('./data/items.json', (err, data) => {
        var items = JSON.parse(data);
        var found = false;
        var returnValue = {};
        var keyField = {};


        for (var i = 0; i < newItem.length; i++) {
            keyField[newItem[i].name] = i;
        }

        for (let [type, infos] of Object.entries(items)) {
            var list = infos.list;
            for (var i = 0; i < list.length; i++) {

                if (list[i].name.toUpperCase() === newItem[0].value.toUpperCase()) {
                    found = true;
                }
            }
        }

        if (found) {
            returnValue = {'type': "warning", "text": "L'item existe déjà !"};
        } else {
            var finalItem = {
                "name" : newItem[keyField.itemName].value,
                "offensive" : newItem[keyField.itemOffensive].value,
                "defensive" : newItem[keyField.itemDéfensive].value,
                "folie" : newItem[keyField.itemFolie].value,
                "loot" : newItem[keyField.itemLoot].value,
                "experience" : newItem[keyField.itemExperience].value,
                "lesslevels" : newItem[keyField.itemLesslevels].value,
                "prison" : newItem[keyField.itemPrison].value
            };

            items[newItem[keyField.itemRarity].value].list.push(finalItem);

            try {
                fs.writeFile("./data/items.json", JSON.stringify(items), function(err) {
                    if(err) {
                        throw err;
                    }
                });
                returnValue = {'type': "success", "text": "Item ajouté !"};
            } catch(e) {
                returnValue = {'type': "error", "text": "Enregistrement échoué !"};
            }
        }

        io.emit('itemFeedback', returnValue);
        emitItems();
    });
  });
});

function emitItems()
{
    fs.readFile('./data/items.json', (err, data) => {
        var items = JSON.parse(data);
        io.emit('items update', items);
    });
}

http.listen(config.port, function(){
  console.log('listening on *:' + config.port);
});



refreshData();
setInterval(function(){ refreshData();},config.refreshDelay);
