
export type WebSocketPlus = WebSocket & {
	onMessageHandler: Function,
	onCloseHandler: Function
}

var host = window.location.hostname;
var protocol;

var port = window.location.port || 80;

switch(window.location.protocol)
{
	case "http:": protocol = "ws:"; break;
	case "https:": protocol = "wss:"; port=443; break;
}

var host = window.location.host.replace(/:.*/,"");
var socket = new WebSocket(protocol + "//" + host + ":" + port + "/" + window.location.search) as WebSocketPlus;
(window as any).socket = socket;


import * as Game from "./game/game.js"
import * as Lobby from "./lobby/lobby.js"



socket.addEventListener("open", function()
{
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
