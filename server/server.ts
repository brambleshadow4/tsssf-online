import express from "express";
import cookieParser from 'cookie-parser';
import fs from 'fs';
import ws from 'ws';
import https from "https";
import cards from "./cards.js"
import {TsssfGameServer} from "./gameServer.js";
import {getStats} from "./stats.js"

import en_us from "../views/tokens.js";
import zz_zz from "../i18n/zz-zz/views/tokens.js";

const defaultLocale = "en-us";
const translations = {
	"en-us": en_us,
	"zz-zz": zz_zz,
} as any;


for(let lang in translations)
{
	for(let key in translations[defaultLocale])
	{
		translations[lang][key] = translations[lang][key] || translations[defaultLocale][key]		
	}
}


const app = express()
app.use(cookieParser());
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



app.get('/', function(req:any,res:any, next:any){

	switch(req.query.lang){
		case "en-us":
		case "zz-zz":
			res.cookie('lang', req.query.lang)
			res.redirect("/?t=" + new Date().getTime());
			return;
	}

	next();
	
}, tokenizeFile("./views/home.html"));

app.get('/img/**', fmap("/img/**", "./img/**"));
app.get('/packs/**', fmap("/packs/**", "./packs/**"));


app.get("/favicon.ico", file("./img/favicon.ico"))


app.get('/.well-known/**', fmap("/.well-known/**", "./.well-known/**"));

app.get("/game/game.js", file("./views/game/game.js"))
app.get("/game/gameView.js", file("./views/game/gameView.js"))
app.get("/game/network.js", file("./views/game/network.js"))
app.get("/game/game.css", file("./views/game/game.css"))
app.get("/game/cardComponent.js", file("./views/game/cardComponent.js"))
app.get("/game/peripheralComponents.js", file("./views/game/peripheralComponents.js"))
app.get("/game/boardComponent.js", file("./views/game/boardComponent.js"))
app.get("/game/popupComponent.js", file("./views/game/popupComponent.js"))
app.get("/game/cardSearchBarComponent.js", file("./views/game/cardSearchBarComponent.js"))


app.get("/info/addYourOwnCards", file("./views/addYourOwnCards/addYourOwnCards.html"))
app.get("/info/highlight.min.css", file("./views/addYourOwnCards/highlight.min.css"))
app.get("/info/highlight.min.js", file("./views/addYourOwnCards/highlight.min.js"))

app.get("/info/upload1.png", file("./views/addYourOwnCards/upload1.png"))
app.get("/info/upload2.png", file("./views/addYourOwnCards/upload2.png"))

app.get("/lobby/cardSelectComponent.js", file("./views/lobby/cardSelectComponent.js"))
app.get("/lobby/packOrder.js", tokenizeFile("./views/lobby/packOrder.js"))



app.get("/viewSelector.js", file("./views/viewSelector.js"))

app.get("/lib.js", file("./server/lib.js"))
app.get("/server/lib.js", file("./server/lib.js"))

app.get("/tokens.js", function(req, res){

	res.setHeader("Content-Type", "text/javascript");
	let lang = req.cookies.lang || defaultLocale;
	res.send("export default " + JSON.stringify(translations[lang]));
});


app.get("/server/cards.js", file("./server/cards.js"))
app.get("/server/cardManager.js", file("./server/cardManager.js"))
app.get("/server/packLib.js", file("./server/packLib.js"))
app.get("/server/goalCriteria.js", file("./server/goalCriteria.js"))

app.get("/rulebook.html", file("./views/rulebook.html"))
app.get("/quickRules.html", file("./views/quickRules.html"))
app.get("/faq.html", file("./views/faq.html"))
app.get("/game/gamePublic.js", file("./views/game/gamePublic.js"))

app.get("/lobby", function(req,res)
{
	let query = req.originalUrl.substring(req.originalUrl.indexOf("?")+1);

	var key = query.toUpperCase();

	if(tsssfServer.games[key] && (tsssfServer.games[key].isLobbyOpen || tsssfServer.games[key].isInGame))
	{
		sendIfExists("./views/app.html", req.cookies.lang, res);
	}
	else
	{
		res.redirect("/");
	}
});

app.get("/game", function(req, res)
{
	let query = req.originalUrl.substring(req.originalUrl.indexOf("?")+1);

	var key = query.toUpperCase();

	if(tsssfServer.games[key] && (tsssfServer.games[key].isLobbyOpen || tsssfServer.games[key].isInGame))
	{
		sendIfExists("./views/app.html", req.cookies.lang, res);
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
app.get("/lobby/lobbyView.js", tokenizeFile("./views/lobby/lobbyView.js"))

app.get("/host", function(req, res){

	var key = tsssfServer.openLobby();
	res.redirect("/lobby?" + key);
})

app.get("/**", function(req,res){ 

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


function tokenizeFile(url: string)
{
	return function(req: any, res: any)
	{
		if(fs.existsSync(url))
		{
			let fileText = fs.readFileSync(url, "utf8");

			fileText = addTranslatedTokens(fileText, req.cookies.lang || defaultLocale);

			if(url.indexOf(".js") > -1)
			{
				res.setHeader("Content-Type", "text/javascript");
			}

			res.send(fileText);
		}
		else
		{
			res.send("404 error sad");
		}
	}	
}

function addTranslatedTokens(text: string, lang: string)
{
	let pattern = /{{([A-Za-z0-9\.]+)}}/g;

	let match = pattern.exec(text)
	while(match)
	{
		let key = match[1]; 
		text = text.replace(match[0], translations[lang][key] || translations["en-us"][key] || "");
		match = pattern.exec(text)
	}

	return text;
}


function file(url: string)
{
	return function(req: any, res: Response){

		sendIfExists(url, req.cookies.lang, res);
	} as any
}

function fmap(routeUri: string, fileUrl: string): any
{
	return function(req: any, res: Response){


		let routePrefix = routeUri.substring(0,routeUri.indexOf("**"));
		let filePrefix = fileUrl.substring(0,fileUrl.indexOf("**"));

		let url = req.originalUrl.replace(routePrefix, filePrefix);

		url = url.replace(/%20/g," ");

		//setTimeout(function(){
		sendIfExists(url, req.cookies.lang, res);
		//},1000)	
	}
}

function sendIfExists(url:string, lang: string, res: any)
{

	let lang2 = lang || "";
	let translatedUrl = "./i18n/" + lang2 + url.replace("./", "/");

	if(fs.existsSync(translatedUrl))
	{
		res.sendFile(translatedUrl, {root:"./"})
	}
	else if(fs.existsSync(url))
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

if(process.argv[3])
{
	let baseRules = {
		cardDecks:["Core.*"],
		ruleset: "turnsOnly",
		keepLobbyOpen: true
	};
	let allCards = {
		cardDecks:[
			"Core.*",
			"EC.*",
			"PU.*",
			"NoHoldsBarred.*",
			"HorriblePeople.2014ConExclusives.*",
			"HorriblePeople.2015ConExclusives.*",
			"HorriblePeople.2015Workshop.*",
			"HorriblePeople.AdventurePack.*",
			"HorriblePeople.DungeonDelvers.*",
			"HorriblePeople.FlufflePuff.*",
			"HorriblePeople.GraciousGivers.*",
			"HorriblePeople.Hearthswarming.*",
			"HorriblePeople.Mean6.*",
			"HorriblePeople.Misc.*",
			"HorriblePeople.WeeabooParadaisu.*",
		],
		ruleset: "turnsOnly",
		keepLobbyOpen: true
	};
	switch(process.argv[3])
	{
		case "1":
			tsssfServer.openLobby("DEV");
			tsssfServer.games.DEV.setLobbyOptions(allCards);
			tsssfServer.games.DEV.startGame([
				"Core.Ship.CanITellYouASecret",
				"Core.Ship.DoYouThinkLoveCanBloomEvenOnABattlefield",
				"Core.Ship.CultMeeting",
				"Core.Ship.YerAPrincessHarry",
				"EC.Ship.BlindDate",
				"EC.Ship.ScienceExperiments",
				"HorriblePeople.2015ConExclusives.Ship.ObjectofAdoration",
				"HorriblePeople.Mean6.Ship.TheNightmareBecomesYou",
				"HorriblePeople.GraciousGivers.Ship.DunkedInTheDatingPool"
			]);
			break;
	
		case "2":
				tsssfServer.openLobby("DEV");
				tsssfServer.games.DEV.setLobbyOptions(allCards);
				tsssfServer.games.DEV.startGame([
					"NoHoldsBarred.Pony.Sleight",
					"NoHoldsBarred.Pony.Plushling",
					"NoHoldsBarred.Pony.KingVespid",
					"Core.Pony.EarthChangeling",
					"Core.Pony.UnicornChangeling",
					"Core.Pony.PegasusChangeling",
					"Core.Pony.QueenChrysalis",
					"NoHoldsBarred.Pony.PixelPrism"
				]);
				break;
		}
}
