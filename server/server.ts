import express from "express";
import cookieParser from 'cookie-parser';
import fs from 'fs';
import ws from 'ws';
import https from "https";
import cards from "../model/cards.js"
import {TsssfGameServer} from "./gameServer.js";
import {getStats, getPotentialPlayers, removePotentialPlayer, addPotentialPlayer} from "./stats.js";
import {GameOptions} from "../model/lib.js";
import fetch from "node-fetch";
import crypto from "crypto";
import {AuthorizationCode} from 'simple-oauth2';

import dotenv from "dotenv";

// @ts-ignore
import {buildTemplate, buildTemplateHTML} from "../build/md.js";

import en_US from "../views/tokens.js";
import es_ES from "../i18n/es-ES/views/tokens.js";
import zz_ZZ from "../i18n/zz-ZZ/views/tokens.js";

dotenv.config();

const PORT = process.env.PORT || (process.env.KEY ? 443 : 80);

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

var argSet = new Set(process.argv);

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

app.get("/tutorial", file("./views/app.html"));

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


let potentialPlayerRequests: {[k:string]: {type: "add" | "remove", timezone?:string, platform: "discord", expireTime?: number}} = {};



app.get("/updatePotentialPlayers", async function(req,res) {


	if(req.query?.type == "add")
	{
		let days = Number(req.query?.days || 30);
		if (!days)
		{
			days = 30;
		}

		if(days < 1)
		{
			days = 1
		} 

		if(days>90)
		{
			days = 90;
		}

		let timezone = Number(req.query?.timezone || 0);
		timezone = timezone/60;

		let timezoneStr = "";
		if(timezone > 0)
			timezoneStr = "UTC-" + Math.abs(timezone)
		else
			timezoneStr = "UTC+" + Math.abs(timezone);

		let reqNo = await crypto.randomInt(1, 999999999);

		potentialPlayerRequests[reqNo] = {
			type: "add",
			timezone: timezoneStr,
			platform: "discord",
			expireTime: new Date().getTime() + 24*3600*1000*days
		}

		if(req.query?.platform == "discord")
		{
			res.redirect("https://discord.com/api/oauth2/authorize?client_id=969750697308463115&redirect_uri=https%3A%2F%2Ftsssf.net%2FcallbackPotentialPlayers&response_type=code&scope=identify&state=" + reqNo);
			//res.redirect("/callbackPotentialPlayers?state=" + reqNo);
		}

		return;
	}

	if(req.query?.type == "remove")
	{
		let reqNo = await crypto.randomInt(1, 999999999);

		potentialPlayerRequests[reqNo] = {
			type: "remove",
			platform: "discord"
		}

		if(req.query?.platform == "discord")
		{
			res.redirect("https://discord.com/api/oauth2/authorize?client_id=969750697308463115&redirect_uri=https%3A%2F%2Ftsssf.net%2FcallbackPotentialPlayers&response_type=code&scope=identify&state=" + reqNo);
			//res.redirect("/callbackPotentialPlayers?state=" + reqNo);
		}

		return;
	}

	res.redirect("/");
});


app.get("/callbackPotentialPlayers", async function(req,res)
{

	let playerReq = potentialPlayerRequests[(req.query.state || "") as string]

	if(!playerReq)
	{
		res.redirect("/");
		return;
	}

	var playerName = "";
	var playerAvatar = "";
	var playerID = "";
	var success = false;

	if(playerReq.platform == "discord"){
		[success, playerID, playerName, playerAvatar] = await getDiscordCredentials((req.query.code || "") as any);
		//[success, playerID, playerName, playerAvatar] = await getTestCredentials()
	}

	if(!success)
	{
		res.redirect("/");
		return;
	}


	if(playerReq.type == "add")
	{
		await addPotentialPlayer(playerID, playerReq.platform, playerName, playerAvatar, playerReq.timezone || "UTC+0", playerReq.expireTime as number)
	}

	if(playerReq.type == "remove")
	{
		await removePotentialPlayer(playerID, playerReq.platform);
	}

	res.redirect("/");
})

async function getDiscordCredentials(code: string): Promise<[boolean, string, string, string]>
{
	return new Promise(async (resolve, reject) => 
	{

		const client: any = new AuthorizationCode({

			client: {
				id: process.env.DISCORD_APP_ID || "",
				secret: process.env.DISCORD_APP_SECRET || "",
			},
			auth: {
				tokenHost: 'https://discord.com/api/',
				tokenPath: 'oauth2/token',
				authorizePath: 'oauth2/authorize'
			}
		});

		const tokenParams = {
			code,
			redirect_uri: 'https://tsssf.net/callbackPotentialPlayers',
			scope: 'identify', // see discord documentation https://discord.com/developers/docs/topics/oauth2#oauth2
		};

		let accessToken = {} as any;

		try {
			accessToken = await client.getToken(tokenParams);
		}
		catch (error: any)
		{	
			console.log('Access Token Error', error.message);
			resolve([false, "", "", ""]);
			return;
		}

		let options = {
			headers:{
				"Authorization": accessToken.token.token_type + " " + accessToken.token.access_token
			}
		} as any;

		https.get("https://discord.com/api/users/@me", options, function(response: any)
		{
			let rawData = "";
			response.setEncoding('utf8');
			response.on("data", (chunk: any) => {rawData += chunk});

			response.on('end', async function()
			{
				let data = {} as any;
				try{
					data = JSON.parse(rawData);
				}
				catch(e){

					resolve([false,"","",""])
					return;
				}

				resolve([true, data.id, `${data.username}#${data.discriminator}`, `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`]);
			})
		});
	});
}

async function getTestCredentials(): Promise<[boolean, string, string, string]>
{
	return [true, "test", "brambleshadow4", "https://cdn.discordapp.com/avatars/184770914557231104/3e4d01736d2f6f2f3d663ba85ee99a44.png"];
}



app.get('/**', fmap("/**", "./views/**"));

function getLang(req: any)
{
	return req.cookies.lang || getLangFromReq(req) || defaultLocale;
}

function getLangFromReq(req: any): string
{
	if(!req.headers["accept-language"]) {return ""; }

	let langs = req.headers["accept-language"].split(";")[0]?.split(",");

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
if(process.env.KEY)
{
	server = https.createServer({
		key: fs.readFileSync(process.env.KEY as string),
		cert: fs.readFileSync(process.env.CERT as string),
		passphrase: process.env.PASSPHRASE
	}, app)
	.listen(PORT, function () {
		console.log(`TSSSF secure web server listening on port ${PORT}!`)
	});
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

async function sendIfExists(url:string, lang: string, res: any)
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


			if(url == "./views/home.html")
			{
				let rows = await getPotentialPlayers() as any[];

				let rowHTML = rows.map((x:any) => 
					`<div>
						<img class='avatar' src="${x.avatarURL}" onerror="this.onerror=null; this.src='/img/avatar.png'"/>${x.name.replace(/</g, "&lt;")} (${x.timezone}) <img class='platform-logo' src='/img/discord.svg' />
					</div>`
				)

				fileText = fileText.replace("{{potentialPlayers}}", rowHTML.join("\n"));
			}


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

let args = process.argv.slice(2);

let options: {preset?:string} = {};

for(let i=0; i<args.length; i++)
{
	if(args[i] == "--preset" && args[i+1])
	{
		options.preset = args[i+1];
	}
}

if(options.preset)
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
	switch(options.preset)
	{
		case "ships":
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
	
		case "changelings":
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
		case "special1":
			tsssfServer.openLobby("DEV");
			tsssfServer.games.DEV.setLobbyOptions(allCards as GameOptions);
			tsssfServer.games.DEV.startGame([
				"HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh",
				"HorriblePeople.GraciousGivers.Pony.PrincessCelestAI",
				"NoHoldsBarred.Pony.Abarenbou",
			]);

			break;
	}
}
