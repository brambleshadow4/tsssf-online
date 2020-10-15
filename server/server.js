import express from "express";
import fs from 'fs';
import ws from 'ws';
import cookieParser from "cookie-parser";
import expressSession from "express-session";
import cards from "./cards.js"
import {TsssfGameServer} from "./gameServer.js";
import {getStats} from "./stats.js"

const app = express()
const PORT = 8000;


app.use(cookieParser());
app.use(expressSession({
	secret: "idk what this does",
	unset: "destroy",
	resave: false,
	saveUninitialized: false,
	secure: "idk"
}));


app.get('/', file("./views/home.html"));
app.get('/img/**', fmap("/img/**", "./img/**"));

app.get("/game", file("./views/game.html"))


app.get("/lib.js", file("./server/lib.js"))
app.get("/game.js", file("./views/game.js"))
app.get("/cards.js", file("./server/cards.js"))
app.get("/network.js", file("./views/network.js"))
app.get("/game.css", file("./views/game.css"))
app.get("/rulebook.html", file("./views/rulebook.html"))
app.get("/gamePublic.js", file("./views/gamePublic.js"))

app.get("/lobby", function(req,res)
{
	var key = Object.keys(req.query)[0];

	if(tsssfServer.games[key])
	{
		sendIfExists("./views/lobby.html", res);
	}
	else
	{
		res.redirect("/");
	}
});

app.get("/stats", async function(req,res){

	var template = fs.readFileSync('./views/stats.html', 'utf8');
	var stats = await getStats();

	for(var key in stats)
	{
		template = template.replace(key, stats[key]);
	}

	var liveStats = tsssfServer.getStats();
	template = template.replace("$1", liveStats.players);
	template = template.replace("$2", liveStats.games);

	res.send(template);
})


app.get("/lobby.css", file("./views/lobby.css"))
app.get("/lobby.js", file("./views/lobby.js"))

app.get("/host", function(req, res){

	var key = tsssfServer.startGame();

	res.redirect("/lobby?" + key);
})
	
app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`))



function file(url)
{
	return function(req, res){

		sendIfExists(url, res);
	}
}

function fmap(routeUri, fileUrl)
{
	return function(req, res){


		let routePrefix = routeUri.substring(0,routeUri.indexOf("**"));
		let filePrefix = fileUrl.substring(0,fileUrl.indexOf("**"));

		let url = req.originalUrl.replace(routePrefix, filePrefix);

		url = url.replace(/%20/g," ");

		sendIfExists(url, res);
	}
	
}

function sendIfExists(url, res)
{
	console.log(url);

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

const tsssfServer = TsssfGameServer();

const server = app.listen(8080);
server.on('upgrade', (request, socket, head) => {
	tsssfServer.handleUpgrade(request, socket, head, socket => {
		tsssfServer.emit('connection', socket, request);
	});
});




