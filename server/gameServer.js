import ws from "ws";
import {
	randomizeOrder, 
	isGoal, 
	isPony, 
	isShip,
	isBoardLoc,
	isOffsetLoc,
	isGoalLoc
} from "./lib.js";

import cards from "./cards.js";

export function TsssfGameServer()
{

	const wsServer = new ws.Server({ noServer: true });
	wsServer.games = {};
	wsServer.startGame = startGame;

	var games = wsServer.games;

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

		while(!checkNameIsUnique(key, newName))
		{
			console.log(newName);
			count++;
			newName = name + count;
		}

		var player = getPlayer(key,socket)

		if(player)
		{	
			socket.send("registered;" + player.id)
			return;
		}

		
		var id = Math.floor(Math.random()*10**16);

		games[key].players.push({
			socket: socket,
			hand: [],
			winnings: [],
			id: id,
			name: newName
		});

		socket.send("registered;" + id);
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

	function getPlayerModel(key, socket)
	{
		var model = {};

		model.board = games[key].board;
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

		return model;
	}

	function startGame(key)
	{
		if(!key)
		{
			var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			key = "";

			for(var i=0; i< 6; i++)
			{
				key += letters[Math.floor(Math.random() * 26)]
			}
		}
		
		games[key] = {

			isLobbyOpen: true,
			allowInGameRegistration: false,
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

	startGame("dev");
	games["dev"].allowInGameRegistration = true;


	wsServer.on('connection', (socket, request, client) => 
	{
		console.log(request.url);

		var key = request.url.substring(2);
		if(!games[key])
		{
			console.log('no game')
			return;
		}

		var msg = "playerlist;" + games[key].players.map(x => x.name).join(";");
		socket.send(msg);


		socket.on('message', message => 
		{
			var isPlayerRegistered = isRegistered(key, socket);
			var model = games[key];

			console.log(message);

			


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
				if(model.host == socket)
				{
					model.isLobbyOpen = false;
					toEveryone(key, "startgame;");
				}		
			}


			if(message.startsWith("register;"))
			{
				var [_,id,name] = message.split(";");

				var name = name.replace(/[^A-Za-z0-9 _]/g,"");

				registerPlayer(key, socket, name);

				var msg = "playerlist;" + games[key].players.map(x => x.name).join(";");

				toEveryone(key, msg);
			}


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
				}

				if(!isPlayerRegistered)
				{
					if(games[key].allowInGameRegistration)
						registerPlayer(key, socket, "player");
					else
						return;
				}
		

				model = getPlayerModel(key, socket);
				
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
	});

	return wsServer;
}




