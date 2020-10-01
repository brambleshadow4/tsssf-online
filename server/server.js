const express = require('express');
const fs = require('fs');
const ws = require('ws');
const app = express()
const PORT = 8000;
const cards = require('./cards').cards;


app.use(require('cookie-parser')());
app.use(require('express-session')({
	secret: "idk what this does",
	unset: "destroy",
	resave: false,
	saveUninitialized: false,
	secure: "idk"
}));



app.get('/', file("./views/home.html"));
app.get('/img/**', fmap("/img/**", "./img/**"));

app.get("/game", file("./views/game.html"))

app.get("/game.js", file("./views/game.js"))
app.get("/cards.js", file("./views/cards.js"))
app.get("/network.js", file("./views/network.js"))
app.get("/game.css", file("./views/game.css"))

app.get("/host", function(req, res){

	var key = startGame();

	res.redirect("/game?" + key);
})
	



function file(url)
{
	return function(req, res){

		sendIfExists(url, res);
	}
}

function fmap(routeUri, fileUrl)
{
	return function(req, res){


		let routePrefix = routeUri.substring(0,routeUri.indexOf("**"));
		let filePrefix = fileUrl.substring(0,fileUrl.indexOf("**"));

		let url = req.originalUrl.replace(routePrefix, filePrefix);

		url = url.replace(/%20/g," ");

		sendIfExists(url, res);
	}
	sendIfExists()
}

function sendIfExists(url, res)
{

	console.log(url);

	if(fs.existsSync(url))
	{
		res.sendFile(url, {root:"./"})
	}
	else
	{
		res.send("404 error sad");
	}
}


app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`))


///--------------------------------------------------------------------------------------

var games = {};

function randomizeOrder(arr)
{
	var len = arr.length;

	for(var i=0; i<len; i++)
	{
		var k = Math.floor(Math.random() * len);

		var swap = arr[i];
		arr[i] = arr[k];
		arr[k] = swap;
	}

	return arr;
}

function isPony(card)
{
	return card.indexOf(".Pony.") >= 0;
}
function isShip(card)
{
	return card.indexOf(".Ship.") >= 0;
}

function isGoal(card)
{
	return card.indexOf(".Goal.") >= 0;
}

function startGame()
{
	var key = "ABCDEF";


	games[key] = {
		board:{
			"p,0,0":{
				card: "Core.Start.FanficAuthorTwilight"
			}
		},

		offsets:{},

		goalDiscardPile: [],
		ponyDiscardPile: [],
		shipDiscardPile: [],

		currentGoals:["blank:goal","blank:goal","blank:goal"],

		// client only props
		//     hand:
		//     winnings

		// private props
		goalDrawPile: [],
		ponyDrawPile: [],
		shipDrawPile: [],

		players:[],
		currentPlayer:""
	};


	for(var cardName in cards)
	{
		if(isGoal(cardName))
		{
			games[key].goalDrawPile.push(cardName);
		}
		else if(isPony(cardName))
		{	
			games[key].ponyDrawPile.push(cardName)
		}
		else if(isShip(cardName))
		{
			games[key].shipDrawPile.push(cardName);
		}
	}

	randomizeOrder(games[key].goalDrawPile);
	randomizeOrder(games[key].ponyDrawPile);
	randomizeOrder(games[key].shipDrawPile);

	return key;
}

startGame("ABCDEF");

// Set up a headless websocket server that prints any
// events that come in.
const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', (socket, request, client) => 
{
	

	//console.log(request.url);

	var key = request.url.substring(2);
	if(!games[key])
	{
		console.log('no game')
		return;
	}

	


	socket.on('message', message => 
	{
		var isPlayerRegistered = isRegistered(key, socket);
		var model = games[key];

		console.log(message);

		if(message.startsWith("requestmodel;"))
		{
			var id = message.split(";")[1];

			console.log("sent id " + id)

			if(!isPlayerRegistered)
			{
				// check if there's a matching key
				for(var i=0; i < games[key].players.length; i++)
				{
					if(games[key].players[i].id == id)
					{
						games[key].players[i].socket = socket;
						isPlayerRegistered = true;
					}
				}

				if(!isPlayerRegistered) // TODO only let people register when game starts.
				{
					id = Math.floor(Math.random()*10**16);
					registerPlayer(key, socket, id);
					console.log("registering player with id " + id);
				}
			}


			model = JSON.parse(JSON.stringify(games[key]));
			
			model.goalDrawPileLength = model.goalDrawPile.length;
			model.ponyDrawPileLength = model.ponyDrawPile.length;
			model.shipDrawPileLength = model.shipDrawPile.length;

			delete model.players;
			delete model.order;
			delete model.goalDrawPile;
			delete model.ponyDrawPile;
			delete model.shipDrawPile;

			player = getPlayer(key, socket);

			model.hand = player.hand
			model.isItMyTurn = true;
			model.winnings = player.winnings;
			model.playerID = player.id

			socket.send("model;" + JSON.stringify(model));
		}

		if(!isPlayerRegistered) return;

		if(message.startsWith("draw;"))
		{
			var [_, typ] = message.split(";");

			if(typ != "ship" && typ != "pony" && typ != "goal")
				return;

			var len = model[typ + "DrawPile"].length;

			if(typ == "goal")
			{
				var goalNo = model.currentGoals.indexOf("blank:goal")

				if(len && goalNo > -1)
				{
					var card = model[typ + "DrawPile"].pop();
					model.currentGoals[goalNo] = card;

					var msg = "draw;" + typ + ";" + (len - 1);
					toEveryone(key, msg);
					toEveryone(key, "move;" + card + ";goalDrawPile;goal," + goalNo);
				}
			}
			else
			{
				if(len)
				{
					var card = model[typ + "DrawPile"].pop();

					getPlayer(key, socket).hand.push(card);

					var msg = "draw;" + typ + ";" + (len - 1);
					toEveryone(key, msg);
					socket.send("move;" + card + ";" + typ + "DrawPile;hand");
					toEveryoneElse(key, socket, "move;anon:" + typ + ";" + typ + "DrawPile;player");

				}
			}
		}

		if(message.startsWith("swapshuffle;"))
		{
			var [_,typ] = message.split(";");

			if(["pony","goal","ship"].indexOf(typ) > -1)
			{
				var swap = model[typ + "DrawPile"];
				model[typ+"DrawPile"] = model[typ+"DiscardPile"];
				model[typ+"DiscardPile"] = swap;

				randomizeOrder(model[typ+"DrawPile"]);

				toEveryone(key, ["swapshuffle", typ, model[typ+"DrawPile"].length, ...model[typ+"DiscardPile"]].join(";"));
			}

		}

		if(message.startsWith("move;"))
		{
			var [_,card,startLocation,endLocation] = message.split(";");

			//todo validate move

			// remove from old location
			if(startLocation == "hand")
			{
				var i = getPlayer(key, socket).hand.indexOf(card);
				getPlayer(key, socket).hand.splice(i, 1);
			}

			if(isBoardLoc(startLocation))
			{
				delete model.board[startLocation];
			}

			if(["ponyDiscardPile","shipDiscardPile","goalDiscardPile"].indexOf(startLocation) > -1)
			{
				var i = model[startLocation].indexOf(card);
				model[startLocation].splice(i,1);
				
			}

			if(isOffsetLoc(startLocation))
			{
				var [_,x,y] = startLocation.split(",")
				delete model.offsets[card + "," + x + "," + y];
			}

			if(isGoalLoc(startLocation))
			{
				var [_,i] = startLocation.split(",")
				model.currentGoals[i] = "blank:goal";
			}

			// move to end location

			if(endLocation == "hand")
			{
				getPlayer(key, socket).hand.push(card)
			}

			if(isBoardLoc(endLocation))
			{
				if(model.board[endLocation])
				{
					var [_,x,y] = endLocation.split(",")
					var offsetCard = model.board[endLocation].card
					model.offsets[offsetCard + "," + x + "," + y] = "";
				}

				model.board[endLocation] = {card: card}
			}

			if(endLocation == "winnings")
			{
				getPlayer(key, socket).winnings.push(card)
			}

			if(["ponyDiscardPile","shipDiscardPile","goalDiscardPile"].indexOf(endLocation) > -1)
			{
				model[endLocation].push(card);
			}

			// cant move to a goal location yet

			if(startLocation == "hand" || startLocation == "winnings")
				startLocation = "player";

			if(endLocation == "hand" || endLocation == "winnings")
				endLocation = "player";

			toEveryoneElse(key, socket, "move;" + card + ";" + startLocation + ";" + endLocation);
		}
	});

	socket.send("test")
});


function isRegistered(key, socket)
{
	for(var i=0; i < games[key].players.length; i++)
	{
		if(games[key].players[i].socket == socket)
		{
			return true;
		}
	}

	return false;
}

function registerPlayer(key, socket, id)
{
	
	if(!isRegistered(key, socket))
	{
		games[key].players.push({
			socket: socket,
			hand: [],
			winnings: [],
			id: id
		});
	}
}


function getPlayer(key, thissocket)
{
	for(var i=0; i < games[key].players.length; i++)
	{
		var socket = games[key].players[i].socket;

		if(socket == thissocket)
		{
			return games[key].players[i] 
		}
	}
}

function toEveryoneElse(key, thissocket, message)
{
	for(var i=0; i < games[key].players.length; i++)
	{
		var socket = games[key].players[i].socket;
		if(socket != thissocket)
		{
			socket.send(message);
		}
	}
}

function toEveryone(key, message)
{
	for(var i=0; i < games[key].players.length; i++)
	{
		var socket = games[key].players[i].socket;
	
		socket.send(message);
	}
}

// `server` is a vanilla Node.js HTTP server, so use
// the same ws upgrade process described here:
// https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server
const server = app.listen(8001);
server.on('upgrade', (request, socket, head) => {
	wsServer.handleUpgrade(request, socket, head, socket => {
		wsServer.emit('connection', socket, request);
	});
});

function isBoardLoc(location)
{
	return location.startsWith("p,") || location.startsWith("sr,") || location.startsWith("sd,");
}

function isOffsetLoc(location)
{
	return location.startsWith("offset,");
}

function isGoalLoc(location)
{
	return location.startsWith("goal,");
}

