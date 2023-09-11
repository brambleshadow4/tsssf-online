import ws from "ws";
import * as util from 'util'
import fs from "fs";
import { 
	isPony, 
	isShip,
	isStart,
	isDiscardLoc,
	isPlayerLoc,
	Card,
	PackListPack,
	GameOptions, defaultGameOptions,
	Player,
	CardConfig
} from "../model/lib.js";

import GameModel from "../model/GameModel.js";

import * as cm from "../model/cardManager.js";
import {validatePack, flattenPack, mergePacks} from "../model/packLib.js";

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

const TEMP_DISCONNECT_TIME = 15*1000;
const NO_MOVE_EXPIRE_TIME = 60*60*1000; // 1 hour
export class TsssfGameServer
{
	public games: {[key:string] : GameInstance};
	private wsServer: ws.Server;

	private DEFAULT_CARDS: CardConfig;

	constructor(cardConfig: CardConfig)
	{
		this.DEFAULT_CARDS = cardConfig;
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

				for(var i=0; i < games[key].model.players.length; i++)
				{
					if(!games[key].model.players[i].disconnected)
					{
						anyPlayersAlive = true;
						break;
					}
				}

				if(games[key].isLobbyOpen && !anyPlayersAlive)
				{
					for(let socket of games[key].newConnections)
					{
						if(socket.readyState == socket.OPEN)
						{
							anyPlayersAlive = true;
						}
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
		
		this.games[key] = new GameInstance(this.DEFAULT_CARDS);

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
				stats.players += this.games[key].model.players.filter(x => !x.disconnected).length;

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

	private onConnection(socket: ws, request:any, client:any)
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
	public deathCount = 0;

	public cardConfig: CardConfig;


	public newConnections: ws[] = [];

	public gameOptions: GameOptions = defaultGameOptions();
	public lastMessageTimestamp: number;

	private host?: ws;

	public messageHistory: string[] = [];

	public debug = false;

	constructor(cardConfig: CardConfig)
	{
		this.cardConfig = JSON.parse(JSON.stringify(cardConfig));
		this.lastMessageTimestamp = new Date().getTime();
	}

	public onConnection(socket: ws, request:any, client:any)
	{
		socket.on('message', handleCrash(this.onMessage(this, socket)));
		socket.on('close', handleCrash(this.onClose(this, socket as any)));

		//this.updateLobby();		
	}

	public onMessage(game: GameInstance, socket: ws)
	{
		return function(message: string)
		{
			if(!game) // not quite sure how this happens, but this crashed one time.
				return;

			let logPlayerName = game.getPlayerBySocket(socket)?.name || ":unknown:"; 

			game.messageHistory.push(logPlayerName + ";" + message);
			game.lastMessageTimestamp = new Date().getTime();

			if(message.startsWith("handshake;"))
			{
				game.onHandshakeMessage(message, socket); return; 
			}
			
			if(message == "debug") 
				game.onDebugMessage(socket);

			if(game.isLobbyOpen)
			{
				
				if(game.host == socket)
				{
					if(message.startsWith("setLobbyOptions;"))
					{
						var options = defaultGameOptions();

						try 
						{
							options = JSON.parse(message.substring("setLobbyOptions;".length))
						}
						catch(e){ }

						game.setLobbyOptions(options);

						return;	
					}

					if(message.startsWith("game;"))
					{
						game.startGame();
						for(let player of game.model.players)
						{
							game.sendCurrentState(player.name);
						}				

						return;			
					}

					if(message.startsWith("uploadCards;") && game.host == socket)
					{
						let customCards = game.cardConfig.custom;

						if(customCards.currentSize > UPLOAD_LIMIT || message.length > UPLOAD_LIMIT)
						{
							socket.send("uploadCardsError;Upload limit reached for this lobby.");
							return;
						}	

						var json = message.substring("uploadCards;".length);
						var newCards;
						try
						{
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

						if(customCards.descriptions.filter(x => (x as PackListPack).pack == description.pack).length == 0)
						{
							customCards.descriptions.push(description);
						}

						customCards.cards = mergePacks(customCards.cards, cards);
						customCards.currentSize = JSON.stringify(customCards.cards).length + JSON.stringify(customCards.descriptions).length;

						if(game.host)
						{
							game.host.send(game.makeLobbyMessage(game.host));
						}
					}
				}	
			}

			if(game.isInGame && message.startsWith("lobby;") && socket == game.host)
			{
				// TODO rework lobbying system.
				game.isInGame = false;
				game.isLobbyOpen = true;
				game.updateLobby();
			}

			if(game.isInGame && socket == game.host && message.startsWith("keepLobbyOpen;"))
			{
				var [_, keepLobbyOpenSTR] = message.split(";");
				let keepLobbyOpen = !!Number(keepLobbyOpenSTR);
				game.isLobbyOpen = keepLobbyOpen;
				game.gameOptions.keepLobbyOpen = keepLobbyOpen;

				game.toEveryone("keepLobbyOpen;" + (keepLobbyOpen ? 1 : 0));
			}

			let player = game.getPlayerBySocket(socket);

			if(!player)
			{
				return;
			}

			if(message.startsWith("kick;"))
			{
				game.onKickMessage(message, socket);
			}


			if(message.startsWith("effects;") && game.model.turnstate)
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
					game.toEveryoneElse(player.name, "effects;" + JSON.stringify(game.model.turnstate.overrides));
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

				let [success, newLen, card, newLoc] = game.model.drawCard(player.name, typ as any, specialLoc);

				if(!success)
				{
					return;
				}

				if(typ == "goal")
				{
					game.toEveryone("draw;goal;" + newLen);
					game.toEveryone("move;" + card + ";goalDrawPile;" + newLoc);
					game.checkIfGoalsWereAchieved();
				}
				else
				{
					var msg = "draw;" + typ + ";" + newLen;
					game.toEveryone(msg);
					let location = typ + "DrawPile;player," + player.name;
					socket.send("move;" + card + ";" + location);
					game.toTeamMembers(player.name, "move;" + card + ";" + location)
					game.toNonTeamMembers(player.name, "move;anon:" + typ + ";" + location);
					game.sendPlayerCounts(player);
				}
			}

			if(message.startsWith("swapshuffle;"))
			{
				var [_,typ] = message.split(";");

				if(["pony","goal","ship"].indexOf(typ) > -1)
				{
					game.model.swapShuffle(typ as any);
					let model2 = game.model as any;
					game.toEveryone(["swapshuffle", typ, model2[typ+"DrawPile"].length, ...model2[typ+"DiscardPile"]].join(";"));
				}
			}

			if(message.startsWith("move;"))
				game.moveCard(message, player.name);

			if(message == "endturn")
			{
				if(!game.model.turnstate)
					return;

				if(player.name == game.model.turnstate.currentPlayer)
					game.changeTurnToNextPlayer();	
			}
		}
	}

	public onHandshakeMessage(message:string, socket:ws)
	{
		let pieces = message.split(";");

		let id = Number(pieces[1]);
		let name = pieces[2]; // name is intentionally undefined on a normal handshake;<ID> message
		
		// recover disconnected players
		var player = this.getPlayerBySocket(socket);
		if(!player)
		{
			player = this.getPlayerByID(id);

			if(player)
			{
				if(player.socket == this.host)
				{
					this.host = socket;
					player.isHost = true;
				}

				player.socket = socket;
				player.disconnected = 0;
			}
		}


		// register name. 
		if(!player && name !== undefined && this.isLobbyOpen)
			player = this.registerPlayerName(socket, name);

		// keep track of new connections
		if(!player)
		{
			if(this.isLobbyOpen && this.newConnections.indexOf(socket) == -1)
				this.newConnections.push(socket);
		}

		// update host
		if(!this.host)
			this.reassignHost();


		// redirect to lobby/game
		if(player && this.isInGame)
		{
			if(this.model.turnstate && !this.model.turnstate.currentPlayer)
				this.changeTurnToNextPlayer();

			this.sendCurrentState(player.name);
			this.sendPlayerlistsToEachPlayer();
		}
		
		if(this.isLobbyOpen)
			this.updateLobby();
		else if(!player)
		{
			// send lobby closed
			socket.send(this.makeLobbyMessage(socket));
		}

	}

	private makeLobbyMessage(socket: ws)
	{
		let player = this.getPlayerBySocket(socket);

		let isHost = this.host == socket;

		// See also SCHEMA.LOBBY_PAYLOAD in lobby.ts
		return "lobby;" + JSON.stringify({

			id: player?.id || 0,
			name: player?.name || "",

			isClosed: !player && !this.isLobbyOpen,
			players: this.model.players.map(x => x.name).concat(this.newConnections.map(x => "")),

			isHost,
			gameOptions: isHost ? this.gameOptions : {},
			cardConfig: this.cardConfig
		})
	}

	public onKickMessage(message:string, socket:ws)
	{
		if (socket != this.host) return;


		var [_, playerName] = message.split(";");

		
		let player = this.model.getPlayerByName(playerName);
		if(!player || player.isHost) {return;}


		player.socket.send("kick");
		player.socket.close();

		this.model.removePlayer(playerName);


		for(let player of this.model.players)
		{
			this.sendCurrentState(player.name);
		}
	}

	public onDebugMessage(socket:ws)
	{
		var gameCopy = {} as any;

		gameCopy.messageHistory = this.messageHistory;
		gameCopy.board = this.model.board;

		if(this.model.turnstate)
		{
			let ts = this.model.turnstate;
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
			let playersInGame = this.model.players;
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
					let fromLoc = "player,"+ playersInGame[i].name;
					let toLoc = "player," + playersShifted[i].name
					playersInGame[i].socket.send("move;" + card + ";" + fromLoc + ";" + toLoc); // take all the cards first
				}
			}

			for(let i = 0; i < playersInGame.length; i++)
			{
				let card = cards[i];
				if(card)
				{
					let fromLoc = "player,"+ playersInGame[i].name;
					let toLoc = "player," + playersShifted[i].name
					playersShifted[i].socket.send("move;" + card + ";" + fromLoc + ";" + toLoc); // then move all the cards
				}
			}
		}

	}

	private onClose(game: GameInstance, socket: ws & {disconnectAt: number})
	{
		return function()
		{
			let i = game.newConnections.indexOf(socket);
			if(i > -1)
			{
				game.newConnections.splice(i,1);

				if(game.host == socket)
				{
					game.reassignHost();
				}
			}

			let player = game.getPlayerBySocket(socket);

			if(!player) { return; }

			player.disconnected = 1;

			if(!game.isInGame && socket != game.host)
			{
				let i = game.model.players.indexOf(player);
				game.model.players.splice(i,1);

				game.updateLobby();
			}

			if(game.isInGame)
			{
				game.sendPlayerlistsToEachPlayer();
			}
			
			let deadName = player.name;

			// mark the socket as dead after 15 s. 
			setTimeout(() => {

				let player = game.getPlayerByName(deadName);

				if(!player) { return; }
				if(player.socket != socket) { return; }

				player.disconnected = 2;

				if(!game.isInGame)
				{
					let i = game.model.players.indexOf(player);
					game.model.players.splice(i,1);
				}

				if(player.socket == game.host)
				{
					game.reassignHost();
				}

				if(game.model.turnstate?.currentPlayer == deadName)
				{
					game.changeTurnToNextPlayer();
				}

				if(game.isLobbyOpen)
				{
					game.updateLobby();
				}
				if(game.isInGame)
				{
					game.sendPlayerlistsToEachPlayer();
				}


			}, TEMP_DISCONNECT_TIME); 

			
		}
	}	

	// sets host state, doesn't send updates
	private reassignHost()
	{
		if(this.host)
		{
			let oldHostPlayer = this.getPlayerBySocket(this.host);
			if(oldHostPlayer)
			{
				oldHostPlayer.isHost = false;
			}
		}

		if(!this.isInGame)
		{
			this.gameOptions.cardDecks = this.gameOptions.cardDecks.filter( (x: Card)=> !x.startsWith("X."))
		}

		let alivePlayers = this.model.players.filter(x => x.disconnected == 0)

		if(alivePlayers.length)
		{
			this.host = alivePlayers[0].socket;
			alivePlayers[0].isHost = true;
		}
		else if(this.newConnections.length)
		{
			this.host = this.newConnections[0];
		}
		else
		{
			delete this.host;
		}
	}

	private checkNameIsUnique(name: string)
	{
		for(var i=0; i < this.model.players.length; i++)
		{
			if(this.model.players[i].name == name)
			{
				return false;
			}
		}

		return true;
	}

	private registerPlayerName(socket: ws, baseName: string)
	{
		var player = this.getPlayerBySocket(socket)
		if(player){ return; }

		var count = 0;

		baseName = baseName.replace(/[^A-Za-z0-9 _]/g, "").trim();
		baseName = baseName || "Player";

		let finalName = baseName;

		while(!this.checkNameIsUnique(finalName))
		{
			count++;
			finalName = baseName + count;
		}

		player = {
			id: Math.floor(Math.random()*10**16)+1,
			name: finalName,
			socket,
			isHost: socket == this.host,

			hand: [],
			disconnected: 0,
			team: "",
			winnings: [],
			ponies: 0,
			ships: 0,
		}

		this.model.players.push(player);

		let i = this.newConnections.indexOf(socket);
		if(i > -1){
			this.newConnections.splice(i,1);
		}

		return player;
	}

	public updateLobby()
	{
		if(!this.isInGame)
		{
			for(let player of this.model.players)
			{
				player.socket.send(this.makeLobbyMessage(player.socket));
			}
		}
		
		for(let conn of this.newConnections)
		{
			conn.send(this.makeLobbyMessage(conn));
		}
	}

	public getPlayerBySocket(thissocket: ws)
	{
		for(let player of this.model.players)
		{
			if(player.socket  && player.socket == thissocket)
			{
				return player;
			}
		}
	}

	public getPlayerByID(id: number)
	{
		for(let player of this.model.players)
		{
			if(player.id && player.id == id)
			{
				return player;
			}
		}
	}

	public getPlayerByName(name: string)
	{
		return this.model.getPlayerByName(name);
	}

	public toTeamMembers(playerName: string, message: string)
	{
		let player = this.getPlayerByName(playerName)!;

		for(let p of this.model.players)
		{
			if(player.team && p != player && player.team == p.team)
			{
				p.socket.send(message);
			}
		}
	}

	public toNonTeamMembers(playerName: string, message: string)
	{
		let player = this.getPlayerByName(playerName)!;

		for(let p of this.model.players)
		{
			if(p != player && (!player.team || player.team != p.team))
			{
				p.socket.send(message);
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
		for(var player of this.model.players)
		{
			if(!player.disconnected && player.name != "")
			{
				var playerlist = this.model.getPlayerListForPlayer(player.name);
				player.socket.send("playerlist;" + JSON.stringify(playerlist));

				// TODO update recieving end.
			}
		}
	}

	private sendCurrentState(playerName: string)
	{
		let player = this.getPlayerByName(playerName)!;
		var model = this.model.getPlayerModel(playerName);
		model.cardConfig = this.cardConfig;
		player.socket.send("game;" + JSON.stringify([this.gameOptions, model]));
	}

	private checkIfGoalsWereAchieved()
	{
		if(this.model.wereGoalsAchieved())
		{
			let message = ["goalachieved", ...this.model.achievedGoals].join(";");
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
		let newOptions = defaultGameOptions();

		newOptions.startCard = options.startCard || newOptions.startCard;
		this.model.runGoalLogic = options.startCard != "HorriblePeople.2015ConExclusives.Start.FanficAuthorDiscord" && options.ruleset == "turnsOnly";
		newOptions.keepLobbyOpen = !!options.keepLobbyOpen;
		newOptions.ruleset = options.ruleset.substring(0,200) as "turnsOnly" | "sandbox";

		for(let playerName in options.teams)
		{
			let player = this.getPlayerByName(playerName);
			if(player)
			{
				player.team = options.teams[playerName];
				newOptions.teams[playerName] = player.team;
			}
		}

		newOptions.cardDecks = options.cardDecks || newOptions.cardDecks;
		cm.init(this.cardConfig, newOptions);

		this.gameOptions = newOptions;
	}

	public startGame(preset?: any)
	{	
		this.isLobbyOpen = this.gameOptions.keepLobbyOpen;

		if(!preset)
		{
			// remove players which disconnected before the games started
			for(var i=0; i< this.model.players.length; i++)
			{
				if(this.model.players[i].name == "" || this.model.players[i].socket.disconnected)
				{
					this.model.players.splice(i,1);
					i--;
				}
			}

			if(this.model.players.length == 0)
				return false;
		}

		this.startTime = new Date().getTime();
		this.model.clearGameForStart(this.gameOptions);
		this.model.mode = "server";
		this.isInGame = true;
		
		logGameHosted();

		for(let i of this.model.players)
		{
			logPlayerJoined();
		}

		if(preset)
			this.loadPreset(preset);
	}

	private loadPreset(hand: Card[])
	{
		let player =  {
			name: "Dev",
			id: 1,
			socket: undefined,
			hand: [],
			winnings: [],
			team: "",
			disconnected: 0,
			ponies: 0,
			ships:0,
			isHost: true,
		} as Player;

		this.model.players.push(player);

		for(let card of hand)
		{
			if(isPony(card))
			{
				player.hand.push(card);
				this.model.cardLocations[card] = "player,Dev";
				this.model.ponyDrawPile.splice(this.model.ponyDrawPile.indexOf(card), 1);
			}
			if(isShip(card))
			{
				player.hand.push(card);
				this.model.cardLocations[card] = "player,Dev";
				this.model.shipDrawPile.splice(this.model.shipDrawPile.indexOf(card), 1);
			}
		}
	}


	private sendPlayerCounts(player:Player)
	{
		var ponies = player.hand.filter(x => isPony(x)).length;
		var ships = player.hand.filter(x => isShip(x)).length;

		var args = ["counts", player.name, ponies, ships, ...player.winnings.map(x=>x.card + "," + x.value)]
		this.toEveryoneElse(player.socket, args.join(";"));
	}

	private changeTurnToNextPlayer()
	{
		this.model.changeTurnToNextPlayer();
		this.toEveryone("turnstate;" + JSON.stringify(this.model.turnstate!.toClientTurnstate()));
		this.checkIfGoalsWereAchieved();
	}

	private moveCard(message: string, playerName: string)
	{
		var [_, card, startLocation, endLocation, extraArg] = message.split(";");
		var player = this.model.getPlayerByName(playerName);

		if(!player) { return; }
		if((isPlayerLoc(startLocation) && startLocation != "player,"+playerName) 
			|| (isPlayerLoc(endLocation) && endLocation != "player,"+playerName))
		{
			// player is trying to move cards to another player, illegal.
			return;
		}

		if(!cm.inPlay()[card])
		{
			return;
		}


		let actualLocation = this.model.isInvalidMoveOnClient(playerName, card, startLocation, endLocation);
		
		if(actualLocation)
		{
			player.socket.send("move;" + card + ";limbo;" + actualLocation);
			return;
		}

		this.model.moveCard(card, startLocation, endLocation, extraArg);
		this.toEveryone("move;" + card + ";" + startLocation + ";" + endLocation);

		if(isPlayerLoc(endLocation) || isPlayerLoc(startLocation))
		{
			this.sendPlayerCounts(player);
		}

		if(isDiscardLoc(startLocation) && !isDiscardLoc(endLocation))
		{
			var [pile,slot] = startLocation.split(",");
			let model2 = this.model as any;

			if(model2[pile].length)
			{
				var topCard = model2[pile][model2[pile].length-1]
				this.toEveryone( "move;" + topCard + ";" + pile + ",stack;" + pile + ",top");
			}
		}
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