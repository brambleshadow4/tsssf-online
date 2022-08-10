import {
	updateGame, moveCard, isItMyTurn,
	updateTurnstate
} from "./game.js";



import {
	Location,
	Card,
	GameOptions,
	randomizeOrder
} from "../../model/lib.js";

import {
	updatePonyDiscard,
	updateShipDiscard,
	updateGoalDiscard,
	updatePlayerList,
	updateGoals,
	updateTableOffside
} from "./peripheralComponents.js";

import {WebSocketPlus} from "../viewSelector.js";

import GameModel, {playerGameModelFromObj} from "../../model/GameModel.js";
import {fromClientTurnstate} from "../../model/turnstate.js";


let win = window as unknown as {
	model: GameModel,
	gameOptions: GameOptions,
	moveToStartCard: () => any;
	socket: WebSocketPlus;
}

///var socket;
//var pendingRequests = [];

//var host = window.location.host.replace(/:.*/,"") + ":8080";

//socket = new WebSocket("ws://" + host + "/" + window.location.search);

//socket.addEventListener("open", function()
//{
//	console.log("Socket opened successfully!")

//	socket.send("requestmodel;" + (localStorage["playerID"] || 0))
//});

/*socket.addEventListener("close", function(){

	alert("The connection to the server was closed :(")
	console.log("closed")
})
*/

var heldDebugResolve: undefined | ((obj: any) => void) ;



var kicked = false;

export function attachToSocket(socket: WebSocketPlus)
{
	kicked = false;
	socket.onMessageHandler = messageHandler;

	socket.onCloseHandler = function(event: MessageEvent)
	{
		setTimeout(function(){
			if(!kicked)
			{
				document.getElementById('playingArea')!.style.backgroundColor = "#FFCCCC";
				alert("Failed to connect to the server :(");
			}
		}, 300);
	}
}

function messageHandler(event: MessageEvent)
{
	var model = win.model;

	if(event.data.startsWith('kick'))
	{
		document.getElementById('playingArea')!.style.backgroundColor = "#FFCCCC";
		alert("The game's host kicked you from the game");
		kicked = true;

	}

	if(event.data.startsWith("effects;") && model.turnstate)
	{
		var data = event.data.substring(8)
		try
		{
			data = JSON.parse(data);
			model.turnstate.overrides = data;
			
			updateTurnstate();
		}
		catch(e){}
	}

	if(event.data.startsWith('turnstate;') && model.turnstate)
	{
		model.turnstate = fromClientTurnstate(JSON.parse(event.data.substring("turnstate;".length)));
		updateTurnstate();
	}

	if(event.data.startsWith("debug;"))
	{
		if(heldDebugResolve)
		{
			heldDebugResolve(JSON.parse(event.data.substring("debug;".length)));
			heldDebugResolve = undefined;
		}
		
	}

	if(event.data.startsWith('keepLobbyOpen;'))
	{
		// TODO
		// model.keepLobbyOpen = !!Number(event.data.split(";")[1]);
	}

	if(event.data.startsWith('closed;'))
	{
		window.location.href = location.protocol + "//" + window.location.host;
	}

	if(event.data.startsWith("playerlist;"))
	{
		model.players = JSON.parse(event.data.substring(11));
		updatePlayerList();
		updateTurnstate();
	}

	if(event.data.startsWith("game;"))
	{
		let modelPreviouslyLoaded = model;

		let gameOptions: GameOptions;
		let newModel: GameModel;

		[gameOptions, newModel] = JSON.parse(event.data.substring("game;".length));

		let newerModel = playerGameModelFromObj(newModel);
		win.gameOptions = gameOptions;

		localStorage["playerID"] = newerModel.me().id; // register here too in case lobby page is skipped

		updateGame(newerModel);

		if(!modelPreviouslyLoaded)
		{
			win.moveToStartCard();
		}
	}

	if(event.data.startsWith("move;"))
	{
		var [_, card, startLocation, endLocation] = event.data.split(";");
		moveCard(card, startLocation, endLocation, {forceCardToMove: true});
	}

	if(event.data.startsWith("draw;"))
	{
		var [_, typ, count] = event.data.split(";");

		(model as any)[typ+ "DrawPileLength"] = count;

		var funs ={
			"pony": updatePonyDiscard,
			"ship": updateShipDiscard,
			"goal": updateGoalDiscard
		};
		(funs as any)[typ]();
	}

	if(event.data.startsWith("swapshuffle;"))
	{
		var [_, type, count, ...cards] = event.data.split(";");

		for(var card of (model as any)[type + "DiscardPile"])
		{
			delete model.cardLocations[card];
		}

		(model as any)[type+"DrawPileLength"] = count;
		(model as any)[type+"DiscardPile"] = cards;

		for(var card of cards)
			model.cardLocations[card] = type + "DiscardPile,stack";

		if(cards.length)
			model.cardLocations[cards[cards.length-1]] = type + "DiscardPile,top";

		var funs ={
			"pony": updatePonyDiscard,
			"ship": updateShipDiscard,
			"goal": updateGoalDiscard
		};
		(funs as any)[type]();
	}

	if(event.data.startsWith("counts;"))
	{

		let _, name:string, ponies, ships;
		let winnings: string[];

		[_, name, ponies, ships, ...winnings] = event.data.split(";");

		var player = model.players.filter(x => x.name == name)[0];

		if(player)
		{
			player.ponies = ponies;
			player.ships = ships;
			player.winnings = winnings.map(x =>{
				var s = x.split(",")
				return {
					card: s[0],
					value: Number(s[1])
				}
			});
		}
		else
		{
			console.error("player " + name + " doesn't exist");
		}

		updatePlayerList();
	}

	if(event.data.startsWith("goalachieved;"))
	{
		let _, achievedCards: Card[];
		[_, ...achievedCards] = (event.data as string).split(";");

		if(achievedCards[0] == "")
			achievedCards = [];

		model.achievedGoals = new Set(achievedCards);

		updateGoals(undefined, true);
		if(model.tempGoals)
		{
			updateTableOffside();
		}
	}
}

export function networkInitLoad(handshakeMessage: string)
{
	messageHandler({data: handshakeMessage} as MessageEvent);
}


// extra arg is used for goals
export function broadcastMove(card: Card, startLocation: Location, endLocation: Location, extraArg?: string)
{
	broadcast("move;" + card + ";" + startLocation + ";" + endLocation + ";" + extraArg);
}


export function broadcast(message: string)
{
	//setTimeout(function(){
		win.socket?.send(message);
	//},3000);
}

export function requestDrawPony()
{
	if(isItMyTurn())
	{
		broadcast("draw;pony");
			
		if(win.model.mode != "client")
		{
			let card = win.model.ponyDrawPile[0]
			if(card)
				moveCard(card, "ponyDrawPile", "player," + win.model.playerName, {})
		}
	}
}

export function requestDrawShip()
{
	if(isItMyTurn())
	{
		broadcast("draw;ship");
		if(win.model.mode != "client")
		{
			let card = win.model.shipDrawPile[0];
			if(card)
				moveCard(card, "shipDrawPile", "player," + win.model.playerName, {})
		}
	}
}

export function requestDrawGoal(specialLocation?: string)
{
	if(isItMyTurn())
	{
		let model = win.model;
		if(specialLocation)
			broadcast("draw;goal;" + specialLocation);
		else
			broadcast("draw;goal");

		if(model.mode != "client")
		{
			let goalNo = 0;

			while(goalNo < 3)
			{
				if(model.currentGoals[goalNo] == undefined || model.currentGoals[goalNo] == "blank:goal")
					break;
				goalNo++;
			}

			if(goalNo == 3 && !specialLocation)
				return;

			let location = specialLocation || "goal," + goalNo

			let card = win.model.goalDrawPile[0];
			if(card)
			{
				moveCard(card, "goalDrawPile", location, {})
			}
		}
	}
}


export function requestSwapShuffle(typ: "pony" | "ship" | "goal")
{
	if(isItMyTurn())
	{
		if(window.location.pathname.indexOf("/tutorial") >= 0)
			return;

		broadcast("swapshuffle;" + typ);
		let model = win.model;
		if(model.mode != "client")
		{
			model.swapShuffle(typ as any);
			var funs ={
				"pony": updatePonyDiscard,
				"ship": updateShipDiscard,
				"goal": updateGoalDiscard
			};
			(funs as any)[typ]();
		}
	}
		
}


(win as any).dump = function dump()
{
	return new Promise((resolve, reject) =>
	{
		heldDebugResolve = resolve;
		win.socket.send("debug");
	});
}