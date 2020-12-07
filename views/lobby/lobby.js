import * as LobbyView from "/lobby/lobbyView.js";

var gameOptionsDiv 
var chooseCardsDiv 
var joinGameDiv 
var ishost = false;
var sentName = false;

var cardBoxElements = {};


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

		gameOptionsDiv = document.getElementById('gameOptionsInfo');
		chooseCardsDiv = document.getElementById('chooseCardsInfo');
		joinGameDiv = document.getElementById('joinGameInfo');

		window.joinGameTab = joinGameTab;
		window.gameOptionsTab = gameOptionsTab;
		window.chooseCardsTab = chooseCardsTab;
		window.register = register;
		window.startGame = startGame;

		var cardBoxes = document.getElementsByClassName('cardbox')

		for(var i=1; i < cardBoxes.length; i++)
		{
			let box = cardBoxes[i];
			cardBoxElements[box.getAttribute('value')] = box;

			box.onclick = function()
			{
				if(this.classList.contains('selected'))
					this.classList.remove("selected")
				else
					this.classList.add('selected');
			}
		}
	}
	else
	{
		document.getElementById('joinGameInfo').classList.add('off');
		document.getElementById('playerArea').classList.add('off');

		document.getElementById('closedLobby').classList.remove('off');
	}

}

function onMessage()
{
	if(event.data.startsWith("registered;"))
	{
		var [_,id] = event.data.split(";")
		localStorage["playerID"] = id;
		document.getElementById('chooseName').classList.add("off");
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
			document.getElementById('tabs').classList.remove('off');

			for(var key in cardBoxElements)
			{
				if(key != "Core.*")
					cardBoxElements[key].classList.remove('selected')
			}

			if(options.cardDecks)
				for(var key of options.cardDecks)
				{
					if(key != "Core.*")
						cardBoxElements[key].classList.add('selected');
				}

			if(options.ruleset == "turnsOnly")
				document.getElementById("turnsOnly").checked = true;
			else if (options.ruleset == "sandbox")
				document.getElementById("sandbox").checked = true;

			if(options.keepLobbyOpen)
				document.getElementById("keepLobbyOpen").checked = true;

			if(sentName)
			{
				document.getElementById("chooseName").classList.add("off");
				document.getElementById("startButtonArea").classList.remove("off");
			}
		}
	}


	if(event.data.startsWith("lobbylist;"))
	{
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

		if(ishost && myName != "")
		{
			document.getElementById("startButtonArea").classList.remove("off");
		}
		
		if(myName != "")
		{
			document.getElementById("chooseName").classList.add("off");
			sentName = true;
		}
		else
		{
			document.getElementById("chooseName").classList.remove("off");
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
	for(var i=1; i<cardDecks.length; i++)
	{
		if(cardDecks[i].classList.contains('selected'))
		{
			var cardDeckName = cardDecks[i].getAttribute('value');
			options.cardDecks.push(cardDeckName)
		}
	}

	if(document.getElementById('sandbox').checked)
		options.ruleset = "sandbox";
	if(document.getElementById('turnsOnly').checked)
		options.ruleset = "turnsOnly";

	options.keepLobbyOpen = !!document.getElementById('keepLobbyOpen').checked;

	socket.send("startgame;" + JSON.stringify(options));
}



function joinGameTab()
{
	gameOptionsDiv.classList.add('off');
	chooseCardsDiv.classList.add('off');
	joinGameDiv.classList.remove("off");

	document.getElementsByClassName('selected')[0].classList.remove('selected');
	document.getElementById('joinGameTab').classList.add('selected')
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