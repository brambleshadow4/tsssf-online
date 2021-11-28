import * as LobbyView from "./lobbyView.js";

import {cardSelectComponent, cardBoxSelectComponent} from "./cardSelectComponent.js";
import {makeCardElement} from "../game/cardComponent.js";
import {isStart, Card, CardProps} from "../../model/lib.js";
import {validatePack} from "../../model/packLib.js";

import {
	PackListHeader,
	PackListItem,
	PackListPack,
	GameOptions
} from "../../model/lib.js";

import texts from "../tokens.js";


import * as cm from "../../model/cardManager.js";


import {WebSocketPlus} from "../viewSelector.js";
import packs from "../../model/packs.js";

var gameOptionsDiv: HTMLElement;
var chooseCardsDiv: HTMLElement;
var joinGameDiv: HTMLElement;
var ishost = false;
var sentName = false;

var cardBoxElements: {[key: string]: Element} = {};
var cardSelectorElements: {[key: string]: Element} = {}


var currentOptions: GameOptions;
var currentPlayers: string[] = [];


var globals = window as unknown as {

	decks: {
		[key: string]: Set<string>
	},

	cards: {[key: string]: CardProps},

	socket: WebSocketPlus,
	register: Function,
	startGame: Function,
	changePage: Function,
};

globals.decks =  {
	"Core.*": new Set(),
	"PU.*": new Set(),
	"EC.*": new Set(),
}


export function loadView(handshakeMessage: string)
{
	ishost = false; // reset this between games

	if(window.location.pathname != "/lobby")
	{
		history.replaceState(null, "", "/lobby" + window.location.search)
	}

	cm.init(["*"], {});

	document.body.innerHTML = LobbyView.HTML;
	document.head.innerHTML = LobbyView.HEAD;

	(document.getElementById('inviteURL') as HTMLInputElement).value = window.location.href;
	let socket = globals.socket;

	socket.onMessageHandler = onMessage;

	globals.register = register;
	globals.startGame = startGame;

	document.getElementById('packUpload')!.addEventListener('change', handleFileSelect, false);

	onMessage({data: handshakeMessage} as MessageEvent);
	
}


function loadCardPages(options: GameOptions)
{
	document.getElementById('uploadErrors')!.innerHTML = "";
	(document.getElementById('packUpload') as HTMLInputElement).value = "";

	var cardBoxes = document.getElementsByClassName('cardbox')
	var cardSelectors = document.getElementById('cardSelectors')!;
	cardSelectors.innerHTML = "";

	document.getElementById('expansions')!.innerHTML = "";

	var deckElementList: HTMLElement[] = [];
	var allPacks = packs.slice();

	if(options.customCards.descriptions.length)
	{
		allPacks.push({"h": texts.LobbyUploads, "id":"uploadBanner"});
		allPacks = allPacks.concat(options.customCards.descriptions);
	}

	cm.init(["*"], options.customCards.cards);

	var uploadHeader: HTMLElement | undefined;

	for(var info of allPacks)
	{
		if((info as any).h)
		{
			info = info as PackListHeader;
			let el = document.createElement('h3');
			el.innerHTML = info.h as string;

			if(info.id == "uploadBanner")
			{
				uploadHeader = el;
			}
			cardSelectors.appendChild(el);
			continue;
		}

		info = info as PackListPack;


		let boxSelect = undefined;
		if(info.box)
		{
			boxSelect = cardBoxSelectComponent(info.pack);
			document.getElementById('expansions')!.appendChild(boxSelect);
		}

		let el = cardSelectComponent(globals.decks, info.name, info.pack + ".*", boxSelect)
		deckElementList.push(el)
		cardSelectorElements[info.pack] = el;
		cardSelectors.appendChild(el);
	}

	for(let i=0; i < cardBoxes.length; i++)
	{
		let box = cardBoxes[i] as HTMLElement;
		cardBoxElements[box.getAttribute('value') as string] = box;

		box.onclick = function()
		{

			if(box.classList.contains('selected'))
			{
				box.classList.remove("selected");
				deckElementList[i].getElementsByTagName('button')[0].click();
			}
			else
			{
				box.classList.add('selected');
				deckElementList[i].getElementsByTagName('button')[2].click();
			}
		}
	}

	var startCards = document.getElementById('startCards')!;
	startCards.innerHTML = "";

	var startCardNames = packs.map((x: any) => x.startCards || []).reduce((a,b) => a.concat(b), []);
	var customStartCards = options.customCards.descriptions.map((x: any) => x.startCards || []).reduce((a,b) => a.concat(b), []);


	if(customStartCards.length && uploadHeader)
	{
		uploadHeader.innerHTML += "<br><span class='subheading'>" + texts.LobbyUploadStartCardLocation + "</span>";
	}

	var allStartCards = startCardNames.concat(customStartCards)

	for(var card of allStartCards)
	{
		let cardEl = makeCardElement(card);
		var shield = document.createElement('div');


		if(card == "Core.Start.FanficAuthorTwilight")
			cardEl.classList.add('selected');

		cardEl.setAttribute('card', card);
		//cardEl.setAttribute('no', no++);
		shield.className ='shield';
		cardEl.appendChild(shield);

		cardEl.onclick = function(e: Event)
		{
			var cards = (cardEl.parentNode as HTMLElement).getElementsByClassName('card');

			for(let el of cards)
			{
				el.classList.remove('selected');
			}

			cardEl.classList.add('selected');

			var infoText = "";
			switch(cardEl.getAttribute('cardID'))
			{	
				case "HorriblePeople.2015ConExclusives.Start.FanficAuthorDiscord":
					infoText = texts.LobbyDiscordStartWarning;
					break;
			}

			document.getElementById('startCardDetails')!.innerHTML = infoText;
		}

		startCards.appendChild(cardEl);
	}
}

function getPackString(card: Card)
{
	var dotPos = card.substring(0, card.lastIndexOf(".")).lastIndexOf(".")
	return card.substring(0, dotPos);
}


function loadGameOptions(options: GameOptions)
{
	if(options.ruleset == "turnsOnly")
		input("turnsOnly").checked = true;
	else if (options.ruleset == "sandbox")
		input("sandbox").checked = true;

	if(options.keepLobbyOpen)
		input("keepLobbyOpen").checked = true;


	var teams = document.getElementById('teams') as HTMLElement;
	teams.innerHTML = "";
	for(let player of currentPlayers)
	{	
		if(player)
		{
			let value = options.teams[player] || "";
			teams.innerHTML += `<div><input class='teamInput' playerName="${player}" value="${value}"/><span>${player}</span></div>`;
		}
	}

	var inputEls = teams.getElementsByTagName('input')
	
	for(let i = 0; i < inputEls.length; i++)
	{
		inputEls[i].oninput = setLobbyOptions;
	}
}




function onMessage(event: MessageEvent)
{
	if(event.data.startsWith("lobby;"))
	{
		let payload = JSON.parse(event.data.substring("lobby;".length))

		if(payload.isClosed)
		{
			changePage(undefined, "pageClosed");
			globals.socket.close();
			return;
		}

		if(!ishost && payload.isHost)
		{
			currentOptions = payload.gameOptions;

			ishost = true;
			document.getElementById('rightSide')!.classList.add('host');

			loadCardPages(payload.gameOptions);

			for(var key in cardBoxElements)
			{
				cardBoxElements[key].classList.remove('selected')
			}

			if(payload.gameOptions.cardDecks)
			{
				var s = new Set(payload.gameOptions.cardDecks);

				var boxes = document.getElementsByClassName('cardbox') as HTMLCollectionOf<HTMLElement>;
				for(var el of boxes)
				{
					if(s.has((el as any).getAttribute('deck')))
					{
						el.click();
					}
				}

				var cardDivs = document.getElementsByClassName('card') as HTMLCollectionOf<HTMLElement>;
				for(var el of cardDivs)
				{
					var card = el.getAttribute('cardID') as string;
					if(s.has(card))
					{
						el.classList.add('selected');

						var deck = getPackString(card);

						cardSelectorElements[deck].getElementsByTagName('button')[1].click();
					}
				}

				var allButtons = document.getElementsByClassName('allButton') as HTMLCollectionOf<HTMLElement>;
				for(var el of allButtons)
				{
					if(s.has((el as any).getAttribute('deck')))
					{
						el.click();
					}
				}

				cardDivs = document.getElementById('startCards')!.getElementsByClassName('card') as HTMLCollectionOf<HTMLElement>;

				for(var el of cardDivs)
				{
					if(el.getAttribute('cardID') == payload.gameOptions.startCard)
					{
						el.click();
					}
				}
			}
				
			loadGameOptions(payload.gameOptions)
		}


		if(payload.name)
		{
			localStorage["playerID"] = payload.id;

			document.getElementById('main')!.classList.add('registered');
			document.getElementById('main')!.classList.remove('unregistered');
		}


		if(payload.players)
		{
			
			var list = document.getElementById('playerList')!;

			currentPlayers = payload.players;
			
			if(currentOptions)
			{
				loadGameOptions(currentOptions);
			}
			

			list.innerHTML = "";

			for(var name of payload.players)
			{
				name = name.replace(/</g, "&lt;")
				if(name == "")
					name = "<span class='loadingPlayer'></span>";

				list.innerHTML += "<div>" + name + "</div>"
			}

			document.getElementById('playerList2')!.innerHTML = list.innerHTML

			
			if(payload.name != "")
			{
				sentName = true;
			}
			else
			{
				sentName = false;
			}
		}		
	}

	if(event.data.startsWith("uploadCardsError;"))
	{
		var error = event.data.substring("uploadCardsError;".length);

		document.getElementById('uploadErrors')!.innerHTML = error;
	}
}


function input(id: string): HTMLInputElement
{
	return document.getElementById(id) as HTMLInputElement;
}

function register()
{
	var name = input("playerName").value;
	globals.socket.send("handshake;;" + name);
}

function setLobbyOptions()
{
	var cardDecks = document.getElementsByClassName('cardbox');
	var options: GameOptions = {
		cardDecks:[],
		startCard: "Core.Start.FanficAuthorTwilight",
		ruleset: "turnsOnly",
		customCards: {cards: {}, descriptions: []},
		keepLobbyOpen: false,
		teams: {},
	};


	// skip 0 because it's core

	options.cardDecks = Object.keys(globals.decks).map(x => [...globals.decks[x]]).reduce((a,b) => a.concat(b), []);

	var startCard = document.getElementById('startCards')!.getElementsByClassName('selected')[0];
	options.startCard = startCard.getAttribute('cardID') || "Core.Start.FanficAuthorTwilight";

	if(input('sandbox').checked)
		options.ruleset = "sandbox";
	if(input('turnsOnly').checked)
		options.ruleset = "turnsOnly";

	var teams = document.getElementById('teams')!;

	var teamInputs = teams.getElementsByTagName('input')
	for(let i=0; i < teamInputs.length; i++)
	{
		let playerName = teamInputs[i].getAttribute("playerName");
		let teamName = teamInputs[i].value;

		if(playerName && teamName != "")
		{
			options.teams[playerName] = teamName;
		}
	}

	options.keepLobbyOpen = !!input('keepLobbyOpen').checked;

	currentOptions = options;

	console.log(options);

	globals.socket.send("setLobbyOptions;" +  JSON.stringify(options));
}

function startGame()
{
	setLobbyOptions();
	globals.socket.send("game;");
}


function changePage(el: HTMLElement | undefined, pageCssClass: string)
{
	var main = document.getElementsByClassName('main')[0];

	main.classList.remove("pageJoin")
	main.classList.remove("pageOptions")
	main.classList.remove("pageCards")
	main.classList.remove("pageClosed")
	main.classList.remove("pageStartCard")

	main.classList.add(pageCssClass);

	var selected = document.getElementsByClassName('selected');
	if(selected.length)
		selected[0].classList.remove('selected');
	if(el)
		el.classList.add('selected');
}

globals.changePage = changePage

var animCounter = 0;
function loadingPlayerAnimation()
{
	requestAnimationFrame(loadingPlayerAnimation);
	var txt = `<em>${texts.LobbyPlayerJoining}</em>`;
	var doUpdate = false;

	if(animCounter == 20)
	{
		txt = `<em>${texts.LobbyPlayerJoining}.</em>`;
		doUpdate = true;
	}
	if(animCounter == 40)
	{
		txt = `<em>${texts.LobbyPlayerJoining}..</em>`;
		doUpdate = true;
	}
	if(animCounter == 60)
	{
		txt = `<em>${texts.LobbyPlayerJoining}...</em>`;
		doUpdate = true;
	}
	if(animCounter >=80)
	{
		txt = `<em>${texts.LobbyPlayerJoining}</em>`;
		doUpdate = true;
		animCounter = -1;
	}
	
	if(doUpdate)
	{
		var joiningPlayers = document.getElementsByClassName('loadingPlayer');

		for(var i=0; i<joiningPlayers.length; i++)
		{
			joiningPlayers[i].innerHTML = txt;
		}
	}

	animCounter++;
}



function handleFileSelect(event: any)
{
	const reader = new FileReader()
	reader.onload = handleFileLoad;
	reader.readAsText(event.target.files[0])
}

function handleFileLoad(event: any)
{
	setLobbyOptions();

	var queuedFileText = event.target.result;
	var fileName = (document.getElementById('packUpload') as HTMLInputElement).value;

	fileName = fileName.replace(/\\/g, "/");
	fileName = fileName.substring(fileName.lastIndexOf("/")+1);

	var errorElement = document.getElementById("uploadErrors") as HTMLElement;

	var pack: any;

	try
	{
		pack = JSON.parse(queuedFileText);
	}
	catch(e)
	{
		errorElement.innerHTML = "Error parsing JSON file\nPlease use a tool like https://jsonformatter.org/json-parser to resolve any JSON errors";
		return;
	}

	let errors = validatePack(pack, "", fileName, "any");
	
	if(errors.length)
	{
		errorElement.innerHTML = errors.join("\r\n");
	}
	else
	{
		globals.socket.send("uploadCards;" + queuedFileText);
		errorElement.innerHTML = "Uploading...";
	}
}


loadingPlayerAnimation();