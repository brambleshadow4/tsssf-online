console.log("view selector is running");

var host = window.location.host.replace(/:.*/,"") + ":8080";
var socket = new WebSocket("ws://" + host + "/" + window.location.search);

window.socket = socket;

console.log("this is ")

console.log(socket)

import * as Game from "/game/game.js"
import * as Lobby from "/lobby.js"



socket.addEventListener("open", function()
{
	console.log("Socket opened successfully!")
	socket.send("handshake;" + (localStorage["playerID"] || 0));
	//socket.send("requestmodel;" + (localStorage["playerID"] || 0))
});


socket.addEventListener('message', function (event)
{
	if(socket.onMessageHandler)
		socket.onMessageHandler(event);
});

socket.addEventListener('close', function (event)
{
	if(socket.onCloseHandler)
		socket.onCloseHandler(event);
});

socket.addEventListener('message', function (event)
{
	if(event.data.startsWith("handshake;"))
	{
		var [_, view] = event.data.split(";");

		if(view == "game") 
		{
			Game.loadView();
		}
		else if(view == "lobby")
		{
			Lobby.loadView(true);
		}
		else if(view == "closed")
		{
			Lobby.loadView(false);
		}
	}

	if(event.data.startsWith("startgame"))
	{
		Game.loadView();
	}

	if(event.data.startsWith("startlobby"))
	{
		Lobby.loadView(true);
	}
});
