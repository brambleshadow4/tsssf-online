import ws from "ws";
import * as util from 'util'
import fs from "fs";
import {
	randomizeOrder, 
	isGoal, 
	isPony, 
	isShip,
	isStart,
	isBoardLoc,
	isOffsetLoc,
	isGoalLoc,
	isDiscardLoc,
	isPlayerLoc,
	isBlank,
	isCardIncluded,
	getNeighborKeys,
	Card,
	Location,
	GameModel as GameModelShared,
	CardProps,
	ChangelingContextList,
	PackListPack
} from "./lib.js";


import * as cm from "./cardManager.js";
import {validatePack, flattenPack, mergePacks} from "./packLib.js";

import {evalGoalCard, getConnectedPonies} from "./goalCriteria.js"
import {logGameHosted, logPlayerJoined} from "./stats.js";


var PROP_VALUES = {

	"gender":{
		"male":1,
		"female":1,
	},
	"altTimeline":{
		"true": 1,
	},
	"shipWithEverypony":{
		"true": 1,
	},
	"race":{
		"earth": 1,
		"unicorn":1, 
		"pegasus": 1,
		"alicorn": 1
	}
} as any;

/*export interface TsssfGameServer extends ws.Server
{
	openLobby: (key?:string) => void,


	players: Player[],
}*/


export interface Player 
{
	socket: any,
	name: string,
	hand: string[],
	winnings: {card: Card, value: number}[],
	id: number,
}


const TEMP_DISCONNECT_TIME = 15*1000;
const NO_MOVE_EXPIRE_TIME = 60*60*1000; // 1 hour
export class TsssfGameServer
{
	public games: {[key:string] : GameModel};

	private wsServer: ws.Server;

	constructor()
	{
		this.wsServer = new ws.Server({ noServer: true });
		this.games = {};

		let games = this.games;

		const interval = setInterval(function ping()
		{

			for(var key in games)
			{
				// no move expiration
				let timeSinceLastMove = new Date().getTime() - games[key].lastMessageTimestamp;

				if(timeSinceLastMove > NO_MOVE_EXPIRE_TIME)
				{
					for(var player of games[key].players)
					{
						player.socket.send("closed;");
						player.socket.close();
					}
					delete games[key];
					return; 
				}

				// no player alive expiration

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

		this.wsServer.on('connection', handleCrash(this.onConnection.bind(this)));
	}

	public openLobby(key?: string): string
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
			while(this.games[key] !== undefined)
		}
		
		this.games[key] = new GameModel();

		return key;
	}

	/*tsssfServer.handleUpgrade(request, socket, head, (socket: any) => {
			tsssfServer.emit('connection', socket, request);
		});
	*/
	public handleUpgrade(request: any, socket:any, head:any, fn: any)
	{
		this.wsServer.handleUpgrade(request, socket, head, fn);
	}

	public emit(event:any, socket:any, request:any)
	{
		this.wsServer.emit(event, socket, request);
	}


	public getStats(): {games: number, players: number, startTime?: number}
	{
		var stats = {games:0, players:0} as {games: number, players: number, startTime?: number}
		var startTime;
		for(var key in this.games)
		{
			if(this.games[key].isInGame)
			{
				stats.games++;
				stats.players += this.games[key].players.filter(x => x.socket.isAlive).length;

				let thisStartTime = this.games[key].startTime; 
				if(thisStartTime !== undefined)
				{
					startTime = Math.max(thisStartTime, startTime || 0);
				}
			}
		}

		if(startTime)
			stats.startTime = startTime;

		return stats;
	}

	//startGame("dev");
	//games["dev"].allowInGameRegistration = true;

	private onConnection(socket: ws & {isAlive: boolean, isDead:boolean}, request:any, client:any)
	{
		let key = request.url.substring(2).toUpperCase();

		if(!this.games[key])
		{
			socket.send("closed;");
			socket.terminate();
			return;
		}

		this.games[key].onConnection(socket, request, client);
	}
	
}


const UPLOAD_LIMIT = 1024*1024;
//const UPLOAD_LIMIT = 2000;

export class GameModel implements GameModelShared
{
	public players: Player[] = [];
	public startTime?: number = 0;
	public isInGame = false;
	public isLobbyOpen = true; 
	public keepLobbyOpen = false;
	public deathCount = 0;

	public board: {
		[key:string]: {card: Card}
	} = {};

	public cardLocations: {
		[card:string]: Location
	} = {};

	public cardDecks: string[] = ["Core.*"];
	public customCards: {
		descriptions: PackListPack[], 
		cards: {[key:string]: CardProps},
		currentSize: number
	} = {
		descriptions: [],
		cards: {},
		currentSize: 0
	};

	public lastMessageTimestamp: number;

	public ponyDiscardPile: Card[] = [];
	public shipDiscardPile: Card[] = [];
	public goalDiscardPile: Card[] = [];

	public ponyDrawPile: Card[] = [];
	public shipDrawPile: Card[] = [];
	public goalDrawPile: Card[] = [];

	public currentGoals: {card: Card, achieved: boolean}[] = [];

	public runGoalLogic = true;

	public turnstate? = new Turnstate();

	public startCard: Card = "Core.Start.FanficAuthorTwilight";

	public ruleset: string = "";

	private host?: ws;

	public messageHistory: string[] = [];


	public debug = false;

	constructor(){

		this.lastMessageTimestamp = new Date().getTime();
	}

	public onConnection(socket: ws & {isAlive: boolean, isDead:boolean}, request:any, client:any)
	{
		socket.isAlive = true;
		socket.isDead = false;
		
		socket.on('message', handleCrash(this.onMessage(this, socket)));
		socket.on('close', handleCrash(this.onClose(this, socket)));

		if(!this.host)
		{
			var players = this.players;
		}

		this.sendLobbyList();		
	}

	public onMessage(game: GameModel, socket: ws)
	{
		return function(message: string)
		{
			if(!game) // not quite sure how this happens, but this crashed one time.
				return;

			game.messageHistory.push(message);
			game.lastMessageTimestamp = new Date().getTime();

			if(message.startsWith("handshake;"))
			{
				let id = Number(message.split(";")[1]);

				var player = game.getPlayer(socket, id);

				if(!player)
				{
					player = game.addPlayerConnection(socket);
				}

				if(game.isRegistered(player) && game.isInGame)
				{
					socket.send("handshake;game");
					game.sendPlayerlistsToEachPlayer();

					if(game.players.filter(x => !x.socket.isDead).length == 1)
						game.changeTurnToNextPlayer(); // only one alive player. Make sure it's their turn.
				}
				else if(game.isLobbyOpen)
				{
					socket.send("handshake;lobby");
					game.sendLobbyList();
				}
				else
				{
					socket.send("handshake;closed");
				}

				if(!game.host)
				{
					var players = game.players
					game.host = players[0].socket;
					game.sendHostMessage( players[0].socket, true);
				}

				return;
			}


			if(game.isLobbyOpen)
			{
				if(message.startsWith("ishost;"))
				{
					/*if(!game.host || game.host == socket)
					{
						game.host = socket;
						sendHostMessage(key, socket, true)
					}
					else
					{
						sendHostMessage(key, socket, false)
					}	*/
					game.sendHostMessage( socket, game.host == socket);		
				}

				if(message.startsWith("setLobbyOptions;"))
				{
					if(game.host == socket)
					{
						var options = {
							cardDecks:["Core.*"],
							ruleset: "turnsOnly",
						};
						try 
						{
							options = JSON.parse(message.substring("setLobbyOptions;".length))
						}
						catch(e){ }

						game.setLobbyOptions(options);

						return;
					}	
				}

				if(message.startsWith("startgame;"))
				{

					if(game.host == socket)
					{
						game.startGame();					
						game.toEveryone("startgame;");
						game.sendHostMessage(game.host, true)

						return;
					}		
				}

				if(message.startsWith("uploadCards;") && game.host == socket)
				{
					if(game.customCards.currentSize > UPLOAD_LIMIT || message.length > UPLOAD_LIMIT)
					{
						socket.send("uploadCardsError;Upload limit reached for this lobby.");
						return;
					}	

					var json = message.substring("uploadCards;".length);
					var newCards;
					try{
						newCards = JSON.parse(json);
					}
					catch(e)
					{
						socket.send("uploadCardsError;Bad JSON file");
						return;
					}

					var errors = validatePack(newCards, "", "", "any");

					if(errors.length)
					{
						socket.send("uploadCardsError;Errors in card pack");
						return;
					}

					
					if (!fs.existsSync("uploads"))
					{
						fs.mkdirSync("uploads");
					}

					fs.writeFileSync("uploads/" + getFileName() + ".json", json)

					var cards = flattenPack(newCards, true);
					var description = {
						name: newCards.name, 
						pack: "X." + newCards.namespace,
						box: false, 
						startCards: Object.keys(cards).filter( x => isStart(x))
					};

					if(game.customCards.descriptions.filter(x => x.pack == description.pack).length == 0)
					{
						game.customCards.descriptions.push(description);
					}

					game.customCards.cards = mergePacks(game.customCards.cards, cards);

					game.customCards.currentSize = JSON.stringify(game.customCards.cards).length + JSON.stringify(game.customCards.descriptions).length;

					if(game.host)
					{
						game.sendHostMessage(game.host, true);
					}
				}


				if(message.startsWith("register;"))
				{
					var [_,id,name] = message.split(";");
					name = (name || "").replace(/[^A-Za-z0-9 _]/g,"");
					
					game.registerPlayerName(socket, name);
					
					if(game.isInGame)
					{
						socket.send("startgame;");
						logPlayerJoined();
						game.sendPlayerlistsToEachPlayer();
					}
					else
					{
						game.sendLobbyList();
					}
				}
			}

			if(game.isInGame && message.startsWith("startlobby") && socket == game.host)
			{
				game.isInGame = false;
				game.isLobbyOpen = true;
				game.toEveryone("startlobby;");
				game.sendLobbyList();

				for(let player of game.players)
				{
					if(game.isRegistered(player))
						player.socket.send("registered;" + player.id);
				}
			}

			if(game.isInGame && socket == game.host && message.startsWith("keepLobbyOpen;"))
			{
				var [_, keepLobbyOpenSTR] = message.split(";");
				let keepLobbyOpen = !!Number(keepLobbyOpenSTR);
				game.isLobbyOpen = keepLobbyOpen;
				game.keepLobbyOpen = keepLobbyOpen;

				game.toEveryone("keepLobbyOpen;" + (keepLobbyOpen ? 1 : 0));
			}

			if(!game.isRegistered(game.getPlayer(socket)))
			{
				return;
			}


			if(message.startsWith("kick;") && socket == game.host)
			{
				var [_, playerName] = message.split(";");

				var playerIndex = -1;
				for(var i=0; i< game.players.length; i++)
				{
					if(game.players[i].name == playerName)
					{
						playerIndex = i; 
						break;
					}
				}

				if(playerIndex != -1)
				{
					var hand = game.players[i].hand;
					var winnings = game.players[i].winnings;

					if(game.turnstate && game.turnstate.currentPlayer == playerName)
						game.changeTurnToNextPlayer();

					game.players[i].socket.send("kick");
					game.players[i].socket.close()
					game.players.splice(i,1);

					var ponies = hand.filter(x => isPony(x));
					var ships = hand.filter(x => isShip(x));

					game.shipDiscardPile = game.shipDiscardPile.concat(ships);
					game.ponyDiscardPile = game.ponyDiscardPile.concat(ponies);
					game.goalDiscardPile = game.goalDiscardPile.concat(winnings.map(x => x.card));

					for(var card of ponies)
					{
						game.cardLocations[card] = "ponyDiscardPile,stack"
					}

					for(var card of ships)
					{
						game.cardLocations[card] = "shipDiscardPile,stack"
					}

					for(let card of winnings)
					{
						game.cardLocations[card.card] = "goalDiscardPile,stack"
					}

					game.cardLocations[game.shipDiscardPile[game.shipDiscardPile.length-1]] = "shipDiscardPile,top";
					game.cardLocations[game.goalDiscardPile[game.goalDiscardPile.length-1]] = "goalDiscardPile,top";
					game.cardLocations[game.ponyDiscardPile[game.ponyDiscardPile.length-1]] = "ponyDiscardPile,top";

					// request game

					for(let player of game.players)
					{
						game.sendCurrentState(player.socket);
					}

				}
			}

			if(message.startsWith("requestmodel;"))
			{	
				// If a new player joins + there's no one else connected (rejoining a dead game), make sure it's their turn.
				if(game.players.filter(x => x.socket.isAlive).length == 1)
				{
					game.host = socket;
					game.sendHostMessage(game.host, true)
				}

				game.sendCurrentState(socket);
				return;
			}

			if(message.startsWith("effects;") && game.turnstate)
			{	
				// effects;<card>;prop;value

				let cards = cm.inPlay();

				try{
					let card, no, prop, value, arg;
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
					else if(prop == "count")
					{
						value = Number(value);
						if(isNaN(value)) return;
					}
					else if(prop == "fullCopy")
					{
						if(!cards[value]) return;
					}
					else
					{
						if(!PROP_VALUES[prop] || !PROP_VALUES[prop][value]) return;
					}

					if(value == "true") 
						value = true;


					var obj;


					if(!game.turnstate.overrides[card])
						game.turnstate.overrides[card] = {};

					obj = game.turnstate.overrides[card]

					
					if(prop == "disguise")
					{
						var oldOverride = game.turnstate.overrides[card];

						game.turnstate.overrides[card] = {"disguise": value};

						if(oldOverride.shipWithEverypony)
							game.turnstate.overrides[card].shipWithEverypony = true;


						var cc = game.turnstate.getChangeContext(card);

						var newEntry = (cc.list.length > 1) ? cc.list.length : 1;

						cc.list[newEntry] = game.turnstate.overrides[card];
						var oldEntry = newEntry - 1;

						var oldChangeling = card + ":" + oldEntry;
						var newChangeling = card + ":" + newEntry;


						// rollback the played pony

						if(cc.disguiseCausedByDirectPlay && game.turnstate.playedPonies[game.turnstate.playedPonies.length - 1] == oldChangeling)
						{
							game.turnstate.playedPonies[game.turnstate.playedPonies.length - 1] = newChangeling;
						}

						let previousShips = new Set(cc.previousShips);

						for(var pony of cc.currentlyShippedTo)
						{
							
							// replace the [pony, changeling:old] ship with [pony, changeling:new]
							for(var i = 0; i < game.turnstate.playedShips.length; i++)
							{
								var [p1, p2] = game.turnstate.playedShips[i];

								if(p1 == pony && p2 == oldChangeling || p2 == pony && p1 == oldChangeling )
								{
									game.turnstate.playedShips[i] = [pony, newChangeling];
									break;
								}
							}

							if(!previousShips.has(pony))
							{
								game.turnstate.shipSet.delete(game.shipString(oldChangeling, pony));
								game.turnstate.shipSet.add(game.shipString(newChangeling, pony));
							}
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



					game.toEveryoneElse( socket, "effects;" + JSON.stringify(game.turnstate.overrides));

					// a changeling update can create more broken ships
					if(game.turnstate)
					{
						if(prop == "shipWithEverypony")
						{
							game.turnstate.specialEffects.shipWithEverypony.add(card);
						}

						var newSet = game.getCurrentShipSet();

						var newlyBroken = game.getBrokenShips(game.turnstate.shipSet, newSet);

						game.turnstate.shipSet = newSet;
						game.turnstate.brokenShips = game.turnstate.brokenShipsCommitted.concat(newlyBroken);
						game.turnstate.brokenShipsCommitted = game.turnstate.brokenShips;
					}

					game.checkIfGoalsWereAchieved();
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

				let model2 = game as any;

				var len = model2[typ + "DrawPile"].length;

				if(typ == "goal")
				{
					var goalNo = game.currentGoals.map(x => x.card).indexOf("blank:goal")

					if(len && goalNo > -1)
					{
						let card = model2[typ + "DrawPile"].pop();
						game.currentGoals[goalNo] = {card, achieved: false};
						game.cardLocations[card] = "goal," + goalNo;

						var msg = "draw;" + typ + ";" + (len - 1);

						game.toEveryone( msg);
						game.toEveryone( "move;" + card + ";goalDrawPile;goal," + goalNo);

						game.checkIfGoalsWereAchieved();
					}
					else
						return ;//sendCurrentState(key, socket);
				}
				else
				{
					if(len)
					{
						let card = model2[typ + "DrawPile"].pop();

						let player = game.getPlayer(socket)!
						player.hand.push(card);
						game.cardLocations[card] = "player," + player.name;

						var msg = "draw;" + typ + ";" + (len - 1);
						game.toEveryone( msg);
						socket.send("move;" + card + ";" + typ + "DrawPile;hand");
						game.toEveryoneElse(socket, "move;anon:" + typ + ";" + typ + "DrawPile;player," + player.name);
					
						game.sendPlayerCounts(player);
					}
				}
			}

			if(message.startsWith("swapshuffle;"))
			{
				var [_,typ] = message.split(";");

				if(["pony","goal","ship"].indexOf(typ) > -1)
				{
					let model2 = game as any;
					var swap = model2[typ + "DrawPile"];
					model2[typ+"DrawPile"] = model2[typ+"DiscardPile"];
					model2[typ+"DiscardPile"] = swap;

					randomizeOrder(model2[typ+"DrawPile"]);

					for(let card of model2[typ+"DrawPile"])
					{
						model2.cardLocations[card] = typ + "DrawPile,stack";
					}


					var pileArr = model2[typ+"DiscardPile"];
					
					if(pileArr.length >0)
					{
						for(let card of pileArr)
						{
							model2.cardLocations[card] = typ + "DiscardPile,stack";
						}

						var topCard = pileArr[pileArr.length-1];
						model2.cardLocations[topCard] = typ+"DiscardPile,top";
					}
					

					game.toEveryone(["swapshuffle", typ, model2[typ+"DrawPile"].length, ...model2[typ+"DiscardPile"]].join(";"));
				}
			}

			if(message.startsWith("move;"))
			{
				game.moveCard(message, socket);
			}

			if(message == "endturn")
			{
				let player = game.getPlayer(socket)!;

				if(!game.turnstate) return;


				if(player.name == game.turnstate.currentPlayer)
				{
				
					game.changeTurnToNextPlayer();	
				}
			}
		}
	}

	private onClose(game: GameModel, socket: ws & {isAlive: boolean, isDead: boolean})
	{
		return function()
		{
			socket.isAlive = false;

			let player = game.getPlayer(socket)
			let deadName = player ? player.name : "";

			// mark the socket as dead after 15 s. 
			setTimeout(() => {

				socket.isDead = true;
				let player = game.getPlayerByName(deadName);

				if(player == undefined || (player && player.socket == socket))
				{
					let curPlayerName = game.turnstate?.currentPlayer;

					if(curPlayerName == deadName)
					{
						game.changeTurnToNextPlayer();
					}
				}

			}, TEMP_DISCONNECT_TIME); 

			if(game.host == socket)
			{
				var connectedPlayers = game.players.filter(x => x.socket.isAlive);

				if(game.isInGame)
					connectedPlayers = connectedPlayers.filter(x => game.isRegistered(x));

				// if host changes when lobby, deslect any uploaded cards.
				// 
				if(!game.isInGame)
				{
					game.cardDecks = game.cardDecks.filter( (x: Card)=> !x.startsWith("X."))
				}

				if(connectedPlayers.length)
				{
					game.host = connectedPlayers[0].socket;

					game.sendHostMessage(game.host!, true)
				}
				else
				{
					delete game.host;
				}
			}


			if(game.isLobbyOpen && !game.isInGame)
			{
				for(var i=0; i < game.players.length; i++)
				{
					if(socket == game.players[i].socket)
					{
						game.players.splice(i, 1);
						break;
					}
				}

				game.sendLobbyList();
			}

			if(game.isInGame)
			{
				game.sendPlayerlistsToEachPlayer();
			}
		}
	}	

	private isRegistered(player?: Player)
	{
		return player != undefined && player.name != "";
	}

	private checkNameIsUnique(name: string)
	{
		for(var i=0; i < this.players.length; i++)
		{
			if(this.players[i].name == name)
			{
				return false;
			}
		}

		return true;
	}

	private addPlayerConnection(socket: ws): Player
	{
		var player = this.getPlayer(socket)

		if(!player)
		{
			player = {
				socket: socket,
				hand: [],
				winnings: [],
				id: 0,
				name: ""
			}

			this.players.push(player);
		}

		return player;
	}

	private registerPlayerName(socket: ws, name: string)
	{
		var count = 0;
		var newName = name;

		var player = this.getPlayer(socket)

		if(!player)
		{
			player = this.addPlayerConnection(socket);
		}

		name = name || "Player";
		while(!this.checkNameIsUnique(newName))
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

	public sendLobbyList()
	{
		var allPlayers = this.players.filter(x => x.socket.isAlive)
			.map(x => x.name).join(",");

		for(var player of this.players)
		{
			player.socket.send("lobbylist;" + player.name + ";" + allPlayers);
		}
	}

	public getPlayer(thissocket: ws, id?: number): Player | undefined
	{
		for(var i=0; i < this.players.length; i++)
		{
			var socket = this.players[i].socket;

			if(socket == thissocket || Number(this.players[i].id) == id)
			{
				if(socket != thissocket)
					 this.players[i].socket = thissocket;

				if(socket.replace)
					this.players[i].socket = thissocket;

				return this.players[i] 
			}
		}
	}

	public getPlayerByName(name: string)
	{
		for(var i=0; i < this.players.length; i++)
		{
			if(name == this.players[i].name)
			{
				return this.players[i] 
			}
		}
	}

	public getPlayerIndex(thissocket: ws): number
	{
		for(var i=0; i < this.players.length; i++)
		{
			var socket = this.players[i].socket;

			if(socket == thissocket)
			{
				return i;
			}
		}

		throw new Error("no player index");
	}

	public toEveryoneElse(thissocket: ws, message: string)
	{
		for(var i=0; i < this.players.length; i++)
		{
			var socket = this.players[i].socket;
			if(socket != thissocket && socket.isAlive)
			{
				socket.send(message);
			}
		}
	}	

	public toEveryone( message: string)
	{
		for(var i=0; i < this.players.length; i++)
		{
			var socket = this.players[i].socket;
			
			if(socket.isAlive)
				socket.send(message);
		}
	}	

	public getPlayerModel(socket: ws)
	{
		var model = {} as any;

		model.board = this.board;
		model.cardDecks = this.cardDecks;

		model.ponyDiscardPile = this.ponyDiscardPile;
		model.shipDiscardPile = this.shipDiscardPile;
		model.goalDiscardPile = this.goalDiscardPile;

		model.customCards = this.customCards;

		model.currentGoals = this.currentGoals;

		model.goalDrawPileLength = this.goalDrawPile.length;
		model.ponyDrawPileLength = this.ponyDrawPile.length;
		model.shipDrawPileLength = this.shipDrawPile.length;

		var player = this.getPlayer(socket)!;

		model.hand = player.hand;
		model.winnings = player.winnings;
		model.playerName = player.name;

		model.players = this.getPlayerListForThisPlayer(socket)

		let ts = this.turnstate;
		if(ts)
		{
			model.turnstate = ts.clientProps();
		}

		model.keepLobbyOpen = this.isLobbyOpen;

		model.startCard = this.startCard;

		return model;
	}

	public getPlayerListForThisPlayer(socket: ws)
	{
		var playerCount = this.players.length 
		var players = [];

		if(playerCount > 1)
		{
			var playerIndex = this.getPlayerIndex(socket);

			for(var i=(playerIndex+1) % playerCount; i != playerIndex; i = ((i + 1) % playerCount))
			{
				let other = this.players[i];
				
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

	public sendPlayerlistsToEachPlayer()
	{
		for(var player of this.players)
		{
			if(player.socket.isAlive && player.name != "")
			{
				var playerlist = this.getPlayerListForThisPlayer(player.socket);
				player.socket.send("playerlist;" + JSON.stringify(playerlist))
			}
		}
	}

	private sendHostMessage(socket:ws, isHost: boolean)
	{
		if(!isHost)
			var payload = "0"
		else
			var payload = JSON.stringify({
				cardDecks: this.cardDecks,
				startCard: this.startCard,
				ruleset: this.ruleset,
				keepLobbyOpen: this.keepLobbyOpen,
				customCards: this.customCards
			});

		socket.send("ishost;" + payload)
	}

	private sendCurrentState( socket: ws)
	{
		var model = this.getPlayerModel(socket);
		socket.send("model;" + JSON.stringify(model));
	}

	private checkIfGoalsWereAchieved()
	{
		if(!this.runGoalLogic)
			return;

		var sendUpdate = false;

		for(var goalInfo of this.currentGoals)
		{
			var achieved = false;

			if(!isBlank(goalInfo.card))
				achieved = evalGoalCard(goalInfo.card, this)

			if(goalInfo.achieved != achieved)
			{
				sendUpdate = true;
			}

			goalInfo.achieved = achieved;
		}

		if(sendUpdate)
		{
			this.toEveryone("goalachieved;" + this.currentGoals.map(x => x.achieved ? "1" : "").join(";"));
		}
	}

	private shipString(card1:Card, card2: Card): string
	{
		if(card1 < card2)
			return card1 + "/" + card2

		return card2 + "/" + card1;
	}

	

	public setLobbyOptions(options: any)
	{
		this.startCard = options.startCard || "Core.Start.FanficAuthorTwilight";
		this.runGoalLogic = options.startCard != "HorriblePeople.2015ConExclusives.Start.FanficAuthorDiscord" && options.ruleset == "turnsOnly";
		this.keepLobbyOpen = !!options.keepLobbyOpen;
		this.ruleset = options.ruleset.substring(0,200);


		var decks = ["Core.*"];
		if(options.cardDecks)
		{
			//var allowedDecks = ["PU.*","EC.*"]
			decks = options.cardDecks; //.filter( x => allowedDecks.indexOf(x) > -1);
			//decks.push("Core.*");
		}

		cm.init(decks.concat([this.startCard]), this.customCards.cards);

		this.cardDecks = decks;
	}

	public startGame(preset?: any)
	{	
		this.isLobbyOpen = this.keepLobbyOpen;

		if(!preset)
		{
			// remove players which disconnected before the games started
			for(var i=0; i<this.players.length; i++)
			{
				if(this.players[i].name == "" || !this.players[i].socket.isAlive)
				{
					this.players.splice(i,1);
					i--;
				}
			}

			if(this.players.length == 0)
				return false;
		}

		this.startTime = new Date().getTime();

		

		this.cardLocations = {};
		this.board = {
			"p,0,0":{
				card: this.startCard
			}
		};

		for(var player of this.players)
		{
			player.hand = [];
			player.winnings = [];
		}

		this.isInGame = true;
		this.cardLocations[this.startCard] = "p,0,0";


		this.goalDiscardPile = [];
		this.ponyDiscardPile = [];
		this.shipDiscardPile = [];

		this.currentGoals = [
			{card:"blank:goal", achieved: false},
			{card:"blank:goal", achieved: false},
			{card:"blank:goal", achieved: false}
		];

		// client only props
		//     hand:
		//     winnings

		// private props
		this.goalDrawPile = [];
		this.ponyDrawPile = [];
		this.shipDrawPile = [];


		logGameHosted();

		for(let i of this.players.filter(x => this.isRegistered(x)))
		{
			logPlayerJoined();
		}

		for(var cardName in cm.inPlay())
		{
			if(!isCardIncluded(cardName, this))
				continue;

			if(isGoal(cardName))
			{
				this.goalDrawPile.push(cardName);
				this.cardLocations[cardName] = "goalDrawPile";
			}
			else if(isPony(cardName))
			{	
				this.ponyDrawPile.push(cardName);
				this.cardLocations[cardName] = "ponyDrawPile";
			}
			else if(isShip(cardName))
			{
				this.shipDrawPile.push(cardName);
				this.cardLocations[cardName] = "shipDrawPile";
			}
		}

		randomizeOrder(this.players);
		randomizeOrder(this.goalDrawPile);
		randomizeOrder(this.ponyDrawPile);
		randomizeOrder(this.shipDrawPile);


		if(this.ruleset == "turnsOnly")
		{
			this.turnstate = new Turnstate();
			this.turnstate.init(this, this.players[0] ? this.players[0].name : "")
		}
		else
		{
			delete this.turnstate;
		}
		
		if(preset)
			this.loadPreset(preset);
	}

	private loadPreset(hand: Card[])
	{
		console.log("Loading Preset Game");

		let player =  {
			name: "Dev",
			id: 1,
			socket: {
				replace: true,
				send: () => {}},
			hand: [],
			winnings: [],
		} as Player;

		this.players.push(player);

		for(let card of hand)
		{
			if(isPony(card))
			{
				player.hand.push(card);
				this.cardLocations[card] = "player,Dev";
				this.ponyDrawPile.splice(this.ponyDrawPile.indexOf(card), 1);
			}
			if(isShip(card))
			{
				player.hand.push(card);
				this.cardLocations[card] = "player,Dev";
				this.shipDrawPile.splice(this.shipDrawPile.indexOf(card), 1);
			}
		}

		//console.log(this);
	}

	private isLocOccupied(loc: Location)
	{
		if(isBoardLoc(loc) || isOffsetLoc(loc))
		{

			return (this.board[loc] != undefined)
		}
		if(isGoalLoc(loc))
		{
			var goalNo = Number(loc.split(",")[1]);

			if(this.currentGoals[goalNo] == undefined)
				return false;

			return this.currentGoals[goalNo].card != "blank:goal"
		}

		return false;
	}

	private sendPlayerCounts(player:Player)
	{
		var ponies = player.hand.filter(x => isPony(x)).length;
		var ships = player.hand.filter(x => isShip(x)).length;

		var args = ["counts", player.name, ponies, ships, ...player.winnings.map(x=>x.card + "," + x.value)]
		this.toEveryoneElse(player.socket, args.join(";"));
	}

	private isChangeling(card:Card)
	{
		card = card.split(":")[0];
		return isPony(card) && cm.inPlay()[card]?.action?.startsWith("Changeling(");
	}

	public getCurrentShipSet(): Set<string>
	{
		var s: Set<string> = new Set();
		for(var key in this.board)
		{
			if (key.startsWith("s"))
			{
				var pair = this.getShippedPonies(key);

				if(pair.length == 2)
				{	
					s.add(this.shipString(pair[0], pair[1]));
				}
			}

			if(this.turnstate && this.turnstate.specialEffects.shipWithEverypony)
			{
				var pony1 = this.board[key].card;
				for(var pony2 of this.turnstate.specialEffects.shipWithEverypony)
				{
					if(pony1 != pony2)
					{
						s.add(this.shipString(this.appendChangelingContext(pony1, this), this.appendChangelingContext(pony2, this)));
					}
				}
			}
		}

		return s;
	}

	public getCurrentPositionMap()
	{
		var map:{[key:string]: Location} = {};

		for(var loc in this.board)
		{
			if (loc.startsWith("p,") && !isBlank(this.board[loc].card))
			{
				map[this.board[loc].card] = loc;
			}
		}

		return map;

	}

	private isShipClosed(shipLoc: Location)
	{
		return this.getShippedPonies(shipLoc).length == 2;
	}


	private appendChangelingContext(card: Card, model: GameModel)
	{
		if(this.turnstate && this.isChangeling(card))
		{
			var cc = this.turnstate.getChangeContext(card);
			var contextNo =  cc ? Math.max(cc.list.length - 1, 0) : 0
			return card + ":" + contextNo;
		}

		return card;
	}

	private getShippedPonies(shipLoc: Location): Card[]
	{
		var neighbors = getNeighborKeys(shipLoc);

		var shipClosed = true;
		var ponies = [];
		for(var n of neighbors)
		{
			if(this.board[n] && !isBlank(this.board[n].card))
			{
				var card = this.board[n].card;

				card = this.appendChangelingContext(card, this);

				ponies.push(card)
			}
		}

		return ponies;
	}

	private getBrokenShips(startSet: Set<string>, endSet: Set<string>)
	{
		var broken:[Card,Card][] = [];

		for(var ship of startSet)
		{
			if(!endSet.has(ship))
			{
				broken.push(ship.split("/") as [Card, Card]);
			}
		}

		return broken;
	}

	private getPlayedShips(startSet: Set<string>, endSet: Set<string>)
	{
		var played:[Card,Card][] = [];

		for(var ship of endSet)
		{
			if(!startSet.has(ship))
			{
				played.push(ship.split("/") as [Card, Card]);
			}
		}

		return played;
	}

	private getSwappedCount(startPositions: {[loc: string]: Card}, endPositions: {[loc: string]: Card})
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


	private changeTurnToNextPlayer()
	{
		let ts = this.turnstate;
		if(!ts)
			return;

		var rotation = this.players.filter(x => !x.socket.isDead && x.name != "");

		if(rotation.length == 0)
			return;

		var k = rotation.map(x=> x.name).indexOf(ts.currentPlayer);
		k = (k+1)%rotation.length;

		this.turnstate = new Turnstate();
		this.turnstate.init(this, rotation[k].name);

		this.toEveryone("turnstate;" + JSON.stringify(this.turnstate!.clientProps()));

		this.checkIfGoalsWereAchieved();
	}

	private moveCard(message: string, socket: ws)
	{
		var [_,card, startLocation, endLocation, extraArg] = message.split(";");
		var player = this.getPlayer(socket)!;

		let serverStartLoc = startLocation;
		if(startLocation == "hand" || startLocation == "winnings")
			serverStartLoc = "player," + player.name;


		// if the player has an incorrect position for a card, move it to where it actually should be.
		if(this.cardLocations[card] != serverStartLoc || this.isLocOccupied(endLocation))
		{						
			var whereTheCardActuallyIs = this.cardLocations[card];
			if(whereTheCardActuallyIs == "player," + player.name)
			{
				if(isGoal(card))
					whereTheCardActuallyIs = "winnings";
				else
					whereTheCardActuallyIs = "hand";
			}

			if(this.debug)
			{
				console.log("X " + message);
				console.log("  P: " + player.name);

				console.log("  whereTheCardActuallyIs = " + whereTheCardActuallyIs);
				console.log("  move;" + card + ";limbo;" + whereTheCardActuallyIs);
			}
			
			socket.send("move;" + card + ";limbo;" + whereTheCardActuallyIs);

			return;
		}

		if(this.debug)
		{
			console.log("\u221A " + message);
			console.log("  P: " + player.name);
		}
		

		let serverEndLoc = endLocation;
		if(serverEndLoc == "hand" || serverEndLoc == "winnings")
			serverEndLoc = "player," + player.name;

		this.cardLocations[card] = serverEndLoc;


		this.updateTurnstatePreMove(card, startLocation);


		// remove from old location
		if(startLocation == "hand")
		{
			var i = this.getPlayer(socket)!.hand.indexOf(card);

			this.getPlayer(socket)!.hand.splice(i, 1);
		}

		

		if(startLocation == "winnings")
		{
			let player = this.getPlayer(socket)!
			var i = player.winnings.map(x => x.card).indexOf(card);
			player.winnings.splice(i, 1);
		}

		if(isBoardLoc(startLocation) || isOffsetLoc(startLocation))
		{
			if(this.board[startLocation] && this.board[startLocation].card == card)
			{
				if(this.turnstate && this.isChangeling(card))
				{
					let cc = this.turnstate.getChangeContext(card);;
					cc.previousShips = getConnectedPonies(this, startLocation);
					cc.disguiseCausedByDirectPlay = false;
				}


				delete this.board[startLocation];
			}
		}

		if(isDiscardLoc(startLocation))
		{
			let model = this as any;
			var [pile,slot] = startLocation.split(",");
			let i = model[pile].indexOf(card);
			model[pile].splice(i,1);

			if(model[pile].length)
			{
				var topCard = model[pile][model[pile].length-1]
				model.cardLocations[topCard] = pile+",top";
			}
		}

		if(isGoalLoc(startLocation))
		{
			let [_,iStr] = startLocation.split(",")
			let i = Number(iStr);
			if(this.currentGoals[i].card != "blank:goal")
				this.currentGoals[i].card = "blank:goal";
			
		}

		// move to end location

		if(endLocation == "hand")
		{
			this.getPlayer(socket)!.hand.push(card)
			this.checkIfGoalsWereAchieved();
		}

		if(isBoardLoc(endLocation) || isOffsetLoc(endLocation))
		{
			this.board[endLocation] = {card: card};

			if(this.turnstate)
			{
				this.turnstate.playedThisTurn.add(card);
			}
		}

		if(isGoalLoc(endLocation))
		{
			var [_,goalNoStr] = endLocation.split(",")
			let goalNo = Number(goalNoStr);
			this.currentGoals[goalNo].card = card;
			this.cardLocations[card] = "goal," + goalNo;
		}

		if(endLocation == "winnings")
		{
			player.winnings.push({card, value: Number(extraArg) || 0});
		}

		if(isDiscardLoc(endLocation))
		{
			// the only valid placement is on top of the discard pile
			var [pile,slot] = endLocation.split(",");
			let model = this as any;
			model[pile].push(card);

			if(model[pile].length > 1)
			{
				var underCard = model[pile][model[pile].length-2];
				model.cardLocations[underCard] = pile + ",stack";
			}
		}


		


		//postmove

		this.updateTurnstatePostMove(card, startLocation, endLocation);


		// cant move to a goal location yet

		socket.send("move;" + card + ";" + startLocation + ";" + endLocation);

		if(startLocation == "hand" || startLocation == "winnings")
			startLocation = "player,"+player.name;

		if(endLocation == "hand" || endLocation == "winnings")
			endLocation = "player,"+player.name;

		this.toEveryoneElse(socket, "move;" + card + ";" + startLocation + ";" + endLocation);


		if(isPlayerLoc(endLocation) || isPlayerLoc(startLocation))
		{
			this.sendPlayerCounts(player);
		}


		if(isDiscardLoc(startLocation) && !isDiscardLoc(endLocation))
		{
			var [pile,slot] = startLocation.split(",");
			let model2 = this as any;
			if(model2[pile].length)
			{
				var topCard = model2[pile][model2[pile].length-1]
				this.toEveryone( "move;" + topCard + ";" + pile + ",stack;" + pile + ",top");
			}
		}
	
		this.checkIfGoalsWereAchieved();
	}

	private updateTurnstatePreMove(card: Card, startLocation: string): void
	{
		if(!this.turnstate) { return; }

		if(this.isChangeling(card) && (startLocation == "hand" || startLocation == "ponyDiscardPile,top"))
		{
			let cc = this.turnstate.getChangeContext(card);
			cc.previousShips = [];
			cc.disguiseCausedByDirectPlay = true;
		}
	}

	private updateTurnstatePostMove(card: Card, startLocation: Location, endLocation: Location)
	{
		if(!this.turnstate) { return }

		if(isPony(card) 
			&& (startLocation == "hand" || startLocation == "ponyDiscardPile,top")
			&& isBoardLoc(endLocation))
		{
	
			var cardContext = card;

			if(this.isChangeling(card))
			{
				let cc =  this.turnstate.getChangeContext(card);
				var contextNo = Math.max(cc.list.length - 1, 0);
				cardContext = card + ":" + contextNo;

			}

			this.turnstate.playedPonies.push(cardContext);
		}

		if(isShip(card) 
			&& (startLocation == "hand" || startLocation == "shipDiscardPile,top")
			&& isBoardLoc(endLocation))
		{
			this.turnstate.playedShipCards.push(card);
		}

		
		var newSet = this.getCurrentShipSet();
		var brokenShipsTentative = this.getBrokenShips(this.turnstate.shipSet, newSet);
		var playedShipsTentative = this.getPlayedShips(this.turnstate.shipSet, newSet);


		this.turnstate.brokenShips = this.turnstate.brokenShipsCommitted.concat(brokenShipsTentative);
		this.turnstate.playedShips = this.turnstate.playedShipsCommitted.concat(playedShipsTentative);


		var curPositionMap = this.getCurrentPositionMap();
		var newlySwapped = this.getSwappedCount(this.turnstate.positionMap, curPositionMap)

		this.turnstate.swaps = this.turnstate.swapsCommitted + newlySwapped;

		// ship slide next to a changeling card rollback
		if(isBoardLoc(endLocation) && this.isChangeling(card))
		{			
			this.turnstate.getChangeContext(card).currentlyShippedTo = getConnectedPonies(this, endLocation);
		}

		if(card == "HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh")
		{
			this.turnstate.updateSpecialEffects(this.board);
		}


		if(startLocation == "hand" || 
			startLocation == "shipDiscardPile,top" || startLocation == "ponyDiscardPile,top"
			|| endLocation == "shipDiscardPile,top" || endLocation == "ponyDiscardPile,top")
		{
			// commit all changes

			this.turnstate.brokenShipsCommitted = this.turnstate.brokenShips;
			this.turnstate.playedShipsCommitted = this.turnstate.playedShips;
			this.turnstate.swapsCommitted = this.turnstate.swaps;
			this.turnstate.shipSet = newSet;
			this.turnstate.positionMap = curPositionMap;
		}

		if(isShip(card)
			&& (startLocation == "hand" || startLocation == "shipDiscardPile,top")
			&& isBoardLoc(endLocation))
		{

			if(this.isShipClosed(endLocation))
			{
				//i.e. played a ship card between two ponies

				var shippedPonies = this.getShippedPonies(endLocation);

				var noCtxShipped = shippedPonies.map(x => x.split(":")[0]);
				
				if(this.isChangeling(noCtxShipped[0]))
				{
					let cc = this.turnstate.getChangeContext(noCtxShipped[0]);
					cc.disguiseCausedByDirectPlay = false;
					cc.currentlyShippedTo = getConnectedPonies(this, endLocation);
					cc.previousShips = cc.currentlyShippedTo.filter(x => x != noCtxShipped[1]);
				}

				if(this.isChangeling(noCtxShipped[1]))
				{
					let cc = this.turnstate.getChangeContext(noCtxShipped[1]);
					cc.disguiseCausedByDirectPlay = false;
					cc.currentlyShippedTo = getConnectedPonies(this, endLocation);
					cc.previousShips = cc.currentlyShippedTo.filter(x => x != noCtxShipped[0]);
				}
			}
		}
	}
}


export class Turnstate
{	
	public currentPlayer = "";
	public overrides: {[key:string]: any} = {};
	/*public tentativeShips: {[key: string]: any} = {};*/
	
	public playedPonies: Card[] = [];
	public playedShips: [Card, Card][] = [];
	public playedShipCards: Card[] = [];

	public playedThisTurn = new Set();

	public playedShipsCommitted: [Card, Card][] = [];

	public brokenShipsCommitted: [Card,Card][] = [];
	public brokenShips: [Card,Card][] = [];

	public swapsCommitted = 0;
	public swaps = 0;

	public shipSet: Set<string> = new Set();
	public positionMap: {[key: string]: string} = {};
	
	public changelingContexts: {[key:string] : ChangelingContextList} = {};

	public specialEffects: {
		shipWithEverypony: Set<string>,
		larsonEffect?: boolean
	} = {
		shipWithEverypony: new Set()
	};

	public constructor(){}

	public init(model: GameModel, currentPlayerName: string)
	{
		this.currentPlayer = currentPlayerName;
		this.shipSet = model.getCurrentShipSet();
		this.positionMap = model.getCurrentPositionMap();

		this.updateSpecialEffects(model.board);	
	}

	public updateSpecialEffects(board: {[key: string]: {card: Card}})
	{

		delete this.specialEffects["larsonEffect"];
		for(var key in board)
		{
			if(board[key].card == "HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh")
			{
				this.specialEffects["larsonEffect"] = true;
			}
		}
	}

	public getChangeContext(card: Card): ChangelingContextList
	{
		if(!this.changelingContexts[card])
		{
			this.changelingContexts[card] = {list:[], previousShips:[], currentlyShippedTo: [], disguiseCausedByDirectPlay: false};
		}

		return this.changelingContexts[card];
	}
	
	public clientProps()
	{
		return {
			playedThisTurn: [...this.playedThisTurn],
			overrides: this.overrides,
			currentPlayer: this.currentPlayer
		}
	}
}

function getFileName()
{
	var now = new Date();

	function pad(n: number)
	{
		if(n < 10)
			return "0" + n
		else 
			return "" + n
	}

	function pad3(n: number)
	{
		if(n < 10)
		{
			return "00" + n
		}
		else if(n < 100)
		{
			return "0" + n;
		}
		else
		{
			return "" + n
		}
	}

	return now.getUTCFullYear() + "-" + pad((now.getUTCMonth() + 1)) + "-" + pad((now.getUTCDate())) 
		+ " " + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds())
		+ " " + pad3(now.getUTCMilliseconds())
}

function handleCrash(this: any, fun: Function)
{
	return function(this: any, ...args: any[])
	{
		try {
			fun(...args) 
		}
		catch(e)
		{
			

			var data = [];

			data.push(e.toString())
			data.push(e.stack)
			data.push("")
			data.push("GAMES")
			data.push(util.inspect(this, {depth:Infinity}))

			fs.writeFileSync("CRASH " + getFileName() + ".txt", data.join("\n"))
			throw e
		}
	}
}