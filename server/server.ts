import express from "express";
import cookieParser from 'cookie-parser';
import fs from 'fs';
import ws from 'ws';
import https from "https";
import cards from "../model/cards.js"
import {TsssfGameServer} from "./gameServer.js";
import {getStats} from "./stats.js";
import {GameOptions} from "../model/lib.js";
import fetch from "node-fetch";
// @ts-ignore
import {buildTemplate, buildTemplateHTML} from "../build/md.js";

import en_US from "../views/tokens.js";
import es_ES from "../i18n/es-ES/views/tokens.js";
import zz_ZZ from "../i18n/zz-ZZ/views/tokens.js";



// compile translations
const defaultLocale = "en-US";
const translations = {
	"en-US": en_US,
	"es-ES": es_ES,
	"zz-ZZ": zz_ZZ,
} as any;


translations[defaultLocale].Version = JSON.parse(fs.readFileSync("./package.json", {encoding: "utf8"})).version;
translations[defaultLocale].NavTemplate = fs.readFileSync("./views/navTemplate.html", {encoding: "utf8"});

for(let lang in translations)
{
	for(let key in translations[defaultLocale])
	{	
		translations[lang][key] = translations[lang][key] || translations[defaultLocale][key]		
	}

	let prefix = "./i18n/" + lang;

	if(lang == defaultLocale)
		prefix = ".";

	let navTemplate = translations[defaultLocale].NavTemplate

	if(fs.existsSync(prefix + "/views/navTemplate.html"))
	{
		navTemplate = fs.readFileSync(prefix + "/views/navTemplate.html", {encoding: "utf8"});
		translations[lang].NavTemplate = navTemplate
	}

	for(let file of [
		"/views/info/resources.md",
		"/views/info/addYourOwnCards/addYourOwnCards.md",
		"/views/info/quickRules.md",
		"/views/info/rulebook.md",
		"/views/info/faq.md"
	]){

		let fullFile = prefix + file;
		if(fs.existsSync(fullFile))
		{
			buildTemplate(fullFile, navTemplate);
		}
		else if(navTemplate != translations[defaultLocale].NavTemplate)
		{
			buildTemplate("." + file, navTemplate, fullFile);
		}
	}

	fs.writeFileSync(prefix + "/views/info/index.html", buildTemplateHTML("<script type='module' src='/info/knowledgeBase.js'></script>", translations[lang].NavTemplate))
}




// compile markdown

for(let lang in translations)
{
	
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
		case "en-US":
		case "es-ES":
		case "zz-ZZ":

			res.cookie('lang', req.query.lang);
			res.setHeader("Content-Type", "text/json");
			res.sendStatus(200);
			return;
	}

	next();
	
}, file("./views/home.html"));

app.get("/home.css", file("./views/home.css"))



app.get('/img/**', fmap("/img/**", "./img/**"));
app.get('/fonts/**', fmap("/fonts/**", "./fonts/**"));
app.get('/packs/**', fmap("/packs/**", "./packs/**"));
app.get('/model/**', fmap("/model/**", "./model/**"));


app.get("/favicon.ico", file("./img/favicon.ico"))


app.get('/.well-known/**', fmap("/.well-known/**", "./.well-known/**"));



app.get("/info", file("./views/info/index.html"))
app.get("/info/cardlist", file("./views/info/index.html"))
app.get("/info/concept", file("./views/info/index.html"))
app.get("/info/card", file("./views/info/index.html"))
app.get("/info/resources", file("./views/info/resources.html"))

app.get("/info/addYourOwnCards", file("./views/info/addYourOwnCards/addYourOwnCards.html"))
app.get("/info/addYourOwnCards/upload2.png", file("./views/info/addYourOwnCards/upload2.png"))
app.get("/info/highlight.min.css", file("./views/info/addYourOwnCards/highlight.min.css"))
app.get("/info/highlight.min.js", file("./views/info/addYourOwnCards/highlight.min.js"))


app.get("/lobby/cardSelectComponent.js", file("./views/lobby/cardSelectComponent.js"))
app.get("/lobby/packOrder.js", file("./views/lobby/packOrder.js"))



app.get("/tokens.js", function(req, res){

	res.setHeader("Content-Type", "text/javascript");
	res.send("export default " + JSON.stringify(translations[getLang(req)]));
});



app.get("/info/rulebook", file("./views/info/rulebook.html"))
app.get("/info/rulebook.css", file("./views/info/rulebook.css"))
app.get("/info/quickRules", file("./views/info/quickRules.html"))
app.get("/info/faq", file("./views/info/faq.html"))



app.get("/lobby.css", file("./views/lobby/lobby.css"));
app.get("/lobby", function(req,res)
{
	let query = req.originalUrl.substring(req.originalUrl.indexOf("?")+1);

	var key = query.toUpperCase();

	if(tsssfServer.games[key] && (tsssfServer.games[key].isLobbyOpen || tsssfServer.games[key].isInGame))
	{
		sendIfExists("./views/app.html", getLang(req), res);
	}
	else
	{
		res.redirect("/");
	}
});

app.get("/imgproxy", async function(req,res){

	if(req.query.url)
	{
		let url = "" + req.query.url
		let request = await fetch(url);
		let blob = await request.blob() as any;
		let arrayBuff = await blob.arrayBuffer();
		let buff = Buffer.from(arrayBuff);

		if(url.endsWith(".png")) res.setHeader("Content-Type", "image/png");
		if(url.endsWith(".jpg")) res.setHeader("Content-Type", "image/jpeg");
		if(url.endsWith(".jpeg")) res.setHeader("Content-Type", "image/jpeg");

		res.send(buff);
	}
})


app.get("/game", function(req, res)
{
	let query = req.originalUrl.substring(req.originalUrl.indexOf("?")+1);

	var key = query.toUpperCase();

	if(tsssfServer.games[key] && (tsssfServer.games[key].isLobbyOpen || tsssfServer.games[key].isInGame))
	{
		sendIfExists("./views/app.html", getLang(req), res);
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



app.get("/host", function(req, res){

	var key = tsssfServer.openLobby();
	res.redirect("/lobby?" + key);
})


app.get('/**', fmap("/**", "./views/**"));

function getLang(req: any)
{
	console.log(req.headers["accept-language"]);
	console.log(req.cookies.lang || getLangFromReq(req) || defaultLocale);
	return req.cookies.lang || getLangFromReq(req) || defaultLocale;
}

function getLangFromReq(req: any)
{
	let langs = req.headers["accept-language"].split(";")[0].split(",");

	for(let lang of langs)
	{
		if(lang.startsWith("en"))
		{
			return "en-US";
		}
		if(lang.startsWith("es"))
		{
			return "es-ES";
		}
	}

	return "";
}




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


function addTranslatedTokens(text: string, lang: string)
{
	let pattern = /{{([A-Za-z0-9\.]+)}}/g;

	let match = pattern.exec(text)
	while(match)
	{
		let key = match[1]; 
		text = text.replace(match[0], translations[lang][key] || translations[defaultLocale][key] || "");
		match = pattern.exec(text)
	}

	return text;
}


function file(url: string)
{
	return function(req: any, res: Response){

		sendIfExists(url, getLang(req), res);
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
		sendIfExists(url, getLang(req), res);
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
		if(url.endsWith(".html") || url.endsWith("packs.js") || url.endsWith("View.js"))
		{
			let fileText = fs.readFileSync(url, "utf8");

			fileText = addTranslatedTokens(fileText, lang);

			if(url.indexOf(".js") > -1)
			{
				res.setHeader("Content-Type", "text/javascript");
			}

			res.send(fileText);

		}
		else
		{
			res.sendFile(url, {root:"./"})
			return;
		}
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
			tsssfServer.games.DEV.setLobbyOptions(allCards as GameOptions);
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
				tsssfServer.games.DEV.setLobbyOptions(allCards as GameOptions);
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
