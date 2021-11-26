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
	CardProps,
	ChangelingContextList,
	PackListPack,
	GameOptions
} from "../model/lib.js";

import GameModel from "../model/GameModel.js";

import Turnstate from "../model/turnstate.js";

import * as cm from "../model/cardManager.js";
import {validatePack, flattenPack, mergePacks} from "../model/packLib.js";

import {evalGoalCard, getConnectedPonies} from "../model/goalCriteria.js"
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
	team?: string,
	name: string,
	hand: string[],
	winnings: {card: Card, value: number}[],
	id: number,
}


const TEMP_DISCONNECT_TIME = 15*1000;
const NO_MOVE_EXPIRE_TIME = 60*60*1000; // 1 hour
export class TsssfGameServer
{
	public games: {[key:string] : GameInstance};

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
					for(var player of games[key].model.players)
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

/**
 * A GameInstance is an individual server-node running the game + sending messages to each of the players.
 */
export class GameInstance
{
	public model = new GameModel();

	public startTime?: number = 0;
	public isInGame = false;
	public isLobbyOpen = true; 
	public keepLobbyOpen = false;
	public deathCount = 0;

	public lastMessageTimestamp: number;

	public turnstate? = new Turnstate();

	public ruleset: "sandbox" | "turnsOnly" = "turnsOnly";

	private host?: ws;

	public messageHistory: string[] = [];

	public debug = false;

	constructor()
	{
		this.lastMessageTimestamp = new Date().getTime();
	}

	public onConnection(socket: ws & {isAlive: boolean, isDead:boolean}, request:any, client:any)
	{
		socket.isAlive = true;
		socket.isDead = false;
		
		socket.on('message', handleCrash(this.onMessage(this, socket)));
		socket.on('close', handleCrash(this.onClose(this, socket)));

		this.sendLobbyList();		
	}

	public onMessage(game: GameInstance, socket: ws)
	{
		return function(message: string)
		{
			if(!game) // not quite sure how this happens, but this crashed one time.
				return;

			let logPlayerName = game.getPlayer(socket)?.name || ":unknown:"; 

			game.messageHistory.push(logPlayerName + ";" + message);
			game.lastMessageTimestamp = new Date().getTime();

			if(message == "debug") game.onDebugMessage(socket);
			

			if(message.startsWith("handshake;")) { game.onHandshakeMessage(message, socket); return; }
			


			if(game.isLobbyOpen)
			{
				if(message.startsWith("ishost;"))
				{
					game.sendHostMessage( socket, game.host == socket);		
				}

				if(message.startsWith("setLobbyOptions;"))
				{
					if(game.host == socket)
					{
						var options: GameOptions = {
							cardDecks:["Core.*"],
							ruleset: "turnsOnly",
							startCard: "Core.Start.FanficAuthorTwilight",
							keepLobbyOpen: false,
							teams: {},
							customCards: {
								cards: {},
								descriptions: []
							},
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
					let customCards = game.model.customCards;

					if(customCards.currentSize > UPLOAD_LIMIT || message.length > UPLOAD_LIMIT)
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

					if(customCards.descriptions.filter(x => x.pack == description.pack).length == 0)
					{
						customCards.descriptions.push(description);
					}

					customCards.cards = mergePacks(customCards.cards, cards);

					customCards.currentSize = JSON.stringify(customCards.cards).length + JSON.stringify(customCards.descriptions).length;

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
				// TODO rework lobbying system.
				game.isInGame = false;
				game.isLobbyOpen = true;
				game.toEveryone("startlobby;");
				game.sendLobbyList();

				for(let player of game.model.players)
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


			if(message.startsWith("kick;"))
			{
				game.onKickMessage(message, socket);
			}

			if(message.startsWith("requestmodel;"))
			{	
				// If a new player joins + there's no one else connected (rejoining a dead game), make sure it's their turn.
				if(game.model.players.filter(x => x.socket.isAlive).length == 1)
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

				let card, no, prop, value, arg;
				var stuff = message.split(";");

				// TODO validate props + values

				if(stuff.length == 4)
					[_, card, prop, value] = stuff;
				else
					return;

				if(!cards[card]) return;

				try{
					

					game.model.addEffect(card, prop, value);
					

					game.toEveryoneElse( socket, "effects;" + JSON.stringify(game.turnstate.overrides));

					// a changeling update can create more broken ships
					if(game.turnstate)
					{
						if(prop == "shipWithEverypony")
						{
							game.turnstate.specialEffects.shipWithEverypony.add(card);
						}

						game.updateCountsFromBoardState(false);
					}

					game.checkIfGoalsWereAchieved();
				}
				catch(e)
				{
				}				
			}

			if(message.startsWith("special;"))
			{
				game.onSpecialMessage(message, socket);
				return;
			}

			if(message.startsWith("draw;"))
			{
				var [_, typ, specialLoc] = message.split(";");

				if(typ != "ship" && typ != "pony" && typ != "goal")
					return;

				let model2 = game as any;

				var len = model2[typ + "DrawPile"].length as number;

				if(typ == "goal" && len)
				{

					if(specialLoc)
					{
						if(specialLoc == "tempGoals")
						{
							let card = model2["goalDrawPile"].pop() as Card;					

							game.tempGoals.push(card);
							game.cardLocations[card] = "tempGoals";
		
							game.toEveryone("draw;goal;" + (len - 1));
							game.toEveryone("move;" + card + ";goalDrawPile;tempGoals");
							game.checkIfGoalsWereAchieved();
						}
					}
					else
					{
						var goalNo = game.currentGoals.indexOf("blank:goal")

						if(goalNo > -1)
						{
							let card = model2["goalDrawPile"].pop();
							game.currentGoals[goalNo] = card
							game.cardLocations[card] = "goal," + goalNo;

							var msg = "draw;" + typ + ";" + (len - 1);

							game.toEveryone(msg);
							game.toEveryone( "move;" + card + ";goalDrawPile;goal," + goalNo);
							game.checkIfGoalsWereAchieved();
						}
						else
							return ;
					}

					
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
						game.toEveryone(msg);
						socket.send("move;" + card + ";" + typ + "DrawPile;hand");

						game.toTeamMembers(socket, "move;" + card + ";" + typ + "DrawPile;player," + player.name)
						game.toNonTeamMembers(socket, "move;anon:" + typ + ";" + typ + "DrawPile;player," + player.name);
					
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


	public onHandshakeMessage(message:string, socket:ws)
	{
		let id = Number(message.split(";")[1]);

		var player = this.getPlayer(socket, id);

		if(!player)
		{
			player = this.addPlayerConnection(socket);
		}

		if(this.isRegistered(player) && this.isInGame)
		{
			socket.send("handshake;game");
			this.sendPlayerlistsToEachPlayer();

			if(this.players.filter(x => !x.socket.isDead).length == 1)
				this.changeTurnToNextPlayer(); // only one alive player. Make sure it's their turn.
		}
		else if(this.isLobbyOpen)
		{
			socket.send("handshake;lobby");
			this.sendLobbyList();
		}
		else
		{
			socket.send("handshake;closed");
		}

		if(!this.host)
		{
			var players = this.players
			this.host = players[0].socket;
			this.sendHostMessage( players[0].socket, true);
		}
	}

	public onKickMessage(message:string, socket:ws)
	{
		if (socket != this.host) return;


		var [_, playerName] = message.split(";");

		
		let player = this.model.getPlayerByName(playerName);
		if(!player) {return;}


		player.socket.send("kick");
		player.socket.close();

		this.model.removePlayer(playerName);




		


		
		// request game

		for(let player of this.model.players)
		{
			this.sendCurrentState(player.socket);
		}

	}

	public onDebugMessage(socket:ws)
	{
		var gameCopy = {} as any;

		gameCopy.messageHistory = this.messageHistory;
		gameCopy.board = this.model.board;

		if(this.turnstate)
		{
			let ts = this.turnstate;
			let cts = gameCopy.turnstate = {} as any;

			cts.currentPlayer = ts.currentPlayer;
			cts.overrides = ts.overrides;

				
			cts.playedPonies = ts.playedPonies;
			cts.playedShips = ts.playedShips;
			cts.playedShipCards = ts.playedShipCards

			cts.playedThisTurn = ts.playedThisTurn;

			cts.brokenShipsCommitted = ts.brokenShipsCommitted;
			cts.brokenShips = ts.brokenShips
			cts.swapsCommitted = ts.swapsCommitted;
			cts.swaps = ts.swaps;

			cts.shipSet = [...ts.shipSet];
			cts.positionMap = ts.positionMap;
				
			cts.changelingContexts = ts.changelingContexts;
		}

		socket.send("debug;" + JSON.stringify(gameCopy));
	}
	public onSpecialMessage(message:string, socket: ws)
	{	
		var [_, type] = message.split(";");

		if(type == "exchangeCardsBetweenHands")
		{
			// TODO check this
			let playersInGame = this.model.players.filter(x => this.isRegistered(x));
			let playerCount = playersInGame.length;

			let playersShifted = [...playersInGame.slice(1), playersInGame[0]];

			let fromPlayer = playersInGame.map(x => x.name);

			let cards = [];
			for(let player of playersInGame)
			{
				if(player.hand.length)
				{
					let i = Math.floor(Math.random() * player.hand.length);
					let card = player.hand[i];
					cards.push(card);
					player.hand.splice(i, 1);
				}
				else
				{
					cards.push("");
				}
			}

			for(let i = 0; i < playersInGame.length; i++)
			{
				let card = cards[i];
				if(card)
				{
					playersShifted[i].hand.push(card);
					this.model.cardLocations[card] = "player," + playersShifted[i].name;
					playersInGame[i].socket.send("move;" + card + ";hand;player," + playersShifted[i].name); // take all the cards first
				}
			}

			for(let i = 0; i < playersInGame.length; i++)
			{
				let card = cards[i];
				if(card)
				{
					playersShifted[i].socket.send("move;" + card + ";player," + playersInGame[i].name + ";hand"); // then move all the cards
				}
			}
		}

	}

	private onClose(game: GameInstance, socket: ws & {isAlive: boolean, isDead: boolean})
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

	public toTeamMembers(thissocket: ws, message: string)
	{
		let player = this.getPlayer(thissocket)!;;
		for(var i=0; i < this.players.length; i++)
		{
			var socket = this.players[i].socket;
			if(socket != thissocket && socket.isAlive && player.team == this.players[i].team && player.team !== undefined)
			{
				socket.send(message);
			}
		}
	}

	public toNonTeamMembers(thissocket: ws, message: string)
	{
		let player = this.getPlayer(thissocket)!;;
		for(var i=0; i < this.players.length; i++)
		{
			var socket = this.players[i].socket;
			if(socket != thissocket && socket.isAlive && (player.team != this.players[i].team || player.team == undefined))
			{
				socket.send(message);
			}
		}
	}

	public toEveryoneElse(playerName: string, message: string)
	{
		for(var player of this.model.players)
		{
			if(player.name != playerName)
			{
				player.socket.send(message);
			}
		}
	}	

	public toEveryone( message: string)
	{
		for(var player of this.model.players)
		{
			player.socket.send(message);
		}
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
		var payload = "0";

		if(isHost)
		{
			let teams: {[key: string]: string} = {};
			for(let player of this.players)
			{
				if(player.team !== undefined)
				{
					teams[player.name] = player.team;
				}
			}

			let lobbyOptions: GameOptions = {
				cardDecks: this.cardDecks,
				startCard: this.startCard,
				teams,
				ruleset: this.ruleset,
				keepLobbyOpen: this.keepLobbyOpen,
				customCards: this.customCards
			}

			var payload = JSON.stringify(lobbyOptions);
		}
			

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
		var allGoals = this.currentGoals.concat(this.tempGoals);

		for(var goal of allGoals)
		{
			var achieved = false;

			if(!isBlank(goal))
				achieved = evalGoalCard(goal, this)

			if(achieved != this.achievedGoals.has(goal))
			{
				sendUpdate = true;
			}

			if(achieved)
			{
				this.achievedGoals.add(goal);
			}
			else
			{
				this.achievedGoals.delete(goal);
			}
		}

		if(sendUpdate)
		{
			let message = ["goalachieved", ...this.achievedGoals].join(";");
			if(message == "goalachieved")
				message += ";"

			this.toEveryone(message);
		}
	}

	private shipString(card1:Card, card2: Card): string
	{
		if(card1 < card2)
			return card1 + "/" + card2

		return card2 + "/" + card1;
	}

	

	public setLobbyOptions(options: GameOptions)
	{
		this.startCard = options.startCard || "Core.Start.FanficAuthorTwilight";
		this.runGoalLogic = options.startCard != "HorriblePeople.2015ConExclusives.Start.FanficAuthorDiscord" && options.ruleset == "turnsOnly";
		this.keepLobbyOpen = !!options.keepLobbyOpen;
		this.ruleset = options.ruleset.substring(0,200) as "turnsOnly" | "sandbox";

		for(let playerName in options.teams)
		{
			let player = this.getPlayerByName(playerName);
			if(player)
			{
				player.team = options.teams[playerName];
			}
		}

		var decks = ["Core.*"];
		if(options.cardDecks)
		{
			decks = options.cardDecks;
		}

		cm.init(decks.concat([this.startCard]), this.customCards.cards);

		this.cardDecks = decks;
	}

	public startGame(preset?: any)
	{	
		this.isLobbyOpen = this.keepLobbyOpen;

		/*if(!preset)
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
		}*/

		this.startTime = new Date().getTime();

	

		this.isInGame = true;
		

		logGameHosted();

		for(let i of this.model.players.filter(x => this.isRegistered(x)))
		{
			logPlayerJoined();
		}

		
		// TODO test rulesets

		/*if(this.ruleset == "turnsOnly")
		{
			this.turnstate = new Turnstate();
			this.turnstate.init(this, this.players[0] ? this.players[0].name : "")
		}
		else
		{
			delete this.turnstate;
		}*/
		
		// TODO
		//if(preset)
		//	this.loadPreset(preset);
	}

	// TODO
	/*private loadPreset(hand: Card[])
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
	}*/


	private sendPlayerCounts(player:Player)
	{
		var ponies = player.hand.filter(x => isPony(x)).length;
		var ships = player.hand.filter(x => isShip(x)).length;

		var args = ["counts", player.name, ponies, ships, ...player.winnings.map(x=>x.card + "," + x.value)]
		this.toEveryoneElse(player.socket, args.join(";"));
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
		this.model.changeTurnToNextPlayer();

		this.toEveryone("turnstate;" + JSON.stringify(this.turnstate!.clientProps()));

		this.checkIfGoalsWereAchieved();
	}

	private moveCard(message: string, playerName: string)
	{
		var [_,card, startLocation, endLocation, extraArg] = message.split(";");
		var player = this.model.getPlayerByName(playerName);

		if(!player) { return; }

		let serverStartLoc = startLocation;
		if(startLocation == "hand" || startLocation == "winnings")
			serverStartLoc = "player," + player.name;


		let actualLocation = this.model.isInvalidMoveOnClient(playerName, card, startLocation, endLocation);
		if(actualLocation)
		{
			player.socket.send("move;" + card + ";limbo;" + actualLocation);
			return;
		}


		this.model.moveCard(playerName, card, startLocation, endLocation, extraArg);

		// cant move to a goal location yet

		player.socket.send("move;" + card + ";" + startLocation + ";" + endLocation);

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
	
		// TODO
		this.checkIfGoalsWereAchieved();
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
		catch(e: any)
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