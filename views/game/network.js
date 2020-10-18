import {
	updateGame, moveCard, updatePonyDiscard, updateShipDiscard, updateGoalDiscard
} from "/game/game.js";

var socket;
var pendingRequests = [];


var host = window.location.host.replace(/:.*/,"") + ":8080";

socket = new WebSocket("ws://" + host + "/" + window.location.search);

socket.addEventListener("open", function()
{
	console.log("Socket opened successfully!")

	socket.send("requestmodel;" + (localStorage["playerID"] || 0))
});

socket.addEventListener("close", function(){

	alert("The connection to the server was closed :(")
	console.log("closed")
})


socket.addEventListener('message', function (event)
{
	console.log(event.data);

	if(event.data.startsWith('closed;'))
	{
		window.location.href = location.protocol + "//" + window.location.host;
	}

	if(event.data.startsWith('registered;'))
	{
		var [_,id] = event.data.split(";");
		localStorage["playerID"] = id;

	}

	if(event.data.startsWith("model;"))
	{
		model = JSON.parse(event.data.substring(6));	
		updateGame();
	}

	if(event.data.startsWith("move;"))
	{
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

		var funs ={
			"pony": updatePonyDiscard,
			"ship": updateShipDiscard,
			"goal": updateGoalDiscard
		};
		funs[type]();
	}

	if(event.data.startsWith("ontop;"))
	{
		var [_, location, card] = event.data.split(";");

		var pile = location.split(",")[0];

		var i = model[pile].indexOf(card);

		if(i+1 && i+1 != model[pile].length)
		{	
			model[pile].splice(i,1);
			model[pile].push(card);

			updateShipDiscard();
			updatePonyDiscard();
			updateGoalDiscard();
		}

	}
});



export function broadcastMove(card, startLocation, endLocation)
{
	broadcast("move;" + card + ";" + startLocation + ";" + endLocation);
}

function broadcast(message)
{
	console.log("sending " + message);

	//setTimeout(function(){
	socket.send(message);
	//},1000);
}

network.requestDrawPony = function()
{
	broadcast("draw;pony");
}

network.requestDrawShip = function()
{
	broadcast("draw;ship");
}

network.requestDrawGoal = function()
{
	broadcast("draw;goal");
}


network.requestSwapShuffle = function(typ)
{
	broadcast("swapshuffle;" + typ);
}
