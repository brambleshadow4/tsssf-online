import * as LobbyView from "./lobbyView.js";

import {cardSelectComponent, cardBoxSelectComponent} from "./cardSelectComponent.js";
import {makeCardElement} from "../game/cardComponent.js";
import {isStart, Card} from "../../server/lib.js";
import cards from "../../server/cards.js";

import {WebSocketPlus} from "../viewSelector.js";
import packOrder from "./packOrder.js";

var gameOptionsDiv: HTMLElement;
var chooseCardsDiv: HTMLElement;
var joinGameDiv: HTMLElement;
var ishost = false;
var sentName = false;

var cardBoxElements: {[key: string]: Element} = {};
var deckElements: {[key: string]: Element} = {}


var globals = window as unknown as {

	decks: {
		[key: string]: Set<string>
	},

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


export function loadView(isOpen: boolean)
{
	if(window.location.pathname != "/lobby")
	{
		history.replaceState(null, "", "/lobby" + window.location.search)
	}

	document.body.innerHTML = LobbyView.HTML;
	document.head.innerHTML = LobbyView.HEAD;

	if(isOpen)
	{
		(document.getElementById('inviteURL') as HTMLInputElement).value = window.location.href;
		let socket = globals.socket;

		socket.send("ishost;");

		socket.onMessageHandler = onMessage;

		globals.register = register;
		globals.startGame = startGame;

		var cardBoxes = document.getElementsByClassName('cardbox')



		var cardSelectors = document.getElementById('cardSelectors')!;

		var deckElementList: HTMLElement[] = [];
		for(var info of packOrder)
		{
			if(info.h)
			{
				let el = document.createElement('h3');
				el.innerHTML = info.h as string;
				cardSelectors.appendChild(el);
				continue;
			}

			if(info.length == 1)
			{
				
			}

			info = info as [string, string, Element];

			let boxSelect = undefined;
			if(info.box)
			{
				boxSelect = cardBoxSelectComponent(info.pack);
				document.getElementById('expansions')!.appendChild(boxSelect);
			}

			let el = cardSelectComponent(globals.decks, info.name, info.pack + ".*", boxSelect)
			deckElementList.push(el)
			deckElements[info[1]] = el;
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
					//console.log(deckElements[i].getElementsByTagName('button')[2]);
				}
			}
		}

		var startCards = document.getElementById('startCards')!;

		for(var card of Object.keys(cards).filter(x => isStart(x)))
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
				switch(cardEl.getAttribute('card'))
				{	
					case "HorriblePeople.2015ConExclusives.Start.FanficAuthorDiscord":
						infoText = "Goals will not automatically turn green if you use this start card";
						break;
				}

				document.getElementById('startCardDetails')!.innerHTML = infoText;
			}

			startCards.appendChild(cardEl);
		}
	}
	else
	{
		changePage(undefined, "pageClosed");
	}
}

function getPackString(card: Card)
{
	var dotPos = card.substring(0, card.lastIndexOf(".")).lastIndexOf(".")
	return card.substring(0, dotPos+1) + "*";
}


function onMessage(event: MessageEvent)
{
	if(event.data.startsWith("registered;"))
	{
		var [_,id] = event.data.split(";")
		localStorage["playerID"] = id;

		document.getElementById('main')!.classList.add('registered');
		document.getElementById('main')!.classList.remove('unregistered');
	}

	if(event.data.startsWith("ishost;"))
	{
		var [_,val] = event.data.split(";");

		var options = JSON.parse(val);

		if(options)
		{


			ishost = true;
			document.getElementById('rightSide')!.classList.add('host')

			for(var key in cardBoxElements)
			{
				cardBoxElements[key].classList.remove('selected')
			}

			if(options.cardDecks)
			{
				var s = new Set(options.cardDecks);

				var boxes = document.getElementsByClassName('cardbox') as HTMLCollectionOf<HTMLElement>;
				for(var el of boxes)
				{
					if(s.has(el.getAttribute('deck')))
					{
						el.click();
					}
				}

				var cardDivs = document.getElementsByClassName('card') as HTMLCollectionOf<HTMLElement>;
				for(var el of cardDivs)
				{
					var card = el.getAttribute('card') as string;
					if(s.has(card))
					{
						el.classList.add('selected');

						var deck = getPackString(card);

						deckElements[deck].getElementsByTagName('button')[1].click();
					}
				}

				var allButtons = document.getElementsByClassName('allButton') as HTMLCollectionOf<HTMLElement>;
				for(var el of allButtons)
				{
					if(s.has(el.getAttribute('deck')))
					{
						el.click();
					}
				}

				cardDivs = document.getElementById('startCards')!.getElementsByClassName('card') as HTMLCollectionOf<HTMLElement>;

				for(var el of cardDivs)
				{
					if(el.getAttribute('card') == options.startCard)
					{
						el.click();
					}
				}
			}
				

			if(options.ruleset == "turnsOnly")
				input("turnsOnly").checked = true;
			else if (options.ruleset == "sandbox")
				input("sandbox").checked = true;

			if(options.keepLobbyOpen)
				input("keepLobbyOpen").checked = true;
		}
	}


	if(event.data.startsWith("lobbylist;"))
	{
		var [_, myName, names] = event.data.split(";");

		var names = names.split(",");
		var list = document.getElementById('playerList')!;
		

		list.innerHTML = "";

		for(var name of names)
		{
			name = name.replace(/</g, "&lt;")
			if(name == "")
				name = "<span class='loadingPlayer'></span>";

			list.innerHTML += "<div>" + name + "</div>"
		}

		document.getElementById('playerList2')!.innerHTML = list.innerHTML

		
		if(myName != "")
		{
			sentName = true;
		}
		else
		{
			sentName = false;
		}
	}
}


function input(id: string): HTMLInputElement
{
	return document.getElementById(id) as HTMLInputElement;
}

function register()
{
	var name = input("playerName").value;
	globals.socket.send("register;" + (localStorage["playerID"] || 0) + ";" + name);
}

function startGame()
{
	var cardDecks = document.getElementsByClassName('cardbox');
	var options: any = {cardDecks:[]};


	// skip 0 because it's core

	options.cardDecks = Object.keys(globals.decks).map(x => [...globals.decks[x]]).reduce((a,b) => a.concat(b), []);

	var startCard = document.getElementById('startCards')!.getElementsByClassName('selected')[0];
	options.startCard = startCard ? startCard.getAttribute('card') : "Core.Start.FanficAuthorTwilight";

	if(input('sandbox').checked)
		options.ruleset = "sandbox";
	if(input('turnsOnly').checked)
		options.ruleset = "turnsOnly";

	options.keepLobbyOpen = !!input('keepLobbyOpen').checked;

	globals.socket.send("startgame;" + JSON.stringify(options));
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
	var txt = "<em>player joining</em>";
	var doUpdate = false;

	if(animCounter == 20)
	{
		txt = "<em>player joining.</em>";
		doUpdate = true;
	}
	if(animCounter == 40)
	{
		txt = "<em>player joining..</em>";
		doUpdate = true;
	}
	if(animCounter == 60)
	{
		txt = "<em>player joining...</em>";
		doUpdate = true;
	}
	if(animCounter >=80)
	{
		txt = "<em>player joining</em>";
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

loadingPlayerAnimation();