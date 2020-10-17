document.getElementById('inviteURL').value = window.location.href;


var host = window.location.host.replace(/:.*/,"") + ":8080";
var ishost = false;
var sentName = false;

socket = new WebSocket("ws://" + host + "/" + window.location.search);

socket.addEventListener("open", function()
{
	socket.send("ishost;");
	socket.send("register;Player");

	//
});

socket.addEventListener("close", function(){
	console.log("closed")
});


socket.addEventListener("message", function()
{
	console.log(event.data);	
	console.log("ishost " + ishost);
	if(event.data.startsWith("registered;"))
	{
		var [_,id] = event.data.split(";")
		localStorage["playerID"] = id;

		if(sentName)
			document.getElementById('chooseName').classList.add("off");
	}

	if(event.data.startsWith("ishost;"))
	{
		var [_,val] = event.data.split(";")
		ishost = val == "1"? true : false;

		if(ishost)
			document.getElementById('tabs').classList.remove('off');
	}

	if(event.data.startsWith("startgame;"))
	{
		window.location.href = window.location.origin + "/game" + window.location.search;
	}

	if(event.data.startsWith("playerlist;"))
	{
		var [_, ...names] = event.data.split(";");

		var list = document.getElementById('playerList');

		list.innerHTML = "";

		for(var name of names)
		{
			list.innerHTML += "<div>" + name.replace(/</g, "&lt;") + "</div>"
		}

		if(ishost && sentName)
		{
			document.getElementById("startButtonArea").classList.remove("off");
		}
	}
});



function register()
{
	var name = document.getElementById("playerName").value;

	sentName = true;
	socket.send("register;" + (localStorage["playerID"] || 0) + ";" + name);
}

function startGame()
{
	var cardDecks = document.getElementsByClassName('cardbox');

	// skip 0 because it's core
	var options = {cardDecks:[]};


	for(var i=1; i<cardDecks.length; i++)
	{
		if(cardDecks[i].classList.contains('selected'))
		{
			var cardDeckName = cardDecks[i].id;
			cardDeckName = cardDeckName.substring(0,cardDeckName.indexOf("-"))
			options.cardDecks.push(cardDeckName)
		}
	}

	socket.send("startgame;" + JSON.stringify(options));
}

var gameOptionsDiv = document.getElementById('gameOptionsInfo');
var chooseCardsDiv = document.getElementById('chooseCardsInfo');
var joinGameDiv = document.getElementById('joinGameInfo');


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

var cardBoxes = document.getElementsByClassName('cardbox')


for(var i=1; i < cardBoxes.length; i++)
{
	let box = cardBoxes[i];
	box.onclick = function()
	{
		if(this.classList.contains('selected'))
			this.classList.remove("selected")
		else
			this.classList.add('selected');
	}
}