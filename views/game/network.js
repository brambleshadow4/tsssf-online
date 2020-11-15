import {
	updateGame, moveCard, isItMyTurn,
	updateTurnstate
} from "/game/game.js";

import {
	updatePonyDiscard,
	updateShipDiscard,
	updateGoalDiscard,
	updatePlayerList
} from "/game/peripheralComponents.js";

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

export function attachToSocket(socket)
{

	var kicked = false;
	socket.onMessageHandler = function(event)
	{
		var model = window.model;

		if(event.data.startsWith('kick'))
		{
			alert("The game's host kicked you from the game");
			kicked = true;

		}

		if(event.data.startsWith('turnstate;'))
		{
			model.turnstate = JSON.parse(event.data.substring(10));	
			updateTurnstate();
		}

		if(event.data.startsWith('keepLobbyOpen;'))
		{
			model.keepLobbyOpen = !!Number(event.data.split(";")[1]);
		}

		if(event.data.startsWith('closed;'))
		{
			window.location.href = location.protocol + "//" + window.location.host;
		}

		if(event.data.startsWith('ishost;1'))
		{
			document.getElementById('hostButton').style.display = "inline-block";
		}

		if(event.data.startsWith('registered;'))
		{
			var [_,id] = event.data.split(";");
			localStorage["playerID"] = id;
		}

		if(event.data.startsWith("playerlist;"))
		{
			model.players = JSON.parse(event.data.substring(11));
			updatePlayerList();
		}

		if(event.data.startsWith("model;"))
		{
			console.log(event.data);
			updateGame(JSON.parse(event.data.substring(6)));
			moveToStartCard();
		}

		if(event.data.startsWith("move;"))
		{
			console.log(event.data);
			var [_, card, startLocation, endLocation] = event.data.split(";");
			moveCard(card, startLocation, endLocation, true);
		}

		if(event.data.startsWith("draw;"))
		{
			var [_, typ, count] = event.data.split(";");

			model[typ+ "DrawPileLength"] = count;

			var funs ={
				"pony": updatePonyDiscard,
				"ship": updateShipDiscard,
				"goal": updateGoalDiscard
			};
			funs[typ]();
		}

		if(event.data.startsWith("swapshuffle;"))
		{
			var [_, type, count, ...cards] = event.data.split(";");

			for(var card of model[type + "DiscardPile"])
			{
				delete cardLocations[card];
			}

			model[type+"DrawPileLength"] = count;
			model[type+"DiscardPile"] = cards;

			for(var card of cards)
			{
				cardLocations[card] = type + "DiscardPile,stack";
			}

			if(cards.length)
				cardLocations[cards[cards.length-1]] = type + "DiscardPile,top";

			var funs ={
				"pony": updatePonyDiscard,
				"ship": updateShipDiscard,
				"goal": updateGoalDiscard
			};
			funs[type]();
		}

		if(event.data.startsWith("counts;"))
		{
			var [_, name, ponies, ships, ...winnings] = event.data.split(";");

			var player = model.players.filter(x => x.name == name)[0];

			if(player)
			{
				player.ponies = ponies;
				player.ships = ships;
				player.winnings = winnings;
			}
			else
			{
				console.error("player " + name + " doesn't exist");
			}

			updatePlayerList();
		}
	};

	socket.onCloseHandler = function(event)
	{
		if(!kicked)
			alert("Failed to connect to the server :(")
	}

	socket.send("requestmodel;" + (localStorage["playerID"] || 0))
}


export function broadcastMove(card, startLocation, endLocation)
{
	broadcast("move;" + card + ";" + startLocation + ";" + endLocation);
}

export function broadcast(message)
{
	console.log("sending " + message);

	//setTimeout(function(){
	window.socket.send(message);
	//},3000);
}

export function requestDrawPony()
{
	if(isItMyTurn())
		broadcast("draw;pony");
}

export function requestDrawShip()
{
	if(isItMyTurn())
		broadcast("draw;ship");
}

export function requestDrawGoal()
{
	if(isItMyTurn())
		broadcast("draw;goal");
}


export function requestSwapShuffle(typ)
{
	if(isItMyTurn())
		broadcast("swapshuffle;" + typ);
}
