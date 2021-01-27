import ws from "ws";
import * as util from 'util'
import fs from "fs";
import {
	randomizeOrder, 
	isGoal, 
	isPony, 
	isShip,
	isBoardLoc,
	isOffsetLoc,
	isGoalLoc,
	isDiscardLoc,
	isPlayerLoc,
	isBlank,
	isCardIncluded,
	getNeighborKeys
} from "./lib.js";

//import  from "./goalCriteria.js";
import {evalGoalCard, getConnectedPonies} from "./goalCriteria.js"

import cards from "./cards.js";
import {logGameHosted, logPlayerJoined} from "./stats.js";


var PROP_VALUES = {

	"gender":{
		"male":1,
		"female":1,
	},
	"altTimeline":{
		"true": 1,
	},
	"doublePony":{
		"true": 1,
	},
	"race":{
		"earth": 1,
		"unicorn":1, 
		"pegasus": 1,
		"alicorn": 1
	}
}


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
		var startTime
		for(var key in games)
		{
			if(games[key].isInGame)
			{
				stats.games++;
				stats.players += games[key].players.filter(x => x.socket.isAlive).length;

				if(startTime == undefined)
					startTime = games[key].startTime;
				else
					startTime = Math.max(games[key].startTime, startTime);
			}
		}

		if(startTime)
			stats.startTime = startTime;

		return stats;
	}

	var TEMP_DISCONNECT_TIME = 15*1000;

	function isRegistered(player)
	{
		return player != undefined && player.name != "";
	}

	function checkNameIsUnique(key, name)
	{
		for(var i=0; i < games[key].players.length; i++)
		{
			if(games[key].players[i].name == name)
			{
				return false;
			}
		}

		return true;
	}

	function addPlayerConnection(key, socket)
	{
		var player = getPlayer(key,socket)

		if(!player)
		{
			player = {
				socket: socket,
				hand: [],
				winnings: [],
				id: 0,
				name: ""
			}

			games[key].players.push(player);
		}

		return player;
	}

	function registerPlayerName(key, socket, name)
	{
		var count = 0;
		var newName = name;

		var player = getPlayer(key,socket)

		if(!player)
		{
			player = addPlayerConnection(key, socket);
		}

		name = name || "Player";
		while(!checkNameIsUnique(key, newName))
		{
			count++;
			newName = name + count;
		}

		
		player.id = Math.floor(Math.random()*10**16)+1;


		//if(player.name == "")
		//	logPlayerJoined();

		player.name = newName;

		socket.send("registered;" + player.id)
		return;
	}

	function sendLobbyList(key)
	{
		var allPlayers = games[key].players.filter(x => x.socket.isAlive)
			.map(x => x.name).join(",");


		for(var player of games[key].players)
		{
			player.socket.send("lobbylist;" + player.name + ";" + allPlayers);
		}
	}

	function getPlayer(key, thissocket, id)
	{
		if(!games[key]) return;

		for(var i=0; i < games[key].players.length; i++)
		{
			var socket = games[key].players[i].socket;

			if(socket == thissocket || Number(games[key].players[i].id) == Number(id))
			{
				if(socket != thissocket)
					 games[key].players[i].socket = thissocket;

				return games[key].players[i] 
			}
		}
	}

	function getPlayerByName(key, name)
	{
		for(var i=0; i < games[key].players.length; i++)
		{
			if(name == games[key].players[i].name)
			{
				return games[key].players[i] 
			}
		}
	}

	function getPlayerIndex(key, thissocket)
	{
		for(var i=0; i < games[key].players.length; i++)
		{
			var socket = games[key].players[i].socket;

			if(socket == thissocket)
			{
				return i;
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

		model.players = getPlayerListForThisPlayer(key, socket)

		if(games[key].turnstate)
		{
			model.turnstate = games[key].turnstate.clientProps();
		}

		model.keepLobbyOpen = games[key].isLobbyOpen;

		model.startCard = games[key].startCard;

		return model;
	}

	function getPlayerListForThisPlayer(key, socket)
	{
		var playerCount = games[key].players.length 
		var players = [];

		if(playerCount > 1)
		{
			var playerIndex = getPlayerIndex(key, socket);

			for(var i=(playerIndex+1) % playerCount; i != playerIndex; i = ((i + 1) % playerCount))
			{
				let other = games[key].players[i];
				
				if(other.name != "") // Players who are still registering have a name of ""
				{
					players.push({
						name: other.name,
						disconnected: !other.socket.isAlive,
						ponies: other.hand.filter(x => isPony(x)).length,
						ships: other.hand.filter(x => isShip(x)).length,
						winnings: other.winnings
					});
				}
			}
		}

		return players;
	}

	function sendPlayerlistsToEachPlayer(key)
	{
		for(var player of games[key].players)
		{
			if(player.socket.isAlive && player.name != "")
			{
				var playerlist = getPlayerListForThisPlayer(key, player.socket);
				player.socket.send("playerlist;" + JSON.stringify(playerlist))
			}
		}
	}

	function sendHostMessage(key, socket, isHost)
	{
		if(!isHost)
			var payload = "0"
		else
			var payload = JSON.stringify({
				cardDecks: games[key].cardDecks,
				startCard: games[key].startCard,
				ruleset: games[key].ruleset,
				keepLobbyOpen: games[key].keepLobbyOpen
			})

		socket.send("ishost;" + payload)
	}

	function sendCurrentState(key, socket)
	{
		var model = getPlayerModel(key, socket);
		socket.send("model;" + JSON.stringify(model));
	}

	function checkIfGoalsWereAchieved(key)
	{
		var model = games[key];

		if(!model.runGoalLogic)
			return;

		var sendUpdate = false;

		for(var goalInfo of model.currentGoals)
		{
			var achieved = false;

			if(!isBlank(goalInfo.card))
				achieved = evalGoalCard(goalInfo.card, model)

			if(goalInfo.achieved != achieved)
			{
				sendUpdate = true;
			}

			goalInfo.achieved = achieved;
		}

		if(sendUpdate)
		{
			toEveryone(key, "goalachieved;" + model.currentGoals.map(x => x.achieved ? "1" : "").join(";"));
		}
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
			messageHistory: [],
			cardDecks: ["Core.*"],
			startCard: "Core.Start.FanficAuthorTwilight",
			deathCount: 0,
			isLobbyOpen: true,
			isInGame: false,
			allowInGameRegistration: false,
			players: []
		}

		return key;
	}

	function shipString(card1,card2)
	{
		if(card1 < card2)
			return card1 + "/" + card2

		return card2 + "/" + card1;
	}

	function Turnstate(model, currentPlayerName)
	{	
		this.currentPlayer = currentPlayerName;
		this.overrides = {};
		this.tentativeShips = {};
		this.playedShips = [];
		this.playedPonies = [];

		this.triggerShip = "";

		this.brokenShips = [];
		this.brokenShipsNow = [];

		this.changelingContexts = {};

		//getCurrentShipSet is still using the old changelingContexts, clear them first.
		if(model.turnstate && model.turnstate.changelingContexts)
			model.turnstate.changelingContexts = {};
		
		this.shipSet = getCurrentShipSet(model);
		this.positionMap = getCurrentPositionMap(model);
		this.swaps = 0;
		this.swapsNow = 0;
		

		this.clientProps = function()
		{
			return {
				overrides: this.overrides,
				currentPlayer: this.currentPlayer
			}
		}
	}

	function isShipClosed(model, shipLoc)
	{
		return getShippedPonies(model, shipLoc).length == 2;
	}

	function getPoniesShippedToPony(model, ponyCard)
	{
		var ponyLoc = model.cardLocations[ponyCard];
		if(!isBoardLoc(ponyLoc))
			return [];

		var neighborLocs = getNeighborKeys(ponyLoc);

	}

	function getShippedPonies(model, shipLoc)
	{
		var neighbors = getNeighborKeys(shipLoc);

		var shipClosed = true;
		var ponies = [];
		for(var n of neighbors)
		{
			if(model.board[n] && !isBlank(model.board[n].card))
			{
				var card = model.board[n].card;

				if(model.turnstate && isChangeling(model.board[n].card))
				{
					var changelingContexts = model.turnstate.changelingContexts[card];
					var currentChangelingContext =  changelingContexts ? Math.max(changelingContexts.length - 1, 0) : 0
					card = card + ":" + currentChangelingContext;
				}

				ponies.push(card)
			}
		}

		return ponies;
	}

	function startGame(key, options)
	{	
		var model = games[key];

		// remove players which disconnected before the games started
		for(var i=0; i<model.players.length; i++)
		{
			if(model.players[i].name == "" || !model.players[i].socket.isAlive)
			{
				model.players.splice(i,1);
				i--;
			}
		}

		if(model.players.length == 0)
			return false;


		model.startTime = new Date().getTime();

		model.startCard = options.startCard || "Core.Start.FanficAuthorTwilight";

		model.cardLocations = {};
		model.board = {
			"p,0,0":{
				card: model.startCard
			}
		};

		for(var player of model.players)
		{
			player.hand = [];
			player.winnings = [];
		}

		model.isInGame = true;

		model.runGoalLogic = options.startCard != "HorriblePeople.2015ConExclusives.Start.FanficAuthorDiscord" && options.ruleset == "turnsOnly";

		model.isLobbyOpen = model.keepLobbyOpen = !!options.keepLobbyOpen;


		model.cardLocations[model.startCard] = "p,0,0";

		var decks = ["Core.*"];
		if(options.cardDecks)
		{
			//var allowedDecks = ["PU.*","EC.*"]
			var decks = options.cardDecks; //.filter( x => allowedDecks.indexOf(x) > -1);
			//decks.push("Core.*");
		}

		model.cardDecks = decks;
		
		model.goalDiscardPile = [];
		model.ponyDiscardPile = [];
		model.shipDiscardPile = [];

		model.currentGoals = [
			{card:"blank:goal", achieved: false},
			{card:"blank:goal", achieved: false},
			{card:"blank:goal", achieved: false}
		];

		// client only props
		//     hand:
		//     winnings

		// private props
		model.goalDrawPile = [];
		model.ponyDrawPile = [];
		model.shipDrawPile = [];



		

		logGameHosted();

		for(var i of model.players.filter(x => isRegistered(x)))
		{
			logPlayerJoined();
		}

		var re = new RegExp(model.cardDecks);

		for(var cardName in cards)
		{
			if(!isCardIncluded(cardName, model))
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

		

		randomizeOrder(model.players);

		model.ruleset = options.ruleset.substring(0,200);

		if(options.ruleset == "turnsOnly")
		{
			model.turnstate = new Turnstate(model, model.players[0].name);
		}
		else
		{
			delete model.turnstate;
		}

		randomizeOrder(model.goalDrawPile);
		randomizeOrder(model.ponyDrawPile);
		randomizeOrder(model.shipDrawPile);

		return key;
	}

	function isLocOccupied(key, loc)
	{
		var model = games[key];
		if(isBoardLoc(loc) || isOffsetLoc(loc))
		{

			return (model.board[loc] != undefined)
		}
		if(isGoalLoc(loc))
		{
			var goalNo = Number(loc.split(",")[1]);

			if(model.currentGoals[goalNo] == undefined)
				return false;

			return model.currentGoals[goalNo].card != "blank:goal"
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

	function isChangeling(card)
	{
		card = card.split(":")[0];
		return isPony(card) && cards[card] && cards[card].action && cards[card].action.startsWith("Changeling(");
	}

	function getCurrentShipSet(model)
	{
		var s = new Set();
		for(var key in model.board)
		{
			if (key.startsWith("s"))
			{
				var pair = getShippedPonies(model, key);

				if(pair.length == 2)
				{	
					s.add(shipString(pair[0], pair[1]));
				}
			}
		}

		return s;
	}

	function getCurrentPositionMap(model)
	{
		var map = {};

		for(var key in model.board)
		{
			if (key.startsWith("p,") && !isBlank(model.board[key].card))
			{
				map[model.board[key].card] = key;
			}
		}

		return map;

	}


	function getBrokenShips(startSet, endSet)
	{
		var broken = [];

		for(var ship of startSet)
		{
			if(!endSet.has(ship))
			{
				broken.push(ship.split("/"));
			}
		}

		return broken;
	}

	function getSwappedCount(startPositions, endPositions)
	{
		var count = 0;
		for(var key in startPositions)
		{
			if(endPositions[key] && endPositions[key] != startPositions[key])
			{
				count++;
			}
		}

		return count;
	}


	function changeTurnToNextPlayer(key)
	{
		if(!games[key].turnstate)
			return;

		var rotation = games[key].players.filter(x => !x.socket.isDead && x.name != "");

		if(rotation.length == 0)
			return;

		var k = rotation.map(x=> x.name).indexOf(games[key].turnstate.currentPlayer);
		k = (k+1)%rotation.length;

		games[key].turnstate = new Turnstate(games[key], rotation[k].name);
		toEveryone(key, "turnstate;" + JSON.stringify(games[key].turnstate.clientProps()));

		checkIfGoalsWereAchieved(key);
	}

	function moveCard(message, key, socket)
	{
		var [_,card,startLocation,endLocation] = message.split(";");
		var player = getPlayer(key, socket);

		var model = games[key];

		let serverStartLoc = startLocation;
		if(startLocation == "hand" || startLocation == "winnings")
			serverStartLoc = "player," + player.name;


		// if the player has an incorrect position for a card, move it to where it actually should be.
		if(model.cardLocations[card] != serverStartLoc || isLocOccupied(key, endLocation))
		{						
			var whereTheCardActuallyIs = model.cardLocations[card];
			if(whereTheCardActuallyIs == "player," + player.name)
			{
				if(isGoal(card))
					whereTheCardActuallyIs = "winnings";
				else
					whereTheCardActuallyIs = "hand";
			}

			console.log("X " + message);
			console.log("  P: " + player.name);

			console.log("  whereTheCardActuallyIs = " + whereTheCardActuallyIs);
			console.log("  move;" + card + ";limbo;" + whereTheCardActuallyIs);
			socket.send("move;" + card + ";limbo;" + whereTheCardActuallyIs);

			return;
		}

		console.log("\u221A " + message);
		console.log("  P: " + player.name);


		if(model.turnstate)
		{
			if(isChangeling(card) && isBoardLoc(endLocation))
			{
				//model.turnstate.morphCounters[card] = (model.turnstate.morphCounters[card] || 0) + 1;
			}
		}


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

		if(startLocation == "winnings")
		{
			var i = getPlayer(key, socket).winnings.indexOf(card);
			getPlayer(key, socket).winnings.splice(i, 1);
		}

		if(isBoardLoc(startLocation) || isOffsetLoc(startLocation))
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

		if(isGoalLoc(startLocation))
		{
			var [_,i] = startLocation.split(",")
			if(model.currentGoals[i].card != "blank:goal")
				model.currentGoals[i].card = "blank:goal";
			
		}

		// move to end location

		if(endLocation == "hand")
		{
			getPlayer(key, socket).hand.push(card)
		}

		if(isBoardLoc(endLocation) || isOffsetLoc(endLocation))
		{
			model.board[endLocation] = {card: card}
		}

		if(isGoalLoc(endLocation))
		{
			var [_,goalNo] = endLocation.split(",")
			goalNo = Number(goalNo);
			model.currentGoals[goalNo].card = card;
			model.cardLocations[card] = "goal," + goalNo;
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


		if(isPony(card) 
			&& (startLocation == "hand" || startLocation == "ponyDiscardPile,top")
			&& isBoardLoc(endLocation))
		{
			if(model.turnstate)
			{

				var cardName = card;

				if(isChangeling(card))
				{
					var changelingContexts = model.turnstate.overrides[card]
					var currentChangelingContext = changelingContexts ? Math.max(changelingContexts.length - 1, 0) : 0
					cardName = card + ":" + currentChangelingContext;
				}

				model.turnstate.playedPonies.push(cardName);
			}
		}


		if(model.turnstate)
		{
			var newSet = getCurrentShipSet(model);
			var newlyBroken = getBrokenShips(model.turnstate.shipSet, newSet);

			model.turnstate.brokenShipsNow = model.turnstate.brokenShips.concat(newlyBroken);


			var curPositionMap = getCurrentPositionMap(model);
			var newlySwapped = getSwappedCount(model.turnstate.positionMap, curPositionMap)

			model.turnstate.swapsNow = model.turnstate.swaps + newlySwapped;

			// ship slide next to a changeling card rollback
			if(isBoardLoc(endLocation) && isChangeling(card))
			{			
				if(!model.turnstate.changelingContexts[card])
					model.turnstate.changelingContexts[card] = [];

				model.turnstate.changelingContexts[card].rollback = getConnectedPonies(model, endLocation);
			}




			if(startLocation == "hand" || 
				startLocation == "shipDiscardPile,top" || startLocation == "ponyDiscardPile,top"
				|| endLocation == "shipDiscardPile,top" || endLocation == "ponyDiscardPile,top")
			{
				// update

				model.turnstate.brokenShips = model.turnstate.brokenShipsNow;
				model.turnstate.shipSet = newSet;
				model.turnstate.swaps = model.turnstate.swapsNow;
				model.turnstate.positionMap = curPositionMap;
			}

			if(isShip(card)
				&& (startLocation == "hand" || startLocation == "shipDiscardPile,top")
				&& isBoardLoc(endLocation))
			{

				if(isShipClosed(model, endLocation))
				{

					var shippedPonies = getShippedPonies(model, endLocation);

					model.turnstate.playedShips.push([card].concat(shippedPonies));
					delete model.turnstate.tentativeShips[card];

					// add changeling rollback

					/*var noCtxShipped = shippedPonies.map(x => x.split(":")[0]);
					
					if(isChangeling(noCtxShipped[0]))
					{
						if(!model.turnstate.changelingContexts[noCtxShipped[0]])
							model.turnstate.changelingContexts[noCtxShipped[0]] = [];

						model.turnstate.changelingContexts[noCtxShipped[0]].rollback = [shippedPonies[1]]
					}

					if(isChangeling(noCtxShipped[1]))
					{
						if(!model.turnstate.changelingContexts[noCtxShipped[1]])
							model.turnstate.changelingContexts[noCtxShipped[1]] = [];

						model.turnstate.changelingContexts[noCtxShipped[1]].rollback = [shippedPonies[0]];
					}*/
				}
				else
				{
					model.turnstate.tentativeShips[card] = true;
				}

			}

			if(isPony(card) && isBoardLoc(endLocation))
			{

				for(var tentativeShip in model.turnstate.tentativeShips)
				{
					var shipLoc = model.cardLocations[tentativeShip];

					if(!shipLoc || !isBoardLoc(shipLoc))
					{
						delete model.turnstate.tentativeShips[tentativeShip];
						continue;
					}

					if(isShipClosed(model, shipLoc))
					{
						model.turnstate.playedShips.push([tentativeShip].concat(getShippedPonies(model, shipLoc)));
						delete model.turnstate.tentativeShips[tentativeShip];
					}
				}
	
			}
		}


		// cant move to a goal location yet

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

		
		checkIfGoalsWereAchieved(key);
	}


	function handleCrash(fun)
	{
		return function(...args)
		{
			try {
				fun(...args) 
			}
			catch(e)
			{
				var now = new Date();

				function pad(n)
				{
					if(n < 10)
						return "0" + n
					else 
						return "" + n
				}

				var s = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + (now.getDate()) + " " + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds())

				var data = [];

				data.push(e.toString())
				data.push(e.stack)
				data.push("")
				data.push("GAMES")
				data.push(util.inspect(games, {depth:Infinity}))

				fs.writeFileSync("CRASH " + s + ".txt", data.join("\n"))
				throw e
			}
		}
	}

	//startGame("dev");
	//games["dev"].allowInGameRegistration = true;

	function onConnection(socket, request, client)
	{
		socket.isAlive = true;
		socket.isDead = false;

		let key = request.url.substring(2);
		if(!games[key])
		{
			socket.send("closed;");
			socket.terminate();
			return;
		}

		sendLobbyList(key);	

		function onClose()
		{
			if(!games[key]) return;

			socket.isAlive = false;

			let player = getPlayer(key, socket)
			let deadName = player ? player.name : "";

			// mark the socket as dead after 15 s. 
			setTimeout(() => {

				socket.isDead = true;
				let player = getPlayerByName(key, deadName);

				if(player == undefined || (player && player.socket == socket))
				{
					let curPlayerName = games[key] && games[key].turnstate && games[key].turnstate.currentPlayer;

					if(curPlayerName == deadName)
					{
						changeTurnToNextPlayer(key);
					}
				}

			}, TEMP_DISCONNECT_TIME); 

			if(games[key].host == socket)
			{
				var connectedPlayers = games[key].players.filter(x => x.socket.isAlive);

				if(games[key].isInGame)
					connectedPlayers = connectedPlayers.filter(x => isRegistered(x))

				if(connectedPlayers.length)
				{
					games[key].host = connectedPlayers[0].socket;
					sendHostMessage(key, games[key].host, true)
				}
				else
				{
					delete games[key].host;
				}
			}


			if(games[key].isLobbyOpen && !games[key].isInGame)
			{
				for(var i=0; i < games[key].players.length; i++)
				{
					if(socket == games[key].players[i].socket)
					{
						games[key].players.splice(i, 1);
						break;
					}
				}

				sendLobbyList(key);
			}

			if(games[key].isInGame)
			{
				sendPlayerlistsToEachPlayer(key);
			}
		}

		socket.on('close', handleCrash(onClose));

		function onMessage(message)
		{
			console.log(message);

			var model = games[key];
			if(!model) // not quite sure how this happens, but this crashed one time.
				return;

			model.messageHistory.push(message);

			if(message.startsWith("handshake;"))
			{
				var id = Number(message.split(";")[1]);

				var player = getPlayer(key, socket, id);

				if(!player)
				{
					player = addPlayerConnection(key, socket);
				}

				if(isRegistered(player) && model.isInGame)
				{
					socket.send("handshake;game");
					sendPlayerlistsToEachPlayer(key);

					if(model.players.filter(x => !x.socket.isDead).length == 1)
						changeTurnToNextPlayer(key); // only one alive player. Make sure it's their turn.

				}
				else if(model.isLobbyOpen)
				{
					socket.send("handshake;lobby");
					sendLobbyList(key);
				}
				else
				{
					socket.send("handshake;closed");
				}

				return;
			}


			if(model.isLobbyOpen)
			{
				if(message.startsWith("ishost;"))
				{
					if(!model.host || model.host == socket)
					{
						model.host = socket;
						sendHostMessage(key, socket, true)
					}
					else
					{
						sendHostMessage(key, socket, false)
					}			
				}

				if(message.startsWith("startgame;"))
				{
					if(model.host == socket)
					{

						var options = {
							cardDecks:["Core.*"],
							ruleset: "turnsOnly",
						};
						try 
						{
							options = JSON.parse(message.substring(10))
						}
						catch(e){ }

						
						if(startGame(key, options))
						{
							toEveryone(key, "startgame;");
							sendHostMessage(key, model.host, true)
						}

						return;
					}		
				}


				if(message.startsWith("register;"))
				{
					var [_,id,name] = message.split(";");
					name = (name || "").replace(/[^A-Za-z0-9 _]/g,"");
					
					registerPlayerName(key, socket, name);
					
					if(model.isInGame)
					{
						socket.send("startgame;");
						logPlayerJoined();
						sendPlayerlistsToEachPlayer(key);
					}
					else
					{
						sendLobbyList(key);
					}
				}
			}

			if(model.isInGame && message.startsWith("startlobby") && socket == model.host)
			{
				model.isInGame = false;
				model.isLobbyOpen = true;
				toEveryone(key, "startlobby;");
				sendLobbyList(key);

				for(var player of model.players)
				{
					if(isRegistered(player))
						player.socket.send("registered;" + player.id);
				}
			}

			if(model.isInGame && socket == model.host && message.startsWith("keepLobbyOpen;"))
			{
				var [_, keepLobbyOpen] = message.split(";");
				keepLobbyOpen = !!Number(keepLobbyOpen);
				model.isLobbyOpen = keepLobbyOpen;
				model.keepLobbyOpen = keepLobbyOpen;

				toEveryone(key, "keepLobbyOpen;" + (keepLobbyOpen ? 1 : 0));
			}

			if(!isRegistered(getPlayer(key, socket)))
			{
				return;
			}
 

			if(message.startsWith("kick;") && socket == model.host)
			{
				var [_, playerName] = message.split(";");

				var playerIndex = -1;
				for(var i=0; i< model.players.length; i++)
				{
					if(model.players[i].name == playerName)
					{
						playerIndex = i; 
						break;
					}
				}

				if(playerIndex != -1)
				{
					var hand = model.players[i].hand;
					var winnings = model.players[i].winnings;

					if(model.turnstate && model.turnstate.currentPlayer == playerName)
						changeTurnToNextPlayer(key);

					model.players[i].socket.send("kick");
					model.players[i].socket.close()
					model.players.splice(i,1);

					var ponies = hand.filter(x => isPony(x));
					var ships = hand.filter(x => isShip(x));

					model.shipDiscardPile = model.shipDiscardPile.concat(ships);
					model.ponyDiscardPile = model.ponyDiscardPile.concat(ponies);
					model.goalDiscardPile = model.goalDiscardPile.concat(winnings);

					for(var card of ponies)
					{
						model.cardLocations[card] = "ponyDiscardPile,stack"
					}

					for(var card of ships)
					{
						model.cardLocations[card] = "shipDiscardPile,stack"
					}

					for(var card of winnings)
					{
						model.cardLocations[card] = "goalDiscardPile,stack"
					}

					model.cardLocations[model.shipDiscardPile[model.shipDiscardPile.length-1]] = "shipDiscardPile,top";
					model.cardLocations[model.goalDiscardPile[model.goalDiscardPile.length-1]] = "goalDiscardPile,top";
					model.cardLocations[model.ponyDiscardPile[model.ponyDiscardPile.length-1]] = "ponyDiscardPile,top";

					// request model

					for(var player of model.players)
					{
						sendCurrentState(key, player.socket);
					}

				}
			}

			if(message.startsWith("requestmodel;"))
			{	
				// If a new player joins + there's no one else connected (rejoining a dead game), make sure it's their turn.
				if(model.players.filter(x => x.socket.isAlive).length == 1)
				{
					model.host = socket;
					sendHostMessage(key, model.host, true)
				}

				sendCurrentState(key, socket);
				return;
			}

			if(message.startsWith("effects;"))
			{	
				// effects;<card>;prop;value

				try{

					var card, no, prop, value, arg;
					var stuff = message.split(";");

					// TODO validate props + values

					if(stuff.length == 4)
						[_, card, prop, value] = stuff;
					else
						return;

					if(!cards[card]) return;


					if(prop == "disguise")
					{
						if(!cards[value]) return;
					}
					else if(prop == "keywords")
					{

					}
					else
					{
						if(!PROP_VALUES[prop] || !PROP_VALUES[prop][value]) return;
					}


					var obj;


					if(!model.turnstate.overrides[card])
						model.turnstate.overrides[card] = {};

					obj = model.turnstate.overrides[card]
	
					
					if(prop == "disguise")
					{
						

						model.turnstate.overrides[card] = {"disguise": value};

						var cc = model.turnstate.changelingContexts[card];
						if(!cc)
						{
							cc = model.turnstate.changelingContexts[card] = [];
							cc.rollback = [];
						}

						var newEntry = (cc.length > 1) ? cc.length : 1;

						cc[newEntry] = model.turnstate.overrides[card];
						var oldEntry = newEntry - 1;

						var oldChangeling = card + ":" + oldEntry;
						var newChangeling = card + ":" + newEntry;

						for(var pony of cc.rollback)
						{
							for(var i = 0; i < model.turnstate.playedShips.length; i++)
							{
								var [s, p1, p2] = model.turnstate.playedShips[i];

								if(p1 == pony && p2 == oldChangeling || p2 == pony && p1 == oldChangeling )
								{
									model.turnstate.playedShips[i] = [s, pony, newChangeling];
									break;
								}
							}

							model.turnstate.shipSet.delete(shipString(oldChangeling, pony));
							model.turnstate.shipSet.add(shipString(newChangeling, pony));
							
						}
					}
					else if(prop == "keywords")
					{
				
						if(!obj[prop])
						{
							obj[prop] = [];
						}

						if(obj[prop].indexOf(value) == -1)
						{
							obj[prop].push(value);
						}
					}
					else
					{
						obj[prop] = value;
					}

					toEveryoneElse(key, socket, "effects;" + JSON.stringify(model.turnstate.overrides));

					// a changeling update can create more broken ships
					if(model.turnstate)
					{
						var newSet = getCurrentShipSet(model);
						var newlyBroken = getBrokenShips(model.turnstate.shipSet, newSet);

						model.turnstate.shipSet = newSet;
						model.turnstate.brokenShipsNow = model.turnstate.brokenShips.concat(newlyBroken);
						model.turnstate.brokenShips = model.turnstate.brokenShipsNow;
					}

					checkIfGoalsWereAchieved(key);
				}
				catch(e)
				{
				}
				
			}

			if(message.startsWith("draw;"))
			{
				var [_, typ] = message.split(";");

				if(typ != "ship" && typ != "pony" && typ != "goal")
					return;

				var len = model[typ + "DrawPile"].length;

				if(typ == "goal")
				{
					var goalNo = model.currentGoals.map(x => x.card).indexOf("blank:goal")

					if(len && goalNo > -1)
					{
						var card = model[typ + "DrawPile"].pop();
						model.currentGoals[goalNo] = {card, achieved: false};
						model.cardLocations[card] = "goal," + goalNo;

						var msg = "draw;" + typ + ";" + (len - 1);

						toEveryone(key, msg);
						toEveryone(key, "move;" + card + ";goalDrawPile;goal," + goalNo);

						checkIfGoalsWereAchieved(key);
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

					for(var card of model[typ+"DrawPile"])
					{
						model.cardLocations[card] = typ + "DrawPile,stack";
					}


					var pileArr = model[typ+"DiscardPile"];
					
					if(pileArr.length >0)
					{
						for(var card of pileArr)
						{
							model.cardLocations[card] = typ + "DiscardPile,stack";
						}

						var topCard = pileArr[pileArr.length-1];
						model.cardLocations[topCard] = typ+"DiscardPile,top";
					}
					

					toEveryone(key, ["swapshuffle", typ, model[typ+"DrawPile"].length, ...model[typ+"DiscardPile"]].join(";"));
				}
			}

			if(message.startsWith("move;"))
			{
				moveCard(message, key, socket);
			}

			if(message == "endturn")
			{
				var player = getPlayer(key, socket);

				if(!model.turnstate) return;


				if(player.name == model.turnstate.currentPlayer)
				{
				
					changeTurnToNextPlayer(key);	
				}
			}
		}

		socket.on('message', handleCrash(onMessage))
			
	}

	wsServer.on('connection', handleCrash(onConnection));
	

	return wsServer;
}
