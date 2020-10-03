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
	socket.send("startgame;");
}