import * as LobbyView from "/lobby/lobbyView.js";

import {cardSelectComponent} from "/lobby/cardSelectComponent.js";

var gameOptionsDiv 
var chooseCardsDiv 
var joinGameDiv 
var ishost = false;
var sentName = false;
var cardBoxElements = {};

var decks = {
	"Core.*": new Set(),
	"PU.*": new Set(),
	"EC.*": new Set(),
}

var deckElements = {}

window.decks = decks;


export function loadView(isOpen)
{
	if(window.location.pathname != "/lobby")
	{
		history.replaceState(null, "", "/lobby" + window.location.search)
	}

	document.body.innerHTML = LobbyView.HTML;
	document.head.innerHTML = LobbyView.HEAD;

	if(isOpen)
	{
		document.getElementById('inviteURL').value = window.location.href;
		socket = window.socket;

		socket.send("ishost;");

		socket.onMessageHandler = onMessage;

		window.joinGameTab = joinGameTab;
		window.gameOptionsTab = gameOptionsTab;
		window.chooseCardsTab = chooseCardsTab;
		window.register = register;
		window.startGame = startGame;

		var cardBoxes = document.getElementsByClassName('cardbox')

		

		var deckInfo = [
			["Core", "Core.*", cardBoxes[0]],
			["Extra Credit", "EC.*", cardBoxes[1]],
			["Ponyville University","PU.*", cardBoxes[2]]
		];

		var cardSelectors = document.getElementById('cardSelectors');

		var deckElementList = [];
		for(var info of deckInfo)
		{
			var el = cardSelectComponent(decks, ...info)
			deckElementList.push(el)
			deckElements[info[1]] = el;
			cardSelectors.appendChild(el);
		}

		for(let i=0; i < cardBoxes.length; i++)
		{
			let box = cardBoxes[i];
			cardBoxElements[box.getAttribute('value')] = box;

			box.onclick = function()
			{
				console.log("box clicked " +this.className)
				console.log(this)



				if(this.classList.contains('selected'))
				{
					this.classList.remove("selected");
					deckElementList[i].getElementsByTagName('button')[0].click();
				}
				else
				{
					this.classList.add('selected');
					deckElementList[i].getElementsByTagName('button')[2].click();
					//console.log(deckElements[i].getElementsByTagName('button')[2]);
				}

				

			}
		}
	}
	else
	{
		changePage(undefined, "pageClosed");
	}
}

function onMessage()
{
	if(event.data.startsWith("registered;"))
	{
		var [_,id] = event.data.split(";")
		localStorage["playerID"] = id;

		document.getElementById('main').classList.add('registered');
		document.getElementById('main').classList.remove('unregistered');
	}

	if(event.data.startsWith("ishost;"))
	{
		var [_,val] = event.data.split(";");

		console.log(event.data);
		var options = JSON.parse(val);

		console.log(options);

		if(options)
		{
			ishost = true;
			document.getElementById('rightSide').classList.add('host')

			for(var key in cardBoxElements)
			{
				cardBoxElements[key].classList.remove('selected')
			}

			if(options.cardDecks)
			{
				var s = new Set(options.cardDecks);

				var boxes = document.getElementsByClassName('cardbox');
				for(var el of boxes)
				{
					if(s.has(el.getAttribute('deck')))
					{
						el.click();
					}
				}

				var cardDivs = document.getElementsByClassName('card');
				for(var el of cardDivs)
				{
					var card = el.getAttribute('card')
					if(s.has(card))
					{
						el.classList.add('selected');

						var deck = card.substring(0, card.indexOf('.')+1) + "*";

						deckElements[deck].getElementsByTagName('button')[1].click();
					}
				}

				var allButtons = document.getElementsByClassName('allButton');
				for(var el of allButtons)
				{
					if(s.has(el.getAttribute('deck')))
					{
						el.click();
					}
				}
			}
				

			if(options.ruleset == "turnsOnly")
				document.getElementById("turnsOnly").checked = true;
			else if (options.ruleset == "sandbox")
				document.getElementById("sandbox").checked = true;

			if(options.keepLobbyOpen)
				document.getElementById("keepLobbyOpen").checked = true;
		}
	}


	if(event.data.startsWith("lobbylist;"))
	{
		console.log('lobbylist');
		var [_, myName, names] = event.data.split(";");

		var names = names.split(",");
		var list = document.getElementById('playerList');
		

		list.innerHTML = "";

		for(var name of names)
		{
			name = name.replace(/</g, "&lt;")
			if(name == "")
				name = "<span class='loadingPlayer'></span>";

			list.innerHTML += "<div>" + name + "</div>"
		}

		document.getElementById('playerList2').innerHTML = list.innerHTML

		
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


function register()
{
	var name = document.getElementById("playerName").value;
	socket.send("register;" + (localStorage["playerID"] || 0) + ";" + name);
}

function startGame()
{
	var cardDecks = document.getElementsByClassName('cardbox');
	var options = {cardDecks:[]};


	// skip 0 because it's core

	options.cardDecks = Object.keys(decks).map(x => [...decks[x]]).reduce((a,b) => a.concat(b), []);

	console.log(options.cardDecks);

	if(document.getElementById('sandbox').checked)
		options.ruleset = "sandbox";
	if(document.getElementById('turnsOnly').checked)
		options.ruleset = "turnsOnly";

	options.keepLobbyOpen = !!document.getElementById('keepLobbyOpen').checked;

	socket.send("startgame;" + JSON.stringify(options));
}


function changePage(el, pageCssClass)
{
	var main = document.getElementsByClassName('main')[0];

	main.classList.remove("pageJoin")
	main.classList.remove("pageOptions")
	main.classList.remove("pageCards")
	main.classList.remove("pageClosed")

	main.classList.add(pageCssClass);

	var selected = document.getElementsByClassName('selected');
	if(selected.length)
		selected[0].classList.remove('selected');
	if(el)
		el.classList.add('selected');
}

window.changePage = changePage


function joinGameTab()
{
	gameOptionsDiv.classList.add('off');
	chooseCardsDiv.classList.add('off');
	joinGameDiv.classList.remove("off");

	
}

function gameOptionsTab()
{
	gameOptionsDiv.classList.remove('off');
	chooseCardsDiv.classList.add('off');
	joinGameDiv.classList.add("off");

	document.getElementsByClassName('selected')[0].classList.remove('selected');
	document.getElementById('gameOptionsTab').classList.add('selected')
}


function chooseCardsTab()
{
	gameOptionsDiv.classList.add('off');
	chooseCardsDiv.classList.remove('off');
	joinGameDiv.classList.add("off");

	document.getElementsByClassName('selected')[0].classList.remove('selected');
	document.getElementById('chooseCardsTab').classList.add('selected')
}


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