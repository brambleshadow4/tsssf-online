import * as Game from "./game/game.js"
import * as Lobby from "./lobby/lobby.js"

export type WebSocketPlus = WebSocket & {
	onMessageHandler: Function,
	onCloseHandler: Function
}

var host = window.location.hostname;
var protocol;

var port = window.location.port || 80;

var currentView = "";

switch(window.location.protocol)
{
	case "http:": protocol = "ws:"; break;
	case "https:": protocol = "wss:"; port=443; break;
}

var host = window.location.host.replace(/:.*/,"");

var liveGames = new Set(["/lobby","/game"]);

if(liveGames.has(window.location.pathname))
{
	var socket = new WebSocket(protocol + "//" + host + ":" + port + "/" + window.location.search) as WebSocketPlus;
	(window as any).socket = socket;

	socket.addEventListener("open", function()
	{
		socket.send("handshake;" + (localStorage["playerID"] || 0));
	});

	socket.addEventListener('message', function (event)
	{
		console.log(event.data);

		if(socket.onMessageHandler)
		{
			socket.onMessageHandler(event);
		}
	});

	socket.addEventListener('close', function (event)
	{
		if(socket.onCloseHandler)
			socket.onCloseHandler(event);
	});

	socket.addEventListener('message', function (event)
	{
		if(event.data.startsWith("lobby;") && currentView != "lobby")
		{
			currentView = "lobby";
			Lobby.loadView(event.data);
		}

		if(event.data.startsWith("game;") && currentView != "game")
		{
			currentView = "game"
			Game.loadView(event.data);
		}

		/*if(event.data.startsWith("startlobby"))
		{
			Lobby.loadView(true);
		}*/
	});
}
else if(window.location.pathname == "/tutorial")
{
	Game.loadView("");
}