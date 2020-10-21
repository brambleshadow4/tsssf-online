import ws from "ws";
import {
	randomizeOrder, 
	isGoal, 
	isPony, 
	isShip,
	isBoardLoc,
	isOffsetLoc,
	isGoalLoc,
	isDiscardLoc,
	isPlayerLoc
} from "./lib.js";

import cards from "./cards.js";
import {logGameHosted, logPlayerJoined} from "./stats.js";

export function TsssfGameServer()
{
	const wsServer = new ws.Server({ noServer: true });
	wsServer.games = {};
	wsServer.openLobby = openLobby;
	var games = wsServer.games;

	const interval = setInterval(function ping()
	{
		for(var key in games)
		{
			var anyPlayersAlive = false;
			for(var i=0; i < games[key].players.length; i++)
			{
				if(games[key].players[i].socket.isAlive)
				{
					anyPlayersAlive = true;
					break;
				}
			}

			if(!anyPlayersAlive)
			{
				
				games[key].deathCount++;

				if(games[key].deathCount >= 4)
				{
					delete games[key];
				}
			}
			else
			{
				games[key].deathCount = 0;
			}
		}

	}, 15000);

	wsServer.getStats = function()
	{
		var stats = {games:0, players:0}
		for(var key in games)
		{
			stats.games++;
			stats.players += games[key].players.length;
		}

		return stats;
	}


	

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

	function checkNameIsUnique(key, name)
	{
		console.log('checking ' + name);
		for(var i=0; i < games[key].players.length; i++)
		{
			if(games[key].players[i].name == name)
			{
				console.log("found duplicate name");
				return false;
			}
		}

		console.log("all good");

		return true;
	}

	function registerPlayer(key, socket, name)
	{
		var count = 0;
		var newName = name;

		var player = getPlayer(key,socket)

		if(player)
		{	

			if(player.name == "")
			{
				name = name || "Player";
				while(!checkNameIsUnique(key, newName))
				{
					console.log(newName);
					count++;
					newName = name + count;
				}

				logPlayerJoined();
			}
			
			player.name = newName;
			socket.send("registered;" + player.id)
			return;
		}

		
		var id = Math.floor(Math.random()*10**16);

		games[key].players.push({
			socket: socket,
			hand: [],
			winnings: [],
			id: id,
			name: ""
		});
	}



	function sendPlayerList(key)
	{
		var msg = "playerlist;" + games[key].players.filter(x => x.socket.isAlive)
			.map(x => x.name).join(";");
		toEveryone(key, msg);
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
			if(socket != thissocket && socket.isAlive)
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
			
			if(socket.isAlive)
				socket.send(message);
		}
	}	

	function getPlayerModel(key, socket)
	{
		var model = {};

		model.board = games[key].board;
		model.cardDecks = games[key].cardDecks;

		console.log("cardDecks " +games[key].cardDecks);

		model.offsets = games[key].offsets;
		model.ponyDiscardPile = games[key].ponyDiscardPile;
		model.shipDiscardPile = games[key].shipDiscardPile;
		model.goalDiscardPile = games[key].goalDiscardPile;

		model.currentGoals = games[key].currentGoals;

		model.goalDrawPileLength = games[key].goalDrawPile.length;
		model.ponyDrawPileLength = games[key].ponyDrawPile.length;
		model.shipDrawPileLength = games[key].shipDrawPile.length;

		var player = getPlayer(key, socket);

		model.hand = player.hand;
		model.winnings = player.winnings;

		model.playerName = player.name;
		model.players = [];

		for(var i=0; i < games[key].players.length; i++)
		{
			let other = games[key].players[i];
			if(other != player)
			{
				model.players.push({
					name: other.name,
					ponies: other.hand.filter(x => isPony(x)).length,
					ships: other.hand.filter(x => isShip(x)).length,
					winnings: other.winnings
				});
			}
		}

		return model;
	}

	function sendCurrentState(key, socket)
	{
		var model = getPlayerModel(key, socket);
		socket.send("model;" + JSON.stringify(model));
	}


	function openLobby(key)
	{
		if(!key)
		{
			do
			{
				var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				key = "";

				for(var i=0; i< 6; i++)
				{
					key += letters[Math.floor(Math.random() * 26)]
				}
			}
			while(games[key] !== undefined)
		}
		
		games[key] = {
			deathCount: 0,
			isLobbyOpen: true,
			allowInGameRegistration: false,
			players: []
		}

		return key;
	}

	function startGame(key, options)
	{	
		var model = games[key];
		model.cardLocations = {};
		model.board = {
			"p,0,0":{
				card: "Core.Start.FanficAuthorTwilight"
			}
		};
		model.offsets = {};

		model.cardLocations["Core.Start.FanficAuthorTwilight"] = "p,0,0";

		var decks = "^Core\\.";
		if(options.cardDecks)
		{
			var allowedDecks = ["PU","EC"]
			var decks = options.cardDecks.filter( x => allowedDecks.indexOf(x) > -1);
			decks.push("Core");

			decks = decks.map(x => "^" + x + "\\.").join("|");
		}

		model.cardDecks = decks;
		

		model.goalDiscardPile = [];
		model.ponyDiscardPile = [];
		model.shipDiscardPile = [];

		model.currentGoals = ["blank:goal","blank:goal","blank:goal"];

		// client only props
		//     hand:
		//     winnings

		// private props
		model.goalDrawPile = [];
		model.ponyDrawPile = [];
		model.shipDrawPile = [];

		model.currentPlayer = "";

		logGameHosted();

		var re = new RegExp(model.cardDecks);

		for(var cardName in cards)
		{
			if(!re.exec(cardName))
				continue;

			if(isGoal(cardName))
			{
				model.goalDrawPile.push(cardName);
				model.cardLocations[key] = "goalDrawPile";
			}
			else if(isPony(cardName))
			{	
				model.ponyDrawPile.push(cardName);
				model.cardLocations[key] = "ponyDrawPile";
			}
			else if(isShip(cardName))
			{
				model.shipDrawPile.push(cardName);
				model.cardLocations[key] = "shipDrawPile";
			}
		}

		// remove players which disconnected before the games started
		for(var i=0; i<model.players.length; i++)
		{
			if(model.players[i].name == "" || !model.players[i].socket.isAlive)
			{
				model.players.splice(i,1);
				i--;
			}
		}

		randomizeOrder(model.players);
		randomizeOrder(model.goalDrawPile);
		randomizeOrder(model.ponyDrawPile);
		randomizeOrder(model.shipDrawPile);

		return key;
	}

	function isLocOccupied(key, loc)
	{
		var model = games[key];
		if(isBoardLoc(loc))
		{
			return (model.board[loc] != undefined)
		}

		return false;
	}

	function sendPlayerCounts(key, player)
	{
		//console.log(player);
		var ponies = player.hand.filter(x => isPony(x)).length;
		var ships = player.hand.filter(x => isShip(x)).length;


		var args = ["counts", player.name, ponies, ships, ...player.winnings]
		toEveryoneElse(key, player.socket, args.join(";"));
	}

	//startGame("dev");
	//games["dev"].allowInGameRegistration = true;

	wsServer.on('connection', (socket, request, client) => 
	{
		socket.isAlive = true;

		var key = request.url.substring(2);
		if(!games[key])
		{
			socket.send("closed;");
			socket.terminate();
			return;
		}

		sendPlayerList(key);	

		socket.on('close', () =>
		{
			socket.isAlive = false;

			if(games[key].isLobbyOpen)
			{
				for(var i=0; i < games[key].players.length; i++)
				{
					if(socket == games[key].players[i].socket)
					{
						games[key].players.splice(i, 1);
						break;
					}
				}

				if(games[key].host == socket)
				{
					if(games[key].players.length)
					{
						games[key].host = games[key].players[0].socket;
						games[key].players[0].socket.send("ishost;1");
					}
					else
					{
						delete games[key].host;
					}
				}
			}
			
			sendPlayerList(key);
		})

		socket.on('message', message => 
		{
			var isPlayerRegistered = isRegistered(key, socket);
			var model = games[key];

			if(model.isLobbyOpen)
			{
				if(message.startsWith("ishost;"))
				{
					if(!model.host || model.host == socket)
					{
						model.host = socket;
						socket.send("ishost;1");
					}
					else
					{
						socket.send("ishost;0");
					}			
				}

				if(message.startsWith("startgame;"))
				{
					var options = {cardDecks:[]};
					try 
					{
						options = JSON.parse(message.substring(10))
					}
					catch(e){ }

					if(model.host == socket)
					{
						model.isLobbyOpen = false;
						startGame(key, options);
						toEveryone(key, "startgame;");
					}		
				}


				if(message.startsWith("register;"))
				{
					var [_,id,name] = message.split(";");
					name = (name || "").replace(/[^A-Za-z0-9 _]/g,"");
					

					registerPlayer(key, socket, name);
					sendPlayerList(key);
				}
			}


			if(message.startsWith("requestmodel;"))
			{
				var id = message.split(";")[1];

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
				}

				if(!isPlayerRegistered)
				{
					if(games[key].allowInGameRegistration)
						registerPlayer(key, socket, "player");
					else
						return;
				}
		

				return sendCurrentState(key, socket);
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
						model.cardLocations[card] = "goal," + goalNo;

						var msg = "draw;" + typ + ";" + (len - 1);
						toEveryone(key, msg);
						toEveryone(key, "move;" + card + ";goalDrawPile;goal," + goalNo);
					}
					else
						return ;//sendCurrentState(key, socket);
				}
				else
				{
					if(len)
					{
						var card = model[typ + "DrawPile"].pop();

						var player = getPlayer(key, socket)
						player.hand.push(card);
						model.cardLocations[card] = "player," + player.name;

						var msg = "draw;" + typ + ";" + (len - 1);
						toEveryone(key, msg);
						socket.send("move;" + card + ";" + typ + "DrawPile;hand");
						toEveryoneElse(key, socket, "move;anon:" + typ + ";" + typ + "DrawPile;player," + player.name);
					
						sendPlayerCounts(key, player);
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

					for(var arr of ["ponyDrawPile","shipDrawPile","goalDrawPile","ponyDiscardPile","shipDiscardPile","goalDiscardPile"])
					{
						console.log(arr);
						for(var card of model[arr])
						{
							model.cardLocations[card] = arr + ",stack";
						}
					}

					var pileArr = model[typ+"DiscardPile"];
					if(pileArr.length >0)
					{
						var topCard = pileArr[pileArr.length-1];
						model.cardLocations[topCard] = typ+"DiscardPile,top";
					}
					

					toEveryone(key, ["swapshuffle", typ, model[typ+"DrawPile"].length, ...model[typ+"DiscardPile"]].join(";"));
				}
			}

			if(message.startsWith("move;"))
			{
				var [_,card,startLocation,endLocation] = message.split(";");
				var player = getPlayer(key, socket);

				//console.log(message);

				let serverStartLoc = startLocation;
				if(startLocation == "hand")
					serverStartLoc = "player," + player.name;


				// if the player has an incorrect position for a card, move it to where it actually should be.
				if(model.cardLocations[card] != serverStartLoc || isLocOccupied(key, endLocation))
				{
					var whereThePlayerThinksTheCardIs = endLocation;
						


					var whereTheCardActuallyIs = model.cardLocations[card];
					if(whereTheCardActuallyIs == "player," + player.name)
						whereTheCardActuallyIs = "hand";


					console.log("X " + message);
					console.log("  P: " + player.name);

					console.log("  whereTheCardActuallyIs = " + whereTheCardActuallyIs);
					//console.log("move;" + card + ";" + whereThePlayerThinksTheCardIs + ";" + whereTheCardActuallyIs);
					socket.send("move;" + card + ";" + whereThePlayerThinksTheCardIs + ";" + whereTheCardActuallyIs);

					return;
				}

				console.log("\u221A " + message);
				console.log("  P: " + player.name);


				let serverEndLoc = endLocation;
				if(serverEndLoc == "hand" || serverEndLoc == "winnings")
					serverEndLoc = "player," + player.name;

				model.cardLocations[card] = serverEndLoc;

				// remove from old location
				if(startLocation == "hand")
				{
					var i = getPlayer(key, socket).hand.indexOf(card);
					

					getPlayer(key, socket).hand.splice(i, 1);
				}

				if(isBoardLoc(startLocation))
				{
					if(model.board[startLocation] && model.board[startLocation].card == card)
						delete model.board[startLocation];
				}

				if(isDiscardLoc(startLocation))
				{
					var [pile,slot] = startLocation.split(",");
					var i = model[pile].indexOf(card);
					model[pile].splice(i,1);

					if(model[pile].length)
					{
						var topCard = model[pile][model[pile].length-1]
						model.cardLocations[topCard] = pile+",top";
					}
				}

				if(isOffsetLoc(startLocation))
				{
					var [_,x,y] = startLocation.split(",")
					if(model.offsets[card + "," + x + "," + y] != undefined)
					{
						delete model.offsets[card + "," + x + "," + y];
					}
				}

				if(isGoalLoc(startLocation))
				{
					var [_,i] = startLocation.split(",")
					if(model.currentGoals[i] != "blank:goal")
						model.currentGoals[i] = "blank:goal";
					
				}

				// move to end location

				if(endLocation == "hand")
				{
					getPlayer(key, socket).hand.push(card)
				}

				if(isBoardLoc(endLocation))
				{
					model.board[endLocation] = {card: card}
				}
				if(isOffsetLoc(endLocation))
				{
					var [_,x,y] = endLocation.split(",")
					model.offsets[card + "," + x + "," + y] = "";
				}

				if(endLocation == "winnings")
				{
					player.winnings.push(card)
				}

				if(isDiscardLoc(endLocation))
				{
					// the only valid placement is on top of the discard pile
					var [pile,slot] = endLocation.split(",");
					model[pile].push(card);

					if(model[pile].length > 1)
					{
						var underCard = model[pile][model[pile].length-2];
						model.cardLocations[underCard] = pile + ",stack";
					}
				}

			
				// cant move to a goal location yet

				//setTimeout(function(){

				socket.send("move;" + card + ";" + startLocation + ";" + endLocation);

				if(startLocation == "hand" || startLocation == "winnings")
					startLocation = "player,"+player.name;

				if(endLocation == "hand" || endLocation == "winnings")
					endLocation = "player,"+player.name;

				toEveryoneElse(key, socket, "move;" + card + ";" + startLocation + ";" + endLocation);


				if(isPlayerLoc(endLocation) || isPlayerLoc(startLocation))
				{
					sendPlayerCounts(key, player);
				}


				if(isDiscardLoc(startLocation) && !isDiscardLoc(endLocation))
				{
					var [pile,slot] = startLocation.split(",");
					if(model[pile].length)
					{
						var topCard = model[pile][model[pile].length-1]
						toEveryone(key, "move;" + topCard + ";" + pile + ",stack;" + pile + ",top");
					}
				}

				//}, 5000)
			}
		});
	});

	return wsServer;
}
