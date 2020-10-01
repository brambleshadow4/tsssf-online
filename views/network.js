var socket;

var pendingRequests = [];

(function()
{
	var host = window.location.host.replace(/:.*/,"") + ":8001";

	socket = new WebSocket("ws://" + host + "/" + window.location.search);

	socket.addEventListener("open", function()
	{
		console.log("Socket opened successfully!")

		socket.send("requestmodel;" + (sessionStorage["playerID"] || 0))
	});

	socket.addEventListener("close", function(){
		console.log("closed")
	})

	socket.addEventListener('message', function (event)
	{
		console.log(event.data);

		if(event.data.startsWith("model;"))
		{
			model = JSON.parse(event.data.substring(6));
			sessionStorage["playerID"] = model.playerID;
			updateGame();
		}

		if(event.data.startsWith("move;"))
		{
			var [_, card, startLocation, endLocation] = event.data.split(";");
			
			moveCard(card, startLocation, endLocation);
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

			model[type+"DrawPileLength"] = count;
			model[type+"DiscardPile"] = cards;

			var funs ={
				"pony": updatePonyDiscard,
				"ship": updateShipDiscard,
				"goal": updateGoalDiscard
			};
			funs[type]();
		}
	});

})();


function broadcastMove(card, startLocation, endLocation)
{
	broadcast("move;" + card + ";" + startLocation + ";" + endLocation);
}

function broadcast(message)
{
	if(model.isItMyTurn)
	{
		socket.send(message);
	}
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
	console.log("swap shuffle");
	broadcast("swapshuffle;" + typ);
}
