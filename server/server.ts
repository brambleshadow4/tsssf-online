import express from "express";
import fs from 'fs';
import ws from 'ws';
import https from "https";
import cards from "./cards.js"
import {TsssfGameServer} from "./gameServer.js";
import {getStats} from "./stats.js"


const app = express()
let PORT = 80;

var argSet = new Set(process.argv);

if(argSet.has("dev"))
	PORT = 8000;

var settings: {[key:string]: string } = {}

try
{
	var settingsRaw = fs.readFileSync("server/settings.txt");
	var settingsList = settingsRaw.toString().split(/\r?\n/g);

	for (var line of settingsList)
	{
		var eq = line.indexOf('=');
		if(eq != -1)
		{	
			var key = line.substring(0,eq);
			settings[key] = line.substring(eq+1);
		}
	}
}
catch(e){}



app.get('/', file("./views/home.html"));
app.get('/img/**', fmap("/img/**", "./img/**"));

app.get('/.well-known/**', fmap("/.well-known/**", "./.well-known/**"));

app.get("/game/game.js", file("./views/game/game.js"))
app.get("/game/gameView.js", file("./views/game/gameView.js"))
app.get("/game/network.js", file("./views/game/network.js"))
app.get("/game/game.css", file("./views/game/game.css"))
app.get("/game/cardComponent.js", file("./views/game/cardComponent.js"))
app.get("/game/peripheralComponents.js", file("./views/game/peripheralComponents.js"))
app.get("/game/boardComponent.js", file("./views/game/boardComponent.js"))
app.get("/game/popupComponent.js", file("./views/game/popupComponent.js"))
app.get("/lobby/cardSelectComponent.js", file("./views/lobby/cardSelectComponent.js"))



app.get("/viewSelector.js", file("./views/viewSelector.js"))

app.get("/lib.js", file("./server/lib.js"))
app.get("/server/lib.js", file("./server/lib.js"))


app.get("/server/cards.js", file("./server/cards.js"))
app.get("/game/cards.js", file("./server/cards.js"))

app.get("/rulebook.html", file("./views/rulebook.html"))
app.get("/faq.html", file("./views/faq.html"))
app.get("/game/gamePublic.js", file("./views/game/gamePublic.js"))

app.get("/lobby", function(req,res)
{
	var key = Object.keys(req.query)[0].toUpperCase();

	console.log(key);
	console.log(tsssfServer.games[key]);

	if(tsssfServer.games[key] && (tsssfServer.games[key].isLobbyOpen || tsssfServer.games[key].isInGame))
	{
		sendIfExists("./views/app.html", res);
	}
	else
	{
		res.redirect("/");
	}
});

app.get("/game", function(req, res)
{
	var key = Object.keys(req.query)[0].toUpperCase();

	if(tsssfServer.games[key] && (tsssfServer.games[key].isLobbyOpen || tsssfServer.games[key].isInGame))
	{
		sendIfExists("./views/app.html", res);
	}
	else
	{
		res.redirect("/");
	}
});

app.get("/stats", async function(req, res){

	var template = fs.readFileSync('./views/stats.html', 'utf8');
	var stats = await getStats() as any;

	for(var key in stats)
	{
		template = template.replace(key, stats[key].toString());
	}

	var liveStats = tsssfServer.getStats();
	template = template.replace("$1", "" + liveStats.players);

	template = template.replace("$2", "" +liveStats.games);

	template = template.replace("$graph1.", JSON.stringify(stats.gamesHostedThisWeek));
	template = template.replace("$graph2.", JSON.stringify(stats.playersJoinedThisWeek));
	template = template.replace("$date.", "" +liveStats.startTime);

	res.send(template);
})


app.get("/lobby.css", file("./views/lobby/lobby.css"))
app.get("/lobby/lobby.js", file("./views/lobby/lobby.js"))
app.get("/lobby/lobbyView.js", file("./views/lobby/lobbyView.js"))

app.get("/host", function(req, res){

	var key = tsssfServer.openLobby();

	res.redirect("/lobby?" + key);
})

app.get("/**", function(req,res){ 

	console.log("redirect");
	console.log(req.url);
	res.redirect("/"); 

});
	

var server;
if(settings.KEY && !argSet.has("nossl"))
{
	server = https.createServer({
			key: fs.readFileSync(settings.KEY as string),
			cert: fs.readFileSync(settings.CERT as string),
			passphrase: settings.PASSPHRASE as string
		}, app)
		.listen(443, function () {
			console.log('TSSSF web server listening on port 443!')
		});

	var app2 = express();
	app2.get("/*", function(req,res){

		var hostname = req.headers.host!.split(":")[0];
		res.redirect("https://" + hostname + req.url); 
	});

	app2.listen(PORT);
}
else
{
	server = app.listen(PORT, () => console.log(`TSSSF web server listening on port ${PORT}!`))
}



function file(url: string)
{
	return function(req: Request, res: Response){

		sendIfExists(url, res);
	} as any
}

function fmap(routeUri: string, fileUrl: string): any
{
	return function(req: {originalUrl: string}, res: Response){


		let routePrefix = routeUri.substring(0,routeUri.indexOf("**"));
		let filePrefix = fileUrl.substring(0,fileUrl.indexOf("**"));

		let url = req.originalUrl.replace(routePrefix, filePrefix);

		url = url.replace(/%20/g," ");

		//setTimeout(function(){
		sendIfExists(url, res);
		//},1000)
		
	}
	
}

function sendIfExists(url:string, res: any)
{
	if(fs.existsSync(url))
	{
		res.sendFile(url, {root:"./"})
	}
	else
	{
		res.send("404 error sad");
	}
}





///--------------------------------------------------------------------------------------



// Set up a headless websocket server that prints any
// events that come in.

// `server` is a vanilla Node.js HTTP server, so use
// the same ws upgrade process described here:
// https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server

const tsssfServer = new TsssfGameServer();

server.on('upgrade', (request, socket, head) => {
	tsssfServer.handleUpgrade(request, socket, head, (socket: any) => {
		tsssfServer.emit('connection', socket, request);
	});
});
